const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envPath = '/app/applet/.env.local';
let envContent = '';
try { envContent = fs.readFileSync(envPath, 'utf8'); } catch (e) {
  try { envContent = fs.readFileSync('/app/applet/.env', 'utf8'); } catch (e2) {
    console.log('No .env found');
  }
}

if(envContent) {
    const urlMatch = envContent.match(/VITE_SUPABASE_URL=([^\n]+)/);
    const keyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY=([^\n]+)/);

    if(urlMatch && keyMatch) {
        const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

        async function test() {
            const { data, error } = await supabase.from('students').select('*').limit(5);
            console.log('Error:', error);
            console.log('Data:', data);
        }
        test();
    }
}
