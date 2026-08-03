const fs = require('fs');
const path = 'pages/PublicDashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

const t1 = `<div className="text-[9px] w-[302px] text-slate-800 relative z-10 tracking-wide mt-1" style={{ fontFamily: "'Good Timing', sans-serif" }}>`;
const r1 = `<div className="text-[10px] sm:text-sm text-slate-800 relative z-10 tracking-wide mt-1 flex-1 text-center sm:text-left" style={{ fontFamily: "'Good Timing', sans-serif" }}>`;

const t2 = `<div className="relative rounded-full p-[2px] bg-gradient-to-r from-purple-300 via-indigo-100 to-cyan-200 shadow-[0_8px_30px_rgba(168,85,247,0.15)] w-[427px]">`;
const r2 = `<div className="relative rounded-full p-[2px] bg-gradient-to-r from-purple-300 via-indigo-100 to-cyan-200 shadow-[0_8px_30px_rgba(168,85,247,0.15)] w-full max-w-md mx-auto">`;

if (content.includes(t1)) {
    content = content.replace(t1, r1);
}
if (content.includes(t2)) {
    content = content.replace(t2, r2);
}

fs.writeFileSync(path, content, 'utf8');
console.log('Patched layout');
