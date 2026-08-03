const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../pages/InputJadwal.tsx');
let content = fs.readFileSync(file, 'utf8');

const replacement = `
          let data = null;
          let error = null;
          try {
              const res = await supabase.from('schedules').select('*').eq('academic_year', academicYear || '2024/2025').eq('semester', semester || 'Ganjil').eq('teacher_id', teacherId).order('day_of_week').order('hour');
              data = res.data;
              error = res.error;
              if (error && error.code === 'PGRST204') {
                  // Fallback if column doesn't exist yet
                  const fallbackRes = await supabase.from('schedules').select('*').eq('teacher_id', teacherId).order('day_of_week').order('hour');
                  data = fallbackRes.data;
                  error = fallbackRes.error;
                  if (!error) console.warn("Kolom academic_year/semester belum ada di tabel schedules. Silakan jalankan SUPABASE_SETUP.sql");
              }
          } catch(e) { error = e; }
`;

content = content.replace(
    /let query = supabase\.from\('schedules'\)[\s\S]*?\/\/ Note:[^\n]*\n/g,
    replacement
);

// Also need to handle insert fallback in InputJadwal
content = content.replace(
    /const \{ error \} = await supabase\.from\('schedules'\)\.insert\(payloads\);/g,
    `let { error } = await supabase.from('schedules').insert(payloads);
        if (error && error.code === 'PGRST204') {
            // Fallback without academic_year and semester
            const fallbackPayloads = payloads.map(p => {
                const { academic_year, semester, ...rest } = p;
                return rest;
            });
            const fallbackRes = await supabase.from('schedules').insert(fallbackPayloads);
            error = fallbackRes.error;
            if (!error) console.warn("Kolom academic_year/semester belum ada di tabel schedules. Data disimpan tanpa tahun ajaran.");
        }`
);


fs.writeFileSync(file, content);
console.log('InputJadwal fallback applied');
