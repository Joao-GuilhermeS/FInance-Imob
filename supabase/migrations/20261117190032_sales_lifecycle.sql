-- Commercial lifecycle. Existing rows remain active; no existing financial row is removed.
alter table public.sales
 add column status text not null default 'active' check(status in ('active','cancelled')),
 add column schedule_version integer not null default 1,
 add column terms jsonb not null default '{}',
 add column cancelled_at timestamptz,
 add column cancellation_reason text not null default '',
 add column agreed_refund_cents bigint not null default 0 check(agreed_refund_cents>=0);
alter table public.sales drop constraint sales_property_id_key;
create unique index sales_active_property on public.sales(property_id) where status='active';
alter table public.installments
 add column status text not null default 'active' check(status in ('active','renegotiated','cancelled')),
 add column schedule_version integer not null default 1,
 add column closed_reason text not null default '';

alter table public.expenses add column refund_sale_id uuid unique references public.sales(id);
alter table public.expenses drop constraint expenses_category_check;
alter table public.expenses add constraint expenses_category_check check(category in ('materials','labor','services','acquisition','other','refund'));
alter table public.expenses add constraint refund_category_link check((category='refund')=(refund_sale_id is not null));
drop policy member_read on public.expenses;
create policy member_read on public.expenses for select to authenticated
using((select private.current_role()) in ('admin','finance') or ((select private.current_role())='works' and refund_sale_id is null));

create table public.reservations (
 id uuid primary key default gen_random_uuid(),
 property_id uuid not null references public.properties(id), contact_id uuid not null references public.contacts(id),
 expires_on date not null, status text not null default 'active' check(status in ('active','released','expired','converted')),
 notes text not null default '' check(length(notes)<=2000),
 sale_id uuid references public.sales(id), created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(), closed_at timestamptz
);
create unique index reservations_active_property on public.reservations(property_id) where status='active';
create index reservations_contact on public.reservations(contact_id);
create index reservations_creator on public.reservations(created_by);
create index reservations_sale on public.reservations(sale_id);
create table public.commercial_events (
 id uuid primary key default gen_random_uuid(), request_id uuid not null unique,
 kind text not null check(kind in ('reserve','release','convert','renegotiate','cancel')),
 property_id uuid not null references public.properties(id), sale_id uuid references public.sales(id),
 reservation_id uuid references public.reservations(id), result_id uuid not null,
 reason text not null check(length(trim(reason)) between 5 and 2000),
 payload jsonb not null, details jsonb not null default '{}',
 created_by uuid not null references auth.users(id), created_at timestamptz not null default now()
);
create index commercial_events_property on public.commercial_events(property_id);
create index commercial_events_sale on public.commercial_events(sale_id);
create index commercial_events_reservation on public.commercial_events(reservation_id);
create index commercial_events_creator on public.commercial_events(created_by);
alter table public.reservations enable row level security;
alter table public.commercial_events enable row level security;
revoke all on public.reservations,public.commercial_events from public,anon,authenticated;
grant select on public.reservations,public.commercial_events to authenticated;
create policy commercial_read on public.reservations for select to authenticated
using((select private.current_role()) in ('admin','finance','sales'));
create policy commercial_read on public.commercial_events for select to authenticated
using((select private.current_role()) in ('admin','finance','sales'));
create trigger audit_change after insert or update on public.reservations for each row execute function private.audit_change();
create trigger audit_change after insert on public.commercial_events for each row execute function private.audit_change();

-- Narrow private lookup: exposes availability only, including to Works, never reservation/customer data.
create function private.property_availability(p_property uuid) returns text
language plpgsql stable security definer set search_path=''
as $$ begin
 if auth.uid() is null or private.current_role() is null then raise exception 'Sem acesso.' using errcode='42501'; end if;
 return case when exists(select 1 from public.sales where property_id=p_property and status='active') then 'sold'
 when exists(select 1 from public.reservations where property_id=p_property and status='active' and expires_on>=(now() at time zone 'America/Sao_Paulo')::date) then 'reserved'
 else 'available' end;
end $$;
revoke all on function private.property_availability(uuid) from public,anon;
grant execute on function private.property_availability(uuid) to authenticated;
create view public.property_availability with(security_invoker=true) as
select p.*,private.property_availability(p.id) as effective_status from public.properties p;
create view public.reservation_overview with(security_invoker=true) as
select r.*,case when r.status='active' and r.expires_on<(now() at time zone 'America/Sao_Paulo')::date then 'expired' else r.status end as effective_status,
 p.code as property_code,p.name as property_name,c.name as client_name
