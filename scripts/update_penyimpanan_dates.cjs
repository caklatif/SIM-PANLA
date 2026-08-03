const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../pages/Penyimpanan.tsx');
let content = fs.readFileSync(file, 'utf8');

// We need to add state for the dates
if (!content.includes('academicYearStart')) {
    const states = `    const [activeYear, setActiveYear] = useState('');
    const [academicYearStart, setAcademicYearStart] = useState('');
    const [academicYearEnd, setAcademicYearEnd] = useState('');
    const [activeSemester, setActiveSemester] = useState('');
    const [semesterStart, setSemesterStart] = useState('');
    const [semesterEnd, setSemesterEnd] = useState('');`;

    content = content.replace(
        /    const \[activeYear, setActiveYear\] = useState\(''\);\n    const \[activeSemester, setActiveSemester\] = useState\(''\);/,
        states
    );

    // Update fetchSettings
    const fetchDates = `
                const { data: ayStart } = await supabase.from('app_settings').select('value').eq('key', 'academic_year_start').single();
                if (ayStart?.value) setAcademicYearStart(ayStart.value);
                const { data: ayEnd } = await supabase.from('app_settings').select('value').eq('key', 'academic_year_end').single();
                if (ayEnd?.value) setAcademicYearEnd(ayEnd.value);
                const { data: semStart } = await supabase.from('app_settings').select('value').eq('key', 'semester_start').single();
                if (semStart?.value) setSemesterStart(semStart.value);
                const { data: semEnd } = await supabase.from('app_settings').select('value').eq('key', 'semester_end').single();
                if (semEnd?.value) setSemesterEnd(semEnd.value);
    `;
    
    content = content.replace(
        /if \(semData\?\.value\) \{\n                    setActiveSemester\(semData\.value\);\n                \}/,
        `if (semData?.value) {\n                    setActiveSemester(semData.value);\n                }\n${fetchDates}`
    );

    // Add saving for the dates
    const saveAyDates = `
    const handleSaveAcademicYearDates = async () => {
        try {
            await supabase.from('app_settings').upsert([
                { key: 'academic_year_start', value: academicYearStart },
                { key: 'academic_year_end', value: academicYearEnd }
            ], { onConflict: 'key' });
            setMessage({ type: 'success', text: 'Masa berlaku Tahun Ajaran berhasil disimpan.' });
        } catch (e: any) {
            setMessage({ type: 'error', text: 'Gagal menyimpan masa berlaku.' });
        }
    };
    `;

    const saveSemDates = `
    const handleSaveSemesterDates = async () => {
        try {
            await supabase.from('app_settings').upsert([
                { key: 'semester_start', value: semesterStart },
                { key: 'semester_end', value: semesterEnd }
            ], { onConflict: 'key' });
            setMessage({ type: 'success', text: 'Masa berlaku Semester berhasil disimpan.' });
        } catch (e: any) {
            setMessage({ type: 'error', text: 'Gagal menyimpan masa berlaku.' });
        }
    };
    `;

    content = content.replace(
        /const handleSetActiveScheduleVersion = async/g,
        `${saveAyDates}\n${saveSemDates}\n    const handleSetActiveScheduleVersion = async`
    );

    // Swap Versi Jadwal Aktif with Tahun Ajaran Aktif and add new Date fields
    // First, let's extract Versi Jadwal Aktif section
    const versionMatch = content.match(/<div className="space-y-4 pt-4 border-t border-gray-100">\s*<h3 className="font-bold text-gray-800 border-b pb-2 flex items-center gap-2">\s*<Calendar size=\{18\} className="text-gray-500"\/> Versi Jadwal Aktif\s*<\/h3>[\s\S]*?<\/div>\s*<\/div>\s*<\!-- Section: Tahun Ajaran Aktif -->/);
    
    if (versionMatch) {
        content = content.replace(versionMatch[0], '<!-- Section: Tahun Ajaran Aktif -->');
        
        // Add the fields under Tahun Ajaran Aktif
        const ayFields = `
                            <div>
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
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Berlaku dari tanggal</label>
                                    <input 
                                        type="date"
                                        className="w-full border rounded-xl p-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                                        value={academicYearStart}
                                        onChange={(e) => setAcademicYearStart(e.target.value)}
                                        onBlur={handleSaveAcademicYearDates}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Sampai tanggal</label>
                                    <input 
                                        type="date"
                                        className="w-full border rounded-xl p-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                                        value={academicYearEnd}
                                        onChange={(e) => setAcademicYearEnd(e.target.value)}
                                        onBlur={handleSaveAcademicYearDates}
                                    />
                                </div>
                            </div>
`;
        
        const semFields = `
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
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Berlaku mulai tanggal</label>
                                    <input 
                                        type="date"
                                        className="w-full border rounded-xl p-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                                        value={semesterStart}
                                        onChange={(e) => setSemesterStart(e.target.value)}
                                        onBlur={handleSaveSemesterDates}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Sampai Tanggal</label>
                                    <input 
                                        type="date"
                                        className="w-full border rounded-xl p-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                                        value={semesterEnd}
                                        onChange={(e) => setSemesterEnd(e.target.value)}
                                        onBlur={handleSaveSemesterDates}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Section: Versi Jadwal Aktif */}
                        ${versionMatch[0].replace('<!-- Section: Tahun Ajaran Aktif -->', '')}
`;

        content = content.replace(
            /<div>\s*<label className="block text-sm font-bold text-gray-700 mb-1">Pilih Tahun Ajaran Aktif<\/label>[\s\S]*?<\/div>\s*<\/div>/,
            `${ayFields}${semFields}`
        );
        
        // Let's do it differently, more robust search and replace
    }
}
fs.writeFileSync(file, content);
console.log('Update done');
