const fs = require('fs');
const path = 'pages/PublicDashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace('const fallbackQuery = async (queryFn) => {', 'const fallbackQuery = async (queryFn: any) => {');
content = content.replace("catch (err) { console.error('FETCH ERROR', err); }", "catch (err: any) { console.error('FETCH ERROR', err); }");

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed TS');
