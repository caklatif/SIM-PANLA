const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../pages/UsersData.tsx');
let content = fs.readFileSync(file, 'utf8');

const targetHeader = `<th className="px-6 py-4">Status</th>`;
content = content.replace(targetHeader, '');

const toggleStatusTdRegex = /<td className="px-6 py-3">\s*<div className="flex items-center gap-2">\s*<button[\s\S]*?onClick=\{\(\) => toggleActiveStatus\(p\)\}[\s\S]*?<\/div>\s*<\/td>/;
content = content.replace(toggleStatusTdRegex, '');

const toggleFnRegex = /const toggleActiveStatus = async \(user: Profile\) => \{[\s\S]*? catch\(e: any\) \{ alert\("Gagal update status: " \+ e\.message\); \}\s*\};\s*/;
content = content.replace(toggleFnRegex, '');

fs.writeFileSync(file, content);
console.log('Reverted status UI');
