const fs = require('fs');
const path = require('path');

function processFile(filename, replacements) {
    const file = path.join(__dirname, '../pages/', filename);
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf8');
    let original = content;
    
    replacements.forEach(r => {
        content = content.replace(r.search, r.replace);
    });

    if (content !== original) {
        fs.writeFileSync(file, content);
        console.log(filename, 'updated');
    }
}

// 1. Dashboard.tsx
processFile('Dashboard.tsx', [
    {
        search: /const \{ data: students \} = await supabase\.from\('students'\)\.select\('\*'\)\.eq\('kelas', profile\.wali_kelas\)\.order\('name'\);/g,
        replace: `let { data: students, error: errSt } = await supabase.from('students').select('*').eq('kelas', profile.wali_kelas).eq('academic_year', academicYear || '2024/2025').order('name');
            if (errSt && (errSt.code === '42703' || errSt.message?.includes('academic_year'))) {
                const res = await supabase.from('students').select('*').eq('kelas', profile.wali_kelas).order('name');
                students = res.data;
            }`
    },
    {
        search: /const \{ data: students \} = await supabase\.from\('students'\)\.select\('\*'\)\.eq\('kelas', profile\?\.wali_kelas\)\.order\('name'\);/g,
        replace: `let { data: students, error: errSt } = await supabase.from('students').select('*').eq('kelas', profile?.wali_kelas).eq('academic_year', academicYear || '2024/2025').order('name');
              if (errSt && (errSt.code === '42703' || errSt.message?.includes('academic_year'))) {
                  const res = await supabase.from('students').select('*').eq('kelas', profile?.wali_kelas).order('name');
                  students = res.data;
              }`
    }
]);

// 2. Kedisiplinan.tsx
processFile('Kedisiplinan.tsx', [
    {
        search: /const \{ data \} = await supabase\.from\('students'\)\.select\('\*'\)\.eq\('kelas', inputClass\)\.order\('name'\);/g,
        replace: `let { data, error: errSt } = await supabase.from('students').select('*').eq('kelas', inputClass).eq('academic_year', academicYear || '2024/2025').order('name');
              if (errSt && (errSt.code === '42703' || errSt.message?.includes('academic_year'))) {
                  const res = await supabase.from('students').select('*').eq('kelas', inputClass).order('name');
                  data = res.data;
              }`
    },
    {
        search: /supabase\.from\('students'\)\.select\('kelas'\)/g,
        replace: `supabase.from('students').select('kelas').eq('academic_year', academicYear || '2024/2025')`
    },
    {
        search: /const \{ data \} = await supabase\.from\('students'\)\.select\('\*'\)\.eq\('kelas', selectedClass\)\.order\('name'\);/g,
        replace: `let { data, error: errSt } = await supabase.from('students').select('*').eq('kelas', selectedClass).eq('academic_year', academicYear || '2024/2025').order('name');
              if (errSt && (errSt.code === '42703' || errSt.message?.includes('academic_year'))) {
                  const res = await supabase.from('students').select('*').eq('kelas', selectedClass).order('name');
                  data = res.data;
              }`
    },
    {
        search: /const \{ data \} = await supabase\.from\('students'\)\.select\('\*'\)\.eq\('kelas', className\)\.order\('name'\);/g,
        replace: `let { data, error: errSt } = await supabase.from('students').select('*').eq('kelas', className).eq('academic_year', academicYear || '2024/2025').order('name');
      if (errSt && (errSt.code === '42703' || errSt.message?.includes('academic_year'))) {
          const res = await supabase.from('students').select('*').eq('kelas', className).order('name');
          data = res.data;
      }`
    },
    {
        search: /const \{ data \} = await supabase\.from\('students'\)\.select\('\*'\)\.in\('id', targetStudentIds\)\.order\('kelas'\)\.order\('name'\);/g,
        replace: `let { data, error: errSt } = await supabase.from('students').select('*').in('id', targetStudentIds).order('kelas').order('name');` // id is unique enough, no need academic_year
    }
]);