from public.reservations r join public.properties p on p.id=r.property_id join public.contacts c on c.id=r.contact_id;
grant select on public.property_availability,public.reservation_overview to authenticated;

create or replace view public.installment_balances with(security_invoker=true) as
select i.id,i.sale_id,i.number,i.amount_cents,i.due_on,
 coalesce((select sum(l.amount_cents) from public.ledger l where l.installment_id=i.id),0)::bigint as received_cents,
 c.name as client_name,p.code as property_code,i.status,i.schedule_version,i.closed_reason,
 case when i.status='active' and s.status='active' then greatest(i.amount_cents-coalesce((select sum(l.amount_cents) from public.ledger l where l.installment_id=i.id),0),0) else 0 end::bigint as outstanding_cents,
 s.status as sale_status
from public.installments i join public.sales s on s.id=i.sale_id join public.contacts c on c.id=s.contact_id join public.properties p on p.id=s.property_id;
create or replace view public.expense_balances with(security_invoker=true) as
select e.id,e.request_id,e.property_id,e.contact_id,e.description,e.category,e.quantity,e.unit,e.amount_cents,e.due_on,e.created_at,
 coalesce((select -sum(l.amount_cents) from public.ledger l where l.expense_id=e.id),0)::bigint as paid_cents,e.refund_sale_id
from public.expenses e;

create function private.lifecycle_retry(p_request uuid,p_kind text,p_payload jsonb) returns uuid
language plpgsql security invoker set search_path=''
as $$ declare previous public.commercial_events; begin
 if p_request is null then raise exception 'Identificador da solicitação obrigatório.'; end if;
 perform pg_advisory_xact_lock(hashtextextended('lifecycle:'||p_request::text,0));
 select * into previous from public.commercial_events where request_id=p_request;
 if found then
  if previous.kind<>p_kind or previous.payload<>p_payload then raise exception 'Solicitação já utilizada com outros dados.'; end if;
  return previous.result_id;
 end if;
 return null;
end $$;
revoke all on function private.lifecycle_retry(uuid,text,jsonb) from public,anon,authenticated;

create function private.reserve_property(p_request uuid,p_property uuid,p_contact uuid,p_expires date,p_notes text) returns uuid
language plpgsql security definer set search_path=''
as $$ declare rid uuid; retry uuid; payload jsonb; begin
 perform private.require_role(array['admin','sales']);
 payload:=jsonb_build_object('property',p_property,'contact',p_contact,'expires',p_expires,'notes',coalesce(trim(p_notes),''));
 retry:=private.lifecycle_retry(p_request,'reserve',payload); if retry is not null then return retry; end if;
 if p_expires is null or p_expires<(now() at time zone 'America/Sao_Paulo')::date then raise exception 'Informe um vencimento de reserva a partir de hoje.'; end if;
 perform 1 from public.properties where id=p_property for update; if not found then raise exception 'Imóvel não encontrado.'; end if;
 perform 1 from public.contacts where id=p_contact and kind='client' for share; if not found then raise exception 'Selecione um cliente.'; end if;
 update public.reservations set status='expired',closed_at=now() where property_id=p_property and status='active' and expires_on<(now() at time zone 'America/Sao_Paulo')::date;
 if private.property_availability(p_property)<>'available' then raise exception 'O imóvel já está reservado ou vendido.'; end if;
 insert into public.reservations(property_id,contact_id,expires_on,notes,created_by)
 values(p_property,p_contact,p_expires,coalesce(trim(p_notes),''),auth.uid()) returning id into rid;
 update public.properties set commercial_status='reserved' where id=p_property;
 insert into public.commercial_events(request_id,kind,property_id,reservation_id,result_id,reason,payload,created_by)
 values(p_request,'reserve',p_property,rid,rid,'Reserva registrada',payload,auth.uid());
 return rid;
end $$;
create function public.reserve_property(p_request uuid,p_property uuid,p_contact uuid,p_expires date,p_notes text) returns uuid
language sql security invoker set search_path='' as $$ select private.reserve_property(p_request,p_property,p_contact,p_expires,p_notes) $$;

