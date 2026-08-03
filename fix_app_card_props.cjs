const fs = require('fs');
let content = fs.readFileSync('pages/AppsMenu.tsx', 'utf8');

content = content.replace("({ label, subLabel, icon: Icon, path, gradientClass, shadowColor }: any)", "({ label, subLabel, icon: Icon, path, gradientClass, shadowColor = '' }: any)");

fs.writeFileSync('pages/AppsMenu.tsx', content);
