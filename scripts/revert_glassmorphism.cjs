const fs = require('fs');
const path = require('path');

// Revert index.html
let indexFile = path.join(__dirname, '../index.html');
let indexContent = fs.readFileSync(indexFile, 'utf8');
indexContent = indexContent.replace(
    /background-image: radial-gradient\(circle at 15% 50%, #f1f5f9, #e2e8f0 70%\);\n        background-attachment: fixed;/g,
    'background-image: linear-gradient(180deg, #F0F4F8 0%, #E6EAF0 100%);'
);
indexContent = indexContent.replace(
    /background-image: radial-gradient\(circle at 15% 50%, #1e293b, #020617 70%\);\n        background-attachment: fixed;/g,
    'background-image: linear-gradient(180deg, #0f172a 0%, #020617 100%);'
);
indexContent = indexContent.replace(
    /background-color: rgba\(255, 255, 255, 0\.75\);\n        backdrop-filter: blur\(16px\);\n        -webkit-backdrop-filter: blur\(16px\);/g,
    'background-color: #FFFFFF;'
);
indexContent = indexContent.replace(
    /background-color: rgba\(30, 41, 59, 0\.75\); \/\* slate-800 \*\/\n        backdrop-filter: blur\(16px\);\n        -webkit-backdrop-filter: blur\(16px\);/g,
    'background-color: #1e293b; /* slate-800 */'
);
fs.writeFileSync(indexFile, indexContent);
console.log('Reverted index.html');

// Revert Login.tsx
let loginFile = path.join(__dirname, '../pages/Login.tsx');
let loginContent = fs.readFileSync(loginFile, 'utf8');
loginContent = loginContent.replace(/className="bg-white\/70 dark:bg-slate-800\/70 backdrop-blur-md/g, 'className="bg-white dark:bg-slate-800');
loginContent = loginContent.replace(/className="w-full max-w-sm bg-white\/80 dark:bg-slate-800\/80 backdrop-blur-xl/g, 'className="w-full max-w-sm bg-white dark:bg-slate-800');
loginContent = loginContent.replace(/className="bg-white\/80 dark:bg-slate-800\/80 backdrop-blur-md/g, 'className="bg-white dark:bg-slate-800');
fs.writeFileSync(loginFile, loginContent);
console.log('Reverted Login.tsx');

// Revert PublicDashboard.tsx
let pdFile = path.join(__dirname, '../pages/PublicDashboard.tsx');
let pdContent = fs.readFileSync(pdFile, 'utf8');
pdContent = pdContent.replace(/bg-white\/90 dark:bg-slate-800\/90 backdrop-blur-xl/g, 'bg-white dark:bg-slate-800');
pdContent = pdContent.replace(/bg-white\/95 dark:bg-slate-800\/95 backdrop-blur-xl/g, 'bg-white dark:bg-slate-800');
fs.writeFileSync(pdFile, pdContent);
console.log('Reverted PublicDashboard.tsx');

// Revert Layout.tsx
let layoutFile = path.join(__dirname, '../components/Layout.tsx');
let layoutContent = fs.readFileSync(layoutFile, 'utf8');
layoutContent = layoutContent.replace(/bg-white\/70 dark:bg-slate-800\/70 backdrop-blur-xl border-r border-slate-200\/50 dark:border-slate-700\/50/g, 'bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700');
layoutContent = layoutContent.replace(/bg-white\/70 dark:bg-slate-800\/70 backdrop-blur-xl border-b border-slate-200\/50 dark:border-slate-700\/50/g, 'bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700');
layoutContent = layoutContent.replace(/bg-white\/70 dark:bg-slate-800\/70 backdrop-blur-xl shadow-t-lg border-t border-slate-100\/50 dark:border-slate-700\/50/g, 'bg-white dark:bg-slate-800 shadow-t-lg border-t border-slate-100 dark:border-slate-700');
fs.writeFileSync(layoutFile, layoutContent);
console.log('Reverted Layout.tsx');

// Revert AppsMenu.tsx
let appsMenuFile = path.join(__dirname, '../components/AppsMenu.tsx');
let appsMenuContent = fs.readFileSync(appsMenuFile, 'utf8');
appsMenuContent = appsMenuContent.replace(/bg-white\/70 dark:bg-slate-800\/70 backdrop-blur-md/g, 'bg-white dark:bg-slate-800');
fs.writeFileSync(appsMenuFile, appsMenuContent);
console.log('Reverted AppsMenu.tsx');

