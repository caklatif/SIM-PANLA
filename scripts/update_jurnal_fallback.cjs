const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../pages/JurnalForm.tsx');
let content = fs.readFileSync(file, 'utf8');

// For fetching schedules
content = content.replace(
    /const \{ data, error \} = await supabase\.from\('schedules'\)\.select\('\*'\)\.eq\('academic_year', academicYear \|\| '2024\/2025'\)\.eq\('semester', semester \|\| 'Ganjil'\)\.eq\('teacher_id', profile\.id\)\.eq\('day_of_week', dayOfWeek\);/g,
    `let { data, error } = await supabase.from('schedules').select('*').eq('academic_year', academicYear || '2024/2025').eq('semester', semester || 'Ganjil').eq('teacher_id', profile.id).eq('day_of_week', dayOfWeek);
        if (error && error.code === 'PGRST204') {
            const res = await supabase.from('schedules').select('*').eq('teacher_id', profile.id).eq('day_of_week', dayOfWeek);
            data = res.data;
            error = res.error;
        }`
);

// For fetching attendance logs
content = content.replace(
    /let query = supabase\.from\('attendance_logs'\)\.select\('student_id, status, journal_id, journals!inner\(teacher_id, subject\)'\)\.eq\('academic_year', academicYear \|\| '2024\/2025'\)\.eq\('semester', semester \|\| 'Ganjil'\)\.in\('status', \['A', 'D'\]\)\.in\('student_id', studentIds\)\.eq\('journals\.teacher_id', profile\.id\);/g,
    `let query = supabase.from('attendance_logs').select('student_id, status, journal_id, journals!inner(teacher_id, subject)').eq('academic_year', academicYear || '2024/2025').eq('semester', semester || 'Ganjil').in('status', ['A', 'D']).in('student_id', studentIds).eq('journals.teacher_id', profile.id);
                let { data: recentAtt, error: recError } = await query;
                if (recError && recError.code === 'PGRST204') {
                    const fallbackQuery = supabase.from('attendance_logs').select('student_id, status, journal_id, journals!inner(teacher_id, subject)').in('status', ['A', 'D']).in('student_id', studentIds).eq('journals.teacher_id', profile.id);
                    const res = await fallbackQuery;
                    recentAtt = res.data;
                    recError = res.error;
                }`
);
content = content.replace(
    /const \{ data: recentAtt, error: recError \} = await query;/g,
    ""
);

// For Insert Journal (line 222)
content = content.replace(
    /const \{ data: journal, error: journalError \} = await supabase\.from\('journals'\)\.insert\(\{[\s\S]*?\}\)\.select\(\)\.single\(\);/g,
    `let { data: journal, error: journalError } = await supabase.from('journals').insert({ teacher_id: profile.id, kelas: formData.kelas, subject: formData.subject, ...payload, academic_year: academicYear || '2024/2025', semester: semester || 'Ganjil' }).select().single();
        if (journalError && journalError.code === 'PGRST204') {
            const fallbackRes = await supabase.from('journals').insert({ teacher_id: profile.id, kelas: formData.kelas, subject: formData.subject, ...payload }).select().single();
            journal = fallbackRes.data;
            journalError = fallbackRes.error;
        }`
);

// For Insert Attendance (line 225)
content = content.replace(
    /const \{ error: attError \} = await supabase\.from\('attendance_logs'\)\.insert\(attendanceInserts\);/g,
    `let { error: attError } = await supabase.from('attendance_logs').insert(attendanceInserts);
          if (attError && attError.code === 'PGRST204') {
              const fallbackAtts = attendanceInserts.map(a => {
                  const { academic_year, semester, ...rest } = a;
                  return rest;
              });
              const fallbackRes = await supabase.from('attendance_logs').insert(fallbackAtts);
              attError = fallbackRes.error;
          }`
);

// For Insert Notes (line 229)
content = content.replace(
    /const \{ error: noteError \} = await supabase\.from\('journal_notes'\)\.insert\(notesInserts\);/g,
    `let { error: noteError } = await supabase.from('journal_notes').insert(notesInserts);
          if (noteError && noteError.code === 'PGRST204') {
              const fallbackNotes = notesInserts.map(n => {
                  const { academic_year, semester, ...rest } = n;
                  return rest;
              });
              const fallbackRes = await supabase.from('journal_notes').insert(fallbackNotes);
              noteError = fallbackRes.error;
          }`
);

fs.writeFileSync(file, content);
console.log('JurnalForm fallback applied');
