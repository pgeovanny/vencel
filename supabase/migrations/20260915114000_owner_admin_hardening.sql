-- JurisQuest: owner-only admin authorization hardening.
-- The owner account keeps the same UUID even if its e-mail address changes.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select (select auth.uid()) = 'e090c06c-020d-434d-8a5a-cf86a0e4953a'::uuid
     and exists (
       select 1
       from public.profiles p
       where p.id = (select auth.uid())
         and p.role = 'admin'
     );
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
