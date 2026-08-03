const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../pages/InputJadwal.tsx');
let content = fs.readFileSync(file, 'utf8');

const popupState = `
  const [showNewVersionModal, setShowNewVersionModal] = useState(false);
  const [newVersionName, setNewVersionName] = useState('');
`;

content = content.replace(
    /const \[formData, setFormData\] = useState/g,
    `${popupState}\n  const [formData, setFormData] = useState`
);

const newHandleSaveAs = `
  const handleCreateNewVersion = () => {
      if (!newVersionName.trim()) {
          alert("Nama versi tidak boleh kosong!");
          return;
      }
      
      const vName = newVersionName.trim();
      setAvailableVersions(prev => Array.from(new Set([...prev, vName])));
      setWorkingVersion(vName);
      setNewVersionName('');
      setShowNewVersionModal(false);
      alert(\`Berhasil membuat versi jadwal baru: \${vName}. Silakan tambahkan jadwal.\`);
  };
`;

content = content.replace(
    /const handleSaveAs = async \(\) => \{[\s\S]*?\}\n\s*\};\n/g,
    `${newHandleSaveAs}\n`
);

// Update button
content = content.replace(
    /onClick=\{handleSaveAs\}[\s\S]*?<Save size=\{16\} \/> Simpan Jadwal dgn Nama/g,
    `onClick={() => setShowNewVersionModal(true)}\n                    className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-xl text-sm font-bold transition-colors"\n                >\n                    <Plus size={16} /> Buat Jadwal Baru`
);

// Fix fallback logic to avoid schema cache error
content = content.replace(
    /if \(error && \(error\.code === '42703' \|\| error\.message\?\.includes\('academic_year'\) \|\| error\.message\?\.includes\('semester'\)\)\) \{/g,
    `if (error && (error.code === '42703' || error.message?.includes('academic_year') || error.message?.includes('semester') || error.message?.includes('schedule_version'))) {`
);

// Add the popup to the UI
const popupUI = `
            {showNewVersionModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-xl border border-slate-100">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-800">Konfirmasi Jadwal Baru</h3>
                            <button onClick={() => setShowNewVersionModal(false)} className="text-slate-400 hover:text-red-500 transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-600 mb-1">Tahun Ajaran</label>
                                <input type="text" className="w-full border rounded-xl p-3 bg-gray-100 text-slate-500 font-medium" value={academicYear || '2025/2026'} disabled />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-600 mb-1">Semester</label>
                                <input type="text" className="w-full border rounded-xl p-3 bg-gray-100 text-slate-500 font-medium" value={semester || 'Ganjil'} disabled />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-600 mb-1">Nama Versi Jadwal Baru</label>
                                <input 
                                    type="text" 
                                    className="w-full border rounded-xl p-3 bg-white focus:ring-2 focus:ring-purple-500 outline-none font-medium text-slate-800" 
                                    value={newVersionName}
                                    onChange={(e) => setNewVersionName(e.target.value)}
                                    placeholder="Contoh: Jadwal UTS, Revisi 2"
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-8">
                            <button onClick={() => setShowNewVersionModal(false)} className="px-5 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">
                                Batal
                            </button>
                            <button onClick={handleCreateNewVersion} className="px-5 py-2.5 rounded-xl font-bold text-white bg-purple-600 hover:bg-purple-700 transition-colors">
                                Buat Jadwal Baru
                            </button>
                        </div>
                    </div>
                </div>
            )}
`;

content = content.replace(
    /<\/Layout>/g,
    `${popupUI}\n    </Layout>`
);

fs.writeFileSync(file, content);
console.log('Fixed pop up UI');
