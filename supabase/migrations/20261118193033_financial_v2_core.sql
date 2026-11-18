-- Account segmentation is metadata; opening amounts and ledger entries remain immutable.
alter table public.accounts
 add column segment text not null default 'general' check(segment in ('general','land','house')),
 add column opening_on date,
 add column request_id uuid unique,
 add column creation_terms jsonb,
 add column created_by uuid references auth.users(id),
 add column classification_reason text not null default '' check(length(classification_reason)<=2000),
 add column classification_changed_at timestamptz,
 add column classification_changed_by uuid references auth.users(id);
create index accounts_creator on public.accounts(created_by);
create index accounts_classifier on public.accounts(classification_changed_by);
alter table public.expenses drop constraint expenses_category_check;
alter table public.expenses add constraint expenses_category_check check(category in ('materials','labor','services','acquisition','other','refund','taxes','commission','freight','equipment','utilities'));

create function private.create_account_scoped(p_request uuid,p_name text,p_opening bigint,p_segment text,p_opening_on date) returns uuid
language plpgsql security definer set search_path=''
as $$ declare existing public.accounts; payload jsonb; result uuid; begin
 perform private.require_role(array['admin','finance']);
 if p_request is null or length(trim(coalesce(p_name,''))) not between 2 and 120 or p_opening is null or abs(p_opening::numeric)>1000000000000 or p_segment is null or p_segment not in ('general','land','house') or p_opening_on is null or p_opening_on>(now() at time zone 'America/Sao_Paulo')::date then raise exception 'Confira nome, saldo inicial, segmento e data de abertura da conta.'; end if;
 payload:=jsonb_build_object('name',trim(p_name),'opening',p_opening,'segment',p_segment,'date',p_opening_on);
 perform pg_advisory_xact_lock(hashtextextended(p_request::text,0));
 select * into existing from public.accounts where request_id=p_request;
 if found then
  if existing.creation_terms is distinct from payload or existing.created_by is distinct from auth.uid() then raise exception 'Solicitação já utilizada com outros dados.'; end if;
  return existing.id;
 end if;
 begin
 insert into public.accounts(name,opening_cents,segment,opening_on,request_id,creation_terms,created_by)
 values(trim(p_name),p_opening,p_segment,p_opening_on,p_request,payload,auth.uid()) returning id into result;
 exception when unique_violation then raise exception 'Já existe uma conta com esse nome.'; end;
 return result;
end $$;
create function public.create_account_scoped(p_request uuid,p_name text,p_opening bigint,p_segment text,p_opening_on date) returns uuid
language sql security invoker set search_path='' as $$ select private.create_account_scoped(p_request,p_name,p_opening,p_segment,p_opening_on) $$;

create function private.classify_account(p_account uuid,p_expected_segment text,p_expected_date date,p_segment text,p_opening_on date,p_reason text) returns void
language plpgsql security definer set search_path=''
as $$ declare account public.accounts; begin
 perform private.require_role(array['admin','finance']);
 if p_segment is null or p_segment not in ('general','land','house') or length(trim(coalesce(p_reason,''))) not between 5 and 2000 or p_opening_on>(now() at time zone 'America/Sao_Paulo')::date then raise exception 'Informe a classificação e uma justificativa válida.'; end if;
 select * into account from public.accounts where id=p_account for update;
 if not found then raise exception 'Conta não encontrada.'; end if;
 if account.segment is distinct from p_expected_segment or account.opening_on is distinct from p_expected_date then raise exception 'A classificação mudou. Atualize a tela.'; end if;
 if p_segment<>'general' and exists(select 1 from public.ledger l join public.properties p on p.id=l.property_id where l.account_id=p_account and p.kind<>p_segment) then raise exception 'A conta contém movimentos de outro segmento. Mantenha a classificação geral.'; end if;
 if p_opening_on is not null and exists(select 1 from public.ledger where account_id=p_account and occurred_on<p_opening_on) then raise exception 'A abertura não pode ser posterior às movimentações já registradas.'; end if;
 update public.accounts set segment=p_segment,opening_on=p_opening_on,classification_reason=trim(p_reason),classification_changed_at=now(),classification_changed_by=auth.uid() where id=p_account;
end $$;
create function public.classify_account(p_account uuid,p_expected_segment text,p_expected_date date,p_segment text,p_opening_on date,p_reason text) returns void
language sql security invoker set search_path='' as $$ select private.classify_account(p_account,p_expected_segment,p_expected_date,p_segment,p_opening_on,p_reason) $$;

