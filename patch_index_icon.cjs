const fs = require('fs');
const path = 'index.html';
let content = fs.readFileSync(path, 'utf8');

const target = `<title>SIM-PANLA | Guru</title>
    <meta name="theme-color" content="#ffffff" />
    <link rel="apple-touch-icon" href="/apple-touch-icon-180x180.svg" />
    <link rel="mask-icon" href="/apple-touch-icon-180x180.svg" color="#9333ea" />`;

const repl = `<title>SIM-PANLA | Guru</title>
    <meta name="theme-color" content="#ffffff" />
    <link rel="icon" type="image/png" href="/icon.png" />
    <link rel="apple-touch-icon" href="/icon.png" />
    <link rel="mask-icon" href="/icon.png" color="#9333ea" />`;

if (content.includes(target)) {
    content = content.replace(target, repl);
    fs.writeFileSync(path, content, 'utf8');
    console.log('Patched index.html icons');
} else {
    console.log('Target not found in index.html');
}
