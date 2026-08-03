const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../pages/Dashboard.tsx');
let content = fs.readFileSync(file, 'utf8');

// Dashboard line 104
content = content.replace(
  `if (res.error && (res.error.code === '42703' || res.error.message?.includes('academic_year'))) {
                      const fallback = await supabase.from('schedules').select('*').eq('day_of_week', dbDay);
                      if (fallback.data && fallback.data.length > 0 && fallback.data[0].academic_year !== undefined) {
                          fallback.data = fallback.data.filter(s => s.academic_year === (academicYear || '2025/2026') && s.semester === (semester || 'Ganjil'));
                      }
                      return fallback;
                  }`,
  `if (res.error && (res.error.code === '42703' || res.error.message?.includes('academic_year') || res.error.message?.includes('schedule_version'))) {
                      const fallback = await supabase.from('schedules').select('*').eq('day_of_week', dbDay).eq('academic_year', academicYear || '2025/2026').eq('semester', semester || 'Ganjil');
                      if (fallback.error) {
                          const ultra = await supabase.from('schedules').select('*').eq('day_of_week', dbDay);
                          if (ultra.data) ultra.data = ultra.data.filter(s => s.academic_year === academicYear && s.semester === semester);
                          return ultra;
                      }
                      return fallback;
                  }`
);

// Dashboard line 188
const d_t2 = `let { data: mySchedules, error: mySchedError } = await supabase.from('schedules').select('day_of_week, hour').eq('teacher_id', profile?.id).eq('academic_year', academicYear || '2025/2026').eq('semester', semester || 'Ganjil').eq('schedule_version', activeScheduleVersion || 'Utama');
        if (mySchedError && (mySchedError.code === '42703' || mySchedError.message?.includes('academic_year'))) {
            const fallback = await supabase.from('schedules').select('day_of_week, hour, academic_year, semester').eq('teacher_id', profile?.id);
            if (academicYear === '2025/2026') {
               if (fallback.data && fallback.data.length > 0 && fallback.data[0].academic_year !== undefined) {
                   mySchedules = fallback.data.filter(s => s.academic_year === (academicYear || '2025/2026') && s.semester === (semester || 'Ganjil'));
               } else {
                   mySchedules = fallback.data;
               }
            } else mySchedules = [];
        }`;

const d_r2 = `let { data: mySchedules, error: mySchedError } = await supabase.from('schedules').select('day_of_week, hour, academic_year, semester').eq('teacher_id', profile?.id).eq('academic_year', academicYear || '2025/2026').eq('semester', semester || 'Ganjil').eq('schedule_version', activeScheduleVersion || 'Utama');
        if (mySchedError && (mySchedError.code === '42703' || mySchedError.message?.includes('academic_year') || mySchedError.message?.includes('schedule_version'))) {
            const fb = await supabase.from('schedules').select('day_of_week, hour, academic_year, semester').eq('teacher_id', profile?.id).eq('academic_year', academicYear || '2025/2026').eq('semester', semester || 'Ganjil');
            if (fb.error) {
                const uf = await supabase.from('schedules').select('day_of_week, hour, academic_year, semester').eq('teacher_id', profile?.id);
                mySchedules = (uf.data || []).filter(s => s.academic_year === academicYear && s.semester === semester);
            } else {
                mySchedules = fb.data;
            }
        }`;
        
content = content.replace(d_t2, d_r2);

// Dashboard line 223
const d_t3 = `if (res.error && (res.error.code === '42703' || res.error.message?.includes('academic_year'))) {
                        const fallback = await supabase.from('schedules').select('*').eq('teacher_id', profile?.id).eq('day_of_week', dbDay);
                        if (fallback.data && fallback.data.length > 0 && fallback.data[0].academic_year !== undefined) {
                            fallback.data = fallback.data.filter(s => s.academic_year === (academicYear || '2025/2026') && s.semester === (semester || 'Ganjil'));
                        }
                        return fallback;
                    }`;
const d_r3 = `if (res.error && (res.error.code === '42703' || res.error.message?.includes('academic_year') || res.error.message?.includes('schedule_version'))) {
                        const fallback = await supabase.from('schedules').select('*').eq('teacher_id', profile?.id).eq('day_of_week', dbDay).eq('academic_year', academicYear || '2025/2026').eq('semester', semester || 'Ganjil');
                        if (fallback.error) {
                            const uf = await supabase.from('schedules').select('*').eq('teacher_id', profile?.id).eq('day_of_week', dbDay);
                            if (uf.data) uf.data = uf.data.filter(s => s.academic_year === academicYear && s.semester === semester);
                            return uf;
                        }
                        return fallback;
                    }`;
content = content.replace(d_t3, d_r3);

fs.writeFileSync(file, content);
console.log('Fixed Dashboard fallbacks');
