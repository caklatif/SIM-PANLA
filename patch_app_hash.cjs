const fs = require('fs');
const path = 'App.tsx';
let content = fs.readFileSync(path, 'utf8');

if (content.includes('</HashRouter>') && !content.includes('<InstallPWA />')) {
    content = content.replace('</HashRouter>', '  <InstallPWA />\n        </HashRouter>');
    fs.writeFileSync(path, content, 'utf8');
    console.log('Patched App.tsx for HashRouter');
} else if (content.includes('</HashRouter>') && content.includes('<InstallPWA />')) {
    // If it was somehow added, let's remove the broken </BrowserRouter> 
    if (content.includes('  <InstallPWA />\n    </BrowserRouter>')) {
        content = content.replace('  <InstallPWA />\n    </BrowserRouter>', '');
        content = content.replace('</HashRouter>', '  <InstallPWA />\n        </HashRouter>');
        fs.writeFileSync(path, content, 'utf8');
        console.log('Fixed App.tsx for HashRouter');
    }
}

