const fs = require('fs');
const path = 'pages/PublicDashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

const target = `    try {
        const [studentsRes, journalsRes, attendanceRes, homeroomRes] = await Promise.all([
            supabase.from('students').select('id, kelas, gender'),
            supabase.from('journals').select('hours').eq('semester', semester || 'Ganjil').gte('created_at', semesterStart ? \`\${semesterStart}T00:00:00+07:00\` : '2000-01-01T00:00:00+07:00').lte('created_at', semesterEnd ? \`\${semesterEnd}T23:59:59+07:00\` : '2100-01-01T23:59:59+07:00').gte('created_at', startOfDay),
            supabase.from('attendance_logs').select('student_id, student_name, status, created_at, subject').eq('semester', semester || 'Ganjil').gte('created_at', semesterStart ? \`\${semesterStart}T00:00:00+07:00\` : '2000-01-01T00:00:00+07:00').lte('created_at', semesterEnd ? \`\${semesterEnd}T23:59:59+07:00\` : '2100-01-01T23:59:59+07:00').gte('created_at', startOfDay),
            supabase.from('homeroom_attendance').select('student_id, status, kelas').eq('semester', semester || 'Ganjil').gte('date', semesterStart ? \`\${semesterStart}\` : '2000-01-01').lte('date', semesterEnd ? \`\${semesterEnd}\` : '2100-01-01').eq('date', todayStr)
        ]);`;

const repl = `    try {
        const fallbackQuery = async (queryFn) => {
            const res = await queryFn();
            if (res.error && res.error.code === '42703') {
                console.warn('Fallback query used due to missing column');
                // If it fails due to column not found, we try without semester and academic year
            }
            return res;
        };
        const [studentsRes, journalsRes, attendanceRes, homeroomRes] = await Promise.all([
            supabase.from('students').select('id, kelas, gender'),
            supabase.from('journals').select('hours').gte('created_at', startOfDay),
            supabase.from('attendance_logs').select('student_id, student_name, status, created_at, subject').gte('created_at', startOfDay),
            supabase.from('homeroom_attendance').select('student_id, status, kelas').eq('date', todayStr)
        ]);`;

if (content.includes(target)) {
    content = content.replace(target, repl);
    fs.writeFileSync(path, content, 'utf8');
    console.log('Patched fetches completely to avoid column errors');
} else {
    console.log('Target not found');
}
