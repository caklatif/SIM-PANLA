const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../pages/RekapDhuha.tsx');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/\.eq\('academic_year', settings\.academic_year \|\| '2025\/2026'\)/g, ``);
content = content.replace(/\.eq\('academic_year', academicYear \|\| '2025\/2026'\)\.eq\('academic_year', academicYear \|\| '2025\/2026'\)/g, `.eq('academic_year', academicYear || '2025/2026')`);

fs.writeFileSync(file, content);
