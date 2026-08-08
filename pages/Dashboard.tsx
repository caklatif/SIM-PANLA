
import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { 
  User, Bell, BookOpen, Clock, Stethoscope, CheckCircle2, XCircle, FileText, ClipboardList, 
  CalendarDays, TrendingUp, Users, Star, Edit2, Plus, X, Loader2, Save, Flag, Check, Minus, Calendar, ChevronUp, ChevronDown
} from 'lucide-react';
import { getWIBDate, getWIBISOString, formatDateIndo } from '../utils/dateUtils';
import { Student, Profile } from '../types';
import { showAlert, showConfirm } from '../utils/alert';

interface MonthlyStats {
    totalJp: number;
    targetJp: number;
    totalMeetings: number;
    monthJournals: Array<{ id: string, kelas: string, date: string, material: string, count: number }>;
}

interface WaliKelasAbsence {
    student_id: string; 
    student_name: string;
    kelas: string;
    status: string;
    source: 'wali' | 'guru'; 
    hours?: string; 
}

interface EditingStudent {
    student_id: string;
    student_name: string;
    currentStatus: string;
    newStatus: string;
    note: string;
}

interface KbmStatus {
    hour: number;
    className: string;
    isScheduled: boolean;
    isFilled: boolean;
}

interface TeacherMatrixItem {
    teacher: Profile;
    scheduleMap: Record<number, { className: string, isFilled: boolean, hasSchedule: boolean }>;
}

