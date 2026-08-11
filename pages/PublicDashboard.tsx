import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { PublicStats } from '../types';
import {  LogIn, Loader2, BookOpen, AlertCircle, X, School, ChevronDown, ChevronRight, Bookmark, Lock, User, ArrowRight, ShieldCheck, GraduationCap, MonitorPlay, Shield, ChevronLeft, Eye, EyeOff, BookX, Calendar, Check, Clock , CheckCircle2 } from 'lucide-react';
import { getWIBDate, getWIBISOString, formatDateIndo, formatTimeIndo } from '../utils/dateUtils';

const PublicDashboard: React.FC = () => {
  const { academicYear, semester , semesterStart, semesterEnd } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginViewMode, setLoginViewMode] = useState<'selection' | 'form'>('selection');
  const [selectedRoleLabel, setSelectedRoleLabel] = useState('');
  const [userId, setUserId] = useState(() => localStorage.getItem('saved_nip') || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signIn } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [time, setTime] = useState(getWIBDate());
  
  const [rawAttendance, setRawAttendance] = useState<any[]>([]);
  const [studentClassMap, setStudentClassMap] = useState<Record<string, string>>({});

  const [modalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState<{
    title: string;
    type: 'class' | 'absence';
    data: any;
  } | null>(null);
  const [expandedClass, setExpandedClass] = useState<string | null>(null);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(getWIBDate()), 1000);
    fetchData();

    if (isSupabaseConfigured) {
        const channel = supabase
            .channel('public-dashboard-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_logs' }, () => { fetchStatsClientSide(); })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'journals' }, () => { fetchStatsClientSide(); })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'homeroom_attendance' }, () => { fetchStatsClientSide(); })
            .subscribe();

        return () => { clearInterval(timer); supabase.removeChannel(channel); };
    }
    return () => clearInterval(timer);
  }, [academicYear, semester, semesterStart, semesterEnd]);

  const fetchData = async () => {
    setLoading(true);
    await fetchStatsClientSide();
    setLoading(false);
  };

  const useMockData = () => { 
      setStats({
          count7: 0, count8: 0, count9: 0,
          classDetails: {}, classGenderDetails: {},
          totalJpRequired: 100, completedJp: 0,
          absenceCount: 0, absenceDetails: {S:0, I:0, A:0},
          absencePerClass: {}, unfilledKbm: []
      });
  };

  const fetchStatsClientSide = async () => {
    const todayStr = getWIBISOString();
    const startOfDay = `${todayStr}T00:00:00+07:00`;
    const endOfDay = `${todayStr}T23:59:59+07:00`;

    const todayObj = new Date(todayStr);
    const jsDay = todayObj.getDay();
    let jpPerClass = 0;
    if (jsDay === 1) jpPerClass = 7;
    else if (jsDay >= 2 && jsDay <= 4) jpPerClass = 8;
    else if (jsDay === 5) jpPerClass = 5;
    else if (jsDay === 6) jpPerClass = 6;
    
    if (!isSupabaseConfigured) {
        useMockData(); return;
    }

    try {
        const fallbackQuery = async (queryFn: any) => {
            const res = await queryFn();
            if (res.error && res.error.code === '42703') {
                console.warn('Fallback query used due to missing column');
                // If it fails due to column not found, we try without semester and academic year
            }
            return res;
        };
        let studentsRes = await supabase.from('students').select('id, name, kelas, gender');
        if (studentsRes.error) {
            console.error('Error fetching students with gender:', studentsRes.error);
            studentsRes = await supabase.from('students').select('id, name, kelas');
        }
        
        const [journalsRes, attendanceRes, homeroomRes, profilesRes] = await Promise.all([
            supabase.from('journals').select('hours, kelas').gte('created_at', startOfDay).lte('created_at', endOfDay),
            supabase.from('attendance_logs').select('student_id, student_name, status, created_at, subject').gte('created_at', startOfDay).lte('created_at', endOfDay),
            supabase.from('homeroom_attendance').select('student_id, status, kelas, created_by').eq('date', todayStr),
            supabase.from('profiles').select('id, role, nip, full_name')
        ]);

        const classCounts: Record<string, number> = {};
        const classGenderCounts: Record<string, { L: number, P: number }> = {};
        const sClassMap: Record<string, string> = {}; 
        const sNameMap: Record<string, string> = {};
        let c7 = 0, c8 = 0, c9 = 0;
        
        console.log("studentsRes:", studentsRes);
        console.log("journalsRes:", journalsRes);
        console.log("attendanceRes:", attendanceRes);
        console.log("homeroomRes:", homeroomRes);
        if (studentsRes.data) {
            studentsRes.data.forEach((s: any) => {
                const rawKelas = s.kelas ? s.kelas.toUpperCase().trim() : '';
                const gender = s.gender === 'P' ? 'P' : 'L';
                sClassMap[s.id] = rawKelas;
                if (s.name) sNameMap[s.id] = s.name;
                if (rawKelas) {
                    classCounts[rawKelas] = (classCounts[rawKelas] || 0) + 1;
                    if (!classGenderCounts[rawKelas]) classGenderCounts[rawKelas] = { L: 0, P: 0 };
                    classGenderCounts[rawKelas][gender]++;
                    
                    if (/(?:^|\s|-)(7|VII(?![I]))/i.test(rawKelas)) c7++;
                    else if (/(?:^|\s|-)(8|VIII)/i.test(rawKelas)) c8++;
                    else if (/(?:^|\s|-)(9|IX)/i.test(rawKelas)) c9++;
                }
            });
        }
        setStudentClassMap(sClassMap);

        let completedJp = 0;
        const classesWithJournalsSet = new Set<string>();
        if (journalsRes.data) {
            journalsRes.data.forEach((j: any) => {
                if (j.kelas) classesWithJournalsSet.add(j.kelas.toUpperCase().trim());
                if (typeof j.hours === 'string') {
                    const parts = j.hours.split(',').filter((h: string) => h.trim().length > 0);
                    completedJp += parts.length;
                }
            });
        }

        const profileRoleMap: Record<string, { role?: string; nip?: string; name?: string }> = {};
        if (profilesRes?.data) {
            profilesRes.data.forEach((p: any) => {
                if (p.id) profileRoleMap[p.id] = { role: p.role, nip: p.nip, name: p.full_name };
            });
        }

        const combinedAttendance: Record<string, {name: string, status: string, source: 'Wali' | 'TU' | 'Guru'}> = {};

        if (homeroomRes.data) {
            homeroomRes.data.forEach((h: any) => {
                if (['S', 'I', 'A', 'D'].includes(h.status)) {
                    const studentName = sNameMap[h.student_id] || h.student_name || '';
                    let src: 'Wali' | 'TU' | 'Guru' = 'Wali';
                    if (h.created_by) {
                        const creator = profileRoleMap[h.created_by];
                        if (creator) {
                            const r = (creator.role || '').toLowerCase();
                            const nip = String(creator.nip || '');
                            const name = (creator.name || '').toLowerCase();
                            if (r === 'operator' || r === 'admin' || nip === '112233' || nip === '20535439' || name.includes('admin') || name.includes('operator') || name.includes('tata usaha') || name.includes('tu')) {
                                src = 'TU';
                            } else {
                                src = 'Wali';
                            }
                        } else {
                            src = 'TU';
                        }
                    } else {
                        src = 'TU';
                    }
                    combinedAttendance[h.student_id] = { name: studentName || 'Loading...', status: h.status, source: src };
                }
            });
        }

        if (attendanceRes.data) {
            attendanceRes.data.forEach((log: any) => {
                if (['S', 'I', 'A', 'D'].includes(log.status)) {
                    if (!combinedAttendance[log.student_id]) {
                        const studentName = log.student_name || sNameMap[log.student_id] || 'Siswa';
                        combinedAttendance[log.student_id] = { name: studentName, status: log.status, source: 'Guru' };
                    } else if ((combinedAttendance[log.student_id].name === 'Loading...' || !combinedAttendance[log.student_id].name) && log.student_name) {
                        combinedAttendance[log.student_id].name = log.student_name;
                    }
                }
            });
        }

        const missingIds = Object.keys(combinedAttendance).filter(id => !combinedAttendance[id].name || combinedAttendance[id].name === 'Loading...');
        if (missingIds.length > 0) {
            const { data: missingStudents } = await supabase.from('students').select('id, name, kelas').in('id', missingIds);
            if (missingStudents) {
                missingStudents.forEach((s: any) => {
                    if (s.name && combinedAttendance[s.id]) {
                        combinedAttendance[s.id].name = s.name;
                    }
                    if (s.kelas) {
                        sClassMap[s.id] = s.kelas.toUpperCase().trim();
                    }
                });
            }
        }

        const finalAttendanceList = Object.entries(combinedAttendance).map(([id, data]) => ({
            student_id: id,
            name: data.name && data.name !== 'Loading...' ? data.name : (sNameMap[id] || 'Siswa'),
            status: data.status,
            source: data.source
        }));

        const activeClassesCount = Object.keys(classCounts).length;
        const calculatedTotalJp = activeClassesCount * jpPerClass;

        setRawAttendance(finalAttendanceList);

        let sCount = 0, iCount = 0, aCount = 0, dCount = 0;
        const absencePerClass: Record<string, number> = {};
        Object.keys(classCounts).forEach(cls => absencePerClass[cls] = 0);

        finalAttendanceList.forEach((log) => {
            if (log.status === 'S') sCount++;
            else if (log.status === 'I') iCount++;
            else if (log.status === 'A') aCount++;
            else if (log.status === 'D') dCount++;
            
            const cls = sClassMap[log.student_id];
            if (cls) absencePerClass[cls] = (absencePerClass[cls] || 0) + 1;
        });

        setStats({
            count7: c7, count8: c8, count9: c9,
            classDetails: classCounts, classGenderDetails: classGenderCounts,
            totalJpRequired: calculatedTotalJp, 
            completedJp: completedJp,
            absenceCount: sCount + iCount + aCount + dCount,
            absenceDetails: { S: sCount, I: iCount, A: aCount, D: dCount },
            absencePerClass: absencePerClass,
            unfilledKbm: [],
            classesWithJournals: Array.from(classesWithJournalsSet)
        });
    } catch (err: any) { console.error('FETCH ERROR:', err); alert('Fetch error: ' + (err.message || JSON.stringify(err))); }
  };

  
  const handleRoleSelect = (role: 'guru' | 'operator' | 'admin') => {
      if (role === 'operator') {
          navigate('/operator-dashboard');
      } else {
          setSelectedRoleLabel(role === 'admin' ? 'Administrator' : 'Guru / Staf');
          setLoginViewMode('form');
      }
  };

  const handleLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoginError('');
      setIsSubmitting(true);
      try {
          const { error } = await signIn(userId, password);
          if (error) {
              if (error.message === 'Failed to fetch') {
                  setLoginError('Gagal terhubung ke Database.');
              } else if (error.message.includes('Invalid login')) {
                  setLoginError('NIP atau Password salah.');
              } else {
                  setLoginError(error.message);
              }
              setIsSubmitting(false);
          } else {
              localStorage.setItem('saved_nip', userId);
              navigate('/dashboard', { state: { justLoggedIn: true } });
          }
      } catch (err: any) {
          setLoginError(err.message || 'Gagal login. Periksa kembali NIP/Username dan Password.');
          setIsSubmitting(false);
      }
  };

  const handleClassClick = (grade: string) => {
      if (!stats) return;
      const details = Object.entries(stats.classDetails).filter(([cls]) => {
          if (grade === '7') return /^7|^VII(?![I])/.test(cls);
          if (grade === '8') return /^8|^VIII/.test(cls);
          if (grade === '9') return /^9|^IX/.test(cls);
          return cls.startsWith(grade);
      }).sort(); 
      setModalContent({ title: `Rincian Murid Kelas ${grade}`, type: 'class', data: details });
      setModalOpen(true);
  };

  const handleAbsenceClick = () => {
      if (!stats) return;
      setExpandedClass(null);
      setSelectedStatusFilter(null);
      setModalContent({ title: 'Rincian Ketidakhadiran Hari Ini', type: 'absence', data: stats });
      setModalOpen(true);
  };

  const getAbsentStudentsForClass = (cls: string) => {
      let absentStudents = rawAttendance.filter(log => studentClassMap[log.student_id] === cls);
      if (selectedStatusFilter) {
          absentStudents = absentStudents.filter(log => log.status === selectedStatusFilter);
      }
      return absentStudents.map(s => ({
          name: (s.name && s.name !== 'Loading...') ? s.name : 'Siswa', 
          status: s.status,
          source: s.source
      }));
  };

  return (
    <div className="min-h-screen bg-[#F9F7FF] font-sans selection:bg-purple-200">
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          {/* Very soft background gradient/glows similar to image */}
          <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-purple-100/60 to-transparent"></div>
      </div>

      <div className="relative z-10 max-w-[600px] mx-auto px-3 py-6 md:py-10 space-y-4">
          
          {/* 1. TOP HEADER CARD */}
          <style>{`
                @keyframes neon-sweep-slow {
                  0% { background-position: -200% 50%; }
                  100% { background-position: 200% 50%; }
                }
                .neon-sweep-anim {
                  background: linear-gradient(90deg, transparent 0%, rgba(168,85,247,0.1) 20%, rgba(168,85,247,0.8) 50%, rgba(168,85,247,0.1) 80%, transparent 100%);
                  background-size: 200% 100%;
                  animation: neon-sweep-slow 8s ease-in-out infinite;
                }
              `}</style>
          <div className="relative rounded-[2rem] group">
              {/* Neon glow effect sweeping from left to right */}
              <div className="absolute -inset-[3px] rounded-[2rem] neon-sweep-anim blur-[8px] opacity-100 z-0"></div>
              
              <div className="bg-white rounded-[2rem] p-2 sm:p-2.5 relative flex flex-col justify-center shadow-md h-full w-full z-10">
                  {/* Decorative background glow */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gradient-to-br from-purple-100/40 via-transparent to-cyan-50/40 opacity-70 pointer-events-none rounded-[calc(2rem-2px)]"></div>
                  
                  <div className="flex items-center justify-between z-10 relative h-full gap-2 w-full">
                      <div className="flex items-center gap-2 sm:gap-3 flex-1">
                          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-cyan-50 to-purple-50 shadow-sm border border-white rounded-[14px] flex items-center justify-center p-0.5 shrink-0 relative overflow-hidden">
                              <img src="https://lh3.googleusercontent.com/d/1KtAUvy02qNUB2FzCUoVrNmHtFT0eH2J0" alt="Logo" className="w-full h-full object-contain drop-shadow-md" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                          </div>
                          <div className="flex flex-col justify-center">
                              <h1 className="text-[16px] sm:text-[18px] mt-0 -ml-[4px] text-slate-800 leading-[1.15] tracking-normal mb-0.5 uppercase drop-shadow-sm" style={{ fontFamily: "'Stormfaze', sans-serif" }}>UPT SMP NEGERI 8<br/>PASURUAN</h1>
                              <p className="text-[20px] sm:text-[23px] -ml-[4px] font-bold tracking-wider leading-none mt-0.5" style={{ fontFamily: "'Alphacorsa', sans-serif", color: '#ffffff', WebkitTextStroke: '0.85px #9333ea', textShadow: '1px 1px 2px rgba(147, 51, 234, 0.4)', letterSpacing: '0.05em' }}>SIM-PANLA</p>
                          </div>
                      </div>
                      
                      {/* Separated Clock & Date Label Area */}
                      <div className="flex flex-col items-end gap-1.5 shrink-0 justify-center rounded-[1.25rem] px-2 py-1 relative">
                          {/* Inner divider */}
                          <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-[2px] h-[60%] bg-gradient-to-b from-purple-200 via-purple-400 to-purple-200 rounded-full hidden min-[450px]:block" />
                          
                          <div className="flex items-center gap-1.5">
                              <div className="w-6 h-6 sm:w-7 sm:h-7 bg-white rounded-full flex items-center justify-center text-purple-500 shrink-0 border border-purple-100 shadow-sm">
                                  <Calendar size={13} strokeWidth={2.5} />
                              </div>
                              <div className="flex items-baseline gap-1">
                                  <style>{"@import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap');"}</style>
                                  <span className="text-[22px] sm:text-[28px] font-black tracking-widest leading-none text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-purple-600 drop-shadow-sm" style={{ fontFamily: "'Share Tech Mono', monospace", paddingBottom: "2px" }}>{formatTimeIndo(time).replace(' WIB', '')}</span>
                                  <span className="text-[9px] sm:text-[10px] font-bold text-slate-600 uppercase">WIB</span>
                              </div>
                          </div>
                          <div className="bg-white border border-slate-200 rounded-full px-2 py-0.5 shadow-sm self-end">
                              <p className="text-[9px] sm:text-[10px] font-bold text-slate-700">{formatDateIndo(time)}</p>
                          </div>
                      </div>
                  </div>
              </div>
          </div>

          {/* 2. ACADEMIC YEAR PILL */}
          <div className="relative rounded-full p-[2px] mt-4 bg-gradient-to-r from-purple-300 via-indigo-100 to-cyan-200 shadow-[0_8px_30px_rgba(168,85,247,0.15)] w-full">
              <div className="bg-white rounded-full px-2 py-1.5 sm:px-3 sm:py-2 flex items-center gap-2 sm:gap-4 relative overflow-hidden shadow-inner">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-50/50 to-cyan-50/50 opacity-50 pointer-events-none"></div>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-slate-600 to-slate-800 rounded-full flex items-center justify-center text-cyan-100 shadow-md relative z-10 border border-slate-600 shrink-0">
                      <GraduationCap size={16} strokeWidth={2.5} className="sm:w-[18px] sm:h-[18px]"/>
                  </div>
                  <div className="text-[10px] sm:text-[14px] text-slate-800 relative z-10 tracking-wide flex-1 text-center min-[400px]:text-left leading-tight pt-0.5 sm:pt-1" style={{ fontFamily: "'Good Timing', sans-serif" }}>
                      Tahun Ajaran: {academicYear || '-'} <span className="mx-1 sm:mx-2 text-slate-300 font-normal" style={{ fontFamily: 'sans-serif' }}>|</span> Semester: {semester === '1' || semester === 'Ganjil' ? 'Ganjil' : (semester === '2' || semester === 'Genap' ? 'Genap' : 'Ganjil')}
                  </div>
              </div>
          </div>

          {/* 3. CLASS CARDS */}
          {loading || !stats ? (
              <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-purple-600" size={32}/></div>
          ) : (
              <>
                  <div className="grid grid-cols-3 gap-3">
                      {/* Kelas 7 */}
                      <button onClick={() => handleClassClick('7')} className="bg-white rounded-[1.5rem] p-4 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 text-left relative overflow-hidden group hover:shadow-md transition-all">
                          <svg className="absolute bottom-0 left-0 w-full h-auto text-emerald-100/80 group-hover:text-emerald-200/80 transition-colors" viewBox="0 0 100 40" preserveAspectRatio="none">
                              <path fill="currentColor" d="M0,20 Q25,40 50,20 T100,20 L100,40 L0,40 Z"></path>
                          </svg>
                          <div className="w-8 h-8 rounded-full border border-emerald-200 flex items-center justify-center text-emerald-600 mb-4 bg-white relative z-10 shadow-sm">
                              <User size={14} strokeWidth={2.5} />
                          </div>
                          <div className="relative z-10">
                              <div className="text-[28px] font-black text-slate-800 tracking-tighter leading-none">{stats.count7}</div>
                              <div className="text-[10px] font-bold text-emerald-600 mt-1.5 uppercase">Kelas 7</div>
                              <div className="w-6 h-1 bg-emerald-500 rounded-full mt-2.5"></div>
                          </div>
                      </button>

                      {/* Kelas 8 */}
                      <button onClick={() => handleClassClick('8')} className="bg-white rounded-[1.5rem] p-4 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 text-left relative overflow-hidden group hover:shadow-md transition-all">
                          <svg className="absolute bottom-0 left-0 w-full h-auto text-orange-100/80 group-hover:text-orange-200/80 transition-colors" viewBox="0 0 100 40" preserveAspectRatio="none">
                              <path fill="currentColor" d="M0,20 Q25,40 50,20 T100,20 L100,40 L0,40 Z"></path>
                          </svg>
                          <div className="w-8 h-8 rounded-full border border-orange-200 flex items-center justify-center text-orange-500 mb-4 bg-white relative z-10 shadow-sm">
                              <User size={14} strokeWidth={2.5} />
                          </div>
                          <div className="relative z-10">
                              <div className="text-[28px] font-black text-slate-800 tracking-tighter leading-none">{stats.count8}</div>
                              <div className="text-[10px] font-bold text-orange-500 mt-1.5 uppercase">Kelas 8</div>
                              <div className="w-6 h-1 bg-orange-500 rounded-full mt-2.5"></div>
                          </div>
                      </button>

                      {/* Kelas 9 */}
                      <button onClick={() => handleClassClick('9')} className="bg-white rounded-[1.5rem] p-4 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 text-left relative overflow-hidden group hover:shadow-md transition-all">
                          <svg className="absolute bottom-0 left-0 w-full h-auto text-rose-100/80 group-hover:text-rose-200/80 transition-colors" viewBox="0 0 100 40" preserveAspectRatio="none">
                              <path fill="currentColor" d="M0,20 Q25,40 50,20 T100,20 L100,40 L0,40 Z"></path>
                          </svg>
                          <div className="w-8 h-8 rounded-full border border-rose-200 flex items-center justify-center text-rose-500 mb-4 bg-white relative z-10 shadow-sm">
                              <User size={14} strokeWidth={2.5} />
                          </div>
                          <div className="relative z-10">
                              <div className="text-[28px] font-black text-slate-800 tracking-tighter leading-none">{stats.count9}</div>
                              <div className="text-[10px] font-bold text-rose-500 mt-1.5 uppercase">Kelas 9</div>
                              <div className="w-6 h-1 bg-rose-500 rounded-full mt-2.5"></div>
                          </div>
                      </button>
                  </div>

                  {/* 4. SUMMARY ROW */}
                  <div className="grid grid-cols-2 gap-3">
                      {/* KBM Terlaksana */}
                      <button 
                          onClick={() => navigate('/operator-dashboard')}
                          className="bg-white rounded-[1.75rem] p-5 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 relative overflow-hidden flex flex-col justify-between min-h-[140px] text-left hover:shadow-md transition-all group active:scale-[0.98] cursor-pointer"
                      >
                          <div className="absolute bottom-0 right-0 w-32 h-32 bg-purple-50/50 rounded-tl-full transition-colors z-0"></div>
                          
                          <div className="w-[34px] h-[34px] rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100 relative z-10">
                              <BookOpen size={18} strokeWidth={2} />
                          </div>
                          
                          <div className="relative z-10 mt-auto">
                              <div className="flex items-baseline gap-1">
                                  <span className="text-[32px] font-black text-purple-700 tracking-tighter leading-none">{stats.completedJp}</span>
                                  <span className="text-[11px] font-bold text-slate-600">/ {stats.totalJpRequired} JP</span>
                              </div>
                              <div className="text-[10px] font-black text-slate-700 uppercase mt-2 tracking-wide leading-tight">KBM Terlaksana</div>
                          </div>

                          {/* 3D-like Icon Simulation */}
                          <div className="absolute right-3 top-3.5 w-[50px] h-[50px] sm:w-[58px] sm:h-[58px] bg-gradient-to-br from-[#c4b5fd] to-[#8b5cf6] rounded-[1.2rem] shadow-[0_6px_14px_rgba(139,92,246,0.25)] flex items-center justify-center transform -rotate-3 border-t-[3px] border-l-[3px] border-white/40 z-10 pointer-events-none">
                              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-xl shadow-inner flex items-center justify-center relative overflow-hidden">
                                 <div className="absolute top-0 w-full h-2 bg-gradient-to-b from-slate-100 to-white"></div>
                                 <Check size={20} strokeWidth={4} className="text-[#8b5cf6] drop-shadow-sm z-10 sm:hidden" />
                                 <Check size={24} strokeWidth={4} className="text-[#8b5cf6] drop-shadow-sm z-10 hidden sm:block" />
                              </div>
                              {/* Binder rings */}
                              <div className="absolute -top-1.5 left-2.5 sm:left-3 w-1.5 h-3 bg-slate-200 rounded-full shadow-sm border border-slate-300"></div>
                              <div className="absolute -top-1.5 right-2.5 sm:right-3 w-1.5 h-3 bg-slate-200 rounded-full shadow-sm border border-slate-300"></div>
                          </div>
                      </button>

                      {/* Ketidakhadiran */}
                      <button onClick={handleAbsenceClick} className="bg-white rounded-[1.75rem] p-5 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 relative overflow-hidden flex flex-col justify-between min-h-[140px] text-left hover:shadow-md transition-all group">
                          <div className="absolute bottom-0 right-0 w-32 h-32 bg-orange-50/50 rounded-tl-full transition-colors z-0"></div>
                          
                          <div className="w-[34px] h-[34px] rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-100 relative z-10">
                              <AlertCircle size={18} strokeWidth={2} />
                          </div>
                          
                          <div className="relative z-10 mt-auto">
                              <div className="text-[32px] font-black text-orange-500 tracking-tighter leading-none">{stats.absenceCount}</div>
                              <div className="text-[10px] font-black text-slate-700 uppercase mt-2 tracking-wide leading-tight">Ketidakhadiran<br/>Murid</div>
                          </div>

                           {/* 3D-like Icon Simulation */}
                           <div className="absolute right-3 top-3.5 w-[46px] h-[52px] sm:w-[54px] sm:h-[60px] bg-gradient-to-br from-[#fed7aa] to-[#f97316] rounded-xl shadow-[0_6px_14px_rgba(249,115,22,0.25)] flex flex-col items-center justify-center transform rotate-6 border-t-[3px] border-l-[3px] border-white/50 z-10 pt-2 pointer-events-none">
                              {/* Paper */}
                              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white rounded shadow-inner flex flex-col items-center justify-center gap-1">
                                  <div className="w-5 h-0.5 sm:w-6 bg-slate-200 rounded-full"></div>
                                  <div className="w-5 h-0.5 sm:w-6 bg-slate-200 rounded-full"></div>
                                  <div className="w-3 h-0.5 sm:w-4 bg-slate-200 rounded-full mr-2"></div>
                              </div>
                              {/* Clip */}
                              <div className="absolute -top-1 w-5 sm:w-6 h-2.5 sm:h-3 bg-slate-700 rounded-md shadow-md border-b-2 border-slate-800"></div>
                              <div className="absolute -top-3 w-3 h-3 border-2 border-slate-700 rounded-full"></div>
                              
                              {/* Alert Badge */}
                              <div className="absolute -right-1.5 -bottom-1.5 w-5 h-5 sm:w-6 sm:h-6 bg-orange-500 rounded-full border-2 border-white flex items-center justify-center shadow-lg text-white font-black text-[10px] sm:text-[12px] leading-none">!</div>
                          </div>
                      </button>
                  </div>

                  {/* 5. PROGRESS BAR */}
                  <div className="bg-white rounded-[1.5rem] p-4 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 flex items-center gap-4 sm:gap-5">
                      {(() => {
                          const percentage = stats.totalJpRequired > 0 ? (Math.round((stats.completedJp / stats.totalJpRequired) * 1000) / 10) : 0;
                          return (
                              <>
                                  {/* Icon */}
                                  <div className="w-[60px] h-[60px] sm:w-[72px] sm:h-[72px] rounded-full bg-purple-100 shadow-[0_4px_20px_rgba(147, 51, 234, 0.12)] flex items-center justify-center shrink-0 border-[3px] border-white">
                                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-purple-600">
                                          <path d="M22 6L14.5 13.5L9.5 8.5L2 16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                                          <path d="M16 6H22V12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                                          <path d="M12 21V13" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                                          <path d="M18 21V16" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                                          <path d="M6 21V17" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                                      </svg>
                                  </div>
                                  
                                  <div className="flex-1 flex flex-col justify-center">
                                      <span className="text-[12px] sm:text-[13px] font-black text-slate-800 tracking-wide mb-2">PROGRESS KBM HARI INI</span>
                                      
                                      <div className="flex items-center gap-4">
                                          <div className="flex-1 flex flex-col gap-1.5">
                                              <div className="h-2.5 sm:h-3 w-full bg-purple-100 rounded-full overflow-hidden">
                                                  <div className="h-full bg-purple-600 rounded-full transition-all duration-1000 ease-out" style={{ width: `${percentage}%`}}></div>
                                              </div>
                                              <span className="text-[11px] sm:text-[12px] font-semibold text-slate-600">{percentage}% Terlaksana</span>
                                          </div>
                                          <div className="text-[26px] sm:text-[32px] font-black text-purple-600 leading-none shrink-0">
                                              {percentage}%
                                          </div>
                                      </div>
                                  </div>
                              </>
                          );
                      })()}
                  </div>
              </>
          )}

          {/* 6. LOGIN BUTTON */}
          <button 
              onClick={() => setShowLoginModal(true)}
              className="w-full bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-3xl py-4 flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 hover:shadow-xl hover:shadow-purple-500/30 transition-all active:scale-[0.98] mt-2 group"
          >
              <LogIn size={20} strokeWidth={2.5} className="group-hover:translate-x-1 transition-transform" />
              <span className="font-extrabold text-sm">Login</span>
          </button>

          {/* 7. FOOTER QUOTE */}
          <div className="bg-white rounded-full py-2.5 px-4 flex items-center justify-between shadow-sm border border-slate-100 mx-4 mt-4">
              <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white shrink-0 shadow-sm">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
              </div>
              <p className="text-[9px] font-bold text-slate-600 text-center leading-tight mx-2">
                  <span className="text-purple-600 font-serif font-black text-sm mr-1">"</span>
                  Setiap hari adalah kesempatan baru<br/>untuk belajar, mengajar, dan menginspirasi.
              </p>
              <div className="w-6 h-6 text-purple-400 flex items-center justify-center shrink-0 relative">
                 <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4L12 2z"/></svg>
                 <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="none" className="absolute top-0 right-0"><path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4L12 2z"/></svg>
              </div>
          </div>
      </div>
      
      {/* MODALS RETAINED FROM ORIGINAL (Just appended exactly as they were conceptually) */}
      
      {/* MODALS WRAPPER */}
      {modalOpen && modalContent && (
          <div className="fixed inset-0 z-[99999] flex justify-center items-end sm:items-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in" onClick={() => setModalOpen(false)}>
              <div className="bg-white dark:bg-slate-800 w-full max-w-lg sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden animate-slide-up sm:animate-zoom-in flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center p-5 sm:p-6 border-b border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 sticky top-0 z-10">
                      <div>
                          <h2 className="text-lg font-black text-slate-800 dark:text-white leading-tight">{modalContent.title}</h2>
                          <p className="text-[10px] font-bold text-purple-500 uppercase mt-1">
                              {modalContent.type === 'class' ? 'Statistik Kelas' : 'Rekap Ketidakhadiran'}
                          </p>
                      </div>
                      <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-slate-700 dark:hover:text-white p-2 rounded-full hover:bg-purple-50 dark:hover:bg-slate-700 transition-colors bg-[#F9F7FF] dark:bg-slate-800 border border-slate-100 dark:border-slate-700"><X size={20}/></button>
                  </div>
                  
                  <div className="overflow-y-auto p-6 space-y-6 custom-scrollbar bg-white dark:bg-slate-800 pb-10 md:pb-6">
                      {modalContent.type === 'class' ? (
                          <div className="grid grid-cols-3 gap-3">
                              {modalContent.data.map(([cls, count]: any) => {
                                  const genderData = stats?.classGenderDetails?.[cls] || { L: 0, P: 0 };
                                  return (
                                  <div key={cls} className="bg-white dark:bg-slate-700/50 p-3 rounded-2xl text-center border border-gray-100 dark:border-slate-600 shadow-sm hover:border-purple-200 transition-colors">
                                      <div className="font-extrabold text-slate-700 dark:text-white text-xl">{cls}</div>
                                      <div className="text-[10px] text-purple-500 font-bold uppercase mt-1">{count} Murid</div>
                                      <div className="text-[9px] text-purple-400 font-bold uppercase mt-0.5 border-t border-slate-100 dark:border-slate-600 pt-1 flex justify-center gap-2">
                                          <span className="text-purple-600">L: {genderData.L}</span> | <span className="text-pink-500">P: {genderData.P}</span>
                                      </div>
                                  </div>
                              )})}
                          </div>
                      ) : (
                        <>
                            <div className="grid grid-cols-4 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'S' ? null : 'S')}
                                    className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border transition-all text-center cursor-pointer select-none active:scale-95 ${
                                        selectedStatusFilter === 'S' 
                                        ? 'bg-yellow-100 border-yellow-400 ring-2 ring-yellow-400 shadow-md scale-[1.02]' 
                                        : 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-100 dark:border-yellow-800/50 hover:bg-yellow-100/60'
                                    }`}
                                >
                                    <span className="text-yellow-700 dark:text-yellow-400 font-bold text-[10px] uppercase mb-0.5">Sakit</span>
                                    <span className="text-2xl font-extrabold text-yellow-600 dark:text-yellow-400">{modalContent.data.absenceDetails?.S || 0}</span>
                                    <span className="text-[8px] font-bold text-yellow-700 dark:text-yellow-300 mt-0.5 bg-yellow-200/60 dark:bg-yellow-900/50 px-1 py-0.5 rounded">
                                        {selectedStatusFilter === 'S' ? '✓ Dipilih' : 'Klik lihat'}
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'I' ? null : 'I')}
                                    className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border transition-all text-center cursor-pointer select-none active:scale-95 ${
                                        selectedStatusFilter === 'I' 
                                        ? 'bg-blue-100 border-blue-400 ring-2 ring-blue-400 shadow-md scale-[1.02]' 
                                        : 'bg-blue-50 dark:bg-blue-900/30 border-blue-100 dark:border-blue-800/50 hover:bg-blue-100/60'
                                    }`}
                                >
                                    <span className="text-blue-700 dark:text-blue-400 font-bold text-[10px] uppercase mb-0.5">Izin</span>
                                    <span className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">{modalContent.data.absenceDetails?.I || 0}</span>
                                    <span className="text-[8px] font-bold text-blue-700 dark:text-blue-300 mt-0.5 bg-blue-200/60 dark:bg-blue-900/50 px-1 py-0.5 rounded">
                                        {selectedStatusFilter === 'I' ? '✓ Dipilih' : 'Klik lihat'}
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'D' ? null : 'D')}
                                    className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border transition-all text-center cursor-pointer select-none active:scale-95 ${
                                        selectedStatusFilter === 'D' 
                                        ? 'bg-purple-100 border-purple-400 ring-2 ring-purple-400 shadow-md scale-[1.02]' 
                                        : 'bg-purple-50 dark:bg-purple-900/30 border-purple-100 dark:border-purple-800/50 hover:bg-purple-100/60'
                                    }`}
                                >
                                    <span className="text-purple-700 dark:text-purple-400 font-bold text-[10px] uppercase mb-0.5">Dispen</span>
                                    <span className="text-2xl font-extrabold text-purple-600 dark:text-purple-400">{modalContent.data.absenceDetails?.D || 0}</span>
                                    <span className="text-[8px] font-bold text-purple-700 dark:text-purple-300 mt-0.5 bg-purple-200/60 dark:bg-purple-900/50 px-1 py-0.5 rounded">
                                        {selectedStatusFilter === 'D' ? '✓ Dipilih' : 'Klik lihat'}
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'A' ? null : 'A')}
                                    className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border transition-all text-center cursor-pointer select-none active:scale-95 ${
                                        selectedStatusFilter === 'A' 
                                        ? 'bg-red-100 border-red-400 ring-2 ring-red-400 shadow-md scale-[1.02]' 
                                        : 'bg-red-50 dark:bg-red-900/30 border-red-100 dark:border-red-800/50 hover:bg-red-100/60'
                                    }`}
                                >
                                    <span className="text-red-700 dark:text-red-400 font-bold text-[10px] uppercase mb-0.5">Alpa</span>
                                    <span className="text-2xl font-extrabold text-red-600 dark:text-red-400">{modalContent.data.absenceDetails?.A || 0}</span>
                                    <span className="text-[8px] font-bold text-red-700 dark:text-red-300 mt-0.5 bg-red-200/60 dark:bg-red-900/50 px-1 py-0.5 rounded">
                                        {selectedStatusFilter === 'A' ? '✓ Dipilih' : 'Klik lihat'}
                                    </span>
                                </button>
                            </div>

                            {selectedStatusFilter && (
                                <div className="bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-2xl p-3.5 space-y-2 animate-fade-in shadow-inner">
                                    <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-600">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2.5 h-2.5 rounded-full ${
                                                selectedStatusFilter === 'S' ? 'bg-yellow-500' :
                                                selectedStatusFilter === 'I' ? 'bg-blue-500' :
                                                selectedStatusFilter === 'D' ? 'bg-purple-500' : 'bg-red-500'
                                            }`}></span>
                                            <span className="font-extrabold text-xs text-slate-800 dark:text-white uppercase">
                                                Daftar Siswa {selectedStatusFilter === 'S' ? 'Sakit' : selectedStatusFilter === 'I' ? 'Izin' : selectedStatusFilter === 'D' ? 'Dispen' : 'Alpa'} ({
                                                    rawAttendance.filter(s => s.status === selectedStatusFilter).length
                                                } Anak)
                                            </span>
                                        </div>
                                        <button 
                                            type="button"
                                            onClick={() => setSelectedStatusFilter(null)}
                                            className="text-[10px] font-bold text-purple-600 dark:text-purple-400 hover:underline bg-purple-100 dark:bg-purple-900/50 px-2 py-0.5 rounded-md"
                                        >
                                            Reset Filter
                                        </button>
                                    </div>

                                    <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                                        {rawAttendance.filter(s => s.status === selectedStatusFilter).length === 0 ? (
                                            <div className="text-center py-4 text-xs text-slate-400 italic">
                                                Tidak ada siswa dengan status {selectedStatusFilter === 'S' ? 'Sakit' : selectedStatusFilter === 'I' ? 'Izin' : selectedStatusFilter === 'D' ? 'Dispen' : 'Alpa'}.
                                            </div>
                                        ) : (
                                            rawAttendance
                                                .filter(s => s.status === selectedStatusFilter)
                                                .map(s => ({
                                                    ...s,
                                                    kelas: studentClassMap[s.student_id] || '?'
                                                }))
                                                .sort((a, b) => a.kelas.localeCompare(b.kelas) || a.name.localeCompare(b.name))
                                                .map((student, idx) => (
                                                    <div key={idx} className="flex justify-between items-center bg-white dark:bg-slate-700 p-2.5 rounded-xl border border-slate-100 dark:border-slate-600 text-xs shadow-sm">
                                                        <div className="flex items-center gap-2">
                                                            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-600 text-slate-700 dark:text-slate-200 font-black rounded text-[10px]">
                                                                {student.kelas}
                                                            </span>
                                                            <span className="font-bold text-slate-800 dark:text-white">
                                                                {student.name}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            {student.source === 'TU' && (
                                                                <span className="text-[9px] bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800 font-bold">
                                                                    TU
                                                                </span>
                                                            )}
                                                            {student.source === 'Wali' && (
                                                                <span className="text-[9px] bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-200 px-1.5 py-0.5 rounded border border-purple-200 dark:border-purple-800 font-bold">
                                                                    Wali
                                                                </span>
                                                            )}
                                                            {student.source === 'Guru' && (
                                                                <span className="text-[9px] bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-200 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800 font-bold">
                                                                    Guru
                                                                </span>
                                                            )}
                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                                                student.status === 'S' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100' :
                                                                student.status === 'I' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100' :
                                                                student.status === 'D' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100' :
                                                                'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
                                                            }`}>
                                                                {student.status === 'S' ? 'SAKIT' : student.status === 'I' ? 'IZIN' : student.status === 'D' ? 'DISPEN' : 'ALPA'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="p-3 bg-[#F9F7FF] dark:bg-slate-700/30 border border-slate-100 dark:border-slate-600 rounded-xl text-center">
                                <span className="text-[10px] text-purple-500 dark:text-purple-400 font-bold uppercase">*Termasuk input dari Wali Kelas & Guru Mapel.</span>
                            </div>
                            <hr className="border-gray-100 dark:border-slate-700" />
                            <div>
                                <h3 className="text-[11px] font-extrabold text-slate-600 dark:text-slate-300 uppercase mb-3 flex items-center gap-2"><School size={14}/> Per Kelas</h3>
                                <div className="space-y-3">
                                    {Object.keys(modalContent.data.classDetails).sort().map(cls => {
                                        const totalStudents = modalContent.data.classDetails[cls] || 0;
                                        const absentCount = modalContent.data.absencePerClass[cls] || 0;
                                        const presentCount = totalStudents - absentCount;
                                        const isExpanded = expandedClass === cls;
                                        return (
                                            <div key={cls} className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
                                                <button onClick={() => setExpandedClass(isExpanded ? null : cls)} className="w-full flex items-center p-3 hover:bg-[#F9F7FF] dark:hover:bg-slate-700/50 transition-colors text-left">
                                                    <div className="w-10 h-10 rounded-xl bg-[#F9F7FF] dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center font-black text-slate-700 dark:text-white mr-3 shrink-0 text-sm">
                                                        {cls}
                                                    </div>
                                                    <div className="flex-1 px-1">
                                                        <div className="flex flex-col items-start gap-1">
                                                            <div className={`flex items-center gap-2 text-base sm:text-lg font-bold ${(stats?.classesWithJournals && !stats?.classesWithJournals.includes(cls)) ? 'text-red-500' : ''}`}>
                                                                <span className={(stats?.classesWithJournals && !stats?.classesWithJournals.includes(cls)) ? 'text-red-500' : 'text-green-600 dark:text-green-400'}>{presentCount} Hadir</span>
                                                                <span className={(stats?.classesWithJournals && !stats?.classesWithJournals.includes(cls)) ? 'text-red-400' : 'text-gray-300 dark:text-gray-600'}>|</span>
                                                                <span className={(stats?.classesWithJournals && !stats?.classesWithJournals.includes(cls)) ? 'text-red-500' : (absentCount > 0 ? "text-purple-500 dark:text-red-400" : "text-gray-400 dark:text-gray-500")}>
                                                                    {absentCount} Tidak Hadir
                                                                </span>
                                                            </div>
                                                            {stats?.classesWithJournals && !stats?.classesWithJournals.includes(cls) && (
                                                                <span className="text-red-500 text-[10px] sm:text-xs font-bold mt-0.5 bg-red-50 px-2 py-0.5 rounded-sm">
                                                                    Jurnal Belum Diisi
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="text-gray-300 dark:text-gray-600">
                                                        {isExpanded ? <ChevronDown size={18}/> : <ChevronRight size={18}/>}
                                                    </div>
                                                </button>
                                                {isExpanded && absentCount > 0 && (
                                                    <div className="bg-gray-50 dark:bg-slate-800 p-3 border-t border-gray-100 dark:border-slate-700 space-y-2 animate-fade-in">
                                                        {getAbsentStudentsForClass(cls).map((s: any, idx: number) => (
                                                            <div key={idx} className="flex justify-between items-center bg-white dark:bg-slate-700 p-3 rounded-xl border border-gray-100 dark:border-slate-600 text-xs shadow-sm">
                                                                <span className="font-bold text-slate-700 dark:text-white">{s.name}</span>
                                                                <div className="flex items-center gap-2">
                                                                    {s.source === 'TU' && <span className="text-[9px] bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 px-1 rounded border border-amber-200 dark:border-amber-800 font-bold">TU</span>}
                                                                    {s.source === 'Wali' && <span className="text-[9px] bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-200 px-1 rounded border border-purple-200 dark:border-purple-800 font-bold">Wali</span>}
                                                                    {s.source === 'Guru' && <span className="text-[9px] bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-200 px-1 rounded border border-blue-200 dark:border-blue-800 font-bold">Guru</span>}
                                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${s.status === 'S' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-100' : s.status === 'I' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100' : s.status === 'D' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-100' : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-100'}`}>
                                                                        {s.status === 'S' ? 'Sakit' : s.status === 'I' ? 'Izin' : s.status === 'D' ? 'Dispen' : 'Alpa'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                {isExpanded && absentCount === 0 && (
                                                    <div className="bg-green-50 dark:bg-green-900/20 p-3 text-center text-xs text-green-700 dark:text-green-400 font-bold border-t border-green-100 dark:border-green-900/30">
                                                        Semua murid hadir.
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 flex justify-between items-center shadow-inner">
                                    <span className="font-extrabold text-slate-600 dark:text-slate-300 uppercase text-xs">Total Keseluruhan</span>
                                    <div className="flex items-center gap-3 font-bold text-sm">
                                        <span className="text-green-600 dark:text-green-400">{Object.keys(modalContent.data.classDetails).reduce((acc, cls) => acc + (modalContent.data.classDetails[cls] || 0) - (modalContent.data.absencePerClass[cls] || 0), 0)} Hadir</span>
                                        <span className="text-slate-300 dark:text-slate-600">|</span>
                                        <span className="text-purple-600 dark:text-red-400">{Object.keys(modalContent.data.classDetails).reduce((acc, cls) => acc + (modalContent.data.absencePerClass[cls] || 0), 0)} Tidak Hadir</span>
                                    </div>
                                </div>
                            </div>
                        </>
                      )}
                  </div>
              </div>
          </div>
      )}
    
      {/* LOGIN MODAL */}
      {showLoginModal && (
        <div className="fixed inset-0 z-[99999] flex justify-center items-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in" onClick={() => setShowLoginModal(false)}>
           <div className="bg-transparent w-full max-w-lg flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
               {loginViewMode === 'selection' ? (
                  <div className="w-full max-w-sm mx-auto space-y-4 animate-fade-in">
                      <div className="flex justify-between items-center mb-6 px-1">
                          <h2 className="text-2xl font-black text-white">Masuk Sebagai</h2>
                          <button onClick={() => setShowLoginModal(false)} className="text-white/70 hover:text-white p-2 rounded-2xl bg-white/10 hover:bg-white/20 transition-colors"><X size={24}/></button>
                      </div>
                      
                      <button 
                        onClick={() => handleRoleSelect('guru')}
                        className="w-full bg-white dark:bg-slate-800 hover:bg-[#F9F7FF] dark:hover:bg-slate-700 p-6 rounded-[1.75rem] shadow-lg flex items-center gap-5 transition-transform active:scale-[0.98] group"
                      >
                          <div className="w-16 h-16 rounded-full bg-purple-100/80 dark:bg-purple-900/50 text-purple-700 dark:text-purple-400 flex items-center justify-center flex-shrink-0">
                              <GraduationCap size={28} strokeWidth={2.5} />
                          </div>
                          <div className="text-left flex-1">
                              <h3 className="text-[17px] font-black text-slate-800 dark:text-white leading-tight">Guru / Tenaga<br/>Pendidik</h3>
                              <p className="text-[11px] text-purple-500 dark:text-purple-400 font-medium mt-1 leading-snug">Masuk untuk mengisi jurnal<br/>& absensi.</p>
                          </div>
                          <div className="text-slate-300 dark:text-slate-600 group-hover:text-purple-400 transition-colors">
                              <ArrowRight size={20} strokeWidth={2.5} />
                          </div>
                      </button>

                      <button 
                        onClick={() => handleRoleSelect('operator')}
                        className="w-full bg-white dark:bg-slate-800 hover:bg-[#F9F7FF] dark:hover:bg-slate-700 p-6 rounded-[1.75rem] shadow-lg flex items-center gap-5 transition-transform active:scale-[0.98] group"
                      >
                          <div className="w-16 h-16 rounded-full bg-orange-100/80 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400 flex items-center justify-center flex-shrink-0">
                              <MonitorPlay size={28} strokeWidth={2.5} />
                          </div>
                          <div className="text-left flex-1">
                              <h3 className="text-[17px] font-black text-slate-800 dark:text-white leading-tight">Operator<br/>Monitor</h3>
                              <p className="text-[11px] text-purple-500 dark:text-purple-400 font-medium mt-1 leading-snug">Dashboard monitoring<br/>jadwal real-time.</p>
                          </div>
                          <div className="text-slate-300 dark:text-slate-600 group-hover:text-orange-400 transition-colors">
                              <ArrowRight size={20} strokeWidth={2.5} />
                          </div>
                      </button>

                      <button 
                        onClick={() => handleRoleSelect('admin')}
                        className="w-full bg-white dark:bg-slate-800 hover:bg-[#F9F7FF] dark:hover:bg-slate-700 p-6 rounded-[1.75rem] shadow-lg flex items-center gap-5 transition-transform active:scale-[0.98] group"
                      >
                          <div className="w-16 h-16 rounded-full bg-purple-50 dark:bg-slate-900/50 text-slate-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0">
                              <Shield size={28} strokeWidth={2.5} />
                          </div>
                          <div className="text-left flex-1">
                              <h3 className="text-[17px] font-black text-slate-800 dark:text-white leading-tight">Administrator</h3>
                              <p className="text-[11px] text-purple-500 dark:text-purple-400 font-medium mt-1 leading-snug">Pengaturan sistem &<br/>database master.</p>
                          </div>
                          <div className="text-slate-300 dark:text-slate-600 group-hover:text-purple-500 transition-colors">
                              <ArrowRight size={20} strokeWidth={2.5} />
                          </div>
                      </button>
                  </div>
               ) : (
                  <div className="bg-white dark:bg-slate-800 w-full max-w-sm mx-auto p-8 py-10 rounded-[2.5rem] shadow-2xl relative animate-zoom-in">
                      <button onClick={() => setLoginViewMode('selection')} className="absolute top-8 left-8 text-purple-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                          <ChevronLeft size={24} strokeWidth={2.5}/>
                      </button>
                      
                      <div className="text-center mb-8">
                          <div className="w-24 h-24 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 border-[6px] border-purple-50 dark:border-purple-900/30 shadow-[0_0_20px_rgba(168,85,247,0.1)]">
                              {selectedRoleLabel === 'Administrator' ? <Shield size={36} className="text-purple-600" strokeWidth={2.5}/> : <GraduationCap size={36} className="text-purple-600" strokeWidth={2.5}/>}
                          </div>
                          <h2 className="text-[26px] font-black text-slate-800 dark:text-white mb-1">Login {selectedRoleLabel}</h2>
                          <p className="text-sm font-semibold text-purple-500 dark:text-purple-400">SIM-PANLA</p>
                      </div>

                      <form onSubmit={handleLogin} className="space-y-5">
                          {loginError && (
                              <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800/50 rounded-2xl flex gap-3 text-red-600 dark:text-red-400 animate-shake">
                                  <AlertCircle size={20} className="shrink-0 mt-0.5" />
                                  <p className="text-xs font-bold leading-relaxed">{loginError}</p>
                              </div>
                          )}
                          
                          <div>
                              <label className="block text-[11px] font-black text-slate-600 dark:text-purple-400 mb-2 uppercase tracking-widest">ID Pengguna / NIP</label>
                              <div className="relative">
                                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-purple-400">
                                      <User size={20} strokeWidth={2} />
                                  </div>
                                  <input
                                      type="text"
                                      required
                                      value={userId}
                                      onChange={(e) => setUserId(e.target.value)}
                                      className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-[1.25rem] text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all placeholder:font-normal placeholder:text-slate-300 shadow-sm"
                                      placeholder="Masukkan NIP"
                                  />
                              </div>
                          </div>

                          <div>
                              <label className="block text-[11px] font-black text-slate-600 dark:text-purple-400 mb-2 uppercase tracking-widest">Kata Sandi</label>
                              <div className="relative">
                                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-purple-400">
                                      <Lock size={20} strokeWidth={2} />
                                  </div>
                                  <input
                                      type={showPassword ? "text" : "password"}
                                      required
                                      value={password}
                                      onChange={(e) => setPassword(e.target.value)}
                                      className="w-full pl-12 pr-12 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-[1.25rem] text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all placeholder:font-normal placeholder:text-slate-300 shadow-sm"
                                      placeholder="••••••••"
                                  />
                                  <button
                                      type="button"
                                      onClick={() => setShowPassword(!showPassword)}
                                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-purple-400 hover:text-purple-600 transition-colors"
                                  >
                                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                  </button>
                              </div>
                          </div>

                          <button
                              type="submit"
                              disabled={isSubmitting}
                              className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-[1.25rem] py-4 mt-2 font-black text-[15px] flex items-center justify-center gap-2 shadow-[0_8px_20px_rgba(147,51,234,0.25)] transition-transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                          >
                              {isSubmitting ? (
                                  <><Loader2 size={20} className="animate-spin" /> Sedang Masuk...</>
                              ) : (
                                  <>Masuk Sekarang <ArrowRight size={20} strokeWidth={2.5} /></>
                              )}
                          </button>
                      </form>
                  </div>
               )}
           </div>
        </div>
      )}
    </div>
  );
};

export default PublicDashboard;
