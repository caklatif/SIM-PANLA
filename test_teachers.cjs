const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://oqdnfhkzneqhvktjqiqe.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xZG5maGt6bmVxaHZrdGpxaXFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU1NjU0MjMsImV4cCI6MjEwMTE0MTQyM30.pwIdFnuDeKOrNVXko2J3CQ_SaTNScBC_g9sz1MFmGuQ'
);
async function test() {
  const { data: guru, error: gError } = await supabase.from('tabel_guru').select('*');
  const { data: profiles, error: pError } = await supabase.from('profiles').select('*');
  console.log("Guru count:", guru?.length, "Profiles count:", profiles?.length);
}
test();
