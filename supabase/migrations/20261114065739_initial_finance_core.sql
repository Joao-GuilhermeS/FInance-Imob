-- Single-company MVP. Amounts are integer BRL cents. All complex writes are atomic RPCs.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.profiles (
 id uuid primary key references auth.users(id), name text not null,
 role text not null check(role in ('admin','finance','sales','works')),
 alert_days integer not null default 5 check(alert_days between 0 and 60)
);
alter table public.profiles enable row level security;
create policy own_profile on public.profiles for select to authenticated using(id = (select auth.uid()));
revoke all on public.profiles from anon,authenticated;
grant select on public.profiles to authenticated;

create function private.current_role() returns text language sql stable security invoker set search_path = ''
as $$ select role from public.profiles where id = (select auth.uid()) $$;
create function private.require_role(allowed text[]) returns void language plpgsql security invoker set search_path = ''
as $$ begin
 if auth.uid() is null or not coalesce(private.current_role() = any(allowed), false) then
 raise exception 'Sem permissão para esta operação.' using errcode='42501'; end if;
end $$;

create table public.contacts (
 id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name)) between 2 and 160),
 document text not null default '', kind text not null check(kind in ('client','supplier','provider')),
 phone text not null default '', email text not null default '', address text not null default '',
 notes text not null default '', created_at timestamptz not null default now()
);
create unique index contact_document on public.contacts(document) where document <> '';
create table public.properties (
 id uuid primary key default gen_random_uuid(), code text not null unique, name text not null,
 kind text not null check(kind in ('land','house')), address text not null default '',
 acquisition_cents bigint not null default 0 check(acquisition_cents between 0 and 1000000000000),
 asking_cents bigint not null default 0 check(asking_cents between 0 and 1000000000000),
 budget_cents bigint not null default 0 check(budget_cents between 0 and 1000000000000),
 commercial_status text not null default 'available' check(commercial_status in ('available','reserved','sold')),
 construction_status text not null default 'planning' check(construction_status in ('planning','building','finishing','completed')),
 notes text not null default '', created_at timestamptz not null default now()
);
create table public.accounts (
 id uuid primary key default gen_random_uuid(), name text not null unique,
 opening_cents bigint not null default 0 check(abs(opening_cents) <= 1000000000000)
);
create table public.sales (
 id uuid primary key default gen_random_uuid(), request_id uuid not null unique,
 contact_id uuid not null references public.contacts(id), property_id uuid not null unique references public.properties(id),
 total_cents bigint not null check(total_cents between 1 and 1000000000000),
 sold_on date not null, created_by uuid not null references auth.users(id), created_at timestamptz not null default now()
);
create index sales_contact on public.sales(contact_id);
create index sales_creator on public.sales(created_by);
create table public.installments (
 id uuid primary key default gen_random_uuid(), sale_id uuid not null references public.sales(id),
 number integer not null, amount_cents bigint not null check(amount_cents > 0), due_on date not null,
 unique(sale_id, number)
);
create index installments_due on public.installments(due_on);
create table public.expenses (
 id uuid primary key default gen_random_uuid(), request_id uuid not null unique,
 property_id uuid references public.properties(id), contact_id uuid references public.contacts(id),
 description text not null check(length(trim(description)) > 1),
 category text not null check(category in ('materials','labor','services','acquisition','other')),
 quantity numeric(12,3) not null default 1 check(quantity > 0), unit text not null default 'un',
 amount_cents bigint not null check(amount_cents between 1 and 1000000000000),
 due_on date not null, created_at timestamptz not null default now()
);
create index expenses_property on public.expenses(property_id);
create index expenses_contact on public.expenses(contact_id);
create table public.ledger (
 id uuid primary key default gen_random_uuid(), request_id uuid not null unique,
 account_id uuid not null references public.accounts(id), property_id uuid references public.properties(id),
 installment_id uuid references public.installments(id), expense_id uuid references public.expenses(id),
 amount_cents bigint not null check(amount_cents <> 0 and abs(amount_cents) <= 1000000000000),
 occurred_on date not null, category text not null, description text not null check(length(trim(description)) > 1),
 method text not null, reversal_of uuid unique references public.ledger(id),
 created_by uuid not null references auth.users(id), created_at timestamptz not null default now(),
 check(num_nonnulls(installment_id, expense_id) <= 1)
);
create index ledger_account on public.ledger(account_id);
create index ledger_property on public.ledger(property_id);
create index ledger_installment on public.ledger(installment_id);
create index ledger_expense on public.ledger(expense_id);
create index ledger_creator on public.ledger(created_by);
create index ledger_date on public.ledger(occurred_on);
create table public.audit_log (
 id bigint generated always as identity primary key, actor_id uuid, operation text not null,
 entity text not null, record_id text not null, before_data jsonb, after_data jsonb,
 occurred_at timestamptz not null default now()
);
create function private.audit_change() returns trigger language plpgsql security definer set search_path = ''
as $$ begin
 insert into public.audit_log(actor_id,operation,entity,record_id,before_data,after_data)
 values(auth.uid(),tg_op,tg_table_name,new.id::text,case when tg_op='UPDATE' then to_jsonb(old) else null end,to_jsonb(new));
 return new;
