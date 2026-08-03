const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../components/Layout.tsx');
let content = fs.readFileSync(file, 'utf8');

// Fix setHasUnfilled
content = content.replace(
  'setHasUnfilled(notifs.length > 0);',
  'setHasUnfilled(notifs.some(n => !n.isFilled));'
);

// We need to replace the bell button in Mobile Header
const mobileTarget = `{!isAdmin && !isOperator && !isHeadmaster && (
        <button onClick={() => setShowNotifModal(true)} className="relative w-9 h-9 bg-slate-50 dark:bg-slate-700 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-300 border border-slate-200 dark:border-slate-600 transition-transform active:scale-95">
            <Bell size={18} />
            {hasUnfilled && (
                <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 border-2 border-white dark:border-slate-800 rounded-full"></span>
            )}
        </button>
     )}`;

const bellReplacement = `{!isAdmin && !isOperator && !isHeadmaster && notifications.length > 0 && (
                        <div className="relative p-[2px] rounded-full overflow-hidden shadow-sm group">
                            <div className="absolute inset-[-100%] z-0 animate-[spin_4s_linear_infinite]" style={{ background: \`conic-gradient(from 0deg, transparent 0 340deg, \${hasUnfilled ? '#ef4444' : '#22c55e'} 360deg)\` }}></div>
                            <button onClick={() => setShowNotifModal(true)} className="relative z-10 w-[34px] h-[34px] bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-300 border border-slate-200 dark:border-slate-600 transition-transform active:scale-95">
                                <Bell size={16} />
                                <span className={\`absolute -top-1 -right-1 min-w-[16px] h-[16px] flex items-center justify-center text-[10px] font-bold text-white border-2 border-slate-50 dark:border-slate-800 rounded-full px-[3px] \${hasUnfilled ? 'bg-red-500' : 'bg-emerald-500'}\`}>
                                    {notifications.length}
                                </span>
                            </button>
                        </div>
                    )}
                    {!isAdmin && !isOperator && !isHeadmaster && notifications.length === 0 && (
                        <button onClick={() => setShowNotifModal(true)} className="relative w-9 h-9 bg-slate-50 dark:bg-slate-700 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-300 border border-slate-200 dark:border-slate-600 transition-transform active:scale-95">
                            <Bell size={18} />
                        </button>
                    )}`;

content = content.replace(mobileTarget, bellReplacement);

const desktopTarget = `{!isAdmin && !isOperator && !isHeadmaster && (
                      <button onClick={() => setShowNotifModal(true)} className="relative w-9 h-9 bg-slate-50 dark:bg-slate-700 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-300 border border-slate-200 dark:border-slate-600 transition-transform hover:scale-105 active:scale-95">
                          <Bell size={18} />
                          {hasUnfilled && (
                              <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 border-2 border-white dark:border-slate-800 rounded-full"></span>
                          )}
                      </button>
                  )}`;

const desktopBellReplacement = `{!isAdmin && !isOperator && !isHeadmaster && notifications.length > 0 && (
                      <div className="relative p-[2px] rounded-full overflow-hidden shadow-sm group hover:scale-105 transition-transform">
                          <div className="absolute inset-[-100%] z-0 animate-[spin_4s_linear_infinite]" style={{ background: \`conic-gradient(from 0deg, transparent 0 340deg, \${hasUnfilled ? '#ef4444' : '#22c55e'} 360deg)\` }}></div>
                          <button onClick={() => setShowNotifModal(true)} className="relative z-10 w-[34px] h-[34px] bg-white dark:bg-slate-800 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-300 border border-slate-200 dark:border-slate-600 transition-transform active:scale-95">
                              <Bell size={16} />
                              <span className={\`absolute -top-1 -right-1 min-w-[16px] h-[16px] flex items-center justify-center text-[10px] font-bold text-white border-2 border-white dark:border-slate-800 rounded-full px-[3px] \${hasUnfilled ? 'bg-red-500' : 'bg-emerald-500'}\`}>
                                  {notifications.length}
                              </span>
                          </button>
                      </div>
                  )}
                  {!isAdmin && !isOperator && !isHeadmaster && notifications.length === 0 && (
                      <button onClick={() => setShowNotifModal(true)} className="relative w-9 h-9 bg-slate-50 dark:bg-slate-700 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-300 border border-slate-200 dark:border-slate-600 transition-transform hover:scale-105 active:scale-95">
                          <Bell size={18} />
                      </button>
                  )}`;

content = content.replace(desktopTarget, desktopBellReplacement);

fs.writeFileSync(file, content);
console.log('Fixed Bell buttons in Layout.tsx');
