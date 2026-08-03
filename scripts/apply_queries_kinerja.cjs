const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../pages/KinerjaGuru.tsx');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    /let schedQuery = supabase\.from\('schedules'\)\.select\('teacher_id'\);/g,
    "let schedQuery = supabase.from('schedules').select('teacher_id').eq('academic_year', academicYear || '2024/2025').eq('semester', semester || 'Ganjil');"
);
content = content.replace(
    /let journalQuery = supabase\.from\('journals'\)\.select\('teacher_id, created_at, is_locked'\);/g,
    "let journalQuery = supabase.from('journals').select('teacher_id, created_at, is_locked').eq('academic_year', academicYear || '2024/2025').eq('semester', semester || 'Ganjil');"
);

// For missing lists
content = content.replace(
    /\.from\('schedules'\)\.select\('\*'\)\.eq\('teacher_id', teacherId\)/g,
    ".from('schedules').select('*').eq('academic_year', academicYear || '2024/2025').eq('semester', semester || 'Ganjil').eq('teacher_id', teacherId)"
);
content = content.replace(
    /\.from\('journals'\)\.select\('\*'\)\.eq\('teacher_id', teacherId\)/g,
    ".from('journals').select('*').eq('academic_year', academicYear || '2024/2025').eq('semester', semester || 'Ganjil').eq('teacher_id', teacherId)"
);

fs.writeFileSync(file, content);
console.log('KinerjaGuru applied');
