const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../pages/RekapAbsensi.tsx');
let content = fs.readFileSync(file, 'utf8');

const target = `      const { data: schedules } = await supabase
        .from('schedules')
        .select('kelas, subject')
        .eq('teacher_id', profile.id);`;

const replacement = `      let { data: schedules, error: schedError } = await supabase
        .from('schedules')
        .select('kelas, subject, academic_year, semester')
        .eq('teacher_id', profile.id)
        .eq('academic_year', academicYear || '2025/2026')
        .eq('semester', semester || 'Ganjil');
        
      if (schedError && (schedError.code === '42703' || schedError.message?.includes('academic_year'))) {
          const fallback = await supabase.from('schedules').select('kelas, subject, academic_year, semester').eq('teacher_id', profile.id);
          if (fallback.data && fallback.data.length > 0 && fallback.data[0].academic_year !== undefined) {
              schedules = fallback.data.filter(s => s.academic_year === (academicYear || '2025/2026') && s.semester === (semester || 'Ganjil'));
          } else {
              schedules = fallback.data;
          }
      }`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(file, content);
    console.log('Fixed RekapAbsensi');
} else {
    console.log('Target not found in RekapAbsensi');
}
