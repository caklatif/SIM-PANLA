const fs = require('fs');
const path = '/app/applet/pages/PublicDashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

const target = `<div className="relative rounded-[2rem] p-[2px] bg-gradient-to-r from-purple-300 via-indigo-100 to-cyan-200 shadow-[0_10px_40px_rgba(168,85,247,0.15)] overflow-hidden">
              <div className="bg-white rounded-[calc(2rem-2px)] px-2 py-1.5 sm:px-3 sm:py-2 relative flex flex-col justify-center shadow-inner">
                  {/* Decorative background glow */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gradient-to-br from-purple-100/40 via-transparent to-cyan-50/40 opacity-70 pointer-events-none rounded-[2rem]"></div>
                  
                  <div className="flex items-center justify-between z-10 relative h-full gap-2 w-full">
                      <div className="flex items-center gap-2 flex-1">
                          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-cyan-50 to-purple-50 shadow-sm border border-white rounded-[14px] flex items-center justify-center p-0.5 shrink-0 relative overflow-hidden">
                              <img src="https://lh3.googleusercontent.com/d/1KtAUvy02qNUB2FzCUoVrNmHtFT0eH2J0" alt="Logo" className="w-full h-full object-contain drop-shadow-md" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                          </div>
                          <div className="flex flex-col justify-center">
                              <h1 className="text-lg min-[400px]:text-xl sm:text-2xl text-slate-800 leading-[1.1] tracking-normal mb-0.5 uppercase drop-shadow-sm" style={{ fontFamily: "'Stormfaze', sans-serif" }}>UPT SMP NEGERI 8<br/>PASURUAN</h1>
                              <p className="text-[17px] sm:text-[19px] tracking-wider leading-none mt-0.5" style={{ fontFamily: "'Alphacorsa', sans-serif", color: '#ffffff', WebkitTextStroke: '0.75px #9333ea', textShadow: '1px 1px 2px rgba(147, 51, 234, 0.4)', letterSpacing: '0.05em' }}>SIM-PANLA</p>
                          </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-1 shrink-0 justify-center">
                          <div className="flex items-center gap-1.5">
                              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-purple-50 to-cyan-50 rounded-full flex items-center justify-center text-purple-400 shrink-0 border border-purple-100 shadow-sm">
                                  <Calendar size={14} strokeWidth={2.5} />
                              </div>
                              <div className="flex items-baseline gap-1">
                                  <style>{"@import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap');"}</style>
                                  <span className="text-[26px] sm:text-[32px] font-black tracking-widest leading-none text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-purple-600 drop-shadow-sm" style={{ fontFamily: "'Share Tech Mono', monospace", paddingBottom: "2px" }}>{formatTimeIndo(time).replace(' WIB', '')}</span>
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

const repl = `<div className="relative rounded-[2rem] p-[2.5px] shadow-[0_0_25px_rgba(168,85,247,0.5)] overflow-hidden group">
              {/* Static background for border */}
              <div className="absolute inset-0 bg-slate-100"></div>
              {/* Rotating neon gradient */}
              <div className="absolute top-1/2 left-1/2 w-[200%] h-[200%] bg-[conic-gradient(transparent_0deg,transparent_90deg,#9333ea_180deg,#c084fc_270deg,transparent_360deg)] animate-[spin_3s_linear_infinite] origin-center -translate-x-1/2 -translate-y-1/2"></div>
              
              <div className="bg-white rounded-[calc(2rem-2.5px)] p-2 sm:p-2.5 relative flex flex-col justify-center shadow-inner h-full w-full">
                  {/* Decorative background glow */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gradient-to-br from-purple-100/40 via-transparent to-cyan-50/40 opacity-70 pointer-events-none rounded-[calc(2rem-2px)]"></div>
                  
                  <div className="flex items-center justify-between z-10 relative h-full gap-2 w-full">
                      <div className="flex items-center gap-2 sm:gap-3 flex-1">
                          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-cyan-50 to-purple-50 shadow-sm border border-white rounded-[14px] flex items-center justify-center p-0.5 shrink-0 relative overflow-hidden">
                              <img src="https://lh3.googleusercontent.com/d/1KtAUvy02qNUB2FzCUoVrNmHtFT0eH2J0" alt="Logo" className="w-full h-full object-contain drop-shadow-md" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                          </div>
                          <div className="flex flex-col justify-center">
                              <h1 className="text-lg min-[400px]:text-xl sm:text-2xl text-slate-800 leading-[1.1] tracking-normal mb-0.5 uppercase drop-shadow-sm" style={{ fontFamily: "'Stormfaze', sans-serif" }}>UPT SMP NEGERI 8<br/>PASURUAN</h1>
                              <p className="text-[17px] sm:text-[19px] tracking-wider leading-none mt-0.5" style={{ fontFamily: "'Alphacorsa', sans-serif", color: '#ffffff', WebkitTextStroke: '0.75px #9333ea', textShadow: '1px 1px 2px rgba(147, 51, 234, 0.4)', letterSpacing: '0.05em' }}>SIM-PANLA</p>
                          </div>
                      </div>
                      
                      {/* Separated Clock & Date Label Area */}
                      <div className="flex flex-col items-end gap-1.5 shrink-0 justify-center bg-slate-50 border border-slate-200/70 rounded-[1.25rem] px-3 py-2 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] relative">
                          {/* Inner divider */}
                          <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-[2px] h-[60%] bg-gradient-to-b from-purple-200 via-purple-400 to-purple-200 rounded-full hidden min-[450px]:block" />
                          
                          <div className="flex items-center gap-1.5">
                              <div className="w-6 h-6 sm:w-7 sm:h-7 bg-white rounded-full flex items-center justify-center text-purple-500 shrink-0 border border-purple-100 shadow-sm">
                                  <Calendar size={13} strokeWidth={2.5} />
                              </div>
                              <div className="flex items-baseline gap-1">
                                  <style>{"@import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap');"}</style>
                                  <span className="text-[22px] sm:text-[28px] font-black tracking-widest leading-none text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-purple-600 drop-shadow-sm" style={{ fontFamily: "'Share Tech Mono', monospace", paddingBottom: "2px" }}>{formatTimeIndo(time).replace(' WIB', '')}</span>
                                  <span className="text-[9px] sm:text-[10px] font-bold text-slate-600 uppercase">WIB</span>
                              </div>
                          </div>
                          <div className="bg-white border border-slate-200 rounded-full px-2 py-0.5 shadow-sm self-end">
                              <p className="text-[9px] sm:text-[10px] font-bold text-slate-700">{formatDateIndo(time)}</p>
                          </div>
                      </div>
                  </div>
              </div>
          </div>`;

if(content.includes(target)) {
    content = content.replace(target, repl);
    fs.writeFileSync(path, content, 'utf8');
    console.log('Patched top header neon and clock label');
} else {
    console.log('Target top header not found');
}
