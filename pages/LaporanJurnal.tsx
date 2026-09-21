import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
    Printer, Trash2, Edit3, Search, Filter, RefreshCw, X, 
    AlertTriangle, BookOpen, CheckSquare, Square, Calendar, Check, 
    Loader2, User, Sparkles, ChevronDown, CheckCircle2,
    Eye, Info, Clock, AlertCircle, Users, UserCheck, CheckCheck,
    CalendarOff
} from 'lucide-react';
import { Student } from '../types';
import { formatDateIndo, formatDateSignature, getWIBISOString } from '../utils/dateUtils';
import { isOfficialTeacher } from '../utils/teacherUtils';

const CLASS_OPTIONS = [
    '7A', '7B', '7C', '7D', '7E', '7F', '7G', '7H',
    '8A', '8B', '8C', '8D', '8E', '8F', '8G', '8H',
    '9A', '9B', '9C', '9D', '9E', '9F', '9G', '9H'
];

interface JournalItem {
    id: string;
    created_at: string;
    teacher_id: string;
    academic_year?: string;
    semester?: string;
    kelas: string;
    subject: string;
    hours: string;
    material: string;
    cleanliness: 'sudah_bersih' | 'perlu_dibersihkan' | string;
    validation: string;
    inval_teacher_name?: string;
    notes?: string;
    teacher_name?: string;
    teacher_nip?: string;
    is_unfilled?: boolean;
    is_out_of_schedule?: boolean;
    is_holiday?: boolean;
    holiday_reason?: string;
    attendance_logs?: {
        id: string;
        student_id: string;
        student_name: string;
        status: 'S' | 'I' | 'A' | 'D' | 'H';
    }[];
    journal_notes?: {
        id: string;
        student_name: string;
        type: string;
        category: string;
        note: string;
    }[];
}

interface ScheduleItem {
    id: string;
    teacher_id: string;
    kelas: string;
    subject: string;
    day_of_week: number;
    hour: string | number;
    academic_year?: string;
    semester?: string;
    teacher_name?: string;
    teacher_nip?: string;
}

