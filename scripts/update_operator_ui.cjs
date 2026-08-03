const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../pages/OperatorDashboard.tsx');
let content = fs.readFileSync(file, 'utf8');

const targetStr = '<h2 className="text-lg font-extrabold text-slate-800 leading-tight">Dashboard Monitoring KBM</h2>';
const replacementStr = `<h2 className="text-lg font-extrabold text-slate-800 leading-tight">Dashboard Monitoring KBM</h2>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700">T.A: {academicYear}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-700">Semester: {semester}</span>
                    </div>`;

content = content.replace(targetStr, replacementStr);
fs.writeFileSync(file, content);
console.log('Updated OperatorDashboard UI');
