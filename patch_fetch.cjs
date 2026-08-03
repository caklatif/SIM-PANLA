const fs = require('fs');
const path = 'pages/PublicDashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

const target = `            supabase.from('students').select('id, kelas, gender').eq('academic_year', academicYear || '2025/2026').then(async (res) => {
                  if (res.error && (res.error.code === '42703' || res.error.message?.includes('academic_year'))) {
                      return supabase.from('students').select('id, kelas, gender').eq('academic_year', academicYear || '2025/2026');
                  }
                  return res;
            }),`;
            
const repl = `            supabase.from('students').select('id, kelas, gender').eq('academic_year', academicYear || '2025/2026').then(async (res) => {
                  if (res.error && (res.error.code === '42703' || res.error.message?.includes('academic_year'))) {
                      return supabase.from('students').select('id, kelas, gender');
                  }
                  return res;
            }),`;
            
if (content.includes(target)) {
    content = content.replace(target, repl);
    fs.writeFileSync(path, content, 'utf8');
    console.log('Patched students fetch');
} else {
    console.log('Target not found');
}