const Dashboard: React.FC = () => {
  const currentHour = new Date().getHours();
  let greeting = 'Selamat Malam';
  if (currentHour >= 5 && currentHour < 11) greeting = 'Selamat Pagi';
  else if (currentHour >= 11 && currentHour < 15) greeting = 'Selamat Siang';
  else if (currentHour >= 15 && currentHour < 18) greeting = 'Selamat Sore';

  const { isAdmin, isOperator, profile, academicYear, semester , activeScheduleVersion , semesterStart, semesterEnd } = useAuth();
  const isHeadmaster = profile?.mengajar_mapel === 'Kepala Sekolah' || profile?.role === 'admin'; 

  const [stats, setStats] = useState<MonthlyStats>({ totalJp: 0, targetJp: 0, totalMeetings: 0, monthJournals: [] });
  const [homeroomAbsences, setHomeroomAbsences] = useState<WaliKelasAbsence[]>([]);
  const [selectedWaliKelas, setSelectedWaliKelas] = useState<string>(() => profile?.wali_kelas || '7A');
  const [kbmStatus, setKbmStatus] = useState<KbmStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState(getWIBISOString());

  const activeWaliKelas = profile?.wali_kelas || selectedWaliKelas || '7A';

  useEffect(() => {
    if (profile?.wali_kelas) {
      setSelectedWaliKelas(profile.wali_kelas);
    }
  }, [profile?.wali_kelas]);

  // ACCORDION FORM STATE (Replaced Modal)
  const [showInputForm, setShowInputForm] = useState(false);
  const [modalStudents, setModalStudents] = useState<Student[]>([]);
  const [modalAttendance, setModalAttendance] = useState<Record<string, 'S' | 'I' | 'A' | 'D'>>({});
  
  const [showEditSpecificModal, setShowEditSpecificModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState('');
  const [specificAbsenceData, setSpecificAbsenceData] = useState<EditingStudent[]>([]);

  const [matrixData, setMatrixData] = useState<TeacherMatrixItem[]>([]);
  const [matrixDate, setMatrixDate] = useState(getWIBISOString());

  const [savingAttendance, setSavingAttendance] = useState(false);

  useEffect(() => {
    if (profile) {
        if (isHeadmaster) {
            fetchHeadmasterMatrix();
        } else {
            fetchDashboardData();
        }
    } else {
        setLoading(false);
    }
  }, [profile, filterDate, matrixDate, academicYear, semester, activeScheduleVersion, semesterStart, semesterEnd, selectedWaliKelas]); 

  // --- LOGIC KEPALA SEKOLAH (MATRIX SCHEDULE) ---
  const fetchHeadmasterMatrix = async () => {
      setLoading(true);
      try {
          const dateObj = new Date(matrixDate);
          const jsDay = dateObj.getDay();
          const dbDay = jsDay === 0 ? 7 : jsDay;
          
          const startOfDay = `${matrixDate}T00:00:00+07:00`;
          const endOfDay = `${matrixDate}T23:59:59+07:00`;

          const [profilesRes, schedulesRes, journalsRes] = await Promise.all([
              supabase.from('profiles').select('*').neq('role', 'operator').order('full_name'),
              supabase.from('schedules').select('*').eq('day_of_week', dbDay).eq('academic_year', academicYear || '2025/2026').eq('semester', semester || 'Ganjil').eq('schedule_version', activeScheduleVersion || 'Utama').then(async (res) => {
                  if (res.error && (res.error.code === '42703' || res.error.message?.includes('academic_year') || res.error.message?.includes('schedule_version'))) {
                      const fallback = await supabase.from('schedules').select('*').eq('day_of_week', dbDay).eq('academic_year', academicYear || '2025/2026').eq('semester', semester || 'Ganjil');
                      if (fallback.error) {
                          const ultra = await supabase.from('schedules').select('*').eq('day_of_week', dbDay);
                          if (ultra.data) ultra.data = ultra.data.filter(s => s.academic_year === academicYear && s.semester === semester);
                          return ultra;
                      }
                      return fallback;
                  }
                  return res;
              }),
              supabase.from('journals').select('*').eq('academic_year', academicYear || '2025/2026').eq('semester', semester || 'Ganjil').gte('created_at', semesterStart ? `${semesterStart}T00:00:00+07:00` : '2000-01-01T00:00:00+07:00').lte('created_at', semesterEnd ? `${semesterEnd}T23:59:59+07:00` : '2100-01-01T23:59:59+07:00').gte('created_at', startOfDay).lte('created_at', endOfDay)
          ]);

          const excludedNames = ['Guru Baru', 'Agung Budiartati, M.Pd.', 'Dra.Laily Asriyah, M.Pd.I.'];
          const allTeachers = (profilesRes.data || []).filter(t => !excludedNames.includes(t.full_name));
          const todaysSchedules = schedulesRes.data || [];
          const todaysJournals = journalsRes.data || [];

          const matrix: TeacherMatrixItem[] = allTeachers.map(teacher => {
              const scheduleMap: Record<number, { className: string, isFilled: boolean, hasSchedule: boolean }> = {};
              for(let i=1; i<=8; i++) {
                  scheduleMap[i] = { className: '-', isFilled: false, hasSchedule: false };
              }
              const teacherSchedules = todaysSchedules.filter(s => s.teacher_id === teacher.id);
              teacherSchedules.forEach(s => {
                  const hours = s.hour.split(',').map((h: string) => parseInt(h.trim()));
                  hours.forEach((h: number) => {
                      if(h >= 1 && h <= 8) {
                          scheduleMap[h].hasSchedule = true;
                          scheduleMap[h].className = s.kelas;
                          const hasJournal = todaysJournals.some(j => 
                              j.teacher_id === teacher.id && 
                              j.kelas === s.kelas && 
                              j.subject === s.subject &&
                              j.hours.split(',').map((jh: string) => parseInt(jh.trim())).includes(h)
                          );
                          scheduleMap[h].isFilled = hasJournal;
                      }
                  });
              });
              return { teacher, scheduleMap };
          });
          
          // Filter matrix: hanya tampilkan guru yang memiliki jadwal di hari ini
          const filteredMatrix = matrix.filter(item => 
              Object.values(item.scheduleMap).some(slot => slot.hasSchedule)
          );
          
          setMatrixData(filteredMatrix);
      } catch (e) {
          console.error("Headmaster Matrix Error", e);
      } finally {
          setLoading(false);
      }
  };

  // --- LOGIC GURU BIASA (EXISTING) ---
  const fetchDashboardData = async () => {
    try {
        const date = getWIBDate();
        const currentYear = date.getFullYear();
        const currentMonth = date.getMonth(); 
        
        const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
        const firstDayStr = firstDayOfMonth.toISOString();
        const todayStr = getWIBISOString();
        const startOfDay = `${filterDate}T00:00:00+07:00`;
        const endOfDay = `${filterDate}T23:59:59+07:00`;

        const { data: journals } = await supabase.from('journals').select('id, created_at, hours, kelas, material').eq('academic_year', academicYear || '2025/2026').eq('semester', semester || 'Ganjil').gte('created_at', semesterStart ? `${semesterStart}T00:00:00+07:00` : '2000-01-01T00:00:00+07:00').lte('created_at', semesterEnd ? `${semesterEnd}T23:59:59+07:00` : '2100-01-01T23:59:59+07:00').eq('teacher_id', profile?.id).gte('created_at', firstDayStr);

        let jp = 0;
        let meetings = 0;
        const monthJournals: Array<{ id: string, kelas: string, date: string, material: string, count: number }> = [];

        if (journals) {
            meetings = journals.length;
            journals.forEach(j => {
                const parts = j.hours.split(',').filter((h: string) => h.trim().length > 0);
                jp += parts.length;
                monthJournals.push({
                    id: j.id,
                    kelas: j.kelas,
                    date: j.created_at,
                    material: j.material || '-',
                    count: parts.length
                });
            });
            // Sort by date descending
            monthJournals.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        }

        let { data: mySchedules, error: mySchedError } = await supabase.from('schedules').select('day_of_week, hour').eq('teacher_id', profile?.id).eq('academic_year', academicYear || '2025/2026').eq('semester', semester || 'Ganjil').eq('schedule_version', activeScheduleVersion || 'Utama');
        if (mySchedError && (mySchedError.code === '42703' || mySchedError.message?.includes('academic_year'))) {
            const fallback = await supabase.from('schedules').select('*').eq('teacher_id', profile?.id);
            if (fallback.data && fallback.data.length > 0 && fallback.data[0].academic_year !== undefined) {
                mySchedules = fallback.data.filter(s => s.academic_year === (academicYear || '2025/2026') && s.semester === (semester || 'Ganjil'));
            } else {
                mySchedules = fallback.data;
            }
        }

        let targetJp = 0;
        if (mySchedules) {
            const dayCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
            for (let d = 1; d <= date.getDate(); d++) {
                const tempDate = new Date(currentYear, currentMonth, d);
                const jsDay = tempDate.getDay(); 
                const dbDay = jsDay === 0 ? 7 : jsDay;
                dayCounts[dbDay]++;
            }
            mySchedules.forEach(s => {
                const jpCount = s.hour.split(',').filter((h: string) => h.trim()).length;
                const occurrences = dayCounts[s.day_of_week] || 0;
                targetJp += (jpCount * occurrences);
            });
        }

        setStats({ totalJp: jp, targetJp: targetJp, totalMeetings: meetings, monthJournals });

        const dateObj = new Date(); 
        const jsDay = dateObj.getDay(); 
        const dbDay = jsDay === 0 ? 7 : jsDay; 
        const todayStart = `${todayStr}T00:00:00+07:00`;
        const todayEnd = `${todayStr}T23:59:59+07:00`;

        const [todaySchedRes, todayJournalRes] = await Promise.all([
            supabase.from('schedules').select('*').eq('teacher_id', profile?.id).eq('day_of_week', dbDay).eq('academic_year', academicYear || '2025/2026').eq('semester', semester || 'Ganjil').eq('schedule_version', activeScheduleVersion || 'Utama').then(async (res) => {
                if (res.error && (res.error.code === '42703' || res.error.message?.includes('academic_year'))) {
                    const fallback = await supabase.from('schedules').select('*').eq('teacher_id', profile?.id).eq('day_of_week', dbDay);
                    if (fallback.data && fallback.data.length > 0 && fallback.data[0].academic_year !== undefined) {
                        fallback.data = fallback.data.filter(s => s.academic_year === (academicYear || '2025/2026') && s.semester === (semester || 'Ganjil'));
                    }
                    return fallback;
                }
                return res;
            }),
            supabase.from('journals').select('*').eq('academic_year', academicYear || '2025/2026').eq('semester', semester || 'Ganjil').gte('created_at', semesterStart ? `${semesterStart}T00:00:00+07:00` : '2000-01-01T00:00:00+07:00').lte('created_at', semesterEnd ? `${semesterEnd}T23:59:59+07:00` : '2100-01-01T23:59:59+07:00').eq('teacher_id', profile?.id).gte('created_at', todayStart).lte('created_at', todayEnd)
        ]);

        const hoursList: KbmStatus[] = [];
        for(let i = 1; i <= 8; i++) {
            const hourStr = String(i);
            const scheduledClasses = todaySchedRes.data?.filter(s => {
                const hours = s.hour.split(',').map((h: string) => h.trim());
                return hours.includes(hourStr);
            }) || [];

            const classDisplay = scheduledClasses.length > 0 ? scheduledClasses.map(s => s.kelas).join(' / ') : '-';
            let allFilled = false;
            
            if (scheduledClasses.length > 0) {
                const fillStatus = scheduledClasses.map(sched => {
                    return todayJournalRes.data?.some(j => {
                        const hours = j.hours.split(',').map((h: string) => h.trim());
                        return hours.includes(hourStr) && j.kelas === sched.kelas && j.subject === sched.subject;
                    });
                });
                allFilled = fillStatus.every(status => status === true);
            }

            hoursList.push({
                hour: i,
                className: classDisplay,
                isScheduled: scheduledClasses.length > 0,
                isFilled: allFilled
            });
        }
        setKbmStatus(hoursList);

        if (activeWaliKelas) {
            let { data: students, error: errSt } = await supabase.from('students').select('*').eq('academic_year', academicYear || '2025/2026').eq('kelas', activeWaliKelas).order('name');
            if (errSt || !students || students.length === 0) {
                const res = await supabase.from('students').select('*').eq('kelas', activeWaliKelas).order('name');
                students = res.data || [];
            }
            
            if (students && students.length > 0) {
                const studentIds = students.map(s => s.id);
                const { data: homeroomLogs } = await supabase
                    .from('homeroom_attendance')
                    .select('student_id, status')
                    .eq('date', filterDate)
                    .in('student_id', studentIds);

                const homeroomMap: Record<string, string> = {};
                homeroomLogs?.forEach(log => { homeroomMap[log.student_id] = log.status; });

                const { data: teacherLogs } = await supabase
                    .from('attendance_logs')
                    .select(`student_id, status, journals (hours)`)
                    .in('student_id', studentIds)
                    .gte('created_at', startOfDay)
                    .lte('created_at', endOfDay);

                const finalAbsences: WaliKelasAbsence[] = [];

                students.forEach(student => {
                    let finalStatus = '';
                    let source: 'wali' | 'guru' = 'guru';
                    let hoursStr = '';

                    if (homeroomMap[student.id]) {
                        finalStatus = homeroomMap[student.id];
                        source = 'wali';
                    } else {
                         const myLogs = teacherLogs?.filter((l: any) => l.student_id === student.id) || [];
                         if (myLogs.length > 0) {
                             const statuses = new Set(myLogs.map((l:any) => l.status));
                             if (statuses.has('S')) finalStatus = 'S';
                             else if (statuses.has('I')) finalStatus = 'I';
                             else if (statuses.has('A')) finalStatus = 'A';
                             else if (statuses.has('D')) finalStatus = 'D';
                             
                             const hoursSet = new Set<number>();
                             myLogs.forEach((l: any) => {
                                 if(l.journals?.hours) {
                                     l.journals.hours.split(',').forEach((h: string) => {
                                        const val = parseInt(h.trim());
                                        if(!isNaN(val)) hoursSet.add(val);
                                     });
                                 }
                             });
                             hoursStr = Array.from(hoursSet).sort((a,b) => a-b).join(', ');
                         }
                    }

                    if (finalStatus) {
                        finalAbsences.push({
                            student_id: student.id,
                            student_name: student.name,
                            kelas: activeWaliKelas,
                            status: finalStatus,
                            source: source,
                            hours: hoursStr || 'Full Day'
                        });
                    }
                });

                finalAbsences.sort((a, b) => a.student_name.localeCompare(b.student_name));
                setHomeroomAbsences(finalAbsences);
            } else {
                setHomeroomAbsences([]);
            }
        }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  // --- TOGGLE INPUT FORM (ACCORDION) ---
  const toggleInputForm = async () => {
      if (!showInputForm) {
          // Open: Fetch Data
          setSavingAttendance(true); 
          try {
              let { data: students, error: errSt } = await supabase.from('students').select('*').eq('academic_year', academicYear || '2025/2026').eq('kelas', activeWaliKelas).order('name');
              if (errSt && (errSt.code === '42703' || errSt.message?.includes('academic_year'))) {
                  const res = await supabase.from('students').select('*').eq('academic_year', academicYear || '2025/2026').eq('kelas', activeWaliKelas).order('name');
                  if (academicYear === '2025/2026') students = res.data;
                  else students = [];
              }
              setModalStudents(students || []);

              const { data: existing } = await supabase
                 .from('homeroom_attendance')
                 .select('student_id, status')
                 .eq('date', filterDate)
                 .in('student_id', (students || []).map(s => s.id));
              
              const attMap: Record<string, 'S'|'I'|'A'|'D'> = {};
              existing?.forEach(log => { attMap[log.student_id] = log.status as any; });
              setModalAttendance(attMap);
              setShowInputForm(true);
          } catch(e) { console.error(e); }
          finally { setSavingAttendance(false); }
      } else {
          // Close
          setShowInputForm(false);
      }
  };

  const handleSaveHomeroomAttendance = async () => {
      if (!activeWaliKelas) return;
      setSavingAttendance(true);
      try {
          const studentIds = modalStudents.map(s => s.id);
          await supabase.from('homeroom_attendance').delete().eq('date', filterDate).in('student_id', studentIds);

          const inserts = Object.entries(modalAttendance).map(([studentId, status]) => ({
              date: filterDate,
              kelas: activeWaliKelas,
              student_id: studentId,
              status: status,
              created_by: profile?.id,
          }));

          if (inserts.length > 0) {
              const { error } = await supabase.from('homeroom_attendance').insert(inserts);
              if (error) throw error;
          }
          setShowInputForm(false); // Close accordion
          fetchDashboardData(); 
      } catch(e) { showAlert("Gagal menyimpan absensi: " + e); } finally { setSavingAttendance(false); }
  };

  const toggleModalStatus = (studentId: string, status: 'S'|'I'|'A'|'D') => {
      setModalAttendance(prev => {
          const next = { ...prev };
          if (next[studentId] === status) delete next[studentId]; else next[studentId] = status;
          return next;
      });
  };

  const handleEditSpecific = (categoryName: string, list: WaliKelasAbsence[]) => {
      const editList: EditingStudent[] = list.map(item => ({
          student_id: item.student_id,
          student_name: item.student_name,
          currentStatus: item.status,
          newStatus: item.status,
          note: ''
      }));
      setSpecificAbsenceData(editList);
      setEditingCategory(categoryName);
      setShowEditSpecificModal(true);
  };

  const updateSpecificRow = (index: number, field: keyof EditingStudent, value: string) => {
      setSpecificAbsenceData(prev => {
          const next = [...prev];
          next[index] = { ...next[index], [field]: value };
          return next;
      });
  };

  const handleSaveSpecific = async () => {
      if (!activeWaliKelas) return;
      setSavingAttendance(true);
      try {
          for (const item of specificAbsenceData) {
              if (item.newStatus !== item.currentStatus || item.note) {
                  const payload: any = {
                      date: filterDate,
                      kelas: activeWaliKelas,
                      student_id: item.student_id,
                      status: item.newStatus,
                      created_by: profile?.id,
                  };
                  const { error } = await supabase.from('homeroom_attendance').upsert(payload, { onConflict: 'date, student_id' });
                  if (error) console.error("Failed update", error);
              }
          }
          setShowEditSpecificModal(false);
          fetchDashboardData();
      } catch (e) { showAlert("Gagal menyimpan perubahan: " + e); } finally { setSavingAttendance(false); }
  };

  const filterAbsences = (status: string) => homeroomAbsences.filter(a => a.status === status);
  const listAlpa = filterAbsences('A');
  const listIzin = filterAbsences('I');
  const listSakit = filterAbsences('S');
  const listDispen = filterAbsences('D');

  const AbsenceSection = ({ title, list, colorClass, icon: Icon, onEdit }: any) => {
      if (list.length === 0) return null;
      return (
        <div className="flex flex-col gap-2 min-w-[200px] flex-1 animate-fade-in">
            <div className={`flex items-center gap-1.5 pb-1 border-b border-gray-100 dark:border-slate-700 mb-0.5 ${colorClass}`}>
                <Icon size={14} strokeWidth={2.5}/>
                <span className="text-[10px] font-extrabold uppercase tracking-wider">{title}</span>
                <div className="ml-auto flex items-center gap-1">
                     <span className="text-[9px] font-bold bg-white dark:bg-slate-700 dark:text-white px-1.5 py-0.5 rounded-md border border-current opacity-80">{list.length}</span>
                     <button onClick={() => onEdit(title, list)} className="p-0.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-400 dark:text-slate-500 hover:text-purple-500 dark:hover:text-purple-400 transition-colors">
                        <Edit2 size={12} />
                     </button>
                </div>
            </div>
            <div className="flex flex-col gap-1">
                {list.map((a: any, i: number) => (
                    <div key={i} className="flex justify-between items-center w-full text-[11px] leading-tight text-slate-700 dark:text-slate-300 font-medium group">
                        <span className="truncate pr-2">{a.student_name}</span>
                        {a.source === 'wali' && <span className="text-[9px] px-1 bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-300 rounded mr-1" title="Input Wali Kelas">W</span>}
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-100 dark:border-slate-700 group-hover:border-slate-200 dark:group-hover:border-slate-600 transition-colors whitespace-nowrap">
                             {a.hours === 'Full Day' ? 'Seharian' : `Jam ${a.hours}`}
                        </span>
                    </div>
                ))}
            </div>
        </div>
      );
  };

  const currentMonthName = new Date().toLocaleDateString('id-ID', { month: 'long' });
  const percentage = stats.targetJp > 0 ? (stats.totalJp / stats.targetJp) * 100 : 0;
  let performanceStatus = "Di Bawah Ekspektasi";
  let performanceColor = "text-red-200";
  if (percentage > 85) { performanceStatus = "Di Atas Ekspektasi"; performanceColor = "text-emerald-200"; } 
  else if (percentage >= 70) { performanceStatus = "Sesuai Ekspektasi"; performanceColor = "text-purple-200"; }

  if (isHeadmaster) {
      // Headmaster view code
      
    

  return (
    <Layout>
            <div className="space-y-6 animate-fade-in">
                {/* Header Kepsek */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white uppercase tracking-wide">
                            KEGIATAN BELAJAR MENGAJAR GURU HARI INI
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">
                            {formatDateIndo(matrixDate)}
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <Calendar size={18} className="text-slate-400"/>
                        <input 
                            type="date" 
                            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-1.5 px-3 text-sm font-bold text-slate-700 dark:text-white"
                            value={matrixDate}
                            onChange={(e) => setMatrixDate(e.target.value)}
                        />
                    </div>
                </div>

                {/* MATRIX TABLE */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold uppercase text-sm border-b border-slate-200 dark:border-slate-600">
                                    <th className="px-4 py-3 border-r border-slate-200 dark:border-slate-600 w-12 text-center">No</th>
                                    <th className="px-4 py-3 border-r border-slate-200 dark:border-slate-600 w-64">Nama Guru</th>
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(h => (
                                        <th key={h} className="px-2 py-3 border-r border-slate-200 dark:border-slate-600 text-center w-20">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="text-slate-700 dark:text-slate-200">
                                {loading ? (
                                    <tr><td colSpan={10} className="p-10 text-center"><Loader2 className="animate-spin mx-auto text-purple-500"/></td></tr>
                                ) : matrixData.length === 0 ? (
                                    <tr><td colSpan={10} className="p-10 text-center text-slate-400">Tidak ada data.</td></tr>
                                ) : (
                                    matrixData.map((item, idx) => (
                                        <tr key={item.teacher.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                            <td className="px-4 py-3 border-r border-slate-100 dark:border-slate-700 text-center font-bold text-sm text-slate-500 dark:text-slate-400">{idx + 1}</td>
                                            <td className="px-4 py-3 border-r border-slate-100 dark:border-slate-700 font-bold text-sm truncate max-w-[200px]" title={item.teacher.full_name}>
                                                {item.teacher.full_name}
                                            </td>
                                            {[1, 2, 3, 4, 5, 6, 7, 8].map(h => {
                                                const cell = item.scheduleMap[h];
                                                return (
                                                    <td key={h} className="px-2 py-4 border-r border-slate-100 dark:border-slate-700 text-center align-middle relative group">
                                                        {cell.hasSchedule ? (
                                                            <div className="flex flex-col items-center justify-center gap-1.5 transition-transform hover:scale-105">
                                                                <span className={`text-xl md:text-2xl font-extrabold ${
                                                                    cell.isFilled 
                                                                    ? 'text-emerald-600 dark:text-emerald-400' 
                                                                    : 'text-rose-600 dark:text-rose-400'
                                                                }`}>
                                                                    {cell.className}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-200 dark:text-slate-700 font-bold text-lg select-none">-</span>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </Layout>
      );
  }

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        
        {/* HEADER */}
        
<div className="bg-gradient-to-br from-purple-500 to-purple-600 dark:bg-purple-900 rounded-3xl p-6 md:p-8 text-white shadow-xl shadow-purple-200/50 dark:shadow-none relative overflow-hidden">
             <div className="absolute top-0 right-0 p-2 opacity-20 pointer-events-none">
                 <Clock size={200} strokeWidth={2.5} className="-mr-8 -mt-8" />
            </div>
            
            <div className="relative z-10 flex flex-col items-start gap-4">
                <div className="flex items-center gap-5">
                    <div className="flex-shrink-0">
                        <div className="w-[84px] h-[84px] rounded-full border-[3px] border-white shadow-sm overflow-hidden bg-white flex items-center justify-center">
                            {profile?.avatar_url ? <img src={profile.avatar_url} className="w-full h-full object-cover" /> : <User size={40} className="text-slate-300" />}
                        </div>
                    </div>
                    <div>
                        <p className="text-purple-50 text-sm mb-1">{greeting},</p>
                        <h1 className="text-xl md:text-2xl font-semibold mb-0.5">{profile?.full_name}</h1>
                                                <p className="text-purple-100/90 text-sm font-mono">{isAdmin ? 'Administrator' : (profile?.nip ? `NIP ${profile.nip}` : 'NIP -')}</p>
                    </div>
                </div>
                
                {!isAdmin && (
                    <div className="w-full mt-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-3xl p-5 flex flex-col gap-4 relative z-10 shadow-inner">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-bold text-purple-100 uppercase tracking-wider">Kinerja Bulan {currentMonthName}</p>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-3">
                            <div className="bg-white rounded-[1.25rem] p-4 flex flex-col items-center justify-center text-center shadow-lg hover:-translate-y-1 transition-transform">
                                <div className="w-10 h-10 mb-2 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
                                    <Users size={20} strokeWidth={2} />
                                </div>
                                <div className="flex items-baseline gap-1 justify-center">
                                    <span className="text-2xl font-black text-slate-800 leading-none">{stats.totalMeetings}</span>
                                </div>
                                <span className="text-[9px] font-extrabold text-slate-500 uppercase mt-1 tracking-wider">KALI<br/>PERTEMUAN</span>
                            </div>
                            
                            <div className="bg-white rounded-[1.25rem] p-4 flex flex-col items-center justify-center text-center shadow-lg hover:-translate-y-1 transition-transform">
                                <div className="w-10 h-10 mb-2 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                    <ClipboardList size={20} strokeWidth={2} />
                                </div>
                                <div className="flex items-baseline gap-1 justify-center">
                                    <span className="text-2xl font-black text-slate-800 leading-none">{stats.totalJp}</span>
                                    <span className="text-xs font-bold text-slate-400">/ {stats.targetJp}</span>
                                </div>
                                <span className="text-[9px] font-extrabold text-slate-500 uppercase mt-1 tracking-wider">TOTAL JP</span>
                            </div>

                            <div className="bg-white rounded-[1.25rem] p-4 flex flex-col items-center justify-center text-center shadow-lg hover:-translate-y-1 transition-transform">
                                <div className="w-10 h-10 mb-2 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center">
                                    <Star size={20} strokeWidth={2} />
                                </div>
                                <div className="flex flex-col items-center justify-center mt-1">
                                    <span className={`text-[10px] font-black uppercase tracking-wide text-center leading-tight ${
                                        performanceStatus.includes('SANGAT BAIK') ? 'text-emerald-600' :
                                        performanceStatus.includes('BAIK') ? 'text-blue-600' :
                                        performanceStatus.includes('CUKUP') ? 'text-amber-600' :
                                        'text-purple-600'
                                    }`}>
                                        {performanceStatus.split(' ').map((word, i) => <React.Fragment key={i}>{word}<br/></React.Fragment>)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                        </div>
        </div>

        {/* MAIN WIDGETS */}
        {isAdmin && (
            <div className="flex flex-col gap-6 animate-fade-in">
                <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 relative overflow-hidden text-center">
                    <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Users size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Selamat Datang di Panel Administrator</h2>
                    <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto">Anda login sebagai Admin. Gunakan menu navigasi di bawah untuk mengelola data guru, jadwal pelajaran, merekap jurnal mengajar, atau membersihkan data.</p>
                </div>
            </div>
        )}
        
        {(!isAdmin || isOperator) && (
            <div className="flex flex-col gap-6">
                {/* WALI KELAS ABSENCE WIDGET */}
                {(profile?.wali_kelas || isOperator || isAdmin) && (
                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 relative overflow-hidden group hover:border-purple-200 transition-colors">
                        <div className="absolute -top-6 -right-6 p-4 opacity-5 dark:opacity-10 pointer-events-none group-hover:opacity-10 transition-opacity rotate-12"><ClipboardList size={140} className="text-slate-800 dark:text-slate-100" /></div>

                        <div className="flex flex-col md:flex-row gap-4 md:gap-8 relative z-10">
                            {/* Header Section (Left) */}
                            <div className="flex flex-row md:flex-col items-center md:items-start gap-4 flex-shrink-0 md:min-w-[200px] md:border-r md:border-slate-100 dark:md:border-slate-700 md:pr-4 pt-2 md:pt-0">
                                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center shadow-sm border transition-colors ${
                                    homeroomAbsences.length > 0 
                                    ? 'bg-orange-50 dark:bg-orange-900/30 border-orange-100 dark:border-orange-800 text-orange-600 dark:text-orange-400' 
                                    : 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-100 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400'
                                }`}>
                                     {homeroomAbsences.length > 0 ? <Bell size={20} className="animate-pulse" /> : <CheckCircle2 size={22} />}
                                </div>
                                <div className="flex-1 w-full">
                                    <h3 className="font-extrabold text-slate-800 dark:text-white text-xs uppercase tracking-wide leading-relaxed">
                                        Rekap Absensi <br className="hidden md:block"/>Kelas {activeWaliKelas}
                                    </h3>
                                    
                                    {(isOperator || isAdmin || !profile?.wali_kelas) && (
                                        <div className="mt-1.5">
                                            <select
                                                value={selectedWaliKelas}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setSelectedWaliKelas(val);
                                                    if (showInputForm) setShowInputForm(false);
                                                }}
                                                className="w-full text-xs font-bold bg-purple-50 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700 rounded-xl px-2.5 py-1 outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer shadow-sm"
                                            >
                                                {['7A','7B','7C','7D','7E','7F','7G','7H','8A','8B','8C','8D','8E','8F','8G','8H','9A','9B','9C','9D','9E','9F','9G','9H'].map(k => (
                                                    <option key={k} value={k}>Pilih Kelas {k}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    <p className={`text-[10px] font-bold mt-1.5 leading-tight ${homeroomAbsences.length > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                        {homeroomAbsences.length > 0 ? `${homeroomAbsences.length} Murid Absen` : 'Semua Hadir'}
                                    </p>
                                    
                                    <button 
                                        onClick={toggleInputForm}
                                        className={`mt-3 w-full text-[10px] py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-md shadow-purple-200 dark:shadow-none transition-all active:scale-95 ${
                                            showInputForm 
                                            ? 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-200'
                                            : 'bg-purple-600 hover:bg-purple-700 text-white'
                                        }`}
                                    >
                                        {showInputForm ? <ChevronUp size={12}/> : <Plus size={12}/>} 
                                        {showInputForm ? 'Tutup Form' : 'Input Absensi'}
                                    </button>
                                </div>
                            </div>

                            {/* Content Section (Right) */}
                            <div className="flex-1 min-w-0 flex flex-col gap-4">
                                
                                {/* ACCORDION INPUT FORM (Moved Here, above Date Picker) */}
                                {showInputForm && (
                                    <div className="mb-2 p-4 border-2 border-purple-100 dark:border-slate-600 rounded-2xl bg-white dark:bg-slate-800 animate-fade-in shadow-sm">
                                        <div className="flex justify-between items-center mb-3">
                                            <h4 className="font-bold text-slate-700 dark:text-white text-xs flex items-center gap-2">
                                                <Edit2 size={14} className="text-purple-500"/> Input Absensi: {formatDateIndo(filterDate)}
                                            </h4>
                                            <button 
                                                onClick={() => setModalAttendance({})}
                                                className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 px-2 py-1 rounded transition-colors"
                                            >
                                                Reset
                                            </button>
                                        </div>

                                        <div className="max-h-[300px] overflow-y-auto custom-scrollbar border border-slate-100 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-700/30">
                                            <div className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600 px-3 py-2 flex items-center text-[10px] font-bold text-slate-500 dark:text-slate-300 uppercase">
                                                <div className="flex-1">NAMA MURID</div>
                                                <div className="flex gap-1.5 w-24 justify-end">
                                                    <span className="w-7 text-center">S</span>
                                                    <span className="w-7 text-center">I</span>
                                                    <span className="w-7 text-center">D</span> 
                                                </div>
                                            </div>
                                            <div className="divide-y divide-slate-100 dark:divide-slate-700">
                                                {modalStudents.map(student => (
                                                    <div key={student.id} className="flex items-center justify-between px-3 py-2 hover:bg-white dark:hover:bg-slate-600/50 transition-colors">
                                                        <div className="flex-1 pr-2">
                                                            <p className="text-xs font-bold text-slate-700 dark:text-slate-200 line-clamp-1">{student.name}</p>
                                                        </div>
                                                        <div className="flex gap-1.5 w-24 justify-end">
                                                            {(['S', 'I', 'D'] as const).map(status => (
                                                                <button 
                                                                    key={status}
                                                                    onClick={() => toggleModalStatus(student.id, status)}
                                                                    className={`w-7 h-7 rounded-md flex items-center justify-center border transition-all text-[10px] font-bold ${
                                                                        modalAttendance[student.id] === status
                                                                        ? (status === 'S' ? 'bg-yellow-500 border-yellow-600 text-white' : status === 'I' ? 'bg-blue-500 border-blue-600 text-white' : 'bg-purple-600 border-purple-700 text-white')
                                                                        : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                                                                    }`}
                                                                >
                                                                    {status}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="mt-3 flex justify-end">
                                            <button 
                                                onClick={handleSaveHomeroomAttendance}
                                                disabled={savingAttendance}
                                                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-md shadow-purple-200 dark:shadow-none disabled:opacity-50 transition-all text-xs"
                                            >
                                                {savingAttendance ? <Loader2 className="animate-spin" size={14}/> : <Save size={14} />} 
                                                Simpan
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-700/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700">
                                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                                        <CalendarDays size={14} />
                                        <span className="text-[10px] font-bold uppercase tracking-wide">Tanggal Rekap</span>
                                    </div>
                                    <input 
                                        type="date" 
                                        value={filterDate}
                                        onChange={(e) => setFilterDate(e.target.value)}
                                        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg py-1 px-2 text-xs font-bold text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm"
                                    />
                                </div>

                                {homeroomAbsences.length === 0 ? (
                                    <div className="flex items-center justify-center h-full text-slate-400 dark:text-slate-500 text-xs font-medium italic bg-slate-50/50 dark:bg-slate-800/50 rounded-xl px-4 py-8 border border-slate-100 dark:border-slate-700 border-dashed">
                                        <CheckCircle2 size={14} className="mr-2"/> Tidak ada laporan ketidakhadiran murid pada tanggal ini.
                                    </div>
                                ) : (
                                    <div className="flex flex-wrap gap-x-8 gap-y-6">
                                        <AbsenceSection title="ALPA" list={listAlpa} colorClass="text-red-600 dark:text-red-400" icon={XCircle} onEdit={handleEditSpecific} />
                                        <AbsenceSection title="IZIN" list={listIzin} colorClass="text-purple-600 dark:text-purple-400" icon={FileText} onEdit={handleEditSpecific} />
                                        <AbsenceSection title="SAKIT" list={listSakit} colorClass="text-yellow-600 dark:text-yellow-400" icon={Stethoscope} onEdit={handleEditSpecific} />
                                        <AbsenceSection title="DISPEN" list={listDispen} colorClass="text-purple-600 dark:text-purple-400" icon={Flag} onEdit={handleEditSpecific} />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* KBM STATUS TABLE */}
                <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
                    <h3 className="font-bold text-slate-800 dark:text-white text-xs mb-4 uppercase tracking-wide flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-purple-600 dark:text-purple-400" strokeWidth={2.5}/>
                        KETERLAKSANAAN KBM HARI INI DI KELAS
                    </h3>
                    <div className="overflow-x-auto bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                        <table className="w-full text-center border-collapse">
                            <thead>
                                <tr className="bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                                    {kbmStatus.map((status) => (
                                        <th key={status.hour} className="py-3 px-1 border-r border-slate-100 dark:border-slate-700 last:border-0 font-bold text-slate-700 dark:text-slate-300 w-[12.5%] text-sm">
                                            {status.hour}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="bg-white dark:bg-slate-800">
                                    {kbmStatus.map((status) => (
                                        <td key={status.hour} className="py-4 px-1 border-r border-slate-100 dark:border-slate-700 last:border-0">
                                            <div className="flex flex-col items-center justify-center min-h-[2rem]">
                                                {status.isScheduled ? (
                                                    status.className.split(' / ').map((cls, idx) => (
                                                        <span key={idx} className={`block font-black text-xl ${
                                                            status.isFilled 
                                                            ? 'text-emerald-600 dark:text-emerald-400' 
                                                            : 'text-rose-600 dark:text-rose-400'
                                                        }`}>
                                                            {cls}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-purple-600 dark:text-purple-400 font-black text-2xl leading-none select-none">-</span>
                                                )}
                                            </div>
                                        </td>
                                    ))}
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                
                {/* CLASS PROGRESS WIDGET */}
                <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 relative overflow-hidden">
                    <div className="absolute -bottom-10 -right-6 p-4 opacity-5 pointer-events-none rotate-12"><BookOpen size={180} className="text-slate-900 dark:text-white" /></div>
                    <h3 className="relative z-10 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-6 flex items-center gap-2 tracking-wide"><TrendingUp size={16} className="text-purple-500"/> Distribusi Pertemuan Kelas ({new Date().toLocaleDateString('id-ID', { month: 'long' })})</h3>
                    <div className="relative z-10 space-y-3">
                        {stats.monthJournals.length === 0 ? (
                            <div className="relative py-12 px-8 bg-slate-50 dark:bg-slate-700/50 rounded-[1.5rem] border border-slate-100 dark:border-slate-700 overflow-hidden flex items-center justify-between">
                                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium italic max-w-[150px] relative z-10">Belum ada data mengajar<br/>bulan ini.</p>
                                <div className="absolute -right-4 -bottom-4 text-purple-100 dark:text-slate-800 rotate-12">
                                    <ClipboardList size={140} strokeWidth={1} />
                                </div>
                                <div className="absolute right-12 bottom-6 bg-purple-500 text-white rounded-full p-2 shadow-lg shadow-purple-500/30">
                                    <Check size={20} strokeWidth={3} />
                                </div>
                            </div>
                        ) : (
                            stats.monthJournals.map((j) => (
                                <div key={j.id} className="flex flex-col p-4 rounded-2xl bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-700 hover:border-purple-200 transition-colors group relative overflow-hidden">
                                    <div className="flex items-center justify-between relative z-10">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-lg shadow-sm border border-purple-200 dark:border-purple-800 min-w-[3rem]">{j.kelas}</div>
                                            <div>
                                                <h4 className="font-bold text-slate-700 dark:text-white text-sm flex items-center gap-2">Kelas {j.kelas}</h4>
                                                <p className="text-xs text-purple-500 dark:text-purple-400 font-bold flex items-center gap-1">
                                                    <Calendar size={10} /> 
                                                    {new Date(j.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-3 relative z-10">
                                        <p className="text-xs font-bold text-slate-500 mb-1">Materi yang diajar:</p>
                                        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3">
                                            {j.material}
                                        </p>
                                    </div>
                                    <div className="absolute bottom-0 left-0 h-1 bg-purple-500/10 w-full"><div className="h-full bg-purple-500/30" style={{ width: '100%' }}></div></div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* MODAL EDIT SPECIFIC - TOP ALIGNED & MODERN */}
        {showEditSpecificModal && (
            <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[calc(env(safe-area-inset-top)+1rem)] sm:p-4 bg-slate-900/50 backdrop-blur-sm transition-all duration-300">
                <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-700 relative flex flex-col max-h-[80vh] transform transition-all scale-100 animate-fade-in">
                    
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800">
                        <div>
                            <h3 className="font-extrabold text-slate-800 dark:text-white text-lg">Edit Data {editingCategory}</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Ubah status / Tambah catatan</p>
                        </div>
                        <button 
                            onClick={() => setShowEditSpecificModal(false)} 
                            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4 bg-slate-50/50 dark:bg-slate-800/50">
                        {specificAbsenceData.map((item, idx) => (
                            <div key={idx} className="bg-white dark:bg-slate-700/50 rounded-xl p-4 border border-slate-200 dark:border-slate-600 shadow-sm">
                                <p className="font-bold text-slate-800 dark:text-white mb-3 text-sm">{item.student_name}</p>
                                
                                <div className="flex gap-2 mb-3">
                                    {['S', 'I', 'A', 'D'].map(status => (
                                        <button 
                                            key={status}
                                            onClick={() => updateSpecificRow(idx, 'newStatus', status)}
                                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                                item.newStatus === status 
                                                ? (status === 'S' ? 'bg-yellow-100 border-yellow-200 text-yellow-700 dark:bg-yellow-900 dark:border-yellow-700 dark:text-yellow-100' : 
                                                   status === 'I' ? 'bg-purple-100 border-purple-200 text-purple-700 dark:bg-purple-900 dark:border-purple-700 dark:text-purple-100' :
                                                   status === 'A' ? 'bg-red-100 border-red-200 text-red-700 dark:bg-red-900 dark:border-red-700 dark:text-red-100' : 'bg-purple-100 border-purple-200 text-purple-700 dark:bg-purple-900 dark:border-purple-700 dark:text-purple-100')
                                                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                                            }`}
                                        >
                                            {status}
                                        </button>
                                    ))}
                                </div>

                                <div>
                                    <input 
                                        type="text" 
                                        className="w-full border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-purple-500 text-slate-700 dark:text-white transition-all placeholder:text-slate-400"
                                        placeholder="Catatan (Opsional)..."
                                        value={item.note}
                                        onChange={(e) => updateSpecificRow(idx, 'note', e.target.value)}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800">
                        <button 
                            onClick={handleSaveSpecific}
                            disabled={savingAttendance}
                            className="w-full bg-slate-900 dark:bg-purple-600 hover:bg-slate-800 dark:hover:bg-purple-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 transition-all"
                        >
                            {savingAttendance ? <Loader2 className="animate-spin" size={18}/> : <Save size={18} />} 
                            Simpan Perubahan
                        </button>
                    </div>
                </div>
            </div>
        )}

      </div>
    </Layout>
  );
};

export default Dashboard;
