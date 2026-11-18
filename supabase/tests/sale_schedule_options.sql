begin;
insert into auth.users(id,email,email_confirmed_at) values('10000000-0000-4000-8000-000000000009','schedule-options@example.invalid',now());
insert into public.profiles(id,name,role) values('10000000-0000-4000-8000-000000000009','Schedule verification','admin');
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000009',true);
set local role authenticated;
do $$ declare pid uuid; cid uuid; sid uuid; req uuid; period text; blocked boolean; expected date; begin
 insert into public.contacts(name,kind) values('Schedule customer','client') returning id into cid;
 foreach period in array array['weekly','fortnightly','monthly','quarterly','yearly'] loop
  insert into public.properties(code,name,kind) values('SCHEDULE-'||period,'Schedule property','land') returning id into pid;
  req:=gen_random_uuid();
  sid:=public.create_sale_configured(req,cid,pid,10000,1000,3,'2024-01-01','2024-01-31',period,1000,999,'Ajustes acordados em valor fixo');
  assert sid=public.create_sale_configured(req,cid,pid,10000,1000,3,'2024-01-01','2024-01-31',period,1000,999,'Ajustes acordados em valor fixo'),'Retry duplicated sale';
  assert (select sum(amount_cents) from public.installments where sale_id=sid)=10001,'Schedule sum mismatch';
  assert (select total_cents from public.sales where id=sid)=10001,'Contract total mismatch';
  assert (select count(*) from public.ledger where property_id=pid)=0,'Sale generated cash';
  expected:=case period when 'weekly' then date '2024-02-14' when 'fortnightly' then date '2024-02-28' when 'monthly' then date '2024-03-31' when 'quarterly' then date '2024-07-31' else date '2026-01-31' end;
  assert (select due_on from public.installments where sale_id=sid and number=3)=expected,'Period or month-end date incorrect';
  blocked:=false; begin perform public.create_sale_configured(req,cid,pid,10000,1000,3,'2024-01-01','2024-01-31',period,1000,998,'Ajustes acordados em valor fixo'); exception when others then blocked:=true; end;
  assert blocked,'Changed adjustment retry accepted';
 end loop;
 blocked:=false; begin perform public.create_sale_configured(gen_random_uuid(),cid,pid,10000,0,1,'2024-01-01','2024-01-31','monthly',1,0,''); exception when others then blocked:=true; end;
 assert blocked,'Unexplained adjustment accepted';
 blocked:=false; begin perform public.create_sale_configured(gen_random_uuid(),cid,pid,10000,0,1,'2024-01-01','2024-01-31','invalid',0,0,''); exception when others then blocked:=true; end;
 assert blocked,'Invalid period accepted';
end $$;
reset role;
update public.profiles set role='works' where id='10000000-0000-4000-8000-000000000009';
set local role authenticated;
do $$ declare blocked boolean:=false; begin
 begin perform public.create_sale_configured(gen_random_uuid(),null,null,10000,0,1,'2024-01-01','2024-01-31','monthly',0,0,''); exception when insufficient_privilege then blocked:=true; end;
 assert blocked,'Works created contract';
end $$;
reset role;
select 'PASS: five periodicities, month-end dates, fixed explicit adjustments, totals, retries, no cash and role isolation' as verification;
rollback;
