alter table public.profiles add column active boolean not null default true;
create or replace function private.current_role() returns text language sql stable security invoker set search_path=''
as $$ select role from public.profiles where id=(select auth.uid()) and active $$;
create function private.set_access_active(p_user uuid,p_active boolean) returns void
language plpgsql security definer set search_path=''
as $$ begin
perform private.require_role(array['admin']);
if p_user=auth.uid() and not p_active then raise exception 'Não é permitido desativar seu próprio acesso.'; end if;
update public.profiles set active=p_active where id=p_user;
if not found then raise exception 'Perfil não encontrado.'; end if;
end $$;
create function public.set_access_active(p_user uuid,p_active boolean) returns void language sql security invoker set search_path=''
as $$ select private.set_access_active(p_user,p_active) $$;
revoke all on function private.set_access_active(uuid,boolean) from public,anon;
revoke all on function public.set_access_active(uuid,boolean) from public,anon;
grant execute on function private.set_access_active(uuid,boolean),public.set_access_active(uuid,boolean) to authenticated;
notify pgrst,'reload schema';
