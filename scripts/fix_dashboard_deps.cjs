const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../pages/Dashboard.tsx');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    /\}, \[profile, filterDate, matrixDate\]\);/g,
    `}, [profile, filterDate, matrixDate, academicYear, semester, activeScheduleVersion, semesterStart, semesterEnd]);`
);

fs.writeFileSync(file, content);
console.log('Fixed Dashboard deps');
