const fs = require('fs');
let code = fs.readFileSync('./index.html', 'utf8');

code = code.replace(/\#3b82f6/gi, '#9333ea');
code = code.replace(/selection:bg-blue-500/g, 'selection:bg-purple-500');

fs.writeFileSync('./index.html', code);
