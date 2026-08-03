const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../components/Layout.tsx');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/absolute top-0 right-0 z-20/g, 'absolute -top-1 -right-1 z-20');

fs.writeFileSync(file, content);
console.log('Fixed bell badge placement');
