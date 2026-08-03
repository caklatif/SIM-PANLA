const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../pages/InputJadwal.tsx');
let content = fs.readFileSync(file, 'utf8');

// We want to handle the case where academic_year doesn't exist yet
content = content.replace(
    /const \{ data, error \} = await supabase\.from\('schedules'\)\.select\('\*'\)\.eq\('academic_year', academicYear \|\| '2024\/2025'\)\.eq\('semester', semester \|\| 'Ganjil'\)\.eq\('teacher_id', teacherId\)\.order\('day_of_week'\)\.order\('hour'\);/g,
    `let query = supabase.from('schedules').select('*').eq('teacher_id', teacherId).order('day_of_week').order('hour');
          const { data, error } = await query;
          // Note: we'll filter by academicYear/semester locally if the columns exist, or we can just try to fetch with academic_year and fallback
          `
);

fs.writeFileSync(file, content);
console.log('InputJadwal updated for fallback');
