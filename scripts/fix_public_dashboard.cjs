const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../pages/PublicDashboard.tsx');
let content = fs.readFileSync(file, 'utf8');

content = content.replace("navigate('/dashboard');", "navigate('/dashboard', { state: { justLoggedIn: true } });");
content = content.replace("<main className=\"w-full max-w-md space-y-4\">", "<main className=\"w-full max-w-md space-y-4 my-auto\">");

fs.writeFileSync(file, content);
console.log('PublicDashboard modified');
