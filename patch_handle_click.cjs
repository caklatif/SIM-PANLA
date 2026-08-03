const fs = require('fs');
const path = '/app/applet/pages/PublicDashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

const target = `const details = Object.entries(stats.classDetails).filter(([cls]) => cls.startsWith(grade)).sort();`;

const repl = `const details = Object.entries(stats.classDetails).filter(([cls]) => {
          if (grade === '7') return /^7|^VII(?![I])/.test(cls);
          if (grade === '8') return /^8|^VIII/.test(cls);
          if (grade === '9') return /^9|^IX/.test(cls);
          return cls.startsWith(grade);
      }).sort();`;

if (content.includes(target)) {
    content = content.replace(target, repl);
    fs.writeFileSync(path, content, 'utf8');
    console.log('Patched handleClassClick');
} else {
    console.log('Target not found for handleClassClick');
}
