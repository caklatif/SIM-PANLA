const fs = require('fs');
const path = '/app/applet/pages/PublicDashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

const target = `    if (jpPerClass === 0 || !isSupabaseConfigured) {
        useMockData(); return;
    }`;

const repl = `    if (!isSupabaseConfigured) {
        useMockData(); return;
    }`;

content = content.replace(target, repl);
fs.writeFileSync(path, content, 'utf8');
console.log('Patched');
