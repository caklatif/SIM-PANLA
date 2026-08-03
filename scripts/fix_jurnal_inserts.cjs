const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../pages/JurnalForm.tsx');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    /subject: formData\.subject,\s*\}\);\s*\}\);/g,
    "subject: formData.subject, academic_year: academicYear || '2024/2025', semester: semester || 'Ganjil' }; });"
);

content = content.replace(
    /note: row\.note \|\| '',\s*\}\);\s*\}\);\s*\}\);/g,
    "note: row.note || '', academic_year: academicYear || '2024/2025', semester: semester || 'Ganjil' }); }); });"
);

fs.writeFileSync(file, content);
console.log('JurnalForm inserts fixed 2');
