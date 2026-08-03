const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../pages/ImportData.tsx');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    /\{activeTab === 'teachers' && \(\s*\{activeTab === 'teachers' && \(/g,
    `{activeTab === 'teachers' && (`
);

content = content.replace(
    /<\/div>\)}\n\n                    <div className="flex gap-4">/g,
    `</div>\n                    <div className="flex gap-4">`
);

fs.writeFileSync(file, content);
console.log('Import UI syntax fixed');