export const LaporanJurnal: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
    const { profile, isAdmin, isOperator, academicYear, semester } = useAuth();
    const [loading, setLoading] = useState(false);
    const [journals, setJournals] = useState<JournalItem[]>([]);
    const [teachersList, setTeachersList] = useState<{ id: string; full_name: string; nip: string }[]>([]);

    // Filters
    const [selectedTeacherId, setSelectedTeacherId] = useState<string>('ALL');
    const [selectedKelas, setSelectedKelas] = useState<string>('ALL');
    const [selectedCleanliness, setSelectedCleanliness] = useState<string>('ALL');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [quickRange, setQuickRange] = useState<'today' | 'month' | 'all'>('month');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    // Print Preview Modal State
    const [showPrintPreview, setShowPrintPreview] = useState(false);

    // Selection & Bulk Actions
    const [selectedJournalIds, setSelectedJournalIds] = useState<string[]>([]);
    const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
    const [isDeletingBulk, setIsDeletingBulk] = useState(false);

    // Single Delete
    const [journalToDelete, setJournalToDelete] = useState<JournalItem | null>(null);
    const [isDeletingSingle, setIsDeletingSingle] = useState(false);

    // Single Edit & Attendance Management State
    const [journalToEdit, setJournalToEdit] = useState<JournalItem | null>(null);
    const [editTab, setEditTab] = useState<'kbm' | 'presensi'>('kbm');
    const [editFormData, setEditFormData] = useState({
        created_at: '',
        hours: '',
        kelas: '',
        subject: '',
        material: '',
        cleanliness: 'sudah_bersih',
        notes: '',
        teacher_id: ''
    });
    const [editStudents, setEditStudents] = useState<Student[]>([]);
    const [editAttendanceMap, setEditAttendanceMap] = useState<Record<string, 'H' | 'S' | 'I' | 'A' | 'D'>>({});
    const [loadingEditStudents, setLoadingEditStudents] = useState(false);
    const [studentSearchInEdit, setStudentSearchInEdit] = useState('');
    const [isSavingEdit, setIsSavingEdit] = useState(false);

    // Feedback Alert
    const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

    // App Settings for Printable Report Header/Signatures
    const [settings, setSettings] = useState({
        academic_year: '2025/2026',
        semester: 'Ganjil',
        headmaster: 'ARIF SYAIFURROHMAN, S.Pd',
        headmaster_nip: '198106202009041003',
        school_address: 'Jl. KH Mansyur No. 162, Sekargadung, Kec. Purworejo, Kota Pasuruan, Jawa Timur 67127 | Telp: (0343) 422108'
    });

    useEffect(() => {
        if (profile) {
            fetchInitialData();
        }
    }, [profile, academicYear, semester, sortOrder]);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            // Fetch App Settings
            const { data: settingsData } = await supabase.from('app_settings').select('*');
            if (settingsData) {
                const newSettings: any = {};
                settingsData.forEach(item => newSettings[item.key] = item.value);
                setSettings(prev => ({ ...prev, ...newSettings }));
            }

            // Fetch Teachers list for Admin / Operator filters
            if (isAdmin || isOperator) {
                const { data: teachers } = await supabase
                    .from('profiles')
                    .select('id, full_name, nip, role, mengajar_mapel')
                    .order('full_name', { ascending: true });
                setTeachersList((teachers || []).filter(isOfficialTeacher));
            }

            await loadJournals();
        } catch (err) {
            console.error("Error initializing journal report:", err);
        } finally {
            setLoading(false);
        }
    };

    // Helper to generate dates range
    const getDatesInRange = (startStr: string, endStr: string): string[] => {
        const dates: string[] = [];
        if (!startStr || !endStr) return dates;
        const curr = new Date(startStr + 'T00:00:00');
        const end = new Date(endStr + 'T00:00:00');
        if (isNaN(curr.getTime()) || isNaN(end.getTime())) return dates;
        
        let count = 0;
        while (curr <= end && count < 366) {
            const y = curr.getFullYear();
            const m = String(curr.getMonth() + 1).padStart(2, '0');
            const d = String(curr.getDate()).padStart(2, '0');
            dates.push(`${y}-${m}-${d}`);
            curr.setDate(curr.getDate() + 1);
            count++;
        }
        return dates;
    };

    const getDayNum = (dateStr: string): number => {
        if (!dateStr) return 1;
        const parts = dateStr.split('T')[0].split('-');
        if (parts.length < 3) return 1;
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])).getDay();
        return d === 0 ? 7 : d;
    };

    const loadJournals = async () => {
        setLoading(true);
        try {
            // 1. Fetch raw journals cleanly with select('*')
            let query = supabase
                .from('journals')
                .select('*')
                .order('created_at', { ascending: sortOrder === 'asc' });

            if (!isAdmin && !isOperator) {
                query = query.eq('teacher_id', profile?.id);
            } else if (selectedTeacherId !== 'ALL') {
                query = query.eq('teacher_id', selectedTeacherId);
            }

            if (selectedKelas !== 'ALL') {
                query = query.eq('kelas', selectedKelas);
            }

            if (selectedCleanliness !== 'ALL') {
                query = query.eq('cleanliness', selectedCleanliness);
            }

            // Date bounds
            const todayIso = getWIBISOString();
            let startIso = startDate;
            let endIso = endDate;

            if (quickRange === 'today') {
                startIso = todayIso;
                endIso = todayIso;
                query = query.gte('created_at', `${todayIso}T00:00:00+07:00`)
                             .lte('created_at', `${todayIso}T23:59:59+07:00`);
            } else if (quickRange === 'month') {
                const now = new Date();
                const year = now.getFullYear();
                const month = String(now.getMonth() + 1).padStart(2, '0');
                const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
                startIso = `${year}-${month}-01`;
                endIso = `${year}-${month}-${lastDay}`;
                query = query.gte('created_at', `${startIso}T00:00:00+07:00`)
                             .lte('created_at', `${endIso}T23:59:59+07:00`);
            } else {
                if (startDate) query = query.gte('created_at', `${startDate}T00:00:00+07:00`);
                if (endDate) query = query.lte('created_at', `${endDate}T23:59:59+07:00`);
            }

            const { data: rawJournalsData, error: jErr } = await query;
            if (jErr) throw jErr;

            let rawJournalsList: JournalItem[] = (rawJournalsData as any[]) || [];

            // 1b. Fetch attendance_logs and journal_notes for these journals
            if (rawJournalsList.length > 0) {
                const journalIds = rawJournalsList.map(j => j.id).filter(Boolean);
                if (journalIds.length > 0) {
                    const [{ data: attLogs }, { data: jNotes }] = await Promise.all([
                        supabase.from('attendance_logs').select('*').in('journal_id', journalIds),
                        supabase.from('journal_notes').select('*').in('journal_id', journalIds)
                    ]);

                    const attMap = new Map<string, any[]>();
                    (attLogs || []).forEach(l => {
                        if (!attMap.has(l.journal_id)) attMap.set(l.journal_id, []);
                        attMap.get(l.journal_id)!.push(l);
                    });

                    const noteMap = new Map<string, any[]>();
                    (jNotes || []).forEach(n => {
                        if (!noteMap.has(n.journal_id)) noteMap.set(n.journal_id, []);
                        noteMap.get(n.journal_id)!.push(n);
                    });

                    rawJournalsList = rawJournalsList.map(j => ({
                        ...j,
                        attendance_logs: attMap.get(j.id) || [],
                        journal_notes: noteMap.get(j.id) || []
                    }));
                }
            }

            // 2. Fetch profiles mapping and app_settings for non-effective days
            const [{ data: profiles }, { data: settingsData }] = await Promise.all([
                supabase.from('profiles').select('id, full_name, nip'),
                supabase.from('app_settings').select('*')
            ]);
            const profMap = new Map((profiles || []).map(p => [p.id, p]));

            // Parse non-effective days (Hari Libur)
            let nonEffectiveDaysList: { date: string; reason: string; hours?: string }[] = [];
            if (settingsData) {
                const newSettings: any = {};
                settingsData.forEach((item: any) => newSettings[item.key] = item.value);
                setSettings(prev => ({ ...prev, ...newSettings }));

                const nedSetting = settingsData.find((item: any) => item.key === 'non_effective_days');
                if (nedSetting?.value) {
                    try {
                        nonEffectiveDaysList = JSON.parse(nedSetting.value);
                    } catch (e) {
                        console.error("Error parsing non_effective_days:", e);
                    }
                }
            }

            // Normalisasi format tanggal YYYY-MM-DD
            const normalizeDate = (d: string): string => {
                if (!d) return '';
                const trimmed = d.trim();
                if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(trimmed)) {
                    const [y, m, day] = trimmed.split('-');
                    return `${y}-${m.padStart(2, '0')}-${day.padStart(2, '0')}`;
                }
                if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/.test(trimmed)) {
                    const parts = trimmed.split(/[\/\-]/);
                    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                }
                return trimmed;
            };

            const getHolidayInfo = (dateStr: string, schHour: string | number) => {
                const targetYMD = normalizeDate(dateStr);
                const holiday = nonEffectiveDaysList.find(ned => normalizeDate(ned.date) === targetYMD);
                if (!holiday) return null;

                // Jika Libur Full Day atau jam tidak ditentukan/kosong, seluruh jam KBM pada hari tsb libur
                if (!holiday.hours || holiday.hours === 'Full Day' || holiday.hours.trim() === '') {
                    return { isHoliday: true, reason: holiday.reason || 'Hari Non-Efektif' };
                }

                // Jika ada batasan jam (misal: "1, 2")
                const schHourStr = String(schHour || '');
                const schDigits: string[] = schHourStr.match(/\d+/g) || [];
                const holDigits: string[] = String(holiday.hours).match(/\d+/g) || [];

                const matchHour = schDigits.some(d => holDigits.indexOf(d) !== -1);
                if (matchHour || schDigits.length === 0) {
                    return { isHoliday: true, reason: holiday.reason || 'Hari Non-Efektif' };
                }

                return null;
            };

            // 3. Fetch schedules
            let schedQuery = supabase.from('schedules').select('*');
            if (!isAdmin && !isOperator && profile?.id) {
                schedQuery = schedQuery.eq('teacher_id', profile.id);
            } else if (selectedTeacherId !== 'ALL') {
                schedQuery = schedQuery.eq('teacher_id', selectedTeacherId);
            }
            if (selectedKelas !== 'ALL') {
                schedQuery = schedQuery.eq('kelas', selectedKelas);
            }

            const { data: rawSchedules } = await schedQuery;
            const schedules: ScheduleItem[] = rawSchedules || [];

            // Determine date bounds if not set
            if (!startIso || !endIso) {
                if (rawJournalsList.length > 0) {
                    const dates = rawJournalsList.map(j => j.created_at ? j.created_at.split('T')[0] : todayIso).sort();
                    startIso = dates[0] < todayIso ? dates[0] : todayIso;
                    endIso = todayIso;
                } else {
                    startIso = `${todayIso.slice(0, 7)}-01`;
                    endIso = todayIso;
                }
            }

            const datesInRange = getDatesInRange(startIso, endIso);

            // 4. Match journals with schedules
            const unfilledJournals: JournalItem[] = [];

            datesInRange.forEach(dStr => {
                const dayNum = getDayNum(dStr);
                const daySchedules = schedules.filter(s => Number(s.day_of_week) === dayNum);

                daySchedules.forEach(sch => {
                    // Check if journal exists for this schedule on this date
                    const matchedJournal = rawJournalsList.find(j => {
                        const jDate = j.created_at ? j.created_at.split('T')[0] : '';
                        const sameDate = jDate === dStr;
                        const sameTeacher = j.teacher_id === sch.teacher_id;
                        const sameKelas = j.kelas?.trim().toLowerCase() === sch.kelas?.trim().toLowerCase();
                        return sameDate && sameTeacher && sameKelas;
                    });

                    if (!matchedJournal) {
                        const prof = profMap.get(sch.teacher_id);
                        const teacherName = prof?.full_name || sch.teacher_name || (profile?.id === sch.teacher_id ? profile?.full_name : 'Guru');
                        const teacherNip = prof?.nip || sch.teacher_nip || (profile?.id === sch.teacher_id ? profile?.nip : '-');

                        const firstHourMatch = String(sch.hour).match(/\d+/);
                        const firstHourNum = firstHourMatch ? parseInt(firstHourMatch[0], 10) : 7;
                        const hourFormatted = String(firstHourNum).padStart(2, '0');
                        const createdIso = `${dStr}T${hourFormatted}:00:00+07:00`;

                        const holidayInfo = getHolidayInfo(dStr, sch.hour);

                        if (holidayInfo) {
                            // Slot KBM jatuh pada Hari Non-Efektif (Libur)
                            unfilledJournals.push({
                                id: `holiday-${sch.id}-${dStr}`,
                                created_at: createdIso,
                                teacher_id: sch.teacher_id,
                                teacher_name: teacherName,
                                teacher_nip: teacherNip,
                                kelas: sch.kelas,
                                subject: sch.subject,
                                hours: String(sch.hour),
                                material: `Hari Non-Efektif: ${holidayInfo.reason}`,
                                cleanliness: '-',
                                validation: 'Disetujui',
                                notes: `Hari Non-Efektif (${holidayInfo.reason})`,
                                is_unfilled: false,
                                is_out_of_schedule: false,
                                is_holiday: true,
                                holiday_reason: holidayInfo.reason
                            });
                        } else {
                            // Create unfilled placeholder entry (Jurnal Belum Diisi)
                            unfilledJournals.push({
                                id: `unfilled-${sch.id}-${dStr}`,
                                created_at: createdIso,
                                teacher_id: sch.teacher_id,
                                teacher_name: teacherName,
                                teacher_nip: teacherNip,
                                kelas: sch.kelas,
                                subject: sch.subject,
                                hours: String(sch.hour),
                                material: 'Jurnal mengajar belum diisi',
                                cleanliness: 'perlu_dibersihkan',
                                validation: 'Belum',
                                notes: 'Jurnal mengajar belum diisi',
                                is_unfilled: true,
                                is_out_of_schedule: false,
                                is_holiday: false
                            });
                        }
                    }
                });
            });

            // 5. Process filled journals & detect out-of-schedule entries
            const processedJournals: JournalItem[] = rawJournalsList.map(j => {
                const prof = profMap.get(j.teacher_id);
                const teacherName = (isAdmin || isOperator) ? (prof?.full_name || j.inval_teacher_name || 'Guru') : (profile?.full_name || 'Guru');
                const teacherNip = (isAdmin || isOperator) ? (prof?.nip || '-') : (profile?.nip || '-');

                const jDateStr = j.created_at ? j.created_at.split('T')[0] : '';
                const jDayNum = getDayNum(jDateStr);

                // Check if this journal entry corresponds to a scheduled slot on its day
                const matchesSchedule = schedules.some(s => 
                    s.teacher_id === j.teacher_id &&
                    s.kelas?.trim().toLowerCase() === j.kelas?.trim().toLowerCase() &&
                    Number(s.day_of_week) === jDayNum
                );

                const isOutOfSchedule = !matchesSchedule;

                return {
                    ...j,
                    teacher_name: teacherName,
                    teacher_nip: teacherNip,
                    is_unfilled: false,
                    is_out_of_schedule: isOutOfSchedule
                };
            });

            // Merge and sort by date (ascending: Tanggal 1 -> 30)
            const merged = [...processedJournals, ...unfilledJournals].sort((a, b) => {
                const timeA = new Date(a.created_at).getTime() || 0;
                const timeB = new Date(b.created_at).getTime() || 0;
                if (timeA !== timeB) {
                    return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
                }
                const hA = parseInt(String(a.hours || '0').replace(/\D/g, ''), 10) || 0;
                const hB = parseInt(String(b.hours || '0').replace(/\D/g, ''), 10) || 0;
                return sortOrder === 'asc' ? hA - hB : hB - hA;
            });

            setJournals(merged);
            setSelectedJournalIds([]);
        } catch (err: any) {
            console.error("Error fetching journals:", err);
            setAlertMsg({ type: 'error', text: 'Gagal memuat data jurnal: ' + (err.message || '') });
        } finally {
            setLoading(false);
        }
    };

    // Apply client-side text search filter
    const filteredJournals = journals.filter(j => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
            (j.teacher_name && j.teacher_name.toLowerCase().includes(q)) ||
            (j.kelas && j.kelas.toLowerCase().includes(q)) ||
            (j.subject && j.subject.toLowerCase().includes(q)) ||
            (j.material && j.material.toLowerCase().includes(q)) ||
            (j.notes && j.notes.toLowerCase().includes(q)) ||
            (j.inval_teacher_name && j.inval_teacher_name.toLowerCase().includes(q)) ||
            (j.holiday_reason && j.holiday_reason.toLowerCase().includes(q))
        );
    });

    // Selection Handlers
    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedJournalIds(filteredJournals.filter(j => !j.is_unfilled && !j.is_holiday).map(j => j.id));
        } else {
            setSelectedJournalIds([]);
        }
    };

    const handleToggleSelectRow = (id: string) => {
        setSelectedJournalIds(prev => 
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    // Single Delete Execution
    const handleExecuteSingleDelete = async () => {
        if (!journalToDelete || journalToDelete.is_unfilled) return;
        setIsDeletingSingle(true);
        try {
            await supabase.from('attendance_logs').delete().eq('journal_id', journalToDelete.id);
            await supabase.from('journal_notes').delete().eq('journal_id', journalToDelete.id);
            const { error } = await supabase.from('journals').delete().eq('id', journalToDelete.id);
            if (error) throw error;

            setAlertMsg({ type: 'success', text: 'Data jurnal berhasil dihapus.' });
            setJournals(prev => prev.filter(j => j.id !== journalToDelete.id));
            setSelectedJournalIds(prev => prev.filter(id => id !== journalToDelete.id));
            setJournalToDelete(null);
        } catch (err: any) {
            setAlertMsg({ type: 'error', text: 'Gagal menghapus jurnal: ' + (err.message || '') });
        } finally {
            setIsDeletingSingle(false);
        }
    };

    // Bulk Delete Execution
    const handleExecuteBulkDelete = async () => {
        if (selectedJournalIds.length === 0) return;
        setIsDeletingBulk(true);
        try {
            await supabase.from('attendance_logs').delete().in('journal_id', selectedJournalIds);
            await supabase.from('journal_notes').delete().in('journal_id', selectedJournalIds);
            const { error } = await supabase.from('journals').delete().in('id', selectedJournalIds);
            if (error) throw error;

            setAlertMsg({ 
                type: 'success', 
                text: `Berhasil menghapus ${selectedJournalIds.length} data jurnal terpilih beserta log presensinya!` 
            });
            setJournals(prev => prev.filter(j => !selectedJournalIds.includes(j.id)));
            setSelectedJournalIds([]);
            setShowBulkDeleteModal(false);
        } catch (err: any) {
            setAlertMsg({ type: 'error', text: 'Gagal menghapus massal: ' + (err.message || '') });
        } finally {
            setIsDeletingBulk(false);
        }
    };

    // Load Students for Edit Modal
    const loadStudentsForEdit = async (targetClass: string, existingLogs: any[] = []) => {
        if (!targetClass) return;
        setLoadingEditStudents(true);
        try {
            let stdList: Student[] = [];
            const { data } = await supabase
                .from('students')
                .select('*')
                .eq('kelas', targetClass)
                .order('no_absen', { ascending: true });

            if (data && data.length > 0) {
                stdList = data as Student[];
            } else {
                try {
                    const saved = localStorage.getItem('simpanla_students_cache');
                    if (saved) {
                        const parsed = JSON.parse(saved);
                        if (Array.isArray(parsed)) {
                            stdList = parsed.filter((s: any) => s.kelas === targetClass);
                        }
                    }
                } catch (e) {}
            }

            // Ensure any student in existingLogs is in stdList
            const stdMap = new Map<string, Student>();
            stdList.forEach(s => stdMap.set(s.id, s));

            existingLogs.forEach(log => {
                if (log.student_id && !stdMap.has(log.student_id)) {
                    const fallbackStd: Student = {
                        id: log.student_id,
                        nisn: '',
                        name: log.student_name || 'Siswa',
                        kelas: targetClass
                    };
                    stdMap.set(log.student_id, fallbackStd);
                    stdList.push(fallbackStd);
                } else if (!log.student_id && log.student_name) {
                    const found = stdList.find(s => s.name?.toLowerCase() === log.student_name?.toLowerCase());
                    if (!found) {
                        const customId = `custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
                        const fallbackStd: Student = {
                            id: customId,
                            nisn: '',
                            name: log.student_name,
                            kelas: targetClass
                        };
                        stdMap.set(customId, fallbackStd);
                        stdList.push(fallbackStd);
                    }
                }
            });

            // Sort stdList by no_absen, then by name
            stdList.sort((a, b) => {
                if (a.no_absen != null && b.no_absen != null) return a.no_absen - b.no_absen;
                if (a.no_absen != null) return -1;
                if (b.no_absen != null) return 1;
                return (a.name || '').localeCompare(b.name || '');
            });

            setEditStudents(stdList);

            // Populate attendance map - Default all to 'H'
            const attMap: Record<string, 'H' | 'S' | 'I' | 'A' | 'D'> = {};
            stdList.forEach(s => {
                attMap[s.id] = 'H';
            });

            // Overlay existing logs
            existingLogs.forEach(log => {
                const rawStatus = (log.status || '').toUpperCase();
                if (['S', 'I', 'A', 'D', 'H'].includes(rawStatus)) {
                    if (log.student_id && attMap[log.student_id] !== undefined) {
                        attMap[log.student_id] = rawStatus as any;
                    } else if (log.student_name) {
                        const found = stdList.find(s => s.name?.toLowerCase() === log.student_name?.toLowerCase());
                        if (found) {
                            attMap[found.id] = rawStatus as any;
                        }
                    }
                }
            });

            setEditAttendanceMap(attMap);
        } catch (err) {
            console.error("Error loading students for edit:", err);
        } finally {
            setLoadingEditStudents(false);
        }
    };

    // Open Edit Modal
    const handleOpenEdit = (journal: JournalItem) => {
        if (journal.is_unfilled || journal.is_holiday) return;
        setJournalToEdit(journal);
        setEditTab('kbm');
        setStudentSearchInEdit('');
        const dateStr = journal.created_at ? journal.created_at.split('T')[0] : getWIBISOString();
        setEditFormData({
            created_at: dateStr,
            hours: journal.hours || '',
            kelas: journal.kelas || '',
            subject: journal.subject || '',
            material: journal.material || '',
            cleanliness: journal.cleanliness || 'sudah_bersih',
            notes: journal.notes || '',
            teacher_id: journal.teacher_id || ''
        });

        loadStudentsForEdit(journal.kelas, journal.attendance_logs || []);
    };

    // Save Edit
    const handleSaveEdit = async () => {
        if (!journalToEdit || journalToEdit.is_unfilled) return;
        setIsSavingEdit(true);
        try {
            const timePart = journalToEdit.created_at ? journalToEdit.created_at.split('T')[1] : '07:00:00+07:00';
            const updatedCreatedAt = `${editFormData.created_at}T${timePart}`;

            const updatePayload: any = {
                created_at: updatedCreatedAt,
                hours: editFormData.hours,
                kelas: editFormData.kelas,
                subject: editFormData.subject,
                material: editFormData.material,
                cleanliness: editFormData.cleanliness,
                notes: editFormData.notes
            };

            if (isAdmin || isOperator) {
                if (editFormData.teacher_id) {
                    updatePayload.teacher_id = editFormData.teacher_id;
                }
            }

            const { error: jErr } = await supabase
                .from('journals')
                .update(updatePayload)
                .eq('id', journalToEdit.id);

            if (jErr) throw jErr;

            // 1. Delete prior attendance_logs for this journal
            const { error: delErr } = await supabase
                .from('attendance_logs')
                .delete()
                .eq('journal_id', journalToEdit.id);
            if (delErr) {
                console.warn("Warning deleting prior attendance_logs:", delErr);
            }

            // 2. Identify teacher name
            let effectiveTeacherName = journalToEdit.teacher_name || '';
            if (editFormData.teacher_id) {
                const tObj = teachersList.find(t => t.id === editFormData.teacher_id);
                if (tObj) effectiveTeacherName = tObj.full_name;
            }

            // 3. Filter non-Hadir students (S, I, A, D)
            const nonHadirStudents = editStudents.filter(s => {
                const st = editAttendanceMap[s.id];
                return st && st !== 'H';
            });

            if (nonHadirStudents.length > 0) {
                const attInserts = nonHadirStudents.map(s => ({
                    journal_id: journalToEdit.id,
                    student_id: s.id,
                    student_name: s.name,
                    status: editAttendanceMap[s.id],
                    teacher_name: effectiveTeacherName,
                    subject: editFormData.subject,
                    academic_year: academicYear || '2025/2026',
                    semester: semester || 'Ganjil'
                }));

                let { error: insErr } = await supabase
                    .from('attendance_logs')
                    .insert(attInserts);

                if (insErr && (insErr.code === '42703' || insErr.message?.includes('academic_year') || insErr.message?.includes('semester'))) {
                    const fallbackAtts = attInserts.map(({ academic_year, semester, ...rest }) => rest);
                    const { error: fbErr } = await supabase
                        .from('attendance_logs')
                        .insert(fallbackAtts);
                    if (fbErr) throw fbErr;
                } else if (insErr) {
                    throw insErr;
                }
            }

            setAlertMsg({ type: 'success', text: 'Data jurnal dan status kehadiran siswa berhasil disimpan.' });
            
            await loadJournals();
            setJournalToEdit(null);
        } catch (err: any) {
            setAlertMsg({ type: 'error', text: 'Gagal memperbarui jurnal: ' + (err.message || '') });
        } finally {
            setIsSavingEdit(false);
        }
    };

    // Print Execution with dedicated clean print engine
    const handlePrintExecution = () => {
        const reportElem = document.getElementById('printable-report-area');
        if (!reportElem) {
            window.print();
            return;
        }

        // Use dedicated hidden iframe for pristine printing without container clipping
        let printFrame = document.getElementById('kbm-print-frame') as HTMLIFrameElement;
        if (!printFrame) {
            printFrame = document.createElement('iframe');
            printFrame.id = 'kbm-print-frame';
            printFrame.style.position = 'fixed';
            printFrame.style.right = '0';
            printFrame.style.bottom = '0';
            printFrame.style.width = '0';
            printFrame.style.height = '0';
            printFrame.style.border = '0';
            printFrame.style.visibility = 'hidden';
            document.body.appendChild(printFrame);
        }

        const frameDoc = printFrame.contentDocument || printFrame.contentWindow?.document;
        if (!frameDoc || !printFrame.contentWindow) {
            window.print();
            return;
        }

        frameDoc.open();
        frameDoc.write(`
            <!DOCTYPE html>
            <html lang="id">
            <head>
                <meta charset="UTF-8">
                <title>Laporan Jurnal KBM - UPT SMP Negeri 8 Pasuruan</title>
                <style>
                    @page {
                        size: landscape;
                        margin: 8mm 10mm 10mm 10mm;
                    }
                    * {
                        box-sizing: border-box;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                        color: #000;
                        background: #fff;
                        margin: 0;
                        padding: 0;
                        font-size: 11px;
                        line-height: 1.35;
                    }
                    .text-center { text-align: center; }
                    .text-left { text-align: left; }
                    .text-right { text-align: right; }
                    .font-bold { font-weight: bold; }
                    .font-extrabold { font-weight: 800; }
                    .font-semibold { font-weight: 600; }
                    .uppercase { text-transform: uppercase; }
                    .underline { text-decoration: underline; }
                    .italic { font-style: italic; }
                    
                    /* KOP SURAT TABLE */
                    table.kop-table {
                        width: 100% !important;
                        border-collapse: collapse !important;
                        border: none !important;
                        border-bottom: 3px double #000 !important;
                        padding-bottom: 10px !important;
                        margin-bottom: 14px !important;
                    }
                    table.kop-table td, table.kop-table th, table.kop-table tr {
                        border: none !important;
                        background: transparent !important;
                    }

                    /* SIGNATURE TABLE */
                    table.signature-table {
                        width: 100% !important;
                        border-collapse: collapse !important;
                        border: none !important;
                        margin-top: 28px !important;
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                    }
                    table.signature-table td, table.signature-table th, table.signature-table tr {
                        border: none !important;
                        background: transparent !important;
                    }

                    /* DATA TABLE */
                    table.data-table {
                        width: 100% !important;
                        border-collapse: collapse !important;
                        font-size: 10px !important;
                        margin-top: 8px !important;
                        page-break-inside: auto !important;
                    }
                    table.data-table th, table.data-table td {
                        border: 1px solid #000 !important;
                        padding: 5px 6px !important;
                        vertical-align: top !important;
                    }
                    table.data-table th {
                        background-color: #f1f5f9 !important;
                        font-weight: bold !important;
                        text-align: center !important;
                    }
                    thead {
                        display: table-header-group !important;
                    }
                    tr {
                        page-break-inside: avoid !important;
                        page-break-after: auto !important;
                    }
                    ul {
                        margin: 0 !important;
                        padding-left: 14px !important;
                    }
                    li {
                        margin-bottom: 2px !important;
                    }
                    img {
                        max-height: 75px !important;
                        width: auto !important;
                    }
                </style>
            </head>
            <body>
                ${reportElem.innerHTML}
            </body>
            </html>
        `);
        frameDoc.close();

        setTimeout(() => {
            printFrame.contentWindow?.focus();
            printFrame.contentWindow?.print();
        }, 300);
    };

    const renderAttendanceBadge = (logs: any[], isUnfilled?: boolean) => {
        if (isUnfilled) return <span className="text-xs text-slate-400 italic">-</span>;

        const absents = (logs || []).filter(l => ['S', 'I', 'A', 'D'].includes(l.status));
        if (absents.length === 0) {
            return <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">Nihil (Hadir Semua)</span>;
        }

        const getBadgeColor = (status: string) => {
            switch (status) {
                case 'S': return 'bg-amber-50 text-amber-700 border-amber-200';
                case 'I': return 'bg-blue-50 text-blue-700 border-blue-200';
                case 'A': return 'bg-rose-50 text-rose-700 border-rose-200';
                case 'D': return 'bg-purple-50 text-purple-700 border-purple-200';
                default: return 'bg-slate-50 text-slate-700 border-slate-200';
            }
        };

        return (
            <div className="space-y-1">
                {absents.map((a, i) => (
                    <div key={i} className={`text-xs flex items-center gap-1.5 px-2 py-0.5 rounded border ${getBadgeColor(a.status)}`}>
                        <span className="font-bold">{a.status}:</span>
                        <span className="truncate max-w-[150px]">{a.student_name}</span>
                    </div>
                ))}
            </div>
        );
    };

    const currentDateStr = formatDateSignature(new Date());

    const selectedTeacherObj = teachersList.find(t => t.id === selectedTeacherId);

    const guruSubtitle = (!isAdmin && !isOperator && profile)
        ? `Guru Pengampu: ${profile.full_name} (NIP ${profile.nip || '-'})`
        : (selectedTeacherId !== 'ALL' && selectedTeacherObj)
        ? `Guru Pengampu: ${selectedTeacherObj.full_name} (NIP ${selectedTeacherObj.nip || '-'})`
        : null;

    const signerTeacherName = (!isAdmin && !isOperator)
        ? (profile?.full_name || 'Guru SIM-PANLA')
        : (selectedTeacherId !== 'ALL' && selectedTeacherObj 
            ? selectedTeacherObj.full_name 
            : (profile?.full_name || 'Guru SIM-PANLA'));

    const signerTeacherNip = (!isAdmin && !isOperator)
        ? (profile?.nip || '-')
        : (selectedTeacherId !== 'ALL' && selectedTeacherObj 
            ? (selectedTeacherObj.nip || '-') 
            : (profile?.nip || '-'));

    const mainContent = (
        <>
            <style>{`
                @media print {
                    @page {
                        size: landscape;
                        margin: 8mm 10mm 10mm 10mm;
                    }
                    html, body {
                        overflow: visible !important;
                        height: auto !important;
                        min-height: auto !important;
                        background: white !important;
                    }
                    body * {
                        visibility: hidden !important;
                    }
                    .print-modal-overlay,
                    .print-modal-container {
                        position: static !important;
                        display: block !important;
                        overflow: visible !important;
                        max-height: none !important;
                        height: auto !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        background: transparent !important;
                        backdrop-filter: none !important;
                        box-shadow: none !important;
                        border: none !important;
                    }
                    #printable-report-area, #printable-report-area * {
                        visibility: visible !important;
                    }
                    #printable-report-area {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        background: white !important;
                        color: black !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        box-shadow: none !important;
                        border: none !important;
                        display: block !important;
                        overflow: visible !important;
                        height: auto !important;
                        max-height: none !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                    table.kop-table, table.kop-table td, table.kop-table th, table.kop-table tr,
                    table.signature-table, table.signature-table td, table.signature-table th, table.signature-table tr {
                        border: none !important;
                        background: transparent !important;
                    }
                    table.kop-table {
                        border-bottom: 3px double #000 !important;
                    }
                    table.data-table {
                        page-break-inside: auto !important;
                    }
                    table.data-table th, table.data-table td {
                        border: 1px solid #000 !important;
                    }
                    tr {
                        page-break-inside: avoid !important;
                        page-break-after: auto !important;
                    }
                    thead {
                        display: table-header-group !important;
                    }
                }
            `}</style>

            <div className="space-y-6">

                {/* HEADER TITLE BAR */}
                <div className="no-print flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-lg shadow-purple-200 dark:shadow-none">
                            <BookOpen size={26} />
                        </div>
                        <div>
                            <h1 className="text-xl font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
                                Data Jurnal KBM Guru
                                <span className="text-xs font-bold bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-2.5 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">
                                    {filteredJournals.length} Item Jurnal
                                </span>
                            </h1>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                Rekapitulasi & Manajemen Agenda Kegiatan Belajar Mengajar UPT SMP Negeri 8 Pasuruan.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {selectedJournalIds.length > 0 && (isAdmin || isOperator) && (
                            <button
                                onClick={() => setShowBulkDeleteModal(true)}
                                className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-red-200 transition-all flex items-center gap-2 animate-fade-in"
                            >
                                <Trash2 size={16} /> Hapus {selectedJournalIds.length} Terpilih
                            </button>
                        )}

                        {/* CETAK LAPORAN DENGAN PREVIEW */}
                        <button
                            onClick={() => {
                                setShowPrintPreview(true);
                                window.scrollTo({ top: 0, behavior: 'instant' });
                            }}
                            className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2"
                            title="Pratinjau & Cetak Dokumen Resmi Jurnal (PDF)"
                        >
                            <Printer size={16} /> Cetak / PDF
                        </button>
                    </div>
                </div>

                {/* ALERT MESSAGE */}
                {alertMsg && (
                    <div className={`no-print p-4 rounded-2xl border flex items-center justify-between text-sm animate-fade-in ${
                        alertMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                        alertMsg.type === 'error' ? 'bg-red-50 text-red-800 border-red-200' :
                        'bg-blue-50 text-blue-800 border-blue-200'
                    }`}>
                        <div className="flex items-center gap-2">
                            {alertMsg.type === 'success' && <CheckCircle2 size={18} className="text-emerald-600"/>}
                            {alertMsg.type === 'error' && <AlertTriangle size={18} className="text-red-600"/>}
                            <span className="font-medium">{alertMsg.text}</span>
                        </div>
                        <button onClick={() => setAlertMsg(null)} className="p-1 hover:opacity-75"><X size={16}/></button>
                    </div>
                )}

                {/* FILTER PANEL */}
                <div className="no-print bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700 pb-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                            <Filter size={16} className="text-purple-600" /> Filter & Pencarian Data Jurnal
                        </div>

                        {/* Quick Range Buttons */}
                        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-700/50 p-1 rounded-xl text-xs font-bold">
                            <button
                                onClick={() => { setQuickRange('today'); loadJournals(); }}
                                className={`px-3 py-1.5 rounded-lg transition-all ${quickRange === 'today' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200'}`}
                            >
                                Hari Ini
                            </button>
                            <button
                                onClick={() => { setQuickRange('month'); loadJournals(); }}
                                className={`px-3 py-1.5 rounded-lg transition-all ${quickRange === 'month' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200'}`}
                            >
                                Bulan Ini
                            </button>
                            <button
                                onClick={() => { setQuickRange('all'); loadJournals(); }}
                                className={`px-3 py-1.5 rounded-lg transition-all ${quickRange === 'all' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200'}`}
                            >
                                Semua Data
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                        {/* Search Input */}
                        <div className="lg:col-span-1">
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Cari Kata Kunci</label>
                            <div className="relative">
                                <Search size={16} className="absolute left-3 top-3 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Cari guru, materi, kelas..."
                                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Filter Guru (Admin / Operator Only) */}
                        {(isAdmin || isOperator) && (
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Guru Pengampu</label>
                                <select
                                    className="w-full p-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500"
                                    value={selectedTeacherId}
                                    onChange={e => setSelectedTeacherId(e.target.value)}
                                >
                                    <option value="ALL">-- Semua Bapak/Ibu Guru --</option>
                                    {teachersList.map(t => (
                                        <option key={t.id} value={t.id}>{t.full_name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Filter Kelas */}
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Kelas</label>
                            <select
                                className="w-full p-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500"
                                value={selectedKelas}
                                onChange={e => setSelectedKelas(e.target.value)}
                            >
                                <option value="ALL">-- Semua Kelas --</option>
                                {['7A','7B','7C','7D','7E','7F','7G','7H','8A','8B','8C','8D','8E','8F','8G','8H','9A','9B','9C','9D','9E','9F','9G','9H'].map(k => (
                                    <option key={k} value={k}>{k}</option>
                                ))}
                            </select>
                        </div>

                        {/* Filter Tanggal Mulai */}
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Dari Tanggal</label>
                            <input
                                type="date"
                                className="w-full p-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500"
                                value={startDate}
                                onChange={e => { setStartDate(e.target.value); setQuickRange('all'); }}
                            />
                        </div>

                        {/* Filter Tanggal Selesai */}
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Sampai Tanggal</label>
                            <input
                                type="date"
                                className="w-full p-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500"
                                value={endDate}
                                onChange={e => { setEndDate(e.target.value); setQuickRange('all'); }}
                            />
                        </div>

                        {/* Urutan Tanggal */}
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Urutan Tanggal</label>
                            <select
                                className="w-full p-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-purple-500"
                                value={sortOrder}
                                onChange={e => setSortOrder(e.target.value as 'asc' | 'desc')}
                            >
                                <option value="asc">Tanggal 1 → 30 (Awal ke Akhir)</option>
                                <option value="desc">Tanggal 30 → 1 (Akhir ke Awal)</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex justify-end items-center gap-2 pt-1">
                        <button
                            onClick={loadJournals}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5"
                        >
                            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Terapkan Filter
                        </button>
                    </div>
                </div>

                {/* TABLE DATA CONTAINER */}
                <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden no-print">
                    
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-700/50 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700">
                                    <th className="p-3.5 text-center w-10">
                                        <input
                                            type="checkbox"
                                            className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                                            checked={filteredJournals.filter(j=>!j.is_unfilled && !j.is_holiday).length > 0 && selectedJournalIds.length === filteredJournals.filter(j=>!j.is_unfilled && !j.is_holiday).length}
                                            onChange={handleSelectAll}
                                        />
                                    </th>
                                    <th className="p-3.5 w-12 text-center">No</th>
                                    <th className="p-3.5 min-w-[140px]">Waktu & Jam</th>
                                    {(isAdmin || isOperator) && <th className="p-3.5 min-w-[160px]">Guru Pengampu</th>}
                                    <th className="p-3.5 w-16 text-center">Kelas</th>
                                    <th className="p-3.5 min-w-[140px]">Mata Pelajaran</th>
                                    <th className="p-3.5 min-w-[220px]">Materi Pembelajaran</th>
                                    <th className="p-3.5 w-32">Kebersihan</th>
                                    <th className="p-3.5 min-w-[160px]">Siswa Tidak Hadir</th>
                                    <th className="p-3.5 min-w-[140px]">Keterangan</th>
                                    <th className="p-3.5 text-center w-24">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                {loading ? (
                                    <tr>
                                        <td colSpan={11} className="p-12 text-center text-slate-400">
                                            <Loader2 size={24} className="animate-spin inline mr-2 text-purple-600" />
                                            Memuat data jurnal KBM...
                                        </td>
                                    </tr>
                                ) : filteredJournals.length === 0 ? (
                                    <tr>
                                        <td colSpan={11} className="p-12 text-center text-slate-400 italic">
                                            Tidak ada data jurnal yang sesuai dengan filter.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredJournals.map((journal, index) => {
                                        const isSelected = selectedJournalIds.includes(journal.id);
                                        return (
                                            <tr 
                                                key={journal.id} 
                                                className={`transition-colors hover:bg-purple-50/30 dark:hover:bg-slate-700/30 ${
                                                    journal.is_holiday ? 'bg-amber-50/25 dark:bg-amber-950/20' :
                                                    journal.is_unfilled ? 'bg-red-50/30 dark:bg-red-950/20' :
                                                    isSelected ? 'bg-purple-50/60 dark:bg-purple-950/20' : ''
                                                }`}
                                            >
                                                <td className="p-3.5 text-center">
                                                    {!journal.is_unfilled && !journal.is_holiday && (
                                                        <input
                                                            type="checkbox"
                                                            className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                                                            checked={isSelected}
                                                            onChange={() => handleToggleSelectRow(journal.id)}
                                                        />
                                                    )}
                                                </td>
                                                <td className="p-3.5 text-center font-semibold text-slate-500">
                                                    {index + 1}
                                                </td>
                                                <td className="p-3.5">
                                                    <div className="font-bold text-slate-800 dark:text-slate-200">
                                                        {formatDateIndo(journal.created_at)}
                                                    </div>
                                                    <div className="text-[11px] font-medium text-purple-600 dark:text-purple-400">
                                                        Jam ke {journal.hours}
                                                    </div>
                                                </td>

                                                {(isAdmin || isOperator) && (
                                                    <td className="p-3.5">
                                                        <div className="font-bold text-slate-800 dark:text-slate-200">
                                                            {journal.teacher_name || 'Guru'}
                                                        </div>
                                                        {journal.inval_teacher_name && (
                                                            <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded border border-amber-200">
                                                                Inval: {journal.inval_teacher_name}
                                                            </span>
                                                        )}
                                                    </td>
                                                )}

                                                <td className="p-3.5 text-center">
                                                    <span className="font-extrabold text-sm text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/40 px-2.5 py-1 rounded-lg border border-purple-200 dark:border-purple-800">
                                                        {journal.kelas}
                                                    </span>
                                                </td>

                                                <td className="p-3.5">
                                                    <div className="font-bold text-slate-800 dark:text-slate-200">
                                                        {journal.subject}
                                                    </div>
                                                </td>

                                                <td className="p-3.5 max-w-[280px]">
                                                    {journal.is_holiday ? (
                                                        <div className="text-amber-800 dark:text-amber-300 font-bold bg-amber-50 dark:bg-amber-950/60 px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-800 flex items-center gap-2 w-fit shadow-xs">
                                                            <CalendarOff size={15} className="text-amber-600 dark:text-amber-400 shrink-0" />
                                                            <span className="truncate max-w-[220px]" title={journal.holiday_reason}>
                                                                Hari Non-Efektif: {journal.holiday_reason || 'Libur'}
                                                            </span>
                                                        </div>
                                                    ) : journal.is_unfilled ? (
                                                        <div className="text-red-600 dark:text-red-400 font-extrabold bg-red-100/80 dark:bg-red-950/80 px-3 py-1.5 rounded-xl border border-red-300 dark:border-red-800 flex items-center gap-1.5 w-fit">
                                                            <AlertCircle size={15} className="text-red-600 shrink-0" />
                                                            Jurnal mengajar belum diisi
                                                        </div>
                                                    ) : (
                                                        <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed line-clamp-3">
                                                            {journal.material}
                                                        </p>
                                                    )}
                                                </td>

                                                <td className="p-3.5">
                                                    {journal.is_holiday ? (
                                                        <span className="text-amber-700/80 dark:text-amber-400/80 text-[11px] font-semibold italic">Non-Efektif</span>
                                                    ) : journal.is_unfilled ? (
                                                        <span className="text-slate-400 italic text-[11px]">-</span>
                                                    ) : journal.cleanliness === 'sudah_bersih' ? (
                                                        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                                                            Sudah Bersih
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200">
                                                            Perlu Dibersihkan
                                                        </span>
                                                    )}
                                                </td>

                                                <td className="p-3.5">
                                                    {journal.is_holiday ? (
                                                        <span className="text-amber-700/80 dark:text-amber-400/80 text-[11px] font-semibold">Libur</span>
                                                    ) : (
                                                        renderAttendanceBadge(journal.attendance_logs || [], journal.is_unfilled)
                                                    )}
                                                </td>

                                                <td className="p-3.5 text-slate-600 dark:text-slate-400">
                                                    {journal.is_holiday ? (
                                                        <span className="text-amber-800 dark:text-amber-300 font-bold bg-amber-100/80 dark:bg-amber-950/60 px-2.5 py-1 rounded-lg border border-amber-300 dark:border-amber-800 text-[11px] inline-flex items-center gap-1">
                                                            <CalendarOff size={13} className="text-amber-600 dark:text-amber-400 shrink-0" />
                                                            Hari Non-Efektif
                                                        </span>
                                                    ) : journal.is_out_of_schedule ? (
                                                        <span className="text-amber-800 dark:text-amber-300 font-bold bg-amber-100 dark:bg-amber-950/60 px-2.5 py-1 rounded-lg border border-amber-300 dark:border-amber-800 text-[11px] inline-flex items-center gap-1">
                                                            <AlertTriangle size={13} className="text-amber-600 shrink-0" />
                                                            Jurnal diisi tidak sesuai Jadwal
                                                        </span>
                                                    ) : journal.is_unfilled ? (
                                                        <span className="text-red-600 font-bold text-[11px] italic">Jurnal Belum Diisi</span>
                                                    ) : (
                                                        journal.notes || '-'
                                                    )}
                                                </td>

                                                <td className="p-3.5 text-center">
                                                    {!journal.is_unfilled && !journal.is_holiday ? (
                                                        <div className="flex items-center justify-center gap-1">
                                                            <button
                                                                onClick={() => handleOpenEdit(journal)}
                                                                className="p-1.5 hover:bg-purple-100 dark:hover:bg-purple-900/40 text-purple-600 dark:text-purple-400 rounded-lg transition-colors"
                                                                title="Edit Jurnal"
                                                            >
                                                                <Edit3 size={15} />
                                                            </button>

                                                            {(isAdmin || isOperator) && (
                                                                <button
                                                                    onClick={() => setJournalToDelete(journal)}
                                                                    className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 rounded-lg transition-colors"
                                                                    title="Hapus Jurnal"
                                                                >
                                                                    <Trash2 size={15} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-400 italic text-[11px]">-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* MODAL PRINT PREVIEW */}
                {showPrintPreview && (
                    <div className="print-modal-overlay fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-start justify-center p-3 sm:p-6 overflow-y-auto pt-3 sm:pt-6">
                        <div className="print-modal-container bg-white rounded-3xl w-full max-w-5xl my-2 shadow-2xl border border-slate-200 flex flex-col mb-12">
                            
                            {/* PREVIEW MODAL HEADER BAR */}
                            <div className="no-print bg-slate-900 text-white p-5 rounded-t-3xl flex items-center justify-between sticky top-0 z-10">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center text-white">
                                        <Eye size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-base">Pratinjau Cetak Laporan Jurnal KBM</h3>
                                        <p className="text-xs text-slate-400">Pastikan format dan isi laporan sudah sesuai sebelum dicetak.</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={handlePrintExecution}
                                        className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2"
                                    >
                                        <Printer size={16} /> Cetak Sekarang
                                    </button>
                                    <button
                                        onClick={() => setShowPrintPreview(false)}
                                        className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* PRINTABLE CONTENT AREA */}
                            <div id="printable-report-area" className="p-8 bg-white text-black space-y-6">
                                
                                {/* KOP SURAT RESMI (TABLE BASED FOR CONSISTENT PRINT & PREVIEW) */}
                                <table className="kop-table" style={{ width: '100%', borderCollapse: 'collapse', border: 'none', borderBottom: '3px double #000', paddingBottom: '10px', marginBottom: '14px' }}>
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

                                {/* DOCUMENT TITLE */}
                                <div style={{ textAlign: 'center', margin: '0 0 16px 0' }}>
                                    <h3 style={{ fontSize: '14px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#000', textDecoration: 'underline', margin: '0 0 4px 0' }}>
                                        LAPORAN JURNAL KEGIATAN BELAJAR MENGAJAR (KBM)
                                    </h3>
                                    <div style={{ fontSize: '11px', fontWeight: '600', color: '#334155' }}>
                                        Semester {settings.semester} | Tahun Ajaran {settings.academic_year}
                                    </div>
                                    {guruSubtitle ? (
                                        <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#581c87', marginTop: '4px' }}>
                                            {guruSubtitle}
                                        </div>
                                    ) : null}
                                </div>

                                {/* PRINTABLE TABLE */}
                                <table className="data-table w-full text-left border-collapse border border-black text-[11px]">
                                    <thead>
                                        <tr className="bg-slate-100 text-black font-bold border-b border-black text-center">
                                            <th className="border border-black p-2 w-8">No</th>
                                            <th className="border border-black p-2 w-28">Tanggal & Jam</th>
                                            {(isAdmin || isOperator) && <th className="border border-black p-2 min-w-[110px]">Guru Pengampu</th>}
                                            <th className="border border-black p-2 w-14">Kelas</th>
                                            <th className="border border-black p-2 min-w-[100px]">Mata Pelajaran</th>
                                            <th className="border border-black p-2 min-w-[180px]">Materi Pembelajaran</th>
                                            <th className="border border-black p-2 w-20">Kebersihan</th>
                                            <th className="border border-black p-2 min-w-[120px]">Ketidakhadiran Siswa</th>
                                            <th className="border border-black p-2 min-w-[110px]">Keterangan</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredJournals.length === 0 ? (
                                            <tr>
                                                <td colSpan={(isAdmin || isOperator) ? 9 : 8} className="border border-black p-6 text-center italic text-slate-500">
                                                    Tidak ada data jurnal untuk dicetak.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredJournals.map((j, idx) => {
                                                const absents = (j.attendance_logs || []).filter(l => ['S', 'I', 'A'].includes(l.status));
                                                return (
                                                    <tr key={j.id} className="border-b border-black">
                                                        <td className="border border-black p-2 text-center font-semibold">{idx + 1}</td>
                                                        <td className="border border-black p-2">
                                                            <div className="font-bold">{formatDateIndo(j.created_at)}</div>
                                                            <div className="text-[10px] text-slate-600">Jam ke {j.hours}</div>
                                                        </td>

                                                        {(isAdmin || isOperator) && (
                                                            <td className="border border-black p-2">
                                                                <div className="font-bold">{j.teacher_name || 'Guru'}</div>
                                                                <div className="text-[10px] text-slate-500">NIP: {j.teacher_nip || '-'}</div>
                                                            </td>
                                                        )}

                                                        <td className="border border-black p-2 text-center font-bold">{j.kelas}</td>
                                                        <td className="border border-black p-2 font-semibold">{j.subject}</td>
                                                        <td className="border border-black p-2">
                                                            {j.is_holiday ? (
                                                                <span className="font-bold text-amber-800">Hari Non-Efektif ({j.holiday_reason || 'Libur'})</span>
                                                            ) : j.is_unfilled ? (
                                                                <span className="font-bold text-red-600 uppercase">Jurnal mengajar belum diisi</span>
                                                            ) : (
                                                                j.material
                                                            )}
                                                        </td>
                                                        <td className="border border-black p-2 text-center">
                                                            {j.is_holiday ? '-' : j.is_unfilled ? '-' : (j.cleanliness === 'sudah_bersih' ? 'Bersih' : 'Kurang Bersih')}
                                                        </td>
                                                        <td className="border border-black p-2">
                                                            {j.is_holiday ? '-' : j.is_unfilled ? '-' : absents.length === 0 ? 'NIHIL' : (
                                                                <ul className="list-disc list-inside text-[10px]">
                                                                    {absents.map((a, i) => (
                                                                        <li key={i}>{a.student_name} ({a.status})</li>
                                                                    ))}
                                                                </ul>
                                                            )}
                                                        </td>
                                                        <td className="border border-black p-2">
                                                            {j.is_holiday ? (
                                                                <span className="font-bold text-amber-800">Hari Non-Efektif</span>
                                                            ) : j.is_out_of_schedule ? (
                                                                <span className="font-bold text-amber-700">Jurnal diisi tidak sesuai Jadwal</span>
                                                            ) : j.is_unfilled ? (
                                                                <span className="font-bold text-red-600">Jurnal Belum Diisi</span>
                                                            ) : (
                                                                j.notes || '-'
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>

                                {/* SIGNATURE SECTION (RESMI & TAHAN CETAK) */}
                                <table className="signature-table" style={{ width: '100%', borderCollapse: 'collapse', border: 'none', marginTop: '28px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                                    <tbody>
                                        <tr style={{ border: 'none' }}>
                                            <td style={{ width: '45%', textAlign: 'center', verticalAlign: 'top', border: 'none', padding: '0 8px' }}>
                                                <div style={{ fontSize: '11px', fontWeight: '600', lineHeight: '1.4' }}>Mengetahui,</div>
                                                <div style={{ fontSize: '11px', fontWeight: '600', lineHeight: '1.4' }}>Kepala UPT SMP Negeri 8 Pasuruan</div>
                                                <div style={{ height: '65px' }}></div>
                                                <div style={{ fontSize: '11px', fontWeight: 'bold', textDecoration: 'underline', textTransform: 'uppercase' }}>
                                                    {settings.headmaster || 'ARIF SYAIFURROHMAN, S.Pd'}
                                                </div>
                                                <div style={{ fontSize: '10px', marginTop: '2px', color: '#1e293b' }}>
                                                    NIP. {settings.headmaster_nip || '198106202009041003'}
                                                </div>
                                            </td>
                                            <td style={{ width: '10%', border: 'none' }}></td>
                                            <td style={{ width: '45%', textAlign: 'center', verticalAlign: 'top', border: 'none', padding: '0 8px' }}>
                                                <div style={{ fontSize: '11px', fontWeight: '600', lineHeight: '1.4' }}>Kota Pasuruan, {currentDateStr}</div>
                                                <div style={{ fontSize: '11px', fontWeight: '600', lineHeight: '1.4' }}>Petugas / Guru Pengampu Jurnal</div>
                                                <div style={{ height: '65px' }}></div>
                                                <div style={{ fontSize: '11px', fontWeight: 'bold', textDecoration: 'underline' }}>
                                                    {signerTeacherName}
                                                </div>
                                                <div style={{ fontSize: '10px', marginTop: '2px', color: '#1e293b' }}>
                                                    NIP. {signerTeacherNip}
                                                </div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>

                            </div>
                        </div>
                    </div>
                )}

                {/* MODAL EDIT JURNAL & PRESENSI SISWA */}
                {journalToEdit && (
                    <div className="no-print fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-start justify-center p-3 sm:p-4 pt-4 sm:pt-8 overflow-y-auto animate-fade-in">
                        <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col my-2 max-h-[92vh]">
                            {/* MODAL HEADER */}
                            <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/80">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                                        <Edit3 size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-extrabold text-base text-slate-800 dark:text-white flex items-center gap-2">
                                            Edit Data Jurnal & Presensi Siswa
                                        </h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            Kelas <strong className="text-purple-600 dark:text-purple-400">{editFormData.kelas}</strong> • {editFormData.subject || 'Mata Pelajaran'} • {formatDateIndo(editFormData.created_at)}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setJournalToEdit(null)}
                                    className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* TABS NAVIGATION */}
                            <div className="flex border-b border-slate-200 dark:border-slate-700 bg-slate-100/60 dark:bg-slate-900/40 p-1.5 gap-1.5 px-4">
                                <button
                                    type="button"
                                    onClick={() => setEditTab('kbm')}
                                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                                        editTab === 'kbm'
                                            ? 'bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 shadow-sm border border-slate-200 dark:border-slate-700'
                                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                    }`}
                                >
                                    <BookOpen size={15} /> Detail Jurnal KBM
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setEditTab('presensi')}
                                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                                        editTab === 'presensi'
                                            ? 'bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 shadow-sm border border-slate-200 dark:border-slate-700'
                                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                    }`}
                                >
                                    <Users size={15} /> Presensi Siswa ({editStudents.length})
                                    {(() => {
                                        const nonHadirCount = Object.values(editAttendanceMap).filter(st => st !== 'H').length;
                                        return nonHadirCount > 0 ? (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 font-extrabold">
                                                {nonHadirCount} Absen
                                            </span>
                                        ) : (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-extrabold">
                                                Nihil
                                            </span>
                                        );
                                    })()}
                                </button>
                            </div>

                            {/* TAB CONTENT (Scrollable) */}
                            <div className="flex-1 overflow-y-auto p-5 space-y-4">
                                {editTab === 'kbm' ? (
                                    <div className="space-y-3.5 text-xs">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div>
                                                <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">Tanggal KBM</label>
                                                <input
                                                    type="date"
                                                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500"
                                                    value={editFormData.created_at}
                                                    onChange={e => setEditFormData({ ...editFormData, created_at: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">Jam Ke</label>
                                                <input
                                                    type="text"
                                                    placeholder="Contoh: 1-2, 3-4"
                                                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500"
                                                    value={editFormData.hours}
                                                    onChange={e => setEditFormData({ ...editFormData, hours: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        {/* Guru Pengampu (Admin / Operator can change) */}
                                        {(isAdmin || isOperator) && (
                                            <div>
                                                <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">Guru Pengampu</label>
                                                <select
                                                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500"
                                                    value={editFormData.teacher_id}
                                                    onChange={e => setEditFormData({ ...editFormData, teacher_id: e.target.value })}
                                                >
                                                    <option value="">-- Tetap Guru Sebelumnya ({journalToEdit.teacher_name || 'Guru'}) --</option>
                                                    {teachersList.map(t => (
                                                        <option key={t.id} value={t.id}>
                                                            {t.full_name} {t.nip ? `(NIP. ${t.nip})` : ''}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div>
                                                <div className="flex items-center justify-between mb-1">
                                                    <label className="font-bold text-slate-600 dark:text-slate-300">Kelas</label>
                                                    {editFormData.kelas !== journalToEdit.kelas && (
                                                        <button
                                                            type="button"
                                                            onClick={() => loadStudentsForEdit(editFormData.kelas, [])}
                                                            className="text-[10px] text-purple-600 font-bold hover:underline"
                                                        >
                                                            Muat Siswa Kelas Baru
                                                        </button>
                                                    )}
                                                </div>
                                                <select
                                                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500"
                                                    value={editFormData.kelas}
                                                    onChange={e => {
                                                        const newK = e.target.value;
                                                        setEditFormData({ ...editFormData, kelas: newK });
                                                        loadStudentsForEdit(newK, []);
                                                    }}
                                                >
                                                    {CLASS_OPTIONS.map(c => (
                                                        <option key={c} value={c}>{c}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">Mata Pelajaran</label>
                                                <input
                                                    type="text"
                                                    placeholder="Nama Mapel..."
                                                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500"
                                                    value={editFormData.subject}
                                                    onChange={e => setEditFormData({ ...editFormData, subject: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">Materi Pembelajaran</label>
                                            <textarea
                                                rows={3}
                                                placeholder="Uraian materi pokok KBM..."
                                                className="w-full p-2.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500"
                                                value={editFormData.material}
                                                onChange={e => setEditFormData({ ...editFormData, material: e.target.value })}
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div>
                                                <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">Kebersihan Kelas</label>
                                                <select
                                                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500"
                                                    value={editFormData.cleanliness}
                                                    onChange={e => setEditFormData({ ...editFormData, cleanliness: e.target.value })}
                                                >
                                                    <option value="sudah_bersih">Sudah Bersih</option>
                                                    <option value="perlu_dibersihkan">Perlu Dibersihkan</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">Catatan Tambahan</label>
                                                <input
                                                    type="text"
                                                    placeholder="Catatan kejadian khusus / tugas..."
                                                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500"
                                                    value={editFormData.notes}
                                                    onChange={e => setEditFormData({ ...editFormData, notes: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    /* TAB 2: PRESENSI SISWA */
                                    <div className="space-y-3">
                                        {/* Attendance Summary Bar */}
                                        <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                                            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                                <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                                    Presensi Siswa Kelas {editFormData.kelas} ({editStudents.length} Anak)
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const newMap = { ...editAttendanceMap };
                                                        editStudents.forEach(s => { newMap[s.id] = 'H'; });
                                                        setEditAttendanceMap(newMap);
                                                    }}
                                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-sm transition-all"
                                                >
                                                    <CheckCheck size={13} /> Set Semua Hadir (H)
                                                </button>
                                            </div>

                                            {/* Badges Count */}
                                            {(() => {
                                                const hCount = editStudents.filter(s => (editAttendanceMap[s.id] || 'H') === 'H').length;
                                                const sCount = editStudents.filter(s => editAttendanceMap[s.id] === 'S').length;
                                                const iCount = editStudents.filter(s => editAttendanceMap[s.id] === 'I').length;
                                                const aCount = editStudents.filter(s => editAttendanceMap[s.id] === 'A').length;
                                                const dCount = editStudents.filter(s => editAttendanceMap[s.id] === 'D').length;

                                                return (
                                                    <div className="grid grid-cols-5 gap-1.5 text-center text-[10px] font-bold">
                                                        <div className="bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 p-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
                                                            Hadir: <span className="font-extrabold text-xs">{hCount}</span>
                                                        </div>
                                                        <div className="bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 p-1.5 rounded-xl border border-amber-200 dark:border-amber-800">
                                                            Sakit: <span className="font-extrabold text-xs">{sCount}</span>
                                                        </div>
                                                        <div className="bg-blue-50 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 p-1.5 rounded-xl border border-blue-200 dark:border-blue-800">
                                                            Izin: <span className="font-extrabold text-xs">{iCount}</span>
                                                        </div>
                                                        <div className="bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 p-1.5 rounded-xl border border-rose-200 dark:border-rose-800">
                                                            Alpa: <span className="font-extrabold text-xs">{aCount}</span>
                                                        </div>
                                                        <div className="bg-purple-50 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300 p-1.5 rounded-xl border border-purple-200 dark:border-purple-800">
                                                            Dispen: <span className="font-extrabold text-xs">{dCount}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </div>

                                        {/* Search in Modal */}
                                        <div className="relative">
                                            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                                            <input
                                                type="text"
                                                placeholder="Cari nama atau nomor absen siswa..."
                                                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500"
                                                value={studentSearchInEdit}
                                                onChange={e => setStudentSearchInEdit(e.target.value)}
                                            />
                                        </div>

                                        {/* Student list */}
                                        {loadingEditStudents ? (
                                            <div className="py-12 text-center text-slate-400 flex items-center justify-center gap-2">
                                                <Loader2 size={16} className="animate-spin text-purple-600" /> Memuat data siswa kelas {editFormData.kelas}...
                                            </div>
                                        ) : editStudents.length === 0 ? (
                                            <div className="py-8 text-center text-slate-400 text-xs italic bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                                                Tidak ada data siswa di kelas {editFormData.kelas}.
                                            </div>
                                        ) : (
                                            <div className="max-h-[340px] overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100 dark:divide-slate-700/60">
                                                {editStudents
                                                    .filter(s => {
                                                        if (!studentSearchInEdit.trim()) return true;
                                                        const q = studentSearchInEdit.toLowerCase();
                                                        return (
                                                            s.name?.toLowerCase().includes(q) ||
                                                            String(s.no_absen || '').includes(q) ||
                                                            s.nisn?.includes(q)
                                                        );
                                                    })
                                                    .map((std, idx) => {
                                                        const currentStatus = editAttendanceMap[std.id] || 'H';
                                                        const displayNo = std.no_absen != null ? String(std.no_absen).padStart(2, '0') : String(idx + 1).padStart(2, '0');

                                                        return (
                                                            <div
                                                                key={std.id}
                                                                className="pt-2 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/80 dark:hover:bg-slate-700/30 p-2 rounded-xl transition-colors"
                                                            >
                                                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                                                    <span className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-700 font-mono text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
                                                                        {displayNo}
                                                                    </span>
                                                                    <div className="min-w-0 flex-1">
                                                                        <span className="font-bold text-xs text-slate-800 dark:text-slate-200 break-words block leading-snug">
                                                                            {std.name}
                                                                        </span>
                                                                        {std.nisn && (
                                                                            <span className="text-[10px] text-slate-400 block">NISN: {std.nisn}</span>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Segmented Status Selector */}
                                                                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900/60 p-1 rounded-xl shrink-0 self-end sm:self-center">
                                                                    {[
                                                                        { key: 'H', label: 'Hadir', activeClass: 'bg-emerald-600 text-white shadow-sm' },
                                                                        { key: 'S', label: 'Sakit', activeClass: 'bg-amber-500 text-white shadow-sm' },
                                                                        { key: 'I', label: 'Izin', activeClass: 'bg-blue-600 text-white shadow-sm' },
                                                                        { key: 'A', label: 'Alpa', activeClass: 'bg-rose-600 text-white shadow-sm' },
                                                                        { key: 'D', label: 'Dispen', activeClass: 'bg-purple-600 text-white shadow-sm' }
                                                                    ].map(st => {
                                                                        const isSelected = currentStatus === st.key;
                                                                        return (
                                                                            <button
                                                                                key={st.key}
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setEditAttendanceMap(prev => ({
                                                                                        ...prev,
                                                                                        [std.id]: st.key as any
                                                                                    }));
                                                                                }}
                                                                                className={`px-2 py-1 rounded-lg text-[10px] font-extrabold transition-all ${
                                                                                    isSelected
                                                                                        ? st.activeClass
                                                                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                                                                }`}
                                                                            >
                                                                                {st.key}
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* MODAL FOOTER */}
                            <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/80 flex items-center justify-between gap-2">
                                <div>
                                    {editTab === 'kbm' ? (
                                        <button
                                            type="button"
                                            onClick={() => setEditTab('presensi')}
                                            className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
                                        >
                                            Ke Presensi Siswa <ChevronDown size={14} className="-rotate-90" />
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => setEditTab('kbm')}
                                            className="text-xs font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1"
                                        >
                                            <ChevronDown size={14} className="rotate-90" /> Ke Detail Jurnal
                                        </button>
                                    )}
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setJournalToEdit(null)}
                                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl transition-colors"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSaveEdit}
                                        disabled={isSavingEdit}
                                        className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-purple-200 dark:shadow-none transition-all disabled:opacity-50"
                                    >
                                        {isSavingEdit && <Loader2 size={14} className="animate-spin" />}
                                        Simpan Perubahan
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODAL HAPUS TUNGGAL */}
                {journalToDelete && (
                    <div className="no-print fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-start justify-center p-4 pt-6 sm:pt-12 overflow-y-auto animate-fade-in">
                        <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
                            <div className="flex items-center gap-3 text-red-600">
                                <div className="w-10 h-10 rounded-2xl bg-red-100 flex items-center justify-center">
                                    <AlertTriangle size={20} />
                                </div>
                                <h3 className="font-bold text-base text-slate-800 dark:text-white">Konfirmasi Hapus Jurnal</h3>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                Apakah Anda yakin ingin menghapus jurnal kelas <strong className="text-slate-800 dark:text-white">{journalToDelete.kelas}</strong> mata pelajaran <strong className="text-slate-800 dark:text-white">{journalToDelete.subject}</strong> tanggal <strong className="text-slate-800 dark:text-white">{formatDateIndo(journalToDelete.created_at)}</strong>?
                            </p>
                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    onClick={() => setJournalToDelete(null)}
                                    className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleExecuteSingleDelete}
                                    disabled={isDeletingSingle}
                                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md"
                                >
                                    {isDeletingSingle && <Loader2 size={14} className="animate-spin" />}
                                    Ya, Hapus
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODAL HAPUS MASSAL */}
                {showBulkDeleteModal && (
                    <div className="no-print fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-start justify-center p-4 pt-6 sm:pt-12 overflow-y-auto animate-fade-in">
                        <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
                            <div className="flex items-center gap-3 text-red-600">
                                <div className="w-10 h-10 rounded-2xl bg-red-100 flex items-center justify-center">
                                    <Trash2 size={20} />
                                </div>
                                <h3 className="font-bold text-base text-slate-800 dark:text-white">Hapus {selectedJournalIds.length} Jurnal Terpilih</h3>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                Tindakan ini akan menghapus <strong>{selectedJournalIds.length} data jurnal</strong> beserta seluruh log presensi siswa yang terkait. Data yang dihapus tidak dapat dikembalikan.
                            </p>
                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    onClick={() => setShowBulkDeleteModal(false)}
                                    className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleExecuteBulkDelete}
                                    disabled={isDeletingBulk}
                                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md"
                                >
                                    {isDeletingBulk && <Loader2 size={14} className="animate-spin" />}
                                    Hapus Permanen
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </>
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

export default LaporanJurnal;
