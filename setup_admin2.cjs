const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://oqdnfhkzneqhvktjqiqe.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xZG5maGt6bmVxaHZrdGpxaXFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU1NjU0MjMsImV4cCI6MjEwMTE0MTQyM30.pwIdFnuDeKOrNVXko2J3CQ_SaTNScBC_g9sz1MFmGuQ'
);

async function setup() {
  console.log("Attempting to login...");
  const signInRes = await supabase.auth.signInWithPassword({
      email: '112233@sekolah.id',
      password: 'admin8'
  });
  
  if (signInRes.data.session) {
      console.log("Logged in as admin. ID:", signInRes.data.user.id);
      const updateRes = await supabase.from('profiles').update({ role: 'admin', nip: '112233' }).eq('id', signInRes.data.user.id);
      console.log("Update profile:", updateRes);
  } else {
      console.log("Signing up admin user...");
      const { data, error } = await supabase.auth.signUp({
        email: '112233@sekolah.id',
        password: 'admin8',
        options: {
          data: {
            full_name: 'Administrator'
          }
        }
      });
      console.log("Signup res:", data, error);
      
      // Let's try to login again after signup
      const secondSignIn = await supabase.auth.signInWithPassword({
          email: '112233@sekolah.id',
          password: 'admin8'
      });
      
      if (secondSignIn.data.session) {
          console.log("Logged in as admin after signup. ID:", secondSignIn.data.user.id);
          await new Promise(r => setTimeout(r, 2000));
          const updateRes = await supabase.from('profiles').update({ role: 'admin', nip: '112233' }).eq('id', secondSignIn.data.user.id);
          console.log("Update profile:", updateRes);
      } else {
          console.error("Failed completely.");
      }
  }
}

setup();
