const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../index.html');
let content = fs.readFileSync(file, 'utf8');

// Update body background for better glassmorphism contrast
content = content.replace(
    /background-image: linear-gradient\(180deg, #F0F4F8 0%, #E6EAF0 100%\);/g,
    'background-image: radial-gradient(circle at 15% 50%, #f1f5f9, #e2e8f0 70%);\n        background-attachment: fixed;'
);

content = content.replace(
    /background-image: linear-gradient\(180deg, #0f172a 0%, #020617 100%\);/g,
    'background-image: radial-gradient(circle at 15% 50%, #1e293b, #020617 70%);\n        background-attachment: fixed;'
);


// Update .app-card for glassmorphism
content = content.replace(
    /background-color: #FFFFFF;/g,
    'background-color: rgba(255, 255, 255, 0.75);\n        backdrop-filter: blur(16px);\n        -webkit-backdrop-filter: blur(16px);'
);

content = content.replace(
    /background-color: #1e293b; \/\* slate-800 \*\//g,
    'background-color: rgba(30, 41, 59, 0.75); /* slate-800 */\n        backdrop-filter: blur(16px);\n        -webkit-backdrop-filter: blur(16px);'
);

fs.writeFileSync(file, content);
console.log('Fixed index.html glassmorphism');
