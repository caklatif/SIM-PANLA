const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../pages/Penyimpanan.tsx');
let content = fs.readFileSync(file, 'utf8');

// The missing </div> should be right before the Catatan div
content = content.replace(
    /<div className="mt-8 text-xs text-gray-500 bg-gray-50 p-4 rounded-xl">/g,
    `</div>\n                    <div className="mt-8 text-xs text-gray-500 bg-gray-50 p-4 rounded-xl">`
);

fs.writeFileSync(file, content);