create function private.release_reservation(p_request uuid,p_reservation uuid,p_reason text) returns uuid
language plpgsql security definer set search_path=''
as $$ declare r public.reservations; retry uuid; payload jsonb; begin
 perform private.require_role(array['admin','sales']);
 payload:=jsonb_build_object('reservation',p_reservation,'reason',trim(p_reason));
 retry:=private.lifecycle_retry(p_request,'release',payload); if retry is not null then return retry; end if;
 if length(trim(coalesce(p_reason,''))) not between 5 and 2000 then raise exception 'Informe um motivo com 5 a 2000 caracteres.'; end if;
 select * into r from public.reservations where id=p_reservation;
 if not found then raise exception 'Reserva não encontrada.'; end if;
 perform 1 from public.properties where id=r.property_id for update;
 select * into r from public.reservations where id=p_reservation for update;
 if r.status not in ('active','expired') then raise exception 'Reserva já encerrada.'; end if;
 update public.reservations set status='released',closed_at=now() where id=r.id;
 update public.properties set commercial_status=private.property_availability(r.property_id) where id=r.property_id;
 insert into public.commercial_events(request_id,kind,property_id,reservation_id,result_id,reason,payload,created_by)
 values(p_request,'release',r.property_id,r.id,r.id,trim(p_reason),payload,auth.uid());
 return r.id;
end $$;
create function public.release_reservation(p_request uuid,p_reservation uuid,p_reason text) returns uuid
language sql security invoker set search_path='' as $$ select private.release_reservation(p_request,p_reservation,p_reason) $$;

create or replace function private.create_sale(p_request uuid,p_contact uuid,p_property uuid,p_total bigint,p_down bigint,p_count integer,p_sold date,p_first date)
returns uuid language plpgsql security definer set search_path=''
as $$ declare sid uuid; previous public.sales; r public.reservations; remaining bigint; base bigint; i integer; terms jsonb; begin
 perform private.require_role(array['admin','sales']);
 if p_request is null then raise exception 'Identificador da solicitação obrigatório.'; end if;
 perform pg_advisory_xact_lock(hashtextextended('sale:'||p_request::text,0));
 terms:=jsonb_build_object('contact',p_contact,'property',p_property,'total',p_total,'down',p_down,'count',p_count,'sold',p_sold,'first',p_first);
 select * into previous from public.sales where request_id=p_request;
 if found then
  if previous.contact_id is distinct from p_contact or previous.property_id is distinct from p_property or previous.total_cents is distinct from p_total or (previous.terms<>'{}'::jsonb and previous.terms<>terms) then raise exception 'Solicitação já utilizada com outros dados.'; end if;
  return previous.id;
 end if;
 if p_total is null or p_down is null or p_count is null or p_sold is null or p_first is null or p_total<=0 or p_total>1000000000000 or p_down<0 or p_down>p_total or p_count<1 or p_count>600 or p_first<p_sold then raise exception 'Condições de venda inválidas.'; end if;
 perform 1 from public.properties where id=p_property for update;
 if not found then raise exception 'Imóvel não encontrado.'; end if;
 if exists(select 1 from public.sales where property_id=p_property and status='active') then raise exception 'Imóvel já vendido.'; end if;
 update public.reservations set status='expired',closed_at=now() where property_id=p_property and status='active' and expires_on<(now() at time zone 'America/Sao_Paulo')::date;
 select * into r from public.reservations where property_id=p_property and status='active' for update;
 if found and r.contact_id<>p_contact then raise exception 'O imóvel está reservado para outro cliente.'; end if;
 remaining:=p_total-p_down;
 if remaining>0 and remaining<p_count then raise exception 'Quantidade de parcelas excede o saldo em centavos.'; end if;
 insert into public.sales(request_id,contact_id,property_id,total_cents,sold_on,created_by,terms)
 values(p_request,p_contact,p_property,p_total,p_sold,auth.uid(),terms) returning id into sid;
 if p_down>0 then insert into public.installments(sale_id,number,amount_cents,due_on) values(sid,0,p_down,p_sold); end if;
 if remaining>0 then
 base:=remaining/p_count;
 for i in 1..p_count loop
 insert into public.installments(sale_id,number,amount_cents,due_on) values(sid,i,base+case when i=p_count then remaining-base*p_count else 0 end,(p_first+make_interval(months=>i-1))::date);
 end loop;
 end if;
 update public.properties set commercial_status='sold' where id=p_property;
 if r.id is not null then
 update public.reservations set status='converted',sale_id=sid,closed_at=now() where id=r.id;
 insert into public.commercial_events(request_id,kind,property_id,sale_id,reservation_id,result_id,reason,payload,created_by)
 values(p_request,'convert',p_property,sid,r.id,sid,'Reserva convertida em venda',terms,auth.uid());
 end if;
 return sid;
