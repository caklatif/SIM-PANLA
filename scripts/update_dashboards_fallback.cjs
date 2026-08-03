const fs = require('fs');
const path = require('path');

function processDashboard(filename) {
    const file = path.join(__dirname, '../pages/', filename);
    let content = fs.readFileSync(file, 'utf8');

    content = content.replace(
        /let \{ data: todaySchedules, error: schedError \} = await supabase\.from\('schedules'\)\.select\('id, kelas, hour, mapel:subject, teacherName:profiles\(full_name\)'\)\.eq\('academic_year', academicYear \|\| '2024\/2025'\)\.eq\('semester', semester \|\| 'Ganjil'\)\.eq\('day_of_week', today\);/g,
        `let { data: todaySchedules, error: schedError } = await supabase.from('schedules').select('id, kelas, hour, mapel:subject, teacherName:profiles(full_name)').eq('academic_year', academicYear || '2024/2025').eq('semester', semester || 'Ganjil').eq('day_of_week', today);
          if (schedError && schedError.code === 'PGRST204') {
              const res = await supabase.from('schedules').select('id, kelas, hour, mapel:subject, teacherName:profiles(full_name)').eq('day_of_week', today);
              todaySchedules = res.data;
              schedError = res.error;
          }`
    );

    content = content.replace(
        /let \{ data: journalsData, error: journalError \} = await supabase\.from\('journals'\)\.select\('id, kelas, subject, created_at, teacher_id'\)\.eq\('academic_year', academicYear \|\| '2024\/2025'\)\.eq\('semester', semester \|\| 'Ganjil'\)\.gte\('created_at', `\$\{filterDate\}T00:00:00\+07:00`\)\.lte\('created_at', `\$\{filterDate\}T23:59:59\+07:00`\);/g,
        `let { data: journalsData, error: journalError } = await supabase.from('journals').select('id, kelas, subject, created_at, teacher_id').eq('academic_year', academicYear || '2024/2025').eq('semester', semester || 'Ganjil').gte('created_at', \`\${filterDate}T00:00:00+07:00\`).lte('created_at', \`\${filterDate}T23:59:59+07:00\`);
          if (journalError && journalError.code === 'PGRST204') {
              const res = await supabase.from('journals').select('id, kelas, subject, created_at, teacher_id').gte('created_at', \`\${filterDate}T00:00:00+07:00\`).lte('created_at', \`\${filterDate}T23:59:59+07:00\`);
              journalsData = res.data;
              journalError = res.error;
          }`
    );

    // For public dashboard which uses todayDate
    content = content.replace(
        /let \{ data: journalsData, error: journalError \} = await supabase\.from\('journals'\)\.select\('id, kelas, subject, created_at, teacher_id'\)\.eq\('academic_year', academicYear \|\| '2024\/2025'\)\.eq\('semester', semester \|\| 'Ganjil'\)\.gte\('created_at', `\$\{todayDate\}T00:00:00\+07:00`\)\.lte\('created_at', `\$\{todayDate\}T23:59:59\+07:00`\);/g,
        `let { data: journalsData, error: journalError } = await supabase.from('journals').select('id, kelas, subject, created_at, teacher_id').eq('academic_year', academicYear || '2024/2025').eq('semester', semester || 'Ganjil').gte('created_at', \`\${todayDate}T00:00:00+07:00\`).lte('created_at', \`\${todayDate}T23:59:59+07:00\`);
          if (journalError && journalError.code === 'PGRST204') {
              const res = await supabase.from('journals').select('id, kelas, subject, created_at, teacher_id').gte('created_at', \`\${todayDate}T00:00:00+07:00\`).lte('created_at', \`\${todayDate}T23:59:59+07:00\`);
              journalsData = res.data;
              journalError = res.error;
          }`
    );

    fs.writeFileSync(file, content);
    console.log(filename, 'fallback applied');
}

processDashboard('OperatorDashboard.tsx');
processDashboard('PublicDashboard.tsx');
