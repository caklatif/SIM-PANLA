
import React, { useEffect, useState, useRef } from 'react';
import { Layout } from '../components/Layout';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Student } from '../types';
import {  
  Printer, 
  Loader2, 
  BookX, 
  CalendarDays, 
  ChevronDown, 
  ChevronUp, 
  UserMinus, 
  Download, 
  FileSpreadsheet,
  Edit3,
  Trash2,
  Plus,
  X,
  Check,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { formatDateSignature, getWIBISOString, formatDateIndo } from '../utils/dateUtils';
import { showAlert, showConfirm } from '../utils/alert';

interface ReportDetail {
    id?: string;
    date: string;
    status: string;
    source: string; // 'Wali Kelas' or 'Guru Mapel'
    table: 'homeroom_attendance' | 'attendance_logs';
}

interface ReportStudent extends Student {
    s_count: number;
    i_count: number;
    a_count: number;
    d_count: number;
    details: ReportDetail[];
}

interface AbsensiRaporProps {
  embedded?: boolean;
}

export const AbsensiRapor: React.FC<AbsensiRaporProps> = ({ embedded = false }) => {
  const { profile, isAdmin, isOperator, academicYear, semester , semesterStart, semesterEnd } = useAuth();
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<ReportStudent[]>([]);
  
  const isUserAdmin = Boolean(isAdmin || isOperator || profile?.mengajar_mapel === 'Kepala Sekolah');

  // Modal Manage State
  const [manageStudent, setManageStudent] = useState<ReportStudent | null>(null);
  const [editingDetail, setEditingDetail] = useState<{
    id?: string;
    student_id: string;
    date: string;
    status: string;
    source: string;
    table: 'homeroom_attendance' | 'attendance_logs';
    isNew: boolean;
  } | null>(null);
  const [isSavingAction, setIsSavingAction] = useState(false);
  
  // Filters
  const [classes, setClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  
  // Date Range
  const [isStartDateInitialized, setIsStartDateInitialized] = useState(false);
  const [startDate, setStartDate] = useState(() => {
      const d = new Date();
      d.setDate(1); // 1st of current month
      return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(getWIBISOString());

  // Settings for Print Header
  const [settings, setSettings] = useState({
      academic_year: '...',
      semester: '...',
      headmaster: '...',
      headmaster_nip: ''
  });

  // ACCORDION STATE
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);

  const componentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (semesterStart && !isStartDateInitialized) {
        setStartDate(semesterStart);
        setIsStartDateInitialized(true);
    }
  }, [semesterStart, isStartDateInitialized]);

useEffect(() => {
    fetchInitData();
  }, [profile]);

  useEffect(() => {
      if(selectedClass && startDate && endDate) {
          generateReport();
      } else {
          setReportData([]);
      }
  }, [selectedClass, startDate, endDate]);

  const fetchInitData = async () => {
    if(!profile) return;
    try {
        const { data: settingsData } = await supabase.from('app_settings').select('*');
        const newSettings: any = {};
        settingsData?.forEach(item => newSettings[item.key] = item.value);
        setSettings(prev => ({ ...prev, ...newSettings }));

        let { data, error: errSt } = await supabase.from('students').select('kelas').eq('academic_year', academicYear || '2025/2026');
        if (errSt && (errSt.code === '42703' || errSt.message?.includes('academic_year'))) {
            const res = await supabase.from('students').select('kelas').eq('academic_year', academicYear || '2025/2026');
            data = res.data;
        }
        if(data) {
            const unique = Array.from(new Set(data.map((s:any) => s.kelas))).sort();
            setClasses(unique as string[]);
            if (profile.wali_kelas) {
                setSelectedClass(profile.wali_kelas);
            }
        }
    } catch(e) { console.error(e); }
  };

  const generateReport = async () => {
      setLoading(true);
      setExpandedStudentId(null); // Reset accordion on new fetch
      try {
          const start = `${startDate}T00:00:00+07:00`;
          const end = `${endDate}T23:59:59+07:00`;

          let { data: students, error: errSt2 } = await supabase.from('students').select('*').eq('academic_year', academicYear || '2025/2026').eq('kelas', selectedClass).eq('academic_year', settings.academic_year || '2025/2026').order('name');
          if (errSt2 && (errSt2.code === '42703' || errSt2.message?.includes('academic_year'))) {
              const res = await supabase.from('students').select('*').eq('academic_year', academicYear || '2025/2026').eq('kelas', selectedClass).order('name');
              if (settings.academic_year === '2025/2026' || !settings.academic_year) students = res.data;
              else students = [];
          }
          
          if(!students || students.length === 0) {
              setReportData([]); setLoading(false); return;
          }

          const studentIds = students.map(s => s.id);

          const { data: hLogs } = await supabase
            .from('homeroom_attendance')
            .select('id, student_id, date, status')
            .eq('academic_year', academicYear || '2025/2026')
            .eq('semester', semester || 'Ganjil')
            .in('student_id', studentIds)
            .gte('date', startDate)
            .lte('date', endDate);

          const { data: tLogs } = await supabase
            .from('attendance_logs')
            .select('id, student_id, created_at, status')
            .eq('academic_year', academicYear || '2025/2026')
            .eq('semester', semester || 'Ganjil')
            .gte('created_at', semesterStart ? `${semesterStart}T00:00:00+07:00` : '2000-01-01T00:00:00+07:00')
            .lte('created_at', semesterEnd ? `${semesterEnd}T23:59:59+07:00` : '2100-01-01T23:59:59+07:00')
            .in('student_id', studentIds)
            .gte('created_at', start)
            .lte('created_at', end)
            .neq('status', 'D');

          const datesWithHomeroomForClass = new Set(hLogs?.map(l => l.date) || []);

          const processedStudents: ReportStudent[] = students.map(student => {
              let s_total = 0, i_total = 0, a_total = 0, d_total = 0;
              const details: ReportDetail[] = [];

              const hDates = hLogs?.filter(l => l.student_id === student.id).map(l => l.date) || [];
              const tDates = tLogs?.filter(l => l.student_id === student.id).map(l => l.created_at.split('T')[0]) || [];
              const uniqueDates = Array.from(new Set([...hDates, ...tDates])).sort();

              uniqueDates.forEach(date => {
                  let statusFound = '';
                  let sourceFound = '';
                  let foundId = '';
                  let foundTable: 'homeroom_attendance' | 'attendance_logs' = 'homeroom_attendance';

                  const hLog = hLogs?.find(l => l.student_id === student.id && l.date === date);
                  if (hLog) {
                      statusFound = hLog.status;
                      sourceFound = 'Wali Kelas';
                      foundId = hLog.id;
                      foundTable = 'homeroom_attendance';
                  } else if (!datesWithHomeroomForClass.has(date)) {
                      // Hanya periksa catatan guru mapel jika kelas ini belum memiliki catatan absensi homeroom pada tanggal tersebut.
                      // Jika kelas sudah diabsen oleh Wali/Operator hari itu dan siswa tidak ada di hLogs, maka siswa berstatus HADIR.
                      const dayLogs = tLogs?.filter(l => l.student_id === student.id && l.created_at.startsWith(date)) || [];
                      if (dayLogs.length > 0) {
                          const statuses = dayLogs.map(l => l.status);
                          if (statuses.includes('S')) statusFound = 'S';
                          else if (statuses.includes('I')) statusFound = 'I';
                          else if (statuses.includes('A')) statusFound = 'A';
                          else if (statuses.includes('D')) statusFound = 'D';
                          
                          if (statusFound) {
                            sourceFound = 'Guru Mapel';
                            foundId = dayLogs[0].id;
                            foundTable = 'attendance_logs';
                          }
                      }
                  }

                  if (statusFound) {
                      details.push({ 
                        id: foundId, 
                        date, 
                        status: statusFound, 
                        source: sourceFound,
                        table: foundTable
                      });
                      if (statusFound === 'S') s_total++;
                      else if (statusFound === 'I') i_total++;
                      else if (statusFound === 'A') a_total++;
                      else if (statusFound === 'D') d_total++;
                  }
              });

              return {
                  ...student,
                  s_count: s_total,
                  i_count: i_total,
                  a_count: a_total,
                  d_count: d_total,
                  details: details
              };
          });

          setReportData(processedStudents);

      } catch(e) { console.error(e); }
      finally { setLoading(false); }
  };

  const handleDeleteAbsence = async (detail: ReportDetail, studentName: string) => {
    const ok = await showConfirm(
      `Hapus catatan ketidakhadiran (${detail.status}) tanggal ${formatDateIndo(detail.date)} untuk siswa ${studentName}? Tindakan ini akan mengurangi akumulasi ketidakhadiran di buku rapor.`,
      "Hapus Ketidakhadiran Rapor?"
    );
    if (!ok) return;

    try {
      if (detail.table === 'homeroom_attendance') {
        if (detail.id) {
          await supabase.from('homeroom_attendance').delete().eq('id', detail.id);
        } else {
          await supabase.from('homeroom_attendance').delete().eq('date', detail.date);
        }
      } else {
        if (detail.id) {
          await supabase.from('attendance_logs').delete().eq('id', detail.id);
        }
      }

      showAlert("Catatan ketidakhadiran berhasil dihapus.", "Data Dihapus");
      await generateReport();
      if (manageStudent) {
        setManageStudent(prev => {
          if (!prev) return null;
          const updatedDetails = prev.details.filter(d => !(d.date === detail.date && d.status === detail.status));
          return {
            ...prev,
            details: updatedDetails,
            s_count: updatedDetails.filter(d => d.status === 'S').length,
            i_count: updatedDetails.filter(d => d.status === 'I').length,
            a_count: updatedDetails.filter(d => d.status === 'A').length,
            d_count: updatedDetails.filter(d => d.status === 'D').length,
          };
        });
      }
    } catch (err: any) {
      showAlert(`Gagal menghapus: ${err.message || err}`, "Gagal");
    }
  };

  const handleSaveAbsence = async () => {
    if (!editingDetail) return;
    setIsSavingAction(true);
    try {
      const { id, student_id, date, status, table, isNew } = editingDetail;

      if (!isNew && id) {
        if (status === 'H') {
          if (table === 'homeroom_attendance') {
            await supabase.from('homeroom_attendance').delete().eq('id', id);
          } else {
            await supabase.from('attendance_logs').delete().eq('id', id);
          }
          showAlert("Status diubah menjadi Hadir (catatan ketidakhadiran dihapus).", "Berhasil");
        } else {
          if (table === 'homeroom_attendance') {
            const { error } = await supabase
              .from('homeroom_attendance')
              .update({ date, status })
              .eq('id', id);
            if (error) throw error;
          } else {
            const { error } = await supabase
              .from('attendance_logs')
              .update({ status })
              .eq('id', id);
            if (error) throw error;
          }
          showAlert("Catatan ketidakhadiran berhasil diperbarui.", "Berhasil");
        }
      } else {
        const { error } = await supabase
          .from('homeroom_attendance')
          .insert([{
            student_id,
            date,
            status,
            academic_year: academicYear || '2025/2026',
            semester: semester || 'Ganjil',
            recorded_by: profile?.id || null
          }]);
        if (error) throw error;
        showAlert("Catatan ketidakhadiran berhasil ditambahkan.", "Berhasil");
      }

      setEditingDetail(null);
      await generateReport();
    } catch (err: any) {
      showAlert(`Gagal menyimpan: ${err.message || err}`, "Gagal");
    } finally {
      setIsSavingAction(false);
    }
  };

  const handlePrint = () => window.print();

  const handleExportExcel = () => {
    if (reportData.length === 0) {
      alert("Tidak ada data untuk diekspor");
      return;
    }
    let csv = "No,NISN,NIS,Nama Siswa,Kelas,Sakit (S),Izin (I),Alpa (A),Dispensasi (D),Total Ketidakhadiran\n";
    reportData.forEach((s, idx) => {
      const total = (s.s_count || 0) + (s.i_count || 0) + (s.a_count || 0) + (s.d_count || 0);
      csv += `${idx + 1},"${s.nisn || '-'}","${s.nis || '-'}","${s.name}","${selectedClass}",${s.s_count || 0},${s.i_count || 0},${s.a_count || 0},${s.d_count || 0},${total}\n`;
    });
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Rekap_Absensi_Buku_Rapor_Kelas_${selectedClass || 'Semua'}_${startDate}_sd_${endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const currentDateStr = formatDateSignature(new Date());

  const toggleAccordion = (studentId: string) => {
      setExpandedStudentId(prev => prev === studentId ? null : studentId);
  };

  const mainContent = (
    <div className="space-y-6">
      <div className="print:hidden space-y-6">
        <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-400 to-rose-600 text-white flex items-center justify-center shadow-sm">
                    <UserMinus size={20} />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white leading-tight">Absensi Rapor</h2>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Ketidakhadiran murid per kelas wali.</p>
                </div>
            </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <div className="grid md:grid-cols-5 gap-4 items-end">
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Kelas</label>
                    <select 
                        className="w-full border rounded-xl p-3 bg-gray-50 font-bold text-gray-700 focus:ring-2 focus:ring-red-500"
                        value={selectedClass}
                        onChange={e => setSelectedClass(e.target.value)}
                    >
                        <option value="">-- Pilih Kelas --</option>
                        {classes.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 flex items-center gap-1"><CalendarDays size={12}/> Tanggal Awal</label>
                    <input 
                        type="date"
                        className="w-full border rounded-xl p-3 bg-white text-gray-700"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                    />
                </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 flex items-center gap-1"><CalendarDays size={12}/> Tanggal Akhir</label>
                    <input 
                        type="date"
                        className="w-full border rounded-xl p-3 bg-white text-gray-700"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                    />
                </div>
                <div>
                    <button 
                        type="button"
                        onClick={handleExportExcel}
                        disabled={loading || reportData.length === 0}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 transition-all text-xs md:text-sm active:scale-95"
                        title="Download Rekap Absensi Buku Rapor format Excel (CSV)"
                    >
                        <FileSpreadsheet size={18} /> Download Excel
                    </button>
                </div>
                <div>
                    <button 
                        type="button"
                        onClick={handlePrint}
                        disabled={loading || reportData.length === 0}
                        className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 transition-all text-xs md:text-sm active:scale-95"
                        title="Cetak Dokumen Resmi Rekap Rapor (PDF)"
                    >
                        <Printer size={18} /> Cetak / PDF
                    </button>
                </div>
            </div>
             {loading && <div className="mt-4 flex items-center gap-2 text-red-600 text-sm"><Loader2 className="animate-spin" size={16}/> Mengkalkulasi data kehadiran...</div>}
        </div>
      </div>

      {reportData.length > 0 && (
          <div className="mt-8 bg-white p-4 md:p-8 shadow-lg border border-gray-200 print:shadow-none print:border-none print:p-0 print:m-0 print:w-full animate-fade-in rounded-2xl" ref={componentRef}>
             {/* Header Kop Surat */}
            <div className="flex justify-between items-start mb-6 border-b-2 border-black pb-4">
                <div className="flex items-center gap-4">
                     <img src="https://lh3.googleusercontent.com/d/1KtAUvy02qNUB2FzCUoVrNmHtFT0eH2J0" alt="Logo" className="h-12 md:h-20 w-auto" />
                     <div>
                         <h1 className="text-md md:text-xl font-bold uppercase tracking-wide text-black leading-tight">UPT SMP Negeri 8 Pasuruan</h1>
                         <h2 className="text-sm md:text-lg font-bold text-black leading-tight">Rekap Ketidakhadiran (Rapor)</h2>
                         <p className="text-xs md:text-sm text-gray-600">Semester {settings.semester} | Tahun Ajaran {settings.academic_year}</p>
                     </div>
                </div>
                <div className="border-4 border-black p-2 min-w-[50px] md:min-w-[80px] text-center">
                    <span className="text-lg md:text-2xl font-bold text-black block">{selectedClass}</span>
                </div>
            </div>

            {/* Content Table */}
            <div className="overflow-x-auto print:overflow-visible">
                <table className="w-full border-collapse border border-gray-400 text-sm text-black min-w-[600px]">
                    <thead>
                        <tr className="bg-gray-100 text-center text-xs font-bold uppercase">
                            <th className="border border-gray-400 p-2 w-10">No</th>
                            <th className="border border-gray-400 p-2 w-28">NISN</th>
                            <th className="border border-gray-400 p-2 text-left">Nama Murid</th>
                            <th className="border border-gray-400 p-2 w-12 bg-yellow-50">Sakit</th>
                            <th className="border border-gray-400 p-2 w-12 bg-purple-50">Izin</th>
                            <th className="border border-gray-400 p-2 w-12 bg-red-50">Alpa</th>
                            <th className="border border-gray-400 p-2 w-16">Total</th>
                            {isUserAdmin && (
                                <th className="border border-gray-400 p-2 w-20 print:hidden">Aksi</th>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {reportData.map((s, idx) => {
                            const total = s.s_count + s.i_count + s.a_count; 
                            const isExpanded = expandedStudentId === s.id;
                            
                            return (
                                <React.Fragment key={s.id}>
                                    <tr className="hover:bg-gray-50 print:hover:bg-transparent">
                                        <td className="border border-gray-400 p-1.5 text-center">{idx + 1}</td>
                                        <td className="border border-gray-400 p-1.5 text-center font-mono">{s.nisn}</td>
                                        <td className="border border-gray-400 p-1.5 pl-3">
                                            <button 
                                                onClick={() => toggleAccordion(s.id)}
                                                className="font-bold text-left hover:text-purple-600 hover:underline print:no-underline print:text-black text-black w-full flex justify-between items-center group"
                                            >
                                                {s.name}
                                                <span className="text-gray-400 group-hover:text-purple-500 print:hidden">
                                                    {isExpanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                                                </span>
                                            </button>
                                        </td>
                                        <td className="border border-gray-400 p-1.5 text-center">{s.s_count || '-'}</td>
                                        <td className="border border-gray-400 p-1.5 text-center">{s.i_count || '-'}</td>
                                        <td className="border border-gray-400 p-1.5 text-center">{s.a_count || '-'}</td>
                                        <td className="border border-gray-400 p-1.5 text-center font-bold">{total || '-'}</td>
                                        {isUserAdmin && (
                                            <td className="border border-gray-400 p-1.5 text-center print:hidden">
                                                <button
                                                    type="button"
                                                    onClick={() => setManageStudent(s)}
                                                    className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-lg border border-rose-200 inline-flex items-center gap-1 transition-colors shadow-2xs"
                                                    title="Kelola & Edit Ketidakhadiran Siswa"
                                                >
                                                    <Edit3 size={13} />
                                                    <span>Kelola</span>
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                    
                                    {/* ACCORDION ROW */}
                                    {isExpanded && (
                                        <tr className="bg-slate-50 print:hidden animate-fade-in">
                                            <td colSpan={isUserAdmin ? 8 : 7} className="border border-gray-400 p-4">
                                                <div className="text-xs space-y-3">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <p className="font-bold text-slate-700 flex items-center gap-1.5">
                                                            <Calendar size={14} className="text-slate-500" />
                                                            Rincian Ketidakhadiran Siswa:
                                                        </p>
                                                        {isUserAdmin && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setEditingDetail({
                                                                    student_id: s.id,
                                                                    date: getWIBISOString(),
                                                                    status: 'S',
                                                                    source: 'Wali Kelas',
                                                                    table: 'homeroom_attendance',
                                                                    isNew: true
                                                                })}
                                                                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg inline-flex items-center gap-1.5 transition-colors shadow-2xs"
                                                            >
                                                                <Plus size={13} />
                                                                <span>Tambah Ketidakhadiran</span>
                                                            </button>
                                                        )}
                                                    </div>

                                                    {s.details.length > 0 ? (
                                                        <div className="flex flex-wrap gap-2">
                                                            {s.details.map((det, i) => (
                                                                <div key={i} className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
                                                                    det.status === 'S' ? 'bg-yellow-100 border-yellow-200 text-yellow-800' :
                                                                    det.status === 'I' ? 'bg-purple-100 border-purple-200 text-purple-800' :
                                                                    det.status === 'A' ? 'bg-red-100 border-red-200 text-red-800' : 'bg-purple-100 border-purple-200 text-purple-800'
                                                                }`}>
                                                                    <span className="font-mono font-bold">{formatDateIndo(det.date)}</span>
                                                                    <span className="font-extrabold px-1.5 py-0.5 bg-white/70 rounded-md shadow-2xs">{det.status}</span>
                                                                    <span className="text-[10px] opacity-75">({det.source})</span>
                                                                    {isUserAdmin && (
                                                                        <div className="flex items-center gap-1 ml-1 pl-1.5 border-l border-current/25">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setEditingDetail({
                                                                                    id: det.id,
                                                                                    student_id: s.id,
                                                                                    date: det.date,
                                                                                    status: det.status,
                                                                                    source: det.source,
                                                                                    table: det.table,
                                                                                    isNew: false
                                                                                })}
                                                                                className="p-1 hover:bg-white/80 rounded transition-colors"
                                                                                title="Edit Tanggal / Status"
                                                                            >
                                                                                <Edit3 size={13} />
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleDeleteAbsence(det, s.name)}
                                                                                className="p-1 hover:bg-white/80 rounded transition-colors text-red-600"
                                                                                title="Hapus Ketidakhadiran"
                                                                            >
                                                                                <Trash2 size={13} />
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="p-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-center font-medium">
                                                            Hadir penuh (Tidak ada catatan ketidakhadiran pada rentang tanggal ini).
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Signature Area */}
            <div className="mt-10 flex flex-col md:flex-row justify-between text-black break-inside-avoid gap-8 md:gap-0">
                <div className="text-center md:text-left md:ml-4">
                    <p className="mb-16">Mengetahui<br/>Kepala Sekolah,</p>
                    <p className="font-bold underline">{settings.headmaster}</p>
                    <p className="text-sm">NIP {settings.headmaster_nip || '........................'}</p> 
                </div>

                <div className="text-center md:text-left md:mr-10">
                    <p className="mb-16">Kota Pasuruan, {currentDateStr}<br/>Wali Kelas {selectedClass},</p>
                    <p className="font-bold underline">{profile?.full_name}</p>
                    <p className="text-sm">NIP {profile?.nip}</p>
                </div>
            </div>

          </div>
      )}

      {/* MODAL KELOLA SISWA (ADMIN) */}
      {manageStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 bg-gradient-to-r from-rose-600 to-red-600 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Kelola Ketidakhadiran Siswa</h3>
                <p className="text-xs text-rose-100">{manageStudent.name} • {manageStudent.kelas} (NISN: {manageStudent.nisn || '-'})</p>
              </div>
              <button
                type="button"
                onClick={() => setManageStudent(null)}
                className="p-1.5 hover:bg-white/20 rounded-xl transition-colors text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Summary Stats */}
              <div className="grid grid-cols-4 gap-2">
                <div className="p-2.5 bg-yellow-50 dark:bg-yellow-950/40 rounded-xl border border-yellow-200 dark:border-yellow-800/60 text-center">
                  <span className="text-[10px] font-bold text-yellow-700 dark:text-yellow-400 block">Sakit (S)</span>
                  <span className="text-lg font-black text-yellow-800 dark:text-yellow-300">{manageStudent.s_count}</span>
                </div>
                <div className="p-2.5 bg-purple-50 dark:bg-purple-950/40 rounded-xl border border-purple-200 dark:border-purple-800/60 text-center">
                  <span className="text-[10px] font-bold text-purple-700 dark:text-purple-400 block">Izin (I)</span>
                  <span className="text-lg font-black text-purple-800 dark:text-purple-300">{manageStudent.i_count}</span>
                </div>
                <div className="p-2.5 bg-red-50 dark:bg-red-950/40 rounded-xl border border-red-200 dark:border-red-800/60 text-center">
                  <span className="text-[10px] font-bold text-red-700 dark:text-red-400 block">Alpa (A)</span>
                  <span className="text-lg font-black text-red-800 dark:text-red-300">{manageStudent.a_count}</span>
                </div>
                <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                  <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block">Total</span>
                  <span className="text-lg font-black text-slate-800 dark:text-white">
                    {manageStudent.s_count + manageStudent.i_count + manageStudent.a_count}
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Daftar Catatan Ketidakhadiran ({manageStudent.details.length}):
                </span>
                <button
                  type="button"
                  onClick={() => setEditingDetail({
                    student_id: manageStudent.id,
                    date: getWIBISOString(),
                    status: 'S',
                    source: 'Wali Kelas',
                    table: 'homeroom_attendance',
                    isNew: true
                  })}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl inline-flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <Plus size={14} />
                  <span>Tambah Baru</span>
                </button>
              </div>

              {/* List Details */}
              {manageStudent.details.length === 0 ? (
                <div className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400 italic">
                  Siswa ini hadir penuh tanpa catatan ketidakhadiran.
                </div>
              ) : (
                <div className="space-y-2">
                  {manageStudent.details.map((det, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs ${
                          det.status === 'S' ? 'bg-yellow-100 text-yellow-800' :
                          det.status === 'I' ? 'bg-purple-100 text-purple-800' :
                          det.status === 'A' ? 'bg-red-100 text-red-800' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {det.status}
                        </span>
                        <div>
                          <div className="font-bold text-xs text-slate-800 dark:text-slate-100">
                            {formatDateIndo(det.date)}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Sumber: {det.source} ({det.table})
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setEditingDetail({
                            id: det.id,
                            student_id: manageStudent.id,
                            date: det.date,
                            status: det.status,
                            source: det.source,
                            table: det.table,
                            isNew: false
                          })}
                          className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition-colors"
                          title="Edit"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAbsence(det, manageStudent.name)}
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

            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex justify-end">
              <button
                type="button"
                onClick={() => setManageStudent(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-MODAL FORM EDIT/TAMBAH ABSENSI */}
      {editingDetail && (
        <div className="fixed inset-0 z-60 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-slate-800 text-white flex items-center justify-between">
              <h4 className="font-bold text-sm flex items-center gap-2">
                <Edit3 size={16} className="text-rose-400" />
                <span>{editingDetail.isNew ? 'Tambah Ketidakhadiran' : 'Edit Ketidakhadiran'}</span>
              </h4>
              <button
                type="button"
                onClick={() => setEditingDetail(null)}
                className="p-1 hover:bg-white/10 rounded-lg text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Tanggal
                </label>
                <input
                  type="date"
                  value={editingDetail.date}
                  onChange={e => setEditingDetail({ ...editingDetail, date: e.target.value })}
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Status Kehadiran
                </label>
                <select
                  value={editingDetail.status}
                  onChange={e => setEditingDetail({ ...editingDetail, status: e.target.value })}
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-rose-500"
                >
                  <option value="S">Sakit (S)</option>
                  <option value="I">Izin (I)</option>
                  <option value="A">Alpa (A)</option>
                  {!editingDetail.isNew && (
                    <option value="H">Hadir (H) - Hapus Ketidakhadiran</option>
                  )}
                </select>
                {!editingDetail.isNew && (
                  <p className="text-[11px] text-slate-400 mt-1 italic">
                    Pilih "Hadir (H)" untuk membatalkan ketidakhadiran pada tanggal ini.
                  </p>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingDetail(null)}
                disabled={isSavingAction}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveAbsence}
                disabled={isSavingAction}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-sm inline-flex items-center gap-1.5 disabled:opacity-50 transition-all"
              >
                {isSavingAction ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                <span>Simpan</span>
              </button>
            </div>
          </div>
        </div>
      )}
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

export default AbsensiRapor;
