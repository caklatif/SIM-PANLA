const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../pages/Login.tsx');
let content = fs.readFileSync(file, 'utf8');

// Inject the academic year pill
const insertionTarget = /<p className="text-center text-slate-500 dark:text-slate-400 font-bold text-sm mb-2 uppercase tracking-widest">Masuk Sebagai<\/p>/;
const pillHTML = `
              <div className="flex justify-center mb-6">
                  <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200 dark:border-slate-700 px-6 py-2 rounded-full shadow-sm text-sm font-bold text-slate-700 dark:text-slate-300">
                      Tahun Ajaran: {academicYear} | Semester: {semester}
                  </div>
              </div>
              <p className="text-center text-slate-500 dark:text-slate-400 font-bold text-sm mb-2 uppercase tracking-widest">Masuk Sebagai</p>
`;

content = content.replace(insertionTarget, pillHTML);

// Apply glassmorphism to the role buttons and form container
content = content.replace(/className="bg-white dark:bg-slate-800 hover:bg-blue-50/g, 'className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-md hover:bg-blue-50');
content = content.replace(/className="bg-white dark:bg-slate-800 hover:bg-orange-50/g, 'className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-md hover:bg-orange-50');
content = content.replace(/className="bg-white dark:bg-slate-800 hover:bg-slate-50/g, 'className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-md hover:bg-slate-50');
content = content.replace(/className="w-full max-w-sm bg-white dark:bg-slate-800/g, 'className="w-full max-w-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl');

fs.writeFileSync(file, content);
console.log('Fixed Login glassmorphism');