end $$;
revoke all on function private.audit_change() from public, anon, authenticated;

do $$
declare tab text;
begin
 foreach tab in array array['contacts','properties','accounts','sales','installments','expenses','ledger','audit_log'] loop
 execute format('alter table public.%I enable row level security',tab);
 execute format('revoke all on public.%I from anon,authenticated',tab);
 execute format('grant select on public.%I to authenticated',tab);
 if tab='audit_log' then
 execute format('create policy member_read on public.%I for select to authenticated using ((select private.current_role()) = ''admin'')',tab);
 elsif tab in ('ledger','accounts') then
 execute format('create policy member_read on public.%I for select to authenticated using ((select private.current_role()) in (''admin'',''finance''))',tab);
 elsif tab in ('sales','installments') then
 execute format('create policy member_read on public.%I for select to authenticated using ((select private.current_role()) in (''admin'',''finance'',''sales''))',tab);
 elsif tab='expenses' then
 execute format('create policy member_read on public.%I for select to authenticated using ((select private.current_role()) in (''admin'',''finance'',''works''))',tab);
 else
 execute format('create policy member_read on public.%I for select to authenticated using ((select private.current_role()) is not null)',tab);
 end if;
 if tab <> 'audit_log' then
 execute format('create trigger audit_change after insert or update on public.%I for each row execute function private.audit_change()',tab);
 end if;
 end loop;
end $$;
-- Finance data is read-only through the Data API. Mutations require the RPCs below.
grant insert on public.contacts, public.properties to authenticated;
grant update (name,document,kind,phone,email,address,notes) on public.contacts to authenticated;
grant update (name,address,asking_cents,budget_cents,construction_status,notes) on public.properties to authenticated;
create policy contact_insert on public.contacts for insert to authenticated with check((select private.current_role()) in ('admin','sales','works','finance'));
create policy contact_update on public.contacts for update to authenticated using((select private.current_role()) in ('admin','sales','finance')) with check((select private.current_role()) in ('admin','sales','finance'));
create policy property_insert on public.properties for insert to authenticated with check((select private.current_role()) in ('admin','sales') and commercial_status <> 'sold');
create policy property_update on public.properties for update to authenticated using((select private.current_role()) in ('admin','sales','works')) with check((select private.current_role()) in ('admin','sales','works'));

create view public.installment_balances with (security_invoker = true) as
select i.*, coalesce((select sum(l.amount_cents) from public.ledger l where l.installment_id=i.id),0)::bigint received_cents,
 c.name client_name,p.code property_code
