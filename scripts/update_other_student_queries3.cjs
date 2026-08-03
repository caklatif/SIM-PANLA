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

// 6. InputManual.tsx
processFile('InputManual.tsx', [
    {
        search: /const \{ data: allStudents \} = await supabase\.from\('students'\)\.select\('id, name, kelas'\);/g,
        replace: `let { data: allStudents, error: errSt } = await supabase.from('students').select('id, name, kelas').eq('academic_year', academicYear || '2024/2025');
          if (errSt && (errSt.code === '42703' || errSt.message?.includes('academic_year'))) {
              const res = await supabase.from('students').select('id, name, kelas');
              allStudents = res.data;
          }`
    }
]);

// 7. OperatorDashboard.tsx
processFile('OperatorDashboard.tsx', [
    {
        search: /supabase\.from\('students'\)\.select\('id, kelas, name'\),/g,
        replace: `supabase.from('students').select('id, kelas, name').eq('academic_year', academicYear || '2024/2025').then(async (res) => {
                  if (res.error && (res.error.code === '42703' || res.error.message?.includes('academic_year'))) {
                      return supabase.from('students').select('id, kelas, name');
                  }
                  return res;
              }),`
    }
]);

// 8. PublicDashboard.tsx
processFile('PublicDashboard.tsx', [
    {
        search: /supabase\.from\('students'\)\.select\('id, kelas'\),/g,
        replace: `supabase.from('students').select('id, kelas').eq('academic_year', academicYear || '2024/2025').then(async (res) => {
                  if (res.error && (res.error.code === '42703' || res.error.message?.includes('academic_year'))) {
                      return supabase.from('students').select('id, kelas');
                  }
                  return res;
              }),`
    }
]);

