const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../pages/ImportData.tsx');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    /const \{ error \} = await supabase\.from\('students'\)\.upsert\(studentsToInsert, \{ onConflict: 'academic_year, nisn' \}\);/g,
    `let { error } = await supabase.from('students').upsert(studentsToInsert, { onConflict: 'academic_year, nisn' });
                if (error && (error.code === '42703' || error.message?.includes('academic_year'))) {
                    // Fallback to inserting without academic_year
                    const fallbackData = studentsToInsert.map(s => {
                        const { academic_year, ...rest } = s;
                        return rest;
                    });
                    const res = await supabase.from('students').upsert(fallbackData, { onConflict: 'nisn' });
                    error = res.error;
                }`
);

fs.writeFileSync(file, content);
console.log('ImportData.tsx updated');
