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

// 3. RekapDhuha.tsx
processFile('RekapDhuha.tsx', [
    {
        search: /const \{ data: studentsData \} = await supabase\.from\('students'\)\.select\('kelas'\);/g,
        replace: `let { data: studentsData, error: errSt } = await supabase.from('students').select('kelas').eq('academic_year', settings.academic_year || '2024/2025');
      if (errSt && (errSt.code === '42703' || errSt.message?.includes('academic_year'))) {
          const res = await supabase.from('students').select('kelas');
          studentsData = res.data;
      }`
    },
    {
        search: /const \{ data: students \} = await supabase\.from\('students'\)\.select\('\*'\)\.eq\('kelas', selectedClass\)\.order\('name'\);/g,
        replace: `let { data: students, error: errSt2 } = await supabase.from('students').select('*').eq('kelas', selectedClass).eq('academic_year', settings.academic_year || '2024/2025').order('name');
        if (errSt2 && (errSt2.code === '42703' || errSt2.message?.includes('academic_year'))) {
            const res = await supabase.from('students').select('*').eq('kelas', selectedClass).order('name');
            students = res.data;
        }`
    }
]);

// 4. AbsensiRapor.tsx
processFile('AbsensiRapor.tsx', [
    {
        search: /const \{ data \} = await supabase\.from\('students'\)\.select\('kelas'\);/g,
        replace: `let { data, error: errSt } = await supabase.from('students').select('kelas').eq('academic_year', settings.academic_year || '2024/2025');
        if (errSt && (errSt.code === '42703' || errSt.message?.includes('academic_year'))) {
            const res = await supabase.from('students').select('kelas');
            data = res.data;
        }`
    },
    {
        search: /const \{ data: students \} = await supabase\.from\('students'\)\.select\('\*'\)\.eq\('kelas', selectedClass\)\.order\('name'\);/g,
        replace: `let { data: students, error: errSt2 } = await supabase.from('students').select('*').eq('kelas', selectedClass).eq('academic_year', settings.academic_year || '2024/2025').order('name');
          if (errSt2 && (errSt2.code === '42703' || errSt2.message?.includes('academic_year'))) {
              const res = await supabase.from('students').select('*').eq('kelas', selectedClass).order('name');
              students = res.data;
          }`
    }
]);

// 5. JurnalForm.tsx
processFile('JurnalForm.tsx', [
    {
        search: /const \{ data: studentData \} = await supabase\.from\('students'\)\.select\('kelas'\);/g,
        replace: `let { data: studentData, error: errSt } = await supabase.from('students').select('kelas').eq('academic_year', academicYear || '2024/2025');
        if (errSt && (errSt.code === '42703' || errSt.message?.includes('academic_year'))) {
            const res = await supabase.from('students').select('kelas');
            studentData = res.data;
        }`
    },
    {
        search: /const \{ data: studentsData \} = await supabase\.from\('students'\)\.select\('id, name'\)\.eq\('kelas', formData\.kelas\)\.order\('name'\);/g,
        replace: `let { data: studentsData, error: errSt2 } = await supabase.from('students').select('id, name').eq('kelas', formData.kelas).eq('academic_year', academicYear || '2024/2025').order('name');
        if (errSt2 && (errSt2.code === '42703' || errSt2.message?.includes('academic_year'))) {
            const res = await supabase.from('students').select('id, name').eq('kelas', formData.kelas).order('name');
            studentsData = res.data;
        }`
    }
]);


