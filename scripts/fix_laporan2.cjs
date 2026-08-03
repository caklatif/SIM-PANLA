const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../pages/LaporanJurnal.tsx');
let content = fs.readFileSync(file, 'utf8');

const corrupted = /const \{ data: journalData, error \} = await supabase[\s\S]*?\.\.\.\(semesterEnd \? \{ lte: \['created_at', `\$\{semesterEnd\}T23:59:59\+07:00`\] \} : \{\}\)[\s\S]*?\.order\('created_at', \{ ascending: false \}\);/m;

const replacement = `let query = supabase
            .from('journals')
            .select(\`
                id,
                created_at,
                kelas,
                subject,
                hours,
                material,
                validation,
                attendance_logs (
                    student_name,
                    status
                )
            \`)
            .eq('teacher_id', profile?.id)
            .eq('academic_year', academicYear || '2025/2026')
            .eq('semester', semester || 'Ganjil');

        if (semesterStart) query = query.gte('created_at', \`\${semesterStart}T00:00:00+07:00\`);
        if (semesterEnd) query = query.lte('created_at', \`\${semesterEnd}T23:59:59+07:00\`);

        const { data: journalData, error } = await query.order('created_at', { ascending: false });`;

content = content.replace(corrupted, replacement);
fs.writeFileSync(file, content);
