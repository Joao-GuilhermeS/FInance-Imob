create policy documents_owner_admin_delete on storage.objects for delete to authenticated
using(bucket_id='documents' and owner_id=(select auth.uid())::text and (select private.current_role())='admin');
