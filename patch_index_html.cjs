const fs = require('fs');
const path = '/app/applet/index.html';
let content = fs.readFileSync(path, 'utf8');

const target = `<head>`;

const repl = `<head>
  <style>
    @font-face {
        font-family: 'Alphacorsa';
        font-style: normal;
        font-weight: 400;
        src: local('Alphacorsa'), url('https://fonts.cdnfonts.com/s/109366/AlphacorsaPersonalUse-8MEMD.woff') format('woff');
    }
    @font-face {
        font-family: 'Good Timing';
        font-style: normal;
        font-weight: 700;
        src: local('Good Timing'), url('https://fonts.cdnfonts.com/s/23859/good timing bd.woff') format('woff');
    }
    @font-face {
        font-family: 'Sprintura Demo';
        font-style: normal;
        font-weight: 400;
        src: local('Sprintura Demo'), local('Sprintura-Demo');
    }
  </style>`;

if(content.includes(target)) {
    content = content.replace(target, repl);
    fs.writeFileSync(path, content, 'utf8');
    console.log('Patched index.html');
} else {
    console.log('Target <head> not found');
}
