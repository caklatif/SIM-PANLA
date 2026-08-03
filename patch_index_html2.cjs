const fs = require('fs');
const path = '/app/applet/index.html';
let content = fs.readFileSync(path, 'utf8');

const target = `@font-face {
        font-family: 'Alphacorsa';`;

const repl = `@font-face {
        font-family: 'Digital-7 Mono';
        font-style: normal;
        font-weight: 400;
        src: local('Digital-7 Mono'), url('https://fonts.cdnfonts.com/s/17796/digital-7 (mono).woff') format('woff');
    }
    @font-face {
        font-family: 'Alphacorsa';`;

if(content.includes(target)) {
    content = content.replace(target, repl);
    fs.writeFileSync(path, content, 'utf8');
    console.log('Patched index.html with digital 7');
} else {
    console.log('Target not found');
}
