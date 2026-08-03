const fs = require('fs');
let code = fs.readFileSync('./index.html', 'utf8');

code = code.replace(/#F0F4F8/g, '#F9F7FF');
code = code.replace(/#E6EAF0/g, '#F4F0FF');

fs.writeFileSync('./index.html', code);
