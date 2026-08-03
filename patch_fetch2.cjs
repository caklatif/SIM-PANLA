const fs = require('fs');
const path = 'pages/PublicDashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

const t1 = `supabase.from('journals').select('hours').eq('academic_year', academicYear || '2025/2026')`;
const r1 = `supabase.from('journals').select('hours')`;

const t2 = `supabase.from('attendance_logs').select('student_id, student_name, status, created_at, subject').eq('academic_year', academicYear || '2025/2026')`;
const r2 = `supabase.from('attendance_logs').select('student_id, student_name, status, created_at, subject')`;

const t3 = `supabase.from('homeroom_attendance').select('student_id, status, kelas').eq('academic_year', academicYear || '2025/2026')`;
const r3 = `supabase.from('homeroom_attendance').select('student_id, status, kelas')`;

const t4 = `supabase.from('students').select('id, kelas, gender').eq('academic_year', academicYear || '2025/2026').then(async (res) => {
                  if (res.error && (res.error.code === '42703' || res.error.message?.includes('academic_year'))) {
                      return supabase.from('students').select('id, kelas, gender');
                  }
                  return res;
            })`;
const r4 = `supabase.from('students').select('id, kelas, gender')`;


content = content.replace(t1, r1);
content = content.replace(t2, r2);
content = content.replace(t3, r3);
content = content.replace(t4, r4);

fs.writeFileSync(path, content, 'utf8');
console.log('Patched all fetches to ignore academic_year');
