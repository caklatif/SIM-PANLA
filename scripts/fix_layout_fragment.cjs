const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../components/Layout.tsx');
let content = fs.readFileSync(file, 'utf8');

content = content.replace("    <AnimatePresence>\n        {showTeacherSplash", "    <>\n      <AnimatePresence>\n        {showTeacherSplash");
content = content.replace("        </div>\n      )}\n\n    ", "        </div>\n      )}\n    </>");

fs.writeFileSync(file, content);
console.log('Fixed Layout fragment');