from public.installments i join public.sales s on s.id=i.sale_id join public.contacts c on c.id=s.contact_id join public.properties p on p.id=s.property_id;
create view public.expense_balances with (security_invoker = true) as
select e.*, coalesce((select -sum(l.amount_cents) from public.ledger l where l.expense_id=e.id),0)::bigint paid_cents
from public.expenses e;
grant select on public.installment_balances, public.expense_balances to authenticated;

-- Only the verified owner email can bootstrap the first administrator. No public user becomes a member by signing up.
create function private.bootstrap_owner() returns trigger language plpgsql security definer set search_path = ''
as $$ begin
 if lower(new.email)='perseu.wr@gmail.com' and new.email_confirmed_at is not null then
 insert into public.profiles(id,name,role) values(new.id,'Administrador','admin') on conflict(id) do nothing;
 end if;
 return new;
end $$;
revoke all on function private.bootstrap_owner() from public, anon, authenticated;
create trigger bootstrap_owner after insert or update of email_confirmed_at on auth.users for each row execute function private.bootstrap_owner();
insert into public.profiles(id,name,role)
select id,'Administrador','admin' from auth.users where lower(email)='perseu.wr@gmail.com' and email_confirmed_at is not null
on conflict(id) do nothing;

create function private.create_sale(p_request uuid,p_contact uuid,p_property uuid,p_total bigint,p_down bigint,p_count integer,p_sold date,p_first date)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare sid uuid; existing public.sales; prop public.properties; remaining bigint; base bigint; i integer;
begin
 perform private.require_role(array['admin','sales']);
 select * into existing from public.sales where request_id=p_request;
 if found then
  if existing.contact_id<>p_contact or existing.property_id<>p_property or existing.total_cents<>p_total then raise exception 'Solicitação já utilizada.'; end if;
  return existing.id;
 end if;
 if p_total is null or p_down is null or p_count is null or p_sold is null or p_first is null or
 p_total<=0 or p_total>1000000000000 or p_down<0 or p_down>p_total or p_count<1 or p_count>600 or p_first<p_sold then
 raise exception 'Condições de venda inválidas.'; end if;
 select * into prop from public.properties where id=p_property for update;
 if not found or prop.commercial_status='sold' then raise exception 'Imóvel indisponível.'; end if;
 if not exists(select 1 from public.contacts where id=p_contact and kind='client') then raise exception 'Selecione um cliente.'; end if;
 remaining := p_total-p_down;
 if remaining>0 and remaining<p_count then raise exception 'Quantidade de parcelas excede o saldo em centavos.'; end if;
 insert into public.sales(request_id,contact_id,property_id,total_cents,sold_on,created_by)
 values(p_request,p_contact,p_property,p_total,p_sold,auth.uid()) returning id into sid;
 if p_down>0 then insert into public.installments(sale_id,number,amount_cents,due_on) values(sid,0,p_down,p_sold); end if;
 if remaining>0 then
 base:=remaining/p_count;
 for i in 1..p_count loop
 insert into public.installments(sale_id,number,amount_cents,due_on)
 values(sid,i,base+case when i=p_count then remaining-base*p_count else 0 end,(p_first+make_interval(months=>i-1))::date);
 end loop;
 end if;
 update public.properties set commercial_status='sold' where id=p_property;
 return sid;
end $$;
create function public.create_sale(p_request uuid,p_contact uuid,p_property uuid,p_total bigint,p_down bigint,p_count integer,p_sold date,p_first date)
returns uuid language sql security invoker set search_path='' as $$ select private.create_sale(p_request,p_contact,p_property,p_total,p_down,p_count,p_sold,p_first) $$;

