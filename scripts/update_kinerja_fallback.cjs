const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../pages/KinerjaGuru.tsx');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    /let schedQuery = supabase\.from\('schedules'\)\.select\('teacher_id'\)\.eq\('academic_year', academicYear \|\| '2024\/2025'\)\.eq\('semester', semester \|\| 'Ganjil'\);/g,
    `let schedQuery = supabase.from('schedules').select('teacher_id').eq('academic_year', academicYear || '2024/2025').eq('semester', semester || 'Ganjil');` // leave this, we'll replace the fetch
);

content = content.replace(
    /let \{ data: schedulesData, error: schedError \} = await schedQuery;/g,
    `let { data: schedulesData, error: schedError } = await schedQuery;
      if (schedError && schedError.code === 'PGRST204') {
          const res = await supabase.from('schedules').select('teacher_id');
          schedulesData = res.data;
          schedError = res.error;
      }`
);

content = content.replace(
    /let journalQuery = supabase\.from\('journals'\)\.select\('teacher_id, created_at, is_locked'\)\.eq\('academic_year', academicYear \|\| '2024\/2025'\)\.eq\('semester', semester \|\| 'Ganjil'\);/g,
    `let journalQuery = supabase.from('journals').select('teacher_id, created_at, is_locked').eq('academic_year', academicYear || '2024/2025').eq('semester', semester || 'Ganjil');`
);

content = content.replace(
    /let \{ data: journalsData, error: journalError \} = await journalQuery;/g,
    `let { data: journalsData, error: journalError } = await journalQuery;
      if (journalError && journalError.code === 'PGRST204') {
          const res = await supabase.from('journals').select('teacher_id, created_at, is_locked');
          journalsData = res.data;
          journalError = res.error;
      }`
);


// Detail Queries
content = content.replace(
    /const \{ data: schedData, error: schedError \} = await supabase\.from\('schedules'\)\.select\('\*'\)\.eq\('academic_year', academicYear \|\| '2024\/2025'\)\.eq\('semester', semester \|\| 'Ganjil'\)\.eq\('teacher_id', teacherId\);/g,
    `let { data: schedData, error: schedError } = await supabase.from('schedules').select('*').eq('academic_year', academicYear || '2024/2025').eq('semester', semester || 'Ganjil').eq('teacher_id', teacherId);
        if (schedError && schedError.code === 'PGRST204') {
            const res = await supabase.from('schedules').select('*').eq('teacher_id', teacherId);
            schedData = res.data;
            schedError = res.error;
        }`
);

content = content.replace(
    /const \{ data: journData, error: journError \} = await supabase\.from\('journals'\)\.select\('\*'\)\.eq\('academic_year', academicYear \|\| '2024\/2025'\)\.eq\('semester', semester \|\| 'Ganjil'\)\.eq\('teacher_id', teacherId\)\.gte\('created_at', `\$\{monday\}T00:00:00\+07:00`\)\.lte\('created_at', `\$\{saturday\}T23:59:59\+07:00`\)\.order\('created_at'\);/g,
    `let { data: journData, error: journError } = await supabase.from('journals').select('*').eq('academic_year', academicYear || '2024/2025').eq('semester', semester || 'Ganjil').eq('teacher_id', teacherId).gte('created_at', \`\${monday}T00:00:00+07:00\`).lte('created_at', \`\${saturday}T23:59:59+07:00\`).order('created_at');
        if (journError && journError.code === 'PGRST204') {
            const res = await supabase.from('journals').select('*').eq('teacher_id', teacherId).gte('created_at', \`\${monday}T00:00:00+07:00\`).lte('created_at', \`\${saturday}T23:59:59+07:00\`).order('created_at');
            journData = res.data;
            journError = res.error;
        }`
);

fs.writeFileSync(file, content);
console.log('KinerjaGuru fallback applied');
