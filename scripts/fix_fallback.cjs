const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../components/Layout.tsx');
let content = fs.readFileSync(file, 'utf8');

const targetStr = `if (schedErr && (schedErr.code === '42703' || schedErr.message?.includes('academic_year'))) {
                        const fallback = await supabase.from('schedules').select('*').eq('teacher_id', profile.id).eq('day_of_week', dbDay);
                        if (academicYear === '2025/2026') scheds = fallback.data;
                        else scheds = [];
                    }`;

const replacementStr = `if (schedErr && (schedErr.code === '42703' || schedErr.message?.includes('academic_year') || schedErr.message?.includes('schedule_version'))) {
                        const fallback = await supabase.from('schedules').select('*').eq('teacher_id', profile.id).eq('day_of_week', dbDay).eq('academic_year', academicYear || '2025/2026').eq('semester', semester || 'Genap');
                        if (fallback.error) {
                             // If even academic_year doesn't exist
                             const ultraFallback = await supabase.from('schedules').select('*').eq('teacher_id', profile.id).eq('day_of_week', dbDay);
                             scheds = (ultraFallback.data || []).filter(s => s.academic_year === academicYear && s.semester === semester);
                        } else {
                             scheds = fallback.data;
                        }
                    }`;

content = content.replace(targetStr, replacementStr);
fs.writeFileSync(file, content);

const opFile = path.join(__dirname, '../pages/OperatorDashboard.tsx');
let opContent = fs.readFileSync(opFile, 'utf8');

const opTarget = `if (res.error && (res.error.code === '42703' || res.error.message?.includes('academic_year'))) {
                      const fallback = await supabase.from('schedules').select('*').eq('day_of_week', dbDay);
                      if (fallback.data && fallback.data.length > 0 && fallback.data[0].academic_year !== undefined) {
                          fallback.data = fallback.data.filter(s => s.academic_year === (academicYear || '2025/2026') && s.semester === (semester || 'Ganjil'));
                      }
                      return fallback;
                  }`;
                  
const opReplacement = `if (res.error && (res.error.code === '42703' || res.error.message?.includes('academic_year') || res.error.message?.includes('schedule_version'))) {
                      const fallback = await supabase.from('schedules').select('*').eq('day_of_week', dbDay).eq('academic_year', academicYear || '2025/2026').eq('semester', semester || 'Genap');
                      if (fallback.error) {
                          const ultraFallback = await supabase.from('schedules').select('*').eq('day_of_week', dbDay);
                          if (ultraFallback.data) {
                              ultraFallback.data = ultraFallback.data.filter(s => s.academic_year === academicYear && s.semester === semester);
                          }
                          return ultraFallback;
                      }
                      return fallback;
                  }`;

opContent = opContent.replace(opTarget, opReplacement);
fs.writeFileSync(opFile, opContent);

console.log('Fixed fallbacks');
