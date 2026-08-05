
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getWIBISOString } from '../utils/dateUtils';
import { showAlert } from '../utils/alert';
import {  Bell, CheckCircle2, XCircle, X , LayoutGrid } from 'lucide-react';
import { supabase } from '../services/supabase';
import { LogOut, LayoutDashboard, Grid, User, ChevronRight, MonitorPlay, Moon, Sun, Siren, Activity, Sunset, ArrowUp, AlertCircle, Settings, Database, Users, GraduationCap, Upload, Edit3, Calendar, Scan, Download } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { TeacherLoginSplash } from './TeacherLoginSplash';
import { AnimatePresence } from 'motion/react';

// CHANGED: Default collapsed is now true for all pages
export const Layout: React.FC<{ children: React.ReactNode; showNav?: boolean; collapsed?: boolean }> = ({ children, showNav = true, collapsed = true }) => {
  const { signOut, profile, isOperator, isAdmin, isKbmRestricted, academicYear, semester, activeScheduleVersion } = useAuth();
    const navigate = useNavigate();
  const location = useLocation();
  
  const [showLogoutModal, setShowLogoutModal] = useState(false);
      const [currentTime, setCurrentTime] = useState(new Date());
  
  // NEW: State for Scroll-to-Top Button
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [waliNotifications, setWaliNotifications] = useState<any[]>([]);
  const [hasUnfilled, setHasUnfilled] = useState(false);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [showTeacherSplash, setShowTeacherSplash] = useState(false);

  useEffect(() => {
     if (location.state?.justLoggedIn && profile?.role === 'user') {
        setShowTeacherSplash(true);
        const timer = setTimeout(() => {
            navigate(location.pathname, { replace: true, state: {} });
        }, 100);
        return () => clearTimeout(timer);
     }
  }, [location.state?.justLoggedIn, profile?.role, navigate, location.pathname]);
  


  // Logic to identify Headmaster
  const isHeadmaster = profile?.mengajar_mapel === 'Kepala Sekolah';
  // Logic to identify Dhuha Teacher
  const isDhuhaTeacher = profile?.mengajar_mapel?.toLowerCase().includes('dhuha');

  useEffect(() => {
    

    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // NEW: Scroll Event Listener
  useEffect(() => {
    const handleScroll = () => {
        // Show button if scrolled down more than 300px
        if (window.scrollY > 300) {
            setShowScrollTop(true);
        } else {
            setShowScrollTop(false);
        }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // NEW: Scroll to Top Function
  const scrollToTop = () => {
      window.scrollTo({
          top: 0,
          behavior: 'smooth'
      });
  };

  
  useEffect(() => {
        if (profile && !isAdmin && !isOperator && !isHeadmaster) {
            const fetchNotifs = async () => {
                try {
                    const dateObj = new Date();
                    const jsDay = dateObj.getDay();
                    const dbDay = jsDay === 0 ? 7 : jsDay;
                    const todayStr = getWIBISOString();
                    const todayStart = `${todayStr}T00:00:00+07:00`;
                    const todayEnd = `${todayStr}T23:59:59+07:00`;

                    let { data: scheds, error: schedErr } = await supabase.from('schedules').select('*')
                        .eq('teacher_id', profile.id)
                        .eq('day_of_week', dbDay)
                        .eq('academic_year', academicYear || '2025/2026')
                        .eq('semester', semester || 'Ganjil')
                        .eq('schedule_version', activeScheduleVersion || 'Utama');
                        
                    if (schedErr && (schedErr.code === '42703' || schedErr.message?.includes('academic_year') || schedErr.message?.includes('schedule_version'))) {
                        const fallback = await supabase.from('schedules').select('*').eq('teacher_id', profile.id).eq('day_of_week', dbDay).eq('academic_year', academicYear || '2025/2026').eq('semester', semester || 'Genap');
                        if (fallback.error) {
                             // If even academic_year doesn't exist
                             const ultraFallback = await supabase.from('schedules').select('*').eq('teacher_id', profile.id).eq('day_of_week', dbDay);
                             scheds = (ultraFallback.data || []).filter(s => s.academic_year === academicYear && s.semester === semester);
                        } else {
                             scheds = fallback.data;
                        }
                    }

                    const { data: journals } = await supabase.from('journals').select('id, kelas, subject, created_at')
                        .eq('teacher_id', profile.id)
                        .eq('academic_year', academicYear || '2025/2026')
                        .eq('semester', semester || 'Ganjil')
                        .gte('created_at', todayStart)
                        .lte('created_at', todayEnd);

                    const jData = journals || [];
                    const notifs = (scheds || []).map((s: any) => {
                        const isFilled = jData.some((j: any) => j.kelas === s.kelas && s.subject.toLowerCase().includes(j.subject.toLowerCase()));
                        return { ...s, isFilled };
                    });
                    
                    notifs.sort((a,b) => parseInt(a.hour) - parseInt(b.hour));
                    setNotifications(notifs);
                    setHasUnfilled(notifs.some(n => !n.isFilled));

                    let waliNotifs: any[] = [];
                    if (profile.wali_kelas) {
                        const { data: students } = await supabase.from('students').select('id, name')
                            .eq('kelas', profile.wali_kelas)
                            .eq('academic_year', academicYear || '2025/2026');
                        
                        if (students && students.length > 0) {
                            const studentIds = students.map((s: any) => s.id);
                            
                            // Fetch absences
                            const { data: absences } = await supabase.from('attendance_logs').select('id, student_name, teacher_name, subject, created_at')
                                .in('student_id', studentIds)
                                .eq('status', 'A')
                                .gte('created_at', todayStart)
                                .lte('created_at', todayEnd);
                                
                            // Fetch discipline notes
                            const { data: notes } = await supabase.from('journal_notes').select('id, student_name, category, note, created_at, journal_id')
                                .in('student_id', studentIds)
                                .eq('type', 'kedisiplinan')
                                .gte('created_at', todayStart)
                                .lte('created_at', todayEnd);
                                
                            if (absences) {
                                absences.forEach((a: any) => {
                                    waliNotifs.push({
                                        type: 'absence',
                                        studentName: a.student_name,
                                        teacherName: a.teacher_name,
                                        subject: a.subject,
                                        createdAt: new Date(a.created_at).getTime(),
                                        message: `Alpa di mapel ${a.subject || '-'} (${a.teacher_name || '-'}) `
                                    });
                                });
                            }
                            if (notes) {
                                notes.forEach((n: any) => {
                                    waliNotifs.push({
                                        type: 'discipline',
                                        studentName: n.student_name,
                                        category: n.category,
                                        note: n.note,
                                        createdAt: new Date(n.created_at).getTime(),
                                        message: `${n.category || 'Pelanggaran'}: ${n.note || '-'}`
                                    });
                                });
                            }
                        }
                    }
                    waliNotifs.sort((a,b) => b.createdAt - a.createdAt);
                    setWaliNotifications(waliNotifs);
                    
                    
                    
                    
                } catch(e) {}
            };
            fetchNotifs();
        }
  }, [profile, academicYear, semester, activeScheduleVersion]);

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    await signOut();
    setShowLogoutModal(false);
    navigate('/');
  };

  const NavItem = ({ path, label, icon: Icon }: any) => {
      const isActive = location.pathname === path;
      return (
          <button 
            onClick={() => navigate(path)}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative ${
                isActive 
                ? 'bg-purple-600 text-white shadow-md' 
                : 'text-gray-600 hover:bg-slate-50 hover:text-purple-600 dark:text-gray-300 dark:hover:bg-slate-700 dark:hover:text-white'
            } ${collapsed ? 'justify-center' : ''}`}
            title={label} 
          >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              {!collapsed && <span className={`font-medium text-sm ${isActive ? 'text-white' : 'text-gray-700 dark:text-gray-200'}`}>{label}</span>}
          </button>
      );
  };

  // --- NEW: ANIMATED BOTTOM NAV ITEM ---
  const BottomNavItem = ({ path, label, icon: Icon }: any) => {
      const isActive = location.pathname === path;
      return (
          <button 
            onClick={() => navigate(path)}
            className={`relative flex items-center justify-center h-12 rounded-full transition-all duration-500 ease-out overflow-hidden ${
                isActive 
                ? 'flex-1 bg-purple-600 text-white px-4 shadow-lg shadow-purple-200/50 dark:shadow-none' 
                : 'w-12 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30'
            }`}
          >
              <div className="flex items-center justify-center gap-2">
                  <Icon size={22} strokeWidth={isActive ? 2.5 : 2} className={`flex-shrink-0 ${isActive ? 'text-white' : 'text-purple-600 dark:text-purple-400'}`} />
                  
                  <span className={`text-sm font-semibold whitespace-nowrap transition-all duration-500 ${
                      isActive ? 'opacity-100 max-w-[120px] translate-x-0 text-white' : 'opacity-0 max-w-0 -translate-x-4 absolute'
                  }`}>
                      {label}
                  </span>
              </div>
          </button>
      );
  };

  const formattedDate = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(currentTime);
  const formattedTime = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(currentTime).replace(/\./g, ':');

  return (
    <>
      <AnimatePresence>
        {showTeacherSplash && <TeacherLoginSplash key="tsplash" onFinish={() => setShowTeacherSplash(false)} hasUnfilled={hasUnfilled || waliNotifications.length > 0} notifCount={notifications.filter(n => !n.isFilled).length + waliNotifications.length} />}
      </AnimatePresence>
      <div className="min-h-screen flex bg-[#F0F4F8] dark:bg-slate-900 font-sans text-slate-800 dark:text-slate-100 transition-colors duration-300">
      
      {/* --- DESKTOP SIDEBAR (Compact Mode Default) --- */}
      {showNav && (
        <aside className={`hidden md:flex flex-col h-screen sticky top-0 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 z-20 transition-all duration-300 ${collapsed ? 'w-20' : 'w-72'}`}>
            {/* Logo Area */}
            <div className={`p-4 flex items-center gap-3 border-b border-slate-100 dark:border-slate-700 ${collapsed ? 'justify-center' : ''} h-20`}>
                 <img 
                    src="https://lh3.googleusercontent.com/d/1KtAUvy02qNUB2FzCUoVrNmHtFT0eH2J0" 
                    alt="Logo" 
                    className="h-10 w-10 object-contain" 
                  />
                 {!collapsed && (
                     <div className="animate-fade-in">
                        <h2 className="text-sm font-extrabold text-slate-800 dark:text-white leading-none">UPT SMPN 8 PASURUAN</h2>
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 font-medium">SIM-PANLA Online</p>
                     </div>
                 )}
            </div>

            {/* Navigation Menu */}
            <div className="flex-1 space-y-1 p-3 overflow-y-auto">
                {!collapsed && <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-2">Menu Utama</div>}
                
                
                {isAdmin ? (
                    <>
                        <NavItem path="/dashboard" label="Beranda" icon={LayoutDashboard} />
                        <NavItem path="/operator-dashboard" label="Monitor KBM" icon={MonitorPlay} />
                        <NavItem path="/qr" label="Presensi QR" icon={Scan} />
                        <NavItem path="/penyimpanan" label="Buat T.A" icon={Database} />
                        <NavItem path="/settings" label="Pengaturan" icon={Settings} />
                        <div className="pt-4 pb-1">
                            {!collapsed && <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 px-2">Data Master</div>}
                        </div>
                        <NavItem path="/users" label="Data Akun" icon={Users} />
                        <NavItem path="/students" label="Data Siswa" icon={GraduationCap} />
                        <NavItem path="/import-data" label="Import Data" icon={Upload} />
                        <NavItem path="/input-manual" label="Input Manual" icon={Edit3} />
                        <NavItem path="/input-jadwal" label="Input Jadwal" icon={Calendar} />
                        <NavItem path="/profile" label="Profil Saya" icon={User} />
                    </>
                ) : isOperator ? (
                    <>
                        <NavItem path="/operator-dashboard" label="Dashboard KBM" icon={MonitorPlay} />
                        <NavItem path="/qr" label="Presensi QR" icon={Scan} />
                        <NavItem path="/profile" label="Profil Saya" icon={User} />
                    </>
                ) : (
                    <>
                        <NavItem path="/dashboard" label="Beranda" icon={LayoutDashboard} />
                        {isHeadmaster && <NavItem path="/kinerja" label="Kinerja" icon={Activity} />}
                        {!isHeadmaster && <NavItem path="/apps" label="KBM" icon={Grid} />}
                        <NavItem path="/qr" label="Presensi QR" icon={Scan} />
                        {isHeadmaster && <NavItem path="/kedisiplinan" label="Kedisiplinan" icon={Siren} />}
                        {isDhuhaTeacher && <NavItem path="/rekap-dhuha" label="Rekap Dhuha" icon={Sunset} />}
                        <NavItem path="/profile" label="Profil Saya" icon={User} />
                        <button
                          onClick={() => window.dispatchEvent(new CustomEvent('open-pwa-install-modal'))}
                          className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 font-bold text-xs ${collapsed ? 'justify-center' : ''}`}
                          title="Install Aplikasi SIM-PANLA (PWA)"
                        >
                          <Download size={20} className="shrink-0" />
                          {!collapsed && <span>Install App PWA</span>}
                        </button>
                    </>
                )}
            </div>

            {/* Theme & Logout Area */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                <div className={`flex flex-col gap-4 ${collapsed ? 'items-center' : ''}`}>
                    
                    {/* Theme Toggle */}
                    

                    {/* User Profile Mini */}
                    <div className={`flex items-center gap-3 overflow-hidden ${collapsed ? 'justify-center' : 'justify-between'}`}>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-600 flex-shrink-0 overflow-hidden border border-gray-200 dark:border-slate-600 shadow-sm cursor-pointer" title={profile?.full_name}>
                                {profile?.avatar_url ? <img src={profile.avatar_url} className="w-full h-full object-cover"/> : <User size={20} className="m-2.5 text-gray-400 dark:text-gray-300"/>}
                            </div>
                            {!collapsed && (
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-slate-800 dark:text-white truncate max-w-[100px]">{profile?.full_name?.split(' ')[0]}</p>
                                    <p className="text-xs text-green-600 font-bold flex items-center gap-1">
                                        <span className="w-2 h-2 rounded-full bg-green-500"></span> Online
                                    </p>
                                </div>
                            )}
                        </div>
                        {!collapsed && (
                            <button 
                                onClick={handleLogoutClick}
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                title="Keluar"
                            >
                                <LogOut size={18} />
                            </button>
                        )}
                    </div>
                    {/* Collapsed Logout */}
                    {collapsed && (
                         <button 
                            onClick={handleLogoutClick}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Keluar"
                        >
                            <LogOut size={18} />
                        </button>
                    )}
                </div>
            </div>
        </aside>
      )}

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto custom-scrollbar relative bg-[#F5F3FF] dark:bg-slate-900 transition-colors duration-300">
          {/* Mobile Header */}
          <div className="md:hidden sticky top-0 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50 z-30 shadow-sm pt-[calc(env(safe-area-inset-top)+0.25rem)]">
             <div className="px-4 py-3 flex justify-between items-center">
                 <div className="flex items-center gap-3">
                     <img 
                       src="https://lh3.googleusercontent.com/d/1KtAUvy02qNUB2FzCUoVrNmHtFT0eH2J0" 
                       className="h-10 w-auto object-contain" 
                       alt="Logo"
                     />
                     <div>
                         <h1 className="text-xs font-black text-slate-900 dark:text-white leading-tight uppercase">SISTEM INFORMASI MANAJEMEN</h1>
                         <p className="text-[10px] font-bold text-purple-700 dark:text-purple-300 uppercase leading-none mt-0.5">PEMBELAJARAN SMP NEGERI 8 PASURUAN</p>
                         <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase mt-1 tracking-wide">
                            SEMESTER {semester} | T.A {academicYear}
                         </p>
                     </div>
                 </div>
                 <div className="flex items-center gap-2">
                     {!isAdmin && !isOperator && !isHeadmaster && (notifications.length > 0 || waliNotifications.length > 0) && (
                        <div className="relative group">
                            {(hasUnfilled || waliNotifications.length > 0) && (
                                <div className="absolute inset-0 rounded-full overflow-hidden shadow-sm">
                                    <div className="absolute inset-[-100%] z-0 animate-[spin_4s_linear_infinite]" style={{ background: 'conic-gradient(from 0deg, transparent 0 340deg, #ef4444 360deg)' }}></div>
                                </div>
                            )}
                            <button onClick={() => setShowNotifModal(true)} className="relative z-10 w-[34px] h-[34px] m-[2px] bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-300 border border-slate-200 dark:border-slate-600 transition-transform active:scale-95">
                                <Bell size={16} />
                            </button>
                            {(hasUnfilled || waliNotifications.length > 0) && (
                                <span className="absolute -top-1 -right-1 z-20 min-w-[16px] h-[16px] flex items-center justify-center text-[10px] font-bold text-white border-2 border-slate-50 dark:border-slate-800 rounded-full px-[3px] bg-red-500">
                                    {notifications.filter(n => !n.isFilled).length + waliNotifications.length}
                                </span>
                            )}
                        </div>
                    )}
                    {!isAdmin && !isOperator && !isHeadmaster && notifications.length === 0 && waliNotifications.length === 0 && (
                        <button onClick={() => setShowNotifModal(true)} className="relative w-9 h-9 bg-slate-50 dark:bg-slate-700 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-300 border border-slate-200 dark:border-slate-600 transition-transform active:scale-95">
                            <Bell size={18} />
                        </button>
                    )}
                     <button onClick={handleLogoutClick} className="w-9 h-9 bg-slate-50 dark:bg-slate-700 rounded-full flex items-center justify-center text-gray-500 dark:text-slate-300 active:bg-gray-100 border border-slate-200 dark:border-slate-600 flex-shrink-0">
                         <LogOut size={18}/>
                     </button>
                 </div>
             </div>
             {/* Running Date & Time Bar */}
             <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm px-4 py-1.5 border-t border-slate-200/50 dark:border-slate-700 flex justify-between items-center text-[10px] font-bold text-slate-600 dark:text-slate-400">
                 <span>{formattedDate}</span>
                 <span className="font-mono text-purple-600 dark:text-purple-400">{formattedTime} WIB</span>
             </div>
          </div>

          {/* DESKTOP TOP BAR */}
          <div className="hidden md:flex justify-between items-center sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 px-8 py-3 pt-[calc(env(safe-area-inset-top)+0.25rem)]">
              <div className="flex items-center gap-3 text-sm font-bold">
                  <div className="flex items-center gap-1.5 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-3 py-1.5 rounded-xl border border-purple-100 dark:border-purple-800/50 shadow-sm">
                      <span className="text-purple-400 dark:text-purple-500">T.A:</span> {academicYear}
                  </div>
                  <div className="flex items-center gap-1.5 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-3 py-1.5 rounded-xl border border-purple-100 dark:border-purple-800/50 shadow-sm">
                      <span className="text-purple-400 dark:text-purple-500">Semester:</span> {semester}
                  </div>
              </div>
              <div className="flex items-center gap-4 text-xs font-bold text-slate-500 dark:text-slate-400">
                  {!isAdmin && !isOperator && !isHeadmaster && (notifications.length > 0 || waliNotifications.length > 0) && (
                      <div className="relative group hover:scale-105 transition-transform">
                          {(hasUnfilled || waliNotifications.length > 0) && (
                              <div className="absolute inset-0 rounded-full overflow-hidden shadow-sm">
                                  <div className="absolute inset-[-100%] z-0 animate-[spin_4s_linear_infinite]" style={{ background: 'conic-gradient(from 0deg, transparent 0 340deg, #ef4444 360deg)' }}></div>
                              </div>
                          )}
                          <button onClick={() => setShowNotifModal(true)} className="relative z-10 w-[34px] h-[34px] m-[2px] bg-white dark:bg-slate-800 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-300 border border-slate-200 dark:border-slate-600 transition-transform active:scale-95">
                              <Bell size={16} />
                          </button>
                          {(hasUnfilled || waliNotifications.length > 0) && (
                              <span className="absolute -top-1 -right-1 z-20 min-w-[16px] h-[16px] flex items-center justify-center text-[10px] font-bold text-white border-2 border-white dark:border-slate-800 rounded-full px-[3px] bg-red-500">
                                  {notifications.filter(n => !n.isFilled).length + waliNotifications.length}
                              </span>
                          )}
                      </div>
                  )}
                  {!isAdmin && !isOperator && !isHeadmaster && notifications.length === 0 && waliNotifications.length === 0 && (
                      <button onClick={() => setShowNotifModal(true)} className="relative w-9 h-9 bg-slate-50 dark:bg-slate-700 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-300 border border-slate-200 dark:border-slate-600 transition-transform hover:scale-105 active:scale-95">
                          <Bell size={18} />
                      </button>
                  )}
                  <span>{formattedDate}</span>
                  <span className="font-mono text-purple-600 dark:text-purple-400 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">{formattedTime} WIB</span>
                  <button 
                    onClick={() => window.dispatchEvent(new CustomEvent('open-pwa-install-modal'))} 
                    className="w-9 h-9 bg-purple-50 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 rounded-full flex items-center justify-center border border-purple-200 dark:border-purple-800 transition-transform hover:scale-105 active:scale-95 shadow-sm"
                    title="Install Aplikasi SIM-PANLA (PWA)"
                  >
                    <Download size={17} />
                  </button>
                  <button onClick={handleLogoutClick} className="w-9 h-9 ml-1 bg-slate-50 dark:bg-slate-700 rounded-full flex items-center justify-center text-gray-500 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors border border-slate-200 dark:border-slate-600 flex-shrink-0">
                      <LogOut size={18}/>
                  </button>
              </div>
          </div>

          {/* PAGE CONTENT */}
          <div className="p-4 md:p-8 max-w-[1920px] w-full mx-auto pb-28 md:pb-10 page-enter text-slate-800 dark:text-slate-100">
            {children}
          </div>

          {/* SCROLL TO TOP BUTTON (FLOATING) */}
          {showScrollTop && (
              <button 
                  onClick={scrollToTop}
                  className="fixed bottom-24 md:bottom-10 right-6 z-40 p-3 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg transition-all animate-fade-in hover:scale-110"
                  title="Kembali ke Atas"
              >
                  <ArrowUp size={24} />
              </button>
          )}
      </main>

      {/* --- MOBILE BOTTOM NAV (FLUTTER STYLE ANIMATED) --- */}
      {showNav && !isOperator && !isAdmin && (
        <div className="md:hidden fixed bottom-6 left-0 right-0 z-40 flex justify-center pointer-events-none pb-[env(safe-area-inset-bottom)]">
            <div className="relative pointer-events-auto p-[2px] rounded-full overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.12)] max-w-[95vw] group">
                {/* Animated Glow Border */}
                <div className="absolute inset-[-100%] z-0 animate-[spin_4s_linear_infinite]" style={{ background: 'conic-gradient(from 0deg, transparent 0 340deg, #9333ea 360deg)' }}></div>
                <nav className="relative z-10 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-full flex items-center p-2 gap-2 w-full h-full border border-slate-200/50 dark:border-slate-700/50 shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
                <BottomNavItem path="/dashboard" label="Beranda" icon={LayoutDashboard} />

                {!isHeadmaster && (
                    <BottomNavItem path="/apps" label="KBM" icon={LayoutGrid} />
                )}

                {isHeadmaster && (
                    <BottomNavItem path="/kinerja" label="Kinerja" icon={Activity} />
                )}

                <BottomNavItem path="/profile" label="Profil" icon={User} />
            </nav>
            </div>
        </div>
      )}
  
      {/* Mobile Nav for Admin */}
      {showNav && isAdmin && (
           <div className="md:hidden fixed bottom-6 left-0 right-0 z-40 flex justify-center pointer-events-none pb-[env(safe-area-inset-bottom)]">
                <nav className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border border-slate-200 dark:border-slate-700 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex items-center p-2 pointer-events-auto gap-2">
                    <BottomNavItem path="/dashboard" label="Beranda" icon={LayoutDashboard} />
                    <BottomNavItem path="/penyimpanan" label="Buat T.A" icon={Database} />
                    <BottomNavItem path="/settings" label="Pengaturan" icon={Settings} />
                    <BottomNavItem path="/profile" label="Profil" icon={User} />
                </nav>
           </div>
      )}
      {/* Mobile Nav for Operator */}
      {showNav && isOperator && !isAdmin && (
           <div className="md:hidden fixed bottom-6 left-0 right-0 z-40 flex justify-center pointer-events-none pb-[env(safe-area-inset-bottom)]">
                <nav className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border border-slate-200 dark:border-slate-700 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex items-center p-2 pointer-events-auto gap-2">
                    <BottomNavItem path="/operator-dashboard" label="Monitor" icon={MonitorPlay} />
                    <BottomNavItem path="/profile" label="Profil" icon={User} />
                </nav>
           </div>
      )}

      {/* LOGOUT MODAL - TOP POSITIONED (MODERN) */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[9999] flex justify-center items-start pt-16 md:pt-10 p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in w-screen h-[100dvh]" onClick={() => setShowLogoutModal(false)}>
           <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-2xl shadow-2xl p-5 transform scale-100 transition-all border border-slate-100 dark:border-slate-600 relative overflow-hidden group" onClick={(e) => e.stopPropagation()}>
              <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500"></div>
              
              <div className="flex gap-4">
                  <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center flex-shrink-0">
                      <LogOut size={24} className="translate-x-0.5"/>
                  </div>
                  <div>
                      <h3 className="text-lg font-bold text-slate-800 dark:text-white">Konfirmasi Keluar</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Yakin ingin mengakhiri sesi ini?</p>
                  </div>
              </div>

              <div className="flex gap-3 mt-6 pl-16">
                  <button 
                    onClick={() => setShowLogoutModal(false)}
                    className="flex-1 py-2 rounded-lg font-bold text-sm text-slate-600 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors"
                  >
                    Batal
                  </button>
                  <button 
                    onClick={confirmLogout}
                    className="flex-1 py-2 rounded-lg font-bold text-sm text-white bg-red-600 hover:bg-red-700 shadow-lg shadow-red-200 dark:shadow-none transition-colors"
                  >
                    Ya, Keluar
                  </button>
              </div>
           </div>
        </div>
      )}

    
      {showNotifModal && (
        <div className="fixed inset-0 z-[9999] flex justify-center items-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in" onClick={() => setShowNotifModal(false)}>
           <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl w-full max-w-sm rounded-3xl shadow-2xl p-5 transform scale-100 transition-all border border-white/50 dark:border-slate-700/50 relative overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-start mb-4 pb-3 border-b border-gray-100 dark:border-slate-700">
                  <div>
                      <h3 className="text-lg font-extrabold text-slate-800 dark:text-white flex items-center gap-2"><Bell size={20} className="text-purple-500"/> Jadwal Mengajar</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">Klik salah satu untuk mengisi Jurnal Pembelajaran!</p>
                  </div>
                  <button onClick={() => setShowNotifModal(false)} className="text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 dark:bg-slate-700 dark:hover:bg-slate-600 p-1 rounded-full transition-colors"><X size={20}/></button>
              </div>
              
              <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-1">
                  <div>
                    {notifications.length === 0 ? (
                        <div className="text-center py-4">
                            <p className="text-sm font-bold text-gray-500 dark:text-gray-400">Tidak ada jadwal mengajar hari ini.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                        {notifications.map((n, i) => (
                            <button 
                                key={i} 
                                onClick={() => { 
                                    if (isKbmRestricted) {
                                        showAlert(`Fitur Isi Jurnal dikunci. Akun NIP ${profile?.nip || '801-810'} hanya dapat mengakses Presensi QR.`);
                                        return;
                                    }
                                    setShowNotifModal(false); 
                                    navigate('/jurnal', { state: { scheduleId: n.id } }); 
                                }}
                                className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl border border-slate-100 dark:border-slate-600 transition-colors text-left group"
                            >
                                <div>
                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">{n.subject} - Kelas {n.kelas}</p>
                                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Jam ke-{n.hour}</p>
                                </div>
                                <div>
                                    {n.isFilled ? (
                                        <CheckCircle2 size={24} className="text-emerald-500" />
                                    ) : (
                                        <XCircle size={24} className="text-red-500" />
                                    )}
                                </div>
                            </button>
                        ))}
                        </div>
                    )}
                  </div>

                  {waliNotifications.length > 0 && (
                      <div className="border-t border-gray-100 dark:border-slate-700 pt-4">
                          <h4 className="text-sm font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-2"><Bell size={16} className="text-amber-500"/> Notifikasi Wali Kelas</h4>
                          <div className="space-y-2">
                              {waliNotifications.map((wn, i) => (
                                  <div key={'wn'+i} className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-800/30">
                                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{wn.studentName}</p>
                                      <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mt-1">{wn.message}</p>
                                  </div>
                              ))}
                          </div>
                      </div>
                  )}
              </div>
           </div>
        </div>
      )}

    </div>
    </>
  );
};
