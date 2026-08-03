const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../pages/JurnalForm.tsx');
let content = fs.readFileSync(file, 'utf8');

// Insert Journal (line 222)
content = content.replace(
    /...payload \}\)\.select\(\)\.single\(\);/g,
    "...payload, academic_year: academicYear || '2024/2025', semester: semester || 'Ganjil' }).select().single();"
);

// Insert Attendance (line 224)
content = content.replace(
    /subject: formData\.subject,\s*\}\); \}\);/g,
    "subject: formData.subject, academic_year: academicYear || '2024/2025', semester: semester || 'Ganjil' }); });"
);

// Insert Notes (line 227 and 228)
content = content.replace(
    /note: row\.note \|\| '',\s*\}\); \}\); \}\);/g,
    "note: row.note || '', academic_year: academicYear || '2024/2025', semester: semester || 'Ganjil' }); }); });"
);

fs.writeFileSync(file, content);
console.log('JurnalForm inline applied');
