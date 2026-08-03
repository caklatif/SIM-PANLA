const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../pages/JurnalForm.tsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Add lockedAttendance state
if (!content.includes('lockedAttendance')) {
    content = content.replace(
        `const [formData, setFormData] = useState({`,
        `const [lockedAttendance, setLockedAttendance] = useState<string[]>([]);\n  const [formData, setFormData] = useState({`
    );
}

// 2. Update homeroom_attendance query
const targetQuery = `supabase.from('homeroom_attendance').select('student_id, status').eq('date', todayStr).eq('kelas', selectedSchedule.kelas).then(({data}) => { if (data && data.length > 0) { const initialAttendance: Record<string, any> = {}; data.forEach(r => { if (['S', 'I', 'A', 'D'].includes(r.status)) { initialAttendance[r.student_id] = r.status; } }); setFormData(prev => ({...prev, attendance: {...prev.attendance, ...initialAttendance}})); } });`;
const newQuery = `supabase.from('homeroom_attendance').select('student_id, status').eq('date', todayStr).eq('kelas', selectedSchedule.kelas).then(({data}) => { if (data && data.length > 0) { const initialAttendance: Record<string, any> = {}; const locked: string[] = []; data.forEach(r => { if (['S', 'I', 'A', 'D'].includes(r.status)) { initialAttendance[r.student_id] = r.status; locked.push(r.student_id); } }); setFormData(prev => ({...prev, attendance: {...prev.attendance, ...initialAttendance}})); setLockedAttendance(locked); } else { setLockedAttendance([]); } });`;

content = content.replace(targetQuery, newQuery);

// Also need to clear it out when an existing journal is opened or if it's cleared
const targetExisting = `setNotesData(loadedNotes);
          setFormData({ kelas: existing.kelas, subject: existing.subject, hours: existing.hours.split(',').map(s => s.trim()), material: existing.material, attendance: attendanceMap, cleanliness: existing.cleanliness as any, validation: existing.validation as any, notes: existing.notes || '', isConfirmed: existing.validation === 'hadir_kbm' });`;
const newExisting = `setNotesData(loadedNotes);
          setLockedAttendance([]);
          setFormData({ kelas: existing.kelas, subject: existing.subject, hours: existing.hours.split(',').map(s => s.trim()), material: existing.material, attendance: attendanceMap, cleanliness: existing.cleanliness as any, validation: existing.validation as any, notes: existing.notes || '', isConfirmed: existing.validation === 'hadir_kbm' });`;
content = content.replace(targetExisting, newExisting);

// 3. Update checkboxes
// A checkbox
const oldA = `<input type="checkbox" className="w-4 h-4 sm:w-5 sm:h-5 rounded border-2 border-slate-300 focus:ring-0 cursor-pointer text-red-500 focus:ring-red-500 checked:bg-red-500 checked:border-red-500" checked={formData.attendance[student.id] === 'A'} onChange={() => { const newAtt = {...formData.attendance}; if (newAtt[student.id] === 'A') delete newAtt[student.id]; else newAtt[student.id] = 'A'; setFormData({...formData, attendance: newAtt}); }} />`;
const newA = `<input type="checkbox" className="w-4 h-4 sm:w-5 sm:h-5 rounded border-2 border-slate-300 focus:ring-0 cursor-pointer text-red-500 focus:ring-red-500 checked:bg-red-500 checked:border-red-500 disabled:opacity-50 disabled:cursor-not-allowed" disabled={lockedAttendance.includes(student.id)} checked={formData.attendance[student.id] === 'A'} onChange={() => { const newAtt = {...formData.attendance}; if (newAtt[student.id] === 'A') delete newAtt[student.id]; else newAtt[student.id] = 'A'; setFormData({...formData, attendance: newAtt}); }} />`;
content = content.replace(oldA, newA);

// D checkbox
const oldD = `<input type="checkbox" className="w-4 h-4 sm:w-5 sm:h-5 rounded border-2 border-slate-300 focus:ring-0 cursor-pointer text-purple-500 focus:ring-purple-500 checked:bg-purple-500 checked:border-purple-500" checked={formData.attendance[student.id] === 'D'} onChange={() => { const newAtt = {...formData.attendance}; if (newAtt[student.id] === 'D') delete newAtt[student.id]; else newAtt[student.id] = 'D'; setFormData({...formData, attendance: newAtt}); }} />`;
const newD = `<input type="checkbox" className="w-4 h-4 sm:w-5 sm:h-5 rounded border-2 border-slate-300 focus:ring-0 cursor-pointer text-purple-500 focus:ring-purple-500 checked:bg-purple-500 checked:border-purple-500 disabled:opacity-50 disabled:cursor-not-allowed" disabled={lockedAttendance.includes(student.id)} checked={formData.attendance[student.id] === 'D'} onChange={() => { const newAtt = {...formData.attendance}; if (newAtt[student.id] === 'D') delete newAtt[student.id]; else newAtt[student.id] = 'D'; setFormData({...formData, attendance: newAtt}); }} />`;
content = content.replace(oldD, newD);

// Dynamic status checkbox
const oldDyn = `<input 
                                                                                   type="checkbox" 
                                                                                   className={\`w-4 h-4 sm:w-5 sm:h-5 rounded border-2 border-slate-300 focus:ring-0 cursor-pointer \${status === 'S' ? 'text-yellow-400 focus:ring-yellow-400 checked:bg-yellow-400 checked:border-yellow-400' : status === 'I' ? 'text-blue-400 focus:ring-blue-400 checked:bg-blue-400 checked:border-blue-400' : status === 'A' ? 'text-red-400 focus:ring-red-400 checked:bg-red-400 checked:border-red-400' : 'text-purple-400 focus:ring-purple-400 checked:bg-purple-400 checked:border-purple-400'}\`} 
                                                                                   checked={formData.attendance[student.id] === status} 
                                                                                   onChange={() => { const newAtt = {...formData.attendance}; if (newAtt[student.id] === status) delete newAtt[student.id]; else newAtt[student.id] = status as any; setFormData({...formData, attendance: newAtt}); }} 
                                                                               />`;
const newDyn = `<input 
                                                                                   type="checkbox" 
                                                                                   disabled={lockedAttendance.includes(student.id)}
                                                                                   className={\`w-4 h-4 sm:w-5 sm:h-5 rounded border-2 border-slate-300 focus:ring-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed \${status === 'S' ? 'text-yellow-400 focus:ring-yellow-400 checked:bg-yellow-400 checked:border-yellow-400' : status === 'I' ? 'text-blue-400 focus:ring-blue-400 checked:bg-blue-400 checked:border-blue-400' : status === 'A' ? 'text-red-400 focus:ring-red-400 checked:bg-red-400 checked:border-red-400' : 'text-purple-400 focus:ring-purple-400 checked:bg-purple-400 checked:border-purple-400'}\`} 
                                                                                   checked={formData.attendance[student.id] === status} 
                                                                                   onChange={() => { const newAtt = {...formData.attendance}; if (newAtt[student.id] === status) delete newAtt[student.id]; else newAtt[student.id] = status as any; setFormData({...formData, attendance: newAtt}); }} 
                                                                               />`;
content = content.replace(oldDyn, newDyn);

fs.writeFileSync(file, content);
console.log('Fixed locked attendance inputs');
