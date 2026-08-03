const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../pages/StudentsData.tsx');
let content = fs.readFileSync(file, 'utf8');

// Remove the button
content = content.replace(
    /<button onClick=\{.*?setShowKenaikanModal\(true\).*?>[\s\S]*?Proses Kenaikan Kelas\n\s*<\/button>\n/g,
    ''
);

// Remove the modal
content = content.replace(
    /\{\/\* Modal Kenaikan Kelas \*\/\}[\s\S]*?\}\)/g,
    ''
);

fs.writeFileSync(file, content);
console.log('Removed Kenaikan Kelas');
