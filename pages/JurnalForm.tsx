import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Student, Schedule, Journal, Profile } from '../types';
import { getWIBISOString, getWIBDate } from '../utils/dateUtils';
import {  ArrowLeft, ArrowRight, Check, Send, Sparkles, BookOpen, Clock, ToggleLeft, ToggleRight, Loader2, Edit3, XCircle, CheckCircle2, MessageSquare, History, ClipboardCheck, X, ClipboardList, BookOpenCheck, Ban, ChevronRight, Plus, Trash2, ChevronDown, CheckSquare, Square, Gavel, Lock, Unlock, BookOpenText, UserCheck, UserX, Users } from 'lucide-react';

interface NoteItem {
    category: string;
    studentIds: string[];
    followUp?: string;
    note?: string; 
}

const smartTitleCase = (str: string) => {
    const smallWords = ['di', 'ke', 'dari', 'pada', 'dalam', 'dengan', 'dan', 'atau', 'yang', 'untuk', 'saja'];
    return str.split(' ').map((word, index) => {
        if (!word) return '';
        if (word === word.toUpperCase() && /[A-Z]/.test(word)) {
            return word;
        }
        const lower = word.toLowerCase();
        if (index === 0) return lower.charAt(0).toUpperCase() + lower.slice(1);
        if (smallWords.includes(lower)) return lower;
        if (/^[a-z][.,]?$/.test(lower)) return lower;
        return lower.charAt(0).toUpperCase() + lower.slice(1);
    }).join(' ');
};

