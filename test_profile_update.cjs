const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://oqdnfhkzneqhvktjqiqe.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xZG5maGt6bmVxaHZrdGpxaXFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU1NjU0MjMsImV4cCI6MjEwMTE0MTQyM30.pwIdFnuDeKOrNVXko2J3CQ_SaTNScBC_g9sz1MFmGuQ'
);
async function run() {
  const { data: signIn, error: signError } = await supabase.auth.signInWithPassword({
      email: '112233@sekolah.id',
      password: 'admin8'
  });
  console.log("Login:", signError ? signError : "Success");
  
  const { data, error } = await supabase.from('profiles').update({ nip: '112233' }).eq('id', signIn.user.id);
  console.log("Update profile:", error, data);
}
run();
