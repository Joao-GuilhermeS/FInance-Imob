alter table public.ledger
 add column contact_id uuid references public.contacts(id),
 add column notes text not null default '' check(length(notes)<=2000);
create index ledger_contact on public.ledger(contact_id);
alter table public.expenses add column opening_paid_cents bigint not null default 0
 check(opening_paid_cents>=0 and opening_paid_cents<=amount_cents and (category='acquisition' or opening_paid_cents=0));
create unique index expenses_one_acquisition on public.expenses(property_id) where category='acquisition';
alter table public.expenses add constraint acquisition_requires_property check(category<>'acquisition' or property_id is not null);
alter policy member_read on public.expenses using((select private.current_role()) in ('admin','finance') or ((select private.current_role())='works' and category not in ('refund','acquisition')));
create or replace view public.expense_balances with(security_invoker=true) as
select e.id,e.request_id,e.property_id,e.contact_id,e.description,e.category,e.quantity,e.unit,e.amount_cents,e.due_on,e.created_at,
 (e.opening_paid_cents+coalesce((select -sum(l.amount_cents) from public.ledger l where l.expense_id=e.id),0))::bigint as paid_cents,e.refund_sale_id,
 e.purchased_on,e.notes,e.classification,e.created_by,e.opening_paid_cents
from public.expenses e;

create function private.record_income(p_request uuid,p_property uuid,p_contact uuid,p_account uuid,p_amount bigint,p_date date,p_description text,p_method text,p_notes text)
returns uuid language plpgsql security definer set search_path=''
as $$ declare previous public.ledger; result uuid; begin
 perform private.require_role(array['admin','finance']);
 if p_request is null or p_account is null or p_amount is null or p_amount not between 1 and 1000000000000 or p_date is null or p_date>(now() at time zone 'America/Sao_Paulo')::date or length(trim(coalesce(p_description,''))) not between 2 and 2000 or length(trim(coalesce(p_method,''))) not between 1 and 80 or length(coalesce(p_notes,''))>2000 then raise exception 'Confira os dados do recebimento e use uma data até hoje.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_request::text,0));
 select * into previous from public.ledger where request_id=p_request;
 if found then
  if previous.category<>'other_income' or previous.reversal_of is not null or previous.created_by is distinct from auth.uid() or previous.property_id is distinct from p_property or previous.contact_id is distinct from p_contact or previous.account_id<>p_account or previous.amount_cents<>p_amount or previous.occurred_on<>p_date or previous.description<>trim(p_description) or previous.method<>trim(p_method) or previous.notes<>trim(coalesce(p_notes,'')) then raise exception 'Solicitação já utilizada com outros dados.'; end if;
  return previous.id;
 end if;
 insert into public.ledger(request_id,account_id,property_id,contact_id,amount_cents,occurred_on,category,description,method,notes,created_by)
 values(p_request,p_account,p_property,p_contact,p_amount,p_date,'other_income',trim(p_description),trim(p_method),trim(coalesce(p_notes,'')),auth.uid()) returning id into result;
 return result;
end $$;
create function public.record_income(p_request uuid,p_property uuid,p_contact uuid,p_account uuid,p_amount bigint,p_date date,p_description text,p_method text,p_notes text)
returns uuid language sql security invoker set search_path='' as $$ select private.record_income(p_request,p_property,p_contact,p_account,p_amount,p_date,p_description,p_method,p_notes) $$;

create function private.prepare_acquisition(p_request uuid,p_property uuid,p_contact uuid,p_expected bigint,p_opening_paid bigint,p_due date,p_reason text)
returns uuid language plpgsql security definer set search_path=''
as $$ declare p public.properties; previous public.expenses; payload jsonb; result uuid; begin
 perform private.require_role(array['admin','finance']);
 if p_request is null or p_property is null or p_expected is null or p_opening_paid is null or p_opening_paid<0 or p_due is null or length(trim(coalesce(p_reason,''))) not between 5 and 2000 then raise exception 'Informe o imóvel, o valor já pago, o vencimento e a justificativa.'; end if;
 payload:=jsonb_build_object('property',p_property,'contact',p_contact,'expected',p_expected,'opening_paid',p_opening_paid,'due',p_due,'reason',trim(p_reason));
 perform pg_advisory_xact_lock(hashtextextended(p_request::text,0));
 select * into previous from public.expenses where request_id=p_request;
 if found then
  if previous.category<>'acquisition' or previous.purchase_terms is distinct from payload or previous.created_by is distinct from auth.uid() then raise exception 'Solicitação já utilizada com outros dados.'; end if;
  return previous.id;
 end if;
 select * into p from public.properties where id=p_property for update;
 if not found or p.acquisition_cents<=0 then raise exception 'Imóvel não encontrado ou sem custo de aquisição positivo.'; end if;
 if p.acquisition_cents<>p_expected then raise exception 'O custo de aquisição mudou. Atualize os dados antes de continuar.'; end if;
 if p_opening_paid>p.acquisition_cents then raise exception 'O valor já pago não pode superar o custo de aquisição.'; end if;
 if exists(select 1 from public.expenses where property_id=p.id and category='acquisition') then raise exception 'A aquisição deste imóvel já está em controle.'; end if;
 insert into public.expenses(request_id,property_id,contact_id,description,category,quantity,unit,amount_cents,due_on,purchased_on,notes,created_by,purchase_terms,opening_paid_cents)
 values(p_request,p.id,p_contact,'Aquisição do imóvel '||p.code,'acquisition',1,'imóvel',p.acquisition_cents,p_due,p.acquisition_on,trim(p_reason),auth.uid(),payload,p_opening_paid) returning id into result;
 return result;
end $$;
create function public.prepare_acquisition(p_request uuid,p_property uuid,p_contact uuid,p_expected bigint,p_opening_paid bigint,p_due date,p_reason text)
returns uuid language sql security invoker set search_path='' as $$ select private.prepare_acquisition(p_request,p_property,p_contact,p_expected,p_opening_paid,p_due,p_reason) $$;
revoke execute on function private.record_income(uuid,uuid,uuid,uuid,bigint,date,text,text,text),public.record_income(uuid,uuid,uuid,uuid,bigint,date,text,text,text),
 private.prepare_acquisition(uuid,uuid,uuid,bigint,bigint,date,text),public.prepare_acquisition(uuid,uuid,uuid,bigint,bigint,date,text) from public,anon;
grant execute on function private.record_income(uuid,uuid,uuid,uuid,bigint,date,text,text,text),public.record_income(uuid,uuid,uuid,uuid,bigint,date,text,text,text),
 private.prepare_acquisition(uuid,uuid,uuid,bigint,bigint,date,text),public.prepare_acquisition(uuid,uuid,uuid,bigint,bigint,date,text) to authenticated;

-- Preserve payment and reversal behavior; opening recognition is never a cash entry.
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
 select opening_paid_cents into paid from public.expenses where id=p_expense;
 select paid+coalesce(-sum(amount_cents),0) into paid from public.ledger where expense_id=p_expense;
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
 insert into public.ledger(request_id,account_id,property_id,installment_id,expense_id,amount_cents,occurred_on,category,description,method,reversal_of,created_by,contact_id,notes)
 values(gen_random_uuid(),e.account_id,e.property_id,e.installment_id,e.expense_id,-e.amount_cents,(now() at time zone 'America/Sao_Paulo')::date,e.category,'Estorno: '||trim(p_reason),e.method,e.id,auth.uid(),e.contact_id,e.notes) returning id into rid;
 return rid;
end $$;


notify pgrst,'reload schema';
