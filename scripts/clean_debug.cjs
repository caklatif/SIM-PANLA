const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../components/Layout.tsx');
let content = fs.readFileSync(file, 'utf8');

content = content.replace('console.log("NOTIFS:", notifs);', '');
content = content.replace('console.log("HAS UNFILLED:", notifs.some(n => !n.isFilled));', '');
content = content.replace('console.log("SCHEDS:", scheds);', '');
content = content.replace('console.log("ACADEMIC YEAR:", academicYear);', '');

fs.writeFileSync(file, content);
