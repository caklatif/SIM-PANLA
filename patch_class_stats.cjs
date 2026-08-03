const fs = require('fs');
const path = '/app/applet/pages/PublicDashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

const target = `                    if (rawKelas.startsWith('7')) c7++; else if (rawKelas.startsWith('8')) c8++; else if (rawKelas.startsWith('9')) c9++;`;

const repl = `                    if (/^7|^VII(?![I])/.test(rawKelas)) c7++;
                    else if (/^8|^VIII/.test(rawKelas)) c8++;
                    else if (/^9|^IX/.test(rawKelas)) c9++;`;

if (content.includes(target)) {
    content = content.replace(target, repl);
    fs.writeFileSync(path, content, 'utf8');
    console.log('Patched stats calculation for Roman numerals');
} else {
    console.log('Target not found for stats calculation');
}
