const fs = require('fs');
let code = fs.readFileSync('pages/PresensiQR.tsx', 'utf8');

const target1 = `                    {/* Right (5 Cols): Realtime Activity History Feed in Fullscreen */}
                    <div className="lg:col-span-5 bg-slate-900/90 rounded-3xl p-4 border border-slate-800/80 shadow-2xl flex flex-col min-h-0 h-full overflow-hidden">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
                        <div>
                          <h3 className="font-black text-white text-sm flex items-center gap-2">
                            <Clock size={16} className="text-purple-400" />
                            <span>Aktivitas Scan Terbaru</span>
                          </h3>
                          <p className="text-[11px] text-slate-400 mt-0.5">Riwayat kehadiran realtime hari ini</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-xl bg-purple-950/80 border border-purple-800 text-purple-300 font-mono text-xs font-bold">
                            Total: {totalScanned}
                          </span>
                          <span className="px-2.5 py-1 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 font-mono text-xs font-bold">
                            {totalHadir} Hadir
                          </span>
                        </div>
                      </div>

                      {/* Scrollable Scans List */}
                      <div className="flex-1 overflow-y-auto space-y-2 mt-3 pr-1 custom-scrollbar min-h-0">
                        {scanHistory.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500">
                            <Users size={36} className="mb-2 opacity-40" />
                            <p className="text-xs font-bold text-slate-400">Belum ada riwayat scan hari ini</p>
                            <p className="text-[11px] mt-1 text-slate-500">Data siswa yang discan akan otomatis muncul di sini secara realtime.</p>
                          </div>
                        ) : (
                          scanHistory.map((item, idx) => (
                            <div
                              key={item.id}
                              className={\`p-3 rounded-2xl border flex items-center justify-between text-xs transition-all \${
                                idx === 0 
                                  ? 'bg-slate-800/90 border-purple-500/50 shadow-md ring-1 ring-purple-500/30' 
                                  : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-800/50'
                              }\`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className={\`w-8 h-8 rounded-xl font-bold flex items-center justify-center shrink-0 text-xs text-white \${
                                  item.status === 'Terlambat' ? 'bg-rose-600' : 'bg-emerald-600'
                                }\`}>
                                  {item.studentName.charAt(0)}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-extrabold text-white truncate">{item.studentName}</span>
                                    {getActivityBadge(item.mode, item.subject)}
                                  </div>
                                  <div className="text-[11px] text-slate-400 mt-0.5">
                                    Kelas {item.kelas} • <span className="font-mono text-slate-500">{item.nisn}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right shrink-0 ml-2">
                                <span className={\`inline-block px-2 py-0.5 rounded text-[9px] font-bold \${
                                  item.status === 'Terlambat'
                                    ? 'bg-rose-950/80 text-rose-300 border border-rose-800'
                                    : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                                }\`}>
                                  {item.status}
                                </span>
                                <div className="text-[10px] font-mono text-slate-400 mt-1">
                                  {new Date(item.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>`;

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
                          
                          <div className="flex flex-col items-center gap-3">
                            <div className="font-mono font-black text-5xl text-white tracking-tighter">
                              {lastScannedStudent.recordTime}
                            </div>
                            <div className="scale-110 origin-top">
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
                    </div>`;

if (code.includes(target1)) {
    code = code.replace(target1, replacement1);
    console.log("Successfully replaced target1 (Fullscreen)");
} else {
    console.log("Failed to find target1");
}

fs.writeFileSync('pages/PresensiQR.tsx', code);
