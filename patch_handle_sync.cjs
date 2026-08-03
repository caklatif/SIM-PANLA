const fs = require('fs');
let code = fs.readFileSync('./pages/UsersData.tsx', 'utf8');

const newSync = `  const handleSyncGuru = async () => {
      if (!syncKey) { showAlert("Service Role Key wajib diisi untuk sinkronisasi."); return; }
      setSyncing(true);
      setSyncStats(null);
      let created = 0;
      let errors = 0;
      let lastErrorMsg = "";
      
      try {
          const SUPABASE_URL = 'https://oqdnfhkzneqhvktjqiqe.supabase.co';
          const adminClient = createClient(SUPABASE_URL, syncKey, { auth: { autoRefreshToken: false, persistSession: false } });
          
          const { data: guruData, error: guruError } = await supabase.from('tabel_guru').select('*');
          if (guruError) throw guruError;
          
          const { data: { users }, error: usersError } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
          if (usersError) throw usersError;

          for (const g of guruData) {
              try {
                  const email = \`\${g.nip}@sekolah.id\`;
                  const password = 'spanla';
                  let userId = null;
                  
                  // Cari apakah user auth sudah ada
                  const existingUser = users.find(u => u.email === email);
                  
                  if (existingUser) {
                      userId = existingUser.id;
                  } else {
                      // Buat user baru jika belum ada
                      const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
                          email: email,
                          password: password,
                          email_confirm: true,
                          user_metadata: { full_name: g.nama_lengkap }
                      });
                      if (authError) {
                          errors++;
                          lastErrorMsg = authError.message;
                          continue;
                      }
                      userId = authData.user?.id;
                  }

                  if (userId) {
                      // Selalu upsert profile (untuk mengisi NIP dan Mapel yang kosong/baru)
                      await adminClient.from('profiles').upsert({
                          id: userId,
                          nip: g.nip,
                          full_name: g.nama_lengkap,
                          role: 'user',
                          mengajar_mapel: g.mapel,
                          wali_kelas: g.wali_kelas,
                          password_info: password
                      });
                      created++;
                  }
              } catch (e: any) {
                  errors++;
                  lastErrorMsg = e.message || "Error saat sync profile";
              }
          }
          setSyncStats({ total: guruData.length, created, errors, lastError: lastErrorMsg });
          fetchData();
      } catch (err: any) {
          showAlert("Gagal sinkronisasi: " + err.message);
      } finally {
          setSyncing(false);
      }
  };`;

code = code.replace(/const handleSyncGuru = async \(\) => \{[\s\S]*?\}\s*};\s*const \[isAddModalOpen/, newSync + '\n  const [isAddModalOpen');

fs.writeFileSync('./pages/UsersData.tsx', code);
