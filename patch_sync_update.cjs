const fs = require('fs');
let code = fs.readFileSync('./pages/UsersData.tsx', 'utf8');

const syncCode = `          const profileNips = profileData.map(p => p.nip);
          const missingGuru = guruData.filter(g => !profileNips.includes(g.nip));
          
          // 1. Update Existing Profiles yang mapel-nya kosong/berbeda
          for (const g of guruData) {
              if (profileNips.includes(g.nip)) {
                  try {
                     await adminClient.from('profiles').update({
                         mengajar_mapel: g.mapel,
                         wali_kelas: g.wali_kelas
                     }).eq('nip', g.nip);
                  } catch (e) {}
              }
          }

          for (const g of missingGuru) {`;

code = code.replace(/const profileNips = profileData.map\(p => p.nip\);\s+const missingGuru = guruData.filter\(g => !profileNips.includes\(g.nip\)\);\s+for \(const g of missingGuru\) \{/, syncCode);

// Add clear explanation in the modal UI
const modalText = `<p>Fitur ini akan mengecek <strong>Tabel Guru</strong> dan membuatkan Akun Login (Profile) dengan password default <strong>spanla</strong> untuk NIP yang belum terdaftar di menu ini, serta <strong>menyinkronkan data Mapel</strong> untuk akun yang sudah ada.</p>`;
code = code.replace(/<p>Fitur ini akan mengecek <strong>Tabel Guru<\/strong> dan membuatkan Akun Login \(Profile\) dengan password default <strong>spanla<\/strong> untuk NIP yang belum terdaftar di menu ini\.<\/p>/, modalText);

const helpText = `                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Service Role Key</label>
                                <p className="text-xs text-gray-500 mb-2">Bukan API Key biasa (anon). Dapatkan di <strong>Supabase &gt; Project Settings &gt; API &gt; service_role (secret)</strong>.</p>
                                <div className="relative">`;
code = code.replace(/<div>\s+<label className="block text-sm font-bold text-gray-700 mb-1">Service Role Key<\/label>\s+<div className="relative">/, helpText);

fs.writeFileSync('./pages/UsersData.tsx', code);
