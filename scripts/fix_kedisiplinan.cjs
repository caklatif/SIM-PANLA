const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../pages/Kedisiplinan.tsx');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    /const res = await supabase\.from\('students'\)\.select\('\*'\)\.eq\('kelas', inputClass\)\.order\('name'\);\s*data = res\.data;/g,
    `const res = await supabase.from('students').select('*').eq('kelas', inputClass).order('name');
                  if (academicYear === '2025/2026') data = res.data;
                  else data = [];`
);

content = content.replace(
    /const res = await supabase\.from\('students'\)\.select\('\*'\)\.eq\('kelas', selectedClass\)\.order\('name'\);\s*data = res\.data;/g,
    `const res = await supabase.from('students').select('*').eq('kelas', selectedClass).order('name');
                  if (academicYear === '2025/2026') data = res.data;
                  else data = [];`
);

content = content.replace(
    /const res = await supabase\.from\('students'\)\.select\('\*'\)\.eq\('kelas', className\)\.order\('name'\);\s*data = res\.data;/g,
    `const res = await supabase.from('students').select('*').eq('kelas', className).order('name');
          if (academicYear === '2025/2026') data = res.data;
          else data = [];`
);

fs.writeFileSync(file, content);
console.log('Kedisiplinan.tsx fixed');
