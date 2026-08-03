const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../pages/InputJadwal.tsx');
let content = fs.readFileSync(file, 'utf8');

const target = `            const fallbackPayloads = payloads.map(p => {
                const { academic_year, semester, schedule_version, ...rest } = p as any;
                return rest;
            });
            const fallbackRes = await supabase.from('schedules').insert(fallbackPayloads);
            error = fallbackRes.error;`;

const replacement = `            let fallbackPayloads = payloads.map(p => {
                const { schedule_version, ...rest } = p as any;
                return rest;
            });
            let fallbackRes = await supabase.from('schedules').insert(fallbackPayloads);
            
            if (fallbackRes.error && fallbackRes.error.code === '42703') {
                fallbackPayloads = fallbackPayloads.map(p => {
                    const { academic_year, semester, ...rest } = p as any;
                    return rest;
                });
                fallbackRes = await supabase.from('schedules').insert(fallbackPayloads);
            }
            error = fallbackRes.error;`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(file, content);
    console.log('Fixed InputJadwal insert fallback');
} else {
    console.log('Target not found in InputJadwal');
}
