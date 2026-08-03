const fs = require('fs');
const path = 'pages/PublicDashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

const target = `                if (j.kelas) classesWithJournalsSet.add(j.kelas.trim());`;
const repl = `                if (j.kelas) classesWithJournalsSet.add(j.kelas.toUpperCase().trim());`;

if (content.includes(target)) {
    content = content.replace(target, repl);
    fs.writeFileSync(path, content, 'utf8');
    console.log('Patched set');
}
