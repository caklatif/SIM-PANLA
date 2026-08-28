const fs = require('fs');
let code = fs.readFileSync('pages/PresensiQR.tsx', 'utf8');

const regularStartStr = "                {/* Right Last Scanned Card & Quick History (5 Cols) */}";
const regularEndStr = "                  </div>\n                </div>\n              </div>\n            )}\n          </div>\n        )}\n      </main>";

const startR = code.indexOf(regularStartStr);
const endR = code.indexOf(regularEndStr);

if (startR !== -1 && endR !== -1) {
    const replacementR = `                {/* Right Last Scanned Card (Local Notification) */}
                <div className="lg:col-span-5 h-[calc(100vh-12rem)] min-h-[500px]">
                  <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-100 dark:border-slate-700 shadow-xl h-full flex flex-col justify-center">
                    {lastScannedStudent ? (
                      <div className={\`flex flex-col items-center justify-center text-center transition-all animate-in zoom-in duration-300 \${
                        lastScannedStudent.isDuplicate
                          ? 'text-amber-500 dark:text-amber-400'
                          : lastScannedStudent.status === 'Terlambat'
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }\`}>
                        <div className={\`w-40 h-40 rounded-full font-black text-7xl flex items-center justify-center mb-8 shadow-2xl \${
                          lastScannedStudent.isDuplicate
                            ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-500 ring-8 ring-amber-500/20'
                            : lastScannedStudent.status === 'Terlambat'
                            ? 'bg-rose-100 dark:bg-rose-950/40 text-rose-600 ring-8 ring-rose-500/20'
                            : 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 ring-8 ring-emerald-500/20'
                        }\`}>
                          {lastScannedStudent.student.name.charAt(0)}
                        </div>
                        
                        <span className={\`inline-block px-5 py-2 rounded-full text-base font-black uppercase tracking-widest mb-6 shadow-sm \${
                          lastScannedStudent.isDuplicate
                            ? 'bg-amber-500 text-white'
                            : lastScannedStudent.status === 'Terlambat'
                            ? 'bg-rose-600 text-white'
                            : 'bg-emerald-600 text-white'
                        }\`}>
                          {lastScannedStudent.isDuplicate ? 'SUDAH DI-SCAN' : lastScannedStudent.status}
                        </span>
                        
                        <h2 className="font-black text-slate-900 dark:text-white text-4xl leading-tight mb-3">
                          {lastScannedStudent.student.name}
                        </h2>
                        
                        <p className="text-lg font-bold text-slate-500 dark:text-slate-400 mb-10">
                          Kelas {lastScannedStudent.student.kelas} • NISN: {lastScannedStudent.student.nisn || '-'}
                        </p>
                        
                        <div className="flex flex-col items-center gap-4 mt-auto">
                          <div className="font-mono font-black text-7xl text-slate-800 dark:text-white tracking-tighter">
                            {lastScannedStudent.recordTime}
                          </div>
                          <div className="scale-150 origin-top mt-4">
                            {getActivityBadge(lastScannedStudent.mode || presensiMode, lastScannedStudent.subject || selectedEkstra)}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center text-slate-400 dark:text-slate-500 space-y-6">
                        <div className="w-32 h-32 rounded-full bg-slate-50 dark:bg-slate-900/50 flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700/50 mb-4">
                          <Scan size={56} className="text-slate-300 dark:text-slate-600" />
                        </div>
                        <div>
                          <h3 className="font-black text-2xl text-slate-500 dark:text-slate-400">Menunggu Scan...</h3>
                          <p className="text-base font-medium mt-2">Arahkan kartu QR siswa ke kamera.</p>
                        </div>
                      </div>
                    )}
                  </div>
`;
    
    code = code.substring(0, startR) + replacementR + code.substring(endR);
    console.log("Regular block replaced.");
} else {
    console.log("Failed to find Regular block start or end.", startR, endR);
}

fs.writeFileSync('pages/PresensiQR.tsx', code);
