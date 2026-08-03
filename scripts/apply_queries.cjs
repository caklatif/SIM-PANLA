const fs = require('fs');
const path = require('path');

const inputJadwalFile = path.join(__dirname, '../pages/InputJadwal.tsx');
let content = fs.readFileSync(inputJadwalFile, 'utf8');

// Replace select
content = content.replace(
    /\.select\('\*'\)\.eq\('teacher_id', teacherId\)/g,
    ".select('*').eq('academic_year', academicYear || '2024/2025').eq('semester', semester || 'Ganjil').eq('teacher_id', teacherId)"
);

// Replace insert
content = content.replace(
    /teacher_id: selectedTeacher\.id\n\s*\}\)\);/g,
    "teacher_id: selectedTeacher.id,\n            academic_year: academicYear || '2024/2025',\n            semester: semester || 'Ganjil'\n        }));"
);

fs.writeFileSync(inputJadwalFile, content);
console.log('InputJadwal queries applied');
