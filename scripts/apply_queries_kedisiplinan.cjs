const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../pages/Kedisiplinan.tsx');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    /note:\s*row\.note\s*\|\|\s*\`Laporan Manual oleh \$\{profile\.full_name\}\`/g,
    "note: row.note || `Laporan Manual oleh ${profile.full_name}`,\n                              academic_year: academicYear || '2024/2025',\n                              semester: semester || 'Ganjil'"
);

content = content.replace(
    /note:\s*massCommonData\.note\s*\|\|\s*\`Laporan Massal oleh \$\{profile\.full_name\}\`/g,
    "note: massCommonData.note || `Laporan Massal oleh ${profile.full_name}`,\n                              academic_year: academicYear || '2024/2025',\n                              semester: semester || 'Ganjil'"
);

fs.writeFileSync(file, content);
console.log('Kedisiplinan applied');
