const fs = require('fs');
const path = 'types.ts';
let content = fs.readFileSync(path, 'utf8');
const target = `  unfilledKbm: { guru: string; kelas: string; jam: string }[];
}`;
const repl = `  unfilledKbm: { guru: string; kelas: string; jam: string }[];
  classesWithJournals?: string[];
}`;
if (content.includes(target)) {
    content = content.replace(target, repl);
    fs.writeFileSync(path, content, 'utf8');
    console.log('Patched types');
} else {
    console.log('Target not found');
}
