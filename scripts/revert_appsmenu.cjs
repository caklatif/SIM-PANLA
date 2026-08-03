const fs = require('fs');
const path = require('path');
let appsMenuFile = path.join(__dirname, '../pages/AppsMenu.tsx');
if (fs.existsSync(appsMenuFile)) {
    let content = fs.readFileSync(appsMenuFile, 'utf8');
    content = content.replace(/className="bg-white\/60 dark:bg-slate-800\/60 backdrop-blur-xl rounded-\[2rem\] p-6 flex flex-col items-center justify-center gap-5 shadow-\[0_8px_30px_rgb\(0,0,0,0\.04\)\] border border-white\/50 dark:border-slate-700\/50 hover:shadow-xl hover:border-white\/80 dark:hover:border-slate-600 hover:-translate-y-1\.5 transition-all duration-300 w-full h-52 group relative overflow-hidden"/g, 'className="bg-white dark:bg-slate-800 rounded-3xl p-6 flex flex-col items-center justify-center gap-5 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-lg hover:border-blue-300 dark:hover:border-slate-600 hover:-translate-y-1 transition-all duration-300 w-full h-52 group relative overflow-hidden"');
    fs.writeFileSync(appsMenuFile, content);
    console.log('Reverted AppsMenu.tsx UI completely');
}