const JurnalForm: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, academicYear, semester , activeScheduleVersion , semesterStart, semesterEnd } = useAuth();
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  
  const [todaySchedules, setTodaySchedules] = useState<Schedule[]>([]);
  const [allClasses, setAllClasses] = useState<string[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  
  const [existingJournals, setExistingJournals] = useState<Journal[]>([]);
  const [editJournalId, setEditJournalId] = useState<string | null>(null);
  
  const [lastMaterials, setLastMaterials] = useState<Record<string, string>>({}); 
  const [inputMode, setInputMode] = useState<'auto' | 'inval' | 'manual'>('auto');

  // Inval Guru States
  const [allTeachers, setAllTeachers] = useState<Profile[]>([]);
  const [selectedInvalTeacherId, setSelectedInvalTeacherId] = useState<string>('');
  const [selectedInvalTeacher, setSelectedInvalTeacher] = useState<Profile | null>(null);
  const [invalTeacherSchedules, setInvalTeacherSchedules] = useState<Schedule[]>([]);
  const [invalLoading, setInvalLoading] = useState<boolean>(false);

  const [disciplineTypes, setDisciplineTypes] = useState<string[]>([]);
  const [followUpTypes, setFollowUpTypes] = useState<string[]>([]);
  const [activityTypes, setActivityTypes] = useState<string[]>([]);

  const [showAssessmentModal, setShowAssessmentModal] = useState(false);
  const [showStudentChecklistModal, setShowStudentChecklistModal] = useState(false);
  const [assessmentType, setAssessmentType] = useState<'harian' | 'tugas' | 'none'>('none');
  const [missingStudents, setMissingStudents] = useState<string[]>([]); 

  const [notesData, setNotesData] = useState<{ discipline: NoteItem[]; activity: NoteItem[]; }>({ discipline: [], activity: [] });

  const [prevMeetingStats, setPrevMeetingStats] = useState<Record<string, string>>({});
  const [hasPrevMeeting, setHasPrevMeeting] = useState(false);

  const [studentStats, setStudentStats] = useState<Record<string, { A: number, D: number }>>({});

  const [alertState, setAlertState] = useState<{
    isOpen: boolean;
    type: 'success' | 'error';
    title: string;
    message: string;
  }>({ isOpen: false, type: 'success', title: '', message: '' });

  const [lockedAttendance, setLockedAttendance] = useState<string[]>([]);
  const toggleLockStudent = (studentId: string) => {
    setLockedAttendance(prev =>
      prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
    );
  };
  const [formData, setFormData] = useState({
    kelas: '',
    subject: '',
    hours: [] as string[],
    material: '',
    attendance: {} as Record<string, 'S' | 'I' | 'A' | 'D'>,
    cleanliness: '',
    validation: '',
    notes: '',
    isConfirmed: false
  });

  const isSpecialSubjectDhuha = (subject: string) => {
      return subject && subject.toLowerCase().includes('dhuha');
  };
  const isDhuha = isSpecialSubjectDhuha(formData.subject);

  useEffect(() => { fetchInitData(); }, [profile]);

  useEffect(() => {
    if (todaySchedules.length > 0 && location.state?.scheduleId && !initLoading) {
      handleScheduleSelect(location.state.scheduleId);
      // clear state so it doesn't re-trigger on remounts
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [todaySchedules, location.state, initLoading]);

  useEffect(() => { if (isDhuha && !formData.material) { setFormData(prev => ({ ...prev, material: 'Salat Dhuha' })); } }, [formData.subject, isDhuha]);

  useEffect(() => {
      if (formData.kelas && formData.subject) {
          const fetchPreviousAttendance = async () => {
              try {
                  const todayStr = getWIBISOString();
                  const { data: journals } = await supabase.from('journals').select('id').eq('academic_year', academicYear || '2025/2026').eq('semester', semester || 'Ganjil').gte('created_at', semesterStart ? `${semesterStart}T00:00:00+07:00` : '2000-01-01T00:00:00+07:00').lte('created_at', semesterEnd ? `${semesterEnd}T23:59:59+07:00` : '2100-01-01T23:59:59+07:00').eq('kelas', formData.kelas).eq('subject', formData.subject).lt('created_at', `${todayStr}T00:00:00+07:00`).order('created_at', { ascending: false }).limit(1);
                  if (journals && journals.length > 0) {
                      const lastJid = journals[0].id;
                      setHasPrevMeeting(true);
                      const { data: logs } = await supabase.from('attendance_logs').select('student_id, status').eq('academic_year', academicYear || '2025/2026').eq('semester', semester || 'Ganjil').gte('created_at', semesterStart ? `${semesterStart}T00:00:00+07:00` : '2000-01-01T00:00:00+07:00').lte('created_at', semesterEnd ? `${semesterEnd}T23:59:59+07:00` : '2100-01-01T23:59:59+07:00').eq('journal_id', lastJid);
                      const map: Record<string, string> = {};
                      if (logs) logs.forEach(l => map[l.student_id] = l.status);
                      setPrevMeetingStats(map);
                  } else { setHasPrevMeeting(false); setPrevMeetingStats({}); }
              } catch (e) { console.error("Error fetching prev attendance", e); }
          };
          fetchPreviousAttendance();
      }
  }, [formData.subject, formData.kelas]);

  const fetchInitData = async () => {
    setInitLoading(true);
    try {
        if (!profile) return;
        const wibDate = getWIBDate();
        const jsDay = wibDate.getDay(); 
        const dbDay = jsDay === 0 ? 7 : jsDay;
        const todayStr = getWIBISOString();

        const [schedulesRes, settingsRes, profilesRes] = await Promise.all([
             supabase.from('schedules').select('*').eq('teacher_id', profile.id).eq('day_of_week', dbDay).eq('academic_year', academicYear || '2025/2026').eq('semester', semester || 'Ganjil').eq('schedule_version', activeScheduleVersion || 'Utama').order('hour').then(async (res) => {
                 if (res.error && (res.error.code === '42703' || res.error.message?.includes('academic_year') || res.error.message?.includes('semester'))) {
                     const fallback = await supabase.from('schedules').select('*').eq('teacher_id', profile.id).eq('day_of_week', dbDay).order('hour');
                     if (fallback.data && fallback.data.length > 0 && fallback.data[0].academic_year !== undefined) {
                         fallback.data = fallback.data.filter(s => s.academic_year === (academicYear || '2025/2026') && s.semester === (semester || 'Ganjil'));
                     }
                     return fallback;
                 }
                 return res;
             }),
             supabase.from('app_settings').select('*'),
             supabase.from('profiles').select('id, full_name, nip, role').order('full_name')
        ]);

        const schedules = schedulesRes.data;
        if (profilesRes.data) {
            const validTeachers = (profilesRes.data as Profile[]).filter(t => 
              (t.role as string) !== 'admin' && 
              (t.role as string) !== 'administrator' && 
              t.role?.toLowerCase() !== 'admin' &&
              !t.full_name?.toLowerCase().includes('admin')
            );
            setAllTeachers(validTeachers);
        }
        
        if (settingsRes.data) {
            settingsRes.data.forEach(item => {
                if (item.key === 'discipline_types') setDisciplineTypes(item.value ? JSON.parse(item.value) : []);
                if (item.key === 'follow_up_types') setFollowUpTypes(item.value ? JSON.parse(item.value) : []);
                if (item.key === 'activity_types') setActivityTypes(item.value ? JSON.parse(item.value) : []);
            });
        }
        
        const startOfDay = `${todayStr}T00:00:00+07:00`;
        const endOfDay = `${todayStr}T23:59:59+07:00`;

        const { data: journals } = await supabase.from('journals').select('*').gte('created_at', startOfDay).lte('created_at', endOfDay);
        if (journals) setExistingJournals(journals);
        
        const { data: historyJournals } = await supabase.from('journals').select('kelas, subject, material').eq('academic_year', academicYear || '2025/2026').eq('semester', semester || 'Ganjil').gte('created_at', semesterStart ? `${semesterStart}T00:00:00+07:00` : '2000-01-01T00:00:00+07:00').lte('created_at', semesterEnd ? `${semesterEnd}T23:59:59+07:00` : '2100-01-01T23:59:59+07:00').eq('teacher_id', profile.id).lt('created_at', startOfDay).order('created_at', { ascending: false }).limit(50);
        const materialMap: Record<string, string> = {};
        if (historyJournals) { historyJournals.forEach(j => { const key = `${j.kelas}-${j.subject}`; if (!materialMap[key]) materialMap[key] = j.material; }); }
        setLastMaterials(materialMap);

        if (schedules && schedules.length > 0) { setTodaySchedules(schedules); setInputMode('auto'); } else { setInputMode('manual'); }
        let { data: studentData, error: errSt } = await supabase.from('students').select('kelas').eq('academic_year', academicYear || '2025/2026');
        if (errSt && (errSt.code === '42703' || errSt.message?.includes('academic_year'))) {
            const res = await supabase.from('students').select('kelas').eq('academic_year', academicYear || '2025/2026');
            if (academicYear === '2025/2026') studentData = res.data;
            else studentData = [];
        }
        if (studentData) { const unique = Array.from(new Set(studentData.map((s: any) => s.kelas))).sort() as string[]; setAllClasses(unique); }
    } catch (err) { console.error(err); } finally { setInitLoading(false); }
  };

  const handleInvalTeacherSelect = async (teacherId: string) => {
      setSelectedInvalTeacherId(teacherId);
      setFormData({ kelas: '', subject: '', hours: [], material: '', attendance: {}, cleanliness: '', validation: '', notes: '', isConfirmed: false });
      if (!teacherId) {
          setSelectedInvalTeacher(null);
          setInvalTeacherSchedules([]);
          return;
      }
      const teacher = allTeachers.find(t => t.id === teacherId) || null;
      setSelectedInvalTeacher(teacher);
      setInvalLoading(true);

      try {
          const wibDate = getWIBDate();
          const jsDay = wibDate.getDay();
          const dbDay = jsDay === 0 ? 7 : jsDay;

          const { data: schRes } = await supabase.from('schedules')
              .select('*')
              .eq('teacher_id', teacherId)
              .eq('day_of_week', dbDay)
              .eq('academic_year', academicYear || '2025/2026')
              .eq('semester', semester || 'Ganjil')
              .eq('schedule_version', activeScheduleVersion || 'Utama')
              .order('hour');

          setInvalTeacherSchedules(schRes || []);
      } catch (err) {
          console.error("Error fetching inval teacher schedules", err);
      } finally {
          setInvalLoading(false);
      }
  };

  useEffect(() => {
    if (formData.kelas && profile) {
      const loadStudentsAndStats = async () => {
        setLoading(true); 
        let { data: studentsData, error: errSt2 } = await supabase.from('students').select('id, name').eq('academic_year', academicYear || '2025/2026').eq('kelas', formData.kelas).eq('academic_year', academicYear || '2025/2026').order('name');
        if (errSt2 && (errSt2.code === '42703' || errSt2.message?.includes('academic_year'))) {
            const res = await supabase.from('students').select('id, name').eq('academic_year', academicYear || '2025/2026').eq('kelas', formData.kelas).order('name');
            if (academicYear === '2025/2026') studentsData = res.data;
            else studentsData = [];
        }
        if (studentsData) {
            setStudents(studentsData as Student[]);
            setLoading(false); 
            if (!editJournalId) {
                const todayStr = getWIBISOString();
                supabase.from('homeroom_attendance').select('student_id, status').eq('date', todayStr).eq('kelas', formData.kelas).then(({data: hrData}) => {
                    if (hrData && hrData.length > 0) {
                        const initialAttendance: Record<string, any> = {};
                        const locked: string[] = [];
                        hrData.forEach(r => {
                            if (['S', 'I', 'A', 'D'].includes(r.status)) {
                                initialAttendance[r.student_id] = r.status;
                                locked.push(r.student_id);
                            }
                        });
                        setFormData(prev => ({ ...prev, attendance: { ...prev.attendance, ...initialAttendance } }));
                        setLockedAttendance(locked);
                    }
                });
            }
            const studentIds = studentsData.map(s => s.id);
            if (studentIds.length > 0) {
                let query = supabase.from('attendance_logs').select('student_id, status, journal_id, journals!inner(teacher_id, subject)').eq('academic_year', academicYear || '2025/2026').eq('semester', semester || 'Ganjil').gte('created_at', semesterStart ? `${semesterStart}T00:00:00+07:00` : '2000-01-01T00:00:00+07:00').lte('created_at', semesterEnd ? `${semesterEnd}T23:59:59+07:00` : '2100-01-01T23:59:59+07:00').eq('schedule_version', activeScheduleVersion || 'Utama').in('status', ['A', 'D']).in('student_id', studentIds).eq('journals.teacher_id', profile.id);
                let { data: recentAtt, error: recError } = await query;
                if (recError && (recError.code === '42703' || recError.message?.includes('academic_year') || recError.message?.includes('semester'))) {
                    const fallbackQuery = supabase.from('attendance_logs').select('student_id, status, journal_id, journals!inner(teacher_id, subject)').in('status', ['A', 'D']).in('student_id', studentIds).eq('journals.teacher_id', profile.id);
                    const res = await fallbackQuery;
                    recentAtt = res.data;
                    recError = res.error;
                }
                if (editJournalId) { query = query.neq('journal_id', editJournalId); }
                if (formData.subject) { query = query.eq('journals.subject', formData.subject); }
                const { data: logs } = await query;
                const stats: Record<string, { A: number, D: number }> = {};
                logs?.forEach((log: any) => { if (!stats[log.student_id]) stats[log.student_id] = { A: 0, D: 0 }; if (log.status === 'A') stats[log.student_id].A += 1; if (log.status === 'D') stats[log.student_id].D += 1; });
                setStudentStats(stats);
            }
        } else { setLoading(false); }
      };
      loadStudentsAndStats();
    }
  }, [formData.kelas, profile?.id]); 

  const handleScheduleSelect = async (scheduleId: string, isFromInval = false) => {
      const scheduleList = isFromInval ? invalTeacherSchedules : todaySchedules;
      const selectedSchedule = scheduleList.find(s => s.id === scheduleId);
      if (!selectedSchedule) return;
      const existing = existingJournals.find(j => j.kelas === selectedSchedule.kelas && j.subject === selectedSchedule.subject);
      if (existing) {
          setEditJournalId(existing.id);
          const [logsRes, notesRes] = await Promise.all([ supabase.from('attendance_logs').select('student_id, status').eq('academic_year', academicYear || '2025/2026').eq('semester', semester || 'Ganjil').gte('created_at', semesterStart ? `${semesterStart}T00:00:00+07:00` : '2000-01-01T00:00:00+07:00').lte('created_at', semesterEnd ? `${semesterEnd}T23:59:59+07:00` : '2100-01-01T23:59:59+07:00').eq('journal_id', existing.id), supabase.from('journal_notes').select('*').eq('academic_year', academicYear || '2025/2026').eq('semester', semester || 'Ganjil').gte('created_at', semesterStart ? `${semesterStart}T00:00:00+07:00` : '2000-01-01T00:00:00+07:00').lte('created_at', semesterEnd ? `${semesterEnd}T23:59:59+07:00` : '2100-01-01T23:59:59+07:00').eq('journal_id', existing.id) ]);
          const attendanceMap: Record<string, 'S'|'I'|'A'|'D'> = {};
          if (logsRes.data) logsRes.data.forEach(l => { attendanceMap[l.student_id] = l.status as any; });
          const loadedNotes = { discipline: [] as NoteItem[], activity: [] as NoteItem[] };
          if (notesRes.data) {
              const discMap: Record<string, string[]> = {}; const actMap: Record<string, string[]> = {};
              notesRes.data.forEach(n => { const key = `${n.category}|${n.follow_up || ''}|${n.note || ''}`; if (n.type === 'kedisiplinan') { if (!discMap[key]) discMap[key] = []; discMap[key].push(n.student_id); } else { if (!actMap[key]) actMap[key] = []; actMap[key].push(n.student_id); } });
              loadedNotes.discipline = Object.entries(discMap).map(([key, studentIds]) => { const [category, followUp, note] = key.split('|'); return { category, followUp, note, studentIds }; });
              loadedNotes.activity = Object.entries(actMap).map(([key, studentIds]) => { const [category, _, note] = key.split('|'); return { category, note, studentIds }; });
          }
          setNotesData(loadedNotes);
          setLockedAttendance([]);
          setFormData({ kelas: existing.kelas, subject: existing.subject, hours: existing.hours.split(',').map(s => s.trim()), material: existing.material, attendance: attendanceMap, cleanliness: existing.cleanliness as any, validation: existing.validation as any, notes: existing.notes || '', isConfirmed: existing.validation === 'hadir_kbm' });
      } else {
          setEditJournalId(null); setNotesData({ discipline: [], activity: [] });
          let hoursParsed: string[] = []; if (selectedSchedule.hour.includes(',')) hoursParsed = selectedSchedule.hour.split(',').map(s => s.trim()); else hoursParsed = [selectedSchedule.hour];
          const isDhuhaSched = isSpecialSubjectDhuha(selectedSchedule.subject); const defaultMaterial = isDhuhaSched ? 'Salat Dhuha' : '';
          const todayStr = getWIBISOString();
          supabase.from('homeroom_attendance').select('student_id, status').eq('date', todayStr).eq('kelas', selectedSchedule.kelas).then(({data}) => { if (data && data.length > 0) { const initialAttendance: Record<string, any> = {}; const locked: string[] = []; data.forEach(r => { if (['S', 'I', 'A', 'D'].includes(r.status)) { initialAttendance[r.student_id] = r.status; locked.push(r.student_id); } }); setFormData(prev => ({...prev, attendance: {...prev.attendance, ...initialAttendance}})); setLockedAttendance(locked); } else { setLockedAttendance([]); } });
          setFormData({ kelas: selectedSchedule.kelas, subject: selectedSchedule.subject, hours: hoursParsed, material: defaultMaterial, attendance: {}, cleanliness: '', validation: isFromInval ? 'inval' : '', notes: '', isConfirmed: false });
      }
  };

  const handleNext = () => setStep(prev => prev + 1);
  const handleBack = () => setStep(prev => prev - 1);
  const handleMaterialChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => { const val = e.target.value; const formatted = smartTitleCase(val); setFormData({...formData, material: formatted}); };
  const addNoteRow = (type: 'discipline' | 'activity') => { setNotesData(prev => ({ ...prev, [type]: [...prev[type], { category: '', studentIds: [], followUp: '', note: '' }] })); };
  const removeNoteRow = (type: 'discipline' | 'activity', index: number) => { setNotesData(prev => ({ ...prev, [type]: prev[type].filter((_, i) => i !== index) })); };
  const updateNoteRow = (type: 'discipline' | 'activity', index: number, field: keyof NoteItem, value: any) => { setNotesData(prev => { const list = [...prev[type]]; list[index] = { ...list[index], [field]: value }; return { ...prev, [type]: list }; }); };
  const handleMissingStudentToggle = (studentId: string) => { setMissingStudents(prev => prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]); };
  const handleFinishAssessment = () => { setShowStudentChecklistModal(false); handleSubmitFinal(missingStudents, assessmentType); };
  const handleDhuhaSubmit = () => {
      // Auto fill cleanliness and validation for Dhuha
      setFormData(prev => ({ ...prev, cleanliness: 'sudah_bersih', isConfirmed: true }));
      // Call handleSubmitFinal directly without assessment
      handleSubmitFinal([], 'none', { cleanliness: 'sudah_bersih', isConfirmed: true });
  };


  const handleSubmitFinal = async (missingIds: string[] = [], type: string = 'none', overrides?: { cleanliness: string, isConfirmed?: boolean }) => {
    setLoading(true);
    try {
      if (!profile) throw new Error("Not authenticated");
      let finalJournalId = editJournalId;
      const validationStatus = inputMode === 'inval' ? 'inval' : 'hadir_kbm'; 
      const invalTeacherName = inputMode === 'inval' ? (selectedInvalTeacher?.full_name || '') : null;
      const missingNames = students.filter(s => missingIds.includes(s.id)).map(s => s.name);
      const payload = { hours: formData.hours.join(','), material: formData.material, cleanliness: (overrides ? overrides.cleanliness : formData.cleanliness), validation: validationStatus, inval_teacher_name: invalTeacherName, notes: formData.notes, assessment_type: type, assessment_missing_students: JSON.stringify(missingNames) };
      if (editJournalId) { 
        let { error } = await supabase.from('journals').update(payload).eq('id', editJournalId); 
        if (error && (error.code === '42703' || error.message?.includes('inval_teacher_name'))) {
          const { inval_teacher_name, ...fallbackPayload } = payload as any;
          const fallbackRes = await supabase.from('journals').update(fallbackPayload).eq('id', editJournalId);
          error = fallbackRes.error;
        }
        if (error) throw error; 
        await supabase.from('attendance_logs').delete().eq('journal_id', editJournalId); 
        await supabase.from('journal_notes').delete().eq('journal_id', editJournalId); 
      } else { 
        let { data: journal, error: journalError } = await supabase.from('journals').insert({ teacher_id: profile.id, kelas: formData.kelas, subject: formData.subject, ...payload, academic_year: academicYear || '2025/2026', semester: semester || 'Ganjil' }).select().single();
        if (journalError && (journalError.code === '42703' || journalError.message?.includes('inval_teacher_name') || journalError.message?.includes('academic_year') || journalError.message?.includes('semester'))) {
            const { inval_teacher_name, academic_year, semester, ...fallbackPayload } = payload as any;
            const fallbackRes = await supabase.from('journals').insert({ teacher_id: profile.id, kelas: formData.kelas, subject: formData.subject, ...fallbackPayload, academic_year: academicYear || '2025/2026', semester: semester || 'Ganjil' }).select().single();
            journal = fallbackRes.data;
            journalError = fallbackRes.error;
            if (journalError && (journalError.code === '42703' || journalError.message?.includes('academic_year') || journalError.message?.includes('semester'))) {
                const retryRes = await supabase.from('journals').insert({ teacher_id: profile.id, kelas: formData.kelas, subject: formData.subject, ...fallbackPayload }).select().single();
                journal = retryRes.data;
                journalError = retryRes.error;
            }
        } if (journalError) throw journalError; finalJournalId = journal.id; }
      if (finalJournalId) {
          const attendanceInserts = Object.entries(formData.attendance).map(([studentId, status]) => { const studentName = students.find(s => s.id === studentId)?.name || 'Unknown'; return { journal_id: finalJournalId, student_id: studentId, student_name: studentName, status: status, teacher_name: profile.full_name, subject: formData.subject, academic_year: academicYear || '2025/2026', semester: semester || 'Ganjil' }; });
          if (attendanceInserts.length > 0) { let { error: attError } = await supabase.from('attendance_logs').insert(attendanceInserts);
          if (attError && (attError.code === '42703' || attError.message?.includes('academic_year') || attError.message?.includes('semester'))) {
              const fallbackAtts = attendanceInserts.map(a => {
                  const { academic_year, semester, ...rest } = a as any;
                  return rest;
              });
              const fallbackRes = await supabase.from('attendance_logs').insert(fallbackAtts);
              attError = fallbackRes.error;
          } if (attError) throw attError; }
          const notesInserts: any[] = [];
          notesData.discipline.forEach(row => { if (row.category && row.studentIds.length > 0) { row.studentIds.forEach(sid => { const sName = students.find(s => s.id === sid)?.name || 'Unknown'; notesInserts.push({ journal_id: finalJournalId, student_id: sid, student_name: sName, type: 'kedisiplinan', category: row.category, follow_up: row.followUp || '', note: row.note || '', academic_year: academicYear || '2025/2026', semester: semester || 'Ganjil' }); }); } });
          notesData.activity.forEach(row => { if (row.category && row.studentIds.length > 0) { row.studentIds.forEach(sid => { const sName = students.find(s => s.id === sid)?.name || 'Unknown'; notesInserts.push({ journal_id: finalJournalId, student_id: sid, student_name: sName, type: 'keaktifan', category: row.category, follow_up: '', note: row.note || '', academic_year: academicYear || '2025/2026', semester: semester || 'Ganjil' }); }); } });
          if (notesInserts.length > 0) { let { error: noteError } = await supabase.from('journal_notes').insert(notesInserts);
          if (noteError && (noteError.code === '42703' || noteError.message?.includes('academic_year') || noteError.message?.includes('semester'))) {
              const fallbackNotes = notesInserts.map(n => {
                  const { academic_year, semester, ...rest } = n as any;
                  return rest;
              });
              const fallbackRes = await supabase.from('journal_notes').insert(fallbackNotes);
              noteError = fallbackRes.error;
          } if (noteError) throw noteError; }
      }
      setAlertState({ isOpen: true, type: 'success', title: editJournalId ? 'Berhasil Diperbarui!' : 'Berhasil Disimpan!', message: 'Data jurnal pembelajaran dan penilaian telah tersimpan.' });
    } catch (err: any) { console.error("Submit Error:", err); setAlertState({ isOpen: true, type: 'error', title: 'Gagal Menyimpan', message: err.message || 'Terjadi kesalahan sistem.' }); } finally { setLoading(false); }
  };

  const handleCloseAlert = () => { setAlertState(prev => ({ ...prev, isOpen: false })); if (alertState.type === 'success') { navigate('/dashboard'); } };

  const MultiSelectDropdown = ({ options, selectedIds, onChange, placeholder }: any) => {
      const [isOpen, setIsOpen] = useState(false); const wrapperRef = useRef<HTMLDivElement>(null);
      useEffect(() => { const handleClickOutside = (event: MouseEvent) => { if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) { setIsOpen(false); } }; document.addEventListener('mousedown', handleClickOutside); return () => document.removeEventListener('mousedown', handleClickOutside); }, []);
      const toggleSelection = (id: string) => { const newSelection = selectedIds.includes(id) ? selectedIds.filter((sid: string) => sid !== id) : [...selectedIds, id]; onChange(newSelection); };
      const selectedNames = options.filter((o: any) => selectedIds.includes(o.id)).map((o: any) => o.name);
      return (
          <div className="relative" ref={wrapperRef}>
              <button type="button" onClick={() => setIsOpen(!isOpen)} className="w-full border border-slate-200 rounded-xl p-3 bg-white text-left flex justify-between items-center focus:ring-2 focus:ring-purple-500"><span className={`truncate text-sm ${selectedIds.length === 0 ? 'text-gray-400' : 'text-slate-700 font-bold'}`}>{selectedIds.length === 0 ? placeholder : `${selectedIds.length} Murid Dipilih`}</span><ChevronDown size={16} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} /></button>
              {isOpen && (<div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto p-1 custom-scrollbar">{options.map((opt: any) => { const isSelected = selectedIds.includes(opt.id); return (<div key={opt.id} onClick={() => toggleSelection(opt.id)} className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-purple-50' : 'hover:bg-gray-50'}`}><div className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${isSelected ? 'bg-purple-600 border-purple-600' : 'bg-white border-slate-300'}`}>{isSelected && <Check size={14} className="text-white" strokeWidth={3} />}</div><span className={`text-sm ${isSelected ? 'text-purple-700 font-bold' : 'text-slate-700'}`}>{opt.name}</span></div>); })}{options.length === 0 && <div className="p-3 text-center text-xs text-gray-400">Tidak ada murid tersedia (Hadir).</div>}</div>)}
              {selectedIds.length > 0 && (<div className="mt-2 flex flex-wrap gap-1">{selectedNames.map((name: string, idx: number) => { const studentId = options.find((o:any) => o.name === name)?.id; return (<span key={idx} className="text-[10px] bg-purple-50 text-purple-700 px-2 py-1 rounded-md border border-purple-100 flex items-center gap-1 font-medium">{name}{studentId && (<button onClick={() => toggleSelection(studentId)} className="hover:bg-purple-100 rounded-full p-0.5"><X size={10} /></button>)}</span>) })}</div>)}
          </div>
      );
  };

  const renderStudentTable = () => (
    <div className="animate-fade-in mt-2">
      {loading ? (
        <div className="text-center py-8 text-slate-500 text-sm flex flex-col items-center">
          <Loader2 className="animate-spin mb-2 text-purple-600" size={24} /> Mengambil data siswa...
        </div>
      ) : (
        <div className="animate-fade-in border rounded-2xl overflow-hidden border-slate-200 bg-white">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <span className="text-sm font-bold text-slate-700">Daftar Murid ({students.length})</span>
            <span className="text-[10px] text-slate-500 bg-white px-2 py-1 rounded border border-slate-200 font-bold whitespace-nowrap">Default: Hadir</span>
          </div>
          <div className="overflow-x-auto w-full">
            <div className="max-h-[500px] overflow-y-auto custom-scrollbar min-w-[320px]">
              <table className="w-full text-sm table-fixed">
                <thead className="bg-white sticky top-0 z-10 shadow-sm">
                  <tr className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-wide">
                    <th className="p-2 sm:p-3 text-left pl-3 sm:pl-4 w-[50%]">Nama / Pekan Lalu</th>
                    {isDhuha ? (
                      <>
                        <th className="p-2 sm:p-3 w-[25%] text-center" title="Tidak Hadir (Alpa)">TH</th>
                        <th className="p-2 sm:p-3 w-[25%] text-center" title="Dispensasi">D</th>
                      </>
                    ) : (
                      <>
                        <th className="p-2 sm:p-3 w-[12.5%] text-center">S</th>
                        <th className="p-2 sm:p-3 w-[12.5%] text-center">I</th>
                        <th className="p-2 sm:p-3 w-[12.5%] text-center">A</th>
                        <th className="p-2 sm:p-3 w-[12.5%] text-center">D</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map(student => {
                    const currentStatus = formData.attendance[student.id];
                    let prevStatusDisplay = 'H';
                    let prevStatusColor = 'bg-green-100 text-green-700 border-green-200';

                    if (currentStatus) {
                      if (currentStatus === 'S') { prevStatusDisplay = 'S'; prevStatusColor = 'bg-yellow-100 text-yellow-700 border-yellow-200'; }
                      else if (currentStatus === 'I') { prevStatusDisplay = 'I'; prevStatusColor = 'bg-purple-100 text-purple-700 border-purple-200'; }
                      else if (currentStatus === 'A') { prevStatusDisplay = 'A'; prevStatusColor = 'bg-red-100 text-red-700 border-red-200'; }
                      else if (currentStatus === 'D') { prevStatusDisplay = 'D'; prevStatusColor = 'bg-purple-100 text-purple-700 border-purple-200'; }
                    } else if (hasPrevMeeting) {
                      const rawStatus = prevMeetingStats[student.id];
                      if (!rawStatus) { prevStatusDisplay = 'H'; prevStatusColor = 'bg-green-100 text-green-700 border-green-200'; } 
                      else if (rawStatus === 'D') { prevStatusDisplay = 'D'; prevStatusColor = 'bg-purple-100 text-purple-700 border-purple-200'; } 
                      else if (isDhuha && ['S', 'I', 'A'].includes(rawStatus)) { prevStatusDisplay = 'TH'; prevStatusColor = 'bg-red-100 text-red-700 border-red-200'; } 
                      else { 
                        prevStatusDisplay = rawStatus; 
                        if (rawStatus === 'S') prevStatusColor = 'bg-yellow-100 text-yellow-700 border-yellow-200'; 
                        else if (rawStatus === 'I') prevStatusColor = 'bg-purple-100 text-purple-700 border-purple-200'; 
                        else if (rawStatus === 'A') prevStatusColor = 'bg-red-100 text-red-700 border-red-200'; 
                      }
                    }
                    const stats = studentStats[student.id] || { A: 0, D: 0 };
                    return (
                      <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-2 sm:p-3 pl-3 sm:pl-4 overflow-hidden">
                          <div className="font-bold text-slate-700 text-xs sm:text-sm truncate w-full flex items-center gap-1" title={student.name}>
                            {student.name}
                            {lockedAttendance.includes(student.id) ? (
                              <button
                                type="button"
                                onClick={() => toggleLockStudent(student.id)}
                                title="Diisi & dikunci oleh Wali Kelas / Operator. Klik untuk membuka kunci jika murid sebenarnya Hadir"
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/50 dark:text-amber-200 px-1.5 py-0.5 rounded-md border border-amber-300 transition-colors cursor-pointer"
                              >
                                <Lock size={11} />
                                <span>Terkunci (Klik u/ Buka)</span>
                              </button>
                            ) : null}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            {stats.A > 0 && <span className="text-red-600 text-[10px] font-extrabold bg-red-50 px-1.5 py-0.5 rounded border border-red-100 whitespace-nowrap">A: {stats.A}</span>}
                            {isDhuha && stats.D > 0 && <span className="text-purple-600 text-[10px] font-extrabold bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100 whitespace-nowrap">D: {stats.D}</span>}
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${prevStatusColor} whitespace-nowrap`}>{prevStatusDisplay}</span>
                          </div>
                        </td>
                        {isDhuha ? (
                          <>
                            <td className="p-1 sm:p-2 text-center align-middle">
                              <div className="flex justify-center">
                                <input type="checkbox" className="w-4 h-4 sm:w-5 sm:h-5 rounded border-2 border-slate-300 focus:ring-0 cursor-pointer text-red-500 focus:ring-red-500 checked:bg-red-500 checked:border-red-500 disabled:opacity-50 disabled:cursor-not-allowed" disabled={lockedAttendance.includes(student.id)} checked={formData.attendance[student.id] === 'A'} onChange={() => { const newAtt = {...formData.attendance}; if (newAtt[student.id] === 'A') delete newAtt[student.id]; else newAtt[student.id] = 'A'; setFormData({...formData, attendance: newAtt}); }} />
                              </div>
                            </td>
                            <td className="p-1 sm:p-2 text-center align-middle">
                              <div className="flex justify-center">
                                <input type="checkbox" className="w-4 h-4 sm:w-5 sm:h-5 rounded border-2 border-slate-300 focus:ring-0 cursor-pointer text-purple-500 focus:ring-purple-500 checked:bg-purple-500 checked:border-purple-500 disabled:opacity-50 disabled:cursor-not-allowed" disabled={lockedAttendance.includes(student.id)} checked={formData.attendance[student.id] === 'D'} onChange={() => { const newAtt = {...formData.attendance}; if (newAtt[student.id] === 'D') delete newAtt[student.id]; else newAtt[student.id] = 'D'; setFormData({...formData, attendance: newAtt}); }} />
                              </div>
                            </td>
                          </>
                        ) : (
                          (['S', 'I', 'A', 'D'] as const).map(status => (
                            <td key={status} className="p-1 sm:p-2 text-center align-middle">
                              <div className="flex justify-center">
                                <input 
                                  type="checkbox" 
                                  disabled={lockedAttendance.includes(student.id)}
                                  className={`w-4 h-4 sm:w-5 sm:h-5 rounded border-2 border-slate-300 focus:ring-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${status === 'S' ? 'text-yellow-400 focus:ring-yellow-400 checked:bg-yellow-400 checked:border-yellow-400' : status === 'I' ? 'text-purple-400 focus:ring-purple-400 checked:bg-purple-400 checked:border-purple-400' : status === 'A' ? 'text-red-400 focus:ring-red-400 checked:bg-red-400 checked:border-red-400' : 'text-purple-400 focus:ring-purple-400 checked:bg-purple-400 checked:border-purple-400'}`} 
                                  checked={formData.attendance[student.id] === status} 
                                  onChange={() => { const newAtt = {...formData.attendance}; if (newAtt[student.id] === status) delete newAtt[student.id]; else newAtt[student.id] = status as any; setFormData({...formData, attendance: newAtt}); }} 
                                />
                              </div>
                            </td>
                          ))
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderStep1 = () => (
    <div className="bg-white dark:bg-slate-800 rounded-3xl p-4 md:p-6 shadow-sm border border-slate-200 dark:border-slate-700 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <div>
          <h3 className="font-extrabold text-lg text-slate-800 dark:text-white">Presensi Murid</h3>
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-0.5">Pilih kelas & tandai murid yang tidak hadir.</p>
        </div>
        <div className="flex bg-slate-100 dark:bg-slate-700/60 p-1 rounded-2xl w-full sm:w-auto border border-slate-200 dark:border-slate-600">
          <button
            type="button"
            onClick={() => {
              setInputMode('auto');
              setEditJournalId(null);
              setSelectedInvalTeacherId('');
              setInvalTeacherSchedules([]);
              setFormData({ kelas: '', subject: '', hours: [], material: '', attendance: {}, cleanliness: '', validation: '', notes: '', isConfirmed: false });
            }}
            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
              inputMode === 'auto'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Clock size={14} /> Jadwal Saya
          </button>
          <button
            type="button"
            onClick={() => {
              setInputMode('inval');
              setEditJournalId(null);
              setFormData({ kelas: '', subject: '', hours: [], material: '', attendance: {}, cleanliness: '', validation: '', notes: '', isConfirmed: false });
            }}
            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
              inputMode === 'inval'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <UserCheck size={14} /> Inval Guru
          </button>
          <button
            type="button"
            onClick={() => {
              setInputMode('manual');
              setEditJournalId(null);
              setSelectedInvalTeacherId('');
              setInvalTeacherSchedules([]);
              setFormData({ kelas: '', subject: '', hours: [], material: '', attendance: {}, cleanliness: '', validation: '', notes: '', isConfirmed: false });
            }}
            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
              inputMode === 'manual'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Edit3 size={14} /> Manual
          </button>
        </div>
      </div>

      <div className="mb-6 space-y-4">
        {/* MODE 1: JADWAL SAYA */}
        {inputMode === 'auto' && (
          todaySchedules.length > 0 ? (
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Pilih Jadwal Mengajar Hari Ini</label>
              <div className="grid gap-3">
                {todaySchedules.map(sch => {
                  const filled = existingJournals.some(j => j.kelas === sch.kelas && j.subject === sch.subject);
                  const isSelected = formData.kelas === sch.kelas && formData.subject === sch.subject;
                  const materialText = filled
                    ? (existingJournals.find(j => j.kelas === sch.kelas && j.subject === sch.subject)?.material || '-')
                    : (lastMaterials[`${sch.kelas}-${sch.subject}`] || 'Belum ada data materi sebelumnya.');
                  
                  return (
                    <React.Fragment key={sch.id}>
                      <div
                        onClick={() => handleScheduleSelect(sch.id)}
                        className={`p-4 rounded-2xl border-2 transition-all flex flex-col gap-2 relative cursor-pointer ${isSelected
                          ? (filled ? 'border-green-500 bg-green-50 shadow-md ring-1 ring-green-500' : 'border-purple-600 bg-purple-50 shadow-md ring-1 ring-purple-500')
                          : (filled ? 'border-green-100 bg-green-50/20 opacity-80' : 'border-slate-100 hover:border-purple-200 bg-white hover:bg-slate-50')}`}
                      >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white text-base shadow-sm ${filled ? 'bg-green-500' : (isSelected ? 'bg-purple-600' : 'bg-slate-400')}`}>{sch.kelas}</div>
                                <div>
                                    <p className="font-bold text-slate-800 text-sm">{sch.subject}</p>
                                    <p className="text-xs text-slate-500 flex items-center gap-1 font-medium mt-0.5"><Clock size={12}/> Jam ke-{sch.hour}</p>
                                </div>
                            </div>
                            {filled ? (
                                <div className="flex items-center gap-1 text-green-700 text-[10px] font-bold bg-white px-2 py-1 rounded-lg border border-green-200"><Check size={12} strokeWidth={3} /> {isSelected ? 'DIEDIT' : 'SELESAI'}</div>
                            ) : isSelected && (
                                <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center text-white"><Check size={14} strokeWidth={3} /></div>
                            )}
                        </div>
                        <div className="mt-1 pt-2 border-t border-slate-200/50 flex items-start gap-2">
                            <History size={14} className="text-slate-400 mt-0.5 flex-shrink-0"/>
                            <div className="text-xs">
                                <span className="font-bold text-slate-500 block mb-0.5">{filled ? "Materi Hari Ini:" : "Materi Terakhir:"}</span>
                                <p className="text-slate-600 line-clamp-1">"{materialText}"</p>
                            </div>
                        </div>
                      </div>
                      {isSelected && renderStudentTable()}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-10 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center">
              <Clock size={48} className="text-slate-300 mb-3" />
              <p className="text-slate-500 font-bold">Tidak ada jadwal mengajar Anda hari ini.</p>
              <p className="text-xs text-slate-400">Pilih "Inval Guru" jika menggantikan guru piket atau "Manual" untuk jadwal bebas.</p>
            </div>
          )
        )}

        {/* MODE 2: INVAL GURU */}
        {inputMode === 'inval' && (
          <div className="space-y-4">
            <div className="bg-purple-50/80 dark:bg-purple-950/30 p-4 rounded-2xl border border-purple-200 dark:border-purple-800">
              <label className="block text-xs font-extrabold text-purple-900 dark:text-purple-300 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <UserCheck size={16} className="text-purple-600 dark:text-purple-400" />
                Pilih Guru Yang Digantikan (Tidak Hadir)
              </label>
              <select
                className="w-full p-3 rounded-xl border border-purple-200 dark:border-purple-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold text-sm focus:ring-2 focus:ring-purple-500 shadow-sm"
                value={selectedInvalTeacherId}
                onChange={(e) => handleInvalTeacherSelect(e.target.value)}
              >
                <option value="">-- Pilih Nama Guru --</option>
                {allTeachers
                  .filter(t => 
                    t.id !== profile?.id && 
                    (t.role as string) !== 'admin' && 
                    (t.role as string) !== 'administrator' && 
                    t.role?.toLowerCase() !== 'admin' &&
                    !t.full_name?.toLowerCase().includes('admin')
                  )
                  .map(t => (
                    <option key={t.id} value={t.id}>
                      {t.full_name} {t.nip ? `(NIP: ${t.nip})` : ''}
                    </option>
                  ))}
              </select>
            </div>

            {selectedInvalTeacherId && (
              <div>
                {invalLoading ? (
                  <div className="text-center py-8 text-slate-500 text-sm flex flex-col items-center">
                    <Loader2 className="animate-spin mb-2 text-purple-600" size={24} /> Mengambil jadwal mengajar...
                  </div>
                ) : invalTeacherSchedules.length > 0 ? (
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center justify-between">
                      <span>Jadwal Mengajar ({selectedInvalTeacher?.full_name})</span>
                      <span className="text-[10px] bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full font-extrabold">MODE INVAL</span>
                    </label>
                    <div className="grid gap-3">
                      {invalTeacherSchedules.map(sch => {
                        const filled = existingJournals.some(j => j.kelas === sch.kelas && j.subject === sch.subject);
                        const isSelected = formData.kelas === sch.kelas && formData.subject === sch.subject;
                        const materialText = filled
                          ? (existingJournals.find(j => j.kelas === sch.kelas && j.subject === sch.subject)?.material || '-')
                          : (lastMaterials[`${sch.kelas}-${sch.subject}`] || 'Belum ada data materi sebelumnya.');

                        return (
                          <React.Fragment key={sch.id}>
                            <div
                              onClick={() => handleScheduleSelect(sch.id, true)}
                              className={`p-4 rounded-2xl border-2 transition-all flex flex-col gap-2 relative cursor-pointer ${
                                isSelected
                                  ? (filled ? 'border-green-500 bg-green-50 shadow-md ring-1 ring-green-500' : 'border-purple-600 bg-purple-50 shadow-md ring-1 ring-purple-500')
                                  : (filled ? 'border-green-100 bg-green-50/20 opacity-80' : 'border-slate-100 hover:border-purple-200 bg-white hover:bg-slate-50')
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white text-base shadow-sm ${filled ? 'bg-green-500' : (isSelected ? 'bg-purple-600' : 'bg-amber-500')}`}>
                                    {sch.kelas}
                                  </div>
                                  <div>
                                    <p className="font-bold text-slate-800 text-sm">{sch.subject}</p>
                                    <p className="text-xs text-slate-500 flex items-center gap-1 font-medium mt-0.5">
                                      <Clock size={12} /> Jam ke-{sch.hour}
                                    </p>
                                  </div>
                                </div>
                                {filled ? (
                                  <div className="flex items-center gap-1 text-green-700 text-[10px] font-bold bg-white px-2 py-1 rounded-lg border border-green-200">
                                    <Check size={12} strokeWidth={3} /> {isSelected ? 'DIEDIT' : 'SELESAI'}
                                  </div>
                                ) : isSelected && (
                                  <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center text-white">
                                    <Check size={14} strokeWidth={3} />
                                  </div>
                                )}
                              </div>
                              <div className="mt-1 pt-2 border-t border-slate-200/50 flex items-start gap-2">
                                <History size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
                                <div className="text-xs">
                                  <span className="font-bold text-slate-500 block mb-0.5">
                                    {filled ? "Materi Hari Ini:" : "Materi Terakhir:"}
                                  </span>
                                  <p className="text-slate-600 line-clamp-1">"{materialText}"</p>
                                </div>
                              </div>
                            </div>
                            {isSelected && renderStudentTable()}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="p-8 border-2 border-dashed border-purple-200 rounded-2xl text-center bg-purple-50/40">
                    <UserX size={40} className="text-purple-300 mx-auto mb-2" />
                    <p className="text-slate-700 font-bold text-sm">Tidak ada jadwal mengajar hari ini untuk guru ini.</p>
                    <p className="text-xs text-slate-500 mt-1">Silahkan pilih nama guru lain yang berhalangan hadir.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* MODE 3: MANUAL */}
        {inputMode === 'manual' && (
          <div className="p-6 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 space-y-4">
            <p className="font-bold text-slate-700 text-sm">Input Data Kelas Secara Manual</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Kelas</label>
                <select className="w-full border p-3 rounded-xl bg-white font-bold text-sm" value={formData.kelas} onChange={(e) => { setFormData({...formData, kelas: e.target.value}); }}>
                  <option value="">- Pilih Kelas -</option>
                  {allClasses.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Mata Pelajaran</label>
                <input 
                  type="text" 
                  className="w-full border p-3 rounded-xl bg-white font-bold text-sm" 
                  placeholder="Contoh: Matematika" 
                  value={formData.subject} 
                  onChange={(e) => setFormData({...formData, subject: e.target.value})}
                />
              </div>
            </div>
            {formData.kelas && renderStudentTable()}
          </div>
        )}
      </div>

      <div className="flex justify-end mt-8 pt-6 border-t border-slate-100 text-center" style={{ textAlign: 'center' }}>
        <button disabled={!formData.kelas} onClick={handleNext} className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-purple-200 disabled:opacity-50 disabled:shadow-none transition-all">
          Lanjut <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );

  const renderStep2 = () => (<div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 animate-fade-in"><div className="flex justify-between items-center mb-6"><h3 className="font-extrabold text-lg text-slate-800 dark:text-white">Detail Pembelajaran</h3>{inputMode === 'auto' && <span className="bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-[10px] font-bold border border-purple-100">JADWAL SAYA</span>}{inputMode === 'inval' && <span className="bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300 px-3 py-1 rounded-full text-[10px] font-bold border border-purple-300">INVAL GURU ({selectedInvalTeacher?.full_name || 'Guru'})</span>}</div><div className="space-y-6"><div><label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Mata Pelajaran</label><input type="text" className="w-full border border-slate-200 rounded-xl p-3.5 bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-bold text-slate-700" value={formData.subject} readOnly={inputMode === 'auto' || inputMode === 'inval'} onChange={e => setFormData({...formData, subject: e.target.value})} placeholder="Contoh: Matematika"/></div><div><label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Jam Pelajaran Ke-</label><div className="flex gap-2 flex-wrap">{[1,2,3,4,5,6,7,8,9,10].map(h => (<label key={h} className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm border-2 cursor-pointer transition-all ${formData.hours.includes(String(h)) ? 'bg-purple-600 text-white border-purple-600 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:border-purple-300 hover:text-purple-600'}`}><input type="checkbox" className="hidden" value={h} disabled={inputMode === 'auto' || inputMode === 'inval'} checked={formData.hours.includes(String(h))} onChange={() => { const val = String(h); let newHours = [...formData.hours]; if (newHours.includes(val)) newHours = newHours.filter(x => x !== val); else newHours.push(val); setFormData({...formData, hours: newHours.sort()}); }} />{h}</label>))}</div></div><div><label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Materi / Topik Bahasan</label><textarea className="w-full border border-slate-200 rounded-xl p-4 min-h-[140px] focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-slate-700 font-medium leading-relaxed bg-white" value={formData.material} onChange={handleMaterialChange} placeholder="Tuliskan ringkasan materi yang diajarkan hari ini..."></textarea>{isDhuha && <p className="text-[10px] text-green-600 mt-1 font-bold flex items-center gap-1"><Sparkles size={10}/> Materi otomatis terisi untuk Salat Dhuha.</p>}<p className="text-[10px] text-gray-400 mt-1 italic">*Teks akan otomatis diformat kapital di awal kata (kecuali kata sambung).</p></div></div><div className="flex justify-between mt-8 pt-6 border-t border-slate-100"><button onClick={handleBack} className="text-slate-500 hover:bg-slate-50 px-5 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors"><ArrowLeft size={18} /> Kembali</button><button disabled={!formData.subject || !formData.material || loading} onClick={isDhuha ? handleDhuhaSubmit : handleNext} className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-purple-200 disabled:opacity-50 disabled:shadow-none transition-all">{isDhuha ? (loading ? 'Mengirim...' : 'Kirim Data') : 'Lanjut'} {isDhuha ? <Check size={18} /> : <ArrowRight size={18} />}</button></div></div>);

  const renderStep3 = () => { const presentStudents = students.filter(s => !formData.attendance[s.id]); return (<div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 animate-fade-in"><h3 className="font-extrabold text-lg text-slate-800 dark:text-white mb-4">Catatan Murid</h3><div className="mb-8"><div className="flex justify-between items-center mb-3"><h4 className="font-bold text-gray-700 dark:text-gray-300 text-sm">Catatan Kedisiplinan</h4></div><div className="space-y-3">{notesData.discipline.map((row, idx) => (<div key={idx} className="flex flex-col gap-3 p-4 border border-slate-200 rounded-xl bg-slate-50 relative"><div className="flex flex-col md:flex-row gap-3"><div className="w-full md:w-1/2"><label className="block text-[10px] font-bold text-slate-500 mb-1">Jenis Pelanggaran</label><select className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-sm" value={row.category} onChange={e => updateNoteRow('discipline', idx, 'category', e.target.value)}><option value="">-- Pilih Jenis --</option>{disciplineTypes.map((t, i) => <option key={i} value={t}>{t}</option>)}</select></div><div className="w-full md:w-1/2"><label className="block text-[10px] font-bold text-slate-500 mb-1 flex items-center gap-1"><Gavel size={10}/> Tindak Lanjut</label><select className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-sm" value={row.followUp || ''} onChange={e => updateNoteRow('discipline', idx, 'followUp', e.target.value)}><option value="">-- Pilih Tindakan --</option>{followUpTypes.map((t, i) => <option key={i} value={t}>{t}</option>)}</select></div></div><div><label className="block text-[10px] font-bold text-slate-500 mb-1">Keterangan / Catatan Kejadian</label><input type="text" className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-purple-500" placeholder="Contoh: Siswa tidur saat jam pelajaran berlangsung..." value={row.note || ''} onChange={e => updateNoteRow('discipline', idx, 'note', e.target.value)}/></div><div className="w-full"><label className="block text-[10px] font-bold text-slate-500 mb-1">Murid Terlibat</label><MultiSelectDropdown options={presentStudents} selectedIds={row.studentIds} onChange={(ids: string[]) => updateNoteRow('discipline', idx, 'studentIds', ids)} placeholder="Pilih Murid (Hadir)"/></div><button onClick={() => removeNoteRow('discipline', idx)} className="absolute top-2 right-2 p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button></div>))}<button onClick={() => addNoteRow('discipline')} className="text-purple-600 text-xs font-bold flex items-center gap-1 hover:underline"><Plus size={14}/> Tambah Catatan Kedisiplinan</button></div></div><div className="mb-6"><div className="flex justify-between items-center mb-3"><h4 className="font-bold text-gray-700 dark:text-gray-300 text-sm">Catatan Keaktifan</h4></div><div className="space-y-3">{notesData.activity.map((row, idx) => (<div key={idx} className="flex flex-col gap-3 p-4 border border-slate-200 rounded-xl bg-slate-50 relative"><div className="flex flex-col md:flex-row gap-3"><div className="w-full"><label className="block text-[10px] font-bold text-slate-500 mb-1">Jenis Keaktifan</label><select className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-sm" value={row.category} onChange={e => updateNoteRow('activity', idx, 'category', e.target.value)}><option value="">-- Pilih Jenis --</option>{activityTypes.map((t, i) => <option key={i} value={t}>{t}</option>)}</select></div></div><div><label className="block text-[10px] font-bold text-slate-500 mb-1">Keterangan (Opsional)</label><input type="text" className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-green-500" placeholder="Contoh: Menjawab pertanyaan dengan benar..." value={row.note || ''} onChange={e => updateNoteRow('activity', idx, 'note', e.target.value)}/></div><div className="w-full"><label className="block text-[10px] font-bold text-slate-500 mb-1">Murid Terlibat</label><MultiSelectDropdown options={presentStudents} selectedIds={row.studentIds} onChange={(ids: string[]) => updateNoteRow('activity', idx, 'studentIds', ids)} placeholder="Pilih Murid (Hadir)"/></div><button onClick={() => removeNoteRow('activity', idx)} className="absolute top-2 right-2 p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button></div>))}<button onClick={() => addNoteRow('activity')} className="text-green-600 text-xs font-bold flex items-center gap-1 hover:underline"><Plus size={14}/> Tambah Catatan Keaktifan</button></div></div><div className="flex justify-between mt-8 pt-6 border-t border-slate-100"><button onClick={handleBack} className="text-slate-500 hover:bg-slate-50 px-5 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors"><ArrowLeft size={18} /> Kembali</button><button onClick={handleNext} className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-purple-200 disabled:opacity-50 transition-all">Lanjut <ArrowRight size={18} /></button></div></div>); };

  const renderStep4 = () => {
    const noteCount = [...notesData.discipline, ...notesData.activity].reduce((acc, row) => acc + row.studentIds.length, 0);
    return (
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 animate-fade-in">
        <h3 className="font-extrabold text-lg text-slate-800 dark:text-white mb-1">Validasi Akhir</h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">Konfirmasi status kelas sebelum mengirim laporan.</p>
        <div className="space-y-6">
          <div className="bg-slate-50 dark:bg-slate-700/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-600">
            <ul className="text-sm space-y-2 text-slate-700 dark:text-slate-300">
              {inputMode === 'inval' && (
                <li className="flex">
                  <span className="font-bold text-slate-400 w-24 flex-shrink-0">Status Jurnal</span>
                  <span className="font-extrabold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/40 px-2 py-0.5 rounded text-xs border border-purple-200">
                    INVAL (Menggantikan {selectedInvalTeacher?.full_name || 'Guru Piket'})
                  </span>
                </li>
              )}
              <li className="flex"><span className="font-bold text-slate-400 w-24 flex-shrink-0">Mapel</span> <span className="font-bold">: {formData.subject}</span></li>
              <li className="flex"><span className="font-bold text-slate-400 w-24 flex-shrink-0">Kelas</span> <span className="font-bold">: {formData.kelas}</span></li>
              <li className="flex"><span className="font-bold text-slate-400 w-24 flex-shrink-0">Jam Ke</span> <span className="font-bold">: {formData.hours.join(', ')}</span></li>
              <li className="flex"><span className="font-bold text-slate-400 w-24 flex-shrink-0">Absen</span> <span className="font-extrabold text-red-500 bg-red-50 dark:bg-red-900/30 px-2 rounded">: {Object.keys(formData.attendance).length} Murid</span></li>
              <li className="flex"><span className="font-bold text-slate-400 w-24 flex-shrink-0">Catatan</span> <span className="font-bold">: {noteCount} Murid</span></li>
            </ul>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-3 uppercase tracking-wide">Kondisi Kebersihan Kelas</label>
            <div className="grid grid-cols-2 gap-4">
              <label className={`cursor-pointer border-2 rounded-2xl p-4 flex flex-col items-center gap-3 transition-all ${formData.cleanliness === 'mengarahkan_piket' ? 'border-orange-400 bg-orange-50 text-orange-700 shadow-md' : 'border-slate-100 hover:border-orange-200 bg-white text-slate-500'}`}>
                <input type="radio" name="cleanliness" value="mengarahkan_piket" className="hidden" checked={formData.cleanliness === 'mengarahkan_piket'} onChange={e => setFormData({...formData, cleanliness: e.target.value})} />
                <Sparkles size={28} />
                <span className="text-xs font-bold text-center">Perlu Dibersihkan</span>
              </label>
              <label className={`cursor-pointer border-2 rounded-2xl p-4 flex flex-col items-center gap-3 transition-all ${formData.cleanliness === 'sudah_bersih' ? 'border-green-500 bg-green-50 text-green-700 shadow-md' : 'border-slate-100 hover:border-green-200 bg-white text-slate-500'}`}>
                <input type="radio" name="cleanliness" value="sudah_bersih" className="hidden" checked={formData.cleanliness === 'sudah_bersih'} onChange={e => setFormData({...formData, cleanliness: e.target.value})} />
                <CheckCircle2 size={28} />
                <span className="text-xs font-bold text-center">Sudah Bersih</span>
              </label>
            </div>
          </div>
          <div>
            <label className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide"><MessageSquare size={14}/> Catatan Tambahan (Opsional)</label>
            <textarea className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500" rows={2} value={formData.notes} onChange={e => setFormData(prev => ({...prev, notes: e.target.value}))} placeholder="Catatan kejadian khusus..."></textarea>
          </div>
        </div>
        <div className="flex justify-between mt-8 pt-6 border-t border-slate-100">
          <button onClick={handleBack} className="text-slate-500 hover:bg-slate-50 px-5 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors"><ArrowLeft size={18} /> Kembali</button>
          <button disabled={!formData.cleanliness || loading} onClick={() => handleSubmitFinal([], 'none')} className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-purple-200 disabled:opacity-50 disabled:shadow-none transition-all">{loading ? 'Menyimpan...' : (editJournalId ? <><Edit3 size={18} /> Update Jurnal</> : <><Send size={18} /> Kirim Data</>)}</button>
        </div>
      </div>
    );
  };

  const getPresentStudents = () => students.filter(s => !formData.attendance[s.id]);

  return (
    <Layout>
      <div className="max-w-xl mx-auto pb-24">
        <div className="flex justify-between items-center mb-8 px-2">
            <div><h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">{editJournalId ? 'Edit Jurnal' : 'Isi Jurnal KBM'}</h2><p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-1">Langkah {step} dari 4</p></div>
            <div className="flex gap-2">{[1,2,3,4].map(i => <div key={i} className={`h-2 rounded-full transition-all duration-500 ${step >= i ? 'bg-purple-600 w-8' : 'bg-slate-200 w-3'}`}></div>)}</div>
        </div>
        {initLoading ? <div className="text-center py-20 text-slate-400"><Loader2 className="animate-spin inline mr-2"/> Memuat data...</div> : <>{step === 1 && renderStep1()}{step === 2 && renderStep2()}{step === 3 && renderStep3()}{step === 4 && renderStep4()}</>}

        {/* MODAL 2: PILIH SISWA TIDAK MENGUMPULKAN - TOP ALIGNED */}
        {showStudentChecklistModal && (
            <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[calc(env(safe-area-inset-top)+1rem)] sm:p-4 bg-slate-900/50 backdrop-blur-sm transition-all duration-300">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform scale-100 transition-all border border-slate-100 relative animate-fade-in flex flex-col max-h-[85vh]">
                    <div className="bg-orange-600 p-5 flex justify-between items-center text-white flex-shrink-0">
                        <h3 className="font-bold text-lg flex items-center gap-2"><ClipboardList size={20}/> Siswa Belum Tuntas/Mengumpulkan</h3>
                        <button onClick={() => setShowStudentChecklistModal(false)} className="hover:bg-white/20 p-1.5 rounded-full transition-colors"><X size={20}/></button>
                    </div>
                    <div className="p-4 bg-orange-50 border-b border-orange-100 flex-shrink-0">
                        <p className="text-xs text-orange-800 font-bold">Centang siswa yang TIDAK mengumpulkan tugas / Remidi.</p>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 custom-scrollbar bg-white">
                        {getPresentStudents().map(s => (
                            <div key={s.id} onClick={() => handleMissingStudentToggle(s.id)} className={`flex items-center justify-between p-3 mb-1 rounded-xl cursor-pointer transition-all border ${missingStudents.includes(s.id) ? 'bg-red-50 border-red-200' : 'bg-white border-slate-100 hover:bg-slate-50'}`}>
                                <span className={`text-sm font-bold ${missingStudents.includes(s.id) ? 'text-red-700' : 'text-slate-700'}`}>{s.name}</span>
                                <div className={`w-6 h-6 rounded-md flex items-center justify-center border transition-all ${missingStudents.includes(s.id) ? 'bg-red-500 border-red-500 text-white' : 'border-slate-300 bg-white'}`}>
                                    {missingStudents.includes(s.id) && <Check size={16} strokeWidth={3} />}
                                </div>
                            </div>
                        ))}
                        {getPresentStudents().length === 0 && <div className="text-center p-8 text-slate-400 italic text-sm">Semua siswa tidak hadir.</div>}
                    </div>
                    <div className="p-4 border-t border-slate-100 bg-gray-50 flex justify-end flex-shrink-0">
                        <button onClick={handleFinishAssessment} disabled={loading} className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg disabled:opacity-50">
                            {loading ? <Loader2 className="animate-spin" size={18}/> : <CheckCircle2 size={18}/>} 
                            Selesai & Simpan
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* ALERT NOTIFICATION */}
        {alertState.isOpen && (
            <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-fade-in">
                <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center transform scale-100 transition-all border border-slate-100 relative overflow-hidden">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${alertState.type === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                        {alertState.type === 'success' ? <CheckCircle2 size={32} /> : <XCircle size={32} />}
                    </div>
                    <h3 className="text-xl font-extrabold text-slate-800 mb-2">{alertState.title}</h3>
                    <p className="text-sm text-slate-500 mb-6 font-medium leading-relaxed">{alertState.message}</p>
                    <button onClick={handleCloseAlert} className={`w-full py-3 rounded-xl font-bold text-white shadow-lg transition-all ${alertState.type === 'success' ? 'bg-green-600 hover:bg-green-700 shadow-green-200' : 'bg-red-600 hover:bg-red-700 shadow-red-200'}`}>
                        Tutup
                    </button>
                </div>
            </div>
        )}

      </div>
    </Layout>
  );
};

export default JurnalForm;