create function private.record_payment(p_request uuid,p_installment uuid,p_expense uuid,p_account uuid,p_amount bigint,p_date date,p_method text)
returns uuid language plpgsql security definer set search_path=''
as $$
declare target bigint; paid bigint; pid uuid; rid uuid; desc_text text; existing public.ledger;
begin
 perform private.require_role(array['admin','finance']);
 if p_request is null or p_amount is null or p_amount<=0 or p_date is null or p_date>(now() at time zone 'America/Sao_Paulo')::date or length(trim(coalesce(p_method,'')))=0 or num_nonnulls(p_installment,p_expense)<>1 then raise exception 'Pagamento inválido.'; end if;
 -- Serialize retries before checking the idempotency key.
 perform pg_advisory_xact_lock(hashtextextended(p_request::text,0));
 select * into existing from public.ledger where request_id=p_request;
 if found then
 if existing.installment_id is distinct from p_installment or existing.expense_id is distinct from p_expense or existing.account_id<>p_account or abs(existing.amount_cents)<>p_amount then raise exception 'Solicitação já utilizada.'; end if;
 return existing.id;
 end if;
 if p_installment is not null then
 select i.amount_cents,s.property_id into target,pid from public.installments i join public.sales s on s.id=i.sale_id where i.id=p_installment for update of i;
 if not found then raise exception 'Parcela não encontrada.'; end if;
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
create function public.record_payment(p_request uuid,p_installment uuid,p_expense uuid,p_account uuid,p_amount bigint,p_date date,p_method text)
returns uuid language sql security invoker set search_path='' as $$ select private.record_payment(p_request,p_installment,p_expense,p_account,p_amount,p_date,p_method) $$;

create function private.create_expense(p_request uuid,p_property uuid,p_contact uuid,p_description text,p_category text,p_quantity numeric,p_unit text,p_amount bigint,p_due date)
returns uuid language plpgsql security definer set search_path=''
as $$
declare rid uuid;
begin
 perform private.require_role(array['admin','finance','works']);
 if p_due is null then raise exception 'Informe o vencimento.'; end if;
 if p_property is null and private.current_role()='works' then raise exception 'Selecione a obra.'; end if;
 if p_category='acquisition' then raise exception 'O custo de aquisição já está no imóvel. Use outra categoria para despesas adicionais.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_request::text,0));
 select id into rid from public.expenses where request_id=p_request;
 if found then return rid; end if;
 insert into public.expenses(request_id,property_id,contact_id,description,category,quantity,unit,amount_cents,due_on)
 values(p_request,p_property,p_contact,p_description,p_category,p_quantity,p_unit,p_amount,p_due) returning id into rid;
 return rid;
end $$;
create function public.create_expense(p_request uuid,p_property uuid,p_contact uuid,p_description text,p_category text,p_quantity numeric,p_unit text,p_amount bigint,p_due date)
returns uuid language sql security invoker set search_path='' as $$ select private.create_expense(p_request,p_property,p_contact,p_description,p_category,p_quantity,p_unit,p_amount,p_due) $$;

create function private.create_account(p_name text,p_opening bigint) returns uuid language plpgsql security definer set search_path=''
as $$ declare rid uuid; begin
 perform private.require_role(array['admin','finance']);
 insert into public.accounts(name,opening_cents) values(p_name,p_opening) returning id into rid;
 return rid;
end $$;
create function public.create_account(p_name text,p_opening bigint) returns uuid language sql security invoker set search_path='' as $$ select private.create_account(p_name,p_opening) $$;

