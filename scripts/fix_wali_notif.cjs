const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../components/Layout.tsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Add state
const oldState = `const [notifications, setNotifications] = useState<any[]>([]);`;
const newState = `const [notifications, setNotifications] = useState<any[]>([]);
  const [waliNotifications, setWaliNotifications] = useState<any[]>([]);`;
content = content.replace(oldState, newState);

// 2. Add fetch logic
const oldFetchEnd = `setHasUnfilled(notifs.some(n => !n.isFilled));`;
const newFetchEnd = `setHasUnfilled(notifs.some(n => !n.isFilled));

                    let waliNotifs: any[] = [];
                    if (profile.wali_kelas) {
                        const { data: students } = await supabase.from('students').select('id, name')
                            .eq('kelas', profile.wali_kelas)
                            .eq('academic_year', academicYear || '2025/2026');
                        
                        if (students && students.length > 0) {
                            const studentIds = students.map((s: any) => s.id);
                            
                            // Fetch absences
                            const { data: absences } = await supabase.from('attendance_logs').select('id, student_name, teacher_name, subject, created_at')
                                .in('student_id', studentIds)
                                .eq('status', 'A')
                                .gte('created_at', todayStart)
                                .lte('created_at', todayEnd);
                                
                            // Fetch discipline notes
                            const { data: notes } = await supabase.from('journal_notes').select('id, student_name, category, note, created_at, journal_id')
                                .in('student_id', studentIds)
                                .eq('type', 'kedisiplinan')
                                .gte('created_at', todayStart)
                                .lte('created_at', todayEnd);
                                
                            if (absences) {
                                absences.forEach((a: any) => {
                                    waliNotifs.push({
                                        type: 'absence',
                                        studentName: a.student_name,
                                        teacherName: a.teacher_name,
                                        subject: a.subject,
                                        createdAt: new Date(a.created_at).getTime(),
                                        message: \`Alpa di mapel \${a.subject || '-'} (\${a.teacher_name || '-'}) \`
                                    });
                                });
                            }
                            if (notes) {
                                notes.forEach((n: any) => {
                                    waliNotifs.push({
                                        type: 'discipline',
                                        studentName: n.student_name,
                                        category: n.category,
                                        note: n.note,
                                        createdAt: new Date(n.created_at).getTime(),
                                        message: \`\${n.category || 'Pelanggaran'}: \${n.note || '-'}\`
                                    });
                                });
                            }
                        }
                    }
                    waliNotifs.sort((a,b) => b.createdAt - a.createdAt);
                    setWaliNotifications(waliNotifs);`;
content = content.replace(oldFetchEnd, newFetchEnd);

// 3. Add to UI
const oldUI = `              <div className="space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar pr-1">
                  {notifications.length === 0 ? (
                      <div className="text-center py-6">
                          <p className="text-sm font-bold text-gray-500 dark:text-gray-400">Tidak ada jadwal mengajar hari ini.</p>
                      </div>
                  ) : (
                      notifications.map((n, i) => (
                          <button 
                              key={i} 
                              onClick={() => { setShowNotifModal(false); navigate('/jurnal', { state: { scheduleId: n.id } }); }}
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
                          </button>
                      ))
                  )}
              </div>`;

const newUI = `              <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-1">
                  <div>
                    {notifications.length === 0 ? (
                        <div className="text-center py-4">
                            <p className="text-sm font-bold text-gray-500 dark:text-gray-400">Tidak ada jadwal mengajar hari ini.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                        {notifications.map((n, i) => (
                            <button 
                                key={i} 
                                onClick={() => { setShowNotifModal(false); navigate('/jurnal', { state: { scheduleId: n.id } }); }}
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
                            </button>
                        ))}
                        </div>
                    )}
                  </div>

                  {waliNotifications.length > 0 && (
                      <div className="border-t border-gray-100 dark:border-slate-700 pt-4">
                          <h4 className="text-sm font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-2"><Bell size={16} className="text-amber-500"/> Notifikasi Wali Kelas</h4>
                          <div className="space-y-2">
                              {waliNotifications.map((wn, i) => (
                                  <div key={'wn'+i} className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-800/30">
                                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{wn.studentName}</p>
                                      <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mt-1">{wn.message}</p>
                                  </div>
                              ))}
                          </div>
                      </div>
                  )}
              </div>`;
content = content.replace(oldUI, newUI);
fs.writeFileSync(file, content);
console.log('Fixed wali notif UI');
