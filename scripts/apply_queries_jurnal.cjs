const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../pages/JurnalForm.tsx');
let content = fs.readFileSync(file, 'utf8');

// Insert Journal
content = content.replace(
    /created_by:\s*profile\.id\n\s*\}\)/g,
    "created_by: profile.id,\n                academic_year: academicYear || '2024/2025',\n                semester: semester || 'Ganjil'\n            })"
);

// Insert Attendance
content = content.replace(
    /created_by:\s*profile\.id\n\s*\}\)/g,
    "created_by: profile.id,\n                academic_year: academicYear || '2024/2025',\n                semester: semester || 'Ganjil'\n            })"
);

// Select schedules
content = content.replace(
    /\.select\('\*'\)\.eq\('teacher_id', profile\.id\)\.eq\('day_of_week', dayOfWeek\)/g,
    ".select('*').eq('academic_year', academicYear || '2024/2025').eq('semester', semester || 'Ganjil').eq('teacher_id', profile.id).eq('day_of_week', dayOfWeek)"
);

// Select journals for checking previous
content = content.replace(
    /let query = supabase\.from\('attendance_logs'\)\.select\('student_id, status, journal_id, journals!inner\(teacher_id, subject\)'\)/g,
    "let query = supabase.from('attendance_logs').select('student_id, status, journal_id, journals!inner(teacher_id, subject)').eq('academic_year', academicYear || '2024/2025').eq('semester', semester || 'Ganjil')"
);

fs.writeFileSync(file, content);
console.log('JurnalForm applied');
