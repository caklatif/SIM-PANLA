const fs = require('fs');
let code = fs.readFileSync('./pages/UsersData.tsx', 'utf8');

const syncState = `
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncKey, setSyncKey] = useState('');
  const [syncStats, setSyncStats] = useState<{ total: number, created: number, errors: number } | null>(null);

  const handleSyncGuru = async () => {
      if (!syncKey) { showAlert("Service Role Key wajib diisi untuk sinkronisasi."); return; }
      setSyncing(true);
      setSyncStats(null);
      let created = 0;
      let errors = 0;
      try {
          const SUPABASE_URL = 'https://oqdnfhkzneqhvktjqiqe.supabase.co';
          const adminClient = createClient(SUPABASE_URL, syncKey, { auth: { autoRefreshToken: false, persistSession: false } });
          
          const { data: guruData, error: guruError } = await supabase.from('tabel_guru').select('*');
          if (guruError) throw guruError;
          const { data: profileData, error: profileError } = await supabase.from('profiles').select('nip');
          if (profileError) throw profileError;

          const profileNips = profileData.map(p => p.nip);
          const missingGuru = guruData.filter(g => !profileNips.includes(g.nip));

          for (const g of missingGuru) {
              try {
                  const email = \`\${g.nip}@sekolah.id\`;
                  const password = 'Spansa@1';
                  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
                      email: email,
                      password: password,
                      email_confirm: true,
                      user_metadata: { full_name: g.nama_lengkap }
                  });

                  let userId = authData.user?.id;
                  if (authError && authError.message.includes('already registered')) {
                      // Attempt to fetch user if already registered but not in profiles?
                      // We'll just continue if they exist but no profile, they need manual intervention.
                      errors++;
                      continue;
                  }
                  if (authError || !userId) {
                      errors++;
                      continue;
                  }

                  await supabase.from('profiles').insert({
                      id: userId,
                      nip: g.nip,
                      full_name: g.nama_lengkap,
                      role: 'user',
                      mengajar_mapel: g.mapel,
                      wali_kelas: g.wali_kelas,
                      password_info: password
                  });
                  created++;
              } catch (e) {
                  errors++;
              }
          }
          setSyncStats({ total: missingGuru.length, created, errors });
          fetchData();
      } catch (err: any) {
          showAlert("Gagal sinkronisasi: " + err.message);
      } finally {
          setSyncing(false);
      }
  };
`;

code = code.replace(/const \[isAddModalOpen, setIsAddModalOpen\] = useState\(false\);/, syncState + '\n  const [isAddModalOpen, setIsAddModalOpen] = useState(false);');

const syncButton = `
              <button onClick={() => setIsSyncModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-blue-200 hover:shadow-blue-300 transition-all flex-shrink-0"><RefreshCw size={18} /> Sinkronisasi Guru</button>
              <button onClick={() => setIsAddModalOpen(true)} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-purple-200 hover:shadow-purple-300 transition-all flex-shrink-0"><UserPlus size={18} /> Tambah User</button>
`;
code = code.replace(/<button onClick=\{\(\) => setIsAddModalOpen\(true\)\}.+Tambah User<\/button>/, syncButton.trim());

const syncModal = `
        {/* Sync Modal */}
        {isSyncModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                    <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-white">
                        <div>
                            <h3 className="text-xl font-bold text-gray-800">Sinkronisasi Data Guru</h3>
                            <p className="text-sm text-gray-500 mt-1">Buat akun login otomatis untuk data guru yang belum memilikinya.</p>
                        </div>
                        <button onClick={() => setIsSyncModalOpen(false)} className="text-gray-400 hover:text-red-500 transition-colors p-2 rounded-xl hover:bg-red-50"><X size={24} /></button>
                    </div>
                    <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/50">
                        <div className="space-y-5">
                            <div className="bg-blue-50 border border-blue-100 text-blue-700 p-4 rounded-xl text-sm leading-relaxed flex gap-3">
                                <AlertCircle size={24} className="shrink-0 text-blue-600" />
                                <div>
                                    <p className="font-bold mb-1">Perhatian:</p>
                                    <p>Fitur ini akan mengecek <strong>Tabel Guru</strong> dan membuatkan Akun Login (Profile) dengan password default <strong>Spansa@1</strong> untuk NIP yang belum terdaftar di menu ini.</p>
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Service Role Key</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <KeyRound size={18} className="text-gray-400" />
                                    </div>
                                    <input 
                                        type={showServiceKey ? "text" : "password"} 
                                        className="w-full pl-10 pr-10 border border-gray-300 rounded-xl p-3 bg-white focus:ring-2 focus:ring-blue-500 font-mono text-sm" 
                                        placeholder="eyJh..." 
                                        value={syncKey} 
                                        onChange={e => setSyncKey(e.target.value)} 
                                    />
                                    <button 
                                        type="button" 
                                        onClick={() => setShowServiceKey(!showServiceKey)} 
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-blue-500"
                                    >
                                        {showServiceKey ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            {syncStats && (
                                <div className="mt-4 bg-white p-4 rounded-xl border border-gray-200">
                                    <h4 className="font-bold text-gray-800 mb-2">Hasil Sinkronisasi:</h4>
                                    <ul className="text-sm space-y-1 text-gray-600">
                                        <li>Total guru belum ada akun: <strong>{syncStats.total}</strong></li>
                                        <li className="text-green-600">Berhasil dibuat: <strong>{syncStats.created}</strong></li>
                                        <li className="text-red-500">Gagal dibuat: <strong>{syncStats.errors}</strong></li>
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end flex-shrink-0">
                        <button onClick={handleSyncGuru} disabled={syncing} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg disabled:opacity-50 transition-all">
                            {syncing ? <Loader2 className="animate-spin" size={20} /> : <RefreshCw size={20} />} 
                            Mulai Sinkronisasi
                        </button>
                    </div>
                </div>
            </div>
        )}
`;

code = code.replace(/\{\/\* Add User Modal \*\/\}/, syncModal.trim() + '\n        {/* Add User Modal */}');

fs.writeFileSync('./pages/UsersData.tsx', code);
