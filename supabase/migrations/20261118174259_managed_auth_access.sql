-- Enable only after verifying Auth disable_signup=true. This is a global deployment
-- guard, not a per-user approval. Account creation remains managed in Supabase Auth.
create table private.managed_auth_access (
 singleton boolean primary key default true check(singleton),
 enabled boolean not null default false
);
alter table private.managed_auth_access enable row level security;
revoke all on private.managed_auth_access from public,anon,authenticated;
insert into private.managed_auth_access(singleton,enabled) values(true,false);

create function private.ensure_profile() returns void
language plpgsql security definer set search_path=''
as $$ declare user_record auth.users; display_name text; begin
 if auth.uid() is null then raise exception 'Entre com sua conta para continuar.'; end if;
 select * into user_record from auth.users where id=auth.uid() for share;
 if not found or user_record.email_confirmed_at is null or coalesce(user_record.is_anonymous,false) or user_record.banned_until>now() then raise exception 'Conta não confirmada ou indisponível.'; end if;
 -- Existing roles and disabled accounts are never promoted or reactivated.
 if exists(select 1 from public.profiles where id=auth.uid()) then return; end if;
 if not exists(select 1 from private.managed_auth_access where singleton and enabled) then raise exception 'O acesso automático ainda não está configurado. Contate o responsável pelo sistema.'; end if;
 display_name:=left(split_part(coalesce(user_record.email,''),'@',1),160);
 if length(display_name)<2 then display_name:='Usuário'; end if;
 insert into public.profiles(id,name,role) values(auth.uid(),display_name,'admin') on conflict(id) do nothing;
end $$;
create function public.ensure_profile() returns void language sql security invoker set search_path=''
as $$ select private.ensure_profile() $$;
revoke execute on function private.ensure_profile(),public.ensure_profile() from public,anon;
grant execute on function private.ensure_profile(),public.ensure_profile() to authenticated;
notify pgrst,'reload schema';
