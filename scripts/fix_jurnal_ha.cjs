const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../pages/JurnalForm.tsx');
let content = fs.readFileSync(file, 'utf8');

const target = `supabase.from('homeroom_attendance').select('student_id, status').eq('academic_year', academicYear || '2025/2026').eq('semester', semester || 'Ganjil').gte('date', semesterStart ? \`\${semesterStart}\` : '2000-01-01').lte('date', semesterEnd ? \`\${semesterEnd}\` : '2100-01-01').eq('date', todayStr).eq('kelas', selectedSchedule.kelas).then(({data}) => { if (data && data.length > 0) { const initialAttendance: Record<string, any> = {}; data.forEach(r => { if (['S', 'I', 'A', 'D'].includes(r.status)) { initialAttendance[r.student_id] = r.status; } }); setFormData(prev => ({...prev, attendance: initialAttendance})); } });`;
const newCode = `supabase.from('homeroom_attendance').select('student_id, status').eq('date', todayStr).eq('kelas', selectedSchedule.kelas).then(({data}) => { if (data && data.length > 0) { const initialAttendance: Record<string, any> = {}; data.forEach(r => { if (['S', 'I', 'A', 'D'].includes(r.status)) { initialAttendance[r.student_id] = r.status; } }); setFormData(prev => ({...prev, attendance: {...prev.attendance, ...initialAttendance}})); } });`;

content = content.replace(target, newCode);
fs.writeFileSync(file, content);
console.log('Fixed homeroom attendance fetch in JurnalForm');
