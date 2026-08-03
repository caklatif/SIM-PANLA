const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../pages/PublicDashboard.tsx');
let content = fs.readFileSync(file, 'utf8');

const targetStr = `{/* LOGIN */}
            <div className="pt-2">
                <button 
                    onClick={() => setShowLoginModal(true)} 
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold text-lg py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-blue-200 dark:shadow-none active:translate-y-0.5 transition-all"
                >
                    <LogIn size={24} /> Login Sebagai
                </button>
            </div>`;

const replacementStr = `{/* LOGIN */}
            <div className="pt-2">
                <div className="relative p-[3px] rounded-2xl overflow-hidden group">
                    <div className="absolute inset-[-100%] z-0 animate-[spin_4s_linear_infinite]" style={{ background: 'conic-gradient(from 0deg, transparent 0 340deg, #f59e0b 360deg)' }}></div>
                    <button 
                        onClick={() => setShowLoginModal(true)} 
                        className="relative z-10 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg py-4 rounded-[14px] flex items-center justify-center gap-2 shadow-lg shadow-blue-200 dark:shadow-none active:translate-y-0.5 transition-all"
                    >
                        <LogIn size={24} /> Login Sebagai
                    </button>
                </div>
            </div>`;

content = content.replace(targetStr, replacementStr);
fs.writeFileSync(file, content);
console.log('Fixed Login button glow in PublicDashboard.tsx');
