const fs = require('fs');
let code = fs.readFileSync('pages/PresensiQR.tsx', 'utf8');

const startMarker = "                    {/* Right (5 Cols): Realtime Activity History Feed in Fullscreen */}";
const endMarkerStr = "/* REGULAR SCANNER UI */";

const startIndex = code.indexOf(startMarker);
const regScannerIndex = code.indexOf(endMarkerStr);

if (startIndex !== -1 && regScannerIndex !== -1) {
    // We need to keep the `                  </div>\n                </div>,\n                document.body\n              )\n            ) : (` part.
    // Let's find `document.body`
    const docBodyIndex = code.lastIndexOf('document.body', regScannerIndex);
    const endBoundary = code.lastIndexOf('                  </div>', docBodyIndex) + "                  </div>\n".length;

    // wait, looking at:
    //                   </div>
    //                 </div>,
    //                 document.body
    
    // The previous </div> is the end of lg:col-span-5
    
    const replacement1 = `                    {/* Right (5 Cols): Local Notification Panel */}
                    <div className="lg:col-span-5 bg-slate-900/90 rounded-3xl p-6 border border-slate-800/80 shadow-2xl flex flex-col justify-center min-h-0 h-full overflow-hidden">
                      {lastScannedStudent ? (
                        <div className={\`flex flex-col items-center justify-center text-center transition-all animate-in zoom-in duration-300 \${
                          lastScannedStudent.isDuplicate
                            ? 'text-amber-400'
                            : lastScannedStudent.status === 'Terlambat'
                            ? 'text-rose-400'
                            : 'text-emerald-400'
                        }\`}>
                          <div className={\`w-32 h-32 rounded-full font-black text-6xl flex items-center justify-center mb-6 shadow-2xl \${
                            lastScannedStudent.isDuplicate
                              ? 'bg-amber-500/20 text-amber-300 ring-4 ring-amber-500/30'
                              : lastScannedStudent.status === 'Terlambat'
                              ? 'bg-rose-500/20 text-rose-300 ring-4 ring-rose-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 ring-4 ring-emerald-500/30'
                          }\`}>
                            {lastScannedStudent.student.name.charAt(0)}
                          </div>
                          
                          <span className={\`inline-block px-4 py-1.5 rounded-full text-sm font-black uppercase tracking-wider mb-4 shadow-sm \${
                            lastScannedStudent.isDuplicate
                              ? 'bg-amber-500 text-slate-900'
                              : lastScannedStudent.status === 'Terlambat'
                              ? 'bg-rose-600 text-white'
                              : 'bg-emerald-600 text-white'
                          }\`}>
                            {lastScannedStudent.isDuplicate ? 'SUDAH DI-SCAN SEBELUMNYA' : lastScannedStudent.status}
                          </span>
                          
                          <h2 className="font-black text-white text-3xl leading-tight mb-2">
                            {lastScannedStudent.student.name}
                          </h2>
                          
                          <p className="text-base font-bold text-slate-300 mb-8">
                            Kelas {lastScannedStudent.student.kelas} • NISN: {lastScannedStudent.student.nisn || '-'}
                          </p>
                          
                          <div className="flex flex-col items-center gap-3 mt-4">
                            <div className="font-mono font-black text-6xl text-white tracking-tighter">
                              {lastScannedStudent.recordTime}
                            </div>
                            <div className="scale-125 origin-top mt-2">
                              {getActivityBadge(lastScannedStudent.mode || presensiMode, lastScannedStudent.subject || selectedEkstra)}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-center text-slate-500 space-y-4">
                          <div className="w-24 h-24 rounded-full bg-slate-800/50 flex items-center justify-center border border-slate-700/50 mb-2">
                            <Scan size={40} className="text-slate-400" />
                          </div>
                          <div>
                            <h3 className="font-bold text-lg text-slate-300">Menunggu Scan...</h3>
                            <p className="text-sm mt-1">Arahkan kartu QR siswa ke kamera.</p>
                          </div>
                        </div>
                      )}
                    </div>
`;
    
    // So the structure is:
    //                   </div> (end of right panel)
    //                 </div> (end of grid)
    //               </div>, (end of fixed container)
    //               document.body
    
    // We want to replace from startMarker to docBodyIndex - something.
    // Let's just find the specific string we want to keep.
    const keepString = '                  </div>\n                </div>,\n                document.body';
    const keepIndex = code.indexOf(keepString, startIndex);
    
    if (keepIndex !== -1) {
        code = code.substring(0, startIndex) + replacement1 + code.substring(keepIndex);
        fs.writeFileSync('pages/PresensiQR.tsx', code);
        console.log("Successfully replaced Fullscreen Panel.");
    } else {
        console.log("Could not find keepIndex");
    }
} else {
    console.log("Could not find start or end.", startIndex, regScannerIndex);
}
