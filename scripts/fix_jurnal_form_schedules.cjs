const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../pages/JurnalForm.tsx');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    /supabase\.from\('schedules'\)\.select\('\*'\)\.eq\('teacher_id', profile\.id\)\.eq\('day_of_week', dbDay\)\.order\('hour'\)/g,
    `supabase.from('schedules').select('*').eq('teacher_id', profile.id).eq('day_of_week', dbDay).eq('academic_year', academicYear || '2024/2025').eq('semester', semester || 'Ganjil').order('hour').then(async (res) => {
                 if (res.error && (res.error.code === '42703' || res.error.message?.includes('academic_year') || res.error.message?.includes('semester'))) {
                     const fallback = await supabase.from('schedules').select('*').eq('teacher_id', profile.id).eq('day_of_week', dbDay).order('hour');
                     if (academicYear === '2025/2026' && semester === 'Genap') return fallback;
                     return { data: [], error: null };
                 }
                 return res;
             })`
);

fs.writeFileSync(file, content);
console.log('JurnalForm.tsx schedules fixed');
