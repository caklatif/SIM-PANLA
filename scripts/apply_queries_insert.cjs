const fs = require('fs');
const path = require('path');

const inputJadwalFile = path.join(__dirname, '../pages/InputJadwal.tsx');
let content = fs.readFileSync(inputJadwalFile, 'utf8');

content = content.replace(
    /teacher_id:\s*selectedTeacher\.id,\s*\}\)\);/m,
    "teacher_id: selectedTeacher.id,\n            academic_year: academicYear || '2024/2025',\n            semester: semester || 'Ganjil'\n        }));"
);

fs.writeFileSync(inputJadwalFile, content);
console.log('InputJadwal insert applied');
