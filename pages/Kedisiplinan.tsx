
import React, { useEffect, useState, useRef } from 'react';
import { Layout } from '../components/Layout';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
  ShieldAlert, 
  Loader2, 
  Save, 
  Plus, 
  Trash2, 
  Check, 
  ChevronDown, 
  X, 
  Filter, 
  Search, 
  Gavel, 
  User, 
  Calendar, 
  ChevronUp, 
  Printer, 
  Download, 
  FileSpreadsheet,
  Edit3,
  AlertCircle
} from 'lucide-react';
import { Student } from '../types';
import { getWIBISOString, formatDateIndo, formatDateSignature } from '../utils/dateUtils';
import { showAlert, showConfirm } from '../utils/alert';

interface NoteItem {
    category: string;
    studentIds: string[];
    followUp?: string;
    note?: string;
}

export interface AlpaDetail {
    id?: string;
    date: string; // YYYY-MM-DD
    displayDate: string;
    source: string;
    table: 'homeroom_attendance' | 'attendance_logs';
}

export interface ViolationItem {
    id: string;
    rawDate: string;
    date: string;
    category: string;
    followUp?: string;
    note: string;
    reporter: string;
}

interface DisciplineData {
    student: Student;
    alpaCount: number;
    alpaDates: string[];
    alpaDetails: AlpaDetail[];
    violations: ViolationItem[];
}

interface KedisiplinanProps {
  embedded?: boolean;
}

