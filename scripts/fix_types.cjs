const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../types.ts');
let content = fs.readFileSync(file, 'utf8');

// Revert previous mistake by finding 'kelas: string;\n  academic_year?: string;' and replacing with 'kelas: string;'
content = content.replace(/kelas: string;\n  academic_year\?: string;/g, 'kelas: string;');

// Now only add to Student
content = content.replace(
    /export interface Student \{[\s\S]*?kelas: string;/g,
    (match) => match + '\n  academic_year?: string;'
);

fs.writeFileSync(file, content);
console.log('types.ts fixed');
