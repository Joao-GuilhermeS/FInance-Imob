create function private.validate_registry_details() returns trigger
language plpgsql security invoker set search_path=''
as $$ begin
 if length(new.address)>500 then raise exception 'O endereço deve ter até 500 caracteres.' using errcode='23514'; end if;
 if tg_table_name='contacts' then
  if length(new.phone)>40 or length(new.email)>254 then raise exception 'Confira o tamanho do telefone e do e-mail.' using errcode='23514'; end if;
  if new.email<>'' and new.email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then raise exception 'Informe um e-mail válido.' using errcode='23514'; end if;
 elsif tg_table_name='properties' then
  if new.completed_on>(now() at time zone 'America/Sao_Paulo')::date then raise exception 'A conclusão efetiva não pode estar no futuro.' using errcode='23514'; end if;
 end if;
 return new;
end $$;
revoke all on function private.validate_registry_details() from public,anon,authenticated;
create trigger validate_registry_details before insert or update on public.contacts
for each row execute function private.validate_registry_details();
create trigger validate_registry_details before insert or update on public.properties
for each row execute function private.validate_registry_details();
notify pgrst,'reload schema';
