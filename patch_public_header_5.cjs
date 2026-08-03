const fs = require('fs');

const path = '/app/applet/pages/PublicDashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

const target = `<div className="bg-white rounded-[calc(2rem-2px)] p-4 sm:p-5 relative flex flex-col justify-center min-h-[140px] shadow-inner">
                  {/* Decorative background glow */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gradient-to-br from-purple-100/40 via-transparent to-cyan-50/40 opacity-70 pointer-events-none rounded-[2rem]"></div>
                  
                  <div className="flex items-center justify-between z-10 relative h-full gap-2 w-full">
                      <div className="flex items-center gap-2.5 sm:gap-3 flex-1">
                          <div className="w-12 h-14 sm:w-14 sm:h-16 bg-gradient-to-br from-cyan-50 to-purple-50 shadow-sm border border-white rounded-xl flex items-center justify-center p-1.5 shrink-0 relative overflow-hidden">
                              <img src="https://lh3.googleusercontent.com/d/1KtAUvy02qNUB2FzCUoVrNmHtFT0eH2J0" alt="Logo" className="w-full h-full object-contain drop-shadow-md" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                          </div>
                          <div className="flex flex-col justify-center">
                              <h1 className="text-[13px] sm:text-base font-black text-slate-800 leading-none tracking-tight uppercase whitespace-nowrap mb-0.5">UPT SMP NEGERI 8 PASURUAN</h1>
                              <p className="text-xl sm:text-[1.35rem] font-black italic tracking-widest" style={{ color: 'transparent', WebkitTextStroke: '1px #9333ea', letterSpacing: '0.05em' }}>SIM-PANLA</p>
                          </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-1.5 shrink-0 justify-center">
                          <div className="flex items-center gap-2">
                              <div className="w-10 h-10 bg-gradient-to-br from-purple-50 to-cyan-50 rounded-full flex items-center justify-center text-purple-400 shrink-0 border border-purple-100 shadow-sm">
                                  <Calendar size={20} strokeWidth={2} />
                              </div>
                              <div className="flex items-baseline gap-1">
                                  <span className="text-3xl sm:text-[2.5rem] font-black tracking-tighter leading-none text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-purple-600 drop-shadow-sm">{formatTimeIndo(time).replace(' WIB', '')}</span>
                                  <span className="text-xs sm:text-sm font-bold text-slate-600 uppercase">WIB</span>
                              </div>
                          </div>
                          <div className="bg-slate-100/70 border border-slate-200/50 rounded-full px-4 py-1.5 backdrop-blur-sm shadow-sm mt-1">
                              <p className="text-xs sm:text-sm font-medium text-slate-700">{formatDateIndo(time)}</p>
                          </div>
                      </div>
                  </div>
              </div>`;

const replacement = `<div className="bg-white rounded-[calc(2rem-2px)] p-3 sm:p-4 relative flex flex-col justify-center min-h-[100px] shadow-inner">
                  {/* Decorative background glow */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gradient-to-br from-purple-100/40 via-transparent to-cyan-50/40 opacity-70 pointer-events-none rounded-[2rem]"></div>
                  
                  <div className="flex items-center justify-between z-10 relative h-full gap-2 w-full">
                      <div className="flex items-center gap-2.5 sm:gap-3 flex-1">
                          <div className="w-12 h-14 sm:w-14 sm:h-16 bg-gradient-to-br from-cyan-50 to-purple-50 shadow-sm border border-white rounded-xl flex items-center justify-center p-1.5 shrink-0 relative overflow-hidden">
                              <img src="https://lh3.googleusercontent.com/d/1KtAUvy02qNUB2FzCUoVrNmHtFT0eH2J0" alt="Logo" className="w-full h-full object-contain drop-shadow-md" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                          </div>
                          <div className="flex flex-col justify-center">
                              <h1 className="text-[14px] sm:text-[17px] font-black text-slate-800 leading-none tracking-tight uppercase whitespace-nowrap mb-[2px]">UPT SMP NEGERI 8 PASURUAN</h1>
                              <p className="text-xl sm:text-[1.4rem] font-black italic tracking-widest leading-none" style={{ color: 'transparent', WebkitTextStroke: '1px #9333ea', letterSpacing: '0.05em' }}>SIM-PANLA</p>
                          </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-1.5 shrink-0 justify-center">
                          <div className="flex items-center gap-2">
                              <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-purple-50 to-cyan-50 rounded-full flex items-center justify-center text-purple-400 shrink-0 border border-purple-100 shadow-sm">
                                  <Calendar size={16} strokeWidth={2.5} />
                              </div>
                              <div className="flex items-baseline gap-1">
                                  <span className="text-2xl sm:text-3xl font-black tracking-tighter leading-none text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-purple-600 drop-shadow-sm">{formatTimeIndo(time).replace(' WIB', '')}</span>
                                  <span className="text-[10px] sm:text-xs font-bold text-slate-600 uppercase">WIB</span>
                              </div>
                          </div>
                          <div className="bg-slate-100/70 border border-slate-200/50 rounded-full px-3 py-1 sm:px-4 sm:py-1.5 backdrop-blur-sm shadow-sm">
                              <p className="text-[10px] sm:text-xs font-medium text-slate-700">{formatDateIndo(time)}</p>
                          </div>
                      </div>
                  </div>
              </div>`;

content = content.replace(target, replacement);
fs.writeFileSync(path, content, 'utf8');
console.log('Patched layout');
