const fs = require('fs');
const path = 'pages/PublicDashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

const target = `if (studentsRes.data) {`;
const repl = `console.log("studentsRes:", studentsRes);
        console.log("journalsRes:", journalsRes);
        console.log("attendanceRes:", attendanceRes);
        console.log("homeroomRes:", homeroomRes);
        if (studentsRes.data) {`;

if (content.includes(target)) {
    content = content.replace(target, repl);
    fs.writeFileSync(path, content, 'utf8');
    console.log('Patched test_results');
} else {
    console.log('Target not found');
}
