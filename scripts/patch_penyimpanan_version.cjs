const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../pages/Penyimpanan.tsx');
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('activeScheduleVersion')) {
    // 1. Add state
    content = content.replace(
        /const \[activeSemester, setActiveSemester\] = useState\(''\);/g,
        `const [activeSemester, setActiveSemester] = useState('');\n    const [activeScheduleVersion, setActiveScheduleVersion] = useState('');`
    );

    // 2. Fetch from DB
    content = content.replace(
        /if \(s\.key === 'semester'\) setActiveSemester\(s\.value \|\| ''\);/g,
        `if (s.key === 'semester') setActiveSemester(s.value || '');\n                    if (s.key === 'active_schedule_version') setActiveScheduleVersion(s.value || 'Utama');`
    );

    // 3. Save handler
    const saveHandler = `
    const handleSetActiveScheduleVersion = async (val: string) => {
        try {
            const { error } = await supabase.from('app_settings').upsert({ key: 'active_schedule_version', value: val });
            if (error) throw error;
            setActiveScheduleVersion(val);
            setMessage({ type: 'success', text: 'Versi Jadwal Aktif diperbarui!' });
            setTimeout(() => window.location.reload(), 1000);
        } catch (err: any) {
            setMessage({ type: 'error', text: 'Gagal update versi jadwal: ' + err.message });
        }
    };
    `;
    content = content.replace(
        /const handleSetActiveSemester = async \(val: string\) => \{/g,
        `${saveHandler}\n    const handleSetActiveSemester = async (val: string) => {`
    );

    // 4. UI Input
    const uiInput = `
                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-purple-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><Calendar size={20} /></div>
                                <div>
                                    <h3 className="font-bold text-gray-900 text-sm">Versi Jadwal Aktif</h3>
                                    <p className="text-xs text-gray-500">Ubah jadwal jika ada pergantian di tengah semester</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <input 
                                    type="text"
                                    className="flex-1 border rounded-xl p-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none transition-all font-medium text-sm"
                                    value={activeScheduleVersion}
                                    onChange={(e) => setActiveScheduleVersion(e.target.value)}
                                    placeholder="Contoh: Utama, Ramadhan, Revisi 1"
                                />
                                <button 
                                    onClick={() => handleSetActiveScheduleVersion(activeScheduleVersion)}
                                    className="px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-colors text-sm"
                                >
                                    Simpan
                                </button>
                            </div>
                        </div>
`;
    content = content.replace(
        "{/* Tahun Ajaran Aktif */}",
        `${uiInput}\n                        {/* Tahun Ajaran Aktif */}`
    );

    fs.writeFileSync(file, content);
    console.log('Penyimpanan.tsx patched with activeScheduleVersion');
} else {
    console.log('Already patched');
}
