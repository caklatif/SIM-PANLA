const { createClient } = require('@supabase/supabase-js');
const url = 'https://aobgqejpjomgwxiosgin.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvYmdxZWpwam9tZ3d4aW9zZ2luIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3NDg0NTcsImV4cCI6MjA4NDMyNDQ1N30.E1jwkfMEexsUpflTIh2NSFGwpbFSwY78r313XNmVgko';
const supabase = createClient(url, key);

async function run() {
    const { data: profile } = await supabase.from('profiles').select('*').limit(5);
    console.log("Profiles:", profile);
    const { data: settings } = await supabase.from('app_settings').select('*');
    console.log("Settings:", settings);
    const { data: scheds } = await supabase.from('schedules').select('*');
    console.log("Schedules:", scheds);
}
run();
