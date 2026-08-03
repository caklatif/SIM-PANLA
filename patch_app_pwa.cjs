const fs = require('fs');
const path = 'App.tsx';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes('import InstallPWA')) {
    content = content.replace("import { Toaster } from 'lucide-react';", "import { Toaster } from 'lucide-react';\nimport InstallPWA from './components/InstallPWA';");
    content = content.replace("import AdminDashboard from './pages/AdminDashboard';", "import AdminDashboard from './pages/AdminDashboard';\nimport InstallPWA from './components/InstallPWA';");
    
    // Fallback if the above doesn't match
    if (!content.includes('import InstallPWA')) {
        content = "import InstallPWA from './components/InstallPWA';\n" + content;
    }
    
    // Inject InstallPWA before </BrowserRouter>
    content = content.replace('</BrowserRouter>', '  <InstallPWA />\n    </BrowserRouter>');
    
    fs.writeFileSync(path, content, 'utf8');
    console.log('Patched App.tsx with InstallPWA');
}
