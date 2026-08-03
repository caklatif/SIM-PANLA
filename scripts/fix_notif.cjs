const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../components/Layout.tsx');
let content = fs.readFileSync(file, 'utf8');

// Change setHasUnfilled to just check if there are any schedules
content = content.replace(
  'setHasUnfilled(notifs.some(n => !n.isFilled));',
  'setHasUnfilled(notifs.length > 0);'
);

fs.writeFileSync(file, content);
console.log('Fixed hasUnfilled logic');
