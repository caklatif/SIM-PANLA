const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://aobgqejpjomgwxiosgin.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvYmdxZWpwam9tZ3d4aW9zZ2luIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3NDg0NTcsImV4cCI6MjA4NDMyNDQ1N30.E1jwkfMEexsUpflTIh2NSFGwpbFSwY78r313XNmVgko');

async function run() {
    const { data, error } = await supabase.from('profiles').select('*').limit(1);
    console.log(data ? Object.keys(data[0] || {}) : error);
}
run();
