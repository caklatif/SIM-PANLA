const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../index.html');
let content = fs.readFileSync(file, 'utf8');

const startStr = '/* Animated Glow Border */';
const endStr = '}\n      }\n';
const startIndex = content.indexOf(startStr);
const endIndex = content.indexOf(endStr) + endStr.length;

if(startIndex > -1 && endIndex > -1) {
    content = content.substring(0, startIndex) + content.substring(endIndex);
    fs.writeFileSync(file, content);
    console.log('Removed glow css');
}
