const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../pages/InputJadwal.tsx');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    /Simpan Sbg Baru/g,
    'Simpan Jadwal dgn Nama'
);
content = content.replace(
    /Versi Jadwal<\/label>/g,
    'Edit Versi Jadwal</label>'
);

fs.writeFileSync(file, content);
console.log('Fixed text');
