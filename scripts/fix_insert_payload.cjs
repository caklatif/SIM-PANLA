const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../pages/InputJadwal.tsx');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    /academic_year: academicYear \|\| '2025\/2026',\n\s*semester: semester \|\| 'Ganjil'\n\s*\}\)\);/g,
    `academic_year: academicYear || '2025/2026',\n            semester: semester || 'Ganjil',\n            schedule_version: workingVersion || 'Utama'\n        }));`
);

fs.writeFileSync(file, content);
console.log('Fixed insert payload');