create function private.reverse_entry(p_entry uuid,p_reason text) returns uuid language plpgsql security definer set search_path=''
as $$ declare e public.ledger; rid uuid; begin
 perform private.require_role(array['admin','finance']);
 if length(trim(coalesce(p_reason,'')))<5 then raise exception 'Informe um motivo com pelo menos 5 caracteres.'; end if;
 select * into e from public.ledger where id=p_entry;
 if not found or e.reversal_of is not null then raise exception 'Lançamento inválido.'; end if;
 -- Same parent locks as record_payment protect the outstanding balance.
 if e.installment_id is not null then perform 1 from public.installments where id=e.installment_id for update; end if;
 if e.expense_id is not null then perform 1 from public.expenses where id=e.expense_id for update; end if;
 perform 1 from public.ledger where id=p_entry for update;
 if exists(select 1 from public.ledger where reversal_of=p_entry) then raise exception 'Lançamento já estornado.'; end if;
 insert into public.ledger(request_id,account_id,property_id,installment_id,expense_id,amount_cents,occurred_on,category,description,method,reversal_of,created_by)
 values(gen_random_uuid(),e.account_id,e.property_id,e.installment_id,e.expense_id,-e.amount_cents,(now() at time zone 'America/Sao_Paulo')::date,e.category,'Estorno: '||p_reason,e.method,e.id,auth.uid()) returning id into rid;
 return rid;
end $$;
create function public.reverse_entry(p_entry uuid,p_reason text) returns uuid language sql security invoker set search_path='' as $$ select private.reverse_entry(p_entry,p_reason) $$;

create function private.set_profile(p_email text,p_name text,p_role text) returns void language plpgsql security definer set search_path=''
as $$ declare uid uuid; begin
 perform private.require_role(array['admin']);
 if p_role not in ('admin','finance','sales','works') or length(trim(p_name))<2 then raise exception 'Perfil inválido.'; end if;
 select id into uid from auth.users where lower(email)=lower(p_email) and email_confirmed_at is not null;
 if uid is null then raise exception 'Usuário não encontrado ou e-mail não confirmado. Crie o acesso no painel Authentication do Supabase.'; end if;
 if uid=auth.uid() and p_role<>'admin' then raise exception 'Não é permitido remover seu próprio acesso administrativo.'; end if;
 insert into public.profiles(id,name,role) values(uid,p_name,p_role) on conflict(id) do update set name=excluded.name,role=excluded.role;
end $$;
create function public.set_profile(p_email text,p_name text,p_role text) returns void language sql security invoker set search_path='' as $$ select private.set_profile(p_email,p_name,p_role) $$;

create function public.set_alert_days(p_days integer) returns void language sql security invoker set search_path=''
as $$ update public.profiles set alert_days=p_days where id=(select auth.uid()) $$;
grant update(alert_days) on public.profiles to authenticated;
create policy own_alert_update on public.profiles for update to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
create trigger audit_profile after insert or update on public.profiles for each row execute function private.audit_change();

-- Deny implicit EXECUTE grants to anonymous callers.
revoke all on all functions in schema private from public,anon;
grant execute on function private.current_role(),private.require_role(text[]) to authenticated;
grant execute on function private.create_sale(uuid,uuid,uuid,bigint,bigint,integer,date,date),
 private.record_payment(uuid,uuid,uuid,uuid,bigint,date,text),
 private.create_expense(uuid,uuid,uuid,text,text,numeric,text,bigint,date),
 private.create_account(text,bigint),private.reverse_entry(uuid,text),private.set_profile(text,text,text) to authenticated;
revoke execute on function public.create_sale(uuid,uuid,uuid,bigint,bigint,integer,date,date),
 public.record_payment(uuid,uuid,uuid,uuid,bigint,date,text),
 public.create_expense(uuid,uuid,uuid,text,text,numeric,text,bigint,date),
 public.create_account(text,bigint),public.reverse_entry(uuid,text),public.set_profile(text,text,text),public.set_alert_days(integer) from public,anon;
grant execute on function public.create_sale(uuid,uuid,uuid,bigint,bigint,integer,date,date),
 public.record_payment(uuid,uuid,uuid,uuid,bigint,date,text),
 public.create_expense(uuid,uuid,uuid,text,text,numeric,text,bigint,date),
 public.create_account(text,bigint),public.reverse_entry(uuid,text),public.set_profile(text,text,text),public.set_alert_days(integer) to authenticated;
notify pgrst,'reload schema';

