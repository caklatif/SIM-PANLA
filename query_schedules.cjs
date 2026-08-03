const { createClient } = require('@supabase/supabase-js');
const url = 'https://aobgqejpjomgwxiosgin.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvYmdxZWpwam9tZ3d4aW9zZ2luIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3NDg0NTcsImV4cCI6MjA4NDMyNDQ1N30.E1jwkfMEexsUpflTIh2NSFGwpbFSwY78r313XNmVgko';
const supabase = createClient(url, key);

async function run() {
    const { data } = await supabase.from('schedules').select('*').limit(5);
    console.log(data);
}
run();
