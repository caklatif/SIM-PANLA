const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../SUPABASE_SETUP.sql');
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('schedule_version')) {
    // Modify schedules table definition
    content = content.replace(
        /semester text default 'Genap',/g,
        `semester text default 'Genap',\n  schedule_version text default 'Utama',`
    );

    // Modify default settings
    content = content.replace(
        /\('semester', 'Genap', 'Semester Aktif'\),/g,
        `('semester', 'Genap', 'Semester Aktif'),\n  ('active_schedule_version', 'Utama', 'Versi Jadwal Aktif'),`
    );

    // Add to migration block
    content = content.replace(
        /alter table public\.schedules add column semester text default 'Genap';/g,
        `alter table public.schedules add column semester text default 'Genap';\n    alter table public.schedules add column schedule_version text default 'Utama';`
    );
    
    fs.writeFileSync(file, content);
    console.log('SQL patched with schedule_version');
} else {
    console.log('Already patched');
}
