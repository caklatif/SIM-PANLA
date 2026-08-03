const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../pages/PublicDashboard.tsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Update initial state and interface
content = content.replace(
    /classDetails: \{\},/g,
    `classDetails: {}, classGenderDetails: {},`
);

// 2. Fetch gender in query
const studentsQueryOld = `supabase.from('students').select('id, kelas').eq('academic_year', academicYear || '2025/2026')`;
const studentsQueryNew = `supabase.from('students').select('id, kelas, gender').eq('academic_year', academicYear || '2025/2026')`;
content = content.replace(studentsQueryOld, studentsQueryNew);

const studentsQueryFallbackOld = `supabase.from('students').select('id, kelas').eq('academic_year', academicYear || '2025/2026');`;
const studentsQueryFallbackNew = `supabase.from('students').select('id, kelas, gender').eq('academic_year', academicYear || '2025/2026');`;
content = content.replace(studentsQueryFallbackOld, studentsQueryFallbackNew);

// 3. Process data
const classCountsLogicOld = `const classCounts: Record<string, number> = {};
        const sClassMap: Record<string, string> = {}; 
        let c7 = 0, c8 = 0, c9 = 0;
        
        if (studentsRes.data) {
            studentsRes.data.forEach((s: any) => {
                const rawKelas = s.kelas ? s.kelas.toUpperCase().trim() : '';
                sClassMap[s.id] = rawKelas;
                if (rawKelas) {
                    classCounts[rawKelas] = (classCounts[rawKelas] || 0) + 1;
                    if (rawKelas.startsWith('7')) c7++; else if (rawKelas.startsWith('8')) c8++; else if (rawKelas.startsWith('9')) c9++;
                }
            });
        }`;

const classCountsLogicNew = `const classCounts: Record<string, number> = {};
        const classGenderCounts: Record<string, { L: number, P: number }> = {};
        const sClassMap: Record<string, string> = {}; 
        let c7 = 0, c8 = 0, c9 = 0;
        
        if (studentsRes.data) {
            studentsRes.data.forEach((s: any) => {
                const rawKelas = s.kelas ? s.kelas.toUpperCase().trim() : '';
                const gender = s.gender === 'P' ? 'P' : 'L';
                sClassMap[s.id] = rawKelas;
                if (rawKelas) {
                    classCounts[rawKelas] = (classCounts[rawKelas] || 0) + 1;
                    if (!classGenderCounts[rawKelas]) classGenderCounts[rawKelas] = { L: 0, P: 0 };
                    classGenderCounts[rawKelas][gender]++;
                    
                    if (rawKelas.startsWith('7')) c7++; else if (rawKelas.startsWith('8')) c8++; else if (rawKelas.startsWith('9')) c9++;
                }
            });
        }`;
content = content.replace(classCountsLogicOld, classCountsLogicNew);

// 4. Set state
const setStatsOld = `setStats({
            count7: c7, count8: c8, count9: c9,
            classDetails: classCounts,`;
const setStatsNew = `setStats({
            count7: c7, count8: c8, count9: c9,
            classDetails: classCounts, classGenderDetails: classGenderCounts,`;
content = content.replace(setStatsOld, setStatsNew);

// 5. Update UI
const oldUI = `                              {modalContent.data.map(([cls, count]: any) => (
                                  <div key={cls} className="bg-white dark:bg-slate-700/50 p-3 rounded-2xl text-center border border-gray-100 dark:border-slate-600 shadow-sm hover:border-blue-200 transition-colors">
                                      <div className="font-extrabold text-slate-700 dark:text-white text-xl">{cls}</div>
                                      <div className="text-[10px] text-gray-400 dark:text-gray-400 font-bold uppercase mt-1">{count} Murid</div>
                                  </div>
                              ))}`;

const newUI = `                              {modalContent.data.map(([cls, count]: any) => {
                                  const genderData = stats?.classGenderDetails?.[cls] || { L: 0, P: 0 };
                                  return (
                                  <div key={cls} className="bg-white dark:bg-slate-700/50 p-3 rounded-2xl text-center border border-gray-100 dark:border-slate-600 shadow-sm hover:border-blue-200 transition-colors">
                                      <div className="font-extrabold text-slate-700 dark:text-white text-xl">{cls}</div>
                                      <div className="text-[10px] text-slate-500 font-bold uppercase mt-1">{count} Murid</div>
                                      <div className="text-[9px] text-slate-400 font-bold uppercase mt-0.5 border-t border-slate-100 dark:border-slate-600 pt-1 flex justify-center gap-2">
                                          <span className="text-blue-500">L: {genderData.L}</span> | <span className="text-pink-500">P: {genderData.P}</span>
                                      </div>
                                  </div>
                              )})}`;
content = content.replace(oldUI, newUI);

fs.writeFileSync(file, content);
console.log('Done update_public_dash_gender');
