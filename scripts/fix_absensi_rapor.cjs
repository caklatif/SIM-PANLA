const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../pages/AbsensiRapor.tsx');
let content = fs.readFileSync(file, 'utf8');

// Fix 1: The duplicate eq for academic year
const oldQuery = `let { data, error: errSt } = await supabase.from('students').select('kelas').eq('academic_year', settings.academic_year || '2025/2026').eq('academic_year', academicYear || '2025/2026');`;
const newQuery = `let { data, error: errSt } = await supabase.from('students').select('kelas').eq('academic_year', academicYear || '2025/2026');`;
content = content.replace(oldQuery, newQuery);

// Fix 2: The fallback eq for academic year
const oldFallback = `const res = await supabase.from('students').select('kelas').eq('academic_year', academicYear || '2025/2026');
            if (settings.academic_year === '2025/2026' || !settings.academic_year) data = res.data;
            else data = [];`;
const newFallback = `const res = await supabase.from('students').select('kelas').eq('academic_year', academicYear || '2025/2026');
            data = res.data;`;
content = content.replace(oldFallback, newFallback);

fs.writeFileSync(file, content);
console.log('Fixed AbsensiRapor student class fetch');