end $$;

create function private.renegotiate_sale(p_request uuid,p_sale uuid,p_expected bigint,p_count integer,p_first date,p_reason text) returns uuid
language plpgsql security definer set search_path=''
as $$ declare s public.sales; total bigint; paid bigint; base bigint; i integer; last_number integer; retry uuid; payload jsonb; snapshot jsonb; begin
 perform private.require_role(array['admin','finance']);
 payload:=jsonb_build_object('sale',p_sale,'expected',p_expected,'count',p_count,'first',p_first,'reason',trim(p_reason));
 retry:=private.lifecycle_retry(p_request,'renegotiate',payload); if retry is not null then return retry; end if;
 if p_expected is null or p_count is null or p_count<1 or p_count>600 or p_first is null or p_first<(now() at time zone 'America/Sao_Paulo')::date or length(trim(coalesce(p_reason,''))) not between 5 and 2000 then raise exception 'Confira o saldo, as parcelas, o vencimento e o motivo do acordo.'; end if;
 select * into s from public.sales where id=p_sale for update;
 if not found or s.status<>'active' then raise exception 'A venda não está ativa.'; end if;
 perform 1 from public.installments where sale_id=s.id order by id for update;
 select coalesce(sum(greatest(amount_cents-received_cents,0)),0),coalesce(jsonb_agg(jsonb_build_object('id',id,'amount',amount_cents,'received',received_cents,'due',due_on)),'[]')
 into total,snapshot from public.installment_balances where sale_id=s.id and status='active' and amount_cents>received_cents;
 if total<=0 then raise exception 'A venda não tem saldo pendente para renegociar.'; end if;
 if total<>p_expected then raise exception 'O saldo mudou. Atualize os dados e confira o acordo antes de salvar.'; end if;
 if total<p_count then raise exception 'Quantidade de parcelas excede o saldo em centavos.'; end if;
 select coalesce(max(number),0) into last_number from public.installments where sale_id=s.id;
 update public.installments set status='renegotiated',closed_reason=trim(p_reason) where id in
 (select id from public.installment_balances where sale_id=s.id and status='active' and amount_cents>received_cents);
 update public.sales set schedule_version=schedule_version+1 where id=s.id;
 base:=total/p_count;
 for i in 1..p_count loop
 insert into public.installments(sale_id,number,amount_cents,due_on,schedule_version)
 values(s.id,last_number+i,base+case when i=p_count then total-base*p_count else 0 end,(p_first+make_interval(months=>i-1))::date,s.schedule_version+1);
 end loop;
 insert into public.commercial_events(request_id,kind,property_id,sale_id,result_id,reason,payload,details,created_by)
 values(p_request,'renegotiate',s.property_id,s.id,s.id,trim(p_reason),payload,jsonb_build_object('old_installments',snapshot,'balance',total,'version',s.schedule_version+1),auth.uid());
 return s.id;
end $$;
create function public.renegotiate_sale(p_request uuid,p_sale uuid,p_expected bigint,p_count integer,p_first date,p_reason text) returns uuid
language sql security invoker set search_path='' as $$ select private.renegotiate_sale(p_request,p_sale,p_expected,p_count,p_first,p_reason) $$;

