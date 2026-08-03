const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envPath = '/app/applet/.env';
const envContent = fs.readFileSync(envPath, 'utf8');

const urlMatch = envContent.match(/VITE_SUPABASE_URL=([^\n]+)/);
const keyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY=([^\n]+)/);

const supabaseUrl = urlMatch[1].trim();
const supabaseKey = keyMatch[1].trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    const { data, error } = await supabase.from('students').select('kelas').limit(5);
    console.log(data);
}
test();
