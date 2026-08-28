const fs = require('fs');
const content = fs.readFileSync('pages/PresensiQR.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, i) => {
  if (line.includes('playBeep("success"')) {
    console.log(`Line ${i + 1}: ${line.trim()}`);
  }
});
