import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { Student, Profile } from '../types';
import { 
  Scan, Camera, Keyboard, CheckCircle2, AlertCircle, Clock, Users, 
  Search, Printer, Download, Trash2, RefreshCw, Volume2, VolumeX, 
  Sparkles, GraduationCap, Sun, Check, ArrowRight, ShieldCheck, X,
  Trophy, Lock, UserCheck, ShieldAlert, UserCog, Save, CheckSquare, Square,
  FlipHorizontal, Calendar, FileText, Filter, Maximize2, Minimize2,
  Edit3, PlusCircle, ChevronDown, CheckCircle, ExternalLink, FileSpreadsheet
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { showAlert, showConfirm } from '../utils/alert';

export type PresensiMode = 'harian' | 'dhuha' | 'dzuhur' | 'ekstra';

export interface QRScanRecord {
  id: string;
  nisn: string;
  studentName: string;
  kelas: string;
  timestamp: string;
  mode: PresensiMode;
  status: 'Hadir' | 'Terlambat';
  subject?: string;
  notes?: string;
}

export interface PembinaEkstraItem {
  nip: string;
  nama: string;
  ekstraList: string[]; // e.g. ['PRAMUKA', 'Tahfidz'] or ['Semua']
  canScanHarian?: boolean;
  canScanDhuha?: boolean;
}

export const EKSTRA_LIST = [
  'PRAMUKA',
  'PASKIB',
  'PMR',
  'Tari',
  'Karate',
  'Tahfidz',
  'Bola Voli',
  'Sepak Bola',
  'Bola Basket',
  'Paduan Suara'
];

export default function PresensiQR() {
  const { academicYear, profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  // Pembina Ekstra Authorization State
  const [pembinaEkstraList, setPembinaEkstraList] = useState<PembinaEkstraItem[]>(() => {
    try {
      const saved = localStorage.getItem('simpanla_pembina_ekstra_list');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Check if current logged-in user is a registered Pembina Ekstra
  const currentUserNip = profile?.nip?.trim();
  const currentUserName = profile?.full_name?.trim();

  const assignedPembinaConfig = pembinaEkstraList.find(item => 
    (currentUserNip && item.nip && item.nip.trim() === currentUserNip) ||
    (currentUserName && item.nama && item.nama.toLowerCase().trim() === currentUserName.toLowerCase())
  );

  const isPembina = !!assignedPembinaConfig;
  const canScan = true; // Presensi QR aktif untuk semua guru tanpa batasan

  // Allowed Ekstra list for current user (dikunci khusus untuk Pembina Ekstra yang dikelola Admin)
  const allowedEkstraForUser = isAdmin
    ? EKSTRA_LIST
    : (isPembina && assignedPembinaConfig?.ekstraList && assignedPembinaConfig.ekstraList.length > 0)
    ? (assignedPembinaConfig.ekstraList.includes('Semua') ? EKSTRA_LIST : EKSTRA_LIST.filter(e => assignedPembinaConfig.ekstraList.includes(e)))
    : [];

  // Mode & Tabs
  const [activeTab, setActiveTab] = useState<'scan' | 'history' | 'rekap' | 'cards' | 'pembina'>('scan');
  const [presensiMode, setPresensiMode] = useState<PresensiMode>('harian');
  const [selectedEkstra, setSelectedEkstra] = useState<string>(allowedEkstraForUser[0] || '');

  // Synchronized Ref for Zero-Stale-Closure across Camera Scans, Barcode Gun, and Listeners
  const presensiModeRef = useRef<PresensiMode>(presensiMode);
  const selectedEkstraRef = useRef<string>(selectedEkstra);

  useEffect(() => {
    presensiModeRef.current = presensiMode;
  }, [presensiMode]);

  useEffect(() => {
    selectedEkstraRef.current = selectedEkstra;
  }, [selectedEkstra]);

  // Visual Activity Badge Helper for Teacher Monitoring
  const getActivityBadge = (mode: PresensiMode | string, subject?: string) => {
    if (mode === 'harian') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 shrink-0">
          <span>🛡️ Scan Masuk</span>
        </span>
      );
    } else if (mode === 'dhuha') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shrink-0">
          <span>☀️ Sholat Dhuha</span>
        </span>
      );
    } else if (mode === 'dzuhur') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-cyan-100 dark:bg-cyan-950/80 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 shrink-0">
          <span>🕌 Sholat Dzuhur</span>
        </span>
      );
    } else if (mode === 'ekstra') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
          <span>🏆 Ekstra: {subject || 'Umum'}</span>
        </span>
      );
    }
    return null;
  };

  // Rekap Laporan Ekstra State
  const [rekapSelectedEkstra, setRekapSelectedEkstra] = useState<string>(() => {
    return allowedEkstraForUser[0] || 'Tahfidz';
  });
  const [rekapMonth, setRekapMonth] = useState<string>(() => {
    const d = new Date();
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    return `${yr}-${mo}`;
  });
  const [rekapLogs, setRekapLogs] = useState<any[]>([]);
  const [loadingRekap, setLoadingRekap] = useState<boolean>(false);
  const [rekapSearch, setRekapSearch] = useState<string>('');
  const [rekapClassFilter, setRekapClassFilter] = useState<string>('');
  const [onlyParticipated, setOnlyParticipated] = useState<boolean>(true);

  // Sync selectedEkstra & rekapSelectedEkstra when allowedEkstraForUser changes
  useEffect(() => {
    if (allowedEkstraForUser.length > 0 && !allowedEkstraForUser.includes(selectedEkstra)) {
      setSelectedEkstra(allowedEkstraForUser[0]);
    } else if (allowedEkstraForUser.length === 0) {
      setSelectedEkstra('');
    }

    if (allowedEkstraForUser.length > 0 && !allowedEkstraForUser.includes(rekapSelectedEkstra)) {
      setRekapSelectedEkstra(allowedEkstraForUser[0]);
    }
  }, [allowedEkstraForUser]);

  // Classes list
  const [classes, setClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');

  // Students database cache
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState<boolean>(true);

  // Teachers database cache (for Pembina management)
  const [teachers, setTeachers] = useState<Profile[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState<boolean>(false);
  const [pembinaSearch, setPembinaSearch] = useState<string>('');
  const [savingPembina, setSavingPembina] = useState<boolean>(false);

  // Scanner state
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isRestartingCamera, setIsRestartingCamera] = useState<boolean>(false);
  const [modeRestartNotice, setModeRestartNotice] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isMirrored, setIsMirrored] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('simpanla_qr_mirror');
      return saved !== null ? saved === 'true' : true;
    } catch (e) {
      return true;
    }
  });
  const lastScanTimeRef = useRef<number>(0);
  const [scanCooldown, setScanCooldown] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<string>(() => 
    new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleFullscreen = async (enable?: boolean) => {
    const target = enable !== undefined ? enable : !isFullscreen;
    const wasScanning = isScanning;
    if (isScanning) {
      await stopCamera();
    }
    setIsFullscreen(target);
    if (target) {
      try {
        if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        }
      } catch (e) {}
    } else {
      try {
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      } catch (e) {}
    }
    setTimeout(() => {
      if (canScan && (wasScanning || target)) {
        startCamera();
      }
    }, 200);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        toggleFullscreen(false);
      }
    };
    const handleFsChange = () => {
      if (!document.fullscreenElement && isFullscreen) {
        setIsFullscreen(false);
        setTimeout(() => {
          if (canScan) startCamera();
        }, 200);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('fullscreenchange', handleFsChange);
    };
  }, [isFullscreen, isScanning, canScan]);

  useEffect(() => {
    try {
      localStorage.setItem('simpanla_qr_mirror', String(isMirrored));
    } catch (e) {}
  }, [isMirrored]);
  
  // Last Scanned Result
  const [lastScannedStudent, setLastScannedStudent] = useState<{
    student: Student;
    status: 'Hadir' | 'Terlambat';
    recordTime: string;
    isDuplicate: boolean;
    mode?: PresensiMode | string;
    subject?: string;
  } | null>(null);

  // Scan History
  const [scanHistory, setScanHistory] = useState<QRScanRecord[]>(() => {
    try {
      const saved = localStorage.getItem('simpanla_qr_scans_today');
      if (saved) {
        const parsed = JSON.parse(saved);
        const todayStr = new Date().toISOString().split('T')[0];
        return parsed.filter((item: QRScanRecord) => item.timestamp.startsWith(todayStr));
      }
    } catch (e) {
      console.error('Error loading scan history:', e);
    }
    return [];
  });

  const [loadingLogs, setLoadingLogs] = useState<boolean>(false);
  const [isRealtimeActive, setIsRealtimeActive] = useState<boolean>(true);

  // Database Log Manager Filter State
  const [logDateMode, setLogDateMode] = useState<'today' | 'date' | 'month' | 'all'>('today');
  const [logSelectedDate, setLogSelectedDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [logSelectedMonth, setLogSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [logModeFilter, setLogModeFilter] = useState<string>(''); // '' = all
  const [logEkstraFilter, setLogEkstraFilter] = useState<string>('');
  const [logStatusFilter, setLogStatusFilter] = useState<string>('');
  const [databaseLogs, setDatabaseLogs] = useState<QRScanRecord[]>([]);

  // Filter history
  const [historySearch, setHistorySearch] = useState<string>('');
  const [historyClassFilter, setHistoryClassFilter] = useState<string>('');

  // Manual Add Modal State
  const [showManualAddModal, setShowManualAddModal] = useState<boolean>(false);
  const [manualAddStudentSearch, setManualAddStudentSearch] = useState<string>('');
  const [selectedStudentForManual, setSelectedStudentForManual] = useState<Student | null>(null);
  const [manualAddMode, setManualAddMode] = useState<PresensiMode>('harian');
  const [manualAddStatus, setManualAddStatus] = useState<'Hadir' | 'Terlambat'>('Hadir');
  const [manualAddEkstra, setManualAddEkstra] = useState<string>(EKSTRA_LIST[0]);
  const [manualAddTime, setManualAddTime] = useState<string>(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });
  const [manualAddDate, setManualAddDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [manualAddNotes, setManualAddNotes] = useState<string>('');
  const [savingManual, setSavingManual] = useState<boolean>(false);

  // Edit Status Modal State
  const [editingRecord, setEditingRecord] = useState<QRScanRecord | null>(null);
  const [savingEdit, setSavingEdit] = useState<boolean>(false);

  // Print Report Modal State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);

  // Card Generator
  const [selectedCardClass, setSelectedCardClass] = useState<string>('');
  const [cardSearch, setCardSearch] = useState<string>('');

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'qr-reader-viewfinder';
  const manualInputRef = useRef<HTMLInputElement>(null);

  // Helper UUID check
  const isValidUUID = (str?: string) => {
    if (!str) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
  };

  // Helper to check if a timestamp is from today (local timezone aware)
  const isDateToday = (timestampStr: string) => {
    try {
      const d = new Date(timestampStr);
      const now = new Date();
      return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate()
      );
    } catch (e) {
      return false;
    }
  };

  // Helper to get start and end ISO timestamps for today (covering wide 36-hour UTC range for WIB)
  const getTodayBounds = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const past36Hours = new Date(now.getTime() - 36 * 60 * 60 * 1000);
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return { 
      startISO: start.toISOString(), 
      endISO: end.toISOString(), 
      past36HoursISO: past36Hours.toISOString(),
      todayStr 
    };
  };

  // Broadcast channel reference
  const broadcastChannelRef = useRef<any>(null);

  // Fetch Database Scan Logs from Supabase across all teachers/devices
  const fetchDatabaseLogs = async (showLoading = false) => {
    if (showLoading) setLoadingLogs(true);
    try {
      const combinedRecords: QRScanRecord[] = [];

      let queryLogs = supabase.from('qr_presensi_logs').select('*');
      let queryNotes = supabase.from('journal_notes').select('*').eq('category', 'qr_presensi_log');

      if (logDateMode === 'today') {
        const { past36HoursISO } = getTodayBounds();
        queryLogs = queryLogs.gte('scanned_at', past36HoursISO);
        queryNotes = queryNotes.gte('created_at', past36HoursISO);
      } else if (logDateMode === 'date') {
        const startISO = `${logSelectedDate}T00:00:00.000Z`;
        const endISO = `${logSelectedDate}T23:59:59.999Z`;
        const dateStart = new Date(new Date(startISO).getTime() - 14 * 3600 * 1000).toISOString();
        const dateEnd = new Date(new Date(endISO).getTime() + 14 * 3600 * 1000).toISOString();
        queryLogs = queryLogs.gte('scanned_at', dateStart).lte('scanned_at', dateEnd);
        queryNotes = queryNotes.gte('created_at', dateStart).lte('created_at', dateEnd);
      } else if (logDateMode === 'month') {
        const [yr, mo] = logSelectedMonth.split('-').map(Number);
        const startMonth = new Date(yr, mo - 1, 1, 0, 0, 0).toISOString();
        const endMonth = new Date(yr, mo, 0, 23, 59, 59).toISOString();
        queryLogs = queryLogs.gte('scanned_at', startMonth).lte('scanned_at', endMonth);
        queryNotes = queryNotes.gte('created_at', startMonth).lte('created_at', endMonth);
      } else {
        queryLogs = queryLogs.limit(1000);
        queryNotes = queryNotes.limit(1000);
      }

      queryLogs = queryLogs.order('scanned_at', { ascending: false });
      queryNotes = queryNotes.order('created_at', { ascending: false });

      // 1. Query qr_presensi_logs table
      try {
        const { data, error } = await queryLogs;
        if (!error && data && data.length > 0) {
          data.forEach((item: any) => {
            const itemTime = item.scanned_at || item.created_at;
            let matchesDate = true;
            if (logDateMode === 'today') {
              matchesDate = isDateToday(itemTime);
            } else if (logDateMode === 'date') {
              const localDateStr = new Date(itemTime).toLocaleDateString('en-CA');
              matchesDate = localDateStr === logSelectedDate;
            } else if (logDateMode === 'month') {
              const localMonthStr = new Date(itemTime).toLocaleDateString('en-CA').substring(0, 7);
              matchesDate = localMonthStr === logSelectedMonth;
            }

            if (matchesDate) {
              combinedRecords.push({
                id: item.id || `${item.student_id}-${itemTime}`,
                nisn: item.nisn || '-',
                studentName: item.student_name || '-',
                kelas: item.kelas || '-',
                timestamp: itemTime,
                mode: item.mode || 'harian',
                status: item.status || 'Hadir',
                subject: item.subject || undefined,
                notes: item.notes || undefined,
              });
            }
          });
        }
      } catch (errDb) {
        console.warn('Query qr_presensi_logs warning:', errDb);
      }

      // 2. Query journal_notes fallback (where category = 'qr_presensi_log')
      try {
        const { data: jNotes, error: jNotesErr } = await queryNotes;
        if (!jNotesErr && jNotes && jNotes.length > 0) {
          jNotes.forEach((jn: any) => {
            const itemTime = jn.created_at;
            let matchesDate = true;
            if (logDateMode === 'today') {
              matchesDate = isDateToday(itemTime);
            } else if (logDateMode === 'date') {
              const localDateStr = new Date(itemTime).toLocaleDateString('en-CA');
              matchesDate = localDateStr === logSelectedDate;
            } else if (logDateMode === 'month') {
              const localMonthStr = new Date(itemTime).toLocaleDateString('en-CA').substring(0, 7);
              matchesDate = localMonthStr === logSelectedMonth;
            }

            if (matchesDate) {
              try {
                if (jn.note && jn.note.startsWith('{')) {
                  const parsed = JSON.parse(jn.note);
                  combinedRecords.push({
                    id: parsed.id || jn.id,
                    nisn: parsed.nisn || '-',
                    studentName: parsed.studentName || jn.student_name || '-',
                    kelas: parsed.kelas || '-',
                    timestamp: parsed.timestamp || jn.created_at,
                    mode: parsed.mode || (jn.follow_up as PresensiMode) || 'harian',
                    status: parsed.status || 'Hadir',
                    subject: parsed.subject || undefined,
                    notes: parsed.notes || undefined,
                  });
                }
              } catch (e) {}
            }
          });
        }
      } catch (errJn) {
        console.warn('Query journal_notes backup warning:', errJn);
      }

      // 3. Query shared app_settings backup if today mode
      if (logDateMode === 'today') {
        try {
          const { data: settingData } = await supabase
            .from('app_settings')
            .select('value')
            .eq('key', 'today_qr_scans_sync')
            .single();

          if (settingData && settingData.value) {
            const parsed = JSON.parse(settingData.value);
            if (Array.isArray(parsed)) {
              parsed.forEach((item: any) => {
                if (item.timestamp && isDateToday(item.timestamp)) {
                  combinedRecords.push(item);
                }
              });
            }
          }
        } catch (errSetting) {}
      }

      // 4. Merge & deduplicate
      const map = new Map<string, QRScanRecord>();
      combinedRecords.forEach(r => {
        const key = `${r.nisn.trim()}_${r.mode}_${r.subject || ''}_${r.timestamp.substring(0, 16)}`;
        map.set(key, r);
      });

      // Preserve local items for today if in today mode
      if (logDateMode === 'today') {
        scanHistory.forEach(p => {
          if (isDateToday(p.timestamp)) {
            const key = `${p.nisn.trim()}_${p.mode}_${p.subject || ''}_${p.timestamp.substring(0, 16)}`;
            if (!map.has(key)) {
              map.set(key, p);
            }
          }
        });
      }

      const sorted = Array.from(map.values()).sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setDatabaseLogs(sorted);
      if (logDateMode === 'today') {
        setScanHistory(sorted);
      }
    } catch (err) {
      console.warn('Failed to fetch presensi logs:', err);
    } finally {
      if (showLoading) setLoadingLogs(false);
    }
  };

  // Realtime Supabase Subscription & Broadcast Channel
  useEffect(() => {
    fetchDatabaseLogs(true);

    const channel = supabase
      .channel('simpanla_qr_presensi_live_room', {
        config: {
          broadcast: { self: true },
        },
      })
      .on('broadcast', { event: 'NEW_SCAN' }, ({ payload }) => {
        if (!payload) return;
        setIsRealtimeActive(true);
        const updateList = (prev: QRScanRecord[]) => {
          const key = `${payload.nisn.trim()}_${payload.mode}_${payload.subject || ''}_${payload.timestamp.substring(0, 16)}`;
          const exists = prev.some(item => 
            item.id === payload.id || 
            `${item.nisn.trim()}_${item.mode}_${item.subject || ''}_${item.timestamp.substring(0, 16)}` === key
          );
          if (exists) {
            return prev.map(item => item.id === payload.id ? payload : item);
          }
          return [payload, ...prev];
        };

        if (payload.timestamp && isDateToday(payload.timestamp)) {
          setScanHistory(prev => updateList(prev));
        }
        setDatabaseLogs(prev => updateList(prev));
      })
      .on('broadcast', { event: 'UPDATE_SCAN' }, ({ payload }) => {
        if (!payload?.id) return;
        setScanHistory(prev => prev.map(item => item.id === payload.id ? { ...item, ...payload } : item));
        setDatabaseLogs(prev => prev.map(item => item.id === payload.id ? { ...item, ...payload } : item));
      })
      .on('broadcast', { event: 'DELETE_SCAN' }, ({ payload }) => {
        if (payload?.id) {
          setScanHistory(prev => prev.filter(item => item.id !== payload.id));
          setDatabaseLogs(prev => prev.filter(item => item.id !== payload.id));
        }
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'qr_presensi_logs',
        },
        (payload) => {
          setIsRealtimeActive(true);
          if (payload.eventType === 'INSERT' && payload.new) {
            const newRow = payload.new;
            const newRecord: QRScanRecord = {
              id: newRow.id || `${Date.now()}`,
              nisn: newRow.nisn || '-',
              studentName: newRow.student_name || '-',
              kelas: newRow.kelas || '-',
              timestamp: newRow.scanned_at || newRow.created_at,
              mode: newRow.mode || 'harian',
              status: newRow.status || 'Hadir',
              subject: newRow.subject || undefined,
            };

            if (newRow.scanned_at && isDateToday(newRow.scanned_at)) {
              setScanHistory(prev => {
                const key = `${newRecord.nisn.trim()}_${newRecord.mode}_${newRecord.subject || ''}_${newRecord.timestamp.substring(0, 16)}`;
                const exists = prev.some(item => item.id === newRecord.id || `${item.nisn.trim()}_${item.mode}_${item.subject || ''}_${item.timestamp.substring(0, 16)}` === key);
                if (exists) return prev.map(item => item.id === newRecord.id ? newRecord : item);
                return [newRecord, ...prev];
              });
            }

            setDatabaseLogs(prev => {
              const key = `${newRecord.nisn.trim()}_${newRecord.mode}_${newRecord.subject || ''}_${newRecord.timestamp.substring(0, 16)}`;
              const exists = prev.some(item => item.id === newRecord.id || `${item.nisn.trim()}_${item.mode}_${item.subject || ''}_${item.timestamp.substring(0, 16)}` === key);
              if (exists) return prev.map(item => item.id === newRecord.id ? newRecord : item);
              return [newRecord, ...prev];
            });
          } else if (payload.eventType === 'DELETE' && payload.old?.id) {
            const deletedId = payload.old.id;
            setScanHistory(prev => prev.filter(item => item.id !== deletedId));
            setDatabaseLogs(prev => prev.filter(item => item.id !== deletedId));
          } else if (payload.eventType === 'UPDATE' && payload.new?.id) {
            const updatedRow = payload.new;
            const updateFn = (prev: QRScanRecord[]) => prev.map(item => item.id === updatedRow.id ? {
              ...item,
              status: updatedRow.status || item.status,
              mode: updatedRow.mode || item.mode,
              subject: updatedRow.subject || item.subject,
            } : item);
            setScanHistory(updateFn);
            setDatabaseLogs(updateFn);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'journal_notes',
          filter: 'category=eq.qr_presensi_log',
        },
        (payload) => {
          setIsRealtimeActive(true);
          if (payload.eventType === 'INSERT' && payload.new) {
            const jn = payload.new;
            if (jn.note && jn.note.startsWith('{')) {
              try {
                const parsed = JSON.parse(jn.note);
                const rec: QRScanRecord = {
                  id: parsed.id || jn.id,
                  nisn: parsed.nisn || '-',
                  studentName: parsed.studentName || jn.student_name || '-',
                  kelas: parsed.kelas || '-',
                  timestamp: parsed.timestamp || jn.created_at,
                  mode: parsed.mode || (jn.follow_up as PresensiMode) || 'harian',
                  status: parsed.status || 'Hadir',
                  subject: parsed.subject || undefined,
                };
                if (jn.created_at && isDateToday(jn.created_at)) {
                  setScanHistory(prev => {
                    const key = `${rec.nisn.trim()}_${rec.mode}_${rec.subject || ''}_${rec.timestamp.substring(0, 16)}`;
                    if (prev.some(item => item.id === rec.id || `${item.nisn.trim()}_${item.mode}_${item.subject || ''}_${item.timestamp.substring(0, 16)}` === key)) {
                      return prev.map(item => item.id === rec.id ? rec : item);
                    }
                    return [rec, ...prev];
                  });
                }
                setDatabaseLogs(prev => {
                  const key = `${rec.nisn.trim()}_${rec.mode}_${rec.subject || ''}_${rec.timestamp.substring(0, 16)}`;
                  if (prev.some(item => item.id === rec.id || `${item.nisn.trim()}_${item.mode}_${item.subject || ''}_${item.timestamp.substring(0, 16)}` === key)) {
                    return prev.map(item => item.id === rec.id ? rec : item);
                  }
                  return [rec, ...prev];
                });
              } catch (e) {}
            }
          } else if (payload.eventType === 'DELETE' && payload.old?.id) {
            const deletedId = payload.old.id;
            setScanHistory(prev => prev.filter(item => item.id !== deletedId));
            setDatabaseLogs(prev => prev.filter(item => item.id !== deletedId));
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsRealtimeActive(true);
        }
      });

    broadcastChannelRef.current = channel;

    // Background Polling every 5 seconds as continuous live sync guarantee
    const interval = setInterval(() => {
      fetchDatabaseLogs(false);
    }, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [logDateMode, logSelectedDate, logSelectedMonth]);

  // Safety fallback for non-admins trying to open admin tabs
  useEffect(() => {
    if ((activeTab === 'cards' || activeTab === 'pembina') && !isAdmin) {
      setActiveTab('scan');
    }
  }, [activeTab, isAdmin]);

  // Load Pembina Ekstra configuration from Supabase or localStorage
  useEffect(() => {
    loadPembinaConfig();
  }, []);

  const loadPembinaConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'pembina_ekstra_list')
        .single();

      if (data && data.value) {
        const parsed = JSON.parse(data.value);
        setPembinaEkstraList(parsed);
        localStorage.setItem('simpanla_pembina_ekstra_list', JSON.stringify(parsed));
      }
    } catch (e) {
      // Fallback to local storage if setting row not yet created
    }
  };

  // Audio Beep Generator using Web Audio API
  const playBeep = (type: 'success' | 'warning' | 'error', forcePlay = false) => {
    if (!soundEnabled && !forcePlay) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;

      if (type === 'success') {
        // High-pitched cheerful double chime (A5 to E6)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.setValueAtTime(1318.51, now + 0.08);
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
        osc.start(now);
        osc.stop(now + 0.22);
      } else if (type === 'warning') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(392.00, now + 0.1);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);
        osc.start(now);
        osc.stop(now + 0.28);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.setValueAtTime(180, now + 0.12);
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      }
    } catch (e) {
      console.warn('Audio feedback error:', e);
    }
  };

  // Save history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('simpanla_qr_scans_today', JSON.stringify(scanHistory));
    } catch (e) {
      console.error('Failed to persist scan history:', e);
    }
  }, [scanHistory]);

  // Load students from database
  useEffect(() => {
    fetchStudents();
  }, [academicYear]);

  const fetchStudents = async () => {
    setLoadingStudents(true);
    try {
      const year = academicYear || '2025/2026';
      let { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('academic_year', year)
        .order('kelas', { ascending: true })
        .order('name', { ascending: true });

      if (error || !data || data.length === 0) {
        const res = await supabase.from('students').select('*').order('kelas', { ascending: true }).order('name', { ascending: true });
        if (res.data && res.data.length > 0) {
          data = res.data;
        }
      }

      const loadedStudents = data || [];
      setStudents(loadedStudents);

      const uniqueClasses = Array.from(new Set(loadedStudents.map((s: Student) => s.kelas))).filter(Boolean).sort() as string[];
      setClasses(uniqueClasses);
      if (uniqueClasses.length > 0) {
        setSelectedClass(uniqueClasses[0]);
        setSelectedCardClass(uniqueClasses[0]);
      }
    } catch (err: any) {
      console.error('Failed to fetch students:', err);
    } finally {
      setLoadingStudents(false);
    }
  };

  // Fetch teachers for Pembina Ekstra management
  const fetchTeachers = async () => {
    setLoadingTeachers(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name', { ascending: true });

      if (!error && data) {
        setTeachers(data);
      }
    } catch (e) {
      console.error('Error fetching teachers:', e);
    } finally {
      setLoadingTeachers(false);
    }
  };

  useEffect(() => {
    if (isAdmin && activeTab === 'pembina') {
      fetchTeachers();
    }
  }, [isAdmin, activeTab]);

  // Fetch Rekap Logs for Ekstrakurikuler
  useEffect(() => {
    if (activeTab === 'rekap' && rekapSelectedEkstra) {
      fetchRekapLogs();
    }
  }, [activeTab, rekapSelectedEkstra, rekapMonth, academicYear]);

  const fetchRekapLogs = async () => {
    if (!rekapSelectedEkstra) return;
    setLoadingRekap(true);
    try {
      let query = supabase
        .from('qr_presensi_logs')
        .select('*')
        .eq('mode', 'ekstra')
        .eq('subject', rekapSelectedEkstra);

      if (rekapMonth !== 'all') {
        const [yrStr, moStr] = rekapMonth.split('-');
        const yr = parseInt(yrStr, 10);
        const mo = parseInt(moStr, 10);
        
        const startDate = new Date(Date.UTC(yr, mo - 1, 1, 0, 0, 0)).toISOString();
        const endDate = new Date(Date.UTC(yr, mo, 1, 0, 0, 0)).toISOString();
        
        query = query.gte('scanned_at', startDate).lt('scanned_at', endDate);
      }

      const { data, error } = await query.order('scanned_at', { ascending: true });

      let fetchedLogs: any[] = data || [];

      // Merge local scanHistory items from today if matching mode & subject
      const todayLocalMatch = scanHistory.filter(
        item => item.mode === 'ekstra' && item.subject === rekapSelectedEkstra
      );

      todayLocalMatch.forEach(localItem => {
        const ts = localItem.timestamp;
        if (rekapMonth === 'all' || ts.startsWith(rekapMonth)) {
          const isAlreadyInFetched = fetchedLogs.some(
            l => l.nisn === localItem.nisn && l.scanned_at.substring(0, 16) === ts.substring(0, 16)
          );
          if (!isAlreadyInFetched) {
            fetchedLogs.push({
              id: localItem.id,
              student_id: localItem.id,
              nisn: localItem.nisn,
              student_name: localItem.studentName,
              kelas: localItem.kelas,
              mode: 'ekstra',
              subject: localItem.subject,
              status: localItem.status,
              scanned_at: localItem.timestamp,
            });
          }
        }
      });

      setRekapLogs(fetchedLogs);
    } catch (err) {
      console.error('Failed to fetch rekap logs:', err);
    } finally {
      setLoadingRekap(false);
    }
  };

  // Process & Aggregate Rekap Summary per Student
  const getRekapSummary = () => {
    const summaryMap = new Map<string, {
      nisn: string;
      name: string;
      kelas: string;
      totalHadir: number;
      totalTerlambat: number;
      totalKehadiran: number;
      datesSet: Set<string>;
      datesFormattedList: string[];
      lastScannedAt: string;
    }>();

    // Process logs
    rekapLogs.forEach(log => {
      const key = (log.nisn || log.student_name || '').trim();
      if (!key) return;

      if (!summaryMap.has(key)) {
        const std = students.find(s => s.nisn === log.nisn || s.name === log.student_name);
        summaryMap.set(key, {
          nisn: log.nisn || std?.nisn || std?.nis || '-',
          name: log.student_name || std?.name || 'Siswa',
          kelas: log.kelas || std?.kelas || '-',
          totalHadir: 0,
          totalTerlambat: 0,
          totalKehadiran: 0,
          datesSet: new Set<string>(),
          datesFormattedList: [],
          lastScannedAt: log.scanned_at,
        });
      }

      const item = summaryMap.get(key)!;
      if (log.status === 'Terlambat') {
        item.totalTerlambat += 1;
      } else {
        item.totalHadir += 1;
      }
      item.totalKehadiran += 1;

      const d = new Date(log.scanned_at);
      const dateOnly = d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const timeOnly = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      
      const dayStr = d.toISOString().substring(0, 10);
      item.datesSet.add(dayStr);
      item.datesFormattedList.push(`${dateOnly} (${timeOnly})`);

      if (new Date(log.scanned_at) > new Date(item.lastScannedAt)) {
        item.lastScannedAt = log.scanned_at;
      }
    });

    let resultList = Array.from(summaryMap.values());

    // If user wants all students (including 0 attendance)
    if (!onlyParticipated) {
      students.forEach(std => {
        const key = (std.nisn || std.name || '').trim();
        if (key && !summaryMap.has(key)) {
          resultList.push({
            nisn: std.nisn || std.nis || '-',
            name: std.name,
            kelas: std.kelas,
            totalHadir: 0,
            totalTerlambat: 0,
            totalKehadiran: 0,
            datesSet: new Set<string>(),
            datesFormattedList: [],
            lastScannedAt: '-',
          });
        }
      });
    }

    // Apply Search Filter
    if (rekapSearch.trim()) {
      const q = rekapSearch.toLowerCase().trim();
      resultList = resultList.filter(
        item =>
          item.name.toLowerCase().includes(q) ||
          item.nisn.toLowerCase().includes(q) ||
          item.kelas.toLowerCase().includes(q)
      );
    }

    // Apply Class Filter
    if (rekapClassFilter) {
      resultList = resultList.filter(item => item.kelas === rekapClassFilter);
    }

    // Sort by Kelas then Name
    resultList.sort((a, b) => {
      if (a.kelas !== b.kelas) return a.kelas.localeCompare(b.kelas);
      return a.name.localeCompare(b.name);
    });

    return resultList;
  };

  // Helper for Month Label
  const getRekapMonthLabel = (mVal: string) => {
    if (mVal === 'all') return 'Semua Bulan (All-Time / Total Kehadiran)';
    const [yr, mo] = mVal.split('-');
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const idx = parseInt(mo, 10) - 1;
    return `${monthNames[idx] || mo} ${yr}`;
  };

  // Export Rekap CSV
  const exportRekapCSV = () => {
    const summary = getRekapSummary();
    if (summary.length === 0) {
      showAlert('Tidak ada data rekap untuk diexport.', 'Perhatian');
      return;
    }

    const periodText = rekapMonth === 'all' ? 'Semua_Periode' : rekapMonth;
    const fileName = `Rekap_Presensi_${rekapSelectedEkstra.replace(/\s+/g, '_')}_${periodText}.csv`;

    const headers = ['No', 'NISN', 'Nama Siswa', 'Kelas', 'Total Kehadiran', 'Tepat Waktu', 'Terlambat', 'Detail Tanggal Scan'];
    const rows = summary.map((item, idx) => [
      idx + 1,
      `"${item.nisn}"`,
      `"${item.name}"`,
      `"${item.kelas}"`,
      item.totalKehadiran,
      item.totalHadir,
      item.totalTerlambat,
      `"${item.datesFormattedList.join(', ')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Save Pembina Ekstra Configuration
  const handleSavePembinaConfig = async (newList: PembinaEkstraItem[]) => {
    setSavingPembina(true);
    try {
      setPembinaEkstraList(newList);
      localStorage.setItem('simpanla_pembina_ekstra_list', JSON.stringify(newList));

      // Upsert to app_settings table in Supabase
      const { error } = await supabase
        .from('app_settings')
        .upsert({
          key: 'pembina_ekstra_list',
          value: JSON.stringify(newList),
          description: 'Daftar Guru Pembina Ekstrakurikuler yang diizinkan menscan QR Presensi'
        }, { onConflict: 'key' });

      if (error) throw error;
      showAlert('Daftar Pembina Ekstrakurikuler berhasil diperbarui & disimpan!', 'Berhasil');
    } catch (err: any) {
      console.error('Failed to save pembina config:', err);
      showAlert('Pengaturan tersimpan secara lokal di browser.');
    } finally {
      setSavingPembina(false);
    }
  };

  // Toggle teacher as Pembina Ekstra
  const handleTogglePembinaTeacher = (teacher: Profile) => {
    const existingIndex = pembinaEkstraList.findIndex(p => p.nip === teacher.nip || p.nama === teacher.full_name);
    let newList = [...pembinaEkstraList];

    if (existingIndex !== -1) {
      // Remove
      newList.splice(existingIndex, 1);
    } else {
      // Add as Pembina
      newList.push({
        nip: teacher.nip || '',
        nama: teacher.full_name || '',
        ekstraList: ['PRAMUKA'],
        canScanHarian: true,
        canScanDhuha: true,
      });
    }

    handleSavePembinaConfig(newList);
  };

  // Toggle assigned Ekstra for a Pembina
  const handleToggleEkstraForPembina = (nip: string, ekstraName: string) => {
    const newList = pembinaEkstraList.map(item => {
      if (item.nip === nip) {
        let currentList = item.ekstraList || [];
        if (currentList.includes(ekstraName)) {
          currentList = currentList.filter(e => e !== ekstraName);
        } else {
          currentList = [...currentList, ekstraName];
        }
        if (currentList.length === 0) currentList = ['PRAMUKA'];
        return { ...item, ekstraList: currentList };
      }
      return item;
    });

    handleSavePembinaConfig(newList);
  };

  // Start QR Camera Scanner
  const startCamera = async () => {
    if (!canScan) return;
    setCameraError(null);
    try {
      if (html5QrCodeRef.current) {
        await stopCamera();
      }

      const element = document.getElementById(scannerContainerId);
      if (!element) {
        setTimeout(() => startCamera(), 100);
        return;
      }

      const html5QrCode = new Html5Qrcode(scannerContainerId);
      html5QrCodeRef.current = html5QrCode;

      const config = {
        fps: 15,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const qrboxSize = Math.floor(minEdge * 0.75);
          return { width: Math.max(220, qrboxSize), height: Math.max(220, qrboxSize) };
        },
      };

      try {
        await html5QrCode.start(
          { facingMode: 'environment' },
          config,
          (decodedText) => {
            handleScanSuccess(decodedText);
          },
          () => {}
        );
      } catch (firstErr) {
        console.warn('Facing mode environment failed, trying available camera devices:', firstErr);
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          const backCam = devices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('rear')) || devices[devices.length - 1];
          await html5QrCode.start(
            backCam.id,
            config,
            (decodedText) => {
              handleScanSuccess(decodedText);
            },
            () => {}
          );
        } else {
          throw firstErr;
        }
      }

      setIsScanning(true);
    } catch (err: any) {
      console.error('Camera start error:', err);
      setCameraError('Gagal mengakses kamera. Pastikan izin kamera telah diberikan atau gunakan opsi Input Manual / Barcode Gun.');
      setIsScanning(false);
    }
  };

  // Stop Camera
  const stopCamera = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current.clear();
      } catch (e) {
        console.warn('Error stopping camera:', e);
      }
      html5QrCodeRef.current = null;
    }
    setIsScanning(false);
  };

  // Restart Camera Automatically on Activity Selection / Mode Switch
  const restartCameraForActivity = async (targetMode: PresensiMode, targetEkstra?: string) => {
    // 1. Synchronously update ref values so any scanner callback or input immediately uses the new target mode
    presensiModeRef.current = targetMode;
    if (targetEkstra !== undefined) {
      selectedEkstraRef.current = targetEkstra;
    }
    setPresensiMode(targetMode);
    if (targetEkstra !== undefined) {
      setSelectedEkstra(targetEkstra);
    }

    const activeEkstra = targetEkstra !== undefined ? targetEkstra : selectedEkstraRef.current;
    const activityLabel = getModeLabel(targetMode, activeEkstra);
    setIsRestartingCamera(true);
    setModeRestartNotice(`Mengalihkan kamera ke Presensi ${activityLabel}...`);

    try {
      // 2. Matikan kamera aktif terlebih dahulu
      await stopCamera();

      // 3. Beri jeda 350ms agar hardware kamera dan media stream browser ter-reset sempurna
      await new Promise(resolve => setTimeout(resolve, 350));

      // 4. Hidupkan kembali kamera secara otomatis dan siap scan
      if (canScan) {
        await startCamera();
        setModeRestartNotice(`✓ Kamera siap memindai: ${activityLabel}`);
        if (soundEnabled) {
          playBeep('success', true);
        }
        setTimeout(() => {
          setModeRestartNotice(null);
          setIsRestartingCamera(false);
        }, 2200);
      } else {
        setIsRestartingCamera(false);
        setModeRestartNotice(null);
      }
    } catch (err) {
      console.error('Error restarting camera for activity:', err);
      setIsRestartingCamera(false);
      setModeRestartNotice(null);
    }
  };

  // Handler for Activity Mode Selection (Scan Masuk / Dhuha / Dzuhur / Ekstra)
  const handleSelectMode = async (newMode: PresensiMode) => {
    if (newMode === 'ekstra' && allowedEkstraForUser.length === 0 && !isAdmin) {
      showAlert('Pilihan Ekstrakurikuler hanya tersedia untuk Guru yang telah ditunjuk sebagai Pembina Ekstrakurikuler di Dashboard Admin.', 'Akses Ekstra Dibatasi');
      return;
    }

    await restartCameraForActivity(newMode, selectedEkstraRef.current);
  };

  // Handler for specific Ekstrakurikuler Selection (PRAMUKA, PASKIB, PMR, dll)
  const handleSelectEkstra = async (ekstraName: string) => {
    await restartCameraForActivity('ekstra', ekstraName);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Process Scanned NISN / Raw Code
  const handleScanSuccess = async (rawValue: string) => {
    if (!rawValue) return;

    // Check 1-second cooldown delay between consecutive scans
    const nowTime = Date.now();
    if (nowTime - lastScanTimeRef.current < 1000) {
      return; // Jeda 1 detik belum berlalu, abaikan scan ini
    }
    lastScanTimeRef.current = nowTime;

    setScanCooldown(true);
    setTimeout(() => {
      setScanCooldown(false);
    }, 1000);

    const currentMode = presensiModeRef.current;
    const currentEkstra = selectedEkstraRef.current;

    if (currentMode === 'ekstra' && allowedEkstraForUser.length === 0 && !isAdmin) {
      playBeep('error');
      showAlert('Pilihan Ekstrakurikuler hanya tersedia untuk Guru yang telah ditunjuk sebagai Pembina Ekstrakurikuler di Dashboard Admin.', 'Akses Ekstra Dibatasi');
      return;
    }

    let cleanCode = rawValue.replace(/[\r\n\t]/g, '').trim();
    if (cleanCode.startsWith('NISN:')) {
      cleanCode = cleanCode.replace(/^NISN:\s*/i, '').trim();
    } else if (cleanCode.startsWith('NIS:')) {
      cleanCode = cleanCode.replace(/^NIS:\s*/i, '').trim();
    } else if (cleanCode.includes('{')) {
      try {
        const obj = JSON.parse(cleanCode);
        cleanCode = obj.nisn || obj.nis || cleanCode;
      } catch (e) {}
    }

    const cleanDigits = cleanCode.replace(/\D/g, '');

    // 1. Match from in-memory students list
    let matchedStudent = students.find(
      s => (s.nisn && s.nisn.trim() === cleanCode) || 
           (s.nis && s.nis.trim() === cleanCode) ||
           (cleanDigits.length >= 4 && s.nisn && s.nisn.replace(/\D/g, '') === cleanDigits)
    );

    // 2. Direct online DB lookup fallback if not found in local cache
    if (!matchedStudent) {
      try {
        let query = supabase.from('students').select('*');
        if (cleanDigits.length >= 4) {
          query = query.or(`nisn.eq.${cleanCode},nis.eq.${cleanCode},nisn.ilike.%${cleanDigits}%`);
        } else {
          query = query.or(`nisn.eq.${cleanCode},nis.eq.${cleanCode}`);
        }
        const { data: dbRes } = await query.limit(1);
        if (dbRes && dbRes.length > 0) {
          matchedStudent = dbRes[0];
          setStudents(prev => [matchedStudent!, ...prev.filter(s => s.id !== matchedStudent!.id)]);
        }
      } catch (errDb) {
        console.warn('Direct online student lookup warning:', errDb);
      }
    }

    const now = new Date();
    const timeString = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const fullTimestamp = now.toISOString();

    const currentHour = now.getHours();
    const currentMin = now.getMinutes();
    const isLate = currentMode === 'harian' && (currentHour > 7 || (currentHour === 7 && currentMin > 15));
    const status: 'Hadir' | 'Terlambat' = isLate ? 'Terlambat' : 'Hadir';

    if (!matchedStudent) {
      playBeep('error');
      showAlert(`NISN / Kartu "${cleanCode}" tidak ditemukan di database siswa.`, 'Siswa Tidak Ditemukan');
      return;
    }

    // Check duplicate scan
    const activeSubject = currentMode === 'ekstra' ? currentEkstra : undefined;

    const existingIndex = scanHistory.findIndex(
      item => (item.nisn === matchedStudent!.nisn || (cleanDigits.length >= 4 && item.nisn.replace(/\D/g, '') === cleanDigits)) && 
              item.mode === currentMode && 
              (currentMode === 'ekstra' ? item.subject === currentEkstra : true)
    );

    const isDuplicate = existingIndex !== -1;

    if (isDuplicate) {
      playBeep('warning');
      const dupItem = scanHistory[existingIndex];
      setLastScannedStudent({
        student: matchedStudent,
        status: dupItem.status,
        recordTime: dupItem.timestamp.split('T')[1]?.substring(0, 8) || timeString,
        isDuplicate: true,
        mode: dupItem.mode,
        subject: dupItem.subject,
      });
      return;
    }

    // Record new scan
    playBeep('success');

    const newRecord: QRScanRecord = {
      id: `${Date.now()}-${matchedStudent.id || cleanDigits}`,
      nisn: matchedStudent.nisn || matchedStudent.nis || cleanCode,
      studentName: matchedStudent.name,
      kelas: matchedStudent.kelas,
      timestamp: fullTimestamp,
      mode: currentMode,
      status: status,
      subject: activeSubject,
    };

    setScanHistory(prev => [newRecord, ...prev]);
    setLastScannedStudent({
      student: matchedStudent,
      status: status,
      recordTime: timeString,
      isDuplicate: false,
      mode: currentMode,
      subject: activeSubject,
    });

    // Broadcast scan immediately to all open clients/admin screens
    try {
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.send({
          type: 'broadcast',
          event: 'NEW_SCAN',
          payload: newRecord,
        });
      }
    } catch (bcErr) {
      console.warn('Broadcast send error:', bcErr);
    }

    syncToSupabase(newRecord, matchedStudent, status, currentMode, activeSubject);
  };

  // Sync to database and shared cloud settings
  const syncToSupabase = async (
    record: QRScanRecord,
    student: Student,
    status: 'Hadir' | 'Terlambat',
    mode: string,
    subject?: string
  ) => {
    const nowIso = record.timestamp || new Date().toISOString();
    const studentUuid = isValidUUID(student.id) ? student.id : null;

    // 1. Insert into qr_presensi_logs table
    try {
      const { data, error } = await supabase.from('qr_presensi_logs').insert([{
        student_id: studentUuid,
        student_name: student.name,
        nisn: student.nisn || student.nis || record.nisn,
        kelas: student.kelas,
        mode: mode,
        status: status,
        subject: subject || null,
        scanned_at: nowIso,
        academic_year: academicYear || '2025/2026'
      }]).select();

      if (!error && data && data[0]) {
        setScanHistory(prev => prev.map(item => 
          (item.id === record.id || (item.nisn === record.nisn && item.mode === mode && item.timestamp.substring(0, 16) === nowIso.substring(0, 16)))
            ? { ...item, id: data[0].id }
            : item
        ));
      }
    } catch (e) {
      console.warn('Primary qr_presensi_logs sync failed, will sync via backup journal_notes and app_settings:', e);
    }

    // 2. Insert into journal_notes fallback (where category = 'qr_presensi_log') - 100% accessible to all teachers & admins
    try {
      await supabase.from('journal_notes').insert([{
        student_id: studentUuid,
        student_name: student.name,
        type: 'kedisiplinan',
        category: 'qr_presensi_log',
        note: JSON.stringify(record),
        follow_up: mode,
        academic_year: academicYear || '2025/2026',
        created_at: nowIso,
      }]);
    } catch (jnErr) {
      console.warn('Failed to insert into journal_notes backup:', jnErr);
    }

    // 3. Backup & sync to app_settings key 'today_qr_scans_sync'
    try {
      const { data: existingData } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'today_qr_scans_sync')
        .single();

      let currentSyncList: QRScanRecord[] = [];
      if (existingData && existingData.value) {
        try {
          const parsed = JSON.parse(existingData.value);
          if (Array.isArray(parsed)) {
            currentSyncList = parsed.filter(item => isDateToday(item.timestamp));
          }
        } catch (parseErr) {}
      }

      const deduplicated = currentSyncList.filter(
        item => !(item.nisn === record.nisn && item.mode === record.mode && (item.subject || '') === (record.subject || ''))
      );
      deduplicated.unshift(record);

      await supabase.from('app_settings').upsert({
        key: 'today_qr_scans_sync',
        value: JSON.stringify(deduplicated.slice(0, 500)),
        description: 'Realtime backup of today scan presensi records'
      }, { onConflict: 'key' });
    } catch (settingErr) {
      // setting upsert may be restricted for non-admins, but journal_notes and broadcast already succeeded!
    }
  };

  // Handle Manual Form Submit or Barcode Gun Enter
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    handleScanSuccess(manualInput.trim());
    setManualInput('');
    if (manualInputRef.current) {
      manualInputRef.current.focus();
    }
  };

  // Delete item from history
  const handleDeleteHistory = async (id: string) => {
    const targetItem = scanHistory.find(item => item.id === id) || databaseLogs.find(item => item.id === id);
    const confirmed = await showConfirm('Hapus catatan presensi ini dari database dan daftar scan?');
    if (confirmed) {
      setScanHistory(prev => prev.filter(item => item.id !== id));
      setDatabaseLogs(prev => prev.filter(item => item.id !== id));
      
      // Broadcast deletion
      try {
        if (broadcastChannelRef.current) {
          broadcastChannelRef.current.send({
            type: 'broadcast',
            event: 'DELETE_SCAN',
            payload: { id },
          });
        }
      } catch (e) {}

      // Delete from qr_presensi_logs
      try {
        await supabase.from('qr_presensi_logs').delete().eq('id', id);
      } catch (err) {}

      // Delete from journal_notes backup
      try {
        if (targetItem) {
          await supabase.from('journal_notes')
            .delete()
            .eq('category', 'qr_presensi_log')
            .or(`student_name.eq.${targetItem.studentName},note.ilike.%${targetItem.nisn}%`);
        }
      } catch (jnErr) {}

      // Update app_settings backup
      try {
        const { data: existingData } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'today_qr_scans_sync')
          .single();

        if (existingData && existingData.value) {
          const parsed = JSON.parse(existingData.value);
          if (Array.isArray(parsed)) {
            const filtered = parsed.filter((item: any) => item.id !== id);
            await supabase.from('app_settings').upsert({
              key: 'today_qr_scans_sync',
              value: JSON.stringify(filtered),
              description: 'Realtime backup of today scan presensi records'
            }, { onConflict: 'key' });
          }
        }
      } catch (e) {}
    }
  };

  // Toggle status inline (Hadir <-> Terlambat)
  const handleToggleStatus = async (record: QRScanRecord) => {
    const newStatus: 'Hadir' | 'Terlambat' = record.status === 'Hadir' ? 'Terlambat' : 'Hadir';
    const updated: QRScanRecord = { ...record, status: newStatus };

    // Optimistic state updates
    setDatabaseLogs(prev => prev.map(item => item.id === record.id ? updated : item));
    setScanHistory(prev => prev.map(item => item.id === record.id ? updated : item));

    // Broadcast update
    try {
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.send({
          type: 'broadcast',
          event: 'UPDATE_SCAN',
          payload: updated,
        });
      }
    } catch (e) {}

    // Update in qr_presensi_logs
    try {
      await supabase.from('qr_presensi_logs').update({ status: newStatus }).eq('id', record.id);
    } catch (e) {}

    // Update in journal_notes
    try {
      await supabase.from('journal_notes').update({
        note: JSON.stringify(updated)
      }).eq('category', 'qr_presensi_log').or(`student_name.eq.${record.studentName},note.ilike.%${record.nisn}%`);
    } catch (e) {}
  };

  // Save manual attendance creation
  const handleSaveManualAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentForManual) {
      showAlert('Silakan pilih data siswa terlebih dahulu.');
      return;
    }

    setSavingManual(true);
    try {
      const timestamp = `${manualAddDate}T${manualAddTime}:00.000Z`;
      const activeSubject = manualAddMode === 'ekstra' ? manualAddEkstra : undefined;
      const newRecord: QRScanRecord = {
        id: `${Date.now()}-${selectedStudentForManual.id || selectedStudentForManual.nisn}`,
        nisn: selectedStudentForManual.nisn || selectedStudentForManual.nis || '-',
        studentName: selectedStudentForManual.name,
        kelas: selectedStudentForManual.kelas,
        timestamp: timestamp,
        mode: manualAddMode,
        status: manualAddStatus,
        subject: activeSubject,
        notes: manualAddNotes.trim() || undefined,
      };

      // Broadcast
      try {
        if (broadcastChannelRef.current) {
          broadcastChannelRef.current.send({
            type: 'broadcast',
            event: 'NEW_SCAN',
            payload: newRecord,
          });
        }
      } catch (e) {}

      // Insert to states
      setDatabaseLogs(prev => [newRecord, ...prev]);
      if (isDateToday(timestamp)) {
        setScanHistory(prev => [newRecord, ...prev]);
      }

      // Sync to DB
      await syncToSupabase(newRecord, selectedStudentForManual, manualAddStatus, manualAddMode, activeSubject);

      setShowManualAddModal(false);
      setSelectedStudentForManual(null);
      setManualAddStudentSearch('');
      setManualAddNotes('');
      showAlert(`Presensi siswa "${selectedStudentForManual.name}" berhasil disimpan ke database!`, 'Berhasil');
    } catch (err: any) {
      showAlert(`Gagal menyimpan presensi manual: ${err.message || err}`, 'Gagal');
    } finally {
      setSavingManual(false);
    }
  };

  // Save edit record
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    setSavingEdit(true);
    try {
      const updated = { ...editingRecord };
      setDatabaseLogs(prev => prev.map(item => item.id === updated.id ? updated : item));
      setScanHistory(prev => prev.map(item => item.id === updated.id ? updated : item));

      try {
        if (broadcastChannelRef.current) {
          broadcastChannelRef.current.send({
            type: 'broadcast',
            event: 'UPDATE_SCAN',
            payload: updated,
          });
        }
      } catch (e) {}

      // Update DB
      await supabase.from('qr_presensi_logs').update({
        status: updated.status,
        mode: updated.mode,
        subject: updated.subject || null,
        notes: updated.notes || null,
      }).eq('id', updated.id);

      setEditingRecord(null);
      showAlert('Catatan presensi berhasil diperbarui.', 'Berhasil');
    } catch (err: any) {
      showAlert(`Gagal memperbarui: ${err.message || err}`, 'Gagal');
    } finally {
      setSavingEdit(false);
    }
  };

  // Clear all history for today
  const handleClearHistory = async () => {
    const confirmed = await showConfirm('Apakah Anda yakin ingin menghapus SELURUH riwayat scan presensi hari ini? Tindakan ini akan menghapus log hari ini baik di server maupun perangkat ini.');
    if (confirmed) {
      setScanHistory([]);
      setDatabaseLogs(prev => prev.filter(item => !isDateToday(item.timestamp)));
      setLastScannedStudent(null);
      try {
        const { past36HoursISO } = getTodayBounds();
        await supabase
          .from('qr_presensi_logs')
          .delete()
          .gte('scanned_at', past36HoursISO);
      } catch (err) {
        console.warn('Failed to clear remote logs for today:', err);
      }

      try {
        const { past36HoursISO } = getTodayBounds();
        await supabase
          .from('journal_notes')
          .delete()
          .eq('category', 'qr_presensi_log')
          .gte('created_at', past36HoursISO);
      } catch (err) {}

      try {
        await supabase.from('app_settings').upsert({
          key: 'today_qr_scans_sync',
          value: JSON.stringify([]),
          description: 'Realtime backup of today scan presensi records'
        }, { onConflict: 'key' });
      } catch (e) {}
    }
  };

  // Filtered Database Logs
  const activeLogDataset = logDateMode === 'today' ? scanHistory : databaseLogs;
  const filteredDatabaseLogs = activeLogDataset.filter(item => {
    const cleanSearch = historySearch.trim().toLowerCase();
    const digitsSearch = cleanSearch.replace(/\D/g, '');
    const itemDigits = (item.nisn || '').replace(/\D/g, '');

    const matchSearch = !cleanSearch || 
      item.studentName.toLowerCase().includes(cleanSearch) || 
      item.nisn.toLowerCase().includes(cleanSearch) ||
      (digitsSearch.length >= 3 && itemDigits.includes(digitsSearch)) ||
      item.kelas.toLowerCase().includes(cleanSearch);
    const matchClass = !historyClassFilter || item.kelas === historyClassFilter;
    const matchMode = !logModeFilter || item.mode === logModeFilter;
    const matchEkstra = !logEkstraFilter || item.subject === logEkstraFilter;
    const matchStatus = !logStatusFilter || item.status === logStatusFilter;

    return matchSearch && matchClass && matchMode && matchEkstra && matchStatus;
  });

  // Filtered History for Mini Feed
  const filteredHistory = filteredDatabaseLogs;

  // Export history / filtered logs to CSV
  const exportToCSV = () => {
    if (filteredDatabaseLogs.length === 0) {
      showAlert('Belum ada data scan yang cocok dengan filter untuk diekspor.');
      return;
    }

    const headers = ['No', 'NISN', 'Nama Siswa', 'Kelas', 'Tanggal Scan', 'Waktu Scan', 'Kegiatan Presensi', 'Status', 'Catatan'];
    const rows = filteredDatabaseLogs.map((item, idx) => {
      const dateObj = new Date(item.timestamp);
      return [
        idx + 1,
        `'${item.nisn}`,
        `"${item.studentName}"`,
        item.kelas,
        dateObj.toLocaleDateString('id-ID'),
        dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        item.mode === 'harian' ? 'Scan Masuk' : item.mode === 'dhuha' ? 'Sholat Dhuha' : item.mode === 'dzuhur' ? 'Sholat Dzuhur' : `Ekstra: ${item.subject || '-'}`,
        item.status,
        `"${item.notes || '-'}"`,
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const dateLabel = logDateMode === 'today' ? 'Hari_Ini' : logDateMode === 'date' ? logSelectedDate : logDateMode === 'month' ? logSelectedMonth : 'Semua';
    link.setAttribute('download', `Hasil_Scan_Presensi_${dateLabel}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter students for manual attendance popup
  const searchMatchedStudents = students.filter(s => {
    if (!manualAddStudentSearch.trim()) return false;
    const term = manualAddStudentSearch.toLowerCase().trim();
    return s.name.toLowerCase().includes(term) || (s.nisn && s.nisn.includes(term)) || s.kelas.toLowerCase().includes(term);
  }).slice(0, 10);

  // Filtered Students for Card Printing
  const studentsForCards = students.filter(s => {
    const matchClass = !selectedCardClass || s.kelas === selectedCardClass;
    const matchSearch = !cardSearch || s.name.toLowerCase().includes(cardSearch.toLowerCase()) || (s.nisn && s.nisn.includes(cardSearch));
    return matchClass && matchSearch;
  });

  // Calculate statistics from active log dataset
  const totalScanned = activeLogDataset.length;
  const totalHadir = activeLogDataset.filter(i => i.status === 'Hadir').length;
  const totalTerlambat = activeLogDataset.filter(i => i.status === 'Terlambat').length;
  const uniqueStudentsCount = new Set(activeLogDataset.map(i => i.nisn)).size;

  const getModeLabel = (mode: PresensiMode, subject?: string) => {
    if (mode === 'harian') return 'Scan Masuk';
    if (mode === 'dhuha') return 'Sholat Dhuha';
    if (mode === 'dzuhur') return 'Sholat Dzuhur';
    if (mode === 'ekstra') return `Ekstrakurikuler (${subject || '-'})`;
    return mode;
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6 pb-20 animate-fade-in">
        
        {/* Page Header */}
        <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-purple-500/10 blur-3xl pointer-events-none"></div>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold border border-purple-400/30 mb-3">
                <Scan size={14} className="text-purple-300" />
                <span>Sistem Presensi QR Card NISN</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
                Presensi QR Siswa
              </h1>
              <p className="text-slate-300 text-xs md:text-sm mt-1 max-w-xl">
                Scan Kartu NISN Siswa untuk Kehadiran Gerbang (Scan Masuk), Salat Dhuha, dan Ekstrakurikuler secara instan & akurat.
              </p>

              {/* Status Access Badge */}
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-white/10 text-xs font-bold border border-white/15">
                {isAdmin ? (
                  <span className="text-amber-300 flex items-center gap-1.5">
                    <UserCheck size={14} /> Administrator (Akses Penuh Scan & Pengelolaan)
                  </span>
                ) : isPembina ? (
                  <span className="text-emerald-300 flex items-center gap-1.5">
                    <Trophy size={14} /> Pembina Ekstra: {assignedPembinaConfig?.ekstraList?.join(', ') || 'Aktif'}
                  </span>
                ) : (
                  <span className="text-purple-300 flex items-center gap-1.5">
                    <UserCheck size={14} /> Mode Guru (Presensi QR Aktif)
                  </span>
                )}
              </div>
            </div>

            {/* Quick Mode Stats */}
            <div className="flex items-center gap-3">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl px-4 py-3 border border-white/10 text-center min-w-[90px]">
                <div className="text-xs text-purple-200 font-medium">Total Scan</div>
                <div className="text-xl font-black text-white">{totalScanned}</div>
              </div>
              <div className="bg-emerald-500/20 backdrop-blur-md rounded-2xl px-4 py-3 border border-emerald-400/30 text-center min-w-[90px]">
                <div className="text-xs text-emerald-200 font-medium">Tepat Waktu</div>
                <div className="text-xl font-black text-emerald-300">{totalHadir}</div>
              </div>
              <div className="bg-rose-500/20 backdrop-blur-md rounded-2xl px-4 py-3 border border-rose-400/30 text-center min-w-[90px]">
                <div className="text-xs text-rose-200 font-medium">Terlambat</div>
                <div className="text-xl font-black text-rose-300">{totalTerlambat}</div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex flex-wrap gap-2 mt-6 pt-6 border-t border-white/10">
            <button
              onClick={() => {
                setActiveTab('scan');
                if (canScan && !isScanning) startCamera();
              }}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all flex items-center gap-2 ${
                activeTab === 'scan'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/40'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300'
              }`}
            >
              <Camera size={16} />
              <span>Scanner QR Kamera / Gun</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('history');
                stopCamera();
              }}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all flex items-center gap-2 ${
                activeTab === 'history'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/40'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300'
              }`}
            >
              <Clock size={16} />
              <span>Log Presensi Today ({scanHistory.length})</span>
            </button>

            {/* Rekap Laporan Ekstrakurikuler */}
            <button
              onClick={() => {
                setActiveTab('rekap');
                stopCamera();
              }}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all flex items-center gap-2 ${
                activeTab === 'rekap'
                  ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/40'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300'
              }`}
            >
              <Trophy size={16} />
              <span>Rekap Laporan Ekstra</span>
            </button>

            {/* Kelola Pembina Ekstra - HANYA TAMPIL UNTUK ADMIN */}
            {isAdmin && (
              <button
                onClick={() => {
                  setActiveTab('pembina');
                  stopCamera();
                }}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all flex items-center gap-2 ${
                  activeTab === 'pembina'
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/40'
                    : 'bg-white/5 hover:bg-white/10 text-slate-300'
                }`}
              >
                <UserCog size={16} />
                <span>Kelola Pembina Ekstra</span>
              </button>
            )}

            {/* Generator & Cetak Kartu QR NISN - HANYA TAMPIL UNTUK ADMIN */}
            {isAdmin && (
              <button
                onClick={() => {
                  setActiveTab('cards');
                  stopCamera();
                }}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all flex items-center gap-2 ${
                  activeTab === 'cards'
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/40'
                    : 'bg-white/5 hover:bg-white/10 text-slate-300'
                }`}
              >
                <Printer size={16} />
                <span>Cetak Kartu QR NISN</span>
              </button>
            )}
          </div>
        </div>

        {/* TAB 1: SCANNER VIEW */}
        {activeTab === 'scan' && (
          <div>
            {/* FULLSCREEN IMMERSIVE SCANNER VIEW - PORTAL TO BODY FOR TRUE 100% FULLSCREEN */}
            {isFullscreen ? (
              createPortal(
                <div className="fixed inset-0 w-screen h-screen z-[999999] bg-slate-950 text-slate-100 flex flex-col p-3 md:p-6 overflow-hidden select-none animate-fade-in">
                  {/* Fullscreen Header Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80 shrink-0">
                    {/* Left: Exit Fullscreen & Mode Switcher */}
                    <div className="flex items-center flex-wrap gap-2.5">
                      <button
                        onClick={() => toggleFullscreen(false)}
                        className="px-3.5 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 rounded-2xl text-xs font-black flex items-center gap-2 transition-all shadow-sm active:scale-95"
                        title="Keluar dari Layar Penuh (Atau tekan tombol ESC di keyboard)"
                      >
                        <Minimize2 size={16} />
                        <span>Keluar Fullscreen</span>
                        <kbd className="px-1.5 py-0.5 text-[10px] bg-rose-950/80 rounded border border-rose-700/50">Esc</kbd>
                      </button>

                      {/* Mode Selector in Fullscreen */}
                      <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-2xl border border-slate-800">
                        <button
                          onClick={() => handleSelectMode('harian')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                            presensiMode === 'harian'
                              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/40'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <ShieldCheck size={14} />
                          <span>Scan Masuk</span>
                        </button>

                        <button
                          onClick={() => handleSelectMode('dhuha')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                            presensiMode === 'dhuha'
                              ? 'bg-amber-500 text-white shadow-md shadow-amber-500/40'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <Sun size={14} />
                          <span>Dhuha</span>
                        </button>

                        <button
                          onClick={() => handleSelectMode('dzuhur')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                            presensiMode === 'dzuhur'
                              ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/40'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <Sun size={14} />
                          <span>Dzuhur</span>
                        </button>

                        <button
                          onClick={() => handleSelectMode('ekstra')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                            presensiMode === 'ekstra'
                              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/40'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <Trophy size={14} />
                          <span>Ekstra</span>
                        </button>
                      </div>

                      {/* Quick Ekstra Dropdown in Fullscreen if in Ekstra mode */}
                      {presensiMode === 'ekstra' && allowedEkstraForUser.length > 0 && (
                        <select
                          value={selectedEkstra}
                          onChange={(e) => handleSelectEkstra(e.target.value)}
                          className="px-3 py-1.5 bg-emerald-950/80 border border-emerald-700/80 text-emerald-300 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                          {allowedEkstraForUser.map(e => (
                            <option key={e} value={e} className="bg-slate-900 text-white">{e}</option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Center: Live Digital Clock */}
                    <div className="hidden lg:flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-900/90 border border-slate-800 font-mono text-sm font-black text-purple-400 shadow-inner">
                      <Clock size={16} className="text-purple-400 animate-pulse" />
                      <span>{currentTime} WIB</span>
                    </div>

                    {/* Right: Camera Controls */}
                    <div className="flex items-center gap-2">
                      {/* Beep Toggle */}
                      <button
                        type="button"
                        onClick={() => {
                          const nextState = !soundEnabled;
                          setSoundEnabled(nextState);
                          if (nextState) playBeep('success', true);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                          soundEnabled 
                            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700' 
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                        }`}
                      >
                        {soundEnabled ? <Volume2 size={14} className="animate-pulse text-emerald-400" /> : <VolumeX size={14} />}
                        <span>{soundEnabled ? 'Beep ON' : 'Beep OFF'}</span>
                      </button>

                      {/* Mirror Toggle */}
                      <button
                        type="button"
                        onClick={() => setIsMirrored(!isMirrored)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                          isMirrored 
                            ? 'bg-purple-950/80 text-purple-300 border-purple-700' 
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                        }`}
                      >
                        <FlipHorizontal size={14} />
                        <span>{isMirrored ? 'Cermin ON' : 'Cermin OFF'}</span>
                      </button>

                      {/* Camera Power */}
                      {isScanning ? (
                        <button
                          onClick={stopCamera}
                          className="px-3.5 py-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800 rounded-xl text-xs font-bold transition-colors"
                        >
                          Matikan Kamera
                        </button>
                      ) : (
                        <button
                          onClick={startCamera}
                          className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-600/30 transition-all flex items-center gap-1.5"
                        >
                          <Camera size={14} />
                          <span>Nyalakan Kamera</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Fullscreen Body: Spacious Camera & Live Recent Scans */}
                  <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 pt-3 min-h-0 overflow-hidden">
                    
                    {/* Left (7 Cols): Big Spacious Camera Viewfinder & Result Card */}
                    <div className="lg:col-span-7 flex flex-col gap-3 min-h-0 h-full overflow-hidden">
                      
                      {/* Viewfinder Frame - Fully responsive and filling available height/width */}
                      <div className="flex-1 w-full min-h-[300px] bg-black rounded-3xl relative overflow-hidden border-2 border-purple-500/40 shadow-2xl flex items-center justify-center">
                        <style>{`
                          #${scannerContainerId} {
                            width: 100% !important;
                            height: 100% !important;
                            display: flex !important;
                            align-items: center !important;
                            justify-content: center !important;
                            background-color: #000 !important;
                            border: none !important;
                            position: relative !important;
                          }
                          #${scannerContainerId} video {
                            width: 100% !important;
                            height: 100% !important;
                            max-width: 100% !important;
                            max-height: 100% !important;
                            object-fit: contain !important;
                            border-radius: 1.5rem !important;
                            transform: ${isMirrored ? 'scaleX(-1)' : 'none'} !important;
                            -webkit-transform: ${isMirrored ? 'scaleX(-1)' : 'none'} !important;
                          }
                          #${scannerContainerId}__scan_region {
                            display: flex !important;
                            align-items: center !important;
                            justify-content: center !important;
                            width: 100% !important;
                            height: 100% !important;
                          }
                          #${scannerContainerId}__dashboard_section_csr,
                          #${scannerContainerId}__header_message,
                          #${scannerContainerId} img[alt="Info icon"] {
                            display: none !important;
                          }
                        `}</style>
                        <div id={scannerContainerId} className="w-full h-full"></div>

                        {/* Mode Switch & Camera Restart Live HUD Notice */}
                        {modeRestartNotice && (
                          <div className="absolute top-4 inset-x-4 md:inset-x-12 z-30 flex items-center justify-center animate-fade-in pointer-events-none">
                            <div className={`px-4 py-2 rounded-2xl shadow-2xl font-black text-xs md:text-sm flex items-center gap-2.5 backdrop-blur-md border ${
                              isRestartingCamera
                                ? 'bg-purple-950/90 text-purple-200 border-purple-400/60 animate-pulse'
                                : 'bg-emerald-950/90 text-emerald-200 border-emerald-400/60'
                            }`}>
                              {isRestartingCamera ? (
                                <RefreshCw size={16} className="animate-spin text-purple-400" />
                              ) : (
                                <CheckCircle2 size={16} className="text-emerald-400" />
                              )}
                              <span>{modeRestartNotice}</span>
                            </div>
                          </div>
                        )}

                        {/* HUD Corner Reticle Overlay */}
                        {isScanning && (
                          <div className="absolute inset-4 md:inset-8 pointer-events-none border border-purple-500/20 rounded-3xl flex flex-col justify-between p-3">
                            <div className="flex justify-between">
                              <div className="w-10 h-10 border-t-4 border-l-4 border-purple-400 rounded-tl-xl"></div>
                              <div className="w-10 h-10 border-t-4 border-r-4 border-purple-400 rounded-tr-xl"></div>
                            </div>
                            <div className="flex justify-between">
                              <div className="w-10 h-10 border-b-4 border-l-4 border-purple-400 rounded-bl-xl"></div>
                              <div className="w-10 h-10 border-b-4 border-r-4 border-purple-400 rounded-br-xl"></div>
                            </div>
                          </div>
                        )}

                        {/* Laser scanning bar */}
                        {isScanning && (
                          <div className="absolute inset-x-8 top-1/2 h-0.5 bg-gradient-to-r from-transparent via-purple-400 to-transparent shadow-[0_0_15px_#c084fc] animate-pulse pointer-events-none"></div>
                        )}

                        {/* Scan Cooldown Banner */}
                        {scanCooldown && isScanning && (
                          <div className="absolute top-4 inset-x-8 bg-amber-500/90 text-white font-bold text-xs px-4 py-2 rounded-2xl shadow-xl backdrop-blur-md text-center flex items-center justify-center gap-2 animate-pulse z-20">
                            <Clock size={16} />
                            <span>Jeda 1 detik untuk scan berikutnya...</span>
                          </div>
                        )}

                        {/* Idle / Camera Off State */}
                        {!isScanning && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-slate-950/90 text-slate-300">
                            <Scan size={64} className="text-purple-400 mb-3 animate-bounce" />
                            <p className="font-black text-lg text-white">Scanner Kamera Siap</p>
                            <p className="text-xs text-slate-400 mt-1 max-w-sm">
                              Klik tombol di bawah untuk menyalakan kamera pemindai QR Card NISN.
                            </p>
                            <button
                              onClick={startCamera}
                              className="mt-4 px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-2xl text-xs shadow-lg shadow-purple-600/40 flex items-center gap-2 transition-all active:scale-95"
                            >
                              <Camera size={16} />
                              <span>Nyalakan Kamera Fullscreen</span>
                            </button>
                          </div>
                        )}

                        {/* Error state */}
                        {cameraError && (
                          <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center text-rose-400">
                            <AlertCircle size={48} className="mb-2" />
                            <p className="font-bold text-sm">{cameraError}</p>
                          </div>
                        )}
                      </div>

                      {/* Bottom Strip: Last Scanned Result & Barcode Input */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 shrink-0">
                        {/* Hasil Scan Terakhir Banner */}
                        <div className="md:col-span-8 bg-slate-900/90 rounded-2xl p-3 border border-slate-800/80 shadow-lg">
                          {lastScannedStudent ? (
                            <div className={`p-3 rounded-xl border transition-all ${
                              lastScannedStudent.isDuplicate
                                ? 'bg-amber-950/60 border-amber-500/50 text-amber-200'
                                : lastScannedStudent.status === 'Terlambat'
                                ? 'bg-rose-950/60 border-rose-500/50 text-rose-200'
                                : 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200'
                            }`}>
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-purple-600 text-white font-black text-lg flex items-center justify-center shrink-0 shadow-md">
                                  {lastScannedStudent.student.name.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                                      lastScannedStudent.isDuplicate
                                        ? 'bg-amber-500 text-white'
                                        : lastScannedStudent.status === 'Terlambat'
                                        ? 'bg-rose-600 text-white'
                                        : 'bg-emerald-600 text-white'
                                    }`}>
                                      {lastScannedStudent.isDuplicate ? 'Sudah Di-Scan' : lastScannedStudent.status}
                                    </span>
                                    {getActivityBadge(lastScannedStudent.mode || presensiMode, lastScannedStudent.subject || selectedEkstra)}
                                  </div>
                                  <h4 className="font-black text-white text-sm truncate mt-0.5">
                                    {lastScannedStudent.student.name}
                                  </h4>
                                  <p className="text-[11px] font-semibold text-purple-300">
                                    Kelas {lastScannedStudent.student.kelas} • NISN: {lastScannedStudent.student.nisn || '-'}
                                  </p>
                                </div>
                                <div className="text-right shrink-0 font-mono font-black text-sm text-white">
                                  {lastScannedStudent.recordTime}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="py-2.5 text-center text-slate-400 flex items-center justify-center gap-2">
                              <Scan size={16} className="text-purple-400 animate-pulse" />
                              <span className="text-xs font-semibold">Arahkan Kartu QR NISN Siswa ke kamera pemindai...</span>
                            </div>
                          )}
                        </div>

                        {/* Barcode Gun / Manual Input Bar */}
                        <div className="md:col-span-4 flex items-center">
                          <form onSubmit={handleManualSubmit} className="flex gap-2 w-full">
                            <input
                              ref={manualInputRef}
                              type="text"
                              placeholder="Barcode Gun / NISN..."
                              value={manualInput}
                              onChange={(e) => setManualInput(e.target.value)}
                              className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono font-bold text-white focus:ring-2 focus:ring-purple-500 outline-none"
                            />
                            <button
                              type="submit"
                              className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs shadow-sm transition-all active:scale-95"
                            >
                              Scan
                            </button>
                          </form>
                        </div>
                      </div>

                    </div>

                    {/* Right (5 Cols): Realtime Activity History Feed in Fullscreen */}
                    <div className="lg:col-span-5 bg-slate-900/90 rounded-3xl p-4 border border-slate-800/80 shadow-2xl flex flex-col min-h-0 h-full overflow-hidden">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
                        <div>
                          <h3 className="font-black text-white text-sm flex items-center gap-2">
                            <Clock size={16} className="text-purple-400" />
                            <span>Aktivitas Scan Terbaru</span>
                          </h3>
                          <p className="text-[11px] text-slate-400 mt-0.5">Riwayat kehadiran realtime hari ini</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-xl bg-purple-950/80 border border-purple-800 text-purple-300 font-mono text-xs font-bold">
                            Total: {totalScanned}
                          </span>
                          <span className="px-2.5 py-1 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 font-mono text-xs font-bold">
                            {totalHadir} Hadir
                          </span>
                        </div>
                      </div>

                      {/* Scrollable Scans List */}
                      <div className="flex-1 overflow-y-auto space-y-2 mt-3 pr-1 custom-scrollbar min-h-0">
                        {scanHistory.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500">
                            <Users size={36} className="mb-2 opacity-40" />
                            <p className="text-xs font-bold text-slate-400">Belum ada riwayat scan hari ini</p>
                            <p className="text-[11px] mt-1 text-slate-500">Data siswa yang discan akan otomatis muncul di sini secara realtime.</p>
                          </div>
                        ) : (
                          scanHistory.map((item, idx) => (
                            <div
                              key={item.id}
                              className={`p-3 rounded-2xl border flex items-center justify-between text-xs transition-all ${
                                idx === 0 
                                  ? 'bg-slate-800/90 border-purple-500/50 shadow-md ring-1 ring-purple-500/30' 
                                  : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-800/50'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className={`w-8 h-8 rounded-xl font-bold flex items-center justify-center shrink-0 text-xs text-white ${
                                  item.status === 'Terlambat' ? 'bg-rose-600' : 'bg-emerald-600'
                                }`}>
                                  {item.studentName.charAt(0)}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-extrabold text-white truncate">{item.studentName}</span>
                                    {getActivityBadge(item.mode, item.subject)}
                                  </div>
                                  <div className="text-[11px] text-slate-400 mt-0.5">
                                    Kelas {item.kelas} • <span className="font-mono text-slate-500">{item.nisn}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="text-right shrink-0 ml-2">
                                <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold ${
                                  item.status === 'Terlambat' 
                                    ? 'bg-rose-950/80 text-rose-300 border border-rose-800' 
                                    : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                                }`}>
                                  {item.status}
                                </span>
                                <div className="text-[10px] font-mono text-slate-400 mt-1">
                                  {new Date(item.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                  </div>

                </div>,
                document.body
              )
            ) : (
              /* REGULAR SCANNER UI */
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Left Scanner & Controls (7 Cols) */}
                <div className="lg:col-span-7 space-y-6">
                  
                  {/* Activity Selector Card (Redundant Top Sound Button Removed) */}
                  <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-100 dark:border-slate-700 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-extrabold text-slate-800 dark:text-white text-sm flex items-center gap-2">
                        <Sparkles size={16} className="text-purple-600" />
                        <span>Pilih Kegiatan Presensi</span>
                      </h3>
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                        {getModeLabel(presensiMode, selectedEkstra)}
                      </span>
                    </div>

                    {/* Activity Buttons Grid (4 Modes: Harian, Dhuha, Dzuhur, Ekstra) */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <button
                        onClick={() => handleSelectMode('harian')}
                        className={`p-3 rounded-2xl border text-left transition-all ${
                          presensiMode === 'harian'
                            ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-500 dark:border-purple-600 text-purple-900 dark:text-purple-200 shadow-sm ring-2 ring-purple-500/20'
                            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 font-bold text-xs mb-1">
                          <ShieldCheck size={16} className="text-purple-600" />
                          <span>Scan Masuk</span>
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">Presensi Harian Gerbang</div>
                      </button>

                      <button
                        onClick={() => handleSelectMode('dhuha')}
                        className={`p-3 rounded-2xl border text-left transition-all ${
                          presensiMode === 'dhuha'
                            ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 dark:border-amber-600 text-amber-900 dark:text-amber-200 shadow-sm ring-2 ring-amber-500/20'
                            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 font-bold text-xs mb-1">
                          <Sun size={16} className="text-amber-500" />
                          <span>Sholat Dhuha</span>
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">Presensi Dhuha Berjamaah</div>
                      </button>

                      <button
                        onClick={() => handleSelectMode('dzuhur')}
                        className={`p-3 rounded-2xl border text-left transition-all ${
                          presensiMode === 'dzuhur'
                            ? 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-500 dark:border-cyan-600 text-cyan-900 dark:text-cyan-200 shadow-sm ring-2 ring-cyan-500/20'
                            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 font-bold text-xs mb-1">
                          <Sun size={16} className="text-cyan-600" />
                          <span>Sholat Dzuhur</span>
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">Presensi Dzuhur Berjamaah</div>
                      </button>

                      <button
                        onClick={() => handleSelectMode('ekstra')}
                        className={`p-3 rounded-2xl border text-left transition-all ${
                          presensiMode === 'ekstra'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 dark:border-emerald-600 text-emerald-900 dark:text-emerald-200 shadow-sm ring-2 ring-emerald-500/20'
                            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 font-bold text-xs mb-1">
                          <Trophy size={16} className="text-emerald-600" />
                          <span>Ekstrakurikuler</span>
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">Presensi Kegiatan Ekstra</div>
                      </button>
                    </div>

                    {/* Sub-Selection for Ekstrakurikuler Mode (Updated 10 Ekstra List) */}
                    {presensiMode === 'ekstra' && (
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-700 space-y-2.5 animate-fade-in">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-extrabold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                            <Trophy size={14} className="text-emerald-600" />
                            <span>Pilih Kegiatan Ekstrakurikuler:</span>
                          </label>
                          {selectedEkstra && (
                            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                              {selectedEkstra}
                            </span>
                          )}
                        </div>

                        {allowedEkstraForUser.length > 0 ? (
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                            {allowedEkstraForUser.map((ekstra) => (
                              <button
                                key={ekstra}
                                onClick={() => handleSelectEkstra(ekstra)}
                                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all text-center border ${
                                  selectedEkstra === ekstra
                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                    : 'bg-slate-50 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-100'
                                }`}
                              >
                                {ekstra}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                            <Lock size={16} className="shrink-0" />
                            <span>Anda belum ditunjuk sebagai Pembina Ekstrakurikuler oleh Admin.</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* QR Camera Scanner Card */}
                  <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-100 dark:border-slate-700 shadow-sm space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${isScanning ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'}`}></div>
                        <h3 className="font-extrabold text-slate-800 dark:text-white text-xs sm:text-sm">
                          {isScanning ? `Kamera Aktif — Presensi ${getModeLabel(presensiMode, selectedEkstra)}` : 'Kamera Non-Aktif'}
                        </h3>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Sound Beep Toggle */}
                        <button
                          type="button"
                          onClick={() => {
                            const nextState = !soundEnabled;
                            setSoundEnabled(nextState);
                            if (nextState) {
                              playBeep('success', true);
                            }
                          }}
                          title={soundEnabled ? "Suara Beep Scan Aktif (Klik untuk matikan)" : "Suara Beep Scan Non-Aktif (Klik untuk nyalakan)"}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                            soundEnabled 
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800' 
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {soundEnabled ? <Volume2 size={14} className="animate-pulse text-emerald-600 dark:text-emerald-400" /> : <VolumeX size={14} />}
                          <span className="hidden sm:inline">{soundEnabled ? 'Beep ON' : 'Beep OFF'}</span>
                        </button>

                        {/* Mirror Toggle Button */}
                        <button
                          type="button"
                          onClick={() => setIsMirrored(!isMirrored)}
                          title={isMirrored ? "Kamera Cermin (Mirror) Aktif" : "Kamera Normal"}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                            isMirrored 
                              ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800' 
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          <FlipHorizontal size={14} />
                          <span className="hidden sm:inline">{isMirrored ? 'Cermin ON' : 'Cermin OFF'}</span>
                        </button>

                        {/* FULLSCREEN BUTTON */}
                        <button
                          type="button"
                          onClick={() => toggleFullscreen(true)}
                          title="Tampilan Layar Penuh (Fullscreen Scanner)"
                          className="px-2.5 py-1.5 bg-purple-100 dark:bg-purple-950/60 hover:bg-purple-200 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
                        >
                          <Maximize2 size={14} />
                          <span className="hidden sm:inline">Fullscreen</span>
                        </button>

                        {isScanning ? (
                          <button
                            onClick={stopCamera}
                            className="px-3 py-1.5 bg-rose-100 dark:bg-rose-950/60 hover:bg-rose-200 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-bold transition-colors"
                          >
                            Matikan Kamera
                          </button>
                        ) : (
                          <button
                            onClick={startCamera}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-500/20 transition-all flex items-center gap-2"
                          >
                            <Camera size={14} />
                            <span>Nyalakan Kamera</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Viewfinder Frame - Clean uncropped video */}
                    <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-video sm:aspect-[4/3] max-w-lg mx-auto flex items-center justify-center border-2 border-purple-500/40">
                      <style>{`
                        #${scannerContainerId} {
                          width: 100% !important;
                          height: 100% !important;
                          display: flex !important;
                          align-items: center !important;
                          justify-content: center !important;
                          background-color: #000 !important;
                          border: none !important;
                          position: relative !important;
                        }
                        #${scannerContainerId} video {
                          width: 100% !important;
                          height: 100% !important;
                          max-width: 100% !important;
                          max-height: 100% !important;
                          object-fit: contain !important;
                          transform: ${isMirrored ? 'scaleX(-1)' : 'none'} !important;
                          -webkit-transform: ${isMirrored ? 'scaleX(-1)' : 'none'} !important;
                        }
                        #${scannerContainerId}__scan_region {
                          display: flex !important;
                          align-items: center !important;
                          justify-content: center !important;
                          width: 100% !important;
                          height: 100% !important;
                        }
                        #${scannerContainerId}__dashboard_section_csr,
                        #${scannerContainerId}__header_message,
                        #${scannerContainerId} img[alt="Info icon"] {
                          display: none !important;
                        }
                      `}</style>
                      <div id={scannerContainerId} className="w-full h-full"></div>

                      {/* Mode Switch & Camera Restart Live HUD Notice */}
                      {modeRestartNotice && (
                        <div className="absolute top-3 inset-x-3 z-30 flex items-center justify-center animate-fade-in pointer-events-none">
                          <div className={`px-3.5 py-1.5 rounded-xl shadow-xl font-black text-xs flex items-center gap-2 backdrop-blur-md border ${
                            isRestartingCamera
                              ? 'bg-purple-950/90 text-purple-200 border-purple-400/60 animate-pulse'
                              : 'bg-emerald-950/90 text-emerald-200 border-emerald-400/60'
                          }`}>
                            {isRestartingCamera ? (
                              <RefreshCw size={14} className="animate-spin text-purple-400" />
                            ) : (
                              <CheckCircle2 size={14} className="text-emerald-400" />
                            )}
                            <span>{modeRestartNotice}</span>
                          </div>
                        </div>
                      )}

                      {scanCooldown && isScanning && (
                        <div className="absolute top-3 inset-x-3 bg-amber-500/90 text-white font-bold text-xs px-3 py-1.5 rounded-xl shadow-lg backdrop-blur-xs text-center flex items-center justify-center gap-1.5 animate-pulse z-20">
                          <Clock size={14} />
                          <span>Jeda 1 detik untuk scan berikutnya...</span>
                        </div>
                      )}

                      {!isScanning && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-slate-900/90 text-slate-300">
                          <Scan size={48} className="text-purple-400 mb-3 animate-bounce" />
                          <p className="font-bold text-sm text-white">Scanner Belum Aktif</p>
                          <p className="text-xs text-slate-400 mt-1 max-w-xs">
                            Klik tombol di atas untuk membuka kamera, atau gunakan input Barcode Gun di bawah ini.
                          </p>
                          <button
                            onClick={startCamera}
                            className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs shadow-lg"
                          >
                            Mulai Scan Kamera
                          </button>
                        </div>
                      )}

                      {cameraError && (
                        <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center p-6 text-center text-rose-400">
                          <AlertCircle size={40} className="mb-2" />
                          <p className="font-bold text-xs">{cameraError}</p>
                        </div>
                      )}
                    </div>

                    {/* Barcode Gun / Manual Input Bar */}
                    <div className="pt-2">
                      <form onSubmit={handleManualSubmit} className="space-y-2">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <Keyboard size={14} className="text-purple-600" />
                          <span>Input NISN Manual / Barcode Scanner Gun</span>
                        </label>
                        <div className="flex gap-2">
                          <input
                            ref={manualInputRef}
                            type="text"
                            placeholder="Scan atau Ketik NISN siswa..."
                            value={manualInput}
                            onChange={(e) => setManualInput(e.target.value)}
                            className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
                          />
                          <button
                            type="submit"
                            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 dark:bg-purple-600 dark:hover:bg-purple-500 text-white font-bold rounded-xl text-xs transition-all shadow-sm"
                          >
                            Submit
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-400 italic">
                          *Scanner USB Barcode/QR Gun otomatis mengirim enter setelah scan.
                        </p>
                      </form>
                    </div>

                  </div>

                </div>

                {/* Right Last Scanned Card & Quick History (5 Cols) */}
                <div className="lg:col-span-5 space-y-6">
                  
                  {/* Scan Status Card */}
                  <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm space-y-4">
                    <h3 className="font-extrabold text-slate-800 dark:text-white text-sm flex items-center gap-2">
                      <CheckCircle2 size={18} className="text-emerald-500" />
                      <span>Hasil Scan Terakhir</span>
                    </h3>

                    {lastScannedStudent ? (
                      <div className={`p-5 rounded-2xl border transition-all ${
                        lastScannedStudent.isDuplicate
                          ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700'
                          : lastScannedStudent.status === 'Terlambat'
                          ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700'
                          : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700'
                      }`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white font-black text-lg flex items-center justify-center shrink-0 shadow-md">
                              {lastScannedStudent.student.name.charAt(0)}
                            </div>
                            <div>
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider mb-1 ${
                                lastScannedStudent.isDuplicate
                                  ? 'bg-amber-500 text-white'
                                  : lastScannedStudent.status === 'Terlambat'
                                  ? 'bg-rose-600 text-white'
                                  : 'bg-emerald-600 text-white'
                              }`}>
                                {lastScannedStudent.isDuplicate ? 'Sudah Di-Scan Sebelumnya' : lastScannedStudent.status}
                              </span>
                              <h4 className="font-extrabold text-slate-900 dark:text-white text-base leading-snug">
                                {lastScannedStudent.student.name}
                              </h4>
                              <p className="text-xs font-bold text-purple-700 dark:text-purple-300 mt-0.5">
                                Kelas {lastScannedStudent.student.kelas} • NISN: {lastScannedStudent.student.nisn || '-'}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-300">
                          <div>Waktu: <span className="font-bold text-slate-900 dark:text-white">{lastScannedStudent.recordTime}</span></div>
                          <div className="flex items-center gap-1.5">
                            <span>Kegiatan:</span>
                            {getActivityBadge(lastScannedStudent.mode || presensiMode, lastScannedStudent.subject || selectedEkstra)}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-slate-400">
                        <Scan size={36} className="mx-auto mb-2 opacity-50" />
                        <p className="text-xs font-bold">Belum ada scan kartu NISN</p>
                        <p className="text-[11px] mt-1">Gunakan kamera atau barcode gun untuk memulai.</p>
                      </div>
                    )}
                  </div>

                  {/* Recent Scans Mini Feed */}
                  <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-100 dark:border-slate-700 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-extrabold text-slate-800 dark:text-white text-sm">
                        Aktivitas Scan Terbaru ({scanHistory.slice(0, 5).length})
                      </h3>
                      {scanHistory.length > 0 && (
                        <button
                          onClick={() => setActiveTab('history')}
                          className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
                        >
                          <span>Lihat Semua</span>
                          <ArrowRight size={12} />
                        </button>
                      )}
                    </div>

                    <div className="space-y-2">
                      {scanHistory.length === 0 ? (
                        <p className="text-xs text-slate-400 italic text-center py-4">Belum ada riwayat scan hari ini.</p>
                      ) : (
                        scanHistory.slice(0, 5).map(item => (
                          <div
                            key={item.id}
                            className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={`w-2 h-2 rounded-full shrink-0 ${item.status === 'Terlambat' ? 'bg-rose-500' : 'bg-emerald-500'}`}></div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-extrabold text-slate-800 dark:text-slate-100">{item.studentName}</span>
                                  {getActivityBadge(item.mode, item.subject)}
                                </div>
                                <div className="text-[10px] text-slate-500 mt-0.5">Kelas {item.kelas} • NISN: {item.nisn}</div>
                              </div>
                            </div>

                            <div className="text-right">
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                item.status === 'Terlambat' 
                                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300' 
                                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300'
                              }`}>
                                {item.status}
                              </span>
                              <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                                {new Date(item.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                </div>

              </div>
            )}
          </div>
        )}

        {/* TAB 2: KELOLA HASIL SCAN & DATABASE PRESENSI */}
        {activeTab === 'history' && (
          <div className="space-y-6 animate-fade-in">
            {/* Main Container */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 border border-slate-100 dark:border-slate-700 shadow-sm space-y-6">
              
              {/* Header & Live Sync Status */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-700">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <h3 className="text-xl font-black text-slate-900 dark:text-white">
                      Kelola Hasil Scan Presensi
                    </h3>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-xs">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>Realtime Database Sync Aktif</span>
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl">
                    Semua data scan presensi tersimpan otomatis di database server dan disinkronkan secara realtime antar semua akun guru, admin, dan perangkat pemindai.
                  </p>
                </div>

                {/* Top Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStudentForManual(null);
                      setManualAddStudentSearch('');
                      setShowManualAddModal(true);
                    }}
                    className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                  >
                    <PlusCircle size={15} />
                    <span>+ Presensi Manual</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fetchDatabaseLogs(true)}
                    disabled={loadingLogs}
                    className="px-3.5 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-200 dark:border-slate-600 shadow-xs disabled:opacity-60"
                    title="Muat ulang sinkronisasi data dari database server"
                  >
                    <RefreshCw size={14} className={loadingLogs ? 'animate-spin text-purple-600' : ''} />
                    <span>{loadingLogs ? 'Menyinkronkan...' : 'Refresh'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={exportToCSV}
                    className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                    title="Unduh data hasil scan yang terfilter dalam format Excel CSV"
                  >
                    <Download size={14} />
                    <span>Ekspor CSV</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsPrintModalOpen(true)}
                    className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                    title="Cetak format laporan resmi presensi"
                  >
                    <Printer size={14} />
                    <span>Cetak Laporan</span>
                  </button>

                  {isAdmin && logDateMode === 'today' && scanHistory.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearHistory}
                      className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 border border-rose-200 dark:border-rose-800"
                    >
                      <Trash2 size={14} />
                      <span>Reset Hari Ini</span>
                    </button>
                  )}
                </div>
              </div>

              {/* KPI Metric Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/50">
                  <div className="flex items-center justify-between text-purple-700 dark:text-purple-300 text-xs font-bold mb-1">
                    <span>Total Scan Terfilter</span>
                    <Clock size={16} className="text-purple-600" />
                  </div>
                  <div className="text-2xl font-black text-purple-900 dark:text-purple-100">
                    {filteredDatabaseLogs.length}
                  </div>
                  <div className="text-[10px] text-purple-600/80 dark:text-purple-400 mt-0.5">
                    Dari total {activeLogDataset.length} data
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50">
                  <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-300 text-xs font-bold mb-1">
                    <span>Hadir Tepat Waktu</span>
                    <CheckCircle2 size={16} className="text-emerald-600" />
                  </div>
                  <div className="text-2xl font-black text-emerald-900 dark:text-emerald-100">
                    {filteredDatabaseLogs.filter(i => i.status === 'Hadir').length}
                  </div>
                  <div className="text-[10px] text-emerald-600/80 dark:text-emerald-400 mt-0.5">
                    {filteredDatabaseLogs.length > 0 
                      ? `${Math.round((filteredDatabaseLogs.filter(i => i.status === 'Hadir').length / filteredDatabaseLogs.length) * 100)}% dari total scan`
                      : '0%'}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50">
                  <div className="flex items-center justify-between text-rose-700 dark:text-rose-300 text-xs font-bold mb-1">
                    <span>Terlambat</span>
                    <AlertCircle size={16} className="text-rose-600" />
                  </div>
                  <div className="text-2xl font-black text-rose-900 dark:text-rose-100">
                    {filteredDatabaseLogs.filter(i => i.status === 'Terlambat').length}
                  </div>
                  <div className="text-[10px] text-rose-600/80 dark:text-rose-400 mt-0.5">
                    {filteredDatabaseLogs.length > 0 
                      ? `${Math.round((filteredDatabaseLogs.filter(i => i.status === 'Terlambat').length / filteredDatabaseLogs.length) * 100)}% dari total scan`
                      : '0%'}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 text-xs font-bold mb-1">
                    <span>Siswa Unik</span>
                    <Users size={16} className="text-slate-600 dark:text-slate-400" />
                  </div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white">
                    {uniqueStudentsCount}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Jumlah siswa berbeda
                  </div>
                </div>
              </div>

              {/* Time Period Filter Switcher Tabs */}
              <div className="space-y-3 pt-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setLogDateMode('today')}
                      className={`px-3.5 py-1.5 rounded-xl transition-all ${
                        logDateMode === 'today'
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                      }`}
                    >
                      Hari Ini
                    </button>
                    <button
                      type="button"
                      onClick={() => setLogDateMode('date')}
                      className={`px-3.5 py-1.5 rounded-xl transition-all ${
                        logDateMode === 'date'
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                      }`}
                    >
                      Pilih Tanggal
                    </button>
                    <button
                      type="button"
                      onClick={() => setLogDateMode('month')}
                      className={`px-3.5 py-1.5 rounded-xl transition-all ${
                        logDateMode === 'month'
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                      }`}
                    >
                      Pilih Bulan
                    </button>
                    <button
                      type="button"
                      onClick={() => setLogDateMode('all')}
                      className={`px-3.5 py-1.5 rounded-xl transition-all ${
                        logDateMode === 'all'
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                      }`}
                    >
                      Semua Data Database
                    </button>
                  </div>

                  {/* Date or Month Picker Inputs */}
                  {logDateMode === 'date' && (
                    <div className="flex items-center gap-2 animate-fade-in">
                      <Calendar size={15} className="text-purple-600" />
                      <input
                        type="date"
                        value={logSelectedDate}
                        onChange={(e) => setLogSelectedDate(e.target.value)}
                        className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white"
                      />
                    </div>
                  )}

                  {logDateMode === 'month' && (
                    <div className="flex items-center gap-2 animate-fade-in">
                      <Calendar size={15} className="text-purple-600" />
                      <input
                        type="month"
                        value={logSelectedMonth}
                        onChange={(e) => setLogSelectedMonth(e.target.value)}
                        className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white"
                      />
                    </div>
                  )}
                </div>

                {/* Multi-Criteria Filters Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-2">
                  {/* Search Input */}
                  <div className="relative lg:col-span-2">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cari Nama Siswa atau NISN..."
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    {historySearch && (
                      <button
                        type="button"
                        onClick={() => setHistorySearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>

                  {/* Mode Filter */}
                  <div>
                    <select
                      value={logModeFilter}
                      onChange={(e) => {
                        setLogModeFilter(e.target.value);
                        if (e.target.value !== 'ekstra') setLogEkstraFilter('');
                      }}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">Semua Kegiatan</option>
                      <option value="harian">Scan Masuk (Gerbang)</option>
                      <option value="dhuha">Sholat Dhuha</option>
                      <option value="dzuhur">Sholat Dzuhur</option>
                      <option value="ekstra">Ekstrakurikuler</option>
                    </select>
                  </div>

                  {/* Ekstra Sub Filter (if ekstra selected) OR Class Filter */}
                  {logModeFilter === 'ekstra' ? (
                    <div>
                      <select
                        value={logEkstraFilter}
                        onChange={(e) => setLogEkstraFilter(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="">Semua Cabang Ekstra</option>
                        {EKSTRA_LIST.map(ek => (
                          <option key={ek} value={ek}>{ek}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <select
                        value={historyClassFilter}
                        onChange={(e) => setHistoryClassFilter(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="">Semua Kelas</option>
                        {classes.map(c => (
                          <option key={c} value={c}>Kelas {c}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Status Filter */}
                  <div>
                    <select
                      value={logStatusFilter}
                      onChange={(e) => setLogStatusFilter(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">Semua Status</option>
                      <option value="Hadir">Hadir</option>
                      <option value="Terlambat">Terlambat</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Data Table */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700 shadow-inner">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="px-4 py-3 text-center w-12">No</th>
                      <th className="px-4 py-3">Waktu & Tanggal</th>
                      <th className="px-4 py-3">NISN</th>
                      <th className="px-4 py-3">Nama Siswa</th>
                      <th className="px-4 py-3">Kelas</th>
                      <th className="px-4 py-3">Kegiatan Presensi</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3">Catatan</th>
                      <th className="px-4 py-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {loadingLogs && filteredDatabaseLogs.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-10 text-center text-slate-400 italic">
                          <RefreshCw size={22} className="animate-spin text-purple-600 mx-auto mb-2" />
                          <span>Menyinkronkan data presensi dari database server...</span>
                        </td>
                      </tr>
                    ) : filteredDatabaseLogs.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                          <Clock size={32} className="mx-auto mb-2 opacity-40" />
                          <p className="font-bold text-sm text-slate-600 dark:text-slate-300">Tidak ada data presensi yang sesuai filter</p>
                          <p className="text-xs text-slate-400 mt-1">
                            {historySearch || historyClassFilter || logModeFilter || logStatusFilter
                              ? 'Coba ubah atau bersihkan kriteria filter di atas.'
                              : 'Belum ada catatan presensi yang terekam pada periode ini.'}
                          </p>
                          {(historySearch || historyClassFilter || logModeFilter || logStatusFilter) && (
                            <button
                              type="button"
                              onClick={() => {
                                setHistorySearch('');
                                setHistoryClassFilter('');
                                setLogModeFilter('');
                                setLogEkstraFilter('');
                                setLogStatusFilter('');
                              }}
                              className="mt-3 px-3 py-1.5 bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 rounded-xl text-xs font-bold hover:bg-purple-200 inline-flex items-center gap-1"
                            >
                              <X size={12} />
                              <span>Reset Semua Filter</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ) : (
                      filteredDatabaseLogs.map((item, index) => {
                        const dateObj = new Date(item.timestamp);
                        const dateStr = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
                        const timeStr = dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                        return (
                          <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                            <td className="px-4 py-3 font-bold text-slate-400 text-center">{index + 1}</td>
                            <td className="px-4 py-3">
                              <div className="font-mono font-bold text-slate-800 dark:text-slate-200">{timeStr}</div>
                              <div className="text-[10px] text-slate-400">{dateStr}</div>
                            </td>
                            <td className="px-4 py-3 font-mono font-bold text-purple-700 dark:text-purple-300">{item.nisn}</td>
                            <td className="px-4 py-3 font-extrabold text-slate-900 dark:text-white">
                              {item.studentName}
                            </td>
                            <td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-300">
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 font-bold">
                                {item.kelas}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                                item.mode === 'harian'
                                  ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                                  : item.mode === 'dhuha'
                                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                  : item.mode === 'dzuhur'
                                  ? 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800'
                                  : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              }`}>
                                {getModeLabel(item.mode, item.subject)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(item)}
                                title="Klik untuk mengubah status (Hadir <-> Terlambat)"
                                className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all hover:scale-105 active:scale-95 ${
                                  item.status === 'Terlambat'
                                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                }`}
                              >
                                {item.status}
                              </button>
                            </td>
                            <td className="px-4 py-3 text-slate-500 text-[11px] max-w-[150px] truncate">
                              {item.notes || '-'}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => setEditingRecord(item)}
                                  className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-purple-50 dark:hover:bg-purple-950/50 hover:text-purple-600 rounded-lg transition-colors"
                                  title="Edit Status / Catatan"
                                >
                                  <Edit3 size={14} />
                                </button>
                                {isAdmin && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteHistory(item.id)}
                                    className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
                                    title="Hapus dari Database"
                                  >
                                    <Trash2 size={14} />
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

            </div>
          </div>
        )}

        {/* TAB REKAP & LAPORAN EKSTRAKURIKULER */}
        {activeTab === 'rekap' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm space-y-6">
              
              {/* Header & Actions */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-xs font-bold border border-amber-300 dark:border-amber-800 mb-2">
                    <Trophy size={14} />
                    <span>Laporan & Rekapitulasi Ekstrakurikuler</span>
                  </div>
                  <h3 className="text-xl font-black text-slate-800 dark:text-white">
                    Rekap Presensi {rekapSelectedEkstra || 'Ekstrakurikuler'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {isPembina && !isAdmin 
                      ? `Laporan khusus peserta & kehadiran ${rekapSelectedEkstra} untuk dikirimkan kepada Kepala Sekolah.`
                      : `Pilih Ekstrakurikuler dan periode bulan untuk melihat & mendownload rekap kehadiran siswa.`}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={fetchRekapLogs}
                    className="px-3 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                    title="Muat Ulang Data Scan"
                  >
                    <RefreshCw size={14} className={loadingRekap ? 'animate-spin' : ''} />
                    <span>Refresh</span>
                  </button>

                  <button
                    type="button"
                    onClick={exportRekapCSV}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <Download size={14} />
                    <span>Export Excel (CSV)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <Printer size={14} />
                    <span>Cetak Laporan Official (Print/PDF)</span>
                  </button>
                </div>
              </div>

              {/* Filters Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700">
                {/* Ekstrakurikuler Selector */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Ekstrakurikuler:
                  </label>
                  {isPembina && !isAdmin && allowedEkstraForUser.length <= 1 ? (
                    <div className="w-full px-3 py-2 bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 rounded-xl text-xs font-extrabold text-amber-900 dark:text-amber-200 flex items-center justify-between">
                      <span>{rekapSelectedEkstra}</span>
                      <span className="text-[10px] bg-amber-200 dark:bg-amber-900 px-1.5 py-0.5 rounded text-amber-900 dark:text-amber-100">Dikunci Pembina</span>
                    </div>
                  ) : (
                    <select
                      value={rekapSelectedEkstra}
                      onChange={(e) => setRekapSelectedEkstra(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white"
                    >
                      {allowedEkstraForUser.length > 0 ? (
                        allowedEkstraForUser.map(e => (
                          <option key={e} value={e}>{e}</option>
                        ))
                      ) : (
                        EKSTRA_LIST.map(e => (
                          <option key={e} value={e}>{e}</option>
                        ))
                      )}
                    </select>
                  )}
                </div>

                {/* Month Periode Selector */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Periode / Bulan Rekap:
                  </label>
                  <select
                    value={rekapMonth}
                    onChange={(e) => setRekapMonth(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white"
                  >
                    <option value="all">Semua Bulan (All-Time Total)</option>
                    {(() => {
                      const now = new Date();
                      const opts = [];
                      const monthNames = [
                        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
                        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
                      ];
                      for (let i = 0; i < 12; i++) {
                        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                        const yr = d.getFullYear();
                        const mo = String(d.getMonth() + 1).padStart(2, '0');
                        opts.push({ val: `${yr}-${mo}`, label: `${monthNames[d.getMonth()]} ${yr}` });
                      }
                      return opts.map(o => (
                        <option key={o.val} value={o.val}>{o.label}</option>
                      ));
                    })()}
                  </select>
                </div>

                {/* Search */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Pencarian Siswa:
                  </label>
                  <div className="relative">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cari nama / NISN..."
                      value={rekapSearch}
                      onChange={(e) => setRekapSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white"
                    />
                  </div>
                </div>

                {/* Class Filter */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Filter Kelas:
                  </label>
                  <select
                    value={rekapClassFilter}
                    onChange={(e) => setRekapClassFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white"
                  >
                    <option value="">Semua Kelas</option>
                    {classes.map(c => (
                      <option key={c} value={c}>Kelas {c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Toggle onlyParticipated */}
              <div className="flex items-center justify-between pt-1">
                <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={onlyParticipated}
                    onChange={(e) => setOnlyParticipated(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300"
                  />
                  <span>Hanya tampilkan peserta yang pernah scan/hadir di {rekapSelectedEkstra}</span>
                </label>

                <div className="text-xs text-slate-500 font-medium">
                  Periode: <strong className="text-amber-600 dark:text-amber-400">{getRekapMonthLabel(rekapMonth)}</strong>
                </div>
              </div>

              {/* Statistics Cards */}
              {(() => {
                const summary = getRekapSummary();
                const totalActiveStudents = summary.filter(s => s.totalKehadiran > 0).length;
                const totalScans = rekapLogs.length;
                const uniqueDatesCount = new Set(rekapLogs.map(l => l.scanned_at.substring(0, 10))).size;

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-amber-50 dark:bg-amber-950/40 p-4 rounded-2xl border border-amber-200 dark:border-amber-800">
                      <div className="text-xs text-amber-800 dark:text-amber-300 font-bold flex items-center gap-1.5">
                        <Users size={16} /> Total Peserta Aktif
                      </div>
                      <div className="text-2xl font-black text-amber-900 dark:text-amber-100 mt-1">
                        {totalActiveStudents} <span className="text-xs font-normal text-amber-700 dark:text-amber-300">Siswa</span>
                      </div>
                      <div className="text-[11px] text-amber-700 dark:text-amber-400 mt-1">Siswa yang pernah melakukan scan</div>
                    </div>

                    <div className="bg-purple-50 dark:bg-purple-950/40 p-4 rounded-2xl border border-purple-200 dark:border-purple-800">
                      <div className="text-xs text-purple-800 dark:text-purple-300 font-bold flex items-center gap-1.5">
                        <Calendar size={16} /> Total Pertemuan Ekstra
                      </div>
                      <div className="text-2xl font-black text-purple-900 dark:text-purple-100 mt-1">
                        {uniqueDatesCount} <span className="text-xs font-normal text-purple-700 dark:text-purple-300">Hari Pelaksanaan</span>
                      </div>
                      <div className="text-[11px] text-purple-700 dark:text-purple-400 mt-1">Hari ditemukannya catatan presensi</div>
                    </div>

                    <div className="bg-emerald-50 dark:bg-emerald-950/40 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800">
                      <div className="text-xs text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-1.5">
                        <CheckCircle2 size={16} /> Total Scan Recorded
                      </div>
                      <div className="text-2xl font-black text-emerald-900 dark:text-emerald-100 mt-1">
                        {totalScans} <span className="text-xs font-normal text-emerald-700 dark:text-emerald-300">Presensi</span>
                      </div>
                      <div className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1">Total seluruh akumulasi scan presensi</div>
                    </div>
                  </div>
                );
              })()}

              {/* Rekap Table */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="px-4 py-3">No</th>
                      <th className="px-4 py-3">NISN</th>
                      <th className="px-4 py-3">Nama Siswa</th>
                      <th className="px-4 py-3">Kelas</th>
                      <th className="px-4 py-3 text-center">Total Kehadiran</th>
                      <th className="px-4 py-3 text-center">Tepat Waktu</th>
                      <th className="px-4 py-3 text-center">Terlambat</th>
                      <th className="px-4 py-3">Rincian Tanggal Kehadiran</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {loadingRekap ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-slate-400 italic">
                          Mengambil data rekap presensi...
                        </td>
                      </tr>
                    ) : getRekapSummary().length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-slate-400 italic">
                          Belum ada catatan scan presensi untuk {rekapSelectedEkstra} pada periode {getRekapMonthLabel(rekapMonth)}.
                        </td>
                      </tr>
                    ) : (
                      getRekapSummary().map((item, index) => (
                        <tr key={item.nisn + index} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                          <td className="px-4 py-3 font-bold text-slate-500">{index + 1}</td>
                          <td className="px-4 py-3 font-mono font-bold text-purple-700 dark:text-purple-300">{item.nisn}</td>
                          <td className="px-4 py-3 font-extrabold text-slate-900 dark:text-white">{item.name}</td>
                          <td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-300">Kelas {item.kelas}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-block px-2.5 py-1 rounded-full font-black text-xs bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                              {item.totalKehadiran} Kali
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center font-bold text-emerald-600 dark:text-emerald-400">
                            {item.totalHadir}
                          </td>
                          <td className="px-4 py-3 text-center font-bold text-rose-600 dark:text-rose-400">
                            {item.totalTerlambat}
                          </td>
                          <td className="px-4 py-3 text-[11px] text-slate-600 dark:text-slate-400 max-w-xs leading-relaxed">
                            {item.datesFormattedList.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {item.datesFormattedList.map((dt, dIdx) => (
                                  <span key={dIdx} className="bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-[10px] font-mono">
                                    {dt}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Belum Pernah Scan</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

            </div>

            {/* Official Report Print Area (Visible only when Printing) */}
            <div id="rekap-ekstra-print-area" className="hidden print:block p-8 bg-white text-black font-sans">
              <style>{`
                @media print {
                  body * {
                    visibility: hidden;
                  }
                  #rekap-ekstra-print-area, #rekap-ekstra-print-area * {
                    visibility: visible;
                  }
                  #rekap-ekstra-print-area {
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100%;
                    background: #ffffff !important;
                    color: #000000 !important;
                  }
                }
              `}</style>

              {/* Kop Laporan Header */}
              <div className="text-center border-b-2 border-black pb-4 mb-6">
                <h2 className="text-xl font-bold uppercase tracking-wider">UPT SMP NEGERI 8 PASURUAN</h2>
                <h3 className="text-sm font-semibold uppercase text-slate-700">Laporan Rekapitulasi Presensi Ekstrakurikuler</h3>
                <p className="text-xs text-slate-500 mt-0.5">Sistem Informasi Management Presensi & Laporan (SIMPANLA)</p>
              </div>

              {/* Information Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs mb-6 border p-4 rounded">
                <div>
                  <div className="mb-1"><span className="font-bold">Kegiatan Ekstra:</span> {rekapSelectedEkstra}</div>
                  <div className="mb-1"><span className="font-bold">Periode Laporan:</span> {getRekapMonthLabel(rekapMonth)}</div>
                  <div className="mb-1"><span className="font-bold">Tahun Ajaran:</span> {academicYear || '2025/2026'}</div>
                </div>
                <div>
                  <div className="mb-1"><span className="font-bold">Pembina Ekstra:</span> {assignedPembinaConfig?.nama || profile?.full_name || 'Pembina Ekstrakurikuler'}</div>
                  <div className="mb-1"><span className="font-bold">NIP Pembina:</span> {assignedPembinaConfig?.nip || profile?.nip || '-'}</div>
                  <div className="mb-1"><span className="font-bold">Tanggal Cetak:</span> {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                </div>
              </div>

              {/* Report Table */}
              <table className="w-full text-xs border-collapse border border-slate-400 mb-8">
                <thead>
                  <tr className="bg-slate-100 text-black font-bold text-center">
                    <th className="border border-slate-400 p-2 w-10">NO</th>
                    <th className="border border-slate-400 p-2 w-28">NISN</th>
                    <th className="border border-slate-400 p-2 text-left">NAMA SISWA</th>
                    <th className="border border-slate-400 p-2 w-20">KELAS</th>
                    <th className="border border-slate-400 p-2 w-24">TOTAL SCAN</th>
                    <th className="border border-slate-400 p-2 text-left">RINCIAN TANGGAL KEHADIRAN</th>
                  </tr>
                </thead>
                <tbody>
                  {getRekapSummary().map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-300">
                      <td className="border border-slate-400 p-2 text-center">{idx + 1}</td>
                      <td className="border border-slate-400 p-2 text-center font-mono">{item.nisn}</td>
                      <td className="border border-slate-400 p-2 font-bold">{item.name}</td>
                      <td className="border border-slate-400 p-2 text-center">Kelas {item.kelas}</td>
                      <td className="border border-slate-400 p-2 text-center font-bold">{item.totalKehadiran} Kali</td>
                      <td className="border border-slate-400 p-2 text-xs">
                        {item.datesFormattedList.join(', ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Tanda Tangan Section */}
              <div className="flex justify-between items-end text-xs mt-12 pt-4">
                <div className="text-center w-60">
                  <p>Mengetahui,</p>
                  <p className="font-bold">Kepala Sekolah</p>
                  <div className="h-20"></div>
                  <p className="font-bold underline">_________________________</p>
                  <p>NIP. ....................................</p>
                </div>

                <div className="text-center w-60">
                  <p>Pasuruan, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  <p className="font-bold">Pembina Ekstrakurikuler {rekapSelectedEkstra}</p>
                  <div className="h-20"></div>
                  <p className="font-bold underline">{assignedPembinaConfig?.nama || profile?.full_name || '....................................'}</p>
                  <p>NIP. {assignedPembinaConfig?.nip || profile?.nip || '....................................'}</p>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* TAB 3: KELOLA PEMBINA EKSTRA (ADMIN ONLY) */}
        {activeTab === 'pembina' && isAdmin && (
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-bold border border-emerald-300 dark:border-emerald-800 mb-2">
                  <UserCog size={14} />
                  <span>Manajemen Hak Akses Scanner QR</span>
                </div>
                <h3 className="text-xl font-black text-slate-800 dark:text-white">
                  Penetapan Guru Pembina Ekstrakurikuler
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Tentukan Guru yang bertindak sebagai Pembina Ekstrakurikuler. Hanya Guru yang aktif sebagai Pembina Ekstra yang memiliki izin melakukan Scan QR Presensi.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={fetchTeachers}
                  className="px-3 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  <RefreshCw size={14} className={loadingTeachers ? 'animate-spin' : ''} />
                  <span>Reload Guru</span>
                </button>
              </div>
            </div>

            {/* Search filter */}
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari NIP atau nama Guru..."
                value={pembinaSearch}
                onChange={(e) => setPembinaSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white"
              />
            </div>

            {/* Teacher Pembina List */}
            <div className="space-y-4">
              {loadingTeachers ? (
                <div className="p-8 text-center text-slate-400">Loading data guru...</div>
              ) : teachers.length === 0 ? (
                <div className="p-8 text-center text-slate-400">Belum ada data guru di database.</div>
              ) : (
                teachers
                  .filter(t => !pembinaSearch || (t.full_name && t.full_name.toLowerCase().includes(pembinaSearch.toLowerCase())) || (t.nip && t.nip.includes(pembinaSearch)))
                  .map(teacher => {
                    const isPembinaActive = pembinaEkstraList.some(p => p.nip === teacher.nip || p.nama === teacher.full_name);
                    const pembinaItem = pembinaEkstraList.find(p => p.nip === teacher.nip || p.nama === teacher.full_name);
                    const assignedEkstra = pembinaItem?.ekstraList || [];

                    return (
                      <div 
                        key={teacher.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          isPembinaActive
                            ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700'
                            : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl font-bold flex items-center justify-center shrink-0 ${
                              isPembinaActive ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                            }`}>
                              {teacher.full_name?.charAt(0) || 'G'}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">
                                  {teacher.full_name}
                                </h4>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                  isPembinaActive
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                                }`}>
                                  {isPembinaActive ? 'Pembina Ekstra Aktif' : 'Guru Biasa'}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 font-mono mt-0.5">
                                NIP: {teacher.nip || '-'} {teacher.mengajar_mapel ? `• Mapel: ${teacher.mengajar_mapel}` : ''}
                              </p>
                            </div>
                          </div>

                          <button
                            onClick={() => handleTogglePembinaTeacher(teacher)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 self-start sm:self-auto ${
                              isPembinaActive
                                ? 'bg-rose-100 hover:bg-rose-200 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            }`}
                          >
                            {isPembinaActive ? (
                              <>
                                <X size={14} />
                                <span>Cabut Status Pembina</span>
                              </>
                            ) : (
                              <>
                                <Check size={14} />
                                <span>Tunjuk Pembina Ekstra</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Ekstra Selection Checklist when Active */}
                        {isPembinaActive && (
                          <div className="mt-4 pt-3 border-t border-emerald-200 dark:border-emerald-800/60 space-y-2">
                            <label className="block text-xs font-extrabold text-emerald-900 dark:text-emerald-200">
                              Ekstrakurikuler yang Diampu:
                            </label>
                            <div className="flex flex-wrap gap-1.5">
                              {EKSTRA_LIST.map(ekstraName => {
                                const isChecked = assignedEkstra.includes(ekstraName);
                                return (
                                  <button
                                    key={ekstraName}
                                    type="button"
                                    onClick={() => handleToggleEkstraForPembina(teacher.nip, ekstraName)}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                                      isChecked
                                        ? 'bg-emerald-600 text-white shadow-sm'
                                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                                    }`}
                                  >
                                    {isChecked ? <CheckSquare size={12} /> : <Square size={12} />}
                                    <span>{ekstraName}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
              )}
            </div>

          </div>
        )}

        {/* TAB 4: CETAK KARTU QR NISN (ADMIN ONLY) */}
        {activeTab === 'cards' && isAdmin && (
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-slate-800 dark:text-white">Generator & Cetak Kartu QR NISN</h3>
                <p className="text-xs text-slate-500">Fitur cetak kartu identitas siswa yang dilengkapi QR Code NISN resmi UPT SMP Negeri 8 Pasuruan untuk kebutuhan cetak massal per kelas.</p>
              </div>

              <button
                onClick={() => window.print()}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-purple-500/20 flex items-center gap-2 self-start md:self-auto"
              >
                <Printer size={16} />
                <span>Cetak Tampilan Kartu</span>
              </button>
            </div>

            {/* Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Filter Kelas</label>
                <select
                  value={selectedCardClass}
                  onChange={(e) => setSelectedCardClass(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white"
                >
                  <option value="">Semua Kelas ({students.length} Siswa)</option>
                  {classes.map(c => (
                    <option key={c} value={c}>Kelas {c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Cari Nama / NISN</label>
                <input
                  type="text"
                  placeholder="Ketik nama siswa..."
                  value={cardSearch}
                  onChange={(e) => setCardSearch(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white font-medium"
                />
              </div>
            </div>

            {/* Student Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 printable-area">
              {studentsForCards.length === 0 ? (
                <div className="col-span-full py-12 text-center text-slate-400 italic">
                  Tidak ada data siswa yang ditemukan.
                </div>
              ) : (
                studentsForCards.map((st) => (
                  <div
                    key={st.id}
                    className="p-5 rounded-2xl border-2 border-purple-200 dark:border-purple-800/60 bg-gradient-to-br from-white via-purple-50/20 to-slate-50 dark:from-slate-900 dark:to-slate-800 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[220px]"
                  >
                    {/* Header Card */}
                    <div className="flex items-center justify-between pb-3 border-b border-purple-100 dark:border-purple-900/40">
                      <div className="flex items-center gap-2">
                        <GraduationCap size={18} className="text-purple-600" />
                        <div>
                          <div className="text-[10px] font-black text-purple-900 dark:text-purple-300 uppercase tracking-wider">UPT SMPN 8 PASURUAN</div>
                          <div className="text-[9px] text-slate-400 font-bold">KARTU PRESENSI NISN</div>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-purple-600 text-white text-[10px] font-black">
                        {st.kelas}
                      </span>
                    </div>

                    {/* Student Info & QR Code */}
                    <div className="flex items-center justify-between my-3 gap-3">
                      <div className="space-y-1">
                        <h4 className="font-extrabold text-slate-900 dark:text-white text-sm line-clamp-2 leading-snug">
                          {st.name}
                        </h4>
                        <div className="text-[11px] font-mono font-bold text-purple-700 dark:text-purple-300">
                          NISN: {st.nisn || st.nis || '-'}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          T.A {academicYear || '2025/2026'}
                        </div>
                      </div>

                      {/* SVG QR Code Image Generator */}
                      <div className="w-20 h-20 p-1.5 bg-white rounded-xl border border-purple-200 shrink-0 flex items-center justify-center shadow-inner">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(st.nisn || st.id)}`}
                          alt={`QR ${st.name}`}
                          className="w-full h-full object-contain"
                          loading="lazy"
                        />
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="pt-2 border-t border-purple-100 dark:border-purple-900/40 text-[9px] text-slate-400 font-bold flex justify-between items-center">
                      <span>SIM-PANLA DIGITAL</span>
                      <span>KARTU RESMI SISWA</span>
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>
        )}

        {/* MODAL 1: TAMBAH PRESENSI MANUAL */}
        {showManualAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl border border-slate-100 dark:border-slate-700 space-y-5 max-h-[90vh] overflow-y-auto">
              
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-600 flex items-center justify-center font-bold">
                    <PlusCircle size={20} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                      Input Presensi Manual
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Tambahkan presensi siswa langsung ke database server
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowManualAddModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveManualAttendance} className="space-y-4 text-xs">
                
                {/* Search & Select Student */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Pilih Siswa <span className="text-rose-500">*</span>
                  </label>
                  
                  {selectedStudentForManual ? (
                    <div className="p-3 bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 rounded-xl flex items-center justify-between">
                      <div>
                        <div className="font-extrabold text-slate-900 dark:text-white text-sm">
                          {selectedStudentForManual.name}
                        </div>
                        <div className="text-purple-700 dark:text-purple-300 text-xs font-bold mt-0.5">
                          Kelas {selectedStudentForManual.kelas} • NISN: {selectedStudentForManual.nisn || selectedStudentForManual.nis || '-'}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedStudentForManual(null)}
                        className="px-2.5 py-1 bg-purple-200 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-lg text-[11px] font-bold hover:bg-purple-300"
                      >
                        Ganti Siswa
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Ketik nama siswa atau NISN..."
                          value={manualAddStudentSearch}
                          onChange={(e) => setManualAddStudentSearch(e.target.value)}
                          className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>

                      {manualAddStudentSearch.trim() && (
                        <div className="max-h-44 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
                          {searchMatchedStudents.length === 0 ? (
                            <div className="p-3 text-center text-slate-400 italic text-xs">
                              Tidak ada siswa yang cocok dengan "{manualAddStudentSearch}"
                            </div>
                          ) : (
                            searchMatchedStudents.map(st => (
                              <button
                                key={st.id}
                                type="button"
                                onClick={() => {
                                  setSelectedStudentForManual(st);
                                  setManualAddStudentSearch('');
                                }}
                                className="w-full text-left p-2.5 hover:bg-purple-50 dark:hover:bg-purple-950/50 flex items-center justify-between text-xs transition-colors"
                              >
                                <div>
                                  <div className="font-extrabold text-slate-800 dark:text-slate-100">{st.name}</div>
                                  <div className="text-[10px] text-slate-500">Kelas {st.kelas} • NISN: {st.nisn || st.nis || '-'}</div>
                                </div>
                                <span className="text-purple-600 font-bold text-[11px]">+ Pilih</span>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Tanggal & Waktu */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">Tanggal</label>
                    <input
                      type="date"
                      value={manualAddDate}
                      onChange={(e) => setManualAddDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-white"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">Waktu</label>
                    <input
                      type="time"
                      value={manualAddTime}
                      onChange={(e) => setManualAddTime(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-white"
                      required
                    />
                  </div>
                </div>

                {/* Kegiatan Presensi */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Kegiatan Presensi</label>
                  <select
                    value={manualAddMode}
                    onChange={(e) => setManualAddMode(e.target.value as PresensiMode)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-white"
                  >
                    <option value="harian">Scan Masuk Gerbang (Presensi Harian)</option>
                    <option value="dhuha">Sholat Dhuha</option>
                    <option value="dzuhur">Sholat Dzuhur</option>
                    <option value="ekstra">Ekstrakurikuler</option>
                  </select>
                </div>

                {manualAddMode === 'ekstra' && (
                  <div className="space-y-1 animate-fade-in">
                    <label className="font-bold text-slate-700 dark:text-slate-300">Cabang Ekstrakurikuler</label>
                    <select
                      value={manualAddEkstra}
                      onChange={(e) => setManualAddEkstra(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-white"
                    >
                      {EKSTRA_LIST.map(ek => (
                        <option key={ek} value={ek}>{ek}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Status Kehadiran */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Status Kehadiran</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setManualAddStatus('Hadir')}
                      className={`py-2 px-3 rounded-xl font-black text-xs transition-all border ${
                        manualAddStatus === 'Hadir'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      ✓ Hadir (Tepat Waktu)
                    </button>
                    <button
                      type="button"
                      onClick={() => setManualAddStatus('Terlambat')}
                      className={`py-2 px-3 rounded-xl font-black text-xs transition-all border ${
                        manualAddStatus === 'Terlambat'
                          ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      ⚠ Terlambat
                    </button>
                  </div>
                </div>

                {/* Catatan */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Catatan / Keterangan (Opsional)</label>
                  <input
                    type="text"
                    placeholder="Contoh: Izin terlambat dari orang tua, Kartu tertinggal, dll."
                    value={manualAddNotes}
                    onChange={(e) => setManualAddNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white"
                  />
                </div>

                {/* Form Buttons */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setShowManualAddModal(false)}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl font-bold transition-all"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={savingManual || !selectedStudentForManual}
                    className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-md"
                  >
                    {savingManual ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={14} />
                        <span>Simpan ke Database</span>
                      </>
                    )}
                  </button>
                </div>

              </form>

            </div>
          </div>
        )}

        {/* MODAL 2: EDIT CATATAN PRESENSI */}
        {editingRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-slate-100 dark:border-slate-700 space-y-5">
              
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-600 flex items-center justify-center font-bold">
                    <Edit3 size={18} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                      Edit Data Presensi
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Perbarui status dan detail catatan presensi
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
                
                {/* Student Info Readonly Banner */}
                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="font-black text-slate-900 dark:text-white text-sm">
                    {editingRecord.studentName}
                  </div>
                  <div className="text-purple-700 dark:text-purple-300 text-xs font-bold mt-0.5">
                    Kelas {editingRecord.kelas} • NISN: {editingRecord.nisn}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 font-mono">
                    Waktu: {new Date(editingRecord.timestamp).toLocaleString('id-ID')}
                  </div>
                </div>

                {/* Status Toggle */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Status Kehadiran</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingRecord(prev => prev ? { ...prev, status: 'Hadir' } : null)}
                      className={`py-2 px-3 rounded-xl font-black text-xs transition-all border ${
                        editingRecord.status === 'Hadir'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      ✓ Hadir
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingRecord(prev => prev ? { ...prev, status: 'Terlambat' } : null)}
                      className={`py-2 px-3 rounded-xl font-black text-xs transition-all border ${
                        editingRecord.status === 'Terlambat'
                          ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      ⚠ Terlambat
                    </button>
                  </div>
                </div>

                {/* Mode Kegiatan */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Kegiatan</label>
                  <select
                    value={editingRecord.mode}
                    onChange={(e) => setEditingRecord(prev => prev ? { ...prev, mode: e.target.value as PresensiMode } : null)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-white"
                  >
                    <option value="harian">Scan Masuk Gerbang (Presensi Harian)</option>
                    <option value="dhuha">Sholat Dhuha</option>
                    <option value="dzuhur">Sholat Dzuhur</option>
                    <option value="ekstra">Ekstrakurikuler</option>
                  </select>
                </div>

                {editingRecord.mode === 'ekstra' && (
                  <div className="space-y-1 animate-fade-in">
                    <label className="font-bold text-slate-700 dark:text-slate-300">Cabang Ekstra</label>
                    <select
                      value={editingRecord.subject || EKSTRA_LIST[0]}
                      onChange={(e) => setEditingRecord(prev => prev ? { ...prev, subject: e.target.value } : null)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-white"
                    >
                      {EKSTRA_LIST.map(ek => (
                        <option key={ek} value={ek}>{ek}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Notes */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Catatan / Keterangan</label>
                  <input
                    type="text"
                    value={editingRecord.notes || ''}
                    onChange={(e) => setEditingRecord(prev => prev ? { ...prev, notes: e.target.value } : null)}
                    placeholder="Keterangan..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setEditingRecord(null)}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl font-bold transition-all"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-all flex items-center gap-1.5 shadow-md disabled:opacity-50"
                  >
                    {savingEdit ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={14} />
                        <span>Simpan Perubahan</span>
                      </>
                    )}
                  </button>
                </div>

              </form>

            </div>
          </div>
        )}

        {/* MODAL 3: CETAK LAPORAN RESMI (OFFICIAL PRINT PREVIEW) */}
        {isPrintModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in overflow-y-auto">
            <div className="bg-white text-slate-900 rounded-3xl p-6 md:p-8 max-w-4xl w-full shadow-2xl space-y-6 my-8 max-h-[92vh] overflow-y-auto">
              
              {/* Header Action Bar */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 print:hidden">
                <div className="flex items-center gap-2">
                  <Printer size={20} className="text-purple-600" />
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Pratinjau Cetak Laporan Presensi Resmi
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md"
                  >
                    <Printer size={14} />
                    <span>Cetak Sekarang (Print / PDF)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPrintModalOpen(false)}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                  >
                    Tutup
                  </button>
                </div>
              </div>

              {/* Printable Document Sheet */}
              <div className="printable-area p-6 space-y-6 border border-slate-200 rounded-2xl bg-white">
                
                {/* Official Kop Surat Header */}
                <div className="text-center pb-4 border-b-2 border-slate-900 space-y-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">PEMERINTAH KOTA PASURUAN</h4>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">DINAS PENDIDIKAN DAN KEBUDAYAAN</h4>
                  <h2 className="text-lg font-black uppercase text-slate-900">UPT SMP NEGERI 8 PASURUAN</h2>
                  <p className="text-[10px] text-slate-500">
                    Jl. Ir. H. Juanda No. 8, Kota Pasuruan, Jawa Timur | Telp: (0343) 424108 | Web: smpn8pasuruan.sch.id
                  </p>
                </div>

                {/* Report Title & Metadata */}
                <div className="space-y-2">
                  <h3 className="text-center text-sm font-black uppercase tracking-wide text-slate-900 underline decoration-slate-400">
                    LAPORAN REKAPITULASI SCAN PRESENSI DIGITAL SISWA
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4 text-xs pt-2">
                    <div>
                      <div><strong>Periode:</strong> {logDateMode === 'today' ? 'Hari Ini' : logDateMode === 'date' ? logSelectedDate : logDateMode === 'month' ? logSelectedMonth : 'Semua Periode Database'}</div>
                      <div><strong>Jenis Presensi:</strong> {logModeFilter ? getModeLabel(logModeFilter as PresensiMode, logEkstraFilter) : 'Semua Kegiatan'}</div>
                    </div>
                    <div className="text-right">
                      <div><strong>Total Siswa Tercatat:</strong> {filteredDatabaseLogs.length} Orang</div>
                      <div><strong>Hadir Tepat Waktu:</strong> {filteredDatabaseLogs.filter(i => i.status === 'Hadir').length} | <strong>Terlambat:</strong> {filteredDatabaseLogs.filter(i => i.status === 'Terlambat').length}</div>
                    </div>
                  </div>
                </div>

                {/* Table of Records */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border border-slate-300">
                    <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                      <tr>
                        <th className="p-2 border-r border-slate-300 text-center w-10">No</th>
                        <th className="p-2 border-r border-slate-300">Waktu & Tanggal</th>
                        <th className="p-2 border-r border-slate-300">NISN</th>
                        <th className="p-2 border-r border-slate-300">Nama Siswa</th>
                        <th className="p-2 border-r border-slate-300 text-center">Kelas</th>
                        <th className="p-2 border-r border-slate-300">Kegiatan</th>
                        <th className="p-2 border-r border-slate-300 text-center">Status</th>
                        <th className="p-2">Catatan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredDatabaseLogs.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-4 text-center text-slate-400 italic">
                            Tidak ada data presensi pada kriteria ini.
                          </td>
                        </tr>
                      ) : (
                        filteredDatabaseLogs.map((item, idx) => (
                          <tr key={item.id}>
                            <td className="p-2 border-r border-slate-200 text-center font-medium">{idx + 1}</td>
                            <td className="p-2 border-r border-slate-200 font-mono text-[11px]">
                              {new Date(item.timestamp).toLocaleString('id-ID')}
                            </td>
                            <td className="p-2 border-r border-slate-200 font-mono font-bold text-purple-800">{item.nisn}</td>
                            <td className="p-2 border-r border-slate-200 font-bold">{item.studentName}</td>
                            <td className="p-2 border-r border-slate-200 text-center font-bold">{item.kelas}</td>
                            <td className="p-2 border-r border-slate-200 text-[11px]">{getModeLabel(item.mode, item.subject)}</td>
                            <td className="p-2 border-r border-slate-200 text-center">
                              <span className={`font-bold ${item.status === 'Terlambat' ? 'text-rose-700' : 'text-emerald-700'}`}>
                                {item.status}
                              </span>
                            </td>
                            <td className="p-2 text-[11px] text-slate-600">{item.notes || '-'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Official Signatures Footer */}
                <div className="grid grid-cols-2 gap-8 pt-8 text-xs text-center">
                  <div>
                    <p className="text-slate-500 mb-16">Mengetahui,<br />Guru Piket / Pembina Kegiatan</p>
                    <p className="font-black text-slate-900 underline">( _____________________________ )</p>
                    <p className="text-[10px] text-slate-500">NIP. .....................................................</p>
                  </div>
                  <div>
                    <p className="text-slate-500 mb-16">Pasuruan, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br />Kepala UPT SMPN 8 Pasuruan</p>
                    <p className="font-black text-slate-900 underline">( _____________________________ )</p>
                    <p className="text-[10px] text-slate-500">NIP. .....................................................</p>
                  </div>
                </div>

              </div>

            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}
