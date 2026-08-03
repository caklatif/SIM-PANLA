const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../pages/AppsMenu.tsx');
let content = fs.readFileSync(file, 'utf8');

// Update AppCard to glassmorphism
const appCardRegex = /className="bg-white dark:bg-slate-800 rounded-\[2rem\] p-6 flex flex-col items-center justify-center gap-5 shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-xl hover:border-blue-200 dark:hover:border-blue-500\/30 hover:-translate-y-1\.5 transition-all duration-300 w-full h-52 group relative overflow-hidden"/;

content = content.replace(
    appCardRegex,
    `className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-[2rem] p-6 flex flex-col items-center justify-center gap-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 dark:border-slate-700/50 hover:shadow-xl hover:border-white/80 dark:hover:border-slate-600 hover:-translate-y-1.5 transition-all duration-300 w-full h-52 group relative overflow-hidden"`
);

const iconRegex = /className={`w-20 h-20 rounded-3xl flex items-center justify-center text-white shadow-\[0_12px_25px_-8px_rgba\(0,0,0,0\.3\)\] border-t border-white\/40 relative z-10 transform transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 \$\{gradientClass\}`}/;

content = content.replace(
    iconRegex,
    `className={\`w-20 h-20 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-\${gradientClass.split('-')[gradientClass.split('-').length-1]}/30 border-t border-white/40 relative z-10 transform transition-all duration-500 group-hover:scale-110 group-hover:-rotate-3 \${gradientClass}\`}`
);

fs.writeFileSync(file, content);
console.log('Fixed AppsMenu glassmorphism');
