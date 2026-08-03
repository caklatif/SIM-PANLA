const fs = require('fs');
const path = 'pages/PublicDashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

const target1 = `<div className="flex-1 px-1">
                                                        <div className="flex items-center gap-2 text-xs font-bold">
                                                            <span className="text-green-600 dark:text-green-400">{presentCount} Hadir</span>
                                                            <span className="text-gray-300 dark:text-gray-600">|</span>
                                                            <span className={absentCount > 0 ? "text-purple-500 dark:text-red-400" : "text-gray-400 dark:text-gray-500"}>
                                                                {absentCount} Tidak Hadir
                                                            </span>
                                                        </div>
                                                    </div>`;
const repl1 = `<div className="flex-1 px-1">
                                                        <div className="flex flex-col items-start gap-1">
                                                            <div className={\`flex items-center gap-2 text-base sm:text-lg font-bold \${(stats.classesWithJournals && !stats.classesWithJournals.includes(cls)) ? 'text-red-500' : ''}\`}>
                                                                <span className={(stats.classesWithJournals && !stats.classesWithJournals.includes(cls)) ? 'text-red-500' : 'text-green-600 dark:text-green-400'}>{presentCount} Hadir</span>
                                                                <span className={(stats.classesWithJournals && !stats.classesWithJournals.includes(cls)) ? 'text-red-400' : 'text-gray-300 dark:text-gray-600'}>|</span>
                                                                <span className={(stats.classesWithJournals && !stats.classesWithJournals.includes(cls)) ? 'text-red-500' : (absentCount > 0 ? "text-purple-500 dark:text-red-400" : "text-gray-400 dark:text-gray-500")}>
                                                                    {absentCount} Tidak Hadir
                                                                </span>
                                                            </div>
                                                            {stats.classesWithJournals && !stats.classesWithJournals.includes(cls) && (
                                                                <span className="text-red-500 text-[10px] sm:text-xs font-bold mt-0.5 bg-red-50 px-2 py-0.5 rounded-sm">
                                                                    Jurnal Belum Diisi
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>`;

const target2 = `                                    })}
                                </div>
                            </div>
                        </>`;
const repl2 = `                                    })}
                                </div>
                                <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 flex justify-between items-center shadow-inner">
                                    <span className="font-extrabold text-slate-600 dark:text-slate-300 uppercase text-xs">Total Keseluruhan</span>
                                    <div className="flex items-center gap-3 font-bold text-sm">
                                        <span className="text-green-600 dark:text-green-400">{Object.keys(modalContent.data.classDetails).reduce((acc, cls) => acc + (modalContent.data.classDetails[cls] || 0) - (modalContent.data.absencePerClass[cls] || 0), 0)} Hadir</span>
                                        <span className="text-slate-300 dark:text-slate-600">|</span>
                                        <span className="text-purple-600 dark:text-red-400">{Object.keys(modalContent.data.classDetails).reduce((acc, cls) => acc + (modalContent.data.absencePerClass[cls] || 0), 0)} Tidak Hadir</span>
                                    </div>
                                </div>
                            </div>
                        </>`;

if (content.includes(target1) && content.includes(target2)) {
    content = content.replace(target1, repl1);
    content = content.replace(target2, repl2);
    fs.writeFileSync(path, content, 'utf8');
    console.log('Patched modal hadir font and total');
} else {
    console.log('Target not found', !content.includes(target1) ? 't1' : '', !content.includes(target2) ? 't2' : '');
}
