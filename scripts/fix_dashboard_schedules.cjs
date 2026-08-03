const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../pages/Dashboard.tsx');
let content = fs.readFileSync(file, 'utf8');

// 1.
content = content.replace(
    /supabase\.from\('schedules'\)\.select\('\*'\)\.eq\('day_of_week', dbDay\),/g,
    `supabase.from('schedules').select('*').eq('day_of_week', dbDay).eq('academic_year', academicYear || '2024/2025').eq('semester', semester || 'Ganjil').then(async (res) => {
                  if (res.error && (res.error.code === '42703' || res.error.message?.includes('academic_year'))) {
                      const fallback = await supabase.from('schedules').select('*').eq('day_of_week', dbDay);
                      if (academicYear === '2025/2026' && semester === 'Genap') return fallback;
                      return { data: [], error: null };
                  }
                  return res;
              }),`
);

// 2.
content = content.replace(
    /const \{ data: mySchedules \} = await supabase\.from\('schedules'\)\.select\('day_of_week, hour'\)\.eq\('teacher_id', profile\?\.id\);/g,
    `let { data: mySchedules, error: mySchedError } = await supabase.from('schedules').select('day_of_week, hour').eq('teacher_id', profile?.id).eq('academic_year', academicYear || '2024/2025').eq('semester', semester || 'Ganjil');
        if (mySchedError && (mySchedError.code === '42703' || mySchedError.message?.includes('academic_year'))) {
            const fallback = await supabase.from('schedules').select('day_of_week, hour').eq('teacher_id', profile?.id);
            if (academicYear === '2025/2026' && semester === 'Genap') mySchedules = fallback.data;
            else mySchedules = [];
        }`
);

// 3.
content = content.replace(
    /supabase\.from\('schedules'\)\.select\('\*'\)\.eq\('teacher_id', profile\?\.id\)\.eq\('day_of_week', dbDay\),/g,
    `supabase.from('schedules').select('*').eq('teacher_id', profile?.id).eq('day_of_week', dbDay).eq('academic_year', academicYear || '2024/2025').eq('semester', semester || 'Ganjil').then(async (res) => {
                if (res.error && (res.error.code === '42703' || res.error.message?.includes('academic_year'))) {
                    const fallback = await supabase.from('schedules').select('*').eq('teacher_id', profile?.id).eq('day_of_week', dbDay);
                    if (academicYear === '2025/2026' && semester === 'Genap') return fallback;
                    return { data: [], error: null };
                }
                return res;
            }),`
);

fs.writeFileSync(file, content);
console.log('Dashboard.tsx schedules fixed');
