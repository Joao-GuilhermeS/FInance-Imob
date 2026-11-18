-- Explicit contract adjustments only; no automatic accrual or renegotiation change.
create function private.create_sale_configured(p_request uuid,p_contact uuid,p_property uuid,p_total bigint,p_down bigint,p_count integer,p_sold date,p_first date,p_period text,p_interest bigint,p_discount bigint,p_notes text)
returns uuid language plpgsql security definer set search_path='' as $$
declare sid uuid; previous public.sales; sale_terms jsonb; final_total bigint; note text:=trim(coalesce(p_notes,'')); begin
 perform private.require_role(array['admin','sales']);
 if p_request is null or p_period is null or p_period not in ('weekly','fortnightly','monthly','quarterly','yearly') or
 p_total is null or p_total<=0 or p_total>1000000000000 or p_interest is null or p_interest<0 or p_interest>1000000000000 or
 p_discount is null or p_discount<0 or p_discount>1000000000000 or length(note)>2000 then raise exception 'Condições de venda inválidas.'; end if;
 final_total:=p_total+p_interest-p_discount;
 if final_total<=0 or final_total>1000000000000 or ((p_interest>0 or p_discount>0) and length(note)<5) then raise exception 'Confira o total final e descreva os ajustes acordados (mínimo 5 caracteres).'; end if;
 sale_terms:=jsonb_build_object('contact',p_contact,'property',p_property,'total',final_total,'base',p_total,'down',p_down,'count',p_count,'sold',p_sold,'first',p_first,'period',p_period,'interest',p_interest,'discount',p_discount,'notes',note);
 perform pg_advisory_xact_lock(hashtextextended('sale:'||p_request::text,0));
 select * into previous from public.sales where request_id=p_request;
 if found then
  if previous.terms is distinct from sale_terms then raise exception 'Solicitação já utilizada com outros dados.'; end if;
  return previous.id;
 end if;
 sid:=private.create_sale(p_request,p_contact,p_property,final_total,p_down,p_count,p_sold,p_first);
 update public.installments set due_on=case p_period
  when 'weekly' then p_first+(number-1)*7
  when 'fortnightly' then p_first+(number-1)*14
  when 'quarterly' then (p_first+make_interval(months=>(number-1)*3))::date
  when 'yearly' then (p_first+make_interval(years=>number-1))::date
  else (p_first+make_interval(months=>number-1))::date end where sale_id=sid and number>0;
 update public.sales set terms=sale_terms where id=sid;
 update public.commercial_events set payload=sale_terms where sale_id=sid and kind='convert';
 return sid;
end $$;
create function public.create_sale_configured(p_request uuid,p_contact uuid,p_property uuid,p_total bigint,p_down bigint,p_count integer,p_sold date,p_first date,p_period text,p_interest bigint,p_discount bigint,p_notes text)
returns uuid language sql security invoker set search_path='' as $$ select private.create_sale_configured(p_request,p_contact,p_property,p_total,p_down,p_count,p_sold,p_first,p_period,p_interest,p_discount,p_notes) $$;
revoke all on function private.create_sale_configured(uuid,uuid,uuid,bigint,bigint,integer,date,date,text,bigint,bigint,text),public.create_sale_configured(uuid,uuid,uuid,bigint,bigint,integer,date,date,text,bigint,bigint,text) from public,anon;
grant execute on function private.create_sale_configured(uuid,uuid,uuid,bigint,bigint,integer,date,date,text,bigint,bigint,text),public.create_sale_configured(uuid,uuid,uuid,bigint,bigint,integer,date,date,text,bigint,bigint,text) to authenticated;
notify pgrst,'reload schema';
