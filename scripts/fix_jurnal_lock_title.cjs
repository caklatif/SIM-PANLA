const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../pages/JurnalForm.tsx');
let content = fs.readFileSync(file, 'utf8');

const target = `<Lock size={12} className="text-slate-400" title="Diisi & dikunci oleh Wali Kelas" />`;
const replacement = `<span title="Diisi & dikunci oleh Wali Kelas" className="flex items-center"><Lock size={12} className="text-slate-400" /></span>`;
content = content.replace(target, replacement);

fs.writeFileSync(file, content);
console.log('Fixed Lock icon title attribute type error');
