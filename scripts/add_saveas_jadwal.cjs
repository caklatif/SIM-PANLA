const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../pages/InputJadwal.tsx');
let content = fs.readFileSync(file, 'utf8');

// Add states
if (!content.includes('workingVersion')) {
    content = content.replace(
        /const \[scheduleQueue, setScheduleQueue\] = useState<ScheduleQueueItem\[\]>\(\[\]\);/g,
        `const [scheduleQueue, setScheduleQueue] = useState<ScheduleQueueItem[]>([]);
  const [workingVersion, setWorkingVersion] = useState(activeScheduleVersion || 'Utama');
  const [availableVersions, setAvailableVersions] = useState<string[]>(['Utama']);`
    );

    // Add useEffects for workingVersion
    const effects = `
  useEffect(() => {
     if (activeScheduleVersion && !workingVersion) setWorkingVersion(activeScheduleVersion);
  }, [activeScheduleVersion]);

  useEffect(() => {
     const fetchVersions = async () => {
         const { data } = await supabase.from('schedules').select('schedule_version').eq('academic_year', academicYear || '2025/2026').eq('semester', semester || 'Ganjil');
         if (data) {
             const versions = Array.from(new Set(data.map(d => d.schedule_version).filter(Boolean)));
             if (versions.length > 0) {
                 if (!versions.includes(workingVersion)) versions.push(workingVersion);
                 setAvailableVersions(versions);
             } else {
                 setAvailableVersions([workingVersion]);
             }
         }
     };
     fetchVersions();
  }, [academicYear, semester, workingVersion]);

  useEffect(() => {
      if (selectedTeacher) {
          fetchTeacherSchedules(selectedTeacher.id);
      }
  }, [workingVersion]);

  const handleSaveAs = async () => {
      const newVersionName = prompt("Masukkan nama versi jadwal baru (misal: Ramadhan, Revisi 1):");
      if (!newVersionName || newVersionName.trim() === '') return;
      if (newVersionName === workingVersion) return;
      
      try {
          setLoading(true);
          const { data: currentSchedules, error: fetchErr } = await supabase
            .from('schedules')
            .select('*')
            .eq('academic_year', academicYear || '2025/2026')
            .eq('semester', semester || 'Ganjil')
            .eq('schedule_version', workingVersion);
            
          if (fetchErr) throw fetchErr;
          
          if (!currentSchedules || currentSchedules.length === 0) {
              alert("Tidak ada jadwal di versi saat ini untuk diduplikasi.");
              setLoading(false);
              return;
          }
          
          const newSchedules = currentSchedules.map(s => {
              const { id, created_at, ...rest } = s;
              return { ...rest, schedule_version: newVersionName.trim() };
          });
          
          const { error: insertErr } = await supabase.from('schedules').insert(newSchedules);
          if (insertErr) throw insertErr;
          
          alert(\`Berhasil menduplikasi jadwal ke versi: \${newVersionName}\`);
          setWorkingVersion(newVersionName.trim());
      } catch (err: any) {
          alert("Gagal menduplikasi jadwal: " + err.message);
      } finally {
          setLoading(false);
      }
  };
`;
    content = content.replace(
        /useEffect\(\(\) => \{ fetchTeachers\(\); \}, \[\]\);/g,
        `useEffect(() => { fetchTeachers(); }, []);\n${effects}`
    );

    // Update workingVersion in fetch
    content = content.replace(
        /\.eq\('schedule_version', activeScheduleVersion \|\| 'Utama'\)/g,
        `.eq('schedule_version', workingVersion || 'Utama')`
    );

    // Update scheduleQueue insert
    content = content.replace(
        /schedule_version: activeScheduleVersion \|\| 'Utama'/g,
        `schedule_version: workingVersion || 'Utama'`
    );

    // Update edit form insert
    content = content.replace(
        /schedule_version: activeScheduleVersion \|\| 'Utama'/g,
        `schedule_version: workingVersion || 'Utama'`
    );

    // Add UI
    const headerUI = `
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
                <div className="bg-purple-100 p-3 rounded-2xl text-purple-600">
                    <CalendarPlus size={28} />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Jadwal Pelajaran</h2>
                    <p className="text-slate-500 text-sm">Input dan kelola jadwal mengajar.</p>
                </div>
            </div>
            
            <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
                <div className="px-3">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Versi Jadwal</label>
                    <select 
                        className="text-sm font-bold text-purple-700 bg-transparent outline-none cursor-pointer"
                        value={workingVersion}
                        onChange={(e) => setWorkingVersion(e.target.value)}
                    >
                        {availableVersions.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                </div>
                <div className="w-px h-8 bg-slate-200"></div>
                <button 
                    onClick={handleSaveAs}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-xl text-sm font-bold transition-colors"
                >
                    <Save size={16} /> Simpan Sbg Baru
                </button>
            </div>
        </div>
`;
    
    // Replace existing header
    content = content.replace(
        /<div className="flex items-center gap-3">[\s\S]*?<\/p>\n\s*<\/div>\n\s*<\/div>/g,
        headerUI
    );

    fs.writeFileSync(file, content);
    console.log('InputJadwal save-as added');
}
