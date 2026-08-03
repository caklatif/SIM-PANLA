const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../pages/Kedisiplinan.tsx');
let content = fs.readFileSync(file, 'utf8');

// For fetching schedules - actually Kedisiplinan doesn't fetch schedules? Oh wait, it inserts journal_notes
content = content.replace(
    /const \{ error \} = await supabase\.from\('journal_notes'\)\.insert\(notesToInsert\);/g,
    `let { error } = await supabase.from('journal_notes').insert(notesToInsert);
        if (error && error.code === 'PGRST204') {
            const fallbackNotes = notesToInsert.map(n => {
                const { academic_year, semester, ...rest } = n;
                return rest;
            });
            const res = await supabase.from('journal_notes').insert(fallbackNotes);
            error = res.error;
        }`
);

fs.writeFileSync(file, content);
console.log('Kedisiplinan fallback applied');
