
import React, { useEffect, useState, useRef } from 'react';
import { Layout } from '../components/Layout';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Student, Profile } from '../types';
import {  Printer, Loader2, FileText, Search , UserCheck } from 'lucide-react';
import { formatDateSignature } from '../utils/dateUtils';

interface AttendanceSummary {
  student: Student;
  s: number;
  i: number;
  a: number;
  d: number;
  present: number; // Hadir (bukan S/I/A)
  percentage: string;
}

const RekapAbsensi: React.FC = () => {
  const { profile, academicYear, semester , semesterStart, semesterEnd } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // Dropdown Data
  const [classes, setClasses] = useState<string[]>([]);
  const [subjectsMap, setSubjectsMap] = useState<Record<string, string>>({}); 
  
  // Selection
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  
  // Report Data
  const [reportData, setReportData] = useState<AttendanceSummary[]>([]);
  const [totalMeetings, setTotalMeetings] = useState(0);
  
  // Settings Data (Kop Surat)
  const [settings, setSettings] = useState({
    academic_year: '...',
    semester: '...',
    headmaster: '...',
    headmaster_nip: ''
  });

  const componentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (profile) {
      fetchInitialData();
    }
  }, [profile]);

  useEffect(() => {
    if (selectedClass && selectedSubject) {
      fetchReportData();
    } else {
      setReportData([]);
      setTotalMeetings(0);
    }
  }, [selectedClass, selectedSubject]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Settings
      const { data: settingsData } = await supabase.from('app_settings').select('*');
      const newSettings: any = {};
      settingsData?.forEach(item => newSettings[item.key] = item.value);
      setSettings(prev => ({ ...prev, ...newSettings }));

      // 2. Fetch Guru Schedules
      if (!profile) return;
      
      let { data: schedules, error: schedError } = await supabase
        .from('schedules')
        .select('kelas, subject, academic_year, semester')
        .eq('teacher_id', profile.id)
        .eq('academic_year', academicYear || '2025/2026')
        .eq('semester', semester || 'Ganjil');
        
      if (schedError && (schedError.code === '42703' || schedError.message?.includes('academic_year'))) {
          const fallback = await supabase.from('schedules').select('kelas, subject, academic_year, semester').eq('teacher_id', profile.id);
          if (fallback.data && fallback.data.length > 0 && fallback.data[0].academic_year !== undefined) {
              schedules = fallback.data.filter(s => s.academic_year === (academicYear || '2025/2026') && s.semester === (semester || 'Ganjil'));
          } else {
              schedules = fallback.data;
          }
      }

      if (schedules) {
        // FILTER: Exclude 'Salat Dhuha' from this report because it has its own dedicated menu.
        // Only show academic subjects like PAI, Math, etc.
        const validSchedules = schedules.filter(s => !s.subject.toLowerCase().includes('dhuha'));

        const uniqueClasses = Array.from(new Set(validSchedules.map(s => s.kelas))).sort();
        setClasses(uniqueClasses as string[]);

        const map: Record<string, string> = {};
        validSchedules.forEach(s => {
            // Determine subject for the class (non-Dhuha)
            if (!map[s.kelas]) map[s.kelas] = s.subject;
        });
        setSubjectsMap(map);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const cls = e.target.value;
      setSelectedClass(cls);
      if (cls && subjectsMap[cls]) {
          setSelectedSubject(subjectsMap[cls]);
      } else {
          setSelectedSubject('');
      }
  };

  const fetchReportData = async () => {
    if (!profile) return;
    setLoading(true);
    
    try {
        const { data: students } = await supabase
            .from('students')
            .select('*')
            .eq('kelas', selectedClass)
            .order('name');
        
        if (!students) throw new Error("Tidak ada siswa");

        const { data: journals } = await supabase
            .from('journals')
            .select('id')
            .eq('teacher_id', profile.id)
            .eq('kelas', selectedClass)
            .eq('subject', selectedSubject)
            .eq('academic_year', academicYear || '2025/2026')
            .eq('semester', semester || 'Ganjil')
            .gte('created_at', semesterStart ? `${semesterStart}T00:00:00+07:00` : '2000-01-01T00:00:00+07:00')
            .lte('created_at', semesterEnd ? `${semesterEnd}T23:59:59+07:00` : '2100-01-01T23:59:59+07:00');
        
        const journalIds = journals?.map(j => j.id) || [];
        const meetingsCount = journalIds.length;
        setTotalMeetings(meetingsCount);

        let attendanceLogs: any[] = [];
        if (meetingsCount > 0) {
            const { data: logs } = await supabase
                .from('attendance_logs')
                .select('student_id, status')
                .in('journal_id', journalIds);
            attendanceLogs = logs || [];
        }

        const summary: AttendanceSummary[] = students.map(student => {
            const studentLogs = attendanceLogs.filter(l => l.student_id === student.id);
            const s = studentLogs.filter(l => l.status === 'S').length;
            const i = studentLogs.filter(l => l.status === 'I').length;
            const a = studentLogs.filter(l => l.status === 'A').length;
            const d = studentLogs.filter(l => l.status === 'D').length;
            
            // Perubahan: Hanya Alpa ('A') yang dianggap tidak hadir untuk perhitungan persentase
            const nonPresentCount = a; 
            const presentCount = Math.max(0, meetingsCount - nonPresentCount);
            const percentage = meetingsCount > 0 ? Math.round((presentCount / meetingsCount) * 100) : 100;

            return {
                student, s, i, a, d, present: presentCount, percentage: `${percentage}%`
            };
        });
        setReportData(summary);
    } catch (err) {
        console.error(err);
    } finally {
        setLoading(false);
    }
  };

  const handlePrint = () => window.print();

  // Updated Date Format: "20 Januari 2026"
  const currentDateStr = formatDateSignature(new Date());

  return (
    <Layout>
      <div className="print:hidden space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-green-600 text-white flex items-center justify-center shadow-sm">
                    <UserCheck size={20} />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white leading-tight">Rekap Kehadiran</h2>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Laporan kehadiran murid per mapel.</p>
                </div>
            </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <div className="grid md:grid-cols-3 gap-4 items-end">
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Kelas</label>
                    <select 
                        className="w-full border rounded-xl p-3 bg-gray-50 font-bold text-gray-700 focus:ring-2 focus:ring-purple-500"
                        value={selectedClass}
                        onChange={handleClassChange}
                    >
                        <option value="">-- Pilih Kelas --</option>
                        {classes.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Mata Pelajaran</label>
                    <input 
                        type="text"
                        className="w-full border rounded-xl p-3 bg-gray-50 text-gray-700"
                        value={selectedSubject}
                        readOnly
                        placeholder="Otomatis sesuai kelas..."
                    />
                </div>
                <div>
                    <button 
                        onClick={handlePrint}
                        disabled={!selectedClass || loading || reportData.length === 0}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 transition-all"
                    >
                        <Printer size={20} /> Cetak / PDF
                    </button>
                </div>
            </div>
            
            {loading && <div className="mt-4 flex items-center gap-2 text-purple-600 text-sm"><Loader2 className="animate-spin" size={16}/> Sedang memuat data absensi...</div>}
            {!loading && selectedClass && reportData.length === 0 && (
                <div className="mt-4 p-3 bg-yellow-50 text-yellow-700 rounded-lg text-sm border border-yellow-200 flex items-center gap-2">
                   <Search size={16}/> Belum ada data jurnal/absensi untuk kelas dan mapel ini.
                </div>
            )}
        </div>
      </div>

      {selectedClass && reportData.length > 0 && (
        <div className="mt-8 bg-white p-4 md:p-8 shadow-lg border border-gray-200 print:shadow-none print:border-none print:p-0 print:m-0 print:w-full animate-fade-in rounded-2xl" ref={componentRef}>
            <div className="flex justify-between items-start mb-6 border-b-2 border-black pb-4">
                <div className="flex items-center gap-4">
                     <img src="https://lh3.googleusercontent.com/d/1KtAUvy02qNUB2FzCUoVrNmHtFT0eH2J0" alt="Logo" className="h-12 md:h-20 w-auto" />
                     <div>
                         <h1 className="text-md md:text-xl font-bold uppercase tracking-wide text-black leading-tight">UPT SMP Negeri 8 Pasuruan</h1>
                         <h2 className="text-sm md:text-lg font-bold text-black leading-tight">Rekap Absensi Mata Pelajaran : {selectedSubject}</h2>
                         <p className="text-xs md:text-sm text-gray-600">Semester {settings.semester} | Tahun Ajaran {settings.academic_year}</p>
                     </div>
                </div>
                <div className="border-4 border-black p-2 min-w-[50px] md:min-w-[60px] text-center">
                    <span className="text-lg md:text-2xl font-bold text-black block">{selectedClass}</span>
                </div>
            </div>

            {/* Print Friendly Table: No scrollbar, full visible */}
            <div className="overflow-x-auto print:overflow-visible">
                <table className="w-full border-collapse border border-gray-400 text-sm text-black min-w-[600px]">
                    <thead>
                        <tr className="bg-gray-200 text-center">
                            <th className="border border-gray-400 p-2 w-10" rowSpan={2}>No</th>
                            <th className="border border-gray-400 p-2 w-24" rowSpan={2}>NISN</th>
                            <th className="border border-gray-400 p-2" rowSpan={2}>Nama Murid</th>
                            <th className="border border-gray-400 p-1" colSpan={4}>Ketidakhadiran</th>
                            <th className="border border-gray-400 p-2 w-32" rowSpan={2}>% Kehadiran</th>
                        </tr>
                        <tr className="bg-gray-100 text-center text-xs font-bold">
                            <th className="border border-gray-400 p-1 w-8">S</th>
                            <th className="border border-gray-400 p-1 w-8">I</th>
                            <th className="border border-gray-400 p-1 w-8">A</th>
                            <th className="border border-gray-400 p-1 w-8">D</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reportData.map((item, index) => (
                            <tr key={item.student.id} className="text-center hover:bg-gray-50 print:hover:bg-transparent">
                                <td className="border border-gray-400 p-1.5">{index + 1}</td>
                                <td className="border border-gray-400 p-1.5 font-mono text-xs">{item.student.nisn}</td>
                                <td className="border border-gray-400 p-1.5 text-left pl-3">{item.student.name}</td>
                                <td className="border border-gray-400 p-1.5">{item.s}</td>
                                <td className="border border-gray-400 p-1.5">{item.i}</td>
                                <td className="border border-gray-400 p-1.5">{item.a}</td>
                                <td className="border border-gray-400 p-1.5">{item.d}</td>
                                <td className="border border-gray-400 p-1.5 font-bold">{item.percentage}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="mt-10 flex flex-col md:flex-row justify-between text-black break-inside-avoid gap-8 md:gap-0">
                <div className="text-center md:text-left md:ml-4">
                    <p className="mb-16">Mengetahui<br/>Kepala Sekolah,</p>
                    <p className="font-bold underline">{settings.headmaster}</p>
                    <p className="text-sm">NIP {settings.headmaster_nip || '........................'}</p> 
                </div>

                <div className="text-center md:text-left md:mr-10">
                    <p className="mb-16">Kota Pasuruan, {currentDateStr}<br/>Guru Mata Pelajaran,</p>
                    <p className="font-bold underline">{profile?.full_name}</p>
                    <p className="text-sm">NIP {profile?.nip}</p>
                </div>
            </div>
        </div>
      )}
    </Layout>
  );
};

export default RekapAbsensi;
