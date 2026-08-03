drop policy if exists "Admins manage profiles" on public.profiles;
create policy "Admins manage profiles" on public.profiles for all to authenticated using (
  (select role from public.profiles where id = auth.uid()) = 'admin'
);
