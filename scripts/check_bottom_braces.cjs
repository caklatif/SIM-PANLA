const fs = require('fs');
const content = fs.readFileSync('pages/PublicDashboard.tsx', 'utf8');

// I will just count braces from line 276 onwards
const lines = content.split('\n');
const bottom = lines.slice(275).join('\n');

let braces = 0;
for (let i = 0; i < bottom.length; i++) {
    if (bottom[i] === '{') braces++;
    else if (bottom[i] === '}') braces--;
}
console.log("Bottom braces:", braces);
