-- Remove ONLY fixtures created by the browser verification on 2026-11-14.
-- Review and run as administrator in the IMOB-Project SQL Editor.
-- No real company records are selected. Any unexpected fixture identity aborts the transaction.
begin;
do $$ begin
assert exists(select 1 from auth.users where id='f1000000-0000-4000-8000-000000000001' and email='qa-finance-imob@example.invalid'),'Unexpected cleanup user';
assert exists(select 1 from public.contacts where id='daafa427-49b4-4fa1-97fa-bf6f98b8cfcb' and name='QA temporario Finance Imob'),'Unexpected cleanup contact';
assert exists(select 1 from public.properties where id='6207001c-a645-402e-b6e2-05028b7e0fc7' and code='QA-IMOB-001'),'Unexpected cleanup property';
assert not exists(select 1 from storage.objects where bucket_id='documents' and name like 'sales/22838427-5c50-4b0f-8bef-f2a5044c8bfb/%'),'Storage object still present';
end $$;
delete from public.ledger where created_by='f1000000-0000-4000-8000-000000000001';
delete from public.installments where sale_id='22838427-5c50-4b0f-8bef-f2a5044c8bfb';
delete from public.sales where id='22838427-5c50-4b0f-8bef-f2a5044c8bfb' and created_by='f1000000-0000-4000-8000-000000000001';
delete from public.contacts where id='daafa427-49b4-4fa1-97fa-bf6f98b8cfcb';
delete from public.properties where id='6207001c-a645-402e-b6e2-05028b7e0fc7';
delete from public.accounts where id='3812f0f9-bc55-4bcf-9f19-43b0b31b23a9' and name='QA-Caixa';
delete from public.profiles where id='f1000000-0000-4000-8000-000000000001';
delete from auth.sessions where user_id='f1000000-0000-4000-8000-000000000001';
delete from auth.users where id='f1000000-0000-4000-8000-000000000001' and email='qa-finance-imob@example.invalid';
delete from public.audit_log where actor_id='f1000000-0000-4000-8000-000000000001' or record_id='f1000000-0000-4000-8000-000000000001';
commit;

