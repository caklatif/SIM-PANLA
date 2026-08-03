const fs = require('fs');
const content = fs.readFileSync('pages/PublicDashboard.tsx', 'utf8');

let braces = 0;
let parens = 0;
let brackets = 0;
let tags = 0; // naive

for (let i = 0; i < content.length; i++) {
    if (content[i] === '{') braces++;
    else if (content[i] === '}') braces--;
    else if (content[i] === '(') parens++;
    else if (content[i] === ')') parens--;
    else if (content[i] === '[') brackets++;
    else if (content[i] === ']') brackets--;
}

console.log(`Braces: ${braces}, Parens: ${parens}, Brackets: ${brackets}`);