-- Internal guard, called by definer writers, never directly granted to clients.
create function private.check_account_scope(p_account uuid,p_property uuid,p_date date,p_require_property boolean) returns void
language plpgsql security invoker set search_path=''
as $$ declare account public.accounts; kind text; begin
 select * into account from public.accounts where id=p_account for share;
 if not found then raise exception 'Conta não encontrada.'; end if;
 if account.opening_on is not null and p_date<account.opening_on then raise exception 'A movimentação não pode ser anterior à abertura da conta.'; end if;
 if account.segment<>'general' then
  if p_property is null and p_require_property then raise exception 'Use conta geral para uma obrigação sem imóvel vinculado.'; end if;
  if p_property is not null then
   select p.kind into kind from public.properties p where p.id=p_property;
   if kind is distinct from account.segment then raise exception 'O imóvel e a conta pertencem a segmentos diferentes.'; end if;
  end if;
 end if;
end $$;
revoke execute on function private.check_account_scope(uuid,uuid,date,boolean) from public,anon,authenticated;

create function private.record_payment_described(p_request uuid,p_installment uuid,p_expense uuid,p_account uuid,p_amount bigint,p_date date,p_method text,p_description text,p_notes text)
returns uuid language plpgsql security definer set search_path=''
as $$ declare target bigint; paid bigint; pid uuid; rid uuid; desc_text text; previous public.ledger; sid uuid; sale_state text; installment_state text; begin
 perform private.require_role(array['admin','finance']);
 if length(trim(coalesce(p_description,''))) not between 2 and 2000 or length(coalesce(p_notes,''))>2000 then raise exception 'Informe Referente a quê? (2 a 2000 caracteres) e confira as observações.'; end if;
 p_description:=trim(p_description);p_notes:=trim(coalesce(p_notes,''));
 if p_request is null or p_amount is null or p_amount<=0 or p_date is null or p_date>(now() at time zone 'America/Sao_Paulo')::date or length(trim(coalesce(p_method,'')))=0 or num_nonnulls(p_installment,p_expense)<>1 then raise exception 'Pagamento inválido.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_request::text,0));
 select * into previous from public.ledger where request_id=p_request;
 if found then
 if previous.installment_id is distinct from p_installment or previous.expense_id is distinct from p_expense or previous.account_id is distinct from p_account or abs(previous.amount_cents)<>p_amount or previous.occurred_on<>p_date or previous.method<>p_method or previous.description<>p_description or previous.notes<>p_notes then raise exception 'Solicitação já utilizada com outros dados.'; end if;
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
 perform private.check_account_scope(p_account,pid,p_date,true);
 if p_amount>target-paid then raise exception 'Valor superior ao saldo pendente.'; end if;
 insert into public.ledger(request_id,account_id,property_id,installment_id,expense_id,amount_cents,occurred_on,category,description,method,created_by,notes)
 values(p_request,p_account,pid,p_installment,p_expense,case when p_installment is not null then p_amount else -p_amount end,p_date,case when p_installment is not null then 'sale' else 'expense' end,p_description,p_method,auth.uid(),p_notes) returning id into rid;
 return rid;
end $$;

create function public.record_payment_described(p_request uuid,p_installment uuid,p_expense uuid,p_account uuid,p_amount bigint,p_date date,p_method text,p_description text,p_notes text) returns uuid
language sql security invoker set search_path='' as $$ select private.record_payment_described(p_request,p_installment,p_expense,p_account,p_amount,p_date,p_method,p_description,p_notes) $$;
-- Keep the original RPC compatible with existing clients and their retries.
create or replace function private.record_payment(p_request uuid,p_installment uuid,p_expense uuid,p_account uuid,p_amount bigint,p_date date,p_method text) returns uuid
language plpgsql security definer set search_path=''
as $$ declare previous public.ledger; description text; begin
 perform private.require_role(array['admin','finance']);
 perform pg_advisory_xact_lock(hashtextextended(p_request::text,0));
 select * into previous from public.ledger where request_id=p_request;
 if found then
  if previous.installment_id is distinct from p_installment or previous.expense_id is distinct from p_expense or previous.account_id is distinct from p_account or abs(previous.amount_cents) is distinct from p_amount or previous.occurred_on is distinct from p_date or previous.method is distinct from p_method then raise exception 'Solicitação já utilizada com outros dados.'; end if;
  return previous.id;
 end if;
 description:=case when p_installment is not null then 'Recebimento de parcela' else (select e.description from public.expenses e where id=p_expense) end;
 return private.record_payment_described(p_request,p_installment,p_expense,p_account,p_amount,p_date,p_method,description,'');
end $$;

create or replace function private.record_income(p_request uuid,p_property uuid,p_contact uuid,p_account uuid,p_amount bigint,p_date date,p_description text,p_method text,p_notes text)
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
 perform private.check_account_scope(p_account,p_property,p_date,false);
 insert into public.ledger(request_id,account_id,property_id,contact_id,amount_cents,occurred_on,category,description,method,notes,created_by)
 values(p_request,p_account,p_property,p_contact,p_amount,p_date,'other_income',trim(p_description),trim(p_method),trim(coalesce(p_notes,'')),auth.uid()) returning id into result;
 return result;
end $$;

