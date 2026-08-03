const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../pages/Penyimpanan.tsx');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    /const \[activeYear, setActiveYear\] = useState\(''\);/,
    `const [activeYear, setActiveYear] = useState('');\n    const [activeSemester, setActiveSemester] = useState('');`
);

content = content.replace(
    /const \{ data: currentData \} = await supabase\.from\('app_settings'\)\.select\('value'\)\.eq\('key', 'academic_year'\)\.single\(\);\n\s*if \(currentData\?\.value\) \{\n\s*setActiveYear\(currentData\.value\);\n\s*\}/,
    `const { data: currentData } = await supabase.from('app_settings').select('value').eq('key', 'academic_year').single();
                if (currentData?.value) {
                    setActiveYear(currentData.value);
                }

                const { data: semData } = await supabase.from('app_settings').select('value').eq('key', 'semester').single();
                if (semData?.value) {
                    setActiveSemester(semData.value);
                }`
);

content = content.replace(
    /const handleSetActiveYear = async \(year: string\) => \{[\s\S]*?\}\s*catch \(e: any\) \{[\s\S]*?\}\s*\};/,
    `const handleSetActiveYear = async (year: string) => {
        setActiveYear(year);
        try {
            const { error } = await supabase
                .from('app_settings')
                .upsert({ 
                    key: 'academic_year', 
                    value: year,
                    description: 'Tahun Ajaran saat ini'
                }, { onConflict: 'key' });
            
            if (error) throw error;
            setMessage({ type: 'success', text: \`Tahun Ajaran Aktif berhasil diubah menjadi \${year}.\` });
        } catch (e: any) {
            console.error("Error setting active year:", e);
            setMessage({ type: 'error', text: 'Gagal mengubah Tahun Ajaran aktif.' });
        }
    };

    const handleSetActiveSemester = async (sem: string) => {
        setActiveSemester(sem);
        try {
            const { error } = await supabase
                .from('app_settings')
                .upsert({ 
                    key: 'semester', 
                    value: sem,
                    description: 'Semester saat ini'
                }, { onConflict: 'key' });
            
            if (error) throw error;
            setMessage({ type: 'success', text: \`Semester Aktif berhasil diubah menjadi \${sem}.\` });
        } catch (e: any) {
            console.error("Error setting active semester:", e);
            setMessage({ type: 'error', text: 'Gagal mengubah Semester aktif.' });
        }
    };`
);

content = content.replace(
    /<div>\s*<label className="block text-sm font-bold text-gray-700 mb-1">Pilih Tahun Ajaran Aktif<\/label>\s*<select[\s\S]*?<\/select>\s*<\/div>/,
    `<div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Pilih Tahun Ajaran Aktif</label>
                                <select 
                                    className="w-full border rounded-xl p-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                                    value={activeYear}
                                    onChange={(e) => handleSetActiveYear(e.target.value)}
                                >
                                    <option value="" disabled>Pilih Tahun Ajaran...</option>
                                    {availableYears.map(year => (
                                        <option key={year} value={year}>{year}</option>
                                    ))}
                                </select>
                            </div>
                            
                            <div className="pt-2">
                                <label className="block text-sm font-bold text-gray-700 mb-1">Pilih Semester Aktif</label>
                                <select 
                                    className="w-full border rounded-xl p-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                                    value={activeSemester}
                                    onChange={(e) => handleSetActiveSemester(e.target.value)}
                                >
                                    <option value="" disabled>Pilih Semester...</option>
                                    <option value="Ganjil">Ganjil</option>
                                    <option value="Genap">Genap</option>
                                </select>
                            </div>`
);

fs.writeFileSync(file, content);
console.log('Penyimpanan.tsx updated');
