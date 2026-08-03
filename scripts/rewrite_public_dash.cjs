const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../pages/PublicDashboard.tsx');
let content = fs.readFileSync(file, 'utf8');

const returnIndex = content.indexOf('return (', 250); // To skip earlier returns
if (returnIndex === -1) {
    console.error("Could not find main return");
    process.exit(1);
}

const topPart = content.slice(0, returnIndex);

const newJSX = `return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-blue-200">
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          {/* Very soft background gradient/glows similar to image */}
          <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-blue-50/50 to-transparent"></div>
      </div>

      <div className="relative z-10 max-w-[500px] mx-auto px-4 py-6 md:py-10 space-y-5">
          
          {/* 1. TOP HEADER CARD */}
          <div className="bg-white rounded-[2rem] p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden flex flex-col gap-4 border border-slate-100">
              {/* Decorative wave at bottom right */}
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-gradient-to-br from-blue-400/20 to-blue-600/30 rounded-full blur-2xl pointer-events-none"></div>
              <div className="absolute -bottom-16 -right-4 w-48 h-32 bg-blue-500/10 rounded-[100%] rotate-12 pointer-events-none"></div>
              
              <div className="flex items-center justify-between z-10 relative">
                  <div className="flex items-center gap-3">
                      <div className="w-12 h-14 bg-white shadow-sm border border-slate-100 rounded-xl flex items-center justify-center p-1 shrink-0 relative overflow-hidden">
                          <img src="/logo-sekolah.png" alt="Logo" className="w-full h-full object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                          <div className="absolute inset-0 flex items-center justify-center bg-blue-50 text-blue-500 font-black text-xs" style={{ display: 'none' }}>
                             <School size={24}/>
                          </div>
                      </div>
                      <div>
                          <h1 className="text-[14px] font-black text-slate-800 leading-tight tracking-tight">UPT SMP NEGERI 1<br/>PASURUAN</h1>
                          <p className="text-[9px] text-slate-500 mt-0.5 leading-tight font-medium">Sistem Informasi Kegiatan<br/>Belajar Mengajar (SI KBM)</p>
                      </div>
                  </div>
              </div>

              <div className="self-end bg-gradient-to-r from-slate-50 to-blue-50/50 border border-blue-100/50 rounded-2xl p-3 flex items-center gap-3 shadow-sm z-10 relative mt-2 w-[85%] ml-auto">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-blue-600 shrink-0">
                      <BookOpen size={20} strokeWidth={2.5} />
                  </div>
                  <div className="text-right flex-1">
                      <p className="text-[10px] font-bold text-slate-500">{formatDateIndo(time)}</p>
                      <div className="flex items-baseline justify-end gap-1 text-blue-600">
                          <span className="text-2xl font-black tracking-tight">{formatTimeIndo(time).replace(' WIB', '')}</span>
                          <span className="text-[10px] font-bold">WIB</span>
                      </div>
                  </div>
              </div>
          </div>

          {/* 2. ACADEMIC YEAR PILL */}
          <div className="flex justify-center">
              <div className="bg-white rounded-full shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 pl-1.5 pr-6 py-1.5 flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-md">
                      <GraduationCap size={16} strokeWidth={2.5}/>
                  </div>
                  <div className="text-[11px] font-extrabold text-slate-700">
                      Tahun Ajaran: {academicYear} <span className="text-slate-300 mx-1">|</span> Semester: {semester}
                  </div>
              </div>
          </div>

          {/* 3. CLASS CARDS */}
          {loading || !stats ? (
              <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-blue-500" size={32}/></div>
          ) : (
              <>
                  <div className="grid grid-cols-3 gap-3">
                      {/* Kelas 7 */}
                      <button onClick={() => handleClassClick('7')} className="bg-white rounded-3xl p-4 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 text-left relative overflow-hidden group hover:shadow-md transition-all">
                          <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-blue-100/50 rounded-full blur-xl group-hover:bg-blue-200/50 transition-colors"></div>
                          <div className="w-8 h-8 rounded-full border border-blue-200 flex items-center justify-center text-blue-500 mb-3 bg-white relative z-10">
                              <User size={16} strokeWidth={2.5} />
                          </div>
                          <div className="relative z-10">
                              <div className="text-3xl font-black text-blue-600 tracking-tight">{stats.count7}</div>
                              <div className="text-[9px] font-extrabold text-slate-600 mt-1 uppercase">Kelas 7</div>
                              <div className="w-6 h-1 bg-blue-600 rounded-full mt-2"></div>
                          </div>
                      </button>

                      {/* Kelas 8 */}
                      <button onClick={() => handleClassClick('8')} className="bg-white rounded-3xl p-4 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 text-left relative overflow-hidden group hover:shadow-md transition-all">
                          <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-emerald-100/50 rounded-full blur-xl group-hover:bg-emerald-200/50 transition-colors"></div>
                          <div className="w-8 h-8 rounded-full border border-emerald-200 flex items-center justify-center text-emerald-500 mb-3 bg-white relative z-10">
                              <User size={16} strokeWidth={2.5} />
                          </div>
                          <div className="relative z-10">
                              <div className="text-3xl font-black text-emerald-500 tracking-tight">{stats.count8}</div>
                              <div className="text-[9px] font-extrabold text-slate-600 mt-1 uppercase">Kelas 8</div>
                              <div className="w-6 h-1 bg-emerald-500 rounded-full mt-2"></div>
                          </div>
                      </button>

                      {/* Kelas 9 */}
                      <button onClick={() => handleClassClick('9')} className="bg-white rounded-3xl p-4 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 text-left relative overflow-hidden group hover:shadow-md transition-all">
                          <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-red-100/50 rounded-full blur-xl group-hover:bg-red-200/50 transition-colors"></div>
                          <div className="w-8 h-8 rounded-full border border-red-200 flex items-center justify-center text-red-500 mb-3 bg-white relative z-10">
                              <User size={16} strokeWidth={2.5} />
                          </div>
                          <div className="relative z-10">
                              <div className="text-3xl font-black text-red-500 tracking-tight">{stats.count9}</div>
                              <div className="text-[9px] font-extrabold text-slate-600 mt-1 uppercase">Kelas 9</div>
                              <div className="w-6 h-1 bg-red-500 rounded-full mt-2"></div>
                          </div>
                      </button>
                  </div>

                  {/* 4. SUMMARY ROW */}
                  <div className="grid grid-cols-2 gap-3">
                      {/* KBM Terlaksana */}
                      <div className="bg-white rounded-[2rem] p-4 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 relative overflow-hidden flex flex-col justify-between min-h-[140px]">
                          <div className="absolute -right-4 top-1/2 -translate-y-1/2 w-24 h-24 bg-purple-50 rounded-full blur-xl"></div>
                          
                          <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100 relative z-10">
                              <BookOpen size={16} strokeWidth={2.5}/>
                          </div>
                          
                          <div className="relative z-10 mt-auto">
                              <div className="flex items-baseline gap-1">
                                  <span className="text-3xl font-black text-purple-700 tracking-tight">{stats.completedJp}</span>
                                  <span className="text-[10px] font-bold text-slate-400 uppercase">/ {stats.totalJpRequired} JP</span>
                              </div>
                              <div className="text-[9px] font-extrabold text-slate-600 uppercase mt-0.5">KBM Terlaksana</div>
                          </div>
                          
                          {/* 3D-like Icon Simulation */}
                          <div className="absolute right-2 bottom-2 w-16 h-16 bg-gradient-to-br from-purple-400 to-purple-600 rounded-2xl shadow-lg shadow-purple-500/30 flex items-center justify-center transform -rotate-6 border-t-2 border-purple-300">
                              <ShieldCheck size={28} className="text-white drop-shadow-md" strokeWidth={2}/>
                          </div>
                      </div>

                      {/* Ketidakhadiran */}
                      <button onClick={handleAbsenceClick} className="bg-white rounded-[2rem] p-4 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 relative overflow-hidden flex flex-col justify-between min-h-[140px] text-left hover:shadow-md transition-all group">
                          <div className="absolute -right-4 top-1/2 -translate-y-1/2 w-24 h-24 bg-orange-50 rounded-full blur-xl group-hover:bg-orange-100 transition-colors"></div>
                          
                          <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center border border-orange-100 relative z-10">
                              <AlertCircle size={16} strokeWidth={2.5}/>
                          </div>
                          
                          <div className="relative z-10 mt-auto">
                              <div className="text-3xl font-black text-orange-500 tracking-tight">{stats.absenceCount}</div>
                              <div className="text-[9px] font-extrabold text-slate-600 uppercase mt-0.5 leading-tight">Ketidakhadiran<br/>Murid</div>
                          </div>

                           {/* 3D-like Icon Simulation */}
                           <div className="absolute right-2 bottom-2 w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl shadow-lg shadow-orange-500/30 flex items-center justify-center transform rotate-6 border-t-2 border-yellow-200">
                              <BookX size={28} className="text-white drop-shadow-md" strokeWidth={2}/>
                          </div>
                      </button>
                  </div>

                  {/* 5. PROGRESS BAR */}
                  <div className="bg-white rounded-3xl p-5 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100">
                      <div className="flex items-center gap-2 mb-3">
                          <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                             <Bookmark size={12} strokeWidth={3}/>
                          </div>
                          <span className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wide">Progress KBM Hari Ini</span>
                      </div>
                      
                      {(() => {
                          const percentage = stats.totalJpRequired > 0 ? Math.min(100, Math.round((stats.completedJp / stats.totalJpRequired) * 100)) : 0;
                          return (
                              <div>
                                  <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden mb-2 shadow-inner">
                                      <div className="h-full bg-blue-600 rounded-full transition-all duration-1000 ease-out relative" style={{ width: \`\${percentage}%\`}}>
                                          <div className="absolute inset-0 bg-white/20 w-full h-full skew-x-12 translate-x-full animate-[shimmer_2s_infinite]"></div>
                                      </div>
                                  </div>
                                  <div className="flex justify-between items-center text-[10px] font-bold">
                                      <span className="text-slate-500">{percentage}% Terlaksana</span>
                                      <span className="text-blue-600 text-sm font-black">{percentage}%</span>
                                  </div>
                              </div>
                          );
                      })()}
                  </div>
              </>
          )}

          {/* 6. LOGIN BUTTON */}
          <button 
              onClick={() => setShowLoginModal(true)}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-3xl py-4 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 transition-all active:scale-[0.98] mt-2 group"
          >
              <LogIn size={20} strokeWidth={2.5} className="group-hover:translate-x-1 transition-transform" />
              <span className="font-extrabold text-sm">Login Sebagai</span>
          </button>

          {/* 7. FOOTER QUOTE */}
          <div className="bg-white rounded-full py-2.5 px-4 flex items-center justify-between shadow-sm border border-slate-100 mx-4 mt-4">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-sm">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
              </div>
              <p className="text-[9px] font-bold text-slate-600 text-center leading-tight mx-2">
                  <span className="text-blue-500 font-serif font-black text-sm mr-1">"</span>
                  Setiap hari adalah kesempatan baru<br/>untuk belajar, mengajar, dan menginspirasi.
              </p>
              <div className="w-6 h-6 text-blue-400 flex items-center justify-center shrink-0 relative">
                 <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4L12 2z"/></svg>
                 <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="none" className="absolute top-0 right-0"><path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4L12 2z"/></svg>
              </div>
          </div>
      </div>
      
      {/* MODALS RETAINED FROM ORIGINAL (Just appended exactly as they were conceptually) */}
      
      {/* MODALS WRAPPER */}
      {modalOpen && modalContent && (
          <div className="fixed inset-0 z-[99999] flex justify-center items-end sm:items-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in" onClick={() => setModalOpen(false)}>
              <div className="bg-white dark:bg-slate-800 w-full max-w-lg sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden animate-slide-up sm:animate-zoom-in flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center p-5 sm:p-6 border-b border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 sticky top-0 z-10">
                      <div>
                          <h2 className="text-lg font-black text-slate-800 dark:text-white leading-tight">{modalContent.title}</h2>
                          <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">
                              {modalContent.type === 'class' ? 'Statistik Kelas' : 'Rekap Ketidakhadiran'}
                          </p>
                      </div>
                      <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-slate-700 dark:hover:text-white p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700"><X size={20}/></button>
                  </div>
                  
                  <div className="overflow-y-auto p-6 space-y-6 custom-scrollbar bg-white dark:bg-slate-800 pb-10 md:pb-6">
                      {modalContent.type === 'class' ? (
                          <div className="grid grid-cols-3 gap-3">
                              {modalContent.data.map(([cls, count]: any) => {
                                  const genderData = stats?.classGenderDetails?.[cls] || { L: 0, P: 0 };
                                  return (
                                  <div key={cls} className="bg-white dark:bg-slate-700/50 p-3 rounded-2xl text-center border border-gray-100 dark:border-slate-600 shadow-sm hover:border-blue-200 transition-colors">
                                      <div className="font-extrabold text-slate-700 dark:text-white text-xl">{cls}</div>
                                      <div className="text-[10px] text-slate-500 font-bold uppercase mt-1">{count} Murid</div>
                                      <div className="text-[9px] text-slate-400 font-bold uppercase mt-0.5 border-t border-slate-100 dark:border-slate-600 pt-1 flex justify-center gap-2">
                                          <span className="text-blue-500">L: {genderData.L}</span> | <span className="text-pink-500">P: {genderData.P}</span>
                                      </div>
                                  </div>
                              )})}
                          </div>
                      ) : (
                        <>
                            <div className="grid grid-cols-3 gap-3">
                                <div className="flex flex-col items-center justify-center p-3 bg-yellow-50 dark:bg-yellow-900/30 rounded-2xl border border-yellow-100 dark:border-yellow-800/50">
                                    <span className="text-yellow-700 dark:text-yellow-400 font-bold text-[10px] uppercase mb-1">Sakit</span>
                                    <span className="text-3xl font-extrabold text-yellow-600 dark:text-yellow-400">{modalContent.data.absenceDetails.S}</span>
                                </div>
                                <div className="flex flex-col items-center justify-center p-3 bg-blue-50 dark:bg-blue-900/30 rounded-2xl border border-blue-100 dark:border-blue-800/50">
                                    <span className="text-blue-700 dark:text-blue-400 font-bold text-[10px] uppercase mb-1">Izin</span>
                                    <span className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">{modalContent.data.absenceDetails.I}</span>
                                </div>
                                <div className="flex flex-col items-center justify-center p-3 bg-red-50 dark:bg-red-900/30 rounded-2xl border border-red-100 dark:border-red-800/50">
                                    <span className="text-red-700 dark:text-red-400 font-bold text-[10px] uppercase mb-1">Alpa</span>
                                    <span className="text-3xl font-extrabold text-red-600 dark:text-red-400">{modalContent.data.absenceDetails.A}</span>
                                </div>
                            </div>
                            <div className="p-3 bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-600 rounded-xl text-center">
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">*Termasuk input dari Wali Kelas & Guru Mapel.</span>
                            </div>
                            <hr className="border-gray-100 dark:border-slate-700" />
                            <div>
                                <h3 className="text-[11px] font-extrabold text-slate-600 dark:text-slate-300 uppercase mb-3 flex items-center gap-2"><School size={14}/> Per Kelas</h3>
                                <div className="space-y-3">
                                    {Object.keys(modalContent.data.classDetails).sort().map(cls => {
                                        const totalStudents = modalContent.data.classDetails[cls] || 0;
                                        const absentCount = modalContent.data.absencePerClass[cls] || 0;
                                        const presentCount = totalStudents - absentCount;
                                        const isExpanded = expandedClass === cls;
                                        return (
                                            <div key={cls} className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
                                                <button onClick={() => setExpandedClass(isExpanded ? null : cls)} className="w-full flex items-center p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left">
                                                    <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center font-black text-slate-700 dark:text-white mr-3 shrink-0 text-sm">
                                                        {cls}
                                                    </div>
                                                    <div className="flex-1 px-1">
                                                        <div className="flex items-center gap-2 text-xs font-bold">
                                                            <span className="text-green-600 dark:text-green-400">{presentCount} Hadir</span>
                                                            <span className="text-gray-300 dark:text-gray-600">|</span>
                                                            <span className={absentCount > 0 ? "text-red-500 dark:text-red-400" : "text-gray-400 dark:text-gray-500"}>
                                                                {absentCount} Tidak Hadir
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="text-gray-300 dark:text-gray-600">
                                                        {isExpanded ? <ChevronDown size={18}/> : <ChevronRight size={18}/>}
                                                    </div>
                                                </button>
                                                {isExpanded && absentCount > 0 && (
                                                    <div className="bg-gray-50 dark:bg-slate-800 p-3 border-t border-gray-100 dark:border-slate-700 space-y-2 animate-fade-in">
                                                        {getAbsentStudentsForClass(cls).map((s: any, idx: number) => (
                                                            <div key={idx} className="flex justify-between items-center bg-white dark:bg-slate-700 p-3 rounded-xl border border-gray-100 dark:border-slate-600 text-xs shadow-sm">
                                                                <span className="font-bold text-slate-700 dark:text-white">{s.name}</span>
                                                                <div className="flex items-center gap-2">
                                                                    {s.source === 'Wali' && <span className="text-[9px] bg-purple-100 text-purple-600 px-1 rounded border border-purple-200">Wali</span>}
                                                                    <span className={\`px-2 py-0.5 rounded text-[10px] font-bold uppercase \${s.status === 'S' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-100' : s.status === 'I' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100' : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-100'}\`}>
                                                                        {s.status === 'S' ? 'Sakit' : s.status === 'I' ? 'Izin' : 'Alpa'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                {isExpanded && absentCount === 0 && (
                                                    <div className="bg-green-50 dark:bg-green-900/20 p-3 text-center text-xs text-green-700 dark:text-green-400 font-bold border-t border-green-100 dark:border-green-900/30">
                                                        Semua murid hadir.
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </>
                      )}
                  </div>
              </div>
          </div>
      )}
    
      {/* LOGIN MODAL */}
      {showLoginModal && (
        <div className="fixed inset-0 z-[99999] flex justify-center items-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in" onClick={() => setShowLoginModal(false)}>
           <div className="bg-transparent w-full max-w-lg flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
               {loginViewMode === 'selection' ? (
                  <div className="w-full grid gap-4 animate-fade-in">
                      <div className="flex justify-between items-center mb-2">
                          <h2 className="text-xl font-extrabold text-white">Masuk Sebagai</h2>
                          <button onClick={() => setShowLoginModal(false)} className="text-white/70 hover:text-white p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"><X size={24}/></button>
                      </div>
                      
                      <button 
                        onClick={() => handleRoleSelect('guru')}
                        className="bg-white dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700 border-2 border-transparent hover:border-blue-300 dark:hover:border-blue-500/50 p-5 rounded-3xl shadow-xl flex items-center gap-5 transition-all group"
                      >
                          <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                              <GraduationCap size={32} />
                          </div>
                          <div className="text-left">
                              <h3 className="text-lg font-extrabold text-slate-800 dark:text-white group-hover:text-blue-700 dark:group-hover:text-blue-400">Guru / Tenaga Pendidik</h3>
                              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Masuk untuk mengisi jurnal & absensi.</p>
                          </div>
                          <div className="ml-auto text-slate-300 dark:text-slate-600 group-hover:text-blue-500">
                              <ArrowRight size={24} />
                          </div>
                      </button>

                      <button 
                        onClick={() => handleRoleSelect('operator')}
                        className="bg-white dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700 border-2 border-transparent hover:border-orange-300 dark:hover:border-orange-500/50 p-5 rounded-3xl shadow-xl flex items-center gap-5 transition-all group"
                      >
                          <div className="w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                              <MonitorPlay size={32} />
                          </div>
                          <div className="text-left">
                              <h3 className="text-lg font-extrabold text-slate-800 dark:text-white group-hover:text-orange-700 dark:group-hover:text-orange-400">Operator Monitor</h3>
                              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Dashboard monitoring jadwal real-time.</p>
                          </div>
                          <div className="ml-auto text-slate-300 dark:text-slate-600 group-hover:text-orange-500">
                              <ArrowRight size={24} />
                          </div>
                      </button>

                      <button 
                        onClick={() => handleRoleSelect('admin')}
                        className="bg-white dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700 border-2 border-transparent hover:border-slate-400 dark:hover:border-slate-500/50 p-5 rounded-3xl shadow-xl flex items-center gap-5 transition-all group"
                      >
                          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                              <Shield size={32} />
                          </div>
                          <div className="text-left">
                              <h3 className="text-lg font-extrabold text-slate-800 dark:text-white group-hover:text-slate-700 dark:group-hover:text-slate-400">Administrator</h3>
                              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Pengaturan sistem & database master.</p>
                          </div>
                          <div className="ml-auto text-slate-300 dark:text-slate-600 group-hover:text-slate-500">
                              <ArrowRight size={24} />
                          </div>
                      </button>
                  </div>
               ) : (
                  <div className="bg-white dark:bg-slate-800 w-full p-8 rounded-[2rem] shadow-2xl relative animate-zoom-in">
                      <button onClick={() => setLoginViewMode('selection')} className="absolute top-6 left-6 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                          <ChevronLeft size={24}/>
                      </button>
                      
                      <div className="text-center mb-8 mt-2">
                          <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white dark:border-slate-800 shadow-md">
                              {selectedRoleLabel === 'Administrator' ? <Shield size={36} className="text-blue-500"/> : <GraduationCap size={36} className="text-blue-500"/>}
                          </div>
                          <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-1">Login {selectedRoleLabel}</h2>
                          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Sistem Informasi KBM</p>
                      </div>

                      <form onSubmit={handleLogin} className="space-y-4">
                          {loginError && (
                              <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800/50 rounded-2xl flex gap-3 text-red-600 dark:text-red-400 animate-shake">
                                  <AlertCircle size={20} className="shrink-0 mt-0.5" />
                                  <p className="text-xs font-bold leading-relaxed">{loginError}</p>
                              </div>
                          )}
                          
                          <div>
                              <label className="block text-xs font-extrabold text-slate-600 dark:text-slate-400 mb-1.5 ml-1 uppercase tracking-wide">ID Pengguna / NIP</label>
                              <div className="relative">
                                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                                      <User size={18} />
                                  </div>
                                  <input
                                      type="text"
                                      required
                                      value={userId}
                                      onChange={(e) => setUserId(e.target.value)}
                                      className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-800 dark:text-white focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:font-normal placeholder:text-slate-400"
                                      placeholder="Masukkan NIP atau username"
                                  />
                              </div>
                          </div>

                          <div>
                              <label className="block text-xs font-extrabold text-slate-600 dark:text-slate-400 mb-1.5 ml-1 uppercase tracking-wide">Kata Sandi</label>
                              <div className="relative">
                                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                                      <Lock size={18} />
                                  </div>
                                  <input
                                      type={showPassword ? "text" : "password"}
                                      required
                                      value={password}
                                      onChange={(e) => setPassword(e.target.value)}
                                      className="w-full pl-11 pr-12 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-800 dark:text-white focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:font-normal placeholder:text-slate-400"
                                      placeholder="••••••••"
                                  />
                                  <button
                                      type="button"
                                      onClick={() => setShowPassword(!showPassword)}
                                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-blue-500 transition-colors"
                                  >
                                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                  </button>
                              </div>
                          </div>

                          <button
                              type="submit"
                              disabled={isSubmitting}
                              className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-2xl py-3.5 mt-4 font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                          >
                              {isSubmitting ? (
                                  <><Loader2 size={18} className="animate-spin" /> Sedang Masuk...</>
                              ) : (
                                  <>Masuk Sekarang <ArrowRight size={18} /></>
                              )}
                          </button>
                      </form>
                  </div>
               )}
           </div>
        </div>
      )}
    </div>
  );
};
export default PublicDashboard;
`;

const finalContent = topPart + newJSX;
fs.writeFileSync(file, finalContent);
console.log('Done rewriting PublicDashboard');