export const Kedisiplinan: React.FC<KedisiplinanProps> = ({ embedded = false }) => {
  const { profile, isAdmin, isOperator, academicYear, semester , semesterStart, semesterEnd } = useAuth();
  const [loading, setLoading] = useState(false);
  
  const isUserAdmin = Boolean(isAdmin || isOperator || profile?.role === 'admin' || profile?.role === 'operator' || profile?.mengajar_mapel === 'Kepala Sekolah');
  const isHeadmaster = profile?.mengajar_mapel === 'Kepala Sekolah';

  // Admin Management Modal State
  const [manageDisciplineStudent, setManageDisciplineStudent] = useState<DisciplineData | null>(null);
  const [editingViolation, setEditingViolation] = useState<{
    id?: string;
    student_id: string;
    student_name: string;
    category: string;
    follow_up: string;
    note: string;
    date: string;
    isNew: boolean;
  } | null>(null);
  const [editingAlpa, setEditingAlpa] = useState<{
    id?: string;
    student_id: string;
    student_name: string;
    date: string;
    table: 'homeroom_attendance' | 'attendance_logs';
    isNew: boolean;
  } | null>(null);
  const [isSavingAction, setIsSavingAction] = useState(false);

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
  const [settings, setSettings] = useState<{ [key: string]: string }>({});
  const [showPrintModal, setShowPrintModal] = useState(false);

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
            const settingsMap: { [key: string]: string } = {};
            settingsRes.data.forEach(item => {
                settingsMap[item.key] = item.value;
                if (item.key === 'discipline_types') setDisciplineTypes(item.value ? JSON.parse(item.value) : []);
                if (item.key === 'follow_up_types') setFollowUpTypes(item.value ? JSON.parse(item.value) : []);
            });
            setSettings(settingsMap);
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
              supabase.from('homeroom_attendance').select('id, student_id, date, status').eq('academic_year', academicYear || '2025/2026').eq('semester', semester || 'Ganjil').gte('date', semesterStart ? `${semesterStart}` : '2000-01-01').lte('date', semesterEnd ? `${semesterEnd}` : '2100-01-01')
                .in('student_id', targetStudentIds).gte('date', startDate).lte('date', endDate),
              supabase.from('attendance_logs').select('id, student_id, created_at, status').eq('academic_year', academicYear || '2025/2026').eq('semester', semester || 'Ganjil').gte('created_at', semesterStart ? `${semesterStart}T00:00:00+07:00` : '2000-01-01T00:00:00+07:00').lte('created_at', semesterEnd ? `${semesterEnd}T23:59:59+07:00` : '2100-01-01T23:59:59+07:00')
                .in('student_id', targetStudentIds).in('status', ['S', 'I', 'A']).gte('created_at', start).lte('created_at', end),
              supabase.from('journal_notes').select('id, student_id, category, follow_up, note, created_at, journal_id').eq('academic_year', academicYear || '2025/2026').eq('semester', semester || 'Ganjil').gte('created_at', semesterStart ? `${semesterStart}T00:00:00+07:00` : '2000-01-01T00:00:00+07:00').lte('created_at', semesterEnd ? `${semesterEnd}T23:59:59+07:00` : '2100-01-01T23:59:59+07:00')
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
          const datesWithHomeroomForClass = new Set(hLogs.map(l => l.date));

          const processed: DisciplineData[] = targetStudents.map(student => {
              // --- CALCULATE ALPA (DAYS) ---
              const studentHLogs = hLogs.filter(l => l.student_id === student.id);
              const studentTLogs = tLogs.filter(l => l.student_id === student.id);
              
              // Get all unique dates relevant to this student
              const hDates = studentHLogs.map(l => l.date);
              const tDates = studentTLogs.map(l => l.created_at.split('T')[0]);
              const uniqueDates = Array.from(new Set([...hDates, ...tDates])).sort();

              const alpaDatesList: string[] = [];
              const alpaDetailsList: AlpaDetail[] = [];

              uniqueDates.forEach(date => {
                  let finalStatus = '';
                  let foundId = '';
                  let foundTable: 'homeroom_attendance' | 'attendance_logs' = 'homeroom_attendance';
                  let foundSource = '';
                  
                  // Priority 1: Homeroom Teacher Input
                  const hLog = studentHLogs.find(l => l.date === date);
                  if (hLog) {
                      finalStatus = hLog.status;
                      foundId = hLog.id;
                      foundTable = 'homeroom_attendance';
                      foundSource = 'Wali Kelas';
                  } else if (!datesWithHomeroomForClass.has(date)) {
                      // Priority 2: Teacher Logs Aggregation (S > I > A) hanya jika belum ada absensi kelas dari Wali/Operator
                      const dailyLogs = studentTLogs.filter(l => l.created_at.startsWith(date));
                      if (dailyLogs.length > 0) {
                          const statuses = dailyLogs.map(l => l.status);
                          if (statuses.includes('S')) finalStatus = 'S';
                          else if (statuses.includes('I')) finalStatus = 'I';
                          else if (statuses.includes('A')) {
                            finalStatus = 'A';
                            foundId = dailyLogs[0].id;
                            foundTable = 'attendance_logs';
                            foundSource = 'Guru Mapel';
                          }
                      }
                  }

                  if (finalStatus === 'A') {
                      const dateObj = new Date(date);
                      const dateStr = new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short' }).format(dateObj);
                      alpaDatesList.push(dateStr);
                      alpaDetailsList.push({
                          id: foundId,
                          date,
                          displayDate: dateStr,
                          source: foundSource,
                          table: foundTable
                      });
                  }
              });

              // --- PROCESS VIOLATIONS ---
              const myViolations: ViolationItem[] = violationNotes.filter(n => n.student_id === student.id).map(n => {
                  const date = new Date(n.created_at);
                  const dateStr = new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short' }).format(date);
                  const reporter = journalMap[n.journal_id] || 'Admin/Guru';
                  return {
                      id: n.id,
                      rawDate: n.created_at ? n.created_at.split('T')[0] : '',
                      date: dateStr,
                      category: n.category,
                      followUp: n.follow_up || '',
                      note: n.note,
                      reporter
                  };
              });

              return {
                  student,
                  alpaCount: alpaDatesList.length, // Total Days Alpha
                  alpaDates: alpaDatesList,
                  alpaDetails: alpaDetailsList,
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

  // Handler for Deleting Violation
  const handleDeleteViolation = async (violationId: string, studentName: string, category: string) => {
    const ok = await showConfirm(
      `Hapus catatan pelanggaran "${category}" untuk siswa ${studentName}?`,
      "Hapus Pelanggaran?"
    );
    if (!ok) return;

    try {
      const { error } = await supabase.from('journal_notes').delete().eq('id', violationId);
      if (error) throw error;
      showAlert("Catatan pelanggaran berhasil dihapus.", "Berhasil");
      await fetchReportData();
      if (manageDisciplineStudent) {
        setManageDisciplineStudent(prev => {
          if (!prev) return null;
          return {
            ...prev,
            violations: prev.violations.filter(v => v.id !== violationId)
          };
        });
      }
    } catch (err: any) {
      showAlert(`Gagal menghapus: ${err.message || err}`, "Gagal");
    }
  };

  // Handler for Saving Violation (Edit / Add)
  const handleSaveViolation = async () => {
    if (!editingViolation) return;
    if (!editingViolation.category) {
      showAlert("Pilih Jenis Pelanggaran.");
      return;
    }
    setIsSavingAction(true);
    try {
      const { id, student_id, student_name, category, follow_up, note, date, isNew } = editingViolation;
      const createdAt = `${date}T08:00:00+07:00`;

      if (!isNew && id) {
        const { error } = await supabase
          .from('journal_notes')
          .update({
            category,
            follow_up: follow_up || '',
            note: note || '',
            created_at: createdAt
          })
          .eq('id', id);
        if (error) throw error;
        showAlert("Data pelanggaran berhasil diperbarui.", "Berhasil");
      } else {
        const { error } = await supabase
          .from('journal_notes')
          .insert([{
            student_id,
            student_name,
            type: 'kedisiplinan',
            category,
            follow_up: follow_up || '',
            note: note || `Catatan Kedisiplinan oleh ${profile?.full_name}`,
            created_at: createdAt,
            academic_year: academicYear || '2025/2026',
            semester: semester || 'Ganjil'
          }]);
        if (error) throw error;
        showAlert("Data pelanggaran berhasil ditambahkan.", "Berhasil");
      }

      setEditingViolation(null);
      await fetchReportData();
    } catch (err: any) {
      showAlert(`Gagal menyimpan: ${err.message || err}`, "Gagal");
    } finally {
      setIsSavingAction(false);
    }
  };

  // Handler for Deleting Alpa
  const handleDeleteAlpa = async (alpa: AlpaDetail, studentName: string) => {
    const ok = await showConfirm(
      `Hapus catatan Alpa tanggal ${formatDateIndo(alpa.date)} untuk siswa ${studentName}? Tindakan ini akan membatalkan status Alpa pada tanggal tersebut.`,
      "Hapus Catatan Alpa?"
    );
    if (!ok) return;

    try {
      if (alpa.table === 'homeroom_attendance') {
        if (alpa.id) {
          await supabase.from('homeroom_attendance').delete().eq('id', alpa.id);
        } else {
          await supabase.from('homeroom_attendance').delete().eq('date', alpa.date);
        }
      } else {
        if (alpa.id) {
          await supabase.from('attendance_logs').delete().eq('id', alpa.id);
        }
      }

      showAlert("Catatan Alpa berhasil dihapus.", "Berhasil");
      await fetchReportData();
      if (manageDisciplineStudent) {
        setManageDisciplineStudent(prev => {
          if (!prev) return null;
          const updatedAlpas = prev.alpaDetails.filter(a => a.date !== alpa.date);
          return {
            ...prev,
            alpaCount: updatedAlpas.length,
            alpaDates: updatedAlpas.map(a => a.displayDate),
            alpaDetails: updatedAlpas
          };
        });
      }
    } catch (err: any) {
      showAlert(`Gagal menghapus: ${err.message || err}`, "Gagal");
    }
  };

  // Handler for Saving Alpa (Edit date / Add new)
  const handleSaveAlpa = async () => {
    if (!editingAlpa) return;
    setIsSavingAction(true);
    try {
      const { id, student_id, date, table, isNew } = editingAlpa;

      if (!isNew && id) {
        if (table === 'homeroom_attendance') {
          const { error } = await supabase
            .from('homeroom_attendance')
            .update({ date })
            .eq('id', id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('attendance_logs')
            .update({ created_at: `${date}T07:00:00+07:00` })
            .eq('id', id);
          if (error) throw error;
        }
        showAlert("Tanggal Alpa berhasil diperbarui.", "Berhasil");
      } else {
        const { error } = await supabase
          .from('homeroom_attendance')
          .insert([{
            student_id,
            date,
            status: 'A',
            academic_year: academicYear || '2025/2026',
            semester: semester || 'Ganjil',
            recorded_by: profile?.id || null
          }]);
        if (error) throw error;
        showAlert("Catatan Alpa berhasil ditambahkan.", "Berhasil");
      }

      setEditingAlpa(null);
      await fetchReportData();
    } catch (err: any) {
      showAlert(`Gagal menyimpan: ${err.message || err}`, "Gagal");
    } finally {
      setIsSavingAction(false);
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

  const handleExportExcel = () => {
    if (reportData.length === 0) {
      showAlert("Tidak ada data kedisiplinan untuk diekspor.");
      return;
    }

    let csv = "No,NISN,Nama Siswa,Kelas,Total Alpa,Tanggal Alpa,Total Pelanggaran,Rincian Pelanggaran\n";
    reportData.forEach((item, idx) => {
      const alpaCount = item.alpaCount || 0;
      const alpaDates = item.alpaDates && item.alpaDates.length > 0 ? item.alpaDates.join('; ') : '-';
      const totalViolations = item.violations ? item.violations.length : 0;
      const violationDetails = (item.violations && item.violations.length > 0)
        ? item.violations.map(v => `[${v.date}] ${v.category}${v.note ? ` (${v.note})` : ''} - Pelapor: ${v.reporter}`).join(' | ')
        : '-';

      const row = [
        idx + 1,
        `"${item.student.nisn || '-'}"`,
        `"${(item.student.name || '').replace(/"/g, '""')}"`,
        `"${item.student.kelas || '-'}"`,
        alpaCount,
        `"${alpaDates.replace(/"/g, '""')}"`,
        totalViolations,
        `"${violationDetails.replace(/"/g, '""')}"`
      ];
      csv += row.join(',') + '\n';
    });

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Laporan_Kedisiplinan_BK_${selectedClass || 'Semua_Kelas'}_${startDate}_sd_${endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    setShowPrintModal(true);
  };

  const handlePrintExecution = () => {
    window.print();
  };

  const mainContent = (
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
            <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
              <button 
                  onClick={fetchReportData} 
                  disabled={loading}
                  className="flex-1 md:flex-none bg-slate-800 hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95"
              >
                  {loading ? <Loader2 className="animate-spin" size={14}/> : <Search size={14} />} 
                  <span>Tampilkan</span>
              </button>
              <button 
                  type="button"
                  onClick={handleExportExcel}
                  disabled={loading || reportData.length === 0}
                  className="flex-1 md:flex-none bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 disabled:opacity-50"
                  title="Download data kedisiplinan & alpa format Excel (CSV)"
              >
                  <FileSpreadsheet size={14} /> 
                  <span>Download Excel</span>
              </button>
              <button 
                  type="button"
                  onClick={handlePrint}
                  disabled={loading || reportData.length === 0}
                  className="flex-1 md:flex-none bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 disabled:opacity-50"
                  title="Pratinjau Cetak Dokumen Resmi Kedisiplinan & BK (PDF)"
              >
                  <Printer size={14} /> 
                  <span>Cetak / PDF</span>
              </button>
            </div>
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
                             {isUserAdmin && (
                                 <th className="px-6 py-4 w-28 text-center print:hidden">Aksi</th>
                             )}
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                         {loading ? (
                             <tr><td colSpan={isUserAdmin ? 5 : 4} className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-orange-500" /></td></tr>
                         ) : reportData.length === 0 ? (
                             <tr><td colSpan={isUserAdmin ? 5 : 4} className="p-8 text-center text-slate-400 italic">Tidak ada data pelanggaran atau Alpa pada periode ini.</td></tr>
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
                                             <div className="flex flex-wrap items-start gap-1.5 text-sm leading-relaxed mb-2 p-2.5 bg-red-50/70 rounded-xl border border-red-100">
                                                 <span className="font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-lg border border-red-200 text-xs whitespace-nowrap">
                                                     • Alpa ({item.alpaCount} Hari):
                                                 </span>
                                                 <div className="flex flex-wrap gap-1.5 items-center">
                                                     {item.alpaDetails.map((a, aIdx) => (
                                                         <span key={aIdx} className="inline-flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-red-200 text-xs text-slate-700 shadow-2xs">
                                                             <span>{a.displayDate}</span>
                                                             <span className="text-[10px] text-slate-400">({a.source})</span>
                                                             {isUserAdmin && (
                                                                 <button
                                                                     type="button"
                                                                     onClick={() => handleDeleteAlpa(a, item.student.name)}
                                                                     className="text-red-400 hover:text-red-700 p-0.5 rounded transition-colors"
                                                                     title="Hapus status Alpa tanggal ini"
                                                                 >
                                                                     <X size={12} />
                                                                 </button>
                                                             )}
                                                         </span>
                                                     ))}
                                                 </div>
                                             </div>
                                         )}

                                         {/* 2. VIOLATIONS */}
                                         {item.violations.map((v) => (
                                             <div key={v.id} className="group flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 text-sm leading-tight text-slate-700 p-2 rounded-xl hover:bg-orange-50/60 border border-transparent hover:border-orange-100 transition-colors">
                                                 <div className="flex flex-wrap items-baseline gap-1.5">
                                                     <span className="font-bold text-slate-800">• {v.category}</span>
                                                     <span className="hidden sm:inline text-slate-300">-</span>
                                                     <span className="font-medium text-slate-600">{v.date}</span>
                                                     <span className="text-xs text-slate-400 italic">({v.reporter})</span>
                                                     {v.followUp && (
                                                         <span className="text-xs font-semibold text-orange-700 bg-orange-100 px-1.5 py-0.5 rounded-md">
                                                             {v.followUp}
                                                         </span>
                                                     )}
                                                     {v.note && (
                                                         <span className="text-xs text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-md truncate max-w-xs block sm:inline mt-1 sm:mt-0">
                                                             "{v.note}"
                                                         </span>
                                                     )}
                                                 </div>
                                                 {isUserAdmin && (
                                                     <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity print:hidden">
                                                         <button
                                                             type="button"
                                                             onClick={() => setEditingViolation({
                                                                 id: v.id,
                                                                 student_id: item.student.id,
                                                                 student_name: item.student.name,
                                                                 category: v.category,
                                                                 follow_up: v.followUp || '',
                                                                 note: v.note,
                                                                 date: v.rawDate || getWIBISOString(),
                                                                 isNew: false
                                                             })}
                                                             className="p-1 hover:bg-white rounded-lg text-slate-600 hover:text-orange-600 transition-colors"
                                                             title="Edit Pelanggaran"
                                                         >
                                                             <Edit3 size={13} />
                                                         </button>
                                                         <button
                                                             type="button"
                                                             onClick={() => handleDeleteViolation(v.id, item.student.name, v.category)}
                                                             className="p-1 hover:bg-white rounded-lg text-slate-400 hover:text-red-600 transition-colors"
                                                             title="Hapus Pelanggaran"
                                                         >
                                                             <Trash2 size={13} />
                                                         </button>
                                                     </div>
                                                 )}
                                             </div>
                                         ))}
                                     </td>
                                     {isUserAdmin && (
                                         <td className="px-6 py-4 text-center align-top print:hidden">
                                             <button
                                                 type="button"
                                                 onClick={() => setManageDisciplineStudent(item)}
                                                 className="px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold text-xs rounded-xl border border-orange-200 inline-flex items-center gap-1.5 transition-colors shadow-2xs"
                                                 title="Kelola Pelanggaran & Alpa Siswa"
                                             >
                                                 <Edit3 size={13} />
                                                 <span>Kelola</span>
                                             </button>
                                         </td>
                                     )}
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

         {/* MODAL KELOLA KEDISIPLINAN SISWA (ADMIN) */}
         {manageDisciplineStudent && (
           <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
             <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
               <div className="p-5 bg-gradient-to-r from-orange-600 to-red-600 text-white flex items-center justify-between">
                 <div>
                   <h3 className="font-bold text-base">Kelola Catatan Kedisiplinan & Alpa</h3>
                   <p className="text-xs text-orange-100">
                     {manageDisciplineStudent.student.name} • {manageDisciplineStudent.student.kelas} (NISN: {manageDisciplineStudent.student.nisn || '-'})
                   </p>
                 </div>
                 <button
                   type="button"
                   onClick={() => setManageDisciplineStudent(null)}
                   className="p-1.5 hover:bg-white/20 rounded-xl transition-colors text-white"
                 >
                   <X size={18} />
                 </button>
               </div>

               <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
                 {/* Summary Stats */}
                 <div className="grid grid-cols-2 gap-3">
                   <div className="p-3 bg-orange-50 dark:bg-orange-950/40 rounded-2xl border border-orange-200 dark:border-orange-800/60 flex items-center justify-between">
                     <div>
                       <span className="text-[11px] font-bold text-orange-700 dark:text-orange-400 block">Pelanggaran BK</span>
                       <span className="text-xl font-black text-orange-800 dark:text-orange-300">
                         {manageDisciplineStudent.violations.length} Catatan
                       </span>
                     </div>
                     <button
                       type="button"
                       onClick={() => setEditingViolation({
                         student_id: manageDisciplineStudent.student.id,
                         student_name: manageDisciplineStudent.student.name,
                         category: disciplineTypes[0] || 'Terlambat',
                         follow_up: followUpTypes[0] || 'Teguran Lisan',
                         note: '',
                         date: getWIBISOString(),
                         isNew: true
                       })}
                       className="px-2.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl inline-flex items-center gap-1 shadow-sm transition-all"
                     >
                       <Plus size={13} />
                       <span>Tambah</span>
                     </button>
                   </div>

                   <div className="p-3 bg-red-50 dark:bg-red-950/40 rounded-2xl border border-red-200 dark:border-red-800/60 flex items-center justify-between">
                     <div>
                       <span className="text-[11px] font-bold text-red-700 dark:text-red-400 block">Total Hari Alpa</span>
                       <span className="text-xl font-black text-red-800 dark:text-red-300">
                         {manageDisciplineStudent.alpaCount} Hari
                       </span>
                     </div>
                     <button
                       type="button"
                       onClick={() => setEditingAlpa({
                         student_id: manageDisciplineStudent.student.id,
                         student_name: manageDisciplineStudent.student.name,
                         date: getWIBISOString(),
                         table: 'homeroom_attendance',
                         isNew: true
                       })}
                       className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl inline-flex items-center gap-1 shadow-sm transition-all"
                     >
                       <Plus size={13} />
                       <span>Tambah</span>
                     </button>
                   </div>
                 </div>

                 {/* SECTION 1: PELANGGARAN */}
                 <div className="space-y-2">
                   <div className="flex items-center justify-between">
                     <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                       <ShieldAlert size={14} className="text-orange-500" />
                       <span>Daftar Pelanggaran BK ({manageDisciplineStudent.violations.length})</span>
                     </h4>
                   </div>

                   {manageDisciplineStudent.violations.length === 0 ? (
                     <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-center text-xs text-slate-400 italic">
                       Tidak ada catatan pelanggaran.
                     </div>
                   ) : (
                     <div className="space-y-2">
                       {manageDisciplineStudent.violations.map((v) => (
                         <div
                           key={v.id}
                           className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-start justify-between gap-3"
                         >
                           <div className="space-y-1">
                             <div className="flex items-center gap-2">
                               <span className="font-bold text-xs text-slate-800 dark:text-slate-100">
                                 {v.category}
                               </span>
                               <span className="text-[11px] font-mono text-slate-400">
                                 ({v.date})
                               </span>
                               {v.followUp && (
                                 <span className="text-[10px] font-bold text-orange-700 bg-orange-100 px-1.5 py-0.5 rounded">
                                   {v.followUp}
                                 </span>
                               )}
                             </div>
                             {v.note && (
                               <p className="text-xs text-slate-600 dark:text-slate-300 italic">
                                 "{v.note}"
                               </p>
                             )}
                             <p className="text-[10px] text-slate-400">
                               Pencatat: {v.reporter}
                             </p>
                           </div>

                           <div className="flex items-center gap-1 shrink-0">
                             <button
                               type="button"
                               onClick={() => setEditingViolation({
                                 id: v.id,
                                 student_id: manageDisciplineStudent.student.id,
                                 student_name: manageDisciplineStudent.student.name,
                                 category: v.category,
                                 follow_up: v.followUp || '',
                                 note: v.note,
                                 date: v.rawDate || getWIBISOString(),
                                 isNew: false
                               })}
                               className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition-colors"
                               title="Edit"
                             >
                               <Edit3 size={14} />
                             </button>
                             <button
                               type="button"
                               onClick={() => handleDeleteViolation(v.id, manageDisciplineStudent.student.name, v.category)}
                               className="p-1.5 hover:bg-red-100 dark:hover:bg-red-950/40 rounded-lg text-red-600 transition-colors"
                               title="Hapus"
                             >
                               <Trash2 size={14} />
                             </button>
                           </div>
                         </div>
                       ))}
                     </div>
                   )}
                 </div>

                 {/* SECTION 2: ALPA */}
                 <div className="space-y-2">
                   <div className="flex items-center justify-between">
                     <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                       <AlertCircle size={14} className="text-red-500" />
                       <span>Daftar Ketidakhadiran Alpa ({manageDisciplineStudent.alpaDetails.length})</span>
                     </h4>
                   </div>

                   {manageDisciplineStudent.alpaDetails.length === 0 ? (
                     <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-center text-xs text-slate-400 italic">
                       Tidak ada catatan Alpa.
                     </div>
                   ) : (
                     <div className="space-y-2">
                       {manageDisciplineStudent.alpaDetails.map((a, aIdx) => (
                         <div
                           key={aIdx}
                           className="p-3 bg-red-50/50 dark:bg-red-950/20 rounded-xl border border-red-200 dark:border-red-900/50 flex items-center justify-between gap-3"
                         >
                           <div className="flex items-center gap-2.5">
                             <span className="w-7 h-7 rounded-lg bg-red-100 text-red-700 flex items-center justify-center font-black text-xs">
                               A
                             </span>
                             <div>
                               <div className="font-bold text-xs text-slate-800 dark:text-slate-100 font-mono">
                                 {formatDateIndo(a.date)}
                               </div>
                               <div className="text-[10px] text-slate-400">
                                 Sumber: {a.source} ({a.table})
                               </div>
                             </div>
                           </div>

                           <div className="flex items-center gap-1">
                             <button
                               type="button"
                               onClick={() => setEditingAlpa({
                                 id: a.id,
                                 student_id: manageDisciplineStudent.student.id,
                                 student_name: manageDisciplineStudent.student.name,
                                 date: a.date,
                                 table: a.table,
                                 isNew: false
                               })}
                               className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition-colors"
                               title="Edit Tanggal"
                             >
                               <Edit3 size={14} />
                             </button>
                             <button
                               type="button"
                               onClick={() => handleDeleteAlpa(a, manageDisciplineStudent.student.name)}
                               className="p-1.5 hover:bg-red-100 dark:hover:bg-red-950/40 rounded-lg text-red-600 transition-colors"
                               title="Hapus"
                             >
                               <Trash2 size={14} />
                             </button>
                           </div>
                         </div>
                       ))}
                     </div>
                   )}
                 </div>
               </div>

               <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                 <button
                   type="button"
                   onClick={() => setManageDisciplineStudent(null)}
                   className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-colors"
                 >
                   Tutup
                 </button>
               </div>
             </div>
           </div>
         )}

         {/* SUB-MODAL FORM EDIT/TAMBAH PELANGGARAN */}
         {editingViolation && (
           <div className="fixed inset-0 z-60 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
             <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
               <div className="p-4 bg-orange-600 text-white flex items-center justify-between">
                 <h4 className="font-bold text-sm flex items-center gap-2">
                   <ShieldAlert size={16} />
                   <span>{editingViolation.isNew ? 'Tambah Catatan Pelanggaran' : 'Edit Catatan Pelanggaran'}</span>
                 </h4>
                 <button
                   type="button"
                   onClick={() => setEditingViolation(null)}
                   className="p-1 hover:bg-white/20 rounded-lg text-white"
                 >
                   <X size={16} />
                 </button>
               </div>

               <div className="p-5 space-y-3.5">
                 <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                   <span className="text-slate-400 block text-[10px]">Siswa:</span>
                   <span className="font-bold text-slate-700 dark:text-slate-200">{editingViolation.student_name}</span>
                 </div>

                 <div>
                   <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                     Tanggal Kejadian
                   </label>
                   <input
                     type="date"
                     value={editingViolation.date}
                     onChange={e => setEditingViolation({ ...editingViolation, date: e.target.value })}
                     className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-orange-500"
                   />
                 </div>

                 <div>
                   <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                     Jenis Pelanggaran
                   </label>
                   <select
                     value={editingViolation.category}
                     onChange={e => setEditingViolation({ ...editingViolation, category: e.target.value })}
                     className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-orange-500"
                   >
                     {disciplineTypes.map((t, idx) => (
                       <option key={idx} value={t}>{t}</option>
                     ))}
                   </select>
                 </div>

                 <div>
                   <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                     Tindak Lanjut
                   </label>
                   <select
                     value={editingViolation.follow_up}
                     onChange={e => setEditingViolation({ ...editingViolation, follow_up: e.target.value })}
                     className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-orange-500"
                   >
                     <option value="">- Belum ada tindak lanjut -</option>
                     {followUpTypes.map((t, idx) => (
                       <option key={idx} value={t}>{t}</option>
                     ))}
                   </select>
                 </div>

                 <div>
                   <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                     Keterangan / Kronologi
                   </label>
                   <textarea
                     rows={3}
                     value={editingViolation.note}
                     onChange={e => setEditingViolation({ ...editingViolation, note: e.target.value })}
                     placeholder="Tuliskan keterangan kejadian..."
                     className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-orange-500"
                   />
                 </div>
               </div>

               <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
                 <button
                   type="button"
                   onClick={() => setEditingViolation(null)}
                   disabled={isSavingAction}
                   className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-colors"
                 >
                   Batal
                 </button>
                 <button
                   type="button"
                   onClick={handleSaveViolation}
                   disabled={isSavingAction}
                   className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-sm inline-flex items-center gap-1.5 disabled:opacity-50 transition-all"
                 >
                   {isSavingAction ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                   <span>Simpan</span>
                 </button>
               </div>
             </div>
           </div>
         )}

         {/* SUB-MODAL FORM EDIT/TAMBAH ALPA */}
         {editingAlpa && (
           <div className="fixed inset-0 z-60 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
             <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
               <div className="p-4 bg-red-600 text-white flex items-center justify-between">
                 <h4 className="font-bold text-sm flex items-center gap-2">
                   <AlertCircle size={16} />
                   <span>{editingAlpa.isNew ? 'Tambah Catatan Alpa' : 'Edit Tanggal Alpa'}</span>
                 </h4>
                 <button
                   type="button"
                   onClick={() => setEditingAlpa(null)}
                   className="p-1 hover:bg-white/20 rounded-lg text-white"
                 >
                   <X size={16} />
                 </button>
               </div>

               <div className="p-5 space-y-3.5">
                 <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                   <span className="text-slate-400 block text-[10px]">Siswa:</span>
                   <span className="font-bold text-slate-700 dark:text-slate-200">{editingAlpa.student_name}</span>
                 </div>

                 <div>
                   <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                     Tanggal Alpa
                   </label>
                   <input
                     type="date"
                     value={editingAlpa.date}
                     onChange={e => setEditingAlpa({ ...editingAlpa, date: e.target.value })}
                     className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-red-500"
                   />
                 </div>
               </div>

               <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
                 <button
                   type="button"
                   onClick={() => setEditingAlpa(null)}
                   disabled={isSavingAction}
                   className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-colors"
                 >
                   Batal
                 </button>
                 <button
                   type="button"
                   onClick={handleSaveAlpa}
                   disabled={isSavingAction}
                   className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-sm inline-flex items-center gap-1.5 disabled:opacity-50 transition-all"
                 >
                   {isSavingAction ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                   <span>Simpan</span>
                 </button>
               </div>
             </div>
           </div>
         )}

         {/* MODAL PRINT PREVIEW KEDISIPLINAN & BK */}
         {showPrintModal && (
           <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-start justify-center p-3 sm:p-6 overflow-y-auto">
             <div className="bg-white rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden my-4">
               {/* HEADER MODAL (NO PRINT) */}
               <div className="no-print bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-800">
                 <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-xl bg-rose-600 flex items-center justify-center text-white">
                     <Printer size={20} />
                   </div>
                   <div>
                     <h3 className="font-bold text-base">Pratinjau Cetak Laporan Kedisiplinan & BK</h3>
                     <p className="text-xs text-slate-400">Pastikan seluruh data pelanggaran dan alpa sudah sesuai sebelum dicetak.</p>
                   </div>
                 </div>
                 <div className="flex items-center gap-3">
                   <button
                     type="button"
                     onClick={handlePrintExecution}
                     className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 active:scale-95"
                   >
                     <Printer size={16} /> Cetak Sekarang (Print / PDF)
                   </button>
                   <button
                     type="button"
                     onClick={() => setShowPrintModal(false)}
                     className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors"
                   >
                     <X size={20} />
                   </button>
                 </div>
               </div>

               {/* PRINTABLE AREA */}
               <div id="printable-kedisiplinan" className="p-6 sm:p-10 bg-white text-black space-y-6">
                 {/* KOP SURAT */}
                 <table style={{ width: '100%', borderCollapse: 'collapse', border: 'none', borderBottom: '3px double #000', paddingBottom: '10px', marginBottom: '14px' }}>
                   <tbody>
                     <tr style={{ border: 'none' }}>
                       <td style={{ width: '85px', verticalAlign: 'middle', textAlign: 'center', border: 'none', padding: '0 10px 10px 0' }}>
                         <img 
                           src="https://lh3.googleusercontent.com/d/1KtAUvy02qNUB2FzCUoVrNmHtFT0eH2J0" 
                           alt="Logo Sekolah" 
                           style={{ height: '75px', width: 'auto', display: 'block', margin: '0 auto', objectFit: 'contain' }}
                         />
                       </td>
                       <td style={{ verticalAlign: 'middle', textAlign: 'center', border: 'none', padding: '0 85px 10px 0' }}>
                         <div style={{ fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#1e293b', lineHeight: '1.25' }}>PEMERINTAH KOTA PASURUAN</div>
                         <div style={{ fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#1e293b', lineHeight: '1.25', marginTop: '2px' }}>DINAS PENDIDIKAN DAN KEBUDAYAAN</div>
                         <div style={{ fontSize: '18px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#000', lineHeight: '1.2', margin: '3px 0' }}>UPT SMP NEGERI 8 PASURUAN</div>
                         <div style={{ fontSize: '11px', fontStyle: 'italic', color: '#475569', lineHeight: '1.3' }}>
                           {settings.school_address || 'Jl. KH Mansyur No. 162, Sekargadung, Kec. Purworejo, Kota Pasuruan, Jawa Timur 67127 | Telp: (0343) 422108'}
                         </div>
                       </td>
                     </tr>
                   </tbody>
                 </table>

                 {/* JUDUL LAPORAN */}
                 <div style={{ textAlign: 'center', margin: '0 0 16px 0' }}>
                   <h3 style={{ fontSize: '14px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#000', textDecoration: 'underline', margin: '0 0 4px 0' }}>
                     REKAPITULASI LAPORAN KEDISIPLINAN & TATA TERTIB SISWA
                   </h3>
                   <div style={{ fontSize: '11px', color: '#334155', fontWeight: '600' }}>
                     Tahun Pelajaran: {academicYear || '2025/2026'} | Semester {semester || '1'}
                   </div>
                   <div style={{ fontSize: '11px', color: '#334155', fontWeight: '600' }}>
                     Periode: {formatDateIndo(startDate)} s.d. {formatDateIndo(endDate)} | Kelas: {selectedClass || 'Semua Kelas'}
                   </div>
                 </div>

                 {/* TABEL DATA KEDISIPLINAN */}
                 <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', border: '1px solid #334155' }}>
                   <thead>
                     <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #334155' }}>
                       <th style={{ border: '1px solid #334155', padding: '6px 8px', width: '35px', textAlign: 'center' }}>NO</th>
                       <th style={{ border: '1px solid #334155', padding: '6px 8px', width: '90px', textAlign: 'center' }}>NISN</th>
                       <th style={{ border: '1px solid #334155', padding: '6px 8px', textAlign: 'left', width: '180px' }}>NAMA SISWA</th>
                       <th style={{ border: '1px solid #334155', padding: '6px 8px', width: '60px', textAlign: 'center' }}>KELAS</th>
                       <th style={{ border: '1px solid #334155', padding: '6px 8px', width: '130px', textAlign: 'center' }}>KETIDAKHADIRAN</th>
                       <th style={{ border: '1px solid #334155', padding: '6px 8px', textAlign: 'left' }}>RINCIAN PELANGGARAN & TINDAK LANJUT</th>
                     </tr>
                   </thead>
                   <tbody>
                     {reportData.map((item, idx) => (
                       <tr key={idx} style={{ borderBottom: '1px solid #cbd5e1' }}>
                         <td style={{ border: '1px solid #cbd5e1', padding: '6px 8px', textAlign: 'center', verticalAlign: 'top' }}>{idx + 1}</td>
                         <td style={{ border: '1px solid #cbd5e1', padding: '6px 8px', textAlign: 'center', verticalAlign: 'top', fontFamily: 'monospace' }}>{item.student.nisn || '-'}</td>
                         <td style={{ border: '1px solid #cbd5e1', padding: '6px 8px', fontWeight: 'bold', verticalAlign: 'top' }}>{item.student.name}</td>
                         <td style={{ border: '1px solid #cbd5e1', padding: '6px 8px', textAlign: 'center', verticalAlign: 'top' }}>{item.student.kelas}</td>
                         <td style={{ border: '1px solid #cbd5e1', padding: '6px 8px', verticalAlign: 'top' }}>
                           {item.alpaCount > 0 ? (
                             <div>
                               <strong style={{ color: '#b91c1c' }}>Alpa: {item.alpaCount} Hari</strong>
                               <div style={{ fontSize: '10px', color: '#475569', marginTop: '2px' }}>
                                 {item.alpaDates.join(', ')}
                               </div>
                             </div>
                           ) : (
                             <span style={{ color: '#059669', fontStyle: 'italic' }}>Tidak Ada Alpa</span>
                           )}
                         </td>
                         <td style={{ border: '1px solid #cbd5e1', padding: '6px 8px', verticalAlign: 'top' }}>
                           {item.violations && item.violations.length > 0 ? (
                             <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                               {item.violations.map((v) => (
                                 <div key={v.id} style={{ fontSize: '10.5px', lineHeight: '1.3' }}>
                                   • <strong>{v.category}</strong> ({v.date})
                                   {v.note && <span style={{ fontStyle: 'italic', color: '#334155' }}> - "{v.note}"</span>}
                                   <span style={{ fontSize: '9.5px', color: '#64748b' }}> [Pelapor: {v.reporter}]</span>
                                 </div>
                               ))}
                             </div>
                           ) : (
                             <span style={{ color: '#64748b', fontStyle: 'italic' }}>Nihil catatan pelanggaran</span>
                           )}
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>

                 {/* TANDA TANGAN */}
                 <table style={{ width: '100%', borderCollapse: 'collapse', border: 'none', marginTop: '30px', pageBreakInside: 'avoid' }}>
                   <tbody>
                     <tr style={{ border: 'none' }}>
                       <td style={{ width: '50%', textAlign: 'center', border: 'none', verticalAlign: 'top', padding: '0 20px' }}>
                         <div style={{ fontSize: '11px', color: '#000' }}>Mengetahui,</div>
                         <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#000', marginBottom: '60px' }}>
                           Kepala UPT SMP Negeri 8 Pasuruan
                         </div>
                         <div style={{ fontSize: '11px', fontWeight: 'bold', textDecoration: 'underline', color: '#000' }}>
                           {settings.headmaster || 'ARIF SYAIFURROHMAN, S.Pd'}
                         </div>
                         <div style={{ fontSize: '11px', color: '#000' }}>
                           NIP. {settings.headmaster_nip || '198106202009041003'}
                         </div>
                       </td>
                       <td style={{ width: '50%', textAlign: 'center', border: 'none', verticalAlign: 'top', padding: '0 20px' }}>
                         <div style={{ fontSize: '11px', color: '#000' }}>Pasuruan, {formatDateSignature(new Date())}</div>
                         <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#000', marginBottom: '60px' }}>
                           Guru BK / Koordinator Ketertiban
                         </div>
                         <div style={{ fontSize: '11px', fontWeight: 'bold', textDecoration: 'underline', color: '#000' }}>
                           {profile?.full_name || '...........................................'}
                         </div>
                         <div style={{ fontSize: '11px', color: '#000' }}>
                           NIP. {profile?.nip || '...........................................'}
                         </div>
                       </td>
                     </tr>
                   </tbody>
                 </table>
               </div>
             </div>
           </div>
         )}

         {/* PRINT CSS */}
         <style>{`
           @media print {
             body * {
               visibility: hidden !important;
             }
             #printable-kedisiplinan, #printable-kedisiplinan * {
               visibility: visible !important;
             }
             #printable-kedisiplinan {
               position: absolute !important;
               left: 0 !important;
               top: 0 !important;
               width: 100% !important;
               margin: 0 !important;
               padding: 10mm !important;
               background: white !important;
               color: black !important;
               box-shadow: none !important;
             }
             .no-print {
               display: none !important;
             }
           }
         `}</style>
      </div>
  );

  if (embedded) {
    return mainContent;
  }

  return (
    <Layout>
      {mainContent}
    </Layout>
  );
};

export default Kedisiplinan;
