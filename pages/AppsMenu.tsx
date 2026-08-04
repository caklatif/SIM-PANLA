
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { showAlert } from '../utils/alert';
import { 
  ChevronRight, BookOpenText, TrendingUp, UserCheck, ShieldAlert, ScanLine, Compass, Database, UserCog, CalendarRange, GraduationCap, Settings, UserMinus, Keyboard, Sun, Lock
} from 'lucide-react';

const AppsMenu: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin, profile, isKbmRestricted } = useAuth();

  // Logic to identify Dhuha Teacher
  const isDhuhaTeacher = profile?.mengajar_mapel?.toLowerCase().includes('dhuha');

  const AppCard = ({ label, subLabel, icon: Icon, path, gradientClass, shadowColor = '', isLocked = false }: any) => {
    return (
    <button
      onClick={() => {
        if (isLocked) {
          showAlert(`Menu ${label} dikunci. Akun NIP ${profile?.nip || '801-810'} hanya dapat mengakses Presensi QR.`);
          return;
        }
        navigate(path);
      }}
      className={`bg-white dark:bg-slate-800 rounded-[2rem] p-6 flex flex-col items-center justify-center gap-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border transition-all duration-300 w-full relative overflow-hidden group text-center min-h-[160px] ${
        isLocked 
          ? 'border-red-200 dark:border-red-900/40 bg-slate-50/90 dark:bg-slate-800/60 opacity-80 cursor-not-allowed' 
          : 'border-slate-100 dark:border-slate-700 hover:shadow-xl hover:-translate-y-1.5'
      }`}
    >
      {isLocked && (
        <div className="absolute top-3 right-3 bg-red-500 text-white p-1.5 rounded-full shadow-md z-20 flex items-center justify-center animate-pulse">
          <Lock size={14} />
        </div>
      )}

      <div className={`w-[76px] h-[76px] shrink-0 flex items-center justify-center rounded-[1.5rem] ${
        isLocked ? 'bg-slate-400 dark:bg-slate-600 opacity-60' : gradientClass
      } transition-transform duration-500 group-hover:scale-110 shadow-lg ${isLocked ? '' : shadowColor}`}>
         <Icon className="w-10 h-10 text-white" strokeWidth={2} />
      </div>
      
      <div className="relative z-10 w-full">
          <h3 className={`text-[14px] md:text-[16px] font-black tracking-tight leading-tight mb-2 ${
            isLocked ? 'text-slate-500 dark:text-slate-400' : 'text-slate-800 dark:text-white'
          }`}>{label}</h3>
          <p className="text-[9px] md:text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed opacity-80">{subLabel?.replace(/\\n/g, ' ')}</p>
      </div>

      {isLocked && (
        <div className="absolute inset-0 bg-red-500/5 pointer-events-none flex items-center justify-center">
          <span className="text-[10px] font-black uppercase text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/60 px-2.5 py-0.5 rounded-full border border-red-200 dark:border-red-800 shadow-xs translate-y-12">
            Terkunci
          </span>
        </div>
      )}
    </button>
  );
  };

  return (
    <Layout>
        <div className="space-y-8 animate-fade-in max-w-6xl mx-auto pb-20">
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-2">
                {isAdmin ? (
                <>
                    <AppCard 
                        label="Import Master" 
                        subLabel="Database CSV"
                        icon={Database} 
                        path="/import-data" 
                        gradientClass="bg-gradient-to-br from-rose-400 to-red-600" 
                    />
                    <AppCard 
                        label="Input Manual" 
                        subLabel="Input Massal CSV"
                        icon={Keyboard} 
                        path="/input-manual" 
                        gradientClass="bg-gradient-to-br from-indigo-400 to-violet-600" 
                    />
                    <AppCard 
                        label="Jadwal Pelajaran" 
                        subLabel="Setup Jadwal"
                        icon={CalendarRange} 
                        path="/input-jadwal" 
                        gradientClass="bg-gradient-to-br from-purple-400 to-fuchsia-600" 
                    />
                    <AppCard 
                        label="Manajemen User" 
                        subLabel="Akun Guru"
                        icon={UserCog} 
                        path="/users" 
                        gradientClass="bg-gradient-to-br from-teal-400 to-emerald-600" 
                    />
                    <AppCard 
                        label="Data Murid" 
                        subLabel="Siswa & Mutasi"
                        icon={GraduationCap} 
                        path="/students" 
                        gradientClass="bg-gradient-to-br from-purple-400 to-cyan-600" 
                    />
                    <AppCard 
                        label="Pengaturan" 
                        subLabel="Konfigurasi Umum"
                        icon={Settings} 
                        path="/settings" 
                        gradientClass="bg-gradient-to-br from-slate-500 to-slate-700" 
                    />
                </>
                ) : (
                <>
                    <AppCard 
                        label="Isi Jurnal" subLabel="INPUT KBM\nHARIAN" shadowColor="shadow-[0_8px_16px_rgba(59,130,246,0.3)]"
                        icon={BookOpenText} 
                        path="/jurnal" 
                        gradientClass="bg-gradient-to-br from-purple-500 to-purple-700" 
                        isLocked={isKbmRestricted}
                    />
                    <AppCard 
                        label="Jadwalku" subLabel="JADWAL\nMENGAJAR" shadowColor="shadow-[0_8px_16px_rgba(99,102,241,0.3)]"
                        icon={Compass} 
                        path="/jadwal" 
                        gradientClass="bg-gradient-to-br from-indigo-400 to-indigo-600" 
                        isLocked={isKbmRestricted}
                    />
                    {isDhuhaTeacher && (
                      <AppCard 
                          label="Presensi Dhuha" subLabel="REKAP\nKEHADIRAN" shadowColor="shadow-[0_8px_16px_rgba(168,85,247,0.3)]"
                          icon={Sun} 
                          path="/rekap-dhuha" 
                          gradientClass="bg-gradient-to-br from-purple-500 to-purple-700" 
                          isLocked={isKbmRestricted}
                      />
                    )}
                    <AppCard 
                        label="Kehadiran" subLabel="REKAP ABSENSI\nMAPEL" shadowColor="shadow-[0_8px_16px_rgba(16,185,129,0.3)]"
                        icon={UserCheck} 
                        path="/rekap-absensi" 
                        gradientClass="bg-gradient-to-br from-emerald-400 to-green-600" 
                        isLocked={isKbmRestricted}
                    />
                     <AppCard 
                        label="Ketidakhadiran" subLabel="UNTUK\nRAPOR" shadowColor="shadow-[0_8px_16px_rgba(244,63,94,0.3)]"
                        icon={UserMinus} 
                        path="/absensi-rapor" 
                        gradientClass="bg-gradient-to-br from-red-400 to-rose-600" 
                        isLocked={isKbmRestricted}
                    />
                    <AppCard 
                        label="Laporan" subLabel="CETAK\nJURNAL" shadowColor="shadow-[0_8px_16px_rgba(245,158,11,0.3)]"
                        icon={TrendingUp} 
                        path="/laporan" 
                        gradientClass="bg-gradient-to-br from-amber-400 to-orange-500" 
                        isLocked={isKbmRestricted}
                    />
                    <AppCard 
                        label="Pelanggaran" subLabel="TEMUAN DI\nLUAR KBM" shadowColor="shadow-[0_8px_16px_rgba(239,68,68,0.3)]"
                        icon={ShieldAlert} 
                        path="/kedisiplinan" 
                        gradientClass="bg-gradient-to-br from-orange-500 to-red-600" 
                        isLocked={isKbmRestricted}
                    />
                    <AppCard 
                        label="Presensi QR" subLabel="SCAN\nKARTU" shadowColor="shadow-[0_8px_16px_rgba(71,85,105,0.3)]"
                        icon={ScanLine} 
                        path="/qr" 
                        gradientClass="bg-gradient-to-br from-slate-600 to-slate-800" 
                        isLocked={false}
                    />
                </>
                )}
            </div>
        </div>
    </Layout>
  );
};

export default AppsMenu;
