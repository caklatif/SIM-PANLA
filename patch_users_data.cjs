const fs = require('fs');

// Patch UsersData.tsx
let usersDataCode = fs.readFileSync('./pages/UsersData.tsx', 'utf8');

const syncModal = `
        {/* Sync Modal */}
        {isSyncModalOpen && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-all duration-300">
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
                                    <p>Fitur ini akan mengecek <strong>Tabel Guru</strong> dan membuatkan Akun Login (Profile) dengan password default <strong>spanla</strong> untuk NIP yang belum terdaftar di menu ini.</p>
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

usersDataCode = usersDataCode.replace(/\{\/\* MODAL ADD USER - TOP ALIGNED \*\/\}/, syncModal.trim() + '\n        {/* MODAL ADD USER - TOP ALIGNED */}');

usersDataCode = usersDataCode.replace(/Spansa@1/g, 'spanla');
fs.writeFileSync('./pages/UsersData.tsx', usersDataCode);

// Patch ImportData.tsx
let importDataCode = fs.readFileSync('./pages/ImportData.tsx', 'utf8');
importDataCode = importDataCode.replace(/Spansa@1/g, 'spanla');
fs.writeFileSync('./pages/ImportData.tsx', importDataCode);

