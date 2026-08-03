const fs = require('fs');
let content = fs.readFileSync('pages/AppsMenu.tsx', 'utf8');
content = content.replace("import {   BookOpenText", "import { ChevronRight, BookOpenText");
content = content.replace("subLabel.split('\\n').map((line, i)", "subLabel.split('\\n').map((line:any, i:any)");
fs.writeFileSync('pages/AppsMenu.tsx', content);
