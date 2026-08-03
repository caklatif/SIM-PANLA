const fs = require('fs');
let code = fs.readFileSync('./SUPABASE_SETUP.sql', 'utf8');

const functionCode = `-- Create a security definer function to avoid infinite recursion
create or replace function public.is_admin() returns boolean as $$
begin
  return exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
end;
$$ language plpgsql security definer;
`;

if (!code.includes('public.is_admin()')) {
    code = code.replace('-- PROFILES\ndrop policy if exists "Public read profiles"', functionCode + '\n-- PROFILES\ndrop policy if exists "Public read profiles"');
}

code = code.replace(/exists \(select 1 from public\.profiles where id = auth\.uid\(\) and role = 'admin'\)/g, 'public.is_admin()');

fs.writeFileSync('./SUPABASE_SETUP.sql', code);
