-- Corrections preserve the old schedule and never rewrite cash history.
alter table public.commercial_events drop constraint commercial_events_kind_check;
alter table public.commercial_events add constraint commercial_events_kind_check
 check(kind in ('reserve','release','convert','renegotiate','cancel','edit'));

create function private.edit_sale(p_request uuid,p_sale uuid,p_version integer,p_changes jsonb,p_reason text) returns uuid
language plpgsql security definer set search_path='' as $$
declare s public.sales; retry uuid; payload jsonb; cid uuid; total bigint; down_payment bigint;
 base_value bigint; interest_value bigint; discount_value bigint; n integer; sold date; first_due date;
 period text; notes text; remaining bigint; unit bigint; last_number integer; i integer; due date; old_terms jsonb;
begin
 perform private.require_role(array['admin','finance','sales']);
 payload:=jsonb_build_object('sale',p_sale,'version',p_version,'changes',p_changes,'reason',trim(p_reason));
 retry:=private.lifecycle_retry(p_request,'edit',payload); if retry is not null then return retry; end if;
 if length(trim(coalesce(p_reason,''))) not between 5 and 2000 then raise exception 'Informe uma justificativa com 5 a 2000 caracteres.'; end if;
 select * into s from public.sales where id=p_sale for update;
 if not found or s.status<>'active' then raise exception 'Somente vendas ativas podem ser editadas.'; end if;
 if p_version is null or s.schedule_version<>p_version then raise exception 'A venda mudou. Atualize os dados antes de editar.'; end if;
 perform 1 from public.installments where sale_id=s.id order by id for update;
 if exists(select 1 from public.ledger l join public.installments i on i.id=l.installment_id where i.sale_id=s.id) then
  raise exception 'Esta venda possui movimentações financeiras, inclusive estornos. Use renegociação ou distrato.';
 end if;
 if exists(select 1 from public.commercial_events where sale_id=s.id and kind='renegotiate') then
  raise exception 'Esta venda possui um acordo de renegociação. Use renegociação ou distrato.';
 end if;
 cid:=(p_changes->>'contact')::uuid; base_value:=(p_changes->>'base')::bigint;
 interest_value:=(p_changes->>'interest')::bigint; discount_value:=(p_changes->>'discount')::bigint;
 down_payment:=(p_changes->>'down')::bigint; n:=(p_changes->>'count')::integer;
 sold:=(p_changes->>'sold')::date; first_due:=(p_changes->>'first')::date;
 period:=p_changes->>'period'; notes:=trim(coalesce(p_changes->>'notes',''));
 if base_value is null or base_value<=0 or base_value>1000000000000 or interest_value is null or interest_value<0 or interest_value>1000000000000
 or discount_value is null or discount_value<0 or discount_value>1000000000000 then raise exception 'Valores de venda inválidos.'; end if;
 total:=base_value+interest_value-discount_value;
 if total<=0 or total>1000000000000 or down_payment is null or down_payment<0 or down_payment>total
 or n is null or n<1 or n>600 or sold is null or first_due is null or first_due<sold
 or period is null or period not in ('weekly','fortnightly','monthly','quarterly','yearly')
 or length(notes)>2000 or ((interest_value>0 or discount_value>0) and length(notes)<5) then raise exception 'Confira as condições da venda.'; end if;
 remaining:=total-down_payment;
 if remaining>0 and remaining<n then raise exception 'Quantidade de parcelas excede o saldo em centavos.'; end if;
 perform 1 from public.contacts where id=cid and kind='client' for share;
 if not found then raise exception 'Selecione um cliente válido.'; end if;
 select coalesce(max(number),0) into last_number from public.installments where sale_id=s.id;
 old_terms:=jsonb_build_object('contact',s.contact_id,'total',s.total_cents,'sold',s.sold_on,'terms',s.terms,'version',s.schedule_version);
 update public.installments set status='cancelled',closed_reason='Correção da venda: '||trim(p_reason) where sale_id=s.id and status='active';
 update public.sales set contact_id=cid,total_cents=total,sold_on=sold,schedule_version=s.schedule_version+1,
 terms=jsonb_build_object('contact',cid,'property',s.property_id,'total',total,'base',base_value,'interest',interest_value,'discount',discount_value,'down',down_payment,'count',n,'sold',sold,'first',first_due,'period',period,'notes',notes) where id=s.id;
 if down_payment>0 then
  last_number:=last_number+1;
  insert into public.installments(sale_id,number,amount_cents,due_on,schedule_version) values(s.id,last_number,down_payment,sold,s.schedule_version+1);
 end if;
 if remaining>0 then
  unit:=remaining/n;
  for i in 1..n loop
   due:=case period when 'weekly' then first_due+(i-1)*7 when 'fortnightly' then first_due+(i-1)*14
    when 'quarterly' then (first_due+make_interval(months=>(i-1)*3))::date
    when 'yearly' then (first_due+make_interval(years=>i-1))::date
    else (first_due+make_interval(months=>i-1))::date end;
   insert into public.installments(sale_id,number,amount_cents,due_on,schedule_version)
   values(s.id,last_number+i,unit+case when i=n then remaining-unit*n else 0 end,due,s.schedule_version+1);
  end loop;
 end if;
 insert into public.commercial_events(request_id,kind,property_id,sale_id,result_id,reason,payload,details,created_by)
 values(p_request,'edit',s.property_id,s.id,s.id,trim(p_reason),payload,jsonb_build_object('before',old_terms,'after',p_changes,'version',s.schedule_version+1),auth.uid());
 return s.id;
end $$;
create function public.edit_sale(p_request uuid,p_sale uuid,p_version integer,p_changes jsonb,p_reason text) returns uuid
language sql security invoker set search_path='' as $$ select private.edit_sale(p_request,p_sale,p_version,p_changes,p_reason) $$;
revoke all on function private.edit_sale(uuid,uuid,integer,jsonb,text),public.edit_sale(uuid,uuid,integer,jsonb,text) from public,anon;
grant execute on function private.edit_sale(uuid,uuid,integer,jsonb,text),public.edit_sale(uuid,uuid,integer,jsonb,text) to authenticated;
notify pgrst,'reload schema';
