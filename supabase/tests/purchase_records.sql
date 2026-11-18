-- All fixtures and ledger entries are rolled back.
begin;
insert into auth.users(id,email,email_confirmed_at) values('10000000-0000-4000-8000-000000000004','purchase-test@example.invalid',now());
insert into public.profiles(id,name,role) values('10000000-0000-4000-8000-000000000004','Purchase verification','admin');
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000004',true);
set local role authenticated;
do $$ declare supplier uuid; customer uuid; property uuid; account uuid; expense uuid; request uuid:=gen_random_uuid(); payment uuid; blocked boolean; ledger_before bigint; test_day date:=(now() at time zone 'America/Sao_Paulo')::date; begin
 insert into public.contacts(name,kind) values('Purchase supplier','supplier') returning id into supplier;
 insert into public.contacts(name,kind) values('Purchase customer','client') returning id into customer;
 insert into public.properties(code,name,kind,acquisition_cents) values('PURCHASE-ROLLBACK','Purchase house','house',10000) returning id into property;
 account:=public.create_account('Purchase test account',0);
 select count(*) into ledger_before from public.ledger;
 expense:=public.register_purchase(request,property,supplier,'Cimento e frete','materials',10001,test_day-4,test_day-1,'Nota de teste',null,'','Cimento');
 assert expense=public.register_purchase(request,property,supplier,'Cimento e frete','materials',10001,test_day-4,test_day-1,'Nota de teste',null,'','Cimento'),'Retry changed expense';
 assert (select count(*) from public.expenses where request_id=request)=1,'Duplicate expense';
 assert (select count(*) from public.ledger)=ledger_before,'Purchase moved cash';
 assert (select amount_cents=10001 and paid_cents=0 and purchased_on=test_day-4 and due_on=test_day-1 and classification='Cimento' and created_by=auth.uid() from public.expense_balances where id=expense),'Purchase metadata incorrect';
 assert (select acquisition_cents from public.properties where id=property)=10000,'Acquisition cost changed';
 blocked:=false;
 begin perform public.register_purchase(request,property,supplier,'Cimento e frete','materials',10002,test_day-4,test_day-1,'Nota de teste',null,'','Cimento'); exception when others then blocked:=true; end;
 assert blocked,'Changed retry accepted';
 blocked:=false;
 begin perform public.register_purchase(gen_random_uuid(),property,supplier,'Compra futura','materials',100,test_day+1,test_day+1,'',null,'',''); exception when others then blocked:=true; end;
 assert blocked,'Future purchase accepted';
 blocked:=false;
 begin perform public.register_purchase(gen_random_uuid(),property,customer,'Cliente inválido','materials',100,test_day,test_day,'',null,'',''); exception when others then blocked:=true; end;
 assert blocked,'Client used as supplier';
 blocked:=false;
 begin perform public.register_purchase(gen_random_uuid(),property,supplier,'Categoria inválida','refund',100,test_day,test_day,'',null,'',''); exception when others then blocked:=true; end;
 assert blocked,'Refund manually registered';
 blocked:=false;
 begin perform public.register_purchase(gen_random_uuid(),property,supplier,'Quantidade inválida','materials',100,test_day,test_day,'',1.0001,'saco',''); exception when others then blocked:=true; end;
 assert blocked,'Excess quantity precision accepted';
 payment:=public.record_payment(gen_random_uuid(),null,expense,account,4000,test_day,'Pix');
 assert (select paid_cents from public.expense_balances where id=expense)=4000,'Partial payment incorrect';
 perform public.reverse_entry(payment,'Correção do pagamento');
 assert (select paid_cents from public.expense_balances where id=expense)=0,'Reversal did not restore payable';
 perform public.record_payment(gen_random_uuid(),null,expense,account,10001,test_day,'Pix');
 assert (select paid_cents from public.expense_balances where id=expense)=10001,'Final payment incorrect';
 assert (select sum(amount_cents) from public.ledger where account_id=account)=-10001,'Payment counted twice';
 -- Existing API remains compatible; its unknown purchase date is not fabricated.
 expense:=public.create_expense(gen_random_uuid(),property,supplier,'Despesa antiga','services',1,'un',100,test_day);
 assert (select purchased_on is null from public.expense_balances where id=expense),'Legacy date fabricated';
 perform set_config('purchase_test.property',property::text,true);
end $$;
reset role;
update public.profiles set role='works' where id='10000000-0000-4000-8000-000000000004';
set local role authenticated;
do $$ declare blocked boolean; test_day date:=(now() at time zone 'America/Sao_Paulo')::date; begin
 blocked:=false;
 begin perform public.register_purchase(gen_random_uuid(),null,null,'Despesa geral','other',100,test_day,test_day,'',null,'',''); exception when others then blocked:=true; end;
 assert blocked,'Works created unlinked expense';
 perform public.register_purchase(gen_random_uuid(),current_setting('purchase_test.property')::uuid,null,'Despesa da obra','other',100,test_day,test_day,'',null,'','');
end $$;
reset role;
update public.profiles set role='sales' where id='10000000-0000-4000-8000-000000000004';
set local role authenticated;
do $$ declare blocked boolean; begin
 blocked:=false;
 begin perform public.register_purchase(gen_random_uuid(),null,null,'Venda não permitida','other',100,current_date,current_date,'',null,'',''); exception when others then blocked:=true; end;
 assert blocked,'Sales created purchase';
 assert not exists(select 1 from public.expense_balances where description='Cimento e frete'),'Sales read expense view';
end $$;
reset role;
select 'PASS: purchase metadata, no cash on registration, retries, validation, payment/reversal, legacy dates and role isolation' as verification;
rollback;

