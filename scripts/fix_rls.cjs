const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../SUPABASE_SETUP.sql');
let content = fs.readFileSync(file, 'utf8');

const additionalPolicies = `
-- ADMIN POLICIES FOR STUDENTS
drop policy if exists "Admins manage students" on public.students;
create policy "Admins manage students" on public.students for all to authenticated using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- ADMIN POLICIES FOR SCHEDULES
drop policy if exists "Admins manage schedules" on public.schedules;
create policy "Admins manage schedules" on public.schedules for all to authenticated using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- ADMIN POLICIES FOR SETTINGS
drop policy if exists "Admins manage settings" on public.app_settings;
create policy "Admins manage settings" on public.app_settings for all to authenticated using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- ADMIN POLICIES FOR GURU
drop policy if exists "Admins manage tabel_guru" on public.tabel_guru;
create policy "Admins manage tabel_guru" on public.tabel_guru for all to authenticated using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
`;

if (!content.includes('"Admins manage students"')) {
    content = content.replace(
        /-- STORAGE BUCKETS/g,
        `${additionalPolicies}\n-- STORAGE BUCKETS`
    );
    fs.writeFileSync(file, content);
    console.log('RLS policies added');
}
