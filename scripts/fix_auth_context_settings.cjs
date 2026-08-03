const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../contexts/AuthContext.tsx');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    /\.in\('key', \['academic_year', 'semester', 'active_schedule_version'\]\)/,
    `.in('key', ['academic_year', 'semester', 'active_schedule_version', 'semester_start', 'semester_end'])`
);

content = content.replace(
    /if \(item\.key === 'active_schedule_version' && item\.value\) setActiveScheduleVersion\(item\.value\);\n\s*\}\);/m,
    `if (item.key === 'active_schedule_version' && item.value) setActiveScheduleVersion(item.value);
               if (item.key === 'semester_start' && item.value) setSemesterStart(item.value);
               if (item.key === 'semester_end' && item.value) setSemesterEnd(item.value);
           });`
);

fs.writeFileSync(file, content);
