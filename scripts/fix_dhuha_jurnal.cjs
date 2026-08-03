const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../pages/JurnalForm.tsx');
let content = fs.readFileSync(file, 'utf8');

// Fix step 1 table header
content = content.replace(
    `<th className="p-2 sm:p-3 w-[25%] text-center" title="Tidak Hadir (Alpa)">TH</th>\n                                                               <th className="p-2 sm:p-3 w-[25%] text-center" title="Dispensasi">D</th>`,
    `<th className="p-2 sm:p-3 w-[50%] text-center" title="Tidak Hadir (Alpa)">TH</th>`
);

// Fix step 1 checkbox for Dhuha (remove D checkbox, let TH map to A)
const oldCheckboxDhuha = `<td className="p-1 sm:p-2 text-center align-middle">
                                                                           <div className="flex justify-center">
                                                                               <input type="checkbox" className="w-4 h-4 sm:w-5 sm:h-5 rounded border-2 border-slate-300 focus:ring-0 cursor-pointer text-red-500 focus:ring-red-500 checked:bg-red-500 checked:border-red-500" checked={formData.attendance[student.id] === 'A'} onChange={() => { const newAtt = {...formData.attendance}; if (newAtt[student.id] === 'A') delete newAtt[student.id]; else newAtt[student.id] = 'A'; setFormData({...formData, attendance: newAtt}); }} />
                                                                           </div>
                                                                       </td>
                                                                       <td className="p-1 sm:p-2 text-center align-middle">
                                                                           <div className="flex justify-center">
                                                                               <input type="checkbox" className="w-4 h-4 sm:w-5 sm:h-5 rounded border-2 border-slate-300 focus:ring-0 cursor-pointer text-purple-500 focus:ring-purple-500 checked:bg-purple-500 checked:border-purple-500" checked={formData.attendance[student.id] === 'D'} onChange={() => { const newAtt = {...formData.attendance}; if (newAtt[student.id] === 'D') delete newAtt[student.id]; else newAtt[student.id] = 'D'; setFormData({...formData, attendance: newAtt}); }} />
                                                                           </div>
                                                                       </td>`;
const newCheckboxDhuha = `<td className="p-1 sm:p-2 text-center align-middle">
                                                                           <div className="flex justify-center">
                                                                               <input type="checkbox" className="w-4 h-4 sm:w-5 sm:h-5 rounded border-2 border-slate-300 focus:ring-0 cursor-pointer text-red-500 focus:ring-red-500 checked:bg-red-500 checked:border-red-500" checked={formData.attendance[student.id] === 'A'} onChange={() => { const newAtt = {...formData.attendance}; if (newAtt[student.id] === 'A') delete newAtt[student.id]; else newAtt[student.id] = 'A'; setFormData({...formData, attendance: newAtt}); }} />
                                                                           </div>
                                                                       </td>`;
content = content.replace(oldCheckboxDhuha, newCheckboxDhuha);

// Fix step 2 button to say Kirim Data and call handleSubmit if isDhuha
const oldBtn = `<button disabled={!formData.subject || !formData.material} onClick={handleNext} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-200 disabled:opacity-50 disabled:shadow-none transition-all">Lanjut <ArrowRight size={18} /></button>`;
const newBtn = `<button disabled={!formData.subject || !formData.material || isSubmitting} onClick={isDhuha ? handleSubmit : handleNext} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-200 disabled:opacity-50 disabled:shadow-none transition-all">{isDhuha ? (isSubmitting ? 'Mengirim...' : 'Kirim Data') : 'Lanjut'} {isDhuha ? <Check size={18} /> : <ArrowRight size={18} />}</button>`;
content = content.replace(oldBtn, newBtn);

fs.writeFileSync(file, content);
console.log('Fixed Dhuha form behavior');
