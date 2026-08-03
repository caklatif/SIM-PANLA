
import React, { useEffect, useState, useRef } from 'react';
import { Layout } from '../components/Layout';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import {  Printer, Loader2, BookOpen, CheckSquare, Square , TrendingUp } from 'lucide-react';
import { formatDateIndo, formatDateSignature } from '../utils/dateUtils';

interface JournalReportItem {
    id: string;
    created_at: string;
    kelas: string;
    subject: string;
    hours: string;
    material: string;
    validation: string;
    attendance_logs: {
        student_name: string;
        status: string;
    }[];
}

const LaporanJurnal: React.FC = () => {
  const { profile, academicYear, semester , semesterStart, semesterEnd } = useAuth();
  const [loading, setLoading] = useState(false);
  const [journals, setJournals] = useState<JournalReportItem[]>([]);
  
  // Filter settings
  const [settings, setSettings] = useState({
      academic_year: '...',
      semester: '...',
      headmaster: '...',
      headmaster_nip: ''
  });

  const componentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (profile) {
      fetchData();
    }
  }, [profile]);

  const fetchData = async () => {
    setLoading(true);
    try {
        const { data: settingsData } = await supabase.from('app_settings').select('*');
        const newSettings: any = {};
        settingsData?.forEach(item => newSettings[item.key] = item.value);
        setSettings(prev => ({ ...prev, ...newSettings }));

        let query = supabase
            .from('journals')
            .select(`
                id,
                created_at,
                kelas,
                subject,
                hours,
                material,
                validation,
                attendance_logs (
                    student_name,
                    status
                )
            `)
            .eq('teacher_id', profile?.id)
            .eq('academic_year', academicYear || '2025/2026')
            .eq('semester', semester || 'Ganjil');

        if (semesterStart) query = query.gte('created_at', `${semesterStart}T00:00:00+07:00`);
        if (semesterEnd) query = query.lte('created_at', `${semesterEnd}T23:59:59+07:00`);

        const { data: journalData, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;
        setJournals((journalData as any[]) || []);

    } catch (err) {
        console.error("Error fetching report data", err);
    } finally {
        setLoading(false);
    }
  };

  const handlePrint = () => window.print();
  
  // Use Signature Date Format (without Day Name)
  const currentDateStr = formatDateSignature(new Date());

  const renderAttendanceList = (logs: any[]) => {
      const absents = logs.filter(l => ['S', 'I', 'A'].includes(l.status));
      if (absents.length === 0) return "NIHIL";
      
      return (
          <ul className="list-none m-0 p-0">
              {absents.map((l, idx) => (
                  <li key={idx} className="mb-0.5 whitespace-nowrap">
                      {l.student_name} ({l.status})
                  </li>
              ))}
          </ul>
      );
  };

  return (
    <Layout>
      <div className="print:hidden space-y-6 mb-8">
         <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center shadow-sm">
                <TrendingUp size={20} />
            </div>
            <div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-white leading-tight">Laporan Jurnal Guru</h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Rekapitulasi agenda kegiatan belajar mengajar.</p>
            </div>
         </div>

         <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
             <div>
                 <h3 className="font-bold text-gray-700">Filter Laporan</h3>
                 <p className="text-xs text-gray-500">Menampilkan semua jurnal semester ini.</p>
             </div>
             <button 
                onClick={handlePrint}
                className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all w-full md:w-auto justify-center"
             >
                <Printer size={20} /> Cetak Laporan
             </button>
         </div>
      </div>

      {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin text-purple-500" /></div>
      ) : (
          <div className="bg-white p-4 md:p-8 shadow-lg border border-gray-200 print:shadow-none print:border-none print:p-0 print:m-0 print:w-full animate-fade-in rounded-2xl" ref={componentRef}>
              
               <div className="flex items-center gap-4 mb-6 border-b-2 border-black pb-4">
                     <img src="https://lh3.googleusercontent.com/d/1KtAUvy02qNUB2FzCUoVrNmHtFT0eH2J0" alt="Logo" className="h-12 md:h-20 w-auto" />
                     <div>
                         <h1 className="text-md md:text-xl font-bold uppercase tracking-wide text-black leading-tight">UPT SMP Negeri 8 Pasuruan</h1>
                         <h2 className="text-sm md:text-lg font-bold text-black leading-tight">Jurnal Guru: {profile?.full_name}</h2>
                         <p className="text-xs md:text-sm text-gray-600">Rekapitulasi | Semester {settings.semester} - Th. Ajaran {settings.academic_year}</p>
                     </div>
               </div>

               <div className="overflow-x-auto print:overflow-visible">
                   <table className="w-full border-collapse border border-gray-400 text-sm text-black min-w-[700px]">
                       <thead>
                           <tr className="bg-gray-100">
                               <th className="border border-gray-400 p-2 w-10">No</th>
                               <th className="border border-gray-400 p-2 w-48 text-left">Hari, Tanggal<br/>Jam ke</th>
                               <th className="border border-gray-400 p-2 w-16 text-center">Kelas</th>
                               <th className="border border-gray-400 p-2 text-left">Mata Pelajaran<br/>Kegiatan Pembelajaran</th>
                               <th className="border border-gray-400 p-2 w-64 text-left">Ketidakhadiran Murid</th>
                           </tr>
                       </thead>
                       <tbody>
                           {journals.map((journal, index) => (
                               <tr key={journal.id} className="align-top break-inside-avoid">
                                   <td className="border border-gray-400 p-2 text-center font-bold">{index + 1}</td>
                                   <td className="border border-gray-400 p-2">
                                       <div className="font-bold">{formatDateIndo(journal.created_at)}</div>
                                       <div className="text-gray-600">Jam ke {journal.hours}</div>
                                   </td>
                                   <td className="border border-gray-400 p-2 text-center font-bold text-lg">{journal.kelas}</td>
                                   <td className="border border-gray-400 p-2">
                                       <div className="font-bold mb-1">{journal.subject}</div>
                                       <div className="mb-2 whitespace-pre-wrap">{journal.material}</div>
                                       <div className="flex gap-4 text-xs text-gray-600 mt-2">
                                            <div className="flex items-center gap-1">
                                                {journal.validation === 'hadir_kbm' ? <CheckSquare size={14}/> : <Square size={14}/>}
                                                <span>KBM Terlaksana</span>
                                            </div>
                                       </div>
                                   </td>
                                   <td className="border border-gray-400 p-2 text-xs">
                                       {renderAttendanceList(journal.attendance_logs)}
                                   </td>
                               </tr>
                           ))}
                           {journals.length === 0 && (
                               <tr>
                                   <td colSpan={5} className="border border-gray-400 p-8 text-center text-gray-500 italic">
                                       Belum ada data jurnal untuk semester ini.
                                   </td>
                               </tr>
                           )}
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

export default LaporanJurnal;
