const fs = require('fs');
const content = fs.readFileSync('/tmp/public_dashboard_top.tsx', 'utf8');

let braces = 0;
for (let i = 0; i < content.length; i++) {
    if (content[i] === '{') braces++;
    else if (content[i] === '}') braces--;
}
console.log("Top braces:", braces);
