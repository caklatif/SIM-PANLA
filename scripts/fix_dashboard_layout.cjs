const fs = require('fs');
const path = require('path');
const dashboardFile = path.join(__dirname, '../pages/Dashboard.tsx');
const layoutFile = path.join(__dirname, '../components/Layout.tsx');

let layoutContent = fs.readFileSync(layoutFile, 'utf8');

const t = `<div key={i} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-100 dark:border-slate-600">
                              <div>
                                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{n.subject} - Kelas {n.kelas}</p>
                                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Jam ke-{n.hour}</p>
                              </div>
                              <div>
                                  {n.isFilled ? (
                                      <CheckCircle2 size={24} className="text-emerald-500" />
                                  ) : (
                                      <XCircle size={24} className="text-red-500" />
                                  )}
                              </div>
                          </div>`;
const r = `<button 
                              key={i} 
                              onClick={() => { setShowNotifModal(false); navigate('/apps'); }}
                              className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl border border-slate-100 dark:border-slate-600 transition-colors text-left group"
                          >
                              <div>
                                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{n.subject} - Kelas {n.kelas}</p>
                                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Jam ke-{n.hour}</p>
                              </div>
                              <div>
                                  {n.isFilled ? (
                                      <CheckCircle2 size={24} className="text-emerald-500" />
                                  ) : (
                                      <XCircle size={24} className="text-red-500" />
                                  )}
                              </div>
                          </button>`;
layoutContent = layoutContent.replace(t, r);
fs.writeFileSync(layoutFile, layoutContent);
console.log('Fixed Layout.tsx');

let dashboardContent = fs.readFileSync(dashboardFile, 'utf8');

// Dashboard was updated to show date instead of count
// Let's modify the class progress mapped array

// Search for the replacement target (rendered map) in Dashboard.tsx
const dRenderT = `<div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-lg shadow-sm border border-blue-200 dark:border-blue-800 min-w-[3rem]">{j.kelas}</div>
                                            <div>
                                                <h4 className="font-bold text-slate-700 dark:text-white text-sm flex items-center gap-2">Kelas {j.kelas}</h4>
                                                <p className="text-xs text-slate-400 font-medium flex items-center gap-1">
                                                    <Calendar size={10} /> 
                                                    {new Date(j.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-3 relative z-10">
                                        <p className="text-xs font-bold text-slate-500 mb-1">Materi yang diajar:</p>`;

const dRenderR = `<div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-lg shadow-sm border border-blue-200 dark:border-blue-800 min-w-[3rem]">{j.kelas}</div>
                                            <div>
                                                <h4 className="font-bold text-slate-700 dark:text-white text-sm flex items-center gap-2">Kelas {j.kelas}</h4>
                                                <p className="text-xs text-blue-500 dark:text-blue-400 font-bold flex items-center gap-1">
                                                    <Calendar size={10} /> 
                                                    {new Date(j.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-3 relative z-10">
                                        <p className="text-xs font-bold text-slate-500 mb-1">Materi yang diajar:</p>`;
dashboardContent = dashboardContent.replace(dRenderT, dRenderR);

fs.writeFileSync(dashboardFile, dashboardContent);
console.log('Fixed Dashboard.tsx dates and labels');
