const fs = require('fs');
const path = 'pages/PublicDashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

const target = `                    if (/^7|^VII(?![I])/.test(rawKelas)) c7++;
                    else if (/^8|^VIII/.test(rawKelas)) c8++;
                    else if (/^9|^IX/.test(rawKelas)) c9++;`;
                    
const repl = `                    if (/(?:^|\\s|-)(7|VII(?![I]))/i.test(rawKelas)) c7++;
                    else if (/(?:^|\\s|-)(8|VIII)/i.test(rawKelas)) c8++;
                    else if (/(?:^|\\s|-)(9|IX)/i.test(rawKelas)) c9++;`;

if (content.includes(target)) {
    content = content.replace(target, repl);
    fs.writeFileSync(path, content, 'utf8');
    console.log('Patched regex');
} else {
    console.log('Target not found');
}
