const fs = require('fs');
const path = 'pages/PublicDashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

const target = `          {/* 2. ACADEMIC YEAR PILL */}
          <div className="flex justify-center mt-6">
              <div className="relative rounded-full p-[2px] bg-gradient-to-r from-purple-300 via-indigo-100 to-cyan-200 shadow-[0_8px_30px_rgba(168,85,247,0.15)] w-full max-w-md mx-auto">
                  <div className="bg-white rounded-full pl-1.5 pr-8 py-1.5 flex items-center gap-4 relative overflow-hidden shadow-inner">
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-50/50 to-cyan-50/50 opacity-50 pointer-events-none"></div>
                      <div className="w-10 h-10 bg-gradient-to-br from-slate-600 to-slate-800 rounded-full flex items-center justify-center text-cyan-100 shadow-md relative z-10 border border-slate-600">
                          <GraduationCap size={18} strokeWidth={2.5}/>
                      </div>
                      <div className="text-[10px] sm:text-sm text-slate-800 relative z-10 tracking-wide mt-1 flex-1 text-center sm:text-left" style={{ fontFamily: "'Good Timing', sans-serif" }}>
                          Tahun Ajaran: {academicYear || '-'} <span className="mx-2 text-slate-300 font-normal" style={{ fontFamily: 'sans-serif' }}>|</span> Semester: {semester === '1' || semester === 'Ganjil' ? 'Ganjil' : (semester === '2' || semester === 'Genap' ? 'Genap' : 'Ganjil')}
                      </div>
                  </div>
              </div>
          </div>`;

const repl = `          {/* 2. ACADEMIC YEAR PILL */}
          <div className="relative rounded-full p-[2px] mt-4 bg-gradient-to-r from-purple-300 via-indigo-100 to-cyan-200 shadow-[0_8px_30px_rgba(168,85,247,0.15)] w-full">
              <div className="bg-white rounded-full px-2 py-1.5 sm:px-3 sm:py-2 flex items-center gap-2 sm:gap-4 relative overflow-hidden shadow-inner">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-50/50 to-cyan-50/50 opacity-50 pointer-events-none"></div>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-slate-600 to-slate-800 rounded-full flex items-center justify-center text-cyan-100 shadow-md relative z-10 border border-slate-600 shrink-0">
                      <GraduationCap size={16} strokeWidth={2.5} className="sm:w-[18px] sm:h-[18px]"/>
                  </div>
                  <div className="text-[10px] sm:text-[14px] text-slate-800 relative z-10 tracking-wide flex-1 text-center min-[400px]:text-left leading-tight pt-0.5 sm:pt-1" style={{ fontFamily: "'Good Timing', sans-serif" }}>
                      Tahun Ajaran: {academicYear || '-'} <span className="mx-1 sm:mx-2 text-slate-300 font-normal" style={{ fontFamily: 'sans-serif' }}>|</span> Semester: {semester === '1' || semester === 'Ganjil' ? 'Ganjil' : (semester === '2' || semester === 'Genap' ? 'Genap' : 'Ganjil')}
                  </div>
              </div>
          </div>`;

if (content.includes(target)) {
    content = content.replace(target, repl);
    fs.writeFileSync(path, content, 'utf8');
    console.log('Patched academic pill');
} else {
    console.log('Target not found');
}
