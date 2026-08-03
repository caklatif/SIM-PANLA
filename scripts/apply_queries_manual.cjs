const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../pages/InputManual.tsx');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    /created_at:\s*\`\$\{meta\.date\}T07:00:00\+07:00\`/g,
    "created_at: `${meta.date}T07:00:00+07:00`,\n                      academic_year: academicYear || '2024/2025',\n                      semester: semester || 'Ganjil'"
);

fs.writeFileSync(file, content);
console.log('InputManual applied');
