const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../pages/StudentsData.tsx');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    /const \{ data, error \} = await query\.order\('kelas', \{ ascending: true \}\)\.order\('name', \{ ascending: true \}\);/g,
    `let { data, error } = await query.order('kelas', { ascending: true }).order('name', { ascending: true });
      if (error && (error.code === '42703' || error.message?.includes('academic_year'))) {
          // Fallback if column missing
          let fallbackQuery = supabase.from('students').select('*');
          if (filterClass) fallbackQuery = fallbackQuery.eq('kelas', filterClass);
          const res = await fallbackQuery.order('kelas', { ascending: true }).order('name', { ascending: true });
          
          // Assume old data belongs to 2025/2026
          if (academicYear === '2025/2026') {
             data = res.data;
          } else {
             data = [];
          }
          error = res.error;
      }`
);

fs.writeFileSync(file, content);
console.log('StudentsData.tsx fixed');
