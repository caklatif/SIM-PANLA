const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../pages/Login.tsx');
let content = fs.readFileSync(file, 'utf8');

content = content.replace("navigate('/dashboard');", "navigate('/dashboard', { state: { justLoggedIn: true } });");

fs.writeFileSync(file, content);
console.log('Fixed Login navigate');
