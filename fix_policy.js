import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://oqdnfhkzneqhvktjqiqe.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xZG5maGt6bmVxaHZrdGpxaXFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU1NjU0MjMsImV4cCI6MjEwMTE0MTQyM30.pwIdFnuDeKOrNVXko2J3CQ_SaTNScBC_g9sz1MFmGuQ'
);

async function run() {
    const { data, error } = await supabase.rpc('execute_sql', {
        sql_statement: `
        drop policy if exists "Admins manage profiles" on public.profiles;
        create policy "Admins insert profiles" on public.profiles for insert to authenticated with check ( (select role from public.profiles where id = auth.uid()) = 'admin' );
        create policy "Admins update profiles" on public.profiles for update to authenticated using ( (select role from public.profiles where id = auth.uid()) = 'admin' );
        create policy "Admins delete profiles" on public.profiles for delete to authenticated using ( (select role from public.profiles where id = auth.uid()) = 'admin' );
        `
    });
    console.log("Rpc result:", error, data);
}
// wait, we don't have an execute_sql rpc.
