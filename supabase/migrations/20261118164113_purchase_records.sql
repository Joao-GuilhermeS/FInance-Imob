-- Purchases are financial records, without product catalog or stock movements.
-- Unknown historical purchase dates stay NULL; registration date is not purchase date.
alter table public.expenses
 add column purchased_on date,
 add column notes text not null default '' check(length(notes)<=2000),
 add column classification text not null default '' check(length(classification)<=80),
 add column created_by uuid references auth.users(id),
 add column purchase_terms jsonb;
create index expenses_purchase_date on public.expenses(purchased_on,id);
create index expenses_created_by on public.expenses(created_by);

create or replace view public.expense_balances with(security_invoker=true) as
select e.id,e.request_id,e.property_id,e.contact_id,e.description,e.category,e.quantity,e.unit,e.amount_cents,e.due_on,e.created_at,
 coalesce((select -sum(l.amount_cents) from public.ledger l where l.expense_id=e.id),0)::bigint as paid_cents,e.refund_sale_id,
 e.purchased_on,e.notes,e.classification,e.created_by
from public.expenses e;

create function private.register_purchase(p_request uuid,p_property uuid,p_contact uuid,p_description text,p_category text,p_amount bigint,p_purchased date,p_due date,p_notes text,p_quantity numeric,p_unit text,p_classification text)
returns uuid language plpgsql security definer set search_path=''
as $$ declare previous public.expenses; payload jsonb; result uuid; quantity numeric; unit text; begin
 perform private.require_role(array['admin','finance','works']);
 if p_request is null or p_purchased is null or p_purchased>(now() at time zone 'America/Sao_Paulo')::date or p_due is null then raise exception 'Informe a data da compra (até hoje) e o vencimento.'; end if;
 if p_property is null and private.current_role()='works' then raise exception 'Selecione o imóvel ou obra.'; end if;
 if p_category is null or p_category not in ('materials','labor','services','other') then raise exception 'Selecione uma categoria de compra ou despesa.'; end if;
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
create function public.register_purchase(p_request uuid,p_property uuid,p_contact uuid,p_description text,p_category text,p_amount bigint,p_purchased date,p_due date,p_notes text,p_quantity numeric,p_unit text,p_classification text)
returns uuid language sql security invoker set search_path=''
as $$ select private.register_purchase(p_request,p_property,p_contact,p_description,p_category,p_amount,p_purchased,p_due,p_notes,p_quantity,p_unit,p_classification) $$;
revoke execute on function private.register_purchase(uuid,uuid,uuid,text,text,bigint,date,date,text,numeric,text,text),public.register_purchase(uuid,uuid,uuid,text,text,bigint,date,date,text,numeric,text,text) from public,anon;
grant execute on function private.register_purchase(uuid,uuid,uuid,text,text,bigint,date,date,text,numeric,text,text),public.register_purchase(uuid,uuid,uuid,text,text,bigint,date,date,text,numeric,text,text) to authenticated;
notify pgrst,'reload schema';
