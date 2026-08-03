const fs = require('fs');
const path = require('path');

function replaceInFile(filePath, targets, replacements) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    for (let i = 0; i < targets.length; i++) {
        content = content.replace(targets[i], replacements[i]);
    }
    fs.writeFileSync(filePath, content);
}

// JurnalForm
replaceInFile(path.join(__dirname, '../pages/JurnalForm.tsx'), 
[`                 if (res.error && (res.error.code === '42703' || res.error.message?.includes('academic_year') || res.error.message?.includes('semester'))) {
                     const fallback = await supabase.from('schedules').select('*').eq('teacher_id', profile.id).eq('day_of_week', dbDay).order('hour');
                     if (academicYear === '2025/2026' && semester === 'Genap') return fallback;
                     return { data: [], error: null };
                 }`],
[`                 if (res.error && (res.error.code === '42703' || res.error.message?.includes('academic_year') || res.error.message?.includes('semester'))) {
                     const fallback = await supabase.from('schedules').select('*').eq('teacher_id', profile.id).eq('day_of_week', dbDay).order('hour');
                     if (fallback.data && fallback.data.length > 0 && fallback.data[0].academic_year !== undefined) {
                         fallback.data = fallback.data.filter(s => s.academic_year === (academicYear || '2025/2026') && s.semester === (semester || 'Ganjil'));
                     }
                     return fallback;
                 }`]
);

// KinerjaGuru
replaceInFile(path.join(__dirname, '../pages/KinerjaGuru.tsx'), 
[`                  if (res.error && (res.error.code === '42703' || res.error.message?.includes('academic_year'))) {
                      const fallback = await supabase.from('schedules').select('*');
                      if (academicYear === '2025/2026' && semester === 'Genap') return fallback;
                      return { data: [], error: null };
                  }`,
`          if (error && (error.code === '42703' || error.message?.includes('academic_year'))) {
              const res = await supabase.from('schedules').select('*').eq('teacher_id', teacher.id).order('day_of_week').order('hour');
              if (academicYear === '2025/2026' && semester === 'Genap') data = res.data;
              else data = [];
          }`],
[`                  if (res.error && (res.error.code === '42703' || res.error.message?.includes('academic_year'))) {
                      const fallback = await supabase.from('schedules').select('*');
                      if (fallback.data && fallback.data.length > 0 && fallback.data[0].academic_year !== undefined) {
                          fallback.data = fallback.data.filter(s => s.academic_year === (academicYear || '2025/2026') && s.semester === (semester || 'Ganjil'));
                      }
                      return fallback;
                  }`,
`          if (error && (error.code === '42703' || error.message?.includes('academic_year'))) {
              const res = await supabase.from('schedules').select('*').eq('teacher_id', teacher.id).order('day_of_week').order('hour');
              if (res.data && res.data.length > 0 && res.data[0].academic_year !== undefined) {
                  data = res.data.filter(s => s.academic_year === (academicYear || '2025/2026') && s.semester === (semester || 'Ganjil'));
              } else {
                  data = res.data;
              }
          }`]
);

// OperatorDashboard
replaceInFile(path.join(__dirname, '../pages/OperatorDashboard.tsx'), 
[`                  if (res.error && (res.error.code === '42703' || res.error.message?.includes('academic_year'))) {
                      const fallback = await supabase.from('schedules').select('*').eq('day_of_week', dbDay);
                      if (academicYear === '2025/2026' && semester === 'Genap') return fallback;
                      return { data: [], error: null };
                  }`],
[`                  if (res.error && (res.error.code === '42703' || res.error.message?.includes('academic_year'))) {
                      const fallback = await supabase.from('schedules').select('*').eq('day_of_week', dbDay);
                      if (fallback.data && fallback.data.length > 0 && fallback.data[0].academic_year !== undefined) {
                          fallback.data = fallback.data.filter(s => s.academic_year === (academicYear || '2025/2026') && s.semester === (semester || 'Ganjil'));
                      }
                      return fallback;
                  }`]
);

console.log('Fixed remaining fallbacks');