create function private.cancel_sale(p_request uuid,p_sale uuid,p_expected_received bigint,p_expected_outstanding bigint,p_refund bigint,p_due date,p_reason text) returns uuid
language plpgsql security definer set search_path=''
as $$ declare s public.sales; received bigint; outstanding bigint; refund_id uuid; retry uuid; payload jsonb; begin
 perform private.require_role(array['admin','finance']);
 payload:=jsonb_build_object('sale',p_sale,'received',p_expected_received,'outstanding',p_expected_outstanding,'refund',p_refund,'due',p_due,'reason',trim(p_reason));
 retry:=private.lifecycle_retry(p_request,'cancel',payload); if retry is not null then return retry; end if;
 if p_refund is null or p_expected_received is null or p_expected_outstanding is null or p_refund<0 or p_due is null or length(trim(coalesce(p_reason,''))) not between 5 and 2000 then raise exception 'Informe o valor acordado de devolução, o vencimento e o motivo.'; end if;
 select * into s from public.sales where id=p_sale;
 if not found then raise exception 'Venda não encontrada.'; end if;
 perform 1 from public.properties where id=s.property_id for update;
 select * into s from public.sales where id=p_sale for update;
 if s.status<>'active' then raise exception 'Venda já cancelada.'; end if;
 perform 1 from public.installments where sale_id=s.id order by id for update;
 select coalesce(sum(received_cents),0),coalesce(sum(outstanding_cents),0) into received,outstanding from public.installment_balances where sale_id=s.id;
 if received<>p_expected_received or outstanding<>p_expected_outstanding then raise exception 'Os valores mudaram. Atualize a venda antes de confirmar o distrato.'; end if;
 if p_refund>received then raise exception 'A devolução não pode superar o valor líquido recebido.'; end if;
 update public.sales set status='cancelled',cancelled_at=now(),cancellation_reason=trim(p_reason),agreed_refund_cents=p_refund where id=s.id;
 update public.installments set status='cancelled',closed_reason=trim(p_reason) where sale_id=s.id and status='active';
 if p_refund>0 then
 insert into public.expenses(request_id,property_id,contact_id,description,category,quantity,unit,amount_cents,due_on,refund_sale_id)
 values(p_request,s.property_id,s.contact_id,'Devolução por distrato de venda','refund',1,'acordo',p_refund,p_due,s.id) returning id into refund_id;
 end if;
 update public.properties set commercial_status='available' where id=s.property_id;
 insert into public.commercial_events(request_id,kind,property_id,sale_id,result_id,reason,payload,details,created_by)
 values(p_request,'cancel',s.property_id,s.id,s.id,trim(p_reason),payload,jsonb_build_object('received',received,'closed_balance',outstanding,'refund',p_refund,'retained_agreement',received-p_refund,'expense_id',refund_id),auth.uid());
 return s.id;
end $$;
create function public.cancel_sale(p_request uuid,p_sale uuid,p_expected_received bigint,p_expected_outstanding bigint,p_refund bigint,p_due date,p_reason text) returns uuid
language sql security invoker set search_path='' as $$ select private.cancel_sale(p_request,p_sale,p_expected_received,p_expected_outstanding,p_refund,p_due,p_reason) $$;

-- A sale row lock serializes payments/reversals with renegotiations and cancellations.
create or replace function private.record_payment(p_request uuid,p_installment uuid,p_expense uuid,p_account uuid,p_amount bigint,p_date date,p_method text)
returns uuid language plpgsql security definer set search_path=''
as $$ declare target bigint; paid bigint; pid uuid; rid uuid; desc_text text; previous public.ledger; sid uuid; sale_state text; installment_state text; begin
 perform private.require_role(array['admin','finance']);
 if p_request is null or p_amount is null or p_amount<=0 or p_date is null or p_date>(now() at time zone 'America/Sao_Paulo')::date or length(trim(coalesce(p_method,'')))=0 or num_nonnulls(p_installment,p_expense)<>1 then raise exception 'Pagamento inválido.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_request::text,0));
 select * into previous from public.ledger where request_id=p_request;
 if found then
 if previous.installment_id is distinct from p_installment or previous.expense_id is distinct from p_expense or previous.account_id is distinct from p_account or abs(previous.amount_cents)<>p_amount or previous.occurred_on<>p_date or previous.method<>p_method then raise exception 'Solicitação já utilizada com outros dados.'; end if;
 return previous.id; end if;
 if p_installment is not null then
 select sale_id into sid from public.installments where id=p_installment;
 select status into sale_state from public.sales where id=sid for update;
 if not found or sale_state<>'active' then raise exception 'A venda não está ativa para recebimentos.'; end if;
 select amount_cents,status into target,installment_state from public.installments where id=p_installment for update;
 if installment_state<>'active' then raise exception 'Parcela encerrada por renegociação ou cancelamento.'; end if;
 select property_id into pid from public.sales where id=sid;
 select coalesce(sum(amount_cents),0) into paid from public.ledger where installment_id=p_installment;
 desc_text:='Recebimento de parcela';
 else
 select amount_cents,property_id,description into target,pid,desc_text from public.expenses where id=p_expense for update;
 if not found then raise exception 'Despesa não encontrada.'; end if;
 select coalesce(-sum(amount_cents),0) into paid from public.ledger where expense_id=p_expense;
 end if;
 if p_amount>target-paid then raise exception 'Valor superior ao saldo pendente.'; end if;
 insert into public.ledger(request_id,account_id,property_id,installment_id,expense_id,amount_cents,occurred_on,category,description,method,created_by)
 values(p_request,p_account,pid,p_installment,p_expense,case when p_installment is not null then p_amount else -p_amount end,p_date,case when p_installment is not null then 'sale' else 'expense' end,desc_text,p_method,auth.uid()) returning id into rid;
 return rid;
