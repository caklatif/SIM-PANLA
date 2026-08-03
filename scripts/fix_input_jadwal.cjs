const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../pages/InputJadwal.tsx');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    /const fallbackRes = await supabase\.from\('schedules'\)\.select\('\*'\)\.eq\('teacher_id', teacherId\)\.order\('day_of_week'\)\.order\('hour'\);\s*data = fallbackRes\.data;\s*error = fallbackRes\.error;/g,
    `const fallbackRes = await supabase.from('schedules').select('*').eq('teacher_id', teacherId).order('day_of_week').order('hour');
                  if (academicYear === '2025/2026' && semester === 'Genap') {
                      data = fallbackRes.data;
                  } else {
                      data = [];
                  }
                  error = fallbackRes.error;`
);

fs.writeFileSync(file, content);
console.log('InputJadwal.tsx fixed');
