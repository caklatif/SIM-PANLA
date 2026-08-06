import React, { useEffect, useState, useRef } from 'react';
import { Layout } from '../components/Layout';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
    Printer, Download, Trash2, Edit3, Search, Filter, RefreshCw, X, 
    AlertTriangle, BookOpen, CheckSquare, Square, Calendar, Check, 
    Loader2, User, Sparkles, ChevronDown, CheckCircle2,
    FileSpreadsheet, Sparkle
} from 'lucide-react';
import { formatDateIndo, formatDateSignature, getWIBISOString } from '../utils/dateUtils';

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
    profiles?: {
        full_name: string;
        nip: string;
    };
    attendance_logs?: {
        id: string;
        student_id: string;
        student_name: string;
        status: 'S' | 'I' | 'A' | 'H';
    }[];
    journal_notes?: {
        id: string;
        student_name: string;
        type: string;
        category: string;
        note: string;
    }[];
}

const LaporanJurnal: React.FC = () => {
    const { profile, isAdmin, isOperator, academicYear, semester, semesterStart, semesterEnd } = useAuth();
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
    const [quickRange, setQuickRange] = useState<'today' | 'month' | 'all'>('all');

    // Selection & Bulk Actions
    const [selectedJournalIds, setSelectedJournalIds] = useState<string[]>([]);
    const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
    const [isDeletingBulk, setIsDeletingBulk] = useState(false);

    // Single Delete
    const [journalToDelete, setJournalToDelete] = useState<JournalItem | null>(null);
    const [isDeletingSingle, setIsDeletingSingle] = useState(false);

    // Single Edit
    const [journalToEdit, setJournalToEdit] = useState<JournalItem | null>(null);
    const [editFormData, setEditFormData] = useState({
        created_at: '',
        hours: '',
        kelas: '',
        subject: '',
        material: '',
        cleanliness: 'sudah_bersih',
        notes: ''
    });
    const [isSavingEdit, setIsSavingEdit] = useState(false);

    // Feedback Alert
    const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

    // App Settings for Printable Report Header/Signatures
    const [settings, setSettings] = useState({
        academic_year: '2025/2026',
        semester: 'Ganjil',
        headmaster: 'H. Suwandi, S.Pd., M.Pd.',
        headmaster_nip: '197001011995031002'
    });

    const componentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (profile) {
            fetchInitialData();
        }
    }, [profile, academicYear, semester]);

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
                    .select('id, full_name, nip')
                    .order('full_name', { ascending: true });
                setTeachersList(teachers || []);
            }

            await loadJournals();
        } catch (err) {
            console.error("Error initializing journal report:", err);
        } finally {
            setLoading(false);
        }
    };

    const loadJournals = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('journals')
                .select(`
                    *,
                    attendance_logs (
                        id,
                        student_id,
                        student_name,
                        status
                    ),
                    journal_notes (
                        id,
                        student_name,
                        type,
                        category,
                        note
                    )
                `)
                .order('created_at', { ascending: false });

            // If not admin and not operator, scope to current teacher only
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

            // Date filtering
            if (quickRange === 'today') {
                const todayIso = getWIBISOString();
                query = query.gte('created_at', `${todayIso}T00:00:00+07:00`)
                             .lte('created_at', `${todayIso}T23:59:59+07:00`);
            } else if (quickRange === 'month') {
                const now = new Date();
                const year = now.getFullYear();
                const month = String(now.getMonth() + 1).padStart(2, '0');
                const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
                query = query.gte('created_at', `${year}-${month}-01T00:00:00+07:00`)
                             .lte('created_at', `${year}-${month}-${lastDay}T23:59:59+07:00`);
            } else {
                if (startDate) query = query.gte('created_at', `${startDate}T00:00:00+07:00`);
                if (endDate) query = query.lte('created_at', `${endDate}T23:59:59+07:00`);
            }

            const { data, error } = await query;
            if (error) throw error;

            let journalList: JournalItem[] = (data as any[]) || [];

            // If admin/operator, resolve teacher names from profiles map or inline
            if (isAdmin || isOperator) {
                const { data: profiles } = await supabase.from('profiles').select('id, full_name, nip');
                const profMap = new Map((profiles || []).map(p => [p.id, p]));
                journalList = journalList.map(j => {
                    const prof = profMap.get(j.teacher_id);
                    return {
                        ...j,
                        teacher_name: prof?.full_name || j.inval_teacher_name || 'Guru',
                        teacher_nip: prof?.nip || '-'
                    };
                });
            } else {
                journalList = journalList.map(j => ({
                    ...j,
                    teacher_name: profile?.full_name,
                    teacher_nip: profile?.nip
                }));
            }

            setJournals(journalList);
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
            (j.inval_teacher_name && j.inval_teacher_name.toLowerCase().includes(q))
        );
    });

    // Checkbox selections
    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedJournalIds(filteredJournals.map(j => j.id));
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
        if (!journalToDelete) return;
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

    // Open Edit Modal
    const handleOpenEdit = (journal: JournalItem) => {
        setJournalToEdit(journal);
        const dateStr = journal.created_at ? journal.created_at.split('T')[0] : getWIBISOString();
        setEditFormData({
            created_at: dateStr,
            hours: journal.hours || '',
            kelas: journal.kelas || '',
            subject: journal.subject || '',
            material: journal.material || '',
            cleanliness: journal.cleanliness || 'sudah_bersih',
            notes: journal.notes || ''
        });
    };

    // Save Edit
    const handleSaveEdit = async () => {
        if (!journalToEdit) return;
        setIsSavingEdit(true);
        try {
            const timePart = journalToEdit.created_at ? journalToEdit.created_at.split('T')[1] : '07:00:00+07:00';
            const updatedCreatedAt = `${editFormData.created_at}T${timePart}`;

            const { error } = await supabase
                .from('journals')
                .update({
                    created_at: updatedCreatedAt,
                    hours: editFormData.hours,
                    kelas: editFormData.kelas,
                    subject: editFormData.subject,
                    material: editFormData.material,
                    cleanliness: editFormData.cleanliness,
                    notes: editFormData.notes
                })
                .eq('id', journalToEdit.id);

            if (error) throw error;

            setAlertMsg({ type: 'success', text: 'Data jurnal berhasil diperbarui.' });
            
            // Update local list
            setJournals(prev => prev.map(j => {
                if (j.id === journalToEdit.id) {
                    return {
                        ...j,
                        created_at: updatedCreatedAt,
                        hours: editFormData.hours,
                        kelas: editFormData.kelas,
                        subject: editFormData.subject,
                        material: editFormData.material,
                        cleanliness: editFormData.cleanliness,
                        notes: editFormData.notes
                    };
                }
                return j;
            }));

            setJournalToEdit(null);
        } catch (err: any) {
            setAlertMsg({ type: 'error', text: 'Gagal memperbarui jurnal: ' + (err.message || '') });
        } finally {
            setIsSavingEdit(false);
        }
    };

    // Export Excel CSV
    const handleExportCSV = () => {
        if (filteredJournals.length === 0) {
            setAlertMsg({ type: 'info', text: 'Tidak ada data jurnal untuk diunduh.' });
            return;
        }

        const headers = ["No", "Tanggal", "Jam Ke", "Nama Guru", "NIP Guru", "Kelas", "Mata Pelajaran", "Materi Pembelajaran", "Kebersihan Kelas", "Ketidakhadiran Siswa", "Catatan"];
        const rows = filteredJournals.map((j, idx) => {
            const absents = (j.attendance_logs || [])
                .filter(l => ['S', 'I', 'A'].includes(l.status))
                .map(l => `${l.student_name} (${l.status})`)
                .join('; ');

            return [
                idx + 1,
                `"${formatDateIndo(j.created_at)}"`,
                `"Jam ke ${j.hours}"`,
                `"${j.teacher_name || 'Guru'}"`,
                `"${j.teacher_nip || '-'}"`,
                `"${j.kelas}"`,
                `"${j.subject}"`,
                `"${(j.material || '').replace(/"/g, '""')}"`,
                `"${j.cleanliness === 'sudah_bersih' ? 'Sudah Bersih' : 'Perlu Dibersihkan'}"`,
                `"${absents || 'NIHIL'}"`,
                `"${(j.notes || '').replace(/"/g, '""')}"`
            ].join(',');
        });

        const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(','), ...rows].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Data_Jurnal_KBM_SIMPANLA_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Print Report
    const handlePrint = () => {
        window.print();
    };

    const renderAttendanceBadge = (logs: any[]) => {
        const absents = (logs || []).filter(l => ['S', 'I', 'A'].includes(l.status));
        if (absents.length === 0) {
            return <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">Nihil (Hadir Semua)</span>;
        }

        return (
            <div className="space-y-1">
                {absents.map((a, i) => (
                    <div key={i} className="text-xs flex items-center gap-1.5 bg-red-50 text-red-700 px-2 py-0.5 rounded border border-red-100">
                        <span className="font-bold">{a.status}:</span>
                        <span className="truncate max-w-[150px]">{a.student_name}</span>
                    </div>
                ))}
            </div>
        );
    };

    const currentDateStr = formatDateSignature(new Date());

    return (
        <Layout>
            <div className="space-y-6">

                {/* HEADER TITLE BAR */}
                <div className="print:hidden flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-lg shadow-purple-200 dark:shadow-none">
                            <BookOpen size={26} />
                        </div>
                        <div>
                            <h1 className="text-xl font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
                                Data Jurnal KBM Guru
                                <span className="text-xs font-bold bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-2.5 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">
                                    {filteredJournals.length} Jurnal
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

                        <button
                            onClick={handleExportCSV}
                            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2"
                        >
                            <FileSpreadsheet size={16} /> Export Excel
                        </button>

                        <button
                            onClick={handlePrint}
                            className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2"
                        >
                            <Printer size={16} /> Cetak Laporan
                        </button>
                    </div>
                </div>

                {/* ALERT MESSAGE */}
                {alertMsg && (
                    <div className={`print:hidden p-4 rounded-2xl border flex items-center justify-between text-sm animate-fade-in ${
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
                <div className="print:hidden bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4 shadow-sm">
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
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
                <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden print:border-none print:shadow-none print:p-0">
                    
                    {/* OFFICIAL PRINT KOP (VISIBLE ONLY ON PRINT) */}
                    <div className="hidden print:block p-8 border-b-2 border-black mb-6">
                        <div className="flex items-center gap-6">
                            <img src="https://lh3.googleusercontent.com/d/1KtAUvy02qNUB2FzCUoVrNmHtFT0eH2J0" alt="Logo Sekolah" className="h-20 w-auto" />
                            <div>
                                <h1 className="text-xl font-bold uppercase tracking-wider text-black leading-tight">UPT SMP NEGERI 8 PASURUAN</h1>
                                <h2 className="text-base font-bold text-black leading-tight">LAPORAN REKAPITULASI JURNAL KBM GURU</h2>
                                <p className="text-xs text-gray-700 mt-1">
                                    T.A {settings.academic_year} - Semester {settings.semester} | Dicetak Pada: {new Date().toLocaleDateString('id-ID')}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-700/50 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700">
                                    <th className="p-3.5 print:hidden text-center w-10">
                                        <input
                                            type="checkbox"
                                            className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                                            checked={filteredJournals.length > 0 && selectedJournalIds.length === filteredJournals.length}
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
                                    <th className="p-3.5 min-w-[140px]">Catatan</th>
                                    <th className="p-3.5 print:hidden text-center w-24">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                {loading ? (
                                    <tr>
                                        <td colSpan={11} className="p-12 text-center text-slate-400">
                                            <Loader2 size={24} className="animate-spin inline mr-2 text-purple-600" />
                                            Memuat data jurnal...
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
                                                    isSelected ? 'bg-purple-50/60 dark:bg-purple-950/20' : ''
                                                }`}
                                            >
                                                <td className="p-3.5 print:hidden text-center">
                                                    <input
                                                        type="checkbox"
                                                        className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                                                        checked={isSelected}
                                                        onChange={() => handleToggleSelectRow(journal.id)}
                                                    />
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
                                                    <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed line-clamp-3">
                                                        {journal.material}
                                                    </p>
                                                </td>

                                                <td className="p-3.5">
                                                    {journal.cleanliness === 'sudah_bersih' ? (
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
                                                    {renderAttendanceBadge(journal.attendance_logs || [])}
                                                </td>

                                                <td className="p-3.5 text-slate-600 dark:text-slate-400">
                                                    {journal.notes || '-'}
                                                </td>

                                                <td className="p-3.5 print:hidden text-center">
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
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* OFFICIAL PRINT SIGNATURE FOOTER */}
                    <div className="hidden print:flex justify-between items-start pt-12 p-8 text-black break-inside-avoid">
                        <div className="text-center">
                            <p className="mb-16">Mengetahui,<br/>Kepala UPT SMP Negeri 8 Pasuruan</p>
                            <p className="font-bold underline">{settings.headmaster}</p>
                            <p className="text-xs">NIP. {settings.headmaster_nip}</p>
                        </div>

                        <div className="text-center">
                            <p className="mb-16">Kota Pasuruan, {currentDateStr}<br/>Petugas / Admin SIM-PANLA</p>
                            <p className="font-bold underline">{profile?.full_name || 'Admin SIM-PANLA'}</p>
                            <p className="text-xs">NIP. {profile?.nip || '-'}</p>
                        </div>
                    </div>

                </div>

            </div>

            {/* MODAL EDIT JURNAL */}
            {journalToEdit && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in print:hidden">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 dark:border-slate-700">
                        <div className="bg-purple-600 p-5 flex justify-between items-center text-white">
                            <h3 className="font-bold text-base flex items-center gap-2">
                                <Edit3 size={18} /> Edit Data Jurnal
                            </h3>
                            <button onClick={() => setJournalToEdit(null)} className="hover:bg-white/20 p-1.5 rounded-full transition-colors">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Tanggal</label>
                                    <input
                                        type="date"
                                        className="w-full border border-slate-200 dark:border-slate-600 rounded-xl p-2.5 text-xs bg-slate-50 dark:bg-slate-700"
                                        value={editFormData.created_at}
                                        onChange={e => setEditFormData({ ...editFormData, created_at: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Jam Ke</label>
                                    <input
                                        type="text"
                                        className="w-full border border-slate-200 dark:border-slate-600 rounded-xl p-2.5 text-xs bg-slate-50 dark:bg-slate-700"
                                        placeholder="Contoh: 1,2,3"
                                        value={editFormData.hours}
                                        onChange={e => setEditFormData({ ...editFormData, hours: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Kelas</label>
                                    <input
                                        type="text"
                                        className="w-full border border-slate-200 dark:border-slate-600 rounded-xl p-2.5 text-xs bg-slate-50 dark:bg-slate-700"
                                        value={editFormData.kelas}
                                        onChange={e => setEditFormData({ ...editFormData, kelas: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Mata Pelajaran</label>
                                    <input
                                        type="text"
                                        className="w-full border border-slate-200 dark:border-slate-600 rounded-xl p-2.5 text-xs bg-slate-50 dark:bg-slate-700"
                                        value={editFormData.subject}
                                        onChange={e => setEditFormData({ ...editFormData, subject: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Materi Pembelajaran</label>
                                <textarea
                                    className="w-full border border-slate-200 dark:border-slate-600 rounded-xl p-2.5 text-xs bg-slate-50 dark:bg-slate-700"
                                    rows={3}
                                    value={editFormData.material}
                                    onChange={e => setEditFormData({ ...editFormData, material: e.target.value })}
                                ></textarea>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Kondisi Kebersihan Kelas</label>
                                <select
                                    className="w-full border border-slate-200 dark:border-slate-600 rounded-xl p-2.5 text-xs bg-slate-50 dark:bg-slate-700"
                                    value={editFormData.cleanliness}
                                    onChange={e => setEditFormData({ ...editFormData, cleanliness: e.target.value })}
                                >
                                    <option value="sudah_bersih">Sudah Bersih</option>
                                    <option value="perlu_dibersihkan">Perlu Dibersihkan</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Catatan Tambahan</label>
                                <textarea
                                    className="w-full border border-slate-200 dark:border-slate-600 rounded-xl p-2.5 text-xs bg-slate-50 dark:bg-slate-700"
                                    rows={2}
                                    value={editFormData.notes}
                                    onChange={e => setEditFormData({ ...editFormData, notes: e.target.value })}
                                ></textarea>
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                                <button
                                    onClick={() => setJournalToEdit(null)}
                                    disabled={isSavingEdit}
                                    className="px-4 py-2 border border-slate-200 dark:border-slate-600 text-xs font-bold text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-50"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleSaveEdit}
                                    disabled={isSavingEdit}
                                    className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 disabled:opacity-50"
                                >
                                    {isSavingEdit ? <Loader2 size={14} className="animate-spin"/> : <Check size={14}/>}
                                    Simpan Perubahan
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL KONFIRMASI HAPUS SINGLE */}
            {journalToDelete && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in print:hidden">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 dark:border-slate-700">
                        <div className="bg-red-600 p-5 flex justify-between items-center text-white">
                            <h3 className="font-bold text-base flex items-center gap-2">
                                <AlertTriangle size={18} /> Konfirmasi Hapus Jurnal
                            </h3>
                            <button onClick={() => setJournalToDelete(null)} className="hover:bg-white/20 p-1.5 rounded-full transition-colors">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                Apakah Anda yakin ingin menghapus jurnal kelas <strong>{journalToDelete.kelas}</strong> ({journalToDelete.subject}) oleh <strong>{journalToDelete.teacher_name || 'Guru'}</strong> pada <strong>{formatDateIndo(journalToDelete.created_at)}</strong>?
                            </p>
                            <p className="text-[11px] text-red-500 bg-red-50 dark:bg-red-950/30 p-3 rounded-xl border border-red-200 dark:border-red-800">
                                Tindakan ini tidak dapat dibatalkan. Log presensi siswa terkait jurnal ini juga akan terhapus.
                            </p>
                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    onClick={() => setJournalToDelete(null)}
                                    disabled={isDeletingSingle}
                                    className="px-4 py-2 border border-slate-200 dark:border-slate-600 text-xs font-bold text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-50"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleExecuteSingleDelete}
                                    disabled={isDeletingSingle}
                                    className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 disabled:opacity-50"
                                >
                                    {isDeletingSingle ? <Loader2 size={14} className="animate-spin"/> : <Trash2 size={14}/>}
                                    Hapus Sekarang
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL KONFIRMASI HAPUS BULK */}
            {showBulkDeleteModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in print:hidden">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 dark:border-slate-700">
                        <div className="bg-red-600 p-5 flex justify-between items-center text-white">
                            <h3 className="font-bold text-base flex items-center gap-2">
                                <AlertTriangle size={18} /> Hapus Massal Data Jurnal
                            </h3>
                            <button onClick={() => setShowBulkDeleteModal(false)} className="hover:bg-white/20 p-1.5 rounded-full transition-colors">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-2xl text-red-800 dark:text-red-300 text-xs leading-relaxed">
                                Anda telah memilih <strong>{selectedJournalIds.length} data jurnal</strong>. Seluruh data tersebut beserta catatan presensi siswa di dalamnya akan dihapus secara permanen.
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    onClick={() => setShowBulkDeleteModal(false)}
                                    disabled={isDeletingBulk}
                                    className="px-4 py-2 border border-slate-200 dark:border-slate-600 text-xs font-bold text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-50"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleExecuteBulkDelete}
                                    disabled={isDeletingBulk}
                                    className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 disabled:opacity-50"
                                >
                                    {isDeletingBulk ? <Loader2 size={14} className="animate-spin"/> : <Trash2 size={14}/>}
                                    Ya, Hapus {selectedJournalIds.length} Jurnal
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default LaporanJurnal;
