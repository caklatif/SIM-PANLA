const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../pages/InputJadwal.tsx');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    /\|\| error\.message\?\.includes\('schedule_version'\)/g,
    "|| error.message?.includes('schedule_version') || error.message?.includes('schema cache')"
);

fs.writeFileSync(file, content);
console.log('Fixed schema cache catch');
