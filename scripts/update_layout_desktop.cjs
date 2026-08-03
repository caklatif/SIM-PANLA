const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../components/Layout.tsx');
let content = fs.readFileSync(file, 'utf8');

const targetStr = `<div className="flex items-center gap-4 text-xs font-bold text-slate-500 dark:text-slate-400">
                  <span>{formattedDate}</span>
                  <span className="font-mono text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">{formattedTime} WIB</span>
              </div>`;

const replacementStr = `<div className="flex items-center gap-4 text-xs font-bold text-slate-500 dark:text-slate-400">
                  {!isAdmin && !isOperator && !isHeadmaster && (
                      <button onClick={() => setShowNotifModal(true)} className="relative w-9 h-9 bg-slate-50 dark:bg-slate-700 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-300 border border-slate-200 dark:border-slate-600 transition-transform hover:scale-105 active:scale-95">
                          <Bell size={18} />
                          {hasUnfilled && (
                              <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 border-2 border-white dark:border-slate-800 rounded-full"></span>
                          )}
                      </button>
                  )}
                  <span>{formattedDate}</span>
                  <span className="font-mono text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">{formattedTime} WIB</span>
                  <button onClick={handleLogoutClick} className="w-9 h-9 ml-2 bg-slate-50 dark:bg-slate-700 rounded-full flex items-center justify-center text-gray-500 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors border border-slate-200 dark:border-slate-600 flex-shrink-0">
                      <LogOut size={18}/>
                  </button>
              </div>`;

content = content.replace(targetStr, replacementStr);
fs.writeFileSync(file, content);
console.log('Added desktop notification bell');
