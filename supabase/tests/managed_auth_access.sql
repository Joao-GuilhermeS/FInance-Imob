begin;
insert into auth.users(id,email,email_confirmed_at) values('10000000-0000-4000-8000-000000000006','managed-auth-test@example.invalid',now());
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000006',true);
update private.managed_auth_access set enabled=false where singleton;
set local role authenticated;
do $$ declare blocked boolean:=false; begin
 begin perform public.ensure_profile(); exception when others then blocked:=true; end;
 assert blocked,'Provisioning enabled before deployment guard';
 assert not exists(select 1 from public.profiles where id=auth.uid()),'Unexpected profile before enabling';
 blocked:=false;
 begin update private.managed_auth_access set enabled=true; exception when insufficient_privilege then blocked:=true; end;
 assert blocked,'Client can enable automatic access';
end $$;
reset role;
update private.managed_auth_access set enabled=true where singleton;
set local role authenticated;
select public.ensure_profile();
do $$ begin
 assert (select active and role='admin' from public.profiles where id=auth.uid()),'Confirmed account not provisioned';
 perform public.ensure_profile();
 assert (select count(*) from public.profiles where id=auth.uid())=1,'Duplicate profile';
 assert not has_function_privilege('anon','public.ensure_profile()','EXECUTE'),'Anonymous provisioning exposed';
end $$;
reset role;
update public.profiles set role='finance',active=false where id='10000000-0000-4000-8000-000000000006';
set local role authenticated;
select public.ensure_profile();
do $$ begin assert (select role='finance' and not active from public.profiles where id=auth.uid()),'Existing role or inactive state overwritten'; end $$;
reset role;
update auth.users set banned_until=now()+interval '1 day' where id='10000000-0000-4000-8000-000000000006';
set local role authenticated;
do $$ declare blocked boolean:=false; begin
 begin perform public.ensure_profile(); exception when others then blocked:=true; end;
 assert blocked,'Banned account accepted';
end $$;
reset role;
insert into auth.users(id,email) values('10000000-0000-4000-8000-000000000007','unconfirmed-test@example.invalid');
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000007',true);
set local role authenticated;
do $$ declare blocked boolean:=false; begin
 begin perform public.ensure_profile(); exception when others then blocked:=true; end;
 assert blocked,'Unconfirmed account accepted';
 assert not exists(select 1 from public.profiles where id=auth.uid()),'Unconfirmed account provisioned';
end $$;
reset role;
select 'PASS: guarded automatic provisioning, retry, preserved roles/inactive accounts, banned/unconfirmed/anonymous protection' as verification;
rollback;
