const fs = require('fs');

const path = '/app/applet/pages/PublicDashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

const startIndex = content.indexOf('{/* 1. TOP HEADER CARD */}');
const endIndex = content.indexOf('{/* 3. CLASS CARDS */}');

if (startIndex === -1 || endIndex === -1) {
    console.error("Tags not found");
    process.exit(1);
}

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
                              <h1 className="text-lg sm:text-2xl font-black text-slate-800 leading-[1.1] tracking-tight mb-1 uppercase">UPT SMP NEGERI 8<br/>PASURUAN</h1>
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
          <div className="flex justify-center mt-6">
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
          </div>

          `;

const newContent = content.substring(0, startIndex) + replacement + content.substring(endIndex);
fs.writeFileSync(path, newContent, 'utf8');
console.log('Patched layout');