end $$;
create or replace function private.reverse_entry(p_entry uuid,p_reason text) returns uuid
language plpgsql security definer set search_path=''
as $$ declare e public.ledger; rid uuid; sid uuid; state text; begin
 perform private.require_role(array['admin','finance']);
 if length(trim(coalesce(p_reason,''))) not between 5 and 2000 then raise exception 'Informe um motivo com 5 a 2000 caracteres.'; end if;
 select * into e from public.ledger where id=p_entry;
 if not found or e.reversal_of is not null then raise exception 'Lançamento inválido.'; end if;
 if e.installment_id is not null then
 select sale_id into sid from public.installments where id=e.installment_id;
 select status into state from public.sales where id=sid for update;
 if state<>'active' then raise exception 'Recebimento de venda cancelada: a devolução deve usar a conta a pagar do distrato.'; end if;
 select status into state from public.installments where id=e.installment_id for update;
 if state<>'active' then raise exception 'Recebimento vinculado a parcela renegociada não pode ser estornado sem revisão do acordo.'; end if;
 end if;
 if e.expense_id is not null then perform 1 from public.expenses where id=e.expense_id for update; end if;
 perform 1 from public.ledger where id=p_entry for update;
 if exists(select 1 from public.ledger where reversal_of=p_entry) then raise exception 'Lançamento já estornado.'; end if;
 insert into public.ledger(request_id,account_id,property_id,installment_id,expense_id,amount_cents,occurred_on,category,description,method,reversal_of,created_by)
 values(gen_random_uuid(),e.account_id,e.property_id,e.installment_id,e.expense_id,-e.amount_cents,(now() at time zone 'America/Sao_Paulo')::date,e.category,'Estorno: '||trim(p_reason),e.method,e.id,auth.uid()) returning id into rid;
 return rid;
end $$;

create or replace function private.create_expense(p_request uuid,p_property uuid,p_contact uuid,p_description text,p_category text,p_quantity numeric,p_unit text,p_amount bigint,p_due date)
returns uuid language plpgsql security definer set search_path=''
as $$ declare rid uuid; begin
 perform private.require_role(array['admin','finance','works']);
 if p_due is null then raise exception 'Informe o vencimento.'; end if;
 if p_property is null and private.current_role()='works' then raise exception 'Selecione a obra.'; end if;
 if p_category not in ('materials','labor','services','other') then raise exception 'Aquisição e devolução de distrato devem usar seus fluxos próprios.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_request::text,0));
 select id into rid from public.expenses where request_id=p_request; if found then return rid; end if;
 insert into public.expenses(request_id,property_id,contact_id,description,category,quantity,unit,amount_cents,due_on)
 values(p_request,p_property,p_contact,p_description,p_category,p_quantity,p_unit,p_amount,p_due) returning id into rid;
 return rid;
end $$;

revoke execute on function private.reserve_property(uuid,uuid,uuid,date,text),private.release_reservation(uuid,uuid,text),
private.renegotiate_sale(uuid,uuid,bigint,integer,date,text),private.cancel_sale(uuid,uuid,bigint,bigint,bigint,date,text),
public.reserve_property(uuid,uuid,uuid,date,text),public.release_reservation(uuid,uuid,text),
public.renegotiate_sale(uuid,uuid,bigint,integer,date,text),public.cancel_sale(uuid,uuid,bigint,bigint,bigint,date,text) from public,anon;
grant execute on function private.reserve_property(uuid,uuid,uuid,date,text),private.release_reservation(uuid,uuid,text),
private.renegotiate_sale(uuid,uuid,bigint,integer,date,text),private.cancel_sale(uuid,uuid,bigint,bigint,bigint,date,text),
public.reserve_property(uuid,uuid,uuid,date,text),public.release_reservation(uuid,uuid,text),
public.renegotiate_sale(uuid,uuid,bigint,integer,date,text),public.cancel_sale(uuid,uuid,bigint,bigint,bigint,date,text) to authenticated;
notify pgrst,'reload schema';

