const fs = require('fs');
const path = 'pages/PublicDashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/stats\.classesWithJournals/g, 'stats?.classesWithJournals');

fs.writeFileSync(path, content, 'utf8');
console.log('Patched stats?.');
