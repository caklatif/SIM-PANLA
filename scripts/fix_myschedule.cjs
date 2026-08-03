const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../pages/MySchedule.tsx');
let content = fs.readFileSync(file, 'utf8');

const targetStr = `let { data, error } = await supabase
        .from('schedules')
        .select('*')
        .eq('teacher_id', profile?.id)
        .eq('academic_year', academicYear || '2025/2026')
        .eq('semester', semester || 'Ganjil')
        .eq('schedule_version', activeScheduleVersion || 'Utama')
        .order('day_of_week')
        .order('hour');

      if (error && (error.code === '42703' || error.message?.includes('schedule_version') || error.message?.includes('academic_year'))) {
          const fallback = await supabase.from('schedules').select('*').eq('teacher_id', profile?.id).order('day_of_week').order('hour');
          if (fallback.data && fallback.data.length > 0 && fallback.data[0].academic_year !== undefined) {
              data = fallback.data.filter(s => s.academic_year === (academicYear || '2025/2026') && s.semester === (semester || 'Ganjil'));
          } else {
              data = fallback.data;
          }
          error = fallback.error;
      }`;

const replacementStr = `let { data, error } = await supabase
        .from('schedules')
        .select('*')
        .eq('teacher_id', profile?.id)
        .eq('academic_year', academicYear || '2025/2026')
        .eq('semester', semester || 'Ganjil')
        .eq('schedule_version', activeScheduleVersion || 'Utama')
        .order('day_of_week')
        .order('hour');

      if (error && (error.code === '42703' || error.message?.includes('schedule_version') || error.message?.includes('academic_year'))) {
          const fallback = await supabase.from('schedules').select('*').eq('teacher_id', profile?.id).eq('academic_year', academicYear || '2025/2026').eq('semester', semester || 'Ganjil').order('day_of_week').order('hour');
          if (fallback.error) {
              const ultraFallback = await supabase.from('schedules').select('*').eq('teacher_id', profile?.id).order('day_of_week').order('hour');
              data = (ultraFallback.data || []).filter(s => s.academic_year === (academicYear || '2025/2026') && s.semester === (semester || 'Ganjil'));
              error = ultraFallback.error;
          } else {
              data = fallback.data;
              error = fallback.error;
          }
      }`;

content = content.replace(targetStr, replacementStr);
fs.writeFileSync(file, content);
console.log('Fixed MySchedule');
