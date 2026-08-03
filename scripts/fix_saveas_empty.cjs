const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../pages/InputJadwal.tsx');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    /if \(\!currentSchedules \|\| currentSchedules\.length === 0\) \{\n\s*alert\("Tidak ada jadwal di versi saat ini untuk diduplikasi\."\);\n\s*setLoading\(false\);\n\s*return;\n\s*\}/g,
    `if (!currentSchedules || currentSchedules.length === 0) {
              alert("Versi saat ini kosong. Membuat versi baru yang kosong.");
              setWorkingVersion(newVersionName.trim());
              setAvailableVersions(prev => Array.from(new Set([...prev, newVersionName.trim()])));
              setLoading(false);
              return;
          }`
);

fs.writeFileSync(file, content);
console.log('Fixed saveas empty');
