
import React, { useEffect, useState, useRef } from 'react';
import { Layout } from '../components/Layout';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Student } from '../types';
import {  Printer, Loader2, BookX, CalendarDays, ChevronDown, ChevronUp , UserMinus } from 'lucide-react';
import { formatDateSignature, getWIBISOString, formatDateIndo } from '../utils/dateUtils';

interface ReportDetail {
    date: string;
    status: string;
    source: string; // 'Wali' or 'Guru'
}

interface ReportStudent extends Student {
    s_count: number;
    i_count: number;
    a_count: number;
    d_count: number;
    details: ReportDetail[];
}

const AbsensiRapor: React.FC = () => {
  const { profile, academicYear, semester , semesterStart, semesterEnd } = useAuth();
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<ReportStudent[]>([]);
  
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

          const { data: hLogs } = await supabase.from('homeroom_attendance').select('student_id, date, status').eq('academic_year', academicYear || '2025/2026').eq('semester', semester || 'Ganjil').in('student_id', studentIds).gte('date', startDate).lte('date', endDate);
          const { data: tLogs } = await supabase.from('attendance_logs').select('student_id, created_at, status').eq('academic_year', academicYear || '2025/2026').eq('semester', semester || 'Ganjil').gte('created_at', semesterStart ? `${semesterStart}T00:00:00+07:00` : '2000-01-01T00:00:00+07:00').lte('created_at', semesterEnd ? `${semesterEnd}T23:59:59+07:00` : '2100-01-01T23:59:59+07:00').in('student_id', studentIds).gte('created_at', start).lte('created_at', end).neq('status', 'D');

          const processedStudents: ReportStudent[] = students.map(student => {
              let s_total = 0, i_total = 0, a_total = 0, d_total = 0;
              const details: ReportDetail[] = [];

              const hDates = hLogs?.filter(l => l.student_id === student.id).map(l => l.date) || [];
              const tDates = tLogs?.filter(l => l.student_id === student.id).map(l => l.created_at.split('T')[0]) || [];
              const uniqueDates = Array.from(new Set([...hDates, ...tDates])).sort();

              uniqueDates.forEach(date => {
                  let statusFound = '';
                  let sourceFound = '';

                  const hLog = hLogs?.find(l => l.student_id === student.id && l.date === date);
                  if (hLog) {
                      statusFound = hLog.status;
                      sourceFound = 'Wali Kelas';
                  } else {
                      const dayLogs = tLogs?.filter(l => l.student_id === student.id && l.created_at.startsWith(date)) || [];
                      if (dayLogs.length > 0) {
                          const statuses = dayLogs.map(l => l.status);
                          if (statuses.includes('S')) statusFound = 'S';
                          else if (statuses.includes('I')) statusFound = 'I';
                          else if (statuses.includes('A')) statusFound = 'A';
                          else if (statuses.includes('D')) statusFound = 'D';
                          
                          if (statusFound) sourceFound = 'Guru Mapel';
                      }
                  }

                  if (statusFound) {
                      details.push({ date, status: statusFound, source: sourceFound });
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

  const handlePrint = () => window.print();
  const currentDateStr = formatDateSignature(new Date());

  const toggleAccordion = (studentId: string) => {
      setExpandedStudentId(prev => prev === studentId ? null : studentId);
  };

  return (
    <Layout>
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
            <div className="grid md:grid-cols-4 gap-4 items-end">
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
                        onClick={handlePrint}
                        disabled={loading || reportData.length === 0}
                        className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 transition-all"
                    >
                        <Printer size={20} /> Cetak / PDF
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
                                    </tr>
                                    
                                    {/* ACCORDION ROW */}
                                    {isExpanded && s.details.length > 0 && (
                                        <tr className="bg-slate-50 print:hidden animate-fade-in">
                                            <td colSpan={7} className="border border-gray-400 p-4">
                                                <div className="text-xs">
                                                    <p className="font-bold text-slate-500 mb-2">Rincian Ketidakhadiran:</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {s.details.map((det, i) => (
                                                            <div key={i} className={`flex items-center gap-2 p-2 rounded border ${
                                                                det.status === 'S' ? 'bg-yellow-100 border-yellow-200 text-yellow-800' :
                                                                det.status === 'I' ? 'bg-purple-100 border-purple-200 text-purple-800' :
                                                                det.status === 'A' ? 'bg-red-100 border-red-200 text-red-800' : 'bg-purple-100 border-purple-200 text-purple-800'
                                                            }`}>
                                                                <span className="font-mono font-bold">{formatDateIndo(det.date)}</span>
                                                                <span className="font-extrabold px-1 bg-white/50 rounded">{det.status}</span>
                                                                <span className="text-[10px] opacity-70">({det.source})</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                    {isExpanded && s.details.length === 0 && (
                                        <tr className="bg-slate-50 print:hidden animate-fade-in">
                                            <td colSpan={7} className="border border-gray-400 p-3 text-center text-xs text-gray-400 italic">
                                                Hadir penuh (Tidak ada catatan ketidakhadiran).
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
    </Layout>
  );
};

export default AbsensiRapor;
