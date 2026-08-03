const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../pages/JurnalForm.tsx');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    /const \{ academic_year, semester, \.\.\.rest \} = a;/g,
    `const { academic_year, semester, ...rest } = a as any;`
);

content = content.replace(
    /const \{ academic_year, semester, \.\.\.rest \} = n;/g,
    `const { academic_year, semester, ...rest } = n as any;`
);

fs.writeFileSync(file, content);
console.log('JurnalForm TS fixed');
