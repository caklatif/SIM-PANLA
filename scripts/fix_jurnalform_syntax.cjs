const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../pages/JurnalForm.tsx');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    /journals!inner\(teacher_id, subject\)\.eq\('academic_year', academicYear \|\| '2025\/2026'\)\.eq\('semester', semester \|\| 'Ganjil'\)'\)/g,
    `journals!inner(teacher_id, subject)')`
);

fs.writeFileSync(file, content);
console.log('JurnalForm syntax fixed');
