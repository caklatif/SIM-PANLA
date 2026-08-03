const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../pages/Dashboard.tsx');
let content = fs.readFileSync(file, 'utf8');

// Update Interface
content = content.replace(
  'classProgress: Record<string, number>;',
  'classProgress: Record<string, { count: number, materis: string[] }>;'
);

// Update init state
content = content.replace(
  'const [stats, setStats] = useState<MonthlyStats>({ totalJp: 0, targetJp: 0, totalMeetings: 0, classProgress: {} });',
  'const [stats, setStats] = useState<MonthlyStats>({ totalJp: 0, targetJp: 0, totalMeetings: 0, classProgress: {} });'
);

// Update fetch for journals
const qTarget = `const { data: journals } = await supabase.from('journals').select('hours, kelas')`;
const qRep = `const { data: journals } = await supabase.from('journals').select('hours, kelas, material')`;
content = content.replace(qTarget, qRep);

const mTarget = `const classMap: Record<string, number> = {};

        if (journals) {
            meetings = journals.length;
            journals.forEach(j => {
                const parts = j.hours.split(',').filter((h: string) => h.trim().length > 0);
                jp += parts.length;
                classMap[j.kelas] = (classMap[j.kelas] || 0) + 1;
            });
        }`;
const mRep = `const classMap: Record<string, { count: number, materis: string[] }> = {};

        if (journals) {
            meetings = journals.length;
            journals.forEach(j => {
                const parts = j.hours.split(',').filter((h: string) => h.trim().length > 0);
                jp += parts.length;
                if (!classMap[j.kelas]) classMap[j.kelas] = { count: 0, materis: [] };
                classMap[j.kelas].count += 1;
                if (j.material) classMap[j.kelas].materis.push(j.material);
            });
        }`;
content = content.replace(mTarget, mRep);

const hTarget = `Distribusi Pertemuan Kelas (Bulanan)`;
const dObj = new Date();
const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const monthName = monthNames[dObj.getMonth()];
// Actually we can make it dynamic in JSX!
const hRep = `Distribusi Pertemuan Kelas ({new Date().toLocaleDateString('id-ID', { month: 'long' })})`;
content = content.replace(hTarget, hRep);

const renderTarget = `Object.entries(stats.classProgress).sort().map(([kelas, count]) => (
                                <div key={kelas} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-700 hover:border-blue-200 transition-colors group relative overflow-hidden">
                                    <div className="flex items-center gap-4 relative z-10">
                                        <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-lg shadow-sm border border-blue-200 dark:border-blue-800">{kelas}</div>
                                        <div><h4 className="font-bold text-slate-700 dark:text-white text-sm flex items-center gap-2">Kelas {kelas}</h4><p className="text-xs text-slate-400 font-medium flex items-center gap-1"><Users size={10} /> Data KBM</p></div>
                                    </div>
                                    <div className="text-right relative z-10">
                                        <span className="block text-2xl font-extrabold text-slate-800 dark:text-white leading-none group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{count}</span>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Pertemuan</span>
                                    </div>
                                    <div className="absolute bottom-0 left-0 h-1 bg-blue-500/10 w-full"><div className="h-full bg-blue-500/30" style={{ width: \`\${Math.min(Number(count) * 10, 100)}%\` }}></div></div>
                                </div>
                            ))`;
                            
const renderRep = `Object.entries(stats.classProgress).sort().map(([kelas, data]) => (
                                <div key={kelas} className="flex flex-col p-4 rounded-2xl bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-700 hover:border-blue-200 transition-colors group relative overflow-hidden">
                                    <div className="flex items-center justify-between relative z-10">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-lg shadow-sm border border-blue-200 dark:border-blue-800">{kelas}</div>
                                            <div><h4 className="font-bold text-slate-700 dark:text-white text-sm flex items-center gap-2">Kelas {kelas}</h4><p className="text-xs text-slate-400 font-medium flex items-center gap-1"><Users size={10} /> {data.count} Pertemuan</p></div>
                                        </div>
                                        <div className="text-right relative z-10">
                                            <span className="block text-2xl font-extrabold text-slate-800 dark:text-white leading-none group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{data.count}</span>
                                        </div>
                                    </div>
                                    <div className="mt-3 relative z-10">
                                        <p className="text-xs font-bold text-slate-500 mb-1">Materi Terakhir:</p>
                                        <ul className="list-disc pl-4 text-[10px] text-slate-600 dark:text-slate-400 line-clamp-2">
                                            {data.materis.slice(-2).map((m, i) => <li key={i}>{m}</li>)}
                                        </ul>
                                    </div>
                                    <div className="absolute bottom-0 left-0 h-1 bg-blue-500/10 w-full"><div className="h-full bg-blue-500/30" style={{ width: \`\${Math.min(Number(data.count) * 10, 100)}%\` }}></div></div>
                                </div>
                            ))`;
content = content.replace(renderTarget, renderRep);

fs.writeFileSync(file, content);
console.log('Fixed Dashboard dist');
