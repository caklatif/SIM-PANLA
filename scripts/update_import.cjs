const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../pages/ImportData.tsx');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    /nisn: String\(row\['NISN'\] \|\| row\['nisn'\]\),/g,
    `academic_year: academicYear || '2024/2025',\n                nisn: String(row['NISN'] || row['nisn']),`
);

content = content.replace(
    /upsert\(studentsToInsert, \{ onConflict: 'nisn' \}\)/g,
    `upsert(studentsToInsert, { onConflict: 'academic_year, nisn' })`
);

fs.writeFileSync(file, content);
console.log('ImportData.tsx updated');
