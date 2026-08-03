const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../pages/ImportData.tsx');
let content = fs.readFileSync(file, 'utf8');

const regex = /let \{ error \} = await supabase\.from\('students'\)\.upsert\(studentsToInsert, \{ onConflict: 'academic_year, nisn' \}\);[\s\S]*?successCount = studentsToInsert\.length;/;

const newLogic = `
            const target = targetYear || academicYear || '2025/2026';
            const { data: existing } = await supabase.from('students').select('id, nisn').eq('academic_year', target);
            const existingMap = new Map((existing || []).map(s => [s.nisn, s.id]));

            const toInsert = [];
            const toUpdate = [];

            for (const s of studentsToInsert) {
                if (existingMap.has(s.nisn)) {
                    toUpdate.push({ ...s, id: existingMap.get(s.nisn) });
                } else {
                    toInsert.push(s);
                }
            }

            if (toInsert.length > 0) {
                const { error: insErr } = await supabase.from('students').insert(toInsert);
                if (insErr) throw insErr;
            }
            if (toUpdate.length > 0) {
                const { error: updErr } = await supabase.from('students').upsert(toUpdate);
                if (updErr) throw updErr;
            }
            successCount = studentsToInsert.length;
`;

content = content.replace(regex, newLogic);
fs.writeFileSync(file, content);
console.log('ImportData fixed');
