const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../pages/StudentsData.tsx');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    /const res = await supabase\.from\('students'\)\.select\('\*'\)\.eq\('kelas', mutasiKeluarData\.kelas\)\.order\('name'\);\s*data = res\.data;/g,
    `const res = await supabase.from('students').select('*').eq('kelas', mutasiKeluarData.kelas).order('name');
              if (academicYear === '2025/2026') data = res.data;
              else data = [];`
);

fs.writeFileSync(file, content);
console.log('StudentsData.tsx dropdown fixed');
