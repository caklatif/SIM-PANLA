const fs = require('fs');
let code = fs.readFileSync('./components/Layout.tsx', 'utf8');

code = code.replace(/\#3B82F6/gi, '#9333ea'); // purple-600

fs.writeFileSync('./components/Layout.tsx', code);
