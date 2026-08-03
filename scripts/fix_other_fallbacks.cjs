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
        console.log(filename, 'fixed');
    }
}

// 3. RekapDhuha.tsx
processFile('RekapDhuha.tsx', [
    {
        search: /const res = await supabase\.from\('students'\)\.select\('kelas'\);\s*studentsData = res\.data;/g,
        replace: `const res = await supabase.from('students').select('kelas');
          if (settings.academic_year === '2025/2026' || !settings.academic_year) studentsData = res.data;
          else studentsData = [];`
    },
    {
        search: /const res = await supabase\.from\('students'\)\.select\('\*'\)\.eq\('kelas', selectedClass\)\.order\('name'\);\s*students = res\.data;/g,
        replace: `const res = await supabase.from('students').select('*').eq('kelas', selectedClass).order('name');
            if (settings.academic_year === '2025/2026' || !settings.academic_year) students = res.data;
            else students = [];`
    }
]);

// 4. AbsensiRapor.tsx
processFile('AbsensiRapor.tsx', [
    {
        search: /const res = await supabase\.from\('students'\)\.select\('kelas'\);\s*data = res\.data;/g,
        replace: `const res = await supabase.from('students').select('kelas');
            if (settings.academic_year === '2025/2026' || !settings.academic_year) data = res.data;
            else data = [];`
    },
    {
        search: /const res = await supabase\.from\('students'\)\.select\('\*'\)\.eq\('kelas', selectedClass\)\.order\('name'\);\s*students = res\.data;/g,
        replace: `const res = await supabase.from('students').select('*').eq('kelas', selectedClass).order('name');
              if (settings.academic_year === '2025/2026' || !settings.academic_year) students = res.data;
              else students = [];`
    }
]);

// 5. JurnalForm.tsx
processFile('JurnalForm.tsx', [
    {
        search: /const res = await supabase\.from\('students'\)\.select\('kelas'\);\s*studentData = res\.data;/g,
        replace: `const res = await supabase.from('students').select('kelas');
            if (academicYear === '2025/2026') studentData = res.data;
            else studentData = [];`
    },
    {
        search: /const res = await supabase\.from\('students'\)\.select\('id, name'\)\.eq\('kelas', formData\.kelas\)\.order\('name'\);\s*studentsData = res\.data;/g,
        replace: `const res = await supabase.from('students').select('id, name').eq('kelas', formData.kelas).order('name');
            if (academicYear === '2025/2026') studentsData = res.data;
            else studentsData = [];`
    }
]);

// 6. InputManual.tsx
processFile('InputManual.tsx', [
    {
        search: /const res = await supabase\.from\('students'\)\.select\('id, name, kelas'\);\s*allStudents = res\.data;/g,
        replace: `const res = await supabase.from('students').select('id, name, kelas');
              if (academicYear === '2025/2026') allStudents = res.data;
              else allStudents = [];`
    }
]);

