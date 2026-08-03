const fs = require('fs');
const path = '/app/applet/pages/PublicDashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

const target = `<p className="text-[17px] sm:text-[19px] tracking-wider leading-none mt-0.5" style={{ fontFamily: "'Alphacorsa', sans-serif", color: '#a855f7', textShadow: '0 0 5px #7e22ce, 0 0 10px #7e22ce, 0 0 20px #581c87', letterSpacing: '0.05em' }}>SIM-PANLA</p>`;

const repl = `<p className="text-[17px] sm:text-[19px] tracking-wider leading-none mt-0.5" style={{ fontFamily: "'Alphacorsa', sans-serif", color: '#ffffff', WebkitTextStroke: '0.75px #9333ea', textShadow: '1px 1px 2px rgba(147, 51, 234, 0.4)', letterSpacing: '0.05em' }}>SIM-PANLA</p>`;

if (content.includes(target)) {
    content = content.replace(target, repl);
    fs.writeFileSync(path, content, 'utf8');
    console.log('Patched SIM-PANLA text color');
} else {
    console.log('Target not found for SIM-PANLA');
}
