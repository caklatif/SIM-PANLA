const fs = require('fs');

const path = '/app/applet/pages/PublicDashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

const target = `<div className="flex items-end justify-between z-10 relative h-full gap-2 w-full">
                      <div className="flex items-start gap-3 sm:gap-4 flex-1">
                          <div className="w-14 h-16 sm:w-16 sm:h-20 bg-gradient-to-br from-cyan-50 to-purple-50 shadow-sm border border-white rounded-2xl flex items-center justify-center p-1.5 shrink-0 relative overflow-hidden">
                              <img src="https://lh3.googleusercontent.com/d/1KtAUvy02qNUB2FzCUoVrNmHtFT0eH2J0" alt="Logo" className="w-full h-full object-contain drop-shadow-md" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                          </div>
                          <div className="flex flex-col justify-center mt-0.5">
                              <h1 className="text-sm sm:text-lg font-black text-slate-800 leading-none tracking-tight uppercase whitespace-nowrap">UPT SMP NEGERI 8 PASURUAN</h1>
                              <p className="text-lg sm:text-2xl font-black italic tracking-widest mt-0.5" style={{ color: 'transparent', WebkitTextStroke: '1px #9333ea', letterSpacing: '0.05em' }}>SIM-PANLA</p>
                          </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-2 shrink-0 h-full justify-between pb-1">`;

const replacement = `<div className="flex items-center justify-between z-10 relative h-full gap-2 w-full">
                      <div className="flex items-center gap-2.5 sm:gap-3 flex-1">
                          <div className="w-12 h-14 sm:w-14 sm:h-16 bg-gradient-to-br from-cyan-50 to-purple-50 shadow-sm border border-white rounded-xl flex items-center justify-center p-1.5 shrink-0 relative overflow-hidden">
                              <img src="https://lh3.googleusercontent.com/d/1KtAUvy02qNUB2FzCUoVrNmHtFT0eH2J0" alt="Logo" className="w-full h-full object-contain drop-shadow-md" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                          </div>
                          <div className="flex flex-col justify-center">
                              <h1 className="text-[13px] sm:text-base font-black text-slate-800 leading-none tracking-tight uppercase whitespace-nowrap mb-0.5">UPT SMP NEGERI 8 PASURUAN</h1>
                              <p className="text-xl sm:text-[1.35rem] font-black italic tracking-widest" style={{ color: 'transparent', WebkitTextStroke: '1px #9333ea', letterSpacing: '0.05em' }}>SIM-PANLA</p>
                          </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-1.5 shrink-0 justify-center">`;

content = content.replace(target, replacement);
fs.writeFileSync(path, content, 'utf8');
console.log('Patched layout');
