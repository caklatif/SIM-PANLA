const fs = require('fs');
let code = fs.readFileSync('./SUPABASE_SETUP.sql', 'utf8');

const profileAdminPolicy = `-- ADMIN POLICIES FOR PROFILES
drop policy if exists "Admins manage profiles" on public.profiles;
create policy "Admins manage profiles" on public.profiles for all to authenticated using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);`;

code = code.replace(/-- STUDENTS/, profileAdminPolicy + '\\n\\n-- STUDENTS');

fs.writeFileSync('./SUPABASE_SETUP.sql', code);
