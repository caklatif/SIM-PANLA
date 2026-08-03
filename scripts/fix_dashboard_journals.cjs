const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../pages/Dashboard.tsx');
let content = fs.readFileSync(file, 'utf8');

const interfaceTarget = `interface MonthlyStats {
    totalJp: number;
    targetJp: number;
    totalMeetings: number;
    classProgress: Record<string, { count: number, materis: string[] }>;
}`;
const interfaceRep = `interface MonthlyStats {
    totalJp: number;
    targetJp: number;
    totalMeetings: number;
    monthJournals: Array<{ id: string, kelas: string, date: string, material: string, count: number }>;
}`;
content = content.replace(interfaceTarget, interfaceRep);

const stateTarget = `const [stats, setStats] = useState<MonthlyStats>({ totalJp: 0, targetJp: 0, totalMeetings: 0, classProgress: {} });`;
const stateRep = `const [stats, setStats] = useState<MonthlyStats>({ totalJp: 0, targetJp: 0, totalMeetings: 0, monthJournals: [] });`;
content = content.replace(stateTarget, stateRep);

const qTarget = `const { data: journals } = await supabase.from('journals').select('hours, kelas, material')`;
const qRep = `const { data: journals } = await supabase.from('journals').select('id, created_at, hours, kelas, material')`;
content = content.replace(qTarget, qRep);

const mTarget = `const classMap: Record<string, { count: number, materis: string[] }> = {};

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
const mRep = `const monthJournals: Array<{ id: string, kelas: string, date: string, material: string, count: number }> = [];

        if (journals) {
            meetings = journals.length;
            journals.forEach(j => {
                const parts = j.hours.split(',').filter((h: string) => h.trim().length > 0);
                jp += parts.length;
                monthJournals.push({
                    id: j.id,
                    kelas: j.kelas,
                    date: j.created_at,
                    material: j.material || '-',
                    count: parts.length
                });
            });
            // Sort by date descending
            monthJournals.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        }`;
content = content.replace(mTarget, mRep);

const setTarget = `setStats({ totalJp: jp, targetJp: targetJp, totalMeetings: meetings, classProgress: classMap });`;
const setRep = `setStats({ totalJp: jp, targetJp: targetJp, totalMeetings: meetings, monthJournals });`;
content = content.replace(setTarget, setRep);

const renderTarget = `{Object.keys(stats.classProgress).length === 0 ? (
                            <div className="py-8 text-center text-sm text-gray-400 dark:text-gray-500 font-medium italic bg-slate-50 dark:bg-slate-700/50 rounded-2xl border border-slate-100 dark:border-slate-700 border-dashed">Belum ada data mengajar bulan ini.</div>
                        ) : (
                            Object.entries(stats.classProgress).sort().map(([kelas, data]) => (
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
                            ))
                        )}`;

const renderRep = `{stats.monthJournals.length === 0 ? (
                            <div className="py-8 text-center text-sm text-gray-400 dark:text-gray-500 font-medium italic bg-slate-50 dark:bg-slate-700/50 rounded-2xl border border-slate-100 dark:border-slate-700 border-dashed">Belum ada data mengajar bulan ini.</div>
                        ) : (
                            stats.monthJournals.map((j) => (
                                <div key={j.id} className="flex flex-col p-4 rounded-2xl bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-700 hover:border-blue-200 transition-colors group relative overflow-hidden">
                                    <div className="flex items-center justify-between relative z-10">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-lg shadow-sm border border-blue-200 dark:border-blue-800 min-w-[3rem]">{j.kelas}</div>
                                            <div>
                                                <h4 className="font-bold text-slate-700 dark:text-white text-sm flex items-center gap-2">Kelas {j.kelas}</h4>
                                                <p className="text-xs text-slate-400 font-medium flex items-center gap-1">
                                                    <Calendar size={10} /> 
                                                    {new Date(j.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-3 relative z-10">
                                        <p className="text-xs font-bold text-slate-500 mb-1">Materi yang diajar:</p>
                                        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3">
                                            {j.material}
                                        </p>
                                    </div>
                                    <div className="absolute bottom-0 left-0 h-1 bg-blue-500/10 w-full"><div className="h-full bg-blue-500/30" style={{ width: '100%' }}></div></div>
                                </div>
                            ))
                        )}`;

content = content.replace(renderTarget, renderRep);

fs.writeFileSync(file, content);
console.log('Fixed dashboard class progress to journals list');
