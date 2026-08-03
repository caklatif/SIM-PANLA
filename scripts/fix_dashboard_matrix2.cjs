const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../pages/Dashboard.tsx');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/setMatrixData\(filteredMatrix\);\n\s*setMatrixData\(matrix\);/g, 'setMatrixData(filteredMatrix);');

fs.writeFileSync(file, content);
console.log('Fixed double setMatrixData');
