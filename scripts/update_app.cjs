const fs = require('fs');
const path = require('path');

const appFile = path.join(__dirname, '../App.tsx');
let content = fs.readFileSync(appFile, 'utf8');

if (!content.includes('import Penyimpanan')) {
    content = content.replace("import SettingsPage from './pages/SettingsPage';", "import SettingsPage from './pages/SettingsPage';\nimport Penyimpanan from './pages/Penyimpanan';");
}

if (!content.includes('path="/penyimpanan"')) {
    content = content.replace(
        '<Route path="/settings" element={', 
        '<Route path="/penyimpanan" element={\n               <AdminRoute>\n                 <Penyimpanan />\n               </AdminRoute>\n             } />\n             <Route path="/settings" element={'
    );
}

fs.writeFileSync(appFile, content);
console.log('App.tsx updated');
