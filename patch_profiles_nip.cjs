const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://oqdnfhkzneqhvktjqiqe.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xZG5maGt6bmVxaHZrdGpxaXFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU1NjU0MjMsImV4cCI6MjEwMTE0MTQyM30.pwIdFnuDeKOrNVXko2J3CQ_SaTNScBC_g9sz1MFmGuQ'
);

async function run() {
  await supabase.auth.signInWithPassword({
      email: '112233@sekolah.id',
      password: 'admin8'
  });
  
  const { data: guruData } = await supabase.from('tabel_guru').select('*');
  const { data: profilesData } = await supabase.from('profiles').select('*');
  
  console.log("Found", guruData?.length, "guru and", profilesData?.length, "profiles");
  
  let updated = 0;
  for (const p of profilesData) {
    if (!p.nip && p.full_name) {
      // Find guru by name (ignoring case just in case)
      const guru = guruData.find(g => g.nama_lengkap.toLowerCase() === p.full_name.toLowerCase());
      if (guru) {
        const { error } = await supabase.from('profiles').update({
          nip: guru.nip,
          mengajar_mapel: guru.mapel,
          wali_kelas: guru.wali_kelas
        }).eq('id', p.id);
        if (error) {
           console.log("Error updating", p.full_name, error.message);
        } else {
           updated++;
        }
      }
    }
  }
  console.log("Updated", updated, "profiles.");
}
run();
