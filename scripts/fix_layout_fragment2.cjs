const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../components/Layout.tsx');
let content = fs.readFileSync(file, 'utf8');

// I need to find the `return (` that starts the component output, and replace it properly.
// The easiest is to find `return (\n    <>` and ensure it ends with `</>\n  );`
// Or just reset it by looking for `return (` and the final `);`

let lines = content.split('\n');
let returnLine = lines.findIndex(l => l.includes('return (') && l.includes('AnimatePresence'));
if (returnLine === -1) {
    returnLine = lines.findIndex(l => l.includes('return (') && lines[l+1] && lines[l+1].includes('<AnimatePresence>'));
}

if(returnLine === -1) {
    // If we messed up, let's fix it by regex
    content = content.replace(/return \(\s*<>\s*<AnimatePresence>/, 'return (\n    <>\n      <AnimatePresence>');
    // Let's just fix the end
    const lastBraceIndex = content.lastIndexOf(';');
    // We will just rewrite the bottom
    content = content.replace(/<\/div>\s*\}\)\s*<\/div>\s*\)\s*\}\s*<\/>\s*$/g, '');
    // Wait, let's just do a clean fix:
}
