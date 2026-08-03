const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../components/Layout.tsx');
let content = fs.readFileSync(file, 'utf8');

const targetStr = 'setHasUnfilled(notifs.some(n => !n.isFilled));';
const replacementStr = `setHasUnfilled(notifs.some(n => !n.isFilled));
                    console.log("NOTIFS:", notifs);
                    console.log("HAS UNFILLED:", notifs.some(n => !n.isFilled));
                    console.log("SCHEDS:", scheds);
                    console.log("ACADEMIC YEAR:", academicYear);`;

content = content.replace(targetStr, replacementStr);
fs.writeFileSync(file, content);
console.log('Added debug logs');
