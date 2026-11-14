begin;
-- All fixtures are rolled back, including the temporary Auth user.
insert into auth.users(id,email,email_confirmed_at) values('10000000-0000-4000-8000-000000000001','finance-imob-test@example.invalid',now());
insert into public.profiles(id,name,role) values('10000000-0000-4000-8000-000000000001','Integration test','admin');
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
set local role authenticated;
do $$
declare c uuid; p uuid; a uuid; s uuid; inst uuid; payment uuid; exp uuid; result bigint; blocked boolean:=false;
begin
insert into public.contacts(name,kind) values('Integration client','client') returning id into c;
insert into public.properties(code,name,kind,acquisition_cents) values('TEST-ROLLBACK','Test property','house',10000) returning id into p;
a:=public.create_account('Integration account',10000);
s:=public.create_sale('20000000-0000-4000-8000-000000000001',c,p,10001,1000,3,'2026-01-31','2026-01-31');
select sum(amount_cents) into result from public.installments where sale_id=s;
assert result=10001,'Installment total mismatch';
assert (select amount_cents from public.installments where sale_id=s and number=3)=3001,'Rounding remainder not applied to last installment';
assert (select count(*) from public.installments where sale_id=s)=4,'Installment count mismatch';
assert (select due_on from public.installments where sale_id=s and number=2)='2026-02-28'::date,'Month-end date incorrect';
assert (select due_on from public.installments where sale_id=s and number=3)='2026-03-31'::date,'Month-end drift';
assert (select count(*) from public.ledger where created_by='10000000-0000-4000-8000-000000000001')=0,'Sale must not create cash entry';
select id into inst from public.installments where sale_id=s and number=1;
payment:=public.record_payment('30000000-0000-4000-8000-000000000001',inst,null,a,1000,'2026-02-01','Pix');
assert (select received_cents from public.installment_balances where id=inst)=1000,'Partial payment not reflected';
assert public.record_payment('30000000-0000-4000-8000-000000000001',inst,null,a,1000,'2026-02-01','Pix')=payment,'Retry duplicated payment';
assert (select count(*) from public.ledger where created_by='10000000-0000-4000-8000-000000000001')=1,'Duplicate ledger entry';
begin
 perform public.record_payment(gen_random_uuid(),inst,null,a,999999,'2026-02-01','Pix');
exception when others then blocked:=true;
end;
assert blocked,'Overpayment accepted';
perform public.reverse_entry(payment,'Integration reversal');
assert (select received_cents from public.installment_balances where id=inst)=0,'Reversal did not restore outstanding';
assert (select sum(amount_cents) from public.ledger where created_by='10000000-0000-4000-8000-000000000001')=0,'Reversal cash mismatch';
exp:=public.create_expense('40000000-0000-4000-8000-000000000001',p,null,'Cement bags','materials',2,'saco',2000,'2026-02-01');
assert (select paid_cents from public.expense_balances where id=exp)=0,'Unpaid expense affected cash';
perform public.record_payment(gen_random_uuid(),null,exp,a,500,'2026-02-01','Pix');
assert (select paid_cents from public.expense_balances where id=exp)=500,'Expense partial payment incorrect';
blocked:=false;
begin perform public.create_sale(gen_random_uuid(),c,p,10000,0,1,'2026-02-01','2026-02-01');
exception when others then blocked:=true; end;
assert blocked,'Property sold twice';
blocked:=false;
begin update public.ledger set amount_cents=1 where id=payment;
exception when insufficient_privilege then blocked:=true; end;
assert blocked,'Financial record directly editable';
assert public.create_sale('20000000-0000-4000-8000-000000000001',c,p,10001,1000,3,'2026-01-31','2026-01-31')=s,'Sale retry failed';
end $$;
reset role;
update public.profiles set role='sales' where id='10000000-0000-4000-8000-000000000001';
set local role authenticated;
do $$ declare blocked boolean:=false; begin
assert (select count(*) from public.ledger where created_by='10000000-0000-4000-8000-000000000001')=0,'Seller can read ledger';
begin perform public.create_account('Forbidden account',0);
exception when insufficient_privilege then blocked:=true; end;
assert blocked,'Seller can create account';
end $$;
reset role;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000099',true);
update public.profiles set active=false where id='10000000-0000-4000-8000-000000000001';
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
set local role authenticated;
do $$ begin
assert (select count(*) from public.contacts)=0,'Inactive member can read contacts';
assert private.current_role() is null,'Inactive member still authorized';
end $$;
reset role;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000099',true);
set local role authenticated;
do $$ begin
assert (select count(*) from public.contacts)=0,'Non-member can read contacts';
assert (select count(*) from public.properties)=0,'Non-member can read properties';
end $$;
reset role;
rollback;
select 'PASS: totals, month-end dates, partial payments, idempotency, overpayment rejection, reversals, expenses, double-sale protection, financial immutability, roles and non-members' as verification;
