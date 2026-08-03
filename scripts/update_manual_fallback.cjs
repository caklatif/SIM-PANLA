const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../pages/InputManual.tsx');
let content = fs.readFileSync(file, 'utf8');

// For inserting journals
content = content.replace(
    /const \{ data: journalData, error: journalError \} = await supabase\.from\('journals'\)\.insert\(journalPayload\)\.select\(\)\.single\(\);/g,
    `let { data: journalData, error: journalError } = await supabase.from('journals').insert(journalPayload).select().single();
                  if (journalError && journalError.code === 'PGRST204') {
                      const { academic_year, semester, ...rest } = journalPayload;
                      const res = await supabase.from('journals').insert(rest).select().single();
                      journalData = res.data;
                      journalError = res.error;
                  }`
);

// For inserting attendances
content = content.replace(
    /const \{ error: attError \} = await supabase\.from\('attendance_logs'\)\.insert\(attendancePayloads\);/g,
    `let { error: attError } = await supabase.from('attendance_logs').insert(attendancePayloads);
                  if (attError && attError.code === 'PGRST204') {
                      const fallback = attendancePayloads.map(p => {
                          const { academic_year, semester, ...rest } = p;
                          return rest;
                      });
                      const res = await supabase.from('attendance_logs').insert(fallback);
                      attError = res.error;
                  }`
);

fs.writeFileSync(file, content);
console.log('InputManual fallback applied');
