const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../components/Layout.tsx');
let content = fs.readFileSync(file, 'utf8');

// Replace sidebar background
content = content.replace(
    /bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700/g,
    'bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border-r border-slate-200/50 dark:border-slate-700/50'
);

// Replace main content background if present? Wait, the container background is `bg-[#F0F4F8]` which is fine as the page background.
// But we want to ensure elements have glassmorphism.

// Top header in Layout:
content = content.replace(
    /bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700/g,
    'bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50'
);

// Bottom nav:
content = content.replace(
    /bg-white dark:bg-slate-800 shadow-t-lg border-t border-slate-100 dark:border-slate-700/g,
    'bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl shadow-t-lg border-t border-slate-100/50 dark:border-slate-700/50'
);

fs.writeFileSync(file, content);
console.log('Fixed Layout glassmorphism');
