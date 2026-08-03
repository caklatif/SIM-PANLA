const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../pages/InputJadwal.tsx');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    /const \{ academic_year, semester, \.\.\.rest \} = p;/g,
    `const { academic_year, semester, schedule_version, ...rest } = p;`
);

fs.writeFileSync(file, content);
console.log('InputJadwal fallback patched');
