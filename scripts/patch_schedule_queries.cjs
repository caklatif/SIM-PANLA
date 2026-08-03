const fs = require('fs');
const path = require('path');

const components = [
    'JurnalForm.tsx', 'KinerjaGuru.tsx', 'OperatorDashboard.tsx', 'InputJadwal.tsx', 'Dashboard.tsx'
];

components.forEach(comp => {
    const file = path.join(__dirname, '../pages/', comp);
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf8');
    
    // Make sure we extract activeScheduleVersion from useAuth
    if (content.includes('useAuth') && !content.includes('activeScheduleVersion')) {
        content = content.replace(
            /const \{(.*?)\} = useAuth\(\);/g,
            `const {$1, activeScheduleVersion } = useAuth();`
        );
    }
    
    // Add activeScheduleVersion to inserts in InputJadwal
    if (comp === 'InputJadwal.tsx') {
        content = content.replace(
            /academic_year: academicYear \|\| '2025\/2026', semester: semester \|\| 'Ganjil'/g,
            `academic_year: academicYear || '2025/2026', semester: semester || 'Ganjil', schedule_version: activeScheduleVersion || 'Utama'`
        );
    }

    // Add eq('schedule_version' ...) to select queries
    content = content.replace(
        /\.eq\('semester', semester \|\| 'Ganjil'\)(?!\.eq\('schedule_version')/g,
        `.eq('semester', semester || 'Ganjil').eq('schedule_version', activeScheduleVersion || 'Utama')`
    );

    fs.writeFileSync(file, content);
    console.log(comp, 'queries patched');
});
