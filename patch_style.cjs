const fs = require('fs');
const path = 'pages/PublicDashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

const t1 = `<h1 className="text-lg min-[400px]:text-xl sm:text-2xl text-slate-800 leading-[1.1] tracking-normal mb-0.5 uppercase drop-shadow-sm" style={{ fontFamily: "'Stormfaze', sans-serif" }}>UPT SMP NEGERI 8<br/>PASURUAN</h1>`;
const r1 = `<h1 className="text-[12px] mt-0 -ml-[7px] w-[118px] text-slate-800 leading-[1.1] tracking-normal mb-0.5 uppercase drop-shadow-sm" style={{ fontFamily: "'Stormfaze', sans-serif" }}>UPT SMP NEGERI 8<br/>PASURUAN</h1>`;

const t2 = `<p className="text-[17px] sm:text-[19px] tracking-wider leading-none mt-0.5" style={{ fontFamily: "'Alphacorsa', sans-serif", color: '#ffffff', WebkitTextStroke: '0.75px #9333ea', textShadow: '1px 1px 2px rgba(147, 51, 234, 0.4)', letterSpacing: '0.05em' }}>SIM-PANLA</p>`;
const r2 = `<p className="text-[15px] -ml-[7px] font-bold w-[118px] tracking-wider leading-none mt-0.5" style={{ fontFamily: "'Alphacorsa', sans-serif", color: '#ffffff', WebkitTextStroke: '0.75px #9333ea', textShadow: '1px 1px 2px rgba(147, 51, 234, 0.4)', letterSpacing: '0.05em' }}>SIM-PANLA</p>`;

const t3 = `<div className="relative rounded-full p-[2px] bg-gradient-to-r from-purple-300 via-indigo-100 to-cyan-200 shadow-[0_8px_30px_rgba(168,85,247,0.15)]">`;
const r3 = `<div className="relative rounded-full p-[2px] bg-gradient-to-r from-purple-300 via-indigo-100 to-cyan-200 shadow-[0_8px_30px_rgba(168,85,247,0.15)] w-[427px]">`;

const t4 = `<div className="text-sm sm:text-base text-slate-800 relative z-10 tracking-wide mt-1" style={{ fontFamily: "'Good Timing', sans-serif" }}>`;
const r4 = `<div className="text-[9px] w-[302px] text-slate-800 relative z-10 tracking-wide mt-1" style={{ fontFamily: "'Good Timing', sans-serif" }}>`;

content = content.replace(t1, r1);
content = content.replace(t2, r2);
content = content.replace(t3, r3);
content = content.replace(t4, r4);

fs.writeFileSync(path, content, 'utf8');
console.log('Patched');
