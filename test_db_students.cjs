const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '/app/applet/.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
    const { data, error } = await supabase.from('students').select('kelas').limit(5);
    console.log(data);
}
test();
