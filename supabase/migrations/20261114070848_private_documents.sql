-- Event trigger helper is internal; clients must not have an explicit EXECUTE grant.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('documents','documents',false,10485760,array['application/pdf','image/jpeg','image/png'])
on conflict(id) do nothing;
create function private.can_access_document(object_name text) returns boolean
language sql stable security invoker set search_path=''
as $$
select auth.uid() is not null and (
 (split_part(object_name,'/',1)='properties' and exists(select 1 from public.properties p where p.id::text=split_part(object_name,'/',2)))
 or (split_part(object_name,'/',1)='sales' and exists(select 1 from public.sales s where s.id::text=split_part(object_name,'/',2)))
 or (split_part(object_name,'/',1)='expenses' and exists(select 1 from public.expenses e where e.id::text=split_part(object_name,'/',2)))
 or (split_part(object_name,'/',1)='ledger' and exists(select 1 from public.ledger l where l.id::text=split_part(object_name,'/',2)))
)
$$;
revoke all on function private.can_access_document(text) from public,anon;
grant execute on function private.can_access_document(text) to authenticated;
create policy documents_read on storage.objects for select to authenticated
using(bucket_id='documents' and private.can_access_document(name));
create policy documents_upload on storage.objects for insert to authenticated
with check(bucket_id='documents' and private.can_access_document(name));
notify pgrst,'reload schema';
