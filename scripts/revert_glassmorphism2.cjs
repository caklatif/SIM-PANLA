const fs = require('fs');
const path = require('path');
let appsMenuFile = path.join(__dirname, '../pages/AppsMenu.tsx');
if (fs.existsSync(appsMenuFile)) {
    let appsMenuContent = fs.readFileSync(appsMenuFile, 'utf8');
    appsMenuContent = appsMenuContent.replace(/bg-white\/70 dark:bg-slate-800\/70 backdrop-blur-xl/g, 'bg-white dark:bg-slate-800');
    appsMenuContent = appsMenuContent.replace(/bg-white\/70 dark:bg-slate-800\/70 backdrop-blur-md/g, 'bg-white dark:bg-slate-800');
    appsMenuContent = appsMenuContent.replace(/bg-white\/90 dark:bg-slate-800\/90 backdrop-blur-xl/g, 'bg-white dark:bg-slate-800');
    appsMenuContent = appsMenuContent.replace(/bg-white\/80 dark:bg-slate-800\/80 backdrop-blur-xl/g, 'bg-white dark:bg-slate-800');
    fs.writeFileSync(appsMenuFile, appsMenuContent);
    console.log('Reverted AppsMenu.tsx in pages');
} else {
    console.log('AppsMenu.tsx not found in pages either');
}
