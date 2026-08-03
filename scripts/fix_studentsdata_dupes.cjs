const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../pages/StudentsData.tsx');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/\.eq\('academic_year', academicYear \|\| '2025\/2026'\)\.eq\('academic_year', academicYear \|\| '2025\/2026'\)/g, `.eq('academic_year', academicYear || '2025/2026')`);

fs.writeFileSync(file, content);
