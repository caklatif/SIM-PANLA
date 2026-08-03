const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../pages/Dashboard.tsx');
let content = fs.readFileSync(file, 'utf8');

// Remove the old greeting logic where it was incorrectly placed
content = content.replace(
    /const currentHour = new Date\(\)\.getHours\(\);\n\s*let greeting = 'Selamat Malam';\n\s*if \(currentHour >= 5 && currentHour < 11\) greeting = 'Selamat Pagi';\n\s*else if \(currentHour >= 11 && currentHour < 15\) greeting = 'Selamat Siang';\n\s*else if \(currentHour >= 15 && currentHour < 18\) greeting = 'Selamat Sore';/g,
    ''
);

// Inject it right after the component declaration
content = content.replace(
    /const Dashboard: React\.FC = \(\) => \{/,
    `const Dashboard: React.FC = () => {
  const currentHour = new Date().getHours();
  let greeting = 'Selamat Malam';
  if (currentHour >= 5 && currentHour < 11) greeting = 'Selamat Pagi';
  else if (currentHour >= 11 && currentHour < 15) greeting = 'Selamat Siang';
  else if (currentHour >= 15 && currentHour < 18) greeting = 'Selamat Sore';
`
);

fs.writeFileSync(file, content);
console.log('Fixed Dashboard greeting scope');
