const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../components/Layout.tsx');
let content = fs.readFileSync(file, 'utf8');

const targetNav = `<div className="md:hidden fixed bottom-6 left-0 right-0 z-40 flex justify-center pointer-events-none pb-[env(safe-area-inset-bottom)]">
            <nav className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border border-slate-200 dark:border-slate-700 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex items-center p-2 pointer-events-auto gap-2 max-w-[95vw]">`;

const replacementNav = `<div className="md:hidden fixed bottom-6 left-0 right-0 z-40 flex justify-center pointer-events-none pb-[env(safe-area-inset-bottom)]">
            <div className="relative pointer-events-auto p-[2px] rounded-full overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.12)] max-w-[95vw] group">
                {/* Animated Glow Border */}
                <div className="absolute inset-[-100%] z-0 animate-[spin_4s_linear_infinite]" style={{ background: 'conic-gradient(from 0deg, transparent 0 340deg, #3b82f6 360deg)' }}></div>
                <nav className="relative z-10 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-full flex items-center p-2 gap-2 w-full h-full border border-slate-200/50 dark:border-slate-700/50">`;

content = content.replace(targetNav, replacementNav);

// Also need to close the extra div
const targetNavClose = `</nav>
        </div>
      )`;

const replacementNavClose = `</nav>
            </div>
        </div>
      )`;
      
content = content.replace(targetNavClose, replacementNavClose);

fs.writeFileSync(file, content);
console.log('Updated Layout.tsx for nav glow');
