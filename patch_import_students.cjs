const fs = require('fs');

const path = '/app/applet/pages/ImportData.tsx';
let content = fs.readFileSync(path, 'utf8');

const target = `        if (activeTab === 'students') {
            const studentsToInsert = previewData.map((row: any) => ({
                academic_year: targetYear || academicYear || '2025/2026',
                nisn: String(row['NISN'] || row['nisn']),
                nis: String(row['NIS'] || row['nis']),
                name: row['Nama Lengkap'] || row['nama'] || row['Nama'],
                kelas: row['Kelas'] || row['kelas'],
                gender: row['L/P'] || row['l/p'] || row['Gender'] || row['gender'], // Mapping kolom L/P
                jenjang: row['Jenjang'] || row['jenjang'] // Mapping kolom Jenjang
            })).filter(s => s.nisn && s.name && s.kelas);

            if (studentsToInsert.length > 0) {
                
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

            }

        } else if (activeTab === 'teachers') {`;

const replacement = `        if (activeTab === 'students') {
            const studentsToInsert = previewData.map((row: any) => ({
                academic_year: targetYear || academicYear || '2025/2026',
                nisn: String(row['NISN'] || row['nisn']),
                nis: String(row['NIS'] || row['nis']),
                name: row['Nama Lengkap'] || row['nama'] || row['Nama'],
                kelas: row['Kelas'] || row['kelas'],
                gender: row['L/P'] || row['l/p'] || row['Gender'] || row['gender'], // Mapping kolom L/P
                jenjang: row['Jenjang'] || row['jenjang'] // Mapping kolom Jenjang
            })).filter(s => s.nisn && s.name && s.kelas);

            if (studentsToInsert.length > 0) {
                // Deduplicate items based on academic_year and nisn
                const uniqueStudentsMap = new Map();
                for (const s of studentsToInsert) {
                    uniqueStudentsMap.set(\`\${s.academic_year}_\${s.nisn}\`, s);
                }
                const uniqueStudents = Array.from(uniqueStudentsMap.values());

                const { error: upsertErr } = await supabase.from('students').upsert(uniqueStudents, { onConflict: 'academic_year,nisn' });
                if (upsertErr) throw upsertErr;
                
                successCount = uniqueStudents.length;
            }

        } else if (activeTab === 'teachers') {`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(path, content, 'utf8');
    console.log('Patched ImportData.tsx successfully');
} else {
    console.log('Target not found in ImportData.tsx');
}
