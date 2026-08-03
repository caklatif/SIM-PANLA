const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../contexts/AuthContext.tsx');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    /academicYear,\n\s*semester\n\s*\}\}>/g,
    `academicYear,\n      semester,\n      activeScheduleVersion\n    }}>`
);

fs.writeFileSync(file, content);
console.log('AuthContext value fixed');
