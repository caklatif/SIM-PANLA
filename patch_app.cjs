const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

if (!code.includes('AppSplash')) {
    code = code.replace(
        "import { Loader2 } from 'lucide-react';",
        "import { Loader2 } from 'lucide-react';\nimport AppSplash from './components/AppSplash';"
    );
    
    code = code.replace(
        '<ThemeProvider>',
        '<ThemeProvider>\n      <AppSplash />'
    );
    
    fs.writeFileSync('App.tsx', code);
}
