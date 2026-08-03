const fs = require('fs');

const path = '/app/applet/pages/PublicDashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

const targetHeader = `<div className="relative z-10 max-w-[500px] mx-auto px-4 py-6 md:py-10 space-y-5">
          
          {/* 1. TOP HEADER CARD */}
          <div className="relative rounded-[2rem] p-[2px] bg-gradient-to-r from-purple-300 via-indigo-100 to-cyan-200 shadow-[0_10px_40px_rgba(168,85,247,0.15)] overflow-hidden">
              <div className="bg-white rounded-[calc(2rem-2px)] p-1 sm:p-1.5 relative flex flex-col justify-center shadow-inner">
                  {/* Decorative background glow */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gradient-to-br from-purple-100/40 via-transparent to-cyan-50/40 opacity-70 pointer-events-none rounded-[2rem]"></div>
                  
                  <div className="flex items-center justify-between z-10 relative h-full gap-2 w-full">
                      <div className="flex items-center gap-2 flex-1">
                          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-cyan-50 to-purple-50 shadow-sm border border-white rounded-xl flex items-center justify-center p-1 shrink-0 relative overflow-hidden">
                              <img src="https://lh3.googleusercontent.com/d/1KtAUvy02qNUB2FzCUoVrNmHtFT0eH2J0" alt="Logo" className="w-full h-full object-contain drop-shadow-md" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                          </div>
                          <div className="flex flex-col justify-center">
                              <h1 className="text-[14px] sm:text-[17px] font-black text-slate-800 leading-none tracking-tight uppercase whitespace-nowrap mb-0.5">UPT SMP NEGERI 8 PASURUAN</h1>
                              <p className="text-[11px] sm:text-[12px] font-black italic tracking-widest leading-none" style={{ color: 'transparent', WebkitTextStroke: '0.5px #9333ea', letterSpacing: '0.05em' }}>SIM-PANLA</p>
                          </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-1 shrink-0 justify-center">
                          <div className="flex items-center gap-1.5">
                              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-purple-50 to-cyan-50 rounded-full flex items-center justify-center text-purple-400 shrink-0 border border-purple-100 shadow-sm">
                                  <Calendar size={14} strokeWidth={2.5} />
                              </div>
                              <div className="flex items-baseline gap-1">
                                  <span className="text-xl sm:text-2xl font-black tracking-tighter leading-none text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-purple-600 drop-shadow-sm">{formatTimeIndo(time).replace(' WIB', '')}</span>
                                  <span className="text-[9px] sm:text-[10px] font-bold text-slate-600 uppercase">WIB</span>
                              </div>
                          </div>
                          <div className="bg-slate-100/70 border border-slate-200/50 rounded-full px-2 py-0.5 sm:px-3 sm:py-1 backdrop-blur-sm shadow-sm mr-1">
                              <p className="text-[9px] sm:text-[10px] font-medium text-slate-700">{formatDateIndo(time)}</p>
                          </div>
                      </div>
                  </div>
              </div>
          </div>`;

const replHeader = `<div className="relative z-10 max-w-[600px] mx-auto px-3 py-6 md:py-10 space-y-4">
          
          {/* 1. TOP HEADER CARD */}
          <div className="relative rounded-[2rem] p-[2px] bg-gradient-to-r from-purple-300 via-indigo-100 to-cyan-200 shadow-[0_10px_40px_rgba(168,85,247,0.15)] overflow-hidden">
              <div className="bg-white rounded-[calc(2rem-2px)] px-2 py-1.5 sm:px-3 sm:py-2 relative flex flex-col justify-center shadow-inner">
                  {/* Decorative background glow */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gradient-to-br from-purple-100/40 via-transparent to-cyan-50/40 opacity-70 pointer-events-none rounded-[2rem]"></div>
                  
                  <div className="flex items-center justify-between z-10 relative h-full gap-2 w-full">
                      <div className="flex items-center gap-2 flex-1">
                          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-cyan-50 to-purple-50 shadow-sm border border-white rounded-[14px] flex items-center justify-center p-0.5 shrink-0 relative overflow-hidden">
                              <img src="https://lh3.googleusercontent.com/d/1KtAUvy02qNUB2FzCUoVrNmHtFT0eH2J0" alt="Logo" className="w-full h-full object-contain drop-shadow-md" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                          </div>
                          <div className="flex flex-col justify-center">
                              <h1 className="text-[13px] min-[400px]:text-[14px] sm:text-[17px] font-black text-slate-800 leading-none tracking-tight uppercase whitespace-nowrap mb-0.5">UPT SMP NEGERI 8 PASURUAN</h1>
                              <p className="text-[10px] sm:text-[12px] font-black italic tracking-widest leading-none" style={{ color: 'transparent', WebkitTextStroke: '0.5px #9333ea', letterSpacing: '0.05em' }}>SIM-PANLA</p>
                          </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-1 shrink-0 justify-center">
                          <div className="flex items-center gap-1.5">
                              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-purple-50 to-cyan-50 rounded-full flex items-center justify-center text-purple-400 shrink-0 border border-purple-100 shadow-sm">
                                  <Calendar size={14} strokeWidth={2.5} />
                              </div>
                              <div className="flex items-baseline gap-1">
                                  <span className="text-xl sm:text-2xl font-black tracking-tighter leading-none text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-purple-600 drop-shadow-sm">{formatTimeIndo(time).replace(' WIB', '')}</span>
                                  <span className="text-[9px] sm:text-[10px] font-bold text-slate-600 uppercase">WIB</span>
                              </div>
                          </div>
                          <div className="bg-slate-100/70 border border-slate-200/50 rounded-full px-2 py-0.5 sm:px-3 sm:py-1 backdrop-blur-sm shadow-sm mr-1">
                              <p className="text-[9px] sm:text-[10px] font-medium text-slate-700">{formatDateIndo(time)}</p>
                          </div>
                      </div>
                  </div>
              </div>
          </div>`;

content = content.replace(targetHeader, replHeader);

const targetPill = `<div className="text-sm sm:text-base font-black text-slate-800 relative z-10 tracking-tight">
                          Tahun Ajaran: {academicYear || '-'} <span className="mx-2 text-slate-300 font-normal">|</span> Semester: {semester === '1' ? 'Ganjil' : (semester === '2' ? 'Genap' : (semester || '-'))}
                      </div>`;
                      
const replPill = `<div className="text-sm sm:text-base font-black text-slate-800 relative z-10 tracking-tight">
                          Tahun Ajaran: {academicYear || '-'} <span className="mx-2 text-slate-300 font-normal">|</span> Semester: {semester === '1' || semester === 'Ganjil' ? 'Ganjil' : (semester === '2' || semester === 'Genap' ? 'Genap' : 'Ganjil')}
                      </div>`;

content = content.replace(targetPill, replPill);

fs.writeFileSync(path, content, 'utf8');
console.log('Patched layout');
