const fs = require('fs');
const path = require('path');

function replaceDashboard(filename) {
    const file = path.join(__dirname, '../pages/', filename);
    let content = fs.readFileSync(file, 'utf8');

    content = content.replace(
        /supabase\.from\('schedules'\)\.select\('id, kelas, hour, mapel:subject, teacherName:profiles\(full_name\)'\)\.eq\('day_of_week', today\)/g,
        "supabase.from('schedules').select('id, kelas, hour, mapel:subject, teacherName:profiles(full_name)').eq('academic_year', academicYear || '2024/2025').eq('semester', semester || 'Ganjil').eq('day_of_week', today)"
    );

    content = content.replace(
        /supabase\.from\('journals'\)\.select\('id, kelas, subject, created_at, teacher_id'\)\.gte\('created_at', `\$\{filterDate\}T00:00:00\+07:00`\)\.lte\('created_at', `\$\{filterDate\}T23:59:59\+07:00`\)/g,
        "supabase.from('journals').select('id, kelas, subject, created_at, teacher_id').eq('academic_year', academicYear || '2024/2025').eq('semester', semester || 'Ganjil').gte('created_at', `${filterDate}T00:00:00+07:00`).lte('created_at', `${filterDate}T23:59:59+07:00`)"
    );
    
    // For PublicDashboard.tsx
    content = content.replace(
        /supabase\.from\('journals'\)\.select\('id, kelas, subject, created_at, teacher_id'\)\.gte\('created_at', `\$\{todayDate\}T00:00:00\+07:00`\)\.lte\('created_at', `\$\{todayDate\}T23:59:59\+07:00`\)/g,
        "supabase.from('journals').select('id, kelas, subject, created_at, teacher_id').eq('academic_year', academicYear || '2024/2025').eq('semester', semester || 'Ganjil').gte('created_at', `${todayDate}T00:00:00+07:00`).lte('created_at', `${todayDate}T23:59:59+07:00`)"
    );

    fs.writeFileSync(file, content);
    console.log(filename, 'applied');
}

replaceDashboard('OperatorDashboard.tsx');
replaceDashboard('PublicDashboard.tsx');
