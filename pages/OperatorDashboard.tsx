
import React, { useEffect, useState, useRef } from 'react';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { Profile } from '../types';
import { getWIBISOString, formatDateIndo } from '../utils/dateUtils';
import { 
  MonitorPlay, CheckCircle2, Clock, Loader2, RefreshCw, CalendarDays, 
  UserX, Percent, Sparkles, AlertTriangle, Search, XCircle, X, Bookmark, ChevronRight, ChevronDown, UserCheck,
  ClipboardList, Plus, ChevronUp, Edit2, Save, Users, FileText, Stethoscope, Flag
} from 'lucide-react';

interface MonitorItem {
    scheduleId: string;
    kelas: string;
    jam: string;
    mapel: string;
    teacherName: string;
    teacherId?: string;
    isFilled: boolean;
    isInval?: boolean;
    substituteTeacherName?: string;
    replacedTeacherName?: string;
}

interface DashboardStats {
    alpaCount: number;
    kbmPercentage: string;
    cleanestClass: string;
    mostEmptyClass: string;
}

const OperatorDashboard: React.FC = () => {
  const { isAdmin, isOperator, profile, academicYear, semester , activeScheduleVersion , semesterStart, semesterEnd } = useAuth();
  const canAccessGroupAttendance = isAdmin || isOperator || profile?.role === 'admin' || profile?.role === 'operator';
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  
  const [filterDate, setFilterDate] = useState(getWIBISOString());
  const [searchTerm, setSearchTerm] = useState('');

  const [data7, setData7] = useState<MonitorItem[]>([]);
  const [data8, setData8] = useState<MonitorItem[]>([]);
  const [data9, setData9] = useState<MonitorItem[]>([]);
  
  const [stats, setStats] = useState<DashboardStats>({
      alpaCount: 0,
      kbmPercentage: '0%',
      cleanestClass: '-',
      mostEmptyClass: '-'
  });
  
  const [absenceList, setAbsenceList] = useState<any[]>([]);
  const [studentClassCounts, setStudentClassCounts] = useState<Record<string, number>>({});
  const [absenceStats, setAbsenceStats] = useState({ S: 0, I: 0, A: 0, D: 0 });
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedInvalModal, setSelectedInvalModal] = useState<MonitorItem | null>(null);
  const [expandedClass, setExpandedClass] = useState<string | null>(null);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string | null>(null);

  const [missingTeachers, setMissingTeachers] = useState<{name: string, kelas: string}[]>([]);
  
  const [tickerIndex, setTickerIndex] = useState(0); 
  const [rotationIndex, setRotationIndex] = useState(0); 

  const [profiles, setProfiles] = useState<Profile[]>([]);
  
  const profilesRef = useRef<Profile[]>([]);

  // OPERATOR GROUP ATTENDANCE STATE
  const [showOperatorInputForm, setShowOperatorInputForm] = useState(false);
  const [selectedOperatorClass, setSelectedOperatorClass] = useState('7A');
  const [operatorStudents, setOperatorStudents] = useState<any[]>([]);
  const [operatorAttendance, setOperatorAttendance] = useState<Record<string, 'S' | 'I' | 'A' | 'D'>>({});
  const [savingOperatorAttendance, setSavingOperatorAttendance] = useState(false);
  const [operatorSaveSuccess, setOperatorSaveSuccess] = useState<string | null>(null);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const fetchOperatorClassStudents = async (kelas: string, date: string) => {
    setLoadingStudents(true);
    try {
      let { data: stData, error: errSt } = await supabase
        .from('students')
        .select('*')
        .eq('academic_year', academicYear || '2025/2026')
        .eq('kelas', kelas)
        .order('name');

      if (errSt && (errSt.code === '42703' || errSt.message?.includes('academic_year'))) {
        const fallback = await supabase
          .from('students')
          .select('*')
          .eq('kelas', kelas)
          .order('name');
        stData = fallback.data || [];
      }

      setOperatorStudents(stData || []);

      const { data: hData } = await supabase
        .from('homeroom_attendance')
        .select('student_id, status')
        .eq('date', date)
        .eq('kelas', kelas);

      const initialAttendance: Record<string, 'S' | 'I' | 'A' | 'D'> = {};
      if (hData) {
        hData.forEach((r: any) => {
          if (['S', 'I', 'A', 'D'].includes(r.status)) {
            initialAttendance[r.student_id] = r.status;
          }
        });
      }
      setOperatorAttendance(initialAttendance);
    } catch (e) {
      console.error('Error fetching operator class students:', e);
    } finally {
      setLoadingStudents(false);
    }
  };

  useEffect(() => {
    if (showOperatorInputForm && selectedOperatorClass) {
      fetchOperatorClassStudents(selectedOperatorClass, filterDate);
    }
  }, [showOperatorInputForm, selectedOperatorClass, filterDate, academicYear]);

  const toggleOperatorStudentStatus = (studentId: string, status: 'S' | 'I' | 'A' | 'D') => {
    setOperatorAttendance(prev => {
      const copy = { ...prev };
      if (copy[studentId] === status) {
        delete copy[studentId];
      } else {
        copy[studentId] = status;
      }
      return copy;
    });
  };

  const handleSaveOperatorAttendance = async () => {
    if (!selectedOperatorClass) return;
    setSavingOperatorAttendance(true);
    setOperatorSaveSuccess(null);
    try {
      const studentIds = operatorStudents.map(s => s.id);
      const inserts = Object.entries(operatorAttendance).map(([studentId, status]) => ({
        date: filterDate,
        kelas: selectedOperatorClass,
        student_id: studentId,
        status: status,
        created_by: profile?.id || profilesRef.current?.[0]?.id
      }));

      if (studentIds.length > 0) {
        await supabase.from('homeroom_attendance').delete().eq('date', filterDate).in('student_id', studentIds);
      }

      if (inserts.length > 0) {
        const { error } = await supabase.from('homeroom_attendance').insert(inserts);
        if (error) throw error;
      }

      setOperatorSaveSuccess(`Absensi Kelas ${selectedOperatorClass} tanggal ${formatDateIndo(filterDate)} berhasil disimpan ke Supabase! Presensi di jurnal KBM sudah terkunci.`);
      setTimeout(() => setOperatorSaveSuccess(null), 5000);
      await fetchMonitorData();
    } catch (e: any) {
      console.error('Failed to save operator attendance:', e);
      alert('Gagal menyimpan absensi: ' + (e.message || e));
    } finally {
      setSavingOperatorAttendance(false);
    }
  };

  useEffect(() => { profilesRef.current = profiles; }, [profiles]);

  useEffect(() => {
    fetchInitData();
    const journalChannel = supabase.channel('realtime-operator-journals').on('postgres_changes', { event: '*', schema: 'public', table: 'journals' }, (payload) => { console.log('Realtime update received:', payload); fetchMonitorData(); }).subscribe();
    const attendanceChannel = supabase.channel('realtime-operator-attendance').on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_logs' }, () => { fetchMonitorData(); }).on('postgres_changes', { event: '*', schema: 'public', table: 'homeroom_attendance' }, () => { fetchMonitorData(); }).subscribe();
    const refreshInterval = setInterval(() => { fetchMonitorData(); }, 180000);
    return () => { supabase.removeChannel(journalChannel); supabase.removeChannel(attendanceChannel); clearInterval(refreshInterval); };
  }, [filterDate, academicYear, semester, activeScheduleVersion, semesterStart, semesterEnd]); 

  useEffect(() => { if (missingTeachers.length === 0) return; const timer = setInterval(() => { setTickerIndex(prev => (prev + 1) % missingTeachers.length); }, 4000); return () => clearInterval(timer); }, [missingTeachers]);
  useEffect(() => { const rotationTimer = setInterval(() => { setRotationIndex(prev => prev + 1); }, 3000); return () => clearInterval(rotationTimer); }, []);

  const fetchInitData = async () => {
      setLoading(true);
      const { data } = await supabase.from('profiles').select('id, full_name, nip, role');
      const loadedProfiles = (data as Profile[]) || [];
      setProfiles(loadedProfiles);
      await fetchMonitorData(loadedProfiles);
      setLoading(false);
  };

  const formatJam = (jamStr: string) => {
      const nums = jamStr.split(',').map(j => parseInt(j.trim())).filter(n => !isNaN(n));
      if (nums.length === 0) return jamStr;
      nums.sort((a, b) => a - b);
      const groups: number[][] = [];
      let currentGroup: number[] = [nums[0]];
      for (let i = 1; i < nums.length; i++) { if (nums[i] === nums[i-1] + 1) { currentGroup.push(nums[i]); } else { groups.push(currentGroup); currentGroup = [nums[i]]; } }
      groups.push(currentGroup);
      return groups.map(g => g.length > 1 ? `${g[0]}-${g[g.length-1]}` : `${g[0]}`).join(', ');
  };

  const fetchMonitorData = async (currentProfiles?: Profile[]) => {
      try {
          const dateObj = new Date(filterDate); const jsDay = dateObj.getDay(); const dbDay = jsDay === 0 ? 7 : jsDay; 
          const startOfDay = `${filterDate}T00:00:00+07:00`; const endOfDay = `${filterDate}T23:59:59+07:00`;
          const activeProfiles = currentProfiles || profilesRef.current;

          const [schedulesRes, journalsRes, attendanceRes, studentsRes, homeroomRes] = await Promise.all([
              supabase.from('schedules').select('*').eq('day_of_week', dbDay).eq('academic_year', academicYear || '2025/2026').eq('semester', semester || 'Ganjil').eq('schedule_version', activeScheduleVersion || 'Utama').then(async (res) => {
                  if (res.error && (res.error.code === '42703' || res.error.message?.includes('academic_year') || res.error.message?.includes('schedule_version'))) {
                      const fallback = await supabase.from('schedules').select('*').eq('day_of_week', dbDay).eq('academic_year', academicYear || '2025/2026').eq('semester', semester || 'Genap');
                      if (fallback.error) {
                          const ultraFallback = await supabase.from('schedules').select('*').eq('day_of_week', dbDay);
                          if (ultraFallback.data) {
                              ultraFallback.data = ultraFallback.data.filter(s => s.academic_year === academicYear && s.semester === semester);
                          }
                          return ultraFallback;
                      }
                      return fallback;
                  }
                  return res;
              }),
              supabase.from('journals').select('teacher_id, kelas, subject, hours, cleanliness, validation, inval_teacher_name').gte('created_at', startOfDay).lte('created_at', endOfDay).then(async (res) => {
                  if (res.error && (res.error.code === '42703' || res.error.message?.includes('validation') || res.error.message?.includes('inval_teacher_name'))) {
                      return supabase.from('journals').select('teacher_id, kelas, subject, hours, cleanliness').gte('created_at', startOfDay).lte('created_at', endOfDay);
                  }
                  return res;
              }),
              supabase.from('attendance_logs').select('student_id, student_name, status, created_at').gte('created_at', startOfDay).lte('created_at', endOfDay),
              supabase.from('students').select('id, kelas, name').eq('academic_year', academicYear || '2025/2026').then(async (res) => {
                  if (res.error || !res.data || res.data.length === 0) {
                      return supabase.from('students').select('id, kelas, name');
                  }
                  return res;
              }),
              supabase.from('homeroom_attendance').select('student_id, status, kelas, created_by').eq('date', filterDate)
          ]);

          const schedules = schedulesRes.data || [];
          const journals = journalsRes.data || [];
          const attendanceLogs = attendanceRes.data || [];
          const studentsData = studentsRes.data || [];
          const homeroomLogs = homeroomRes.data || [];

          const processed: MonitorItem[] = schedules.map(sch => {
              const schHours = sch.hour.split(',').map((h: string) => h.trim());
              const matchingJournal = journals.find(j => {
                  if (j.kelas !== sch.kelas || j.subject !== sch.subject) return false;
                  if (j.teacher_id && j.teacher_id === sch.teacher_id) return true;
                  const jHours = j.hours ? j.hours.split(',').map((h: string) => h.trim()) : [];
                  return schHours.some((h: string) => jHours.includes(h));
              });
              const isFilled = !!matchingJournal;
              let tName = '-';
              if (activeProfiles && activeProfiles.length > 0) {
                  let p = activeProfiles.find(p => p.id === sch.teacher_id);
                  if (!p && sch.teacher_nip) p = activeProfiles.find(p => p.nip === sch.teacher_nip);
                  if (p) tName = p.full_name; else tName = 'Guru Tidak Ditemukan';
              } else if (sch.teacher_id) { tName = 'Memuat...'; }

              let isInval = false;
              let substituteTeacherName = '';
              let replacedTeacherName = '';

              if (matchingJournal) {
                  const jVal = (matchingJournal as any).validation;
                  const jInvalName = (matchingJournal as any).inval_teacher_name;
                  if (jVal === 'inval' || jInvalName || (matchingJournal.teacher_id && matchingJournal.teacher_id !== sch.teacher_id)) {
                      isInval = true;
                      const subProfile = activeProfiles.find(p => p.id === matchingJournal.teacher_id);
                      substituteTeacherName = subProfile ? subProfile.full_name : 'Guru Piket';
                      replacedTeacherName = jInvalName || tName;
                  }
              }

              return { 
                  scheduleId: sch.id, 
                  kelas: sch.kelas, 
                  jam: sch.hour, 
                  mapel: sch.subject, 
                  teacherName: tName, 
                  teacherId: sch.teacher_id, 
                  isFilled, 
                  isInval, 
                  substituteTeacherName, 
                  replacedTeacherName 
              };
          });

          const sortBase = (items: MonitorItem[]) => {
              return items.sort((a, b) => {
                  if (a.kelas !== b.kelas) return a.kelas.localeCompare(b.kelas);
                  const getFirstHour = (jamStr: string) => { const first = jamStr.split(',')[0].split('-')[0]; return parseInt(first) || 0; }
                  return getFirstHour(a.jam) - getFirstHour(b.jam);
              });
          };

          setData7(sortBase(processed.filter(i => i.kelas.startsWith('7'))));
          setData8(sortBase(processed.filter(i => i.kelas.startsWith('8'))));
          setData9(sortBase(processed.filter(i => i.kelas.startsWith('9'))));

          const studentClassMap: Record<string, string> = {};
          const studentNameMap: Record<string, string> = {};
          const classCounts: Record<string, number> = {}; 
          studentsData.forEach((s: any) => { studentClassMap[s.id] = s.kelas; studentNameMap[s.id] = s.name; if (s.kelas) { classCounts[s.kelas] = (classCounts[s.kelas] || 0) + 1; } });
          setStudentClassCounts(classCounts);

          // Fetch names for any missing student IDs from homeroomLogs or attendanceLogs
          const missingStudentIds = Array.from(new Set([
            ...homeroomLogs.map((h: any) => h.student_id),
            ...attendanceLogs.map((l: any) => l.student_id)
          ])).filter((id: string) => id && !studentNameMap[id]);

          if (missingStudentIds.length > 0) {
              const { data: missingData } = await supabase.from('students').select('id, name, kelas').in('id', missingStudentIds);
              if (missingData) {
                  missingData.forEach((s: any) => {
                      studentNameMap[s.id] = s.name;
                      if (s.kelas) studentClassMap[s.id] = s.kelas;
                  });
              }
          }

          const profileRoleMap: Record<string, { role?: string; nip?: string; name?: string }> = {};
          if (activeProfiles && activeProfiles.length > 0) {
              activeProfiles.forEach((p: any) => {
                  if (p.id) profileRoleMap[p.id] = { role: p.role, nip: p.nip, name: p.full_name };
              });
          }

          const uniqueAbsenceMap: Record<string, {name: string, status: string, kelas: string, source?: string}> = {};
          homeroomLogs.forEach((h: any) => { 
            if (['S', 'I', 'A', 'D'].includes(h.status)) { 
              let src = 'Wali';
              if (h.created_by) {
                const creator = profileRoleMap[h.created_by];
                if (creator) {
                  const r = (creator.role || '').toLowerCase();
                  const nip = String(creator.nip || '');
                  const name = (creator.name || '').toLowerCase();
                  if (r === 'operator' || r === 'admin' || nip === '112233' || nip === '20535439' || name.includes('admin') || name.includes('operator') || name.includes('tata usaha') || name.includes('tu')) {
                    src = 'TU';
                  } else {
                    src = 'Wali';
                  }
                } else {
                  src = 'TU';
                }
              } else {
                src = 'TU';
              }
              uniqueAbsenceMap[h.student_id] = { 
                name: studentNameMap[h.student_id] || h.student_name || 'Siswa', 
                status: h.status, 
                kelas: studentClassMap[h.student_id] || h.kelas || '?',
                source: src
              }; 
            } 
          });
          attendanceLogs.forEach((log: any) => { 
            if (!uniqueAbsenceMap[log.student_id]) { 
              if (['S', 'I', 'A', 'D'].includes(log.status)) { 
                uniqueAbsenceMap[log.student_id] = { 
                  name: log.student_name || studentNameMap[log.student_id] || 'Siswa', 
                  status: log.status, 
                  kelas: studentClassMap[log.student_id] || '?',
                  source: 'Guru'
                }; 
              } 
            } 
          });

          const absenceListFinal = Object.values(uniqueAbsenceMap).sort((a,b) => a.kelas.localeCompare(b.kelas) || a.name.localeCompare(b.name));
          let sCount = 0, iCount = 0, aCount = 0, dCount = 0;
          absenceListFinal.forEach(item => { 
            if (item.status === 'S') sCount++; 
            else if (item.status === 'I') iCount++; 
            else if (item.status === 'A') aCount++; 
            else if (item.status === 'D') dCount++; 
          });

          setAbsenceList(absenceListFinal);
          setAbsenceStats({ S: sCount, I: iCount, A: aCount, D: dCount });

          let completedJp = 0;
          journals.forEach((j: any) => {
              if (typeof j.hours === 'string') {
                  const parts = j.hours.split(',').filter((h: string) => h.trim().length > 0);
                  completedJp += parts.length;
              }
          });

          let jpPerClass = 0;
          if (jsDay === 1) jpPerClass = 7;
          else if (jsDay >= 2 && jsDay <= 4) jpPerClass = 8;
          else if (jsDay === 5) jpPerClass = 5;
          else if (jsDay === 6) jpPerClass = 6;

          const activeClassesCount = Object.keys(classCounts).length || 12;
          const totalJpRequired = activeClassesCount * jpPerClass;

          const kbmPct = totalJpRequired > 0 ? (Math.round((completedJp / totalJpRequired) * 1000) / 10) : 0;

          const cleanCounts: Record<string, number> = {};
          journals.forEach(j => { if (j.cleanliness === 'sudah_bersih') cleanCounts[j.kelas] = (cleanCounts[j.kelas] || 0) + 1; });
          let cleanest = '-'; let maxClean = -1;
          Object.entries(cleanCounts).forEach(([cls, count]) => { if (count > maxClean) { maxClean = count; cleanest = cls; } });

          const emptyCounts: Record<string, number> = {};
          processed.filter(i => !i.isFilled).forEach(i => { emptyCounts[i.kelas] = (emptyCounts[i.kelas] || 0) + 1; });
          let emptiest = '-'; let maxEmpty = -1;
          Object.entries(emptyCounts).forEach(([cls, count]) => { if (count > maxEmpty) { maxEmpty = count; emptiest = cls; } });

          setStats({ alpaCount: absenceListFinal.length, kbmPercentage: `${kbmPct}%`, cleanestClass: cleanest, mostEmptyClass: emptiest });

          const missing = processed.filter(i => !i.isFilled).map(i => ({ name: i.teacherName, kelas: i.kelas }));
          const uniqueMissing: {name: string, kelas: string}[] = [];
          const seenNames = new Set();
          missing.forEach(m => { if (!seenNames.has(m.name)) { seenNames.add(m.name); uniqueMissing.push(m); } });
          setMissingTeachers(uniqueMissing);
          setLastUpdated(new Date());

      } catch (err) { console.error("Monitor fetch error", err); }
  };

  const handleAbsenceClick = () => { setModalOpen(true); setExpandedClass(null); };

  const getRotatedList = (items: MonitorItem[]) => {
      const unfilled = items.filter(i => !i.isFilled);
      const filled = items.filter(i => i.isFilled);
      if (unfilled.length === 0) return filled;
      const shift = rotationIndex % unfilled.length;
      const rotatedUnfilled = [...unfilled.slice(shift), ...unfilled.slice(0, shift)];
      return [...rotatedUnfilled, ...filled];
  };

  const TableSection = ({ title, items, colorClass }: { title: string, items: MonitorItem[], colorClass: string }) => {
      let filteredItems = items.filter(item => 
        item.teacherName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        item.mapel.toLowerCase().includes(searchTerm.toLowerCase()) || 
        item.kelas.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.substituteTeacherName && item.substituteTeacherName.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      // Display stationary list, sorted cleanly by class and hour
      const displayItems = filteredItems;
      return (
        <div className="flex flex-col h-full bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className={`py-2 px-3 text-white text-center font-extrabold uppercase tracking-wider ${colorClass} text-xs sm:text-sm`}>{title}</div>
            <div className="bg-white dark:bg-slate-900 flex-1 overflow-x-auto">
                <table className="w-full text-left table-fixed border-collapse">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-300 dark:border-slate-700 text-[11px]">
                        <tr>
                            <th className="px-0.5 py-1.5 w-[10%] text-center border-r border-slate-200 dark:border-slate-700">Kelas</th>
                            <th className="px-0.5 py-1.5 w-[9%] text-center border-r border-slate-200 dark:border-slate-700">Jam</th>
                            <th className="px-1.5 py-1.5 w-[66%] border-r border-slate-200 dark:border-slate-700">Guru / Mapel</th>
                            <th className="px-1 py-1.5 w-[15%] text-center">Sts</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {displayItems.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="p-6 text-center text-slate-400 dark:text-slate-500 italic text-xs">Tidak ada jadwal.</td>
                            </tr>
                        ) : (
                            displayItems.map((item) => (
                                <tr key={item.scheduleId} className={`transition-colors border-b border-slate-200 dark:border-slate-700 ${item.isFilled ? (item.isInval ? 'bg-purple-50/40 dark:bg-purple-950/20 hover:bg-purple-100/50' : 'bg-white dark:bg-slate-900 hover:bg-purple-50/50 dark:hover:bg-slate-800/60') : 'bg-rose-50/70 dark:bg-rose-950/30 hover:bg-rose-100/50'}`}>
                                    <td className="px-0.5 py-1 text-center font-bold text-slate-800 dark:text-slate-200 text-xs border-r border-slate-200 dark:border-slate-700">{item.kelas}</td>
                                    <td className="px-0.5 py-1 text-center font-mono font-medium text-slate-600 dark:text-slate-400 text-[11px] border-r border-slate-200 dark:border-slate-700">{formatJam(item.jam)}</td>
                                    <td className="px-1.5 py-1 overflow-hidden border-r border-slate-200 dark:border-slate-700">
                                        <div className="font-bold text-slate-800 dark:text-slate-100 truncate text-xs leading-snug">{item.teacherName}</div>
                                        <div className="text-purple-700 dark:text-purple-400 font-semibold truncate text-[10px] leading-snug">{item.mapel}</div>
                                    </td>
                                    <td className="px-1 py-1 text-center">
                                        {item.isFilled ? (
                                            item.isInval ? (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedInvalModal(item);
                                                    }}
                                                    title={`INVAL: Digantikan oleh ${item.substituteTeacherName || 'Guru Piket'}`}
                                                    className="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-purple-600 hover:bg-purple-700 text-white dark:bg-purple-600 dark:hover:bg-purple-500 transition-all cursor-pointer shadow-sm active:scale-95"
                                                >
                                                    INVAL
                                                </button>
                                            ) : (
                                                <CheckCircle2 className="text-emerald-500 inline-block w-4 h-4 sm:w-5 sm:h-5" />
                                            )
                                        ) : (
                                            <XCircle className="text-rose-500 inline-block w-4 h-4 sm:w-5 sm:h-5" />
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            <div className="p-2 bg-slate-50 dark:bg-slate-800 text-center text-xs text-slate-600 dark:text-slate-300 font-bold border-t border-slate-200 dark:border-slate-700">
                {items.filter(i => i.isFilled).length} / {items.length} Terisi
            </div>
        </div>
      );
  };

  const StatCard = ({ label, value, icon: Icon, colorClass, bgClass, onClick }: any) => (<div onClick={onClick} className={`bg-white p-3 rounded-xl shadow-sm border border-slate-100 flex items-center gap-3 ${onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-1 transition-all' : ''}`}><div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${bgClass} ${colorClass}`}><Icon size={20} /></div><div className="min-w-0"><p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide truncate">{label}</p><p className={`text-xl font-extrabold ${colorClass}`}>{value}</p></div></div>);

  const groupedAbsence = absenceList.reduce((acc: any, curr: any) => { if (!acc[curr.kelas]) acc[curr.kelas] = []; acc[curr.kelas].push(curr); return acc; }, {});
  const allUniqueClasses = Object.keys(studentClassCounts).sort();

  return (
    <Layout collapsed={true}>
      <div className="flex flex-col gap-4 pb-20">
         <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
                <div className="bg-slate-800 p-2.5 rounded-xl text-white shadow-lg hidden sm:block"><MonitorPlay size={24} /></div>
                <div><h2 className="text-lg font-extrabold text-slate-800 leading-tight">Dashboard Monitoring KBM</h2>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-700">T.A: {academicYear}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-700">Semester: {semester}</span>
                    </div><div className="flex items-center gap-3 mt-0.5"><div className="flex items-center gap-1.5 bg-white px-2 py-0.5 rounded border border-slate-200 text-xs font-bold text-slate-600"><CalendarDays size={12}/><input type="date" className="bg-transparent border-none p-0 text-xs font-bold text-slate-700 focus:ring-0 cursor-pointer" value={filterDate} onChange={(e) => setFilterDate(e.target.value)}/></div><span className="text-[10px] text-slate-400 font-mono hidden md:inline">Live Update</span></div></div>
            </div>
            <div className="flex-1 overflow-hidden relative bg-amber-50 border border-amber-200 rounded-xl px-3 py-1.5 flex items-center gap-2 min-h-[42px]">
                <div className="flex-shrink-0 bg-amber-200 text-amber-700 p-1 rounded-lg"><AlertTriangle size={16} /></div>
                <div className="flex-1 min-w-0"><p className="text-[9px] font-bold text-amber-600 uppercase tracking-wide">Guru Belum Mengisi Jurnal</p><div className="relative h-5 w-full overflow-hidden">{missingTeachers.length > 0 ? (<div className="absolute transition-all duration-500 ease-in-out transform w-full" key={tickerIndex}><p className="text-sm font-bold text-amber-800 truncate">{missingTeachers[tickerIndex]?.name} <span className="text-amber-600 font-normal text-xs">({missingTeachers[tickerIndex]?.kelas})</span></p></div>) : (<p className="text-sm font-bold text-green-600">Semua Guru Sudah Mengisi! 🎉</p>)}</div></div>
            </div>
            <div className="flex items-center gap-2">
                 <div className="relative"><Search className="absolute left-3 top-2.5 text-slate-400" size={14}/><input type="text" placeholder="Cari Guru / Mapel..." className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 w-40" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/></div>
                 <button onClick={() => fetchMonitorData()} className="p-1.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors" title="Refresh"><RefreshCw size={18} className={loading ? "animate-spin" : ""} /></button>
            </div>
         </div>

         <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
             <StatCard label="Ketidakhadiran Murid" value={stats.alpaCount} icon={UserX} colorClass="text-red-600" bgClass="bg-red-50" onClick={handleAbsenceClick} />
             <StatCard label="Keterlaksanaan" value={stats.kbmPercentage} icon={Percent} colorClass="text-purple-600" bgClass="bg-purple-50" />
             <StatCard label="Kelas Terbersih" value={stats.cleanestClass} icon={Sparkles} colorClass="text-green-600" bgClass="bg-green-50" />
             <StatCard label="Jam Kosong Max" value={stats.mostEmptyClass} icon={Clock} colorClass="text-purple-600" bgClass="bg-purple-50" />
         </div>

         {/* REKAP ABSENSI KELAS - INPUT ABSENSI BERKELOMPOK (OPERATOR & ADMIN ONLY) */}
         {canAccessGroupAttendance && (
         <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 relative overflow-hidden group hover:border-purple-200 transition-colors">
            <div className="absolute -top-6 -right-6 p-4 opacity-5 dark:opacity-10 pointer-events-none rotate-12">
              <ClipboardList size={140} className="text-slate-800 dark:text-slate-100" />
            </div>

            <div className="flex flex-col md:flex-row gap-4 md:gap-8 relative z-10">
              {/* Header Left */}
              <div className="flex flex-row md:flex-col items-center md:items-start gap-4 flex-shrink-0 md:min-w-[220px] md:border-r md:border-slate-100 dark:md:border-slate-700 md:pr-4 pt-2 md:pt-0">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center shadow-sm border bg-purple-50 dark:bg-purple-900/30 border-purple-100 dark:border-purple-800 text-purple-600 dark:text-purple-400">
                  <Users size={22} />
                </div>
                <div className="flex-1 w-full">
                  <h3 className="font-extrabold text-slate-800 dark:text-white text-xs uppercase tracking-wide leading-relaxed">
                    Rekap Absensi Kelas <br className="hidden md:block"/> (Absen Berkelompok)
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-medium leading-tight">
                    Level Operator: Bebas pilih kelas untuk kunci absensi murid di jurnal KBM.
                  </p>
                  
                  <button 
                    onClick={() => setShowOperatorInputForm(!showOperatorInputForm)}
                    className={`mt-3 w-full text-xs py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-md shadow-purple-200 dark:shadow-none transition-all active:scale-95 cursor-pointer ${
                      showOperatorInputForm 
                      ? 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-200'
                      : 'bg-purple-600 hover:bg-purple-700 text-white'
                    }`}
                  >
                    {showOperatorInputForm ? <ChevronUp size={14}/> : <Plus size={14}/>} 
                    {showOperatorInputForm ? 'Tutup Form' : 'Input Absensi Berkelompok'}
                  </button>
                </div>
              </div>

              {/* Content Right */}
              <div className="flex-1 min-w-0 flex flex-col gap-4">
                {/* SUCCESS NOTIFICATION TOAST */}
                {operatorSaveSuccess && (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-2 animate-fade-in shadow-sm">
                    <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                    <span>{operatorSaveSuccess}</span>
                  </div>
                )}

                {/* INPUT FORM (When Toggled) */}
                {showOperatorInputForm && (
                  <div className="p-4 border-2 border-purple-100 dark:border-slate-600 rounded-2xl bg-white dark:bg-slate-800 animate-fade-in shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-700">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Edit2 size={16} className="text-purple-600" />
                        <span className="font-extrabold text-slate-800 dark:text-white text-xs uppercase tracking-wide">
                          Input Absensi Kelas:
                        </span>
                        <select 
                          value={selectedOperatorClass}
                          onChange={(e) => setSelectedOperatorClass(e.target.value)}
                          className="bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200 border border-purple-300 dark:border-purple-700 rounded-xl px-3 py-1 font-extrabold text-xs cursor-pointer outline-none focus:ring-2 focus:ring-purple-500 shadow-sm"
                        >
                          {['7A','7B','7C','7D','7E','7F','7G','7H','8A','8B','8C','8D','8E','8F','8G','8H','9A','9B','9C','9D','9E','9F','9G','9H'].map(k => (
                            <option key={k} value={k}>Kelas {k}</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] text-slate-400 font-bold">Pilihan Cepat Status:</span>
                        <div className="flex gap-1">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-yellow-100 text-yellow-800 border border-yellow-300">S (Sakit)</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">I (Izin)</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-300">D (Dispen)</span>
                        </div>
                        <button 
                          onClick={() => setOperatorAttendance({})}
                          className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 px-2 py-1 rounded transition-colors"
                        >
                          Reset
                        </button>
                      </div>
                    </div>

                    {/* Student List */}
                    {loadingStudents ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="animate-spin text-purple-600" size={24} />
                      </div>
                    ) : operatorStudents.length === 0 ? (
                      <div className="p-6 text-center text-slate-400 text-xs italic bg-slate-50 dark:bg-slate-900 rounded-xl">
                        Tidak ada data murid di kelas {selectedOperatorClass}.
                      </div>
                    ) : (
                      <div className="max-h-[300px] overflow-y-auto custom-scrollbar border border-slate-100 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-700/30">
                        <div className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600 px-3 py-2 flex items-center text-[10px] font-bold text-slate-500 dark:text-slate-300 uppercase">
                          <div className="flex-1">NAMA MURID (KELAS {selectedOperatorClass})</div>
                          <div className="flex gap-1.5 w-24 justify-end">
                            <span className="w-7 text-center">S</span>
                            <span className="w-7 text-center">I</span>
                            <span className="w-7 text-center">D</span>
                          </div>
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-slate-700">
                          {operatorStudents.map(student => (
                            <div key={student.id} className="flex items-center justify-between px-3 py-2 hover:bg-white dark:hover:bg-slate-600/50 transition-colors">
                              <div className="flex-1 pr-2">
                                <p className="text-xs font-bold text-slate-700 dark:text-slate-200 line-clamp-1">{student.name}</p>
                              </div>
                              <div className="flex gap-1.5 w-24 justify-end">
                                {(['S', 'I', 'D'] as const).map(status => (
                                  <button 
                                    key={status}
                                    onClick={() => toggleOperatorStudentStatus(student.id, status)}
                                    className={`w-7 h-7 rounded-md flex items-center justify-center border transition-all text-[10px] font-bold ${
                                      operatorAttendance[student.id] === status
                                      ? (status === 'S' ? 'bg-yellow-500 border-yellow-600 text-white' 
                                        : status === 'I' ? 'bg-blue-500 border-blue-600 text-white' 
                                        : 'bg-purple-600 border-purple-700 text-white')
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
                    )}

                    <div className="flex justify-between items-center pt-2">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                        {Object.keys(operatorAttendance).length} murid ditandai tidak hadir.
                      </span>
                      <button 
                        onClick={handleSaveOperatorAttendance}
                        disabled={savingOperatorAttendance}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-md shadow-purple-200 dark:shadow-none disabled:opacity-50 transition-all text-xs active:scale-95 cursor-pointer"
                      >
                        {savingOperatorAttendance ? <Loader2 className="animate-spin" size={14}/> : <Save size={14} />} 
                        Simpan Ke Supabase (Kunci Presensi)
                      </button>
                    </div>
                  </div>
                )}

                {/* REKAP SUMMARY HEADER */}
                <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-700/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                    <CalendarDays size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-wide">Tanggal Rekap: {formatDateIndo(filterDate)}</span>
                  </div>
                  <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/40 px-2 py-0.5 rounded-md">
                    Total Ketidakhadiran: {absenceList.length} Murid
                  </span>
                </div>
              </div>
            </div>
         </div>
         )}

         {loading && profiles.length === 0 ? <div className="flex justify-center py-20"><Loader2 className="animate-spin text-purple-500" size={40} /></div> : (
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start w-full">
                 <TableSection title="Kelas 7" items={data7} colorClass="bg-emerald-600" />
                 <TableSection title="Kelas 8" items={data8} colorClass="bg-orange-500" />
                 <TableSection title="Kelas 9" items={data9} colorClass="bg-rose-600" />
             </div>
         )}

         {/* ABSENCE MODAL - TOP ALIGNED */}
         {modalOpen && (
            <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[calc(env(safe-area-inset-top)+1rem)] sm:p-4 bg-slate-900/50 backdrop-blur-sm transition-all duration-300" onClick={() => setModalOpen(false)}>
              <div className="bg-white rounded-2xl shadow-2xl w-full md:w-full md:max-w-md flex flex-col max-h-[85vh] overflow-hidden border border-slate-100 relative animate-fade-in" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center px-6 py-5 border-b border-gray-100">
                      <div>
                          <h3 className="font-extrabold text-slate-800 text-lg leading-tight">Rincian Ketidakhadiran Hari Ini</h3>
                          <p className="text-[10px] font-bold text-purple-500 uppercase mt-1">Rekap Ketidakhadiran</p>
                      </div>
                      <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1 bg-gray-50 rounded-full"><X size={20} /></button>
                  </div>
                  <div className="overflow-y-auto p-6 space-y-6 custom-scrollbar bg-white flex-1">
                        <div className="grid grid-cols-4 gap-2">
                            <button
                                type="button"
                                onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'S' ? null : 'S')}
                                className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border transition-all text-center cursor-pointer select-none active:scale-95 ${
                                    selectedStatusFilter === 'S' 
                                    ? 'bg-yellow-100 border-yellow-400 ring-2 ring-yellow-400 shadow-md scale-[1.02]' 
                                    : 'bg-yellow-50 border-yellow-100 hover:bg-yellow-100/60'
                                }`}
                            >
                                <span className="text-yellow-700 font-bold text-[10px] uppercase mb-0.5">Sakit</span>
                                <span className="text-2xl font-extrabold text-yellow-600">{absenceStats.S}</span>
                                <span className="text-[8px] font-bold text-yellow-700 mt-0.5 bg-yellow-200/60 px-1 py-0.5 rounded">
                                    {selectedStatusFilter === 'S' ? '✓ Dipilih' : 'Klik lihat'}
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'I' ? null : 'I')}
                                className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border transition-all text-center cursor-pointer select-none active:scale-95 ${
                                    selectedStatusFilter === 'I' 
                                    ? 'bg-blue-100 border-blue-400 ring-2 ring-blue-400 shadow-md scale-[1.02]' 
                                    : 'bg-blue-50 border-blue-100 hover:bg-blue-100/60'
                                }`}
                            >
                                <span className="text-blue-700 font-bold text-[10px] uppercase mb-0.5">Izin</span>
                                <span className="text-2xl font-extrabold text-blue-600">{absenceStats.I}</span>
                                <span className="text-[8px] font-bold text-blue-700 mt-0.5 bg-blue-200/60 px-1 py-0.5 rounded">
                                    {selectedStatusFilter === 'I' ? '✓ Dipilih' : 'Klik lihat'}
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'D' ? null : 'D')}
                                className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border transition-all text-center cursor-pointer select-none active:scale-95 ${
                                    selectedStatusFilter === 'D' 
                                    ? 'bg-purple-100 border-purple-400 ring-2 ring-purple-400 shadow-md scale-[1.02]' 
                                    : 'bg-purple-50 border-purple-100 hover:bg-purple-100/60'
                                }`}
                            >
                                <span className="text-purple-700 font-bold text-[10px] uppercase mb-0.5">Dispen</span>
                                <span className="text-2xl font-extrabold text-purple-600">{absenceStats.D}</span>
                                <span className="text-[8px] font-bold text-purple-700 mt-0.5 bg-purple-200/60 px-1 py-0.5 rounded">
                                    {selectedStatusFilter === 'D' ? '✓ Dipilih' : 'Klik lihat'}
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'A' ? null : 'A')}
                                className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border transition-all text-center cursor-pointer select-none active:scale-95 ${
                                    selectedStatusFilter === 'A' 
                                    ? 'bg-red-100 border-red-400 ring-2 ring-red-400 shadow-md scale-[1.02]' 
                                    : 'bg-red-50 border-red-100 hover:bg-red-100/60'
                                }`}
                            >
                                <span className="text-red-700 font-bold text-[10px] uppercase mb-0.5">Alpa</span>
                                <span className="text-2xl font-extrabold text-red-600">{absenceStats.A}</span>
                                <span className="text-[8px] font-bold text-red-700 mt-0.5 bg-red-200/60 px-1 py-0.5 rounded">
                                    {selectedStatusFilter === 'A' ? '✓ Dipilih' : 'Klik lihat'}
                                </span>
                            </button>
                        </div>

                        <div className="p-3 bg-[#F9F7FF] border border-slate-100 rounded-xl text-center">
                            <span className="text-[10px] text-purple-500 font-bold uppercase">*Termasuk input dari Wali Kelas & Guru Mapel.</span>
                        </div>

                        {selectedStatusFilter && (
                            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2 animate-fade-in shadow-inner">
                                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                                    <div className="flex items-center gap-2">
                                        <span className={`w-2.5 h-2.5 rounded-full ${
                                            selectedStatusFilter === 'S' ? 'bg-yellow-500' :
                                            selectedStatusFilter === 'I' ? 'bg-blue-500' :
                                            selectedStatusFilter === 'D' ? 'bg-purple-500' : 'bg-red-500'
                                        }`}></span>
                                        <span className="font-extrabold text-xs text-slate-800 uppercase">
                                            Daftar Siswa {selectedStatusFilter === 'S' ? 'Sakit' : selectedStatusFilter === 'I' ? 'Izin' : selectedStatusFilter === 'D' ? 'Dispen' : 'Alpa'} ({
                                                absenceList.filter(s => s.status === selectedStatusFilter).length
                                            } Anak)
                                        </span>
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={() => setSelectedStatusFilter(null)}
                                        className="text-[10px] font-bold text-purple-600 hover:underline bg-purple-100 px-2 py-0.5 rounded-md"
                                    >
                                        Reset Filter
                                    </button>
                                </div>

                                <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                                    {absenceList.filter(s => s.status === selectedStatusFilter).length === 0 ? (
                                        <div className="text-center py-4 text-xs text-slate-400 italic">
                                            Tidak ada siswa dengan status {selectedStatusFilter === 'S' ? 'Sakit' : selectedStatusFilter === 'I' ? 'Izin' : selectedStatusFilter === 'D' ? 'Dispen' : 'Alpa'}.
                                        </div>
                                    ) : (
                                        absenceList
                                            .filter(s => s.status === selectedStatusFilter)
                                            .sort((a, b) => (a.kelas || '').localeCompare(b.kelas || '') || a.name.localeCompare(b.name))
                                            .map((student, idx) => (
                                                <div key={idx} className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-100 text-xs shadow-sm">
                                                    <div className="flex items-center gap-2">
                                                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-black rounded text-[10px]">
                                                            {student.kelas}
                                                        </span>
                                                        <span className="font-bold text-slate-800">
                                                            {student.name}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        {student.source === 'TU' && (
                                                            <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded border border-amber-200 font-bold">
                                                                TU
                                                            </span>
                                                        )}
                                                        {student.source === 'Wali' && (
                                                            <span className="text-[9px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded border border-purple-200 font-bold">
                                                                Wali
                                                            </span>
                                                        )}
                                                        {student.source === 'Guru' && (
                                                            <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200 font-bold">
                                                                Guru
                                                            </span>
                                                        )}
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                                            student.status === 'S' ? 'bg-yellow-100 text-yellow-800' :
                                                            student.status === 'I' ? 'bg-blue-100 text-blue-800' :
                                                            student.status === 'D' ? 'bg-purple-100 text-purple-800' :
                                                            'bg-red-100 text-red-800'
                                                        }`}>
                                                            {student.status === 'S' ? 'SAKIT' : student.status === 'I' ? 'IZIN' : student.status === 'D' ? 'DISPEN' : 'ALPA'}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))
                                    )}
                                </div>
                            </div>
                        )}
                        <hr className="border-gray-100" />
                        <div>
                            <div className="flex items-center gap-2 mb-4"><Bookmark size={16} className="text-orange-500 fill-orange-500"/><h4 className="font-bold text-slate-700 text-sm">Rincian Per Kelas</h4></div>
                            <div className="space-y-3">
                                {allUniqueClasses.length === 0 ? <div className="text-center text-xs text-gray-400 italic">Belum ada data siswa/kelas.</div> : allUniqueClasses.map(cls => {
                                        const studentsInClass = groupedAbsence[cls] || [];
                                        const totalStudents = studentClassCounts[cls] || 0;
                                        const absentCount = studentsInClass.length;
                                        const presentCount = totalStudents > 0 ? totalStudents - absentCount : 0;
                                        const isExpanded = expandedClass === cls;
                                        const hasAbsence = absentCount > 0;
                                        return (
                                            <div key={cls} className="border border-gray-100 rounded-2xl overflow-hidden transition-all hover:shadow-sm">
                                                <button onClick={() => hasAbsence && setExpandedClass(isExpanded ? null : cls)} className={`w-full flex items-center justify-between p-3 bg-white ${!hasAbsence ? 'cursor-default' : ''}`}><div className="flex items-center gap-3"><div className={`w-10 h-10 flex items-center justify-center rounded-xl font-bold text-sm shadow-sm ${hasAbsence ? 'bg-red-50 border border-red-100 text-red-700' : 'bg-green-50 border border-green-100 text-green-700'}`}>{cls}</div><div className="text-xs font-bold text-slate-700"><span className="text-green-600">{presentCount > 0 ? `${presentCount} Hadir` : 'Hadir'}</span><span className="text-gray-300 mx-2">|</span><span className={hasAbsence ? 'text-red-500' : 'text-slate-300'}>{absentCount} Tidak Hadir</span></div></div>{hasAbsence && (<div className="text-gray-300">{isExpanded ? <ChevronDown size={18}/> : <ChevronRight size={18}/>}</div>)}</button>
                                                {isExpanded && hasAbsence && (<div className="bg-gray-50 p-3 border-t border-gray-100 space-y-2 animate-fade-in">{studentsInClass.map((s: any, idx: number) => (<div key={idx} className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-100 text-xs shadow-sm"><span className="font-bold text-slate-700">{s.name}</span><div className="flex items-center gap-1.5">{s.source === 'TU' && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200">TU</span>}{s.source === 'Wali' && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-700 border border-purple-200">Wali</span>}{s.source === 'Guru' && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-700 border border-blue-200">Guru</span>}<span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${s.status === 'S' ? 'bg-yellow-100 text-yellow-800' : s.status === 'I' ? 'bg-blue-100 text-blue-800' : s.status === 'D' ? 'bg-purple-100 text-purple-800' : 'bg-red-100 text-red-800'}`}>{s.status === 'S' ? 'SAKIT' : s.status === 'I' ? 'IZIN' : s.status === 'D' ? 'DISPEN' : 'ALPA'}</span></div></div>))}</div>)}
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                  </div>
              </div>
            </div>
         )}

         {/* INVAL DETAIL MODAL - TOP ALIGNED */}
         {selectedInvalModal && (
            <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[calc(env(safe-area-inset-top)+1rem)] sm:p-4 bg-slate-900/50 backdrop-blur-sm transition-all duration-300" onClick={() => setSelectedInvalModal(null)}>
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-100 dark:border-slate-700 relative animate-fade-in" onClick={e => e.stopPropagation()}>
                    <div className="bg-purple-600 p-5 flex justify-between items-center text-white">
                        <div className="flex items-center gap-2">
                            <UserCheck size={22} />
                            <h3 className="font-extrabold text-base leading-tight">Detail Guru Pengganti (INVAL)</h3>
                        </div>
                        <button onClick={() => setSelectedInvalModal(null)} className="hover:bg-white/20 p-1.5 rounded-full transition-colors"><X size={18}/></button>
                    </div>
                    <div className="p-5 space-y-4 text-slate-700 dark:text-slate-200">
                        <div className="bg-purple-50 dark:bg-purple-900/30 p-3.5 rounded-xl border border-purple-200 dark:border-purple-800 space-y-2.5 text-xs">
                            <div className="flex justify-between items-center border-b border-purple-100 dark:border-purple-800/60 pb-2">
                                <span className="font-semibold text-slate-500 dark:text-slate-400">Kelas & Jam:</span>
                                <span className="font-extrabold text-purple-800 dark:text-purple-200">{selectedInvalModal.kelas} (Jam ke-{formatJam(selectedInvalModal.jam)})</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-purple-100 dark:border-purple-800/60 pb-2">
                                <span className="font-semibold text-slate-500 dark:text-slate-400">Mata Pelajaran:</span>
                                <span className="font-bold text-slate-800 dark:text-white">{selectedInvalModal.mapel}</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-purple-100 dark:border-purple-800/60 pb-2">
                                <span className="font-semibold text-slate-500 dark:text-slate-400">Guru Utama (Jadwal):</span>
                                <span className="font-bold text-rose-600 dark:text-rose-400">{selectedInvalModal.teacherName}</span>
                            </div>
                            <div className="flex justify-between items-center pt-0.5">
                                <span className="font-semibold text-slate-500 dark:text-slate-400">Guru Pengganti / Piket:</span>
                                <span className="font-extrabold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/60 px-2 py-0.5 rounded border border-purple-300 dark:border-purple-700">
                                    {selectedInvalModal.substituteTeacherName || 'Guru Piket'}
                                </span>
                            </div>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center italic">
                            Jurnal KBM kelas ini diisi oleh guru pengganti secara realtime.
                        </p>
                        <button
                            onClick={() => setSelectedInvalModal(null)}
                            className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-md transition-all text-xs"
                        >
                            Tutup
                        </button>
                    </div>
                </div>
            </div>
         )}
      </div>
    </Layout>
  );
};

export default OperatorDashboard;
