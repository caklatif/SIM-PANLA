const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../components/Layout.tsx');
let content = fs.readFileSync(file, 'utf8');

const t1 = `{!isAdmin && !isOperator && !isHeadmaster && notifications.length > 0 && (
                        <div className="relative group">
                            <div className="absolute inset-0 rounded-full overflow-hidden shadow-sm">
                                <div className="absolute inset-[-100%] z-0 animate-[spin_4s_linear_infinite]" style={{ background: \`conic-gradient(from 0deg, transparent 0 340deg, \${hasUnfilled ? '#ef4444' : '#22c55e'} 360deg)\` }}></div>
                            </div>
                            <button onClick={() => setShowNotifModal(true)} className="relative z-10 w-[34px] h-[34px] m-[2px] bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-300 border border-slate-200 dark:border-slate-600 transition-transform active:scale-95">
                                <Bell size={16} />
                            </button>
                            <span className={\`absolute -top-1 -right-1 z-20 min-w-[16px] h-[16px] flex items-center justify-center text-[10px] font-bold text-white border-2 border-slate-50 dark:border-slate-800 rounded-full px-[3px] \${hasUnfilled ? 'bg-red-500' : 'bg-emerald-500'}\`}>
                                {notifications.length}
                            </span>
                        </div>
                    )}`;

const r1 = `{!isAdmin && !isOperator && !isHeadmaster && notifications.length > 0 && (
                        <div className="relative group">
                            {hasUnfilled && (
                                <div className="absolute inset-0 rounded-full overflow-hidden shadow-sm">
                                    <div className="absolute inset-[-100%] z-0 animate-[spin_4s_linear_infinite]" style={{ background: 'conic-gradient(from 0deg, transparent 0 340deg, #ef4444 360deg)' }}></div>
                                </div>
                            )}
                            <button onClick={() => setShowNotifModal(true)} className="relative z-10 w-[34px] h-[34px] m-[2px] bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-300 border border-slate-200 dark:border-slate-600 transition-transform active:scale-95">
                                <Bell size={16} />
                            </button>
                            {hasUnfilled && (
                                <span className="absolute -top-1 -right-1 z-20 min-w-[16px] h-[16px] flex items-center justify-center text-[10px] font-bold text-white border-2 border-slate-50 dark:border-slate-800 rounded-full px-[3px] bg-red-500">
                                    {notifications.filter(n => !n.isFilled).length}
                                </span>
                            )}
                        </div>
                    )}`;

content = content.replace(t1, r1);

const t2 = `{!isAdmin && !isOperator && !isHeadmaster && notifications.length > 0 && (
                      <div className="relative group hover:scale-105 transition-transform">
                          <div className="absolute inset-0 rounded-full overflow-hidden shadow-sm">
                              <div className="absolute inset-[-100%] z-0 animate-[spin_4s_linear_infinite]" style={{ background: \`conic-gradient(from 0deg, transparent 0 340deg, \${hasUnfilled ? '#ef4444' : '#22c55e'} 360deg)\` }}></div>
                          </div>
                          <button onClick={() => setShowNotifModal(true)} className="relative z-10 w-[34px] h-[34px] m-[2px] bg-white dark:bg-slate-800 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-300 border border-slate-200 dark:border-slate-600 transition-transform active:scale-95">
                              <Bell size={16} />
                          </button>
                          <span className={\`absolute -top-1 -right-1 z-20 min-w-[16px] h-[16px] flex items-center justify-center text-[10px] font-bold text-white border-2 border-white dark:border-slate-800 rounded-full px-[3px] \${hasUnfilled ? 'bg-red-500' : 'bg-emerald-500'}\`}>
                              {notifications.length}
                          </span>
                      </div>
                  )}`;

const r2 = `{!isAdmin && !isOperator && !isHeadmaster && notifications.length > 0 && (
                      <div className="relative group hover:scale-105 transition-transform">
                          {hasUnfilled && (
                              <div className="absolute inset-0 rounded-full overflow-hidden shadow-sm">
                                  <div className="absolute inset-[-100%] z-0 animate-[spin_4s_linear_infinite]" style={{ background: 'conic-gradient(from 0deg, transparent 0 340deg, #ef4444 360deg)' }}></div>
                              </div>
                          )}
                          <button onClick={() => setShowNotifModal(true)} className="relative z-10 w-[34px] h-[34px] m-[2px] bg-white dark:bg-slate-800 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-300 border border-slate-200 dark:border-slate-600 transition-transform active:scale-95">
                              <Bell size={16} />
                          </button>
                          {hasUnfilled && (
                              <span className="absolute -top-1 -right-1 z-20 min-w-[16px] h-[16px] flex items-center justify-center text-[10px] font-bold text-white border-2 border-white dark:border-slate-800 rounded-full px-[3px] bg-red-500">
                                  {notifications.filter(n => !n.isFilled).length}
                              </span>
                          )}
                      </div>
                  )}`;

content = content.replace(t2, r2);

fs.writeFileSync(file, content);
console.log('Fixed bell badge visibility on green state');
