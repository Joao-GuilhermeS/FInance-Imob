-- Extend existing records without changing identifiers or financial relationships.
alter table public.contacts
 add column rg text not null default '',
 add column birth_date date,
 add column marital_status text not null default '',
 add column profession text not null default '',
 add column whatsapp text not null default '',
 add constraint contact_marital_status check (marital_status in ('','single','married','divorced','widowed','union','separated')),
 add constraint contact_detail_lengths check (length(rg)<=40 and length(profession)<=160 and length(whatsapp)<=40 and length(notes)<=2000);

alter table public.properties
 add column development text not null default '',
 add column block text not null default '',
 add column lot text not null default '',
 add column area_sqm numeric(12,2),
 add column acquisition_on date,
 add column construction_reference text not null default '',
 add column responsible text not null default '',
 add column started_on date,
 add column expected_completion_on date,
 add column completed_on date,
 add constraint property_area_positive check(area_sqm is null or area_sqm>0),
 add constraint property_expected_dates check(started_on is null or expected_completion_on is null or expected_completion_on>=started_on),
 add constraint property_completed_dates check(started_on is null or completed_on is null or completed_on>=started_on),
 add constraint property_detail_lengths check(length(development)<=160 and length(block)<=40 and length(lot)<=40 and length(construction_reference)<=100 and length(responsible)<=160 and length(notes)<=2000);

grant update(rg,birth_date,marital_status,profession,whatsapp) on public.contacts to authenticated;
grant update(development,block,lot,area_sqm,acquisition_on,construction_reference,responsible,started_on,expected_completion_on,completed_on) on public.properties to authenticated;

create function private.validate_contact_registry() returns trigger
language plpgsql security invoker set search_path=''
as $$ begin
 new.name:=trim(new.name);
 new.document:=upper(regexp_replace(new.document,'[[:space:]./-]','','g'));
 new.email:=lower(trim(new.email));
 if new.document<>'' and new.document !~ '^([0-9]{11}|[A-Z0-9]{12}[0-9]{2})$' then
 raise exception 'Informe CPF com 11 dígitos ou CNPJ com 14 caracteres.' using errcode='23514'; end if;
 if new.birth_date>(now() at time zone 'America/Sao_Paulo')::date then
 raise exception 'A data de nascimento não pode estar no futuro.' using errcode='23514'; end if;
 if tg_op='UPDATE' and old.kind='client' and new.kind<>'client' and exists(select 1 from public.sales where contact_id=old.id) then
 raise exception 'O tipo de um cliente com venda vinculada não pode ser alterado.' using errcode='23514'; end if;
 return new;
end $$;
revoke all on function private.validate_contact_registry() from public,anon,authenticated;
create trigger validate_contact_registry before insert or update on public.contacts
for each row execute function private.validate_contact_registry();

create function private.validate_property_registry() returns trigger
language plpgsql security invoker set search_path=''
as $$ begin
 new.name:=trim(new.name); new.code:=trim(new.code);
 if length(new.name)<2 or length(new.name)>160 or length(new.code)<1 or length(new.code)>40 then
 raise exception 'Confira o código e o nome do imóvel.' using errcode='23514'; end if;
 if new.acquisition_on>(now() at time zone 'America/Sao_Paulo')::date then
 raise exception 'A data de aquisição não pode estar no futuro.' using errcode='23514'; end if;
 if tg_op='UPDATE' and private.current_role()='works' and
 (to_jsonb(new)-array['construction_reference','responsible','started_on','expected_completion_on','completed_on','construction_status','budget_cents','notes'])
 is distinct from
 (to_jsonb(old)-array['construction_reference','responsible','started_on','expected_completion_on','completed_on','construction_status','budget_cents','notes'])
 then raise exception 'O perfil Obras pode editar apenas os dados da construção.' using errcode='42501'; end if;
 return new;
end $$;
revoke all on function private.validate_property_registry() from public,anon,authenticated;
create trigger validate_property_registry before insert or update on public.properties
for each row execute function private.validate_property_registry();

-- Lock the customer while a sale is being created, so category changes cannot race a sale.
create function private.validate_sale_contact() returns trigger
language plpgsql security invoker set search_path=''
as $$ declare contact_kind text; begin
 select kind into contact_kind from public.contacts where id=new.contact_id for share;
 if contact_kind is distinct from 'client' then raise exception 'A venda deve estar vinculada a um cliente.' using errcode='23514'; end if;
 return new;
end $$;
revoke all on function private.validate_sale_contact() from public,anon,authenticated;
create trigger validate_sale_contact before insert on public.sales
for each row execute function private.validate_sale_contact();

-- Works can create/consult suppliers and providers, but cannot consult personal customer records.
drop policy contact_insert on public.contacts;
create policy contact_insert on public.contacts for insert to authenticated
with check((select private.current_role()) in ('admin','finance','sales')
 or ((select private.current_role())='works' and kind in ('supplier','provider')));
drop policy member_read on public.contacts;
create policy member_read on public.contacts for select to authenticated
using((select private.current_role()) in ('admin','finance','sales')
 or ((select private.current_role())='works' and kind in ('supplier','provider')));
notify pgrst,'reload schema';

