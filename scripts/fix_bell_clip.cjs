const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../components/Layout.tsx');
let content = fs.readFileSync(file, 'utf8');

// Replace Mobile Bell
const mTarget = `<div className="relative p-[2px] rounded-full overflow-hidden shadow-sm group">
                            <div className="absolute inset-[-100%] z-0 animate-[spin_4s_linear_infinite]" style={{ background: \`conic-gradient(from 0deg, transparent 0 340deg, \${hasUnfilled ? '#ef4444' : '#22c55e'} 360deg)\` }}></div>
                            <button onClick={() => setShowNotifModal(true)} className="relative z-10 w-[34px] h-[34px] bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-300 border border-slate-200 dark:border-slate-600 transition-transform active:scale-95">
                                <Bell size={16} />
                                <span className={\`absolute -top-1 -right-1 min-w-[16px] h-[16px] flex items-center justify-center text-[10px] font-bold text-white border-2 border-slate-50 dark:border-slate-800 rounded-full px-[3px] \${hasUnfilled ? 'bg-red-500' : 'bg-emerald-500'}\`}>
                                    {notifications.length}
                                </span>
                            </button>
                        </div>`;
const mRep = `<div className="relative group">
                            <div className="absolute inset-0 rounded-full overflow-hidden shadow-sm">
                                <div className="absolute inset-[-100%] z-0 animate-[spin_4s_linear_infinite]" style={{ background: \`conic-gradient(from 0deg, transparent 0 340deg, \${hasUnfilled ? '#ef4444' : '#22c55e'} 360deg)\` }}></div>
                            </div>
                            <button onClick={() => setShowNotifModal(true)} className="relative z-10 w-[34px] h-[34px] m-[2px] bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-300 border border-slate-200 dark:border-slate-600 transition-transform active:scale-95">
                                <Bell size={16} />
                            </button>
                            <span className={\`absolute top-0 right-0 z-20 min-w-[16px] h-[16px] flex items-center justify-center text-[10px] font-bold text-white border-2 border-slate-50 dark:border-slate-800 rounded-full px-[3px] \${hasUnfilled ? 'bg-red-500' : 'bg-emerald-500'}\`}>
                                {notifications.length}
                            </span>
                        </div>`;
content = content.replace(mTarget, mRep);

// Replace Desktop Bell
const dTarget = `<div className="relative p-[2px] rounded-full overflow-hidden shadow-sm group hover:scale-105 transition-transform">
                          <div className="absolute inset-[-100%] z-0 animate-[spin_4s_linear_infinite]" style={{ background: \`conic-gradient(from 0deg, transparent 0 340deg, \${hasUnfilled ? '#ef4444' : '#22c55e'} 360deg)\` }}></div>
                          <button onClick={() => setShowNotifModal(true)} className="relative z-10 w-[34px] h-[34px] bg-white dark:bg-slate-800 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-300 border border-slate-200 dark:border-slate-600 transition-transform active:scale-95">
                              <Bell size={16} />
                              <span className={\`absolute -top-1 -right-1 min-w-[16px] h-[16px] flex items-center justify-center text-[10px] font-bold text-white border-2 border-white dark:border-slate-800 rounded-full px-[3px] \${hasUnfilled ? 'bg-red-500' : 'bg-emerald-500'}\`}>
                                  {notifications.length}
                              </span>
                          </button>
                      </div>`;
const dRep = `<div className="relative group hover:scale-105 transition-transform">
                          <div className="absolute inset-0 rounded-full overflow-hidden shadow-sm">
                              <div className="absolute inset-[-100%] z-0 animate-[spin_4s_linear_infinite]" style={{ background: \`conic-gradient(from 0deg, transparent 0 340deg, \${hasUnfilled ? '#ef4444' : '#22c55e'} 360deg)\` }}></div>
                          </div>
                          <button onClick={() => setShowNotifModal(true)} className="relative z-10 w-[34px] h-[34px] m-[2px] bg-white dark:bg-slate-800 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-300 border border-slate-200 dark:border-slate-600 transition-transform active:scale-95">
                              <Bell size={16} />
                          </button>
                          <span className={\`absolute top-0 right-0 z-20 min-w-[16px] h-[16px] flex items-center justify-center text-[10px] font-bold text-white border-2 border-white dark:border-slate-800 rounded-full px-[3px] \${hasUnfilled ? 'bg-red-500' : 'bg-emerald-500'}\`}>
                              {notifications.length}
                          </span>
                      </div>`;
content = content.replace(dTarget, dRep);

fs.writeFileSync(file, content);
console.log('Fixed Bell clipping');
