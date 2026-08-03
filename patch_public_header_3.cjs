const fs = require('fs');

const path = '/app/applet/pages/PublicDashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

const target = `<div className="flex flex-col mt-1">
                              <h1 className="text-lg sm:text-2xl font-black text-slate-800 leading-[1.1] tracking-tight mb-1 uppercase">UPT SMP NEGERI 8<br/>PASURUAN</h1>
                              <p className="text-3xl sm:text-4xl font-black italic tracking-widest mt-1" style={{ color: 'transparent', WebkitTextStroke: '1.5px #9333ea', letterSpacing: '0.05em' }}>SIM-PANLA</p>
                          </div>`;

const replacement = `<div className="flex flex-col justify-center mt-0.5">
                              <h1 className="text-sm sm:text-lg font-black text-slate-800 leading-none tracking-tight uppercase whitespace-nowrap">UPT SMP NEGERI 8 PASURUAN</h1>
                              <p className="text-lg sm:text-2xl font-black italic tracking-widest mt-0.5" style={{ color: 'transparent', WebkitTextStroke: '1px #9333ea', letterSpacing: '0.05em' }}>SIM-PANLA</p>
                          </div>`;

content = content.replace(target, replacement);
fs.writeFileSync(path, content, 'utf8');
console.log('Patched layout');
