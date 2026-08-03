const fs = require('fs');
const path = require('path');
const glob = require('glob');

const pagesDir = path.join(__dirname, '../pages');
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
    const filePath = path.join(pagesDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    // Fix InputJadwal.tsx fetchTeacherSchedules
    if (file === 'InputJadwal.tsx') {
        const target = `                  if (academicYear === '2025/2026' && semester === 'Genap') {
                      data = fallbackRes.data;
                  } else {
                      data = [];
                  }`;
        const replacement = `                  if (fallbackRes.data && fallbackRes.data.length > 0 && fallbackRes.data[0].academic_year !== undefined) {
                      data = fallbackRes.data.filter(s => s.academic_year === (academicYear || '2025/2026') && s.semester === (semester || 'Ganjil'));
                  } else {
                      data = fallbackRes.data || [];
                  }`;
        if (content.includes(target)) {
            content = content.replace(target, replacement);
            changed = true;
        }
    }

    // Fix MySchedule.tsx which doesn't have fallback
    if (file === 'MySchedule.tsx') {
        const target = `        let { data, error } = await supabase.from('schedules').select('*')
        .eq('teacher_id', profile.id)
        .eq('academic_year', academicYear || '2025/2026')
        .eq('semester', semester || 'Ganjil')
        .eq('schedule_version', activeScheduleVersion || 'Utama')
        .order('day_of_week')
        .order('hour');`;
        const replacement = `        let { data, error } = await supabase.from('schedules').select('*')
        .eq('teacher_id', profile.id)
        .eq('academic_year', academicYear || '2025/2026')
        .eq('semester', semester || 'Ganjil')
        .eq('schedule_version', activeScheduleVersion || 'Utama')
        .order('day_of_week')
        .order('hour');
        
        if (error && (error.code === '42703' || error.message?.includes('schedule_version'))) {
            const fallback = await supabase.from('schedules').select('*').eq('teacher_id', profile.id).order('day_of_week').order('hour');
            if (fallback.data && fallback.data.length > 0 && fallback.data[0].academic_year !== undefined) {
                data = fallback.data.filter(s => s.academic_year === (academicYear || '2025/2026') && s.semester === (semester || 'Ganjil'));
            } else {
                data = fallback.data;
            }
            error = fallback.error;
        }`;
        if (content.includes(target)) {
            content = content.replace(target, replacement);
            changed = true;
        }
    }

    if (changed) {
        fs.writeFileSync(filePath, content);
        console.log('Fixed ' + file);
    }
}
