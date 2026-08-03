const fs = require('fs');
const path = '/app/applet/pages/PublicDashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

const targetHeader = `<div className="flex flex-col justify-center">
                              <h1 className="text-[13px] min-[400px]:text-[14px] sm:text-[17px] font-black text-slate-800 leading-[1.1] tracking-tight uppercase mb-0.5">UPT SMP NEGERI 8<br/>PASURUAN</h1>
                              <p className="text-[10px] sm:text-[12px] font-black italic tracking-widest leading-none" style={{ color: 'transparent', WebkitTextStroke: '0.5px #9333ea', letterSpacing: '0.05em' }}>SIM-PANLA</p>
                          </div>`;

const replHeader = `<div className="flex flex-col justify-center">
                              <h1 className="text-xl min-[400px]:text-2xl sm:text-3xl text-slate-800 leading-[1] tracking-normal mb-1 capitalize" style={{ fontFamily: "'Sprintura Demo', 'Sprintura', sans-serif" }}>UPT SMP NEGERI 8<br/>PASURUAN</h1>
                              <p className="text-base sm:text-lg italic tracking-wider leading-none" style={{ fontFamily: "'Alphacorsa', sans-serif", color: 'transparent', WebkitTextStroke: '0.5px #9333ea', letterSpacing: '0.05em' }}>SIM-PANLA</p>
                          </div>`;
                          
content = content.replace(targetHeader, replHeader);

const targetPill = `<div className="text-sm sm:text-base font-black text-slate-800 relative z-10 tracking-tight">
                          Tahun Ajaran: {academicYear || '-'} <span className="mx-2 text-slate-300 font-normal">|</span> Semester: {semester === '1' || semester === 'Ganjil' ? 'Ganjil' : (semester === '2' || semester === 'Genap' ? 'Genap' : 'Ganjil')}
                      </div>`;
                      
const replPill = `<div className="text-sm sm:text-base text-slate-800 relative z-10 tracking-wide mt-1" style={{ fontFamily: "'Good Timing', sans-serif" }}>
                          Tahun Ajaran: {academicYear || '-'} <span className="mx-2 text-slate-300 font-normal" style={{ fontFamily: 'sans-serif' }}>|</span> Semester: {semester === '1' || semester === 'Ganjil' ? 'Ganjil' : (semester === '2' || semester === 'Genap' ? 'Genap' : 'Ganjil')}
                      </div>`;

content = content.replace(targetPill, replPill);

fs.writeFileSync(path, content, 'utf8');
console.log('Patched fonts');
