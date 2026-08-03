const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../pages/JurnalForm.tsx');
let content = fs.readFileSync(file, 'utf8');

// Fix default H
content = content.replace("let prevStatusDisplay = '-';", "let prevStatusDisplay = 'H';");
content = content.replace("let prevStatusColor = 'bg-slate-100 text-slate-400';", "let prevStatusColor = 'bg-green-100 text-green-700 border-green-200';");

// Bring back 'D' for Dhuha
const oldDhuhaHeader = `<th className="p-2 sm:p-3 w-[50%] text-center" title="Tidak Hadir (Alpa)">TH</th>`;
const newDhuhaHeader = `<th className="p-2 sm:p-3 w-[25%] text-center" title="Tidak Hadir (Alpa)">TH</th>
                                                               <th className="p-2 sm:p-3 w-[25%] text-center" title="Dispensasi">D</th>`;
content = content.replace(oldDhuhaHeader, newDhuhaHeader);

const oldDhuhaCheck = `<td className="p-1 sm:p-2 text-center align-middle">
                                                                           <div className="flex justify-center">
                                                                               <input type="checkbox" className="w-4 h-4 sm:w-5 sm:h-5 rounded border-2 border-slate-300 focus:ring-0 cursor-pointer text-red-500 focus:ring-red-500 checked:bg-red-500 checked:border-red-500" checked={formData.attendance[student.id] === 'A'} onChange={() => { const newAtt = {...formData.attendance}; if (newAtt[student.id] === 'A') delete newAtt[student.id]; else newAtt[student.id] = 'A'; setFormData({...formData, attendance: newAtt}); }} />
                                                                           </div>
                                                                       </td>`;
const newDhuhaCheck = `<td className="p-1 sm:p-2 text-center align-middle">
                                                                           <div className="flex justify-center">
                                                                               <input type="checkbox" className="w-4 h-4 sm:w-5 sm:h-5 rounded border-2 border-slate-300 focus:ring-0 cursor-pointer text-red-500 focus:ring-red-500 checked:bg-red-500 checked:border-red-500" checked={formData.attendance[student.id] === 'A'} onChange={() => { const newAtt = {...formData.attendance}; if (newAtt[student.id] === 'A') delete newAtt[student.id]; else newAtt[student.id] = 'A'; setFormData({...formData, attendance: newAtt}); }} />
                                                                           </div>
                                                                       </td>
                                                                       <td className="p-1 sm:p-2 text-center align-middle">
                                                                           <div className="flex justify-center">
                                                                               <input type="checkbox" className="w-4 h-4 sm:w-5 sm:h-5 rounded border-2 border-slate-300 focus:ring-0 cursor-pointer text-purple-500 focus:ring-purple-500 checked:bg-purple-500 checked:border-purple-500" checked={formData.attendance[student.id] === 'D'} onChange={() => { const newAtt = {...formData.attendance}; if (newAtt[student.id] === 'D') delete newAtt[student.id]; else newAtt[student.id] = 'D'; setFormData({...formData, attendance: newAtt}); }} />
                                                                           </div>
                                                                       </td>`;
content = content.replace(oldDhuhaCheck, newDhuhaCheck);

fs.writeFileSync(file, content);
console.log('Fixed H default and Dhuha D checkbox');
