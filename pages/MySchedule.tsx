
import React, { useEffect, useState, useRef } from 'react';
import { Layout } from '../components/Layout';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Schedule } from '../types';
import {  Calendar, Clock, BookOpen, Loader2, CalendarDays, Download, ImageIcon , Compass } from 'lucide-react';
import html2canvas from 'html2canvas';
import { showAlert, showConfirm } from '../utils/alert';

const MySchedule: React.FC = () => {
  const { profile, academicYear, semester , activeScheduleVersion } = useAuth();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  
  // Settings for Header
  const [settings, setSettings] = useState({
      academic_year: '...',
      semester: '...',
      headmaster: '',
      headmaster_nip: ''
  });

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (profile) {
        fetchSchedule();
        fetchSettings();
    }
  }, [profile]);

  const fetchSettings = async () => {
      try {
          const { data } = await supabase.from('app_settings').select('*');
          const newSettings: any = {};
          data?.forEach(item => newSettings[item.key] = item.value);
          setSettings(prev => ({ ...prev, ...newSettings }));
      } catch (e) { console.error(e); }
  };

    const fetchSchedule = async () => {
    try {
      let { data, error } = await supabase
        .from('schedules')
        .select('*')
        .eq('teacher_id', profile?.id)
        .eq('academic_year', academicYear || '2025/2026')
        .eq('semester', semester || 'Ganjil')
        .eq('schedule_version', activeScheduleVersion || 'Utama')
        .order('day_of_week')
        .order('hour');
        
      if (error && (error.code === '42703' || error.message?.includes('schedule_version') || error.message?.includes('academic_year'))) {
          const fallback = await supabase.from('schedules').select('*').eq('teacher_id', profile?.id).order('day_of_week').order('hour');
          if (fallback.data && fallback.data.length > 0 && fallback.data[0].academic_year !== undefined) {
              data = fallback.data.filter(s => s.academic_year === (academicYear || '2025/2026') && s.semester === (semester || 'Ganjil'));
          } else {
              data = fallback.data;
          }
          error = fallback.error;
      }

      if (error) throw error;
      console.log('fetchSchedule result:', { data, profile_id: profile?.id, academicYear, semester, activeScheduleVersion });
      if (data) setSchedules(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const dayName = (num: number) => {
    const map = ['', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
    return map[num] || 'Unknown';
  };

  const groupSchedulesByDay = () => {
    const grouped: Record<number, Schedule[]> = {};
    schedules.forEach(s => {
      if (!grouped[s.day_of_week]) grouped[s.day_of_week] = [];
      grouped[s.day_of_week].push(s);
    });
    return grouped;
  };

  const handleDownloadImage = async () => {
      if (!printRef.current) return;
      setDownloading(true);
      try {
          // Wait a bit to ensure rendering
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const canvas = await html2canvas(printRef.current, {
              scale: 2, // Higher quality
              useCORS: true,
              backgroundColor: '#ffffff'
          });

          const link = document.createElement('a');
          link.download = `Jadwal_${profile?.full_name?.replace(/\s+/g, '_')}.png`;
          link.href = canvas.toDataURL('image/png', 1.0);
          link.click();
      } catch (e) {
          showAlert("Gagal mengunduh gambar.");
          console.error(e);
      } finally {
          setDownloading(false);
      }
  };

  const grouped = groupSchedulesByDay();
  const sortedDays = Object.keys(grouped).map(Number).sort((a, b) => a - b);
  
  // Data processing for Table View
  const days = [1, 2, 3, 4, 5, 6]; // Senin - Sabtu
  const hours = [1, 2, 3, 4, 5, 6, 7, 8]; // CHANGED: Limit to 8 hours
  
  const scheduleMap: Record<string, string> = {}; // Key: "day-hour" -> Value: "Class"
  schedules.forEach(s => {
      const sHours = s.hour.split(',').map(h => h.trim());
      sHours.forEach(h => {
          const key = `${s.day_of_week}-${h}`;
          scheduleMap[key] = s.kelas;
      });
  });

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-400 to-indigo-600 text-white flex items-center justify-center shadow-sm">
                    <Compass size={20} />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white leading-tight">Jadwal Mengajar</h2>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Agenda KBM mingguan Anda.</p>
                </div>
            </div>
            
            <button 
                onClick={handleDownloadImage}
                disabled={loading || downloading}
                className="bg-white border border-gray-200 text-gray-700 hover:text-purple-600 hover:border-purple-200 px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-sm transition-all"
            >
                {downloading ? <Loader2 className="animate-spin" size={18}/> : <Download size={18} />}
                Download Jadwal
            </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-pink-500" /></div>
        ) : schedules.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center shadow-sm border border-gray-100">
             <img src="https://cdni.iconscout.com/illustration/premium/thumb/empty-state-2130362-1800926.png" alt="Empty" className="w-40 mx-auto opacity-50 mb-4" />
             <p className="text-gray-500 font-medium">Belum ada jadwal yang ditemukan.</p>
             <p className="text-xs text-gray-400 mt-1">Hubungi Admin Kurikulum untuk input jadwal.</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {sortedDays.map(day => (
              <div key={day} className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-sm border border-white/50 overflow-hidden relative">
                {/* Header Hari */}
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 text-white flex items-center justify-between">
                    <span className="font-bold text-lg flex items-center gap-2">
                        <Calendar size={18} className="text-white/80"/> {dayName(day)}
                    </span>
                    <span className="text-xs bg-white/20 px-2 py-1 rounded-lg backdrop-blur-md">
                        {grouped[day].length} Kelas
                    </span>
                </div>

                {/* List Jam */}
                <div className="p-2">
                    {grouped[day].map((item, idx) => (
                        <div key={item.id} className={`flex items-center gap-4 p-4 rounded-2xl transition-all hover:bg-purple-50/50 ${idx !== grouped[day].length - 1 ? 'border-b border-dashed border-gray-100' : ''}`}>
                            <div className="flex flex-col items-center justify-center w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl font-bold text-center shadow-sm">
                                <span className="text-xs font-normal text-indigo-400">Jam</span>
                                <span className="leading-none">{item.hour}</span>
                            </div>
                            
                            <div className="flex-1">
                                <h3 className="font-bold text-gray-800 text-xl flex items-center gap-2">
                                    Kelas {item.kelas}
                                </h3>
                                <div className="flex items-center gap-2 mt-1 text-gray-600">
                                    <BookOpen size={16} className="text-purple-500" />
                                    <span className="font-medium">{item.subject}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- HIDDEN TABLE FOR DOWNLOAD (Asesoris Lengkap) --- */}
      <div className="fixed top-0 left-0 w-full h-0 overflow-hidden">
          <div 
            ref={printRef} 
            className="w-[1200px] p-10 bg-white font-sans text-slate-900"
          >
              {/* Kop / Header */}
              <div className="border-b-4 border-slate-800 pb-4 mb-6 flex items-center gap-6">
                  <img src="https://lh3.googleusercontent.com/d/1KtAUvy02qNUB2FzCUoVrNmHtFT0eH2J0" className="h-24 w-auto object-contain" alt="Logo" />
                  <div className="flex-1">
                      <h1 className="text-3xl font-extrabold uppercase tracking-widest text-slate-800">UPT SMP Negeri 8 Pasuruan</h1>
                      <h2 className="text-xl font-bold uppercase text-slate-700 mt-1">Jadwal Kegiatan Belajar Mengajar</h2>
                      <div className="flex items-center gap-4 mt-2 text-sm font-bold text-slate-600 uppercase">
                          <span className="bg-slate-100 px-3 py-1 rounded">Semester {settings.semester}</span>
                          <span>•</span>
                          <span className="bg-slate-100 px-3 py-1 rounded">Tahun Ajaran {settings.academic_year}</span>
                      </div>
                  </div>
              </div>

              {/* Guru Info (Inline NIP) */}
              <div className="mb-6 bg-purple-50 p-4 rounded-xl border border-purple-100 flex items-center gap-3">
                  <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                      {profile?.full_name?.charAt(0)}
                  </div>
                  <div>
                      <p className="text-xs text-purple-600 font-bold uppercase tracking-wide">Nama Guru</p>
                      <div className="flex items-baseline gap-2">
                          <p className="text-2xl font-extrabold text-slate-800">{profile?.full_name},</p>
                          <p className="text-lg font-medium text-slate-600">NIP. {profile?.nip || '-'}</p>
                      </div>
                  </div>
              </div>

              {/* Main Schedule Table */}
              <div className="border border-slate-300 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full border-collapse">
                      <thead>
                          <tr className="bg-purple-600 text-white">
                              <th className="p-4 border-r border-purple-500 w-32 uppercase text-sm font-extrabold tracking-wider">Hari</th>
                              {hours.map(h => (
                                  <th key={h} className="p-4 border-l border-purple-500 text-center w-20">
                                      <span className="block text-[10px] opacity-70 font-normal uppercase">Jam Ke</span>
                                      <span className="text-xl font-extrabold">{h}</span>
                                  </th>
                              ))}
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                          {days.map((day) => (
                              <tr key={day} className="odd:bg-white even:bg-slate-50">
                                  <td className="p-4 font-bold text-lg text-slate-800 border-r border-slate-200 uppercase">
                                      {dayName(day)}
                                  </td>
                                  {hours.map(h => {
                                      const key = `${day}-${h}`;
                                      const kelas = scheduleMap[key];
                                      return (
                                          <td key={h} className="p-2 border-l border-slate-200 text-center h-16 align-middle">
                                              {kelas ? (
                                                  <div className="flex flex-col items-center justify-center h-full w-full bg-purple-100 text-purple-800 rounded-lg font-bold shadow-sm">
                                                      {/* CHANGED: Font size increased to 3xl */}
                                                      <span className="text-3xl font-extrabold">{kelas}</span>
                                                  </div>
                                              ) : (
                                                  <span className="text-slate-200 font-bold text-xl">-</span>
                                              )}
                                          </td>
                                      );
                                  })}
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>

              {/* Footer / Signature (Modified: Removed Headmaster Signature) */}
              <div className="mt-6 text-slate-500 text-sm font-medium italic">
                  Dicetak melalui SIM-PANLA pada {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
          </div>
      </div>

    </Layout>
  );
};

export default MySchedule;
