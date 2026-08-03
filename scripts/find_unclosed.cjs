const fs = require('fs');
const content = fs.readFileSync('pages/PublicDashboard.tsx', 'utf8');

let braces = 0;
for (let i = 0; i < content.length; i++) {
    if (content[i] === '{') braces++;
    else if (content[i] === '}') {
        braces--;
        if (braces < 0) console.log("Negative braces at", i, content.slice(i-20, i+20));
    }
}
console.log("Final braces:", braces);
