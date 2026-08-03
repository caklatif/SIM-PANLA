const fs = require('fs');

const path = '/app/applet/pages/PublicDashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

const target = `{/* 1. TOP HEADER CARD */}
          <div className="bg-white rounded-[2rem] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden flex flex-col justify-center border border-slate-100 min-h-[140px]">
              {/* Decorative wave at bottom right */}
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-gradient-to-br from-purple-400/20 to-purple-600/30 rounded-full blur-2xl pointer-events-none"></div>
              <div className="absolute -bottom-16 -right-4 w-48 h-32 bg-purple-500/10 rounded-[100%] rotate-12 pointer-events-none"></div>
              
              <div className="flex items-center justify-between z-10 relative h-full gap-2">
                  <div className="flex items-center gap-3 sm:gap-4">
                      <div className="w-12 h-14 sm:w-14 sm:h-16 bg-white shadow-sm border border-slate-100 rounded-xl flex items-center justify-center p-1 shrink-0 relative overflow-hidden">
                          <img src="https://lh3.googleusercontent.com/d/1KtAUvy02qNUB2FzCUoVrNmHtFT0eH2J0" alt="Logo" className="w-full h-full object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                      </div>
                      <div className="flex flex-col">
                          <h1 className="text-base sm:text-xl font-black text-slate-800 leading-tight tracking-tight mb-0.5">UPT SMP NEGERI 8<br/>PASURUAN</h1>
                          <p className="text-xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-indigo-400 italic tracking-wider mt-1 drop-shadow-sm">SIM-PANLA</p>
                      </div>
                  </div>
                  
                  <div className="flex items-center gap-2 sm:gap-3 shrink-0 text-right">
                      <div className="hidden sm:flex w-[38px] h-[38px] bg-purple-100/80 rounded-full items-center justify-center text-purple-600 shrink-0 border border-purple-200">
                          <Calendar size={18} strokeWidth={2.5} />
                      </div>
                      <div className="flex flex-col justify-center">
                          <div className="flex items-baseline justify-end gap-1 text-purple-700 mb-0.5">
                              <span className="text-xl sm:text-3xl font-black tracking-tighter leading-none">{formatTimeIndo(time).replace(' WIB', '')}</span>
                              <span className="text-[10px] sm:text-[13px] font-bold text-purple-600">WIB</span>
                          </div>
                          <p className="text-[10px] sm:text-[13px] font-bold text-purple-500">{formatDateIndo(time)}</p>
                      </div>
                  </div>
              </div>
          </div>

          

          {/* 2. ACADEMIC YEAR PILL */}
          <div className="flex justify-center">
              <div className="bg-white rounded-full shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 pl-1.5 pr-6 py-1.5 flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white shadow-md">
                      <GraduationCap size={16} strokeWidth={2.5}/>
                  </div>
                  <div className="text-[11px] font-extrabold text-slate-700">
                      Tahun Ajaran: <span className="text-purple-600">{academicYear || '-'}</span> <span className="mx-1 text-slate-300">|</span> Semester: <span className="text-purple-600">{semester === '1' ? 'Ganjil' : (semester === '2' ? 'Genap' : '-')}</span>
                  </div>
              </div>
          </div>`;

const replacement = `{/* 1. TOP HEADER CARD */}
          <div className="relative rounded-[2rem] p-[2px] bg-gradient-to-r from-purple-300 via-indigo-100 to-cyan-200 shadow-[0_10px_40px_rgba(168,85,247,0.15)] overflow-hidden">
              <div className="bg-white rounded-[calc(2rem-2px)] p-4 sm:p-5 relative flex flex-col justify-center min-h-[140px] shadow-inner">
                  {/* Decorative background glow */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gradient-to-br from-purple-100/40 via-transparent to-cyan-50/40 opacity-70 pointer-events-none rounded-[2rem]"></div>
                  
                  <div className="flex items-end justify-between z-10 relative h-full gap-2 w-full">
                      <div className="flex items-start gap-3 sm:gap-4 flex-1">
                          <div className="w-14 h-16 sm:w-16 sm:h-20 bg-gradient-to-br from-cyan-50 to-purple-50 shadow-sm border border-white rounded-2xl flex items-center justify-center p-1.5 shrink-0 relative overflow-hidden">
                              <img src="https://lh3.googleusercontent.com/d/1KtAUvy02qNUB2FzCUoVrNmHtFT0eH2J0" alt="Logo" className="w-full h-full object-contain drop-shadow-md" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                          </div>
                          <div className="flex flex-col mt-1">
                              <h1 className="text-lg sm:text-2xl font-black text-slate-800 leading-[1.1] tracking-tight mb-2 uppercase">UPT SMP NEGERI 8<br/>PASURUAN</h1>
                              <p className="text-3xl sm:text-4xl font-black italic tracking-widest mt-1" style={{ color: 'transparent', WebkitTextStroke: '1.5px #9333ea', letterSpacing: '0.05em' }}>SIM-PANLA</p>
                          </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-2 shrink-0 h-full justify-between pb-1">
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
              </div>
          </div>

          

          {/* 2. ACADEMIC YEAR PILL */}
          <div className="flex justify-center">
              <div className="relative rounded-full p-[2px] bg-gradient-to-r from-purple-300 via-indigo-100 to-cyan-200 shadow-[0_8px_30px_rgba(168,85,247,0.15)]">
                  <div className="bg-white rounded-full pl-1.5 pr-8 py-1.5 flex items-center gap-4 relative overflow-hidden shadow-inner">
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-50/50 to-cyan-50/50 opacity-50 pointer-events-none"></div>
                      <div className="w-10 h-10 bg-gradient-to-br from-slate-600 to-slate-800 rounded-full flex items-center justify-center text-cyan-100 shadow-md relative z-10 border border-slate-600">
                          <GraduationCap size={18} strokeWidth={2.5}/>
                      </div>
                      <div className="text-sm sm:text-base font-black text-slate-800 relative z-10 tracking-tight">
                          Tahun Ajaran: {academicYear || '-'} <span className="mx-2 text-slate-300 font-normal">|</span> Semester: {semester === '1' ? 'Ganjil' : (semester === '2' ? 'Genap' : '-')}
                      </div>
                  </div>
              </div>
          </div>`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(path, content, 'utf8');
    console.log('Patched header successfully');
} else {
    console.log('Target not found in PublicDashboard.tsx');
    // Let's try to match with regex to be safe
    console.log("Current content snippet: ", content.substring(content.indexOf('{/* 1. TOP HEADER CARD */}'), content.indexOf('{/* 1. TOP HEADER CARD */}') + 500));
}
