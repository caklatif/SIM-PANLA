
import React, { useEffect, useState, useRef } from 'react';
import { Layout } from '../components/Layout';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ShieldAlert, Loader2, Save, Plus, Trash2, Check, ChevronDown, X, Filter, Search, Gavel, User, Calendar, ChevronUp } from 'lucide-react';
import { Student } from '../types';
import { getWIBISOString } from '../utils/dateUtils';
import { showAlert, showConfirm } from '../utils/alert';

interface NoteItem {
    category: string;
    studentIds: string[];
    followUp?: string;
    note?: string;
}

interface DisciplineData {
    student: Student;
    alpaCount: number;
    alpaDates: string[];
    violations: {
        id: string;
        date: string;
        category: string;
        note: string;
        reporter: string;
    }[];
}

const Kedisiplinan: React.FC = () => {
  const { profile, academicYear, semester , semesterStart, semesterEnd } = useAuth();
  const [loading, setLoading] = useState(false);
  
  const isHeadmaster = profile?.mengajar_mapel === 'Kepala Sekolah' || profile?.role === 'admin';

  // Filters
  const [classes, setClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [isStartDateInitialized, setIsStartDateInitialized] = useState(false);
  const [startDate, setStartDate] = useState(() => {
      const d = new Date();
      d.setDate(1); // Awal bulan ini
      return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(getWIBISOString());

  // Data
  const [reportData, setReportData] = useState<DisciplineData[]>([]);

  // --- INPUT FORM STATE (ACCORDION) ---
  const [showInputForm, setShowInputForm] = useState(false);
  const [inputMode, setInputMode] = useState<'single' | 'mass'>('single'); // New State
  
  // Single Mode State
  const [students, setStudents] = useState<Student[]>([]); 
  const [disciplineTypes, setDisciplineTypes] = useState<string[]>([]);
  const [followUpTypes, setFollowUpTypes] = useState<string[]>([]);
  const [disciplineRows, setDisciplineRows] = useState<NoteItem[]>([]);
  const [inputClass, setInputClass] = useState(''); 

  // Mass Mode State
  const [massCommonData, setMassCommonData] = useState({ category: '', followUp: '', note: '' });
  const [massRows, setMassRows] = useState<{ class: string; studentIds: string[] }[]>([{ class: '', studentIds: [] }]);
  const [studentsCache, setStudentsCache] = useState<Record<string, Student[]>>({});

  useEffect(() => {
    if (semesterStart && !isStartDateInitialized) {
        setStartDate(semesterStart);
        setIsStartDateInitialized(true);
    }
  }, [semesterStart, isStartDateInitialized]);

useEffect(() => {
    fetchInitData();
  }, []);

  useEffect(() => {
      // Auto fetch on load if dates are set
      fetchReportData();
  }, [selectedClass, startDate, endDate]); // Trigger on filter change

  // Fetch Students for Input Modal when class changes (Single Mode)
  useEffect(() => {
      if(inputClass && inputMode === 'single') {
          const loadStudents = async () => {
              let { data, error: errSt } = await supabase.from('students').select('*').eq('academic_year', academicYear || '2025/2026').eq('kelas', inputClass).eq('academic_year', academicYear || '2025/2026').order('name');
              if (errSt && (errSt.code === '42703' || errSt.message?.includes('academic_year'))) {
                  const res = await supabase.from('students').select('*').eq('academic_year', academicYear || '2025/2026').eq('kelas', inputClass).order('name');
                  if (academicYear === '2025/2026') data = res.data;
                  else data = [];
              }
              setStudents(data || []);
              if(disciplineRows.length === 0) addRow();
          }
          loadStudents();
      }
  }, [inputClass, inputMode]);

  const fetchInitData = async () => {
    try {
        const [classesRes, settingsRes] = await Promise.all([
            supabase.from('students').select('kelas').eq('academic_year', academicYear || '2025/2026'),
            supabase.from('app_settings').select('*')
        ]);

        if (classesRes.data) {
            const unique = Array.from(new Set(classesRes.data.map((s:any) => s.kelas))).sort();
            setClasses(unique as string[]);
        }

        if (settingsRes.data) {
            settingsRes.data.forEach(item => {
                if (item.key === 'discipline_types') setDisciplineTypes(item.value ? JSON.parse(item.value) : []);
                if (item.key === 'follow_up_types') setFollowUpTypes(item.value ? JSON.parse(item.value) : []);
            });
        }
    } catch (e) { console.error(e); }
  };

  const fetchReportData = async () => {
      setLoading(true);
      try {
          const start = `${startDate}T00:00:00+07:00`;
          const end = `${endDate}T23:59:59+07:00`;

          let targetStudents: Student[] = [];
          let targetStudentIds: string[] = [];

          if (selectedClass) {
              let { data, error: errSt } = await supabase.from('students').select('*').eq('academic_year', academicYear || '2025/2026').eq('kelas', selectedClass).eq('academic_year', academicYear || '2025/2026').order('name');
              if (errSt && (errSt.code === '42703' || errSt.message?.includes('academic_year'))) {
                  const res = await supabase.from('students').select('*').eq('academic_year', academicYear || '2025/2026').eq('kelas', selectedClass).order('name');
                  if (academicYear === '2025/2026') data = res.data;
                  else data = [];
              }
              if (data) {
                  targetStudents = data;
                  targetStudentIds = data.map(s => s.id);
              }
          } else {
              // ALL CLASSES: Scan Logs First to find relevant IDs
              const [hRes, tRes, vRes] = await Promise.all([
                  supabase.from('homeroom_attendance').select('student_id').eq('academic_year', academicYear || '2025/2026').eq('semester', semester || 'Ganjil').gte('date', semesterStart ? `${semesterStart}` : '2000-01-01').lte('date', semesterEnd ? `${semesterEnd}` : '2100-01-01').gte('date', startDate).lte('date', endDate).in('status', ['A']), // Only care about Alpa for query optimization
                  supabase.from('attendance_logs').select('student_id').eq('academic_year', academicYear || '2025/2026').eq('semester', semester || 'Ganjil').gte('created_at', semesterStart ? `${semesterStart}T00:00:00+07:00` : '2000-01-01T00:00:00+07:00').lte('created_at', semesterEnd ? `${semesterEnd}T23:59:59+07:00` : '2100-01-01T23:59:59+07:00').gte('created_at', start).lte('created_at', end).in('status', ['A']),
                  supabase.from('journal_notes').select('student_id').eq('academic_year', academicYear || '2025/2026').eq('semester', semester || 'Ganjil').gte('created_at', semesterStart ? `${semesterStart}T00:00:00+07:00` : '2000-01-01T00:00:00+07:00').lte('created_at', semesterEnd ? `${semesterEnd}T23:59:59+07:00` : '2100-01-01T23:59:59+07:00').eq('type', 'kedisiplinan').gte('created_at', start).lte('created_at', end)
              ]);

              const ids = new Set<string>();
              hRes.data?.forEach(x => ids.add(x.student_id));
              tRes.data?.forEach(x => ids.add(x.student_id));
              vRes.data?.forEach(x => ids.add(x.student_id));

              targetStudentIds = Array.from(ids);

              if (targetStudentIds.length > 0) {
                  // Fetch only relevant students
                  let { data, error: errSt } = await supabase.from('students').select('*').eq('academic_year', academicYear || '2025/2026').in('id', targetStudentIds).order('kelas').order('name');
                  if (data) targetStudents = data;
              }
          }

          if (targetStudentIds.length === 0) {
              setReportData([]);
              setLoading(false);
              return;
          }

          // 2. DATA ALPA (Logic Rapor: Aggregasi Wali Kelas & Guru Mapel)
          // Fetch data only for target IDs to be efficient
          const [hLogsRes, tLogsRes, violationNotesRes] = await Promise.all([
              supabase.from('homeroom_attendance').select('student_id, date, status').eq('academic_year', academicYear || '2025/2026').eq('semester', semester || 'Ganjil').gte('date', semesterStart ? `${semesterStart}` : '2000-01-01').lte('date', semesterEnd ? `${semesterEnd}` : '2100-01-01')
                .in('student_id', targetStudentIds).gte('date', startDate).lte('date', endDate),
              supabase.from('attendance_logs').select('student_id, created_at, status').eq('academic_year', academicYear || '2025/2026').eq('semester', semester || 'Ganjil').gte('created_at', semesterStart ? `${semesterStart}T00:00:00+07:00` : '2000-01-01T00:00:00+07:00').lte('created_at', semesterEnd ? `${semesterEnd}T23:59:59+07:00` : '2100-01-01T23:59:59+07:00')
                .in('student_id', targetStudentIds).in('status', ['S', 'I', 'A']).gte('created_at', start).lte('created_at', end),
              supabase.from('journal_notes').select('id, student_id, category, note, created_at, journal_id').eq('academic_year', academicYear || '2025/2026').eq('semester', semester || 'Ganjil').gte('created_at', semesterStart ? `${semesterStart}T00:00:00+07:00` : '2000-01-01T00:00:00+07:00').lte('created_at', semesterEnd ? `${semesterEnd}T23:59:59+07:00` : '2100-01-01T23:59:59+07:00')
                .in('student_id', targetStudentIds).eq('type', 'kedisiplinan').gte('created_at', start).lte('created_at', end)
          ]);

          const hLogs = hLogsRes.data || [];
          const tLogs = tLogsRes.data || [];
          const violationNotes = violationNotesRes.data || [];

          // Get unique journal IDs to fetch teacher names for violations
          const journalIds = Array.from(new Set(violationNotes.map(n => n.journal_id).filter(Boolean)));
          
          let journalMap: Record<string, string> = {};
          if (journalIds.length > 0) {
              const { data: journals } = await supabase
                .from('journals')
                .select('id, teacher_id, profiles:teacher_id (full_name)')
                .in('id', journalIds);
              
              journals?.forEach((j: any) => {
                  const teacherName = j.profiles?.full_name || 'Guru';
                  journalMap[j.id] = teacherName;
              });
          }

          // 4. Process Data
          const processed: DisciplineData[] = targetStudents.map(student => {
              // --- CALCULATE ALPA (DAYS) ---
              const studentHLogs = hLogs.filter(l => l.student_id === student.id);
              const studentTLogs = tLogs.filter(l => l.student_id === student.id);
              
              // Get all unique dates relevant to this student
              const hDates = studentHLogs.map(l => l.date);
              const tDates = studentTLogs.map(l => l.created_at.split('T')[0]);
              const uniqueDates = Array.from(new Set([...hDates, ...tDates])).sort();

              const alpaDatesList: string[] = [];

              uniqueDates.forEach(date => {
                  let finalStatus = '';
                  
                  // Priority 1: Homeroom Teacher Input
                  const hLog = studentHLogs.find(l => l.date === date);
                  if (hLog) {
                      finalStatus = hLog.status;
                  } else {
                      // Priority 2: Teacher Logs Aggregation (S > I > A)
                      const dailyLogs = studentTLogs.filter(l => l.created_at.startsWith(date));
                      if (dailyLogs.length > 0) {
                          const statuses = dailyLogs.map(l => l.status);
                          if (statuses.includes('S')) finalStatus = 'S';
                          else if (statuses.includes('I')) finalStatus = 'I';
                          else if (statuses.includes('A')) finalStatus = 'A';
                      }
                  }

                  if (finalStatus === 'A') {
                      const dateObj = new Date(date);
                      const dateStr = new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short' }).format(dateObj);
                      alpaDatesList.push(dateStr);
                  }
              });

              // --- PROCESS VIOLATIONS ---
              const myViolations = violationNotes.filter(n => n.student_id === student.id).map(n => {
                  const date = new Date(n.created_at);
                  const dateStr = new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short' }).format(date);
                  const reporter = journalMap[n.journal_id] || 'Admin/Guru';
                  return {
                      id: n.id,
                      date: dateStr,
                      category: n.category,
                      note: n.note,
                      reporter
                  };
              });

              return {
                  student,
                  alpaCount: alpaDatesList.length, // Total Days Alpha
                  alpaDates: alpaDatesList,
                  violations: myViolations
              };
          });

          const sorted = processed.filter(p => p.alpaCount > 0 || p.violations.length > 0)
              .sort((a, b) => b.alpaCount - a.alpaCount || a.student.kelas.localeCompare(b.student.kelas) || a.student.name.localeCompare(b.student.name));

          setReportData(sorted);

      } catch (e) {
          console.error(e);
      } finally {
          setLoading(false);
      }
  };

  // --- INPUT FORM LOGIC ---
  const addRow = () => setDisciplineRows(prev => [...prev, { category: '', studentIds: [], followUp: '', note: '' }]);
  const removeRow = (index: number) => setDisciplineRows(prev => prev.filter((_, i) => i !== index));
  const updateRow = (index: number, field: keyof NoteItem, value: any) => {
      setDisciplineRows(prev => {
          const list = [...prev];
          list[index] = { ...list[index], [field]: value };
          return list;
      });
  };

  // --- MASS INPUT LOGIC ---
  const getStudentsForClass = async (className: string) => {
      if (studentsCache[className]) return;
      let { data, error: errSt } = await supabase.from('students').select('*').eq('academic_year', academicYear || '2025/2026').eq('kelas', className).eq('academic_year', academicYear || '2025/2026').order('name');
      if (errSt && (errSt.code === '42703' || errSt.message?.includes('academic_year'))) {
          const res = await supabase.from('students').select('*').eq('academic_year', academicYear || '2025/2026').eq('kelas', className).order('name');
          if (academicYear === '2025/2026') data = res.data;
          else data = [];
      }
      setStudentsCache(prev => ({ ...prev, [className]: data || [] }));
  };

  const addMassRow = () => setMassRows(prev => [...prev, { class: '', studentIds: [] }]);
  const removeMassRow = (index: number) => setMassRows(prev => prev.filter((_, i) => i !== index));
  const updateMassRow = async (index: number, field: 'class' | 'studentIds', value: any) => {
      if (field === 'class') {
          await getStudentsForClass(value);
          setMassRows(prev => {
              const list = [...prev];
              list[index] = { ...list[index], class: value, studentIds: [] }; // Reset students on class change
              return list;
          });
      } else {
          setMassRows(prev => {
              const list = [...prev];
              list[index] = { ...list[index], studentIds: value };
              return list;
          });
      }
  };

  const handleSaveInput = async () => {
      if (!profile) return;

      try {
          const notesInserts: any[] = [];

          if (inputMode === 'single') {
              if (disciplineRows.length === 0 || !inputClass) return;
              disciplineRows.forEach(row => {
                  if (row.category && row.studentIds.length > 0) {
                      row.studentIds.forEach(sid => {
                          const sName = students.find(s => s.id === sid)?.name || 'Unknown';
                          notesInserts.push({
                              student_id: sid,
                              student_name: sName,
                              type: 'kedisiplinan',
                              category: row.category,
                              follow_up: row.followUp || '',
                              note: row.note || `Laporan Manual oleh ${profile.full_name}`,
                              academic_year: academicYear || '2025/2026',
                              semester: semester || 'Ganjil',
                              
                              
                          });
                      });
                  }
              });
          } else {
              // Mass Mode
              if (!massCommonData.category || massRows.length === 0) {
                  showAlert("Mohon lengkapi Jenis Pelanggaran dan Data Murid.");
                  return;
              }
              
              massRows.forEach(row => {
                  if (row.class && row.studentIds.length > 0) {
                      const classStudents = studentsCache[row.class] || [];
                      row.studentIds.forEach(sid => {
                          const sName = classStudents.find(s => s.id === sid)?.name || 'Unknown';
                          notesInserts.push({
                              student_id: sid,
                              student_name: sName,
                              type: 'kedisiplinan',
                              category: massCommonData.category,
                              follow_up: massCommonData.followUp || '',
                              note: massCommonData.note || `Laporan Massal oleh ${profile.full_name}`,
                              academic_year: academicYear || '2025/2026',
                              semester: semester || 'Ganjil',
                              
                              
                          });
                      });
                  }
              });
          }

          if (notesInserts.length > 0) {
              const { error } = await supabase.from('journal_notes').insert(notesInserts);
              if (error) throw error;
              showAlert("Data pelanggaran berhasil disimpan.");
              setShowInputForm(false);
              
              // Reset States
              setDisciplineRows([]);
              setInputClass('');
              setMassCommonData({ category: '', followUp: '', note: '' });
              setMassRows([{ class: '', studentIds: [] }]);
              
              fetchReportData();
          } else {
              showAlert("Tidak ada data valid untuk disimpan.");
          }
      } catch (err: any) {
          showAlert("Gagal menyimpan: " + err.message);
      }
  };

  // --- MULTI SELECT COMPONENT ---
  const MultiSelectDropdown = ({ options, selectedIds, onChange, placeholder }: any) => {
      const [isOpen, setIsOpen] = useState(false);
      const wrapperRef = useRef<HTMLDivElement>(null);
      useEffect(() => {
          const handleClickOutside = (event: MouseEvent) => {
              if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setIsOpen(false);
          };
          document.addEventListener('mousedown', handleClickOutside);
          return () => document.removeEventListener('mousedown', handleClickOutside);
      }, []);
      const toggleSelection = (id: string) => {
          const newSelection = selectedIds.includes(id) ? selectedIds.filter((sid: string) => sid !== id) : [...selectedIds, id];
          onChange(newSelection);
      };

      return (
          <div className="relative" ref={wrapperRef}>
              <button onClick={() => setIsOpen(!isOpen)} className="w-full border border-slate-200 rounded-xl p-2.5 bg-white text-left flex justify-between items-center text-xs">
                  <span className={`truncate ${selectedIds.length === 0 ? 'text-gray-400' : 'text-slate-700 font-bold'}`}>{selectedIds.length === 0 ? placeholder : `${selectedIds.length} Murid`}</span>
                  <ChevronDown size={14} className="text-gray-400" />
              </button>
              {isOpen && (
                  <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto p-1 custom-scrollbar">
                      {options.map((opt: any) => (
                          <div key={opt.id} onClick={() => toggleSelection(opt.id)} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-xs ${selectedIds.includes(opt.id) ? 'bg-orange-50 font-bold text-orange-700' : 'hover:bg-gray-50'}`}>
                              {selectedIds.includes(opt.id) && <Check size={12} />} {opt.name}
                          </div>
                      ))}
                  </div>
              )}
          </div>
      );
  };

  return (
    <Layout>
      <div className="space-y-6">
         {/* HEADER */}
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 text-white flex items-center justify-center shadow-sm">
                    <ShieldAlert size={20} />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white leading-tight">Laporan Kedisiplinan</h2>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Temuan pelanggaran di luar jam KBM.</p>
                </div>
            </div>
             
             {!isHeadmaster && (
                 <button 
                    onClick={() => setShowInputForm(!showInputForm)}
                    className={`px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg transition-all hover:-translate-y-0.5 ${showInputForm ? 'bg-slate-200 text-slate-600 hover:bg-slate-300' : 'bg-orange-600 hover:bg-orange-700 text-white shadow-orange-200'}`}
                 >
                    {showInputForm ? <ChevronUp size={18} /> : <Plus size={18} />} 
                    {showInputForm ? 'Tutup Form Input' : 'Input Pelanggaran Baru'}
                 </button>
             )}
         </div>

         {/* ACCORDION INPUT FORM */}
         {showInputForm && (
             <div className="bg-white rounded-3xl p-6 shadow-lg border border-orange-200 animate-fade-in transition-all">
                  <div className="flex items-center justify-between gap-2 text-orange-600 font-bold mb-4 pb-2 border-b border-orange-100">
                      <div className="flex items-center gap-2">
                        <Gavel size={20}/>
                        <h3>Form Input Pelanggaran</h3>
                      </div>
                      
                      {/* MODE SWITCHER */}
                      <div className="flex bg-slate-100 p-1 rounded-lg">
                          <button 
                            onClick={() => setInputMode('single')}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${inputMode === 'single' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                          >
                            Per Kelas
                          </button>
                          <button 
                            onClick={() => setInputMode('mass')}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${inputMode === 'mass' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                          >
                            Input Massal
                          </button>
                      </div>
                  </div>

                  {/* SINGLE MODE FORM */}
                  {inputMode === 'single' && (
                    <>
                        <div className="mb-4">
                            <label className="block text-xs font-bold text-slate-500 mb-1">Pilih Kelas</label>
                            <select className="w-full md:w-1/3 border p-2.5 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 font-bold text-slate-700" value={inputClass} onChange={e => setInputClass(e.target.value)}>
                                <option value="">-- Pilih Kelas --</option>
                                {classes.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>

                        {inputClass && (
                            <div className="space-y-4">
                                {disciplineRows.map((row, idx) => (
                                    <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-200 relative space-y-3 shadow-sm">
                                        <div className="flex flex-col md:flex-row gap-3">
                                            <div className="w-full md:w-1/2">
                                                <label className="block text-[10px] font-bold text-slate-500 mb-1">Jenis Pelanggaran</label>
                                                <select className="w-full p-2.5 border rounded-lg text-xs bg-white" value={row.category} onChange={e => updateRow(idx, 'category', e.target.value)}>
                                                    <option value="">- Pilih -</option>
                                                    {disciplineTypes.map((t, i) => <option key={i} value={t}>{t}</option>)}
                                                </select>
                                            </div>
                                            <div className="w-full md:w-1/2">
                                                <label className="block text-[10px] font-bold text-slate-500 mb-1">Tindak Lanjut</label>
                                                <select className="w-full p-2.5 border rounded-lg text-xs bg-white" value={row.followUp} onChange={e => updateRow(idx, 'followUp', e.target.value)}>
                                                    <option value="">- Pilih -</option>
                                                    {followUpTypes.map((t, i) => <option key={i} value={t}>{t}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 mb-1">Keterangan</label>
                                            <input type="text" className="w-full p-2.5 border rounded-lg text-xs bg-white" placeholder="Detail kejadian..." value={row.note} onChange={e => updateRow(idx, 'note', e.target.value)}/>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 mb-1">Murid Terlibat</label>
                                            <MultiSelectDropdown options={students} selectedIds={row.studentIds} onChange={(ids: string[]) => updateRow(idx, 'studentIds', ids)} placeholder="Pilih Murid" />
                                        </div>
                                        <button onClick={() => removeRow(idx)} className="absolute top-2 right-2 text-red-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16}/></button>
                                    </div>
                                ))}
                                <div className="flex gap-3 pt-2">
                                    <button onClick={addRow} className="text-orange-600 text-xs font-bold flex items-center gap-1 hover:bg-orange-50 px-3 py-2 rounded-lg transition-colors border border-orange-200"><Plus size={14}/> Tambah Baris</button>
                                </div>
                            </div>
                        )}
                    </>
                  )}

                  {/* MASS MODE FORM */}
                  {inputMode === 'mass' && (
                    <div className="space-y-6">
                        {/* Common Fields */}
                        <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 space-y-3">
                            <h4 className="text-sm font-bold text-orange-800 mb-2">Detail Pelanggaran (Berlaku untuk semua murid di bawah)</h4>
                            <div className="flex flex-col md:flex-row gap-3">
                                <div className="w-full md:w-1/2">
                                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Jenis Pelanggaran</label>
                                    <select className="w-full p-2.5 border rounded-lg text-xs bg-white" value={massCommonData.category} onChange={e => setMassCommonData({...massCommonData, category: e.target.value})}>
                                        <option value="">- Pilih Jenis Pelanggaran -</option>
                                        {disciplineTypes.map((t, i) => <option key={i} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div className="w-full md:w-1/2">
                                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Tindak Lanjut</label>
                                    <select className="w-full p-2.5 border rounded-lg text-xs bg-white" value={massCommonData.followUp} onChange={e => setMassCommonData({...massCommonData, followUp: e.target.value})}>
                                        <option value="">- Pilih Tindak Lanjut -</option>
                                        {followUpTypes.map((t, i) => <option key={i} value={t}>{t}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1">Keterangan</label>
                                <input type="text" className="w-full p-2.5 border rounded-lg text-xs bg-white" placeholder="Detail kejadian..." value={massCommonData.note} onChange={e => setMassCommonData({...massCommonData, note: e.target.value})}/>
                            </div>
                        </div>

                        {/* Student Rows */}
                        <div className="space-y-3">
                            <label className="block text-xs font-bold text-slate-500">Daftar Murid Terlibat</label>
                            {massRows.map((row, idx) => (
                                <div key={idx} className="flex flex-col md:flex-row gap-3 items-start bg-white p-3 border rounded-xl shadow-sm relative pr-10">
                                    <div className="w-full md:w-1/3">
                                        <label className="block text-[10px] font-bold text-slate-400 mb-1">Pilih Kelas</label>
                                        <select 
                                            className="w-full p-2 border rounded-lg text-xs bg-slate-50 font-bold text-slate-700" 
                                            value={row.class} 
                                            onChange={e => updateMassRow(idx, 'class', e.target.value)}
                                        >
                                            <option value="">- Kelas -</option>
                                            {classes.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div className="w-full md:w-2/3">
                                        <label className="block text-[10px] font-bold text-slate-400 mb-1">Murid</label>
                                        <MultiSelectDropdown 
                                            options={studentsCache[row.class] || []} 
                                            selectedIds={row.studentIds} 
                                            onChange={(ids: string[]) => updateMassRow(idx, 'studentIds', ids)} 
                                            placeholder={row.class ? "Pilih Murid" : "Pilih Kelas Dulu"} 
                                        />
                                    </div>
                                    {massRows.length > 1 && (
                                        <button onClick={() => removeMassRow(idx)} className="absolute top-3 right-2 text-slate-300 hover:text-red-500 transition-colors">
                                            <X size={16}/>
                                        </button>
                                    )}
                                </div>
                            ))}
                            <button onClick={addMassRow} className="text-orange-600 text-xs font-bold flex items-center gap-1 hover:bg-orange-50 px-3 py-2 rounded-lg transition-colors border border-orange-200 border-dashed w-full justify-center">
                                <Plus size={14}/> Tambah Baris Murid
                            </button>
                        </div>
                    </div>
                  )}

                  {/* SAVE BUTTON (SHARED) */}
                  <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
                      <button onClick={handleSaveInput} className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-orange-200 transition-all active:scale-95 text-sm">
                          <Save size={16}/> Simpan Data Pelanggaran
                      </button>
                  </div>
             </div>
         )}

         {/* FILTER BAR */}
         <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 items-end md:items-center">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 flex-1 w-full">
                <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1 ml-1 uppercase">Mulai Tanggal</label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-2.5 text-slate-400" size={14}/>
                        <input type="date" className="w-full pl-9 border border-slate-200 rounded-xl p-2 text-sm focus:ring-2 focus:ring-orange-500" value={startDate} onChange={e => setStartDate(e.target.value)} />
                    </div>
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1 ml-1 uppercase">Sampai Tanggal</label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-2.5 text-slate-400" size={14}/>
                        <input type="date" className="w-full pl-9 border border-slate-200 rounded-xl p-2 text-sm focus:ring-2 focus:ring-orange-500" value={endDate} onChange={e => setEndDate(e.target.value)} />
                    </div>
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1 ml-1 uppercase">Pilih Kelas</label>
                    <div className="relative">
                        <Filter className="absolute left-3 top-2.5 text-slate-400" size={14}/>
                        <select className="w-full pl-9 border border-slate-200 rounded-xl p-2 text-sm bg-white focus:ring-2 focus:ring-orange-500 font-bold text-slate-700" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
                            <option value="">-- Semua Kelas --</option>
                            {classes.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                </div>
            </div>
            <button 
                onClick={fetchReportData} 
                disabled={loading}
                className="w-full md:w-auto bg-slate-800 hover:bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all"
            >
                {loading ? <Loader2 className="animate-spin" size={16}/> : <Search size={16} />} 
                Tampilkan
            </button>
         </div>

         {/* TABLE DATA */}
         <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
             <div className="overflow-x-auto">
                 <table className="w-full text-sm text-left">
                     <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                         <tr>
                             <th className="px-6 py-4 w-16 text-center">No</th>
                             <th className="px-6 py-4 w-64">Nama Murid</th>
                             <th className="px-6 py-4 w-24 text-center">Kelas</th>
                             <th className="px-6 py-4">Detail Kedisiplinan</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                         {loading ? (
                             <tr><td colSpan={4} className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-orange-500" /></td></tr>
                         ) : reportData.length === 0 ? (
                             <tr><td colSpan={4} className="p-8 text-center text-slate-400 italic">Tidak ada data pelanggaran atau Alpa pada periode ini.</td></tr>
                         ) : (
                             reportData.map((item, idx) => (
                                 <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                     <td className="px-6 py-4 text-center font-medium text-slate-500">{idx + 1}</td>
                                     <td className="px-6 py-4 align-top">
                                         <div className="font-bold text-slate-800 text-base">{item.student.name}</div>
                                         <div className="text-xs text-slate-400 font-mono mt-0.5">{item.student.nisn}</div>
                                     </td>
                                     <td className="px-6 py-4 text-center align-top">
                                         <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-lg font-bold text-xs">{item.student.kelas}</span>
                                     </td>
                                     <td className="px-6 py-4 align-top space-y-2">
                                         {/* 1. ALPA */}
                                         {item.alpaCount > 0 && (
                                             <div className="flex flex-wrap items-start gap-1 text-sm leading-relaxed mb-2">
                                                 <span className="font-bold text-red-600 bg-red-50 px-1.5 rounded border border-red-100 whitespace-nowrap">
                                                     • Alpa ({item.alpaCount} Hari):
                                                 </span>
                                                 <span className="text-slate-600">
                                                     {item.alpaDates.join(', ')}
                                                 </span>
                                             </div>
                                         )}

                                         {/* 2. VIOLATIONS */}
                                         {item.violations.map((v) => (
                                             <div key={v.id} className="flex flex-col sm:flex-row sm:items-baseline gap-1 text-sm leading-tight text-slate-700">
                                                 <span className="font-bold text-slate-800">• {v.category}</span>
                                                 <span className="hidden sm:inline text-slate-300">-</span>
                                                 <span>{v.date}</span>
                                                 <span className="text-xs text-slate-400 italic">({v.reporter})</span>
                                                 {v.note && <span className="text-xs text-slate-500 bg-slate-50 px-1 rounded truncate max-w-xs block sm:inline mt-1 sm:mt-0">"{v.note}"</span>}
                                             </div>
                                         ))}
                                     </td>
                                 </tr>
                             ))
                         )}
                     </tbody>
                 </table>
             </div>
             <div className="p-4 bg-slate-50 border-t border-slate-100 text-xs text-slate-400 text-center">
                 Menampilkan {reportData.length} siswa dengan catatan kedisiplinan.
             </div>
         </div>
      </div>
    </Layout>
  );
};

export default Kedisiplinan;