create or replace function private.register_purchase(p_request uuid,p_property uuid,p_contact uuid,p_description text,p_category text,p_amount bigint,p_purchased date,p_due date,p_notes text,p_quantity numeric,p_unit text,p_classification text)
returns uuid language plpgsql security definer set search_path=''
as $$ declare previous public.expenses; payload jsonb; result uuid; quantity numeric; unit text; begin
 perform private.require_role(array['admin','finance','works']);
 if p_request is null or p_purchased is null or p_purchased>(now() at time zone 'America/Sao_Paulo')::date or p_due is null then raise exception 'Informe a data da compra (até hoje) e o vencimento.'; end if;
 if p_property is null and private.current_role()='works' then raise exception 'Selecione o imóvel ou obra.'; end if;
 if p_category is null or p_category not in ('materials','labor','services','other','taxes','commission','freight','equipment','utilities') then raise exception 'Selecione uma categoria de compra ou despesa.'; end if;
 if length(trim(coalesce(p_description,''))) not between 2 and 2000 or length(coalesce(p_notes,''))>2000 or length(trim(coalesce(p_classification,'')))>80 then raise exception 'Confira a descrição, a classificação e as observações.'; end if;
 if p_amount is null or p_amount not between 1 and 1000000000000 then raise exception 'Informe um valor total maior que zero.'; end if;
 quantity:=coalesce(p_quantity,1); unit:=coalesce(nullif(trim(p_unit),''),'registro');
 if quantity<=0 or quantity>=1000000000 or round(quantity,3)<>quantity or length(unit)>30 then raise exception 'Confira a quantidade (até três casas decimais) e a unidade.'; end if;
 payload:=jsonb_build_object('property',p_property,'contact',p_contact,'description',trim(p_description),'category',p_category,'amount',p_amount,'purchased',p_purchased,'due',p_due,'notes',trim(coalesce(p_notes,'')),'quantity',quantity,'unit',unit,'classification',trim(coalesce(p_classification,'')));
 perform pg_advisory_xact_lock(hashtextextended(p_request::text,0));
 select * into previous from public.expenses where request_id=p_request;
 if found then
  if previous.purchase_terms is distinct from payload or previous.created_by is distinct from auth.uid() then raise exception 'Esta solicitação já foi utilizada com outros dados. Atualize a tela.'; end if;
  return previous.id;
 end if;
 if p_property is not null then
  perform 1 from public.properties where id=p_property for share;
  if not found then raise exception 'Imóvel não encontrado.'; end if;
 end if;
 if p_contact is not null then
  perform 1 from public.contacts where id=p_contact and kind in ('supplier','provider') for share;
  if not found then raise exception 'Selecione um fornecedor ou prestador válido.'; end if;
 end if;
 insert into public.expenses(request_id,property_id,contact_id,description,category,quantity,unit,amount_cents,due_on,purchased_on,notes,classification,created_by,purchase_terms)
 values(p_request,p_property,p_contact,trim(p_description),p_category,quantity,unit,p_amount,p_due,p_purchased,trim(coalesce(p_notes,'')),trim(coalesce(p_classification,'')),auth.uid(),payload) returning id into result;
 return result;
end $$;

create or replace function private.create_expense(p_request uuid,p_property uuid,p_contact uuid,p_description text,p_category text,p_quantity numeric,p_unit text,p_amount bigint,p_due date)
returns uuid language plpgsql security definer set search_path=''
as $$ declare rid uuid; begin
 perform private.require_role(array['admin','finance','works']);
 if p_due is null then raise exception 'Informe o vencimento.'; end if;
 if p_property is null and private.current_role()='works' then raise exception 'Selecione a obra.'; end if;
 if p_category not in ('materials','labor','services','other','taxes','commission','freight','equipment','utilities') then raise exception 'Aquisição e devolução de distrato devem usar seus fluxos próprios.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_request::text,0));
 select id into rid from public.expenses where request_id=p_request; if found then return rid; end if;
 insert into public.expenses(request_id,property_id,contact_id,description,category,quantity,unit,amount_cents,due_on)
 values(p_request,p_property,p_contact,p_description,p_category,p_quantity,p_unit,p_amount,p_due) returning id into rid;
 return rid;
end $$;


revoke execute on function private.create_account_scoped(uuid,text,bigint,text,date),public.create_account_scoped(uuid,text,bigint,text,date),private.classify_account(uuid,text,date,text,date,text),public.classify_account(uuid,text,date,text,date,text),private.record_payment_described(uuid,uuid,uuid,uuid,bigint,date,text,text,text),public.record_payment_described(uuid,uuid,uuid,uuid,bigint,date,text,text,text) from public,anon;
grant execute on function private.create_account_scoped(uuid,text,bigint,text,date),public.create_account_scoped(uuid,text,bigint,text,date),private.classify_account(uuid,text,date,text,date,text),public.classify_account(uuid,text,date,text,date,text),private.record_payment_described(uuid,uuid,uuid,uuid,bigint,date,text,text,text),public.record_payment_described(uuid,uuid,uuid,uuid,bigint,date,text,text,text) to authenticated;
notify pgrst,'reload schema';
