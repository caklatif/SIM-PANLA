const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../pages/PublicDashboard.tsx');
let content = fs.readFileSync(file, 'utf8');

const t = `<LogIn size={24} /> Login Sebagai`;
const r = `<span className="relative overflow-hidden inline-flex items-center justify-center gap-2 group-hover:scale-105 transition-transform"><span className="absolute inset-0 z-20 w-[50%] h-full bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-[200%] animate-[shimmer_2s_infinite]"></span><LogIn size={24} className="relative z-10" /> <span className="relative z-10">Login Sebagai</span></span>`;

content = content.replace(t, r);
fs.writeFileSync(file, content);
console.log('Applied shimmer in PublicDashboard');
