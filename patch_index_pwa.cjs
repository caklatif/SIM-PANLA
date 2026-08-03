const fs = require('fs');
const path = 'index.html';
let content = fs.readFileSync(path, 'utf8');

const target = `<title>SIM-PANLA | Guru</title>`;
const repl = `<title>SIM-PANLA | Guru</title>
    <meta name="theme-color" content="#ffffff" />
    <link rel="apple-touch-icon" href="/apple-touch-icon-180x180.svg" />
    <link rel="mask-icon" href="/apple-touch-icon-180x180.svg" color="#9333ea" />`;

if (content.includes(target)) {
    content = content.replace(target, repl);
    fs.writeFileSync(path, content, 'utf8');
    console.log('Patched index.html for PWA meta tags');
} else {
    console.log('Target not found in index.html');
}
