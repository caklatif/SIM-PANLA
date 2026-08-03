const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../pages/InputJadwal.tsx');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    /const \{ academic_year, semester, schedule_version, \.\.\.rest \} = p;/g,
    `const { academic_year, semester, schedule_version, ...rest } = p as any;`
);

fs.writeFileSync(file, content);
console.log('InputJadwal TS fixed');
