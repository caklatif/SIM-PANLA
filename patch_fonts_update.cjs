const fs = require('fs');
const path = '/app/applet/pages/PublicDashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

const target1 = `<h1 className="text-xl min-[400px]:text-2xl sm:text-3xl text-slate-800 leading-[1] tracking-normal mb-1 capitalize" style={{ fontFamily: "'Sprintura Demo', 'Sprintura', sans-serif" }}>UPT SMP NEGERI 8<br/>PASURUAN</h1>
                              <p className="text-base sm:text-lg italic tracking-wider leading-none" style={{ fontFamily: "'Alphacorsa', sans-serif", color: 'transparent', WebkitTextStroke: '0.5px #9333ea', letterSpacing: '0.05em' }}>SIM-PANLA</p>`;

const repl1 = `<h1 className="text-lg min-[400px]:text-xl sm:text-2xl text-slate-800 leading-[1.1] tracking-normal mb-0.5 uppercase drop-shadow-sm" style={{ fontFamily: "'Stormfaze', sans-serif" }}>UPT SMP NEGERI 8<br/>PASURUAN</h1>
                              <p className="text-[17px] sm:text-[19px] tracking-wider leading-none mt-0.5" style={{ fontFamily: "'Alphacorsa', sans-serif", color: '#a855f7', textShadow: '0 0 5px #7e22ce, 0 0 10px #7e22ce, 0 0 20px #581c87', letterSpacing: '0.05em' }}>SIM-PANLA</p>`;

const target2 = `<span className="text-[28px] sm:text-[34px] tracking-widest leading-none text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-purple-600 drop-shadow-sm" style={{ fontFamily: "'Digital-7 Mono', monospace", paddingBottom: "2px" }}>{formatTimeIndo(time).replace(' WIB', '')}</span>`;

const repl2 = `<style>{"@import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap');"}</style>
                                  <span className="text-[26px] sm:text-[32px] font-black tracking-widest leading-none text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-purple-600 drop-shadow-sm" style={{ fontFamily: "'Share Tech Mono', monospace", paddingBottom: "2px" }}>{formatTimeIndo(time).replace(' WIB', '')}</span>`;


content = content.replace(target1, repl1);
content = content.replace(target2, repl2);

fs.writeFileSync(path, content, 'utf8');
console.log('Patched');
