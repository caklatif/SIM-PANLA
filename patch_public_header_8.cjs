const fs = require('fs');

const path = '/app/applet/pages/PublicDashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

const targetHeader = `<div className="flex flex-col justify-center">
                              <h1 className="text-[13px] min-[400px]:text-[14px] sm:text-[17px] font-black text-slate-800 leading-none tracking-tight uppercase whitespace-nowrap mb-0.5">UPT SMP NEGERI 8 PASURUAN</h1>
                              <p className="text-[10px] sm:text-[12px] font-black italic tracking-widest leading-none" style={{ color: 'transparent', WebkitTextStroke: '0.5px #9333ea', letterSpacing: '0.05em' }}>SIM-PANLA</p>
                          </div>`;

const replHeader = `<div className="flex flex-col justify-center">
                              <h1 className="text-[13px] min-[400px]:text-[14px] sm:text-[17px] font-black text-slate-800 leading-[1.1] tracking-tight uppercase mb-0.5">UPT SMP NEGERI 8<br/>PASURUAN</h1>
                              <p className="text-[10px] sm:text-[12px] font-black italic tracking-widest leading-none" style={{ color: 'transparent', WebkitTextStroke: '0.5px #9333ea', letterSpacing: '0.05em' }}>SIM-PANLA</p>
                          </div>`;

content = content.replace(targetHeader, replHeader);

const targetClock = `<span className="text-xl sm:text-2xl font-black tracking-tighter leading-none text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-purple-600 drop-shadow-sm">{formatTimeIndo(time).replace(' WIB', '')}</span>`;

const replClock = `<style>{"@import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap');"}</style>
                                  <span className="text-xl sm:text-2xl font-black tracking-wider leading-none text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-purple-600 drop-shadow-sm" style={{ fontFamily: "'Share Tech Mono', monospace", paddingBottom: "2px" }}>{formatTimeIndo(time).replace(' WIB', '')}</span>`;

content = content.replace(targetClock, replClock);

fs.writeFileSync(path, content, 'utf8');
console.log('Patched layout');
