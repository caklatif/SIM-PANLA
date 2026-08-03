const fs = require('fs');
const path = '/app/applet/index.html';
let content = fs.readFileSync(path, 'utf8');

const target = `@font-face {
        font-family: 'Digital-7 Mono';`;

const repl = `@font-face {
        font-family: 'Stormfaze';
        font-style: normal;
        font-weight: 400;
        src: local('Stormfaze'), url('https://fonts.cdnfonts.com/s/28437/stormfaze.woff') format('woff');
    }
    @font-face {
        font-family: 'Digital-7 Mono';`;

if(content.includes(target)) {
    content = content.replace(target, repl);
    fs.writeFileSync(path, content, 'utf8');
    console.log('Patched index.html with stormfaze');
} else {
    console.log('Target not found');
}
