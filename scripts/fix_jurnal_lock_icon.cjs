const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../pages/JurnalForm.tsx');
let content = fs.readFileSync(file, 'utf8');

// Add Lock import
if (!content.includes('Lock,')) {
    content = content.replace('Gavel }', 'Gavel, Lock }');
}

// Update student name div
const oldDiv = `<div className="font-bold text-slate-700 text-xs sm:text-sm truncate w-full" title={student.name}>{student.name}</div>`;
const newDiv = `<div className="font-bold text-slate-700 text-xs sm:text-sm truncate w-full flex items-center gap-1" title={student.name}>{student.name}{lockedAttendance.includes(student.id) && <Lock size={12} className="text-slate-400" title="Diisi & dikunci oleh Wali Kelas" />}</div>`;
content = content.replace(oldDiv, newDiv);

fs.writeFileSync(file, content);
console.log('Added Lock icon for locked attendance');
