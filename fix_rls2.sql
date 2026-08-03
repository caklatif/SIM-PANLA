-- Create a security definer function to avoid infinite recursion
create or replace function public.is_admin() returns boolean as $$
begin
  return exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
end;
$$ language plpgsql security definer;

-- 2. Perbaiki RLS Tabel Profiles
drop policy if exists "Admins manage profiles" on public.profiles;
create policy "Admins manage profiles" on public.profiles for all to authenticated using ( public.is_admin() );

-- 3. Perbaiki RLS Tabel Guru
drop policy if exists "Admins manage tabel_guru" on public.tabel_guru;
create policy "Admins manage tabel_guru" on public.tabel_guru for all to authenticated using ( public.is_admin() );

-- 4. Perbaiki RLS Tabel lainnya yang menggunakan hak admin
drop policy if exists "Teachers and Admins create journals" on public.journals;
create policy "Teachers and Admins create journals" on public.journals for insert to authenticated with check (
  auth.uid() = teacher_id OR public.is_admin()
);

drop policy if exists "Teachers and Admins update journals" on public.journals;
create policy "Teachers and Admins update journals" on public.journals for update to authenticated using (
  auth.uid() = teacher_id OR public.is_admin()
);

drop policy if exists "Admins manage schedules" on public.schedules;
create policy "Admins manage schedules" on public.schedules for all to authenticated using ( public.is_admin() );

drop policy if exists "Admins manage settings" on public.app_settings;
create policy "Admins manage settings" on public.app_settings for all to authenticated using ( public.is_admin() );
