
import React, { useEffect, useState, useRef } from 'react';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { Profile } from '../types';
import { getWIBISOString, formatDateIndo } from '../utils/dateUtils';
import { 
  MonitorPlay, CheckCircle2, Clock, Loader2, RefreshCw, CalendarDays, 
  UserX, Percent, Sparkles, AlertTriangle, Search, XCircle, X, Bookmark, ChevronRight, ChevronDown 
} from 'lucide-react';

interface MonitorItem {
    scheduleId: string;
    kelas: string;
    jam: string;
    mapel: string;
    teacherName: string;
    teacherId?: string;
    isFilled: boolean;
}

interface DashboardStats {
    alpaCount: number;
    kbmPercentage: string;
    cleanestClass: string;
    mostEmptyClass: string;
}

const OperatorDashboard: React.FC = () => {
  const { academicYear, semester , activeScheduleVersion , semesterStart, semesterEnd } = useAuth();
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
  const [absenceStats, setAbsenceStats] = useState({ S: 0, I: 0, A: 0 });
  const [modalOpen, setModalOpen] = useState(false);
  const [expandedClass, setExpandedClass] = useState<string | null>(null);

  const [missingTeachers, setMissingTeachers] = useState<{name: string, kelas: string}[]>([]);
  
  const [tickerIndex, setTickerIndex] = useState(0); 
  const [rotationIndex, setRotationIndex] = useState(0); 

  const [profiles, setProfiles] = useState<Profile[]>([]);
  
  const profilesRef = useRef<Profile[]>([]);

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
              supabase.from('journals').select('teacher_id, kelas, subject, hours, cleanliness').eq('academic_year', academicYear || '2025/2026').eq('semester', semester || 'Ganjil').gte('created_at', semesterStart ? `${semesterStart}T00:00:00+07:00` : '2000-01-01T00:00:00+07:00').lte('created_at', semesterEnd ? `${semesterEnd}T23:59:59+07:00` : '2100-01-01T23:59:59+07:00').gte('created_at', startOfDay).lte('created_at', endOfDay),
              supabase.from('attendance_logs').select('student_id, student_name, status, created_at').eq('academic_year', academicYear || '2025/2026').eq('semester', semester || 'Ganjil').gte('created_at', semesterStart ? `${semesterStart}T00:00:00+07:00` : '2000-01-01T00:00:00+07:00').lte('created_at', semesterEnd ? `${semesterEnd}T23:59:59+07:00` : '2100-01-01T23:59:59+07:00').gte('created_at', startOfDay).lte('created_at', endOfDay).neq('status', 'D'),
              supabase.from('students').select('id, kelas, name').eq('academic_year', academicYear || '2025/2026').then(async (res) => {
                  if (res.error && (res.error.code === '42703' || res.error.message?.includes('academic_year'))) {
                      return supabase.from('students').select('id, kelas, name').eq('academic_year', academicYear || '2025/2026');
                  }
                  return res;
              }),
              supabase.from('homeroom_attendance').select('student_id, status, kelas').eq('academic_year', academicYear || '2025/2026').eq('semester', semester || 'Ganjil').gte('date', semesterStart ? `${semesterStart}` : '2000-01-01').lte('date', semesterEnd ? `${semesterEnd}` : '2100-01-01').eq('date', filterDate)
          ]);

          const schedules = schedulesRes.data || [];
          const journals = journalsRes.data || [];
          const attendanceLogs = attendanceRes.data || [];
          const studentsData = studentsRes.data || [];
          const homeroomLogs = homeroomRes.data || [];

          const processed: MonitorItem[] = schedules.map(sch => {
              const schHours = sch.hour.split(',').map((h: string) => h.trim());
              const isFilled = journals.some(j => {
                  if (j.kelas !== sch.kelas || j.subject !== sch.subject) return false;
                  if (j.teacher_id && j.teacher_id === sch.teacher_id) return true;
                  const jHours = j.hours.split(',').map((h: string) => h.trim());
                  return schHours.some((h: string) => jHours.includes(h));
              });
              let tName = '-';
              if (activeProfiles && activeProfiles.length > 0) {
                  let p = activeProfiles.find(p => p.id === sch.teacher_id);
                  if (!p && sch.teacher_nip) p = activeProfiles.find(p => p.nip === sch.teacher_nip);
                  if (p) tName = p.full_name; else tName = 'Guru Tidak Ditemukan';
              } else if (sch.teacher_id) { tName = 'Memuat...'; }
              return { scheduleId: sch.id, kelas: sch.kelas, jam: sch.hour, mapel: sch.subject, teacherName: tName, teacherId: sch.teacher_id, isFilled };
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

          const uniqueAbsenceMap: Record<string, {name: string, status: string, kelas: string}> = {};
          homeroomLogs.forEach((h: any) => { if (['S', 'I', 'A'].includes(h.status)) { uniqueAbsenceMap[h.student_id] = { name: studentNameMap[h.student_id] || 'Siswa', status: h.status, kelas: studentClassMap[h.student_id] || h.kelas || '?' }; } });
          attendanceLogs.forEach((log: any) => { if (!uniqueAbsenceMap[log.student_id]) { if (['S', 'I', 'A'].includes(log.status)) { uniqueAbsenceMap[log.student_id] = { name: log.student_name, status: log.status, kelas: studentClassMap[log.student_id] || '?' }; } } });

          const absenceListFinal = Object.values(uniqueAbsenceMap).sort((a,b) => a.kelas.localeCompare(b.kelas) || a.name.localeCompare(b.name));
          let sCount = 0, iCount = 0, aCount = 0;
          absenceListFinal.forEach(item => { if (item.status === 'S') sCount++; else if (item.status === 'I') iCount++; else if (item.status === 'A') aCount++; });

          setAbsenceList(absenceListFinal);
          setAbsenceStats({ S: sCount, I: iCount, A: aCount });

          const totalSchedules = processed.length;
          const filledSchedules = processed.filter(i => i.isFilled).length;
          const kbmPct = totalSchedules > 0 ? Math.round((filledSchedules / totalSchedules) * 100) : 0;

          const cleanCounts: Record<string, number> = {};
          journals.forEach(j => { if (j.cleanliness === 'sudah_bersih') cleanCounts[j.kelas] = (cleanCounts[j.kelas] || 0) + 1; });
          let cleanest = '-'; let maxClean = -1;
          Object.entries(cleanCounts).forEach(([cls, count]) => { if (count > maxClean) { maxClean = count; cleanest = cls; } });

          const emptyCounts: Record<string, number> = {};
          processed.filter(i => !i.isFilled).forEach(i => { emptyCounts[i.kelas] = (emptyCounts[i.kelas] || 0) + 1; });
          let emptiest = '-'; let maxEmpty = -1;
          Object.entries(emptyCounts).forEach(([cls, count]) => { if (count > maxEmpty) { maxEmpty = count; emptiest = cls; } });

          setStats({ alpaCount: aCount + iCount + sCount, kbmPercentage: `${kbmPct}%`, cleanestClass: cleanest, mostEmptyClass: emptiest });

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
      let filteredItems = items.filter(item => item.teacherName.toLowerCase().includes(searchTerm.toLowerCase()) || item.mapel.toLowerCase().includes(searchTerm.toLowerCase()) || item.kelas.toLowerCase().includes(searchTerm.toLowerCase()));
      const displayItems = searchTerm ? filteredItems : getRotatedList(filteredItems);
      return (
        <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className={`py-2 px-3 text-white text-center font-bold uppercase tracking-wider ${colorClass} text-[clamp(10px,1.2vw,14px)]`}>{title}</div>
            <div className="bg-white flex-1 overflow-hidden">
                <table className="w-full text-left table-fixed">
                    <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100 text-[clamp(9px,0.9vw,12px)]">
                        <tr><th className="px-2 py-2 w-[15%] text-center">Kelas</th><th className="px-2 py-2 w-[15%] text-center">Jam</th><th className="px-2 py-2 w-[58%]">Guru / Mapel</th><th className="px-2 py-2 w-[12%] text-center">Sts</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {displayItems.length === 0 ? <tr><td colSpan={4} className="p-6 text-center text-slate-400 italic text-[clamp(10px,1vw,13px)]">Tidak ada jadwal.</td></tr> : (displayItems.map((item) => (<tr key={item.scheduleId} className={`transition-all duration-500 ease-in-out ${item.isFilled ? 'bg-white hover:bg-slate-50' : 'bg-red-50/40 hover:bg-red-50'}`}><td className="px-1 py-1.5 text-center font-bold text-slate-700 text-[clamp(10px,1.1vw,14px)]">{item.kelas}</td><td className="px-1 py-1.5 text-center font-mono text-slate-500 text-[clamp(9px,1vw,12px)]">{formatJam(item.jam)}</td><td className="px-1 py-1.5 overflow-hidden"><div className="font-bold text-slate-800 truncate text-[clamp(10px,1.1vw,14px)] leading-tight">{item.teacherName}</div><div className="text-slate-500 truncate text-[clamp(9px,0.9vw,12px)] leading-tight">{item.mapel}</div></td><td className="px-1 py-1.5 text-center">{item.isFilled ? <CheckCircle2 className="text-green-500 inline-block w-[clamp(14px,1.5vw,20px)] h-[clamp(14px,1.5vw,20px)]" /> : <XCircle className="text-red-500 inline-block w-[clamp(14px,1.5vw,20px)] h-[clamp(14px,1.5vw,20px)]" />}</td></tr>)))}
                    </tbody>
                </table>
            </div>
            <div className="p-1.5 bg-slate-50 text-center text-[clamp(9px,0.8vw,11px)] text-slate-500 font-bold border-t border-slate-200">{items.filter(i => i.isFilled).length} / {items.length} Terisi</div>
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

         {loading && profiles.length === 0 ? <div className="flex justify-center py-20"><Loader2 className="animate-spin text-purple-500" size={40} /></div> : (
             <div className="grid grid-cols-3 gap-2 md:gap-4 items-start w-full">
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
                      <h3 className="font-extrabold text-slate-800 text-lg leading-tight">Rincian Ketidakhadiran</h3>
                      <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1 bg-gray-50 rounded-full"><X size={20} /></button>
                  </div>
                  <div className="overflow-y-auto p-6 space-y-6 custom-scrollbar bg-white flex-1">
                        <div className="grid grid-cols-3 gap-3">
                            <div className="flex flex-col items-center justify-center p-3 bg-yellow-50 rounded-2xl border border-yellow-100"><span className="text-yellow-700 font-bold text-[10px] uppercase mb-1">Sakit</span><span className="text-3xl font-extrabold text-yellow-600">{absenceStats.S}</span></div>
                            <div className="flex flex-col items-center justify-center p-3 bg-purple-50 rounded-2xl border border-purple-100"><span className="text-purple-700 font-bold text-[10px] uppercase mb-1">Izin</span><span className="text-3xl font-extrabold text-purple-600">{absenceStats.I}</span></div>
                            <div className="flex flex-col items-center justify-center p-3 bg-red-50 rounded-2xl border border-red-100"><span className="text-red-700 font-bold text-[10px] uppercase mb-1">Alpa</span><span className="text-3xl font-extrabold text-red-600">{absenceStats.A}</span></div>
                        </div>
                        <hr className="border-gray-100" />
                        <div>
                            <div className="flex items-center gap-2 mb-4"><Bookmark size={16} className="text-orange-500 fill-orange-500"/><h4 className="font-bold text-slate-700 text-sm">Rincian Per Kelas</h4></div>
                            <div className="space-y-3">
                                {allUniqueClasses.length === 0 ? <div className="text-center text-xs text-gray-400 italic">Belum ada data siswa/kelas.</div> : allUniqueClasses.map(cls => {
                                        const studentsInClass = groupedAbsence[cls] || [];
                                        const totalStudents = studentClassCounts[cls] || 0;
                                        const absentCount = studentsInClass.length;
                                        const presentCount = totalStudents - absentCount;
                                        const isExpanded = expandedClass === cls;
                                        const hasAbsence = absentCount > 0;
                                        return (
                                            <div key={cls} className="border border-gray-100 rounded-2xl overflow-hidden transition-all hover:shadow-sm">
                                                <button onClick={() => hasAbsence && setExpandedClass(isExpanded ? null : cls)} className={`w-full flex items-center justify-between p-3 bg-white ${!hasAbsence ? 'cursor-default' : ''}`}><div className="flex items-center gap-3"><div className={`w-10 h-10 flex items-center justify-center rounded-xl font-bold text-sm shadow-sm ${hasAbsence ? 'bg-red-50 border border-red-100 text-red-700' : 'bg-green-50 border border-green-100 text-green-700'}`}>{cls}</div><div className="text-xs font-bold text-slate-700"><span className="text-green-600">{presentCount} Hadir</span><span className="text-gray-300 mx-2">|</span><span className={hasAbsence ? 'text-red-500' : 'text-slate-300'}>{absentCount} Tidak Hadir</span></div></div>{hasAbsence && (<div className="text-gray-300">{isExpanded ? <ChevronDown size={18}/> : <ChevronRight size={18}/>}</div>)}</button>
                                                {isExpanded && hasAbsence && (<div className="bg-gray-50 p-3 border-t border-gray-100 space-y-2 animate-fade-in">{studentsInClass.map((s: any, idx: number) => (<div key={idx} className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-100 text-xs shadow-sm"><span className="font-bold text-slate-700">{s.name}</span><span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${s.status === 'S' ? 'bg-yellow-100 text-yellow-700' : s.status === 'I' ? 'bg-purple-100 text-purple-700' : 'bg-red-100 text-red-700'}`}>{s.status === 'S' ? 'Sakit' : s.status === 'I' ? 'Izin' : 'Alpa'}</span></div>))}</div>)}
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                  </div>
              </div>
            </div>
         )}
      </div>
    </Layout>
  );
};

export default OperatorDashboard;
