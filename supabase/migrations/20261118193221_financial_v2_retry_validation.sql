-- Validate target type before any legacy retry lookup.
create or replace function private.record_payment(p_request uuid,p_installment uuid,p_expense uuid,p_account uuid,p_amount bigint,p_date date,p_method text) returns uuid
language plpgsql security definer set search_path=''
as $$ declare previous public.ledger; description text; begin
 perform private.require_role(array['admin','finance']);
 if p_request is null or p_amount is null or p_amount<=0 or p_date is null or p_date>(now() at time zone 'America/Sao_Paulo')::date or length(trim(coalesce(p_method,'')))=0 or num_nonnulls(p_installment,p_expense)<>1 then raise exception 'Pagamento inválido.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_request::text,0));
 select * into previous from public.ledger where request_id=p_request;
 if found then
  if previous.installment_id is distinct from p_installment or previous.expense_id is distinct from p_expense or previous.account_id is distinct from p_account or abs(previous.amount_cents) is distinct from p_amount or previous.occurred_on is distinct from p_date or previous.method is distinct from p_method then raise exception 'Solicitação já utilizada com outros dados.'; end if;
  return previous.id;
 end if;
 description:=case when p_installment is not null then 'Recebimento de parcela' else (select e.description from public.expenses e where id=p_expense) end;
 return private.record_payment_described(p_request,p_installment,p_expense,p_account,p_amount,p_date,p_method,description,'');
end $$;

notify pgrst,'reload schema';
