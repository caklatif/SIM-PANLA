const fs = require('fs');
const path = 'pages/PublicDashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

const target = `        const [studentsRes, journalsRes, attendanceRes, homeroomRes] = await Promise.all([
            supabase.from('students').select('id, kelas, gender'),
            supabase.from('journals').select('hours').gte('created_at', startOfDay),
            supabase.from('attendance_logs').select('student_id, student_name, status, created_at, subject').gte('created_at', startOfDay),
            supabase.from('homeroom_attendance').select('student_id, status, kelas').eq('date', todayStr)
        ]);`;

const repl = `        let studentsRes = await supabase.from('students').select('id, kelas, gender');
        if (studentsRes.error) {
            console.error('Error fetching students with gender:', studentsRes.error);
            studentsRes = await supabase.from('students').select('id, kelas');
        }
        
        const [journalsRes, attendanceRes, homeroomRes] = await Promise.all([
            supabase.from('journals').select('hours').gte('created_at', startOfDay),
            supabase.from('attendance_logs').select('student_id, student_name, status, created_at, subject').gte('created_at', startOfDay),
            supabase.from('homeroom_attendance').select('student_id, status, kelas').eq('date', todayStr)
        ]);`;

if (content.includes(target)) {
    content = content.replace(target, repl);
    fs.writeFileSync(path, content, 'utf8');
    console.log('Patched fetch to fallback if gender column missing');
} else {
    console.log('Target not found');
}
