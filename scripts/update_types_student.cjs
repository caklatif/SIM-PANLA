const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../types.ts');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    /kelas: string;/g,
    `kelas: string;\n  academic_year?: string;`
);

fs.writeFileSync(file, content);
console.log('types.ts updated');
