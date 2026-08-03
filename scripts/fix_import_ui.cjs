const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../pages/ImportData.tsx');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    /<div className="mb-6 bg-orange-50 border border-orange-200 p-4 rounded-xl space-y-3">/g,
    `{activeTab === 'teachers' && (<div className="mb-6 bg-orange-50 border border-orange-200 p-4 rounded-xl space-y-3">`
);

content = content.replace(
    /<\/div>\n\s*<div className="flex gap-4">/g,
    `</div>)}\n\n                    <div className="flex gap-4">`
);

fs.writeFileSync(file, content);
console.log('Import UI fixed');
