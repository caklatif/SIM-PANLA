const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../App.tsx');
let content = fs.readFileSync(file, 'utf8');

content = content.replace("import { ThemeProvider } from './contexts/ThemeContext';", "import { ThemeProvider } from './contexts/ThemeContext';\nimport { CustomAlertProvider } from './components/CustomAlertProvider';");

content = content.replace("<HashRouter>", "<CustomAlertProvider>\n        <HashRouter>");
content = content.replace("</HashRouter>", "</HashRouter>\n        </CustomAlertProvider>");

fs.writeFileSync(file, content);
console.log('App.tsx updated with CustomAlertProvider');
