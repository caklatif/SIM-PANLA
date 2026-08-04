import React, { useEffect, useState, useRef } from 'react';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { Student, Profile } from '../types';
import { 
  Scan, Camera, Keyboard, CheckCircle2, AlertCircle, Clock, Users, 
  Search, Printer, Download, Trash2, RefreshCw, Volume2, VolumeX, 
  Sparkles, GraduationCap, Sun, Check, ArrowRight, ShieldCheck, X,
  Trophy, Lock, UserCheck, ShieldAlert, UserCog, Save, CheckSquare, Square
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
  const [activeTab, setActiveTab] = useState<'scan' | 'history' | 'cards' | 'pembina'>('scan');
  const [presensiMode, setPresensiMode] = useState<PresensiMode>('harian');
  const [selectedEkstra, setSelectedEkstra] = useState<string>(allowedEkstraForUser[0] || '');

  // Sync selectedEkstra when allowedEkstraForUser changes
  useEffect(() => {
    if (allowedEkstraForUser.length > 0 && !allowedEkstraForUser.includes(selectedEkstra)) {
      setSelectedEkstra(allowedEkstraForUser[0]);
    } else if (allowedEkstraForUser.length === 0) {
      setSelectedEkstra('');
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
  const [manualInput, setManualInput] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  
  // Last Scanned Result
  const [lastScannedStudent, setLastScannedStudent] = useState<{
    student: Student;
    status: 'Hadir' | 'Terlambat';
    recordTime: string;
    isDuplicate: boolean;
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

  // Filter history
  const [historySearch, setHistorySearch] = useState<string>('');
  const [historyClassFilter, setHistoryClassFilter] = useState<string>('');

  // Card Generator
  const [selectedCardClass, setSelectedCardClass] = useState<string>('');
  const [cardSearch, setCardSearch] = useState<string>('');

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'qr-reader-viewfinder';
  const manualInputRef = useRef<HTMLInputElement>(null);

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
  const playBeep = (type: 'success' | 'warning' | 'error') => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.25);
      } else if (type === 'warning') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.setValueAtTime(350, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.setValueAtTime(180, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.35);
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

      if (error && (error.code === '42703' || error.message?.includes('academic_year'))) {
        const res = await supabase.from('students').select('*').order('kelas', { ascending: true }).order('name', { ascending: true });
        data = res.data;
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

      const html5QrCode = new Html5Qrcode(scannerContainerId);
      html5QrCodeRef.current = html5QrCode;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      await html5QrCode.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          handleScanSuccess(decodedText);
        },
        () => {}
      );

      setIsScanning(true);
    } catch (err: any) {
      console.error('Camera start error:', err);
      setCameraError('Gagal mengakses kamera. Pastikan izin kamera telah diberikan atau gunakan opsi Input Manual / Barcode Gun.');
      setIsScanning(false);
    }
  };

  // Stop Camera
  const stopCamera = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (e) {
        console.warn('Error stopping camera:', e);
      }
    }
    setIsScanning(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Process Scanned NISN / Raw Code
  const handleScanSuccess = (rawValue: string) => {
    if (!rawValue) return;

    if (presensiMode === 'ekstra' && allowedEkstraForUser.length === 0) {
      playBeep('error');
      showAlert('Pilihan Ekstrakurikuler hanya tersedia untuk Guru yang telah ditunjuk sebagai Pembina Ekstrakurikuler di Dashboard Admin.', 'Akses Ekstra Dibatasi');
      return;
    }

    let cleanCode = rawValue.trim();
    if (cleanCode.startsWith('NISN:')) {
      cleanCode = cleanCode.replace('NISN:', '').trim();
    } else if (cleanCode.includes('{')) {
      try {
        const obj = JSON.parse(cleanCode);
        cleanCode = obj.nisn || obj.nis || cleanCode;
      } catch (e) {}
    }

    const matchedStudent = students.find(
      s => (s.nisn && s.nisn.trim() === cleanCode) || (s.nis && s.nis.trim() === cleanCode)
    );

    const now = new Date();
    const timeString = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const fullTimestamp = now.toISOString();

    const currentHour = now.getHours();
    const currentMin = now.getMinutes();
    const isLate = presensiMode === 'harian' && (currentHour > 7 || (currentHour === 7 && currentMin > 15));
    const status: 'Hadir' | 'Terlambat' = isLate ? 'Terlambat' : 'Hadir';

    if (!matchedStudent) {
      playBeep('error');
      showAlert(`NISN / Kartu "${cleanCode}" tidak ditemukan di database siswa.`, 'Siswa Tidak Ditemukan');
      return;
    }

    // Check duplicate scan
    const existingIndex = scanHistory.findIndex(
      item => item.nisn === matchedStudent.nisn && item.mode === presensiMode && (
        presensiMode === 'ekstra' ? item.subject === selectedEkstra : true
      )
    );

    const isDuplicate = existingIndex !== -1;

    if (isDuplicate) {
      playBeep('warning');
      setLastScannedStudent({
        student: matchedStudent,
        status: scanHistory[existingIndex].status,
        recordTime: scanHistory[existingIndex].timestamp.split('T')[1]?.substring(0, 8) || timeString,
        isDuplicate: true,
      });
      return;
    }

    // Record new scan
    playBeep('success');
    const activeSubject = presensiMode === 'ekstra' ? selectedEkstra : undefined;

    const newRecord: QRScanRecord = {
      id: `${Date.now()}-${matchedStudent.id}`,
      nisn: matchedStudent.nisn || matchedStudent.nis || cleanCode,
      studentName: matchedStudent.name,
      kelas: matchedStudent.kelas,
      timestamp: fullTimestamp,
      mode: presensiMode,
      status: status,
      subject: activeSubject,
    };

    setScanHistory(prev => [newRecord, ...prev]);
    setLastScannedStudent({
      student: matchedStudent,
      status: status,
      recordTime: timeString,
      isDuplicate: false,
    });

    syncToSupabase(matchedStudent, status, presensiMode, activeSubject);
  };

  // Sync to database
  const syncToSupabase = async (student: Student, status: 'Hadir' | 'Terlambat', mode: string, subject?: string) => {
    try {
      await supabase.from('qr_presensi_logs').insert([{
        student_id: student.id,
        student_name: student.name,
        nisn: student.nisn,
        kelas: student.kelas,
        mode: mode,
        status: status,
        subject: subject || null,
        scanned_at: new Date().toISOString(),
        academic_year: academicYear || '2025/2026'
      }]);
    } catch (e) {
      console.warn('Could not sync to cloud, stored locally:', e);
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
  const handleDeleteHistory = (id: string) => {
    showConfirm('Hapus catatan presensi ini dari daftar scan hari ini?').then((confirmed) => {
      if (confirmed) {
        setScanHistory(prev => prev.filter(item => item.id !== id));
      }
    });
  };

  // Clear all history
  const handleClearHistory = () => {
    showConfirm('Apakah Anda yakin ingin menghapus SELURUH riwayat scan presensi hari ini?').then((confirmed) => {
      if (confirmed) {
        setScanHistory([]);
        setLastScannedStudent(null);
      }
    });
  };

  // Filtered History
  const filteredHistory = scanHistory.filter(item => {
    const matchSearch = item.studentName.toLowerCase().includes(historySearch.toLowerCase()) || 
                        item.nisn.includes(historySearch) ||
                        item.kelas.toLowerCase().includes(historySearch.toLowerCase());
    const matchClass = !historyClassFilter || item.kelas === historyClassFilter;
    return matchSearch && matchClass;
  });

  // Export history to CSV (Admin Only)
  const exportToCSV = () => {
    if (!isAdmin) {
      showAlert('Fitur download/ekspor hasil presensi QR hanya tersedia untuk Admin.');
      return;
    }

    if (scanHistory.length === 0) {
      showAlert('Belum ada data scan untuk diekspor.');
      return;
    }

    const headers = ['No', 'NISN', 'Nama Siswa', 'Kelas', 'Waktu Scan', 'Kegiatan Presensi', 'Status'];
    const rows = scanHistory.map((item, idx) => [
      idx + 1,
      `'${item.nisn}`,
      `"${item.studentName}"`,
      item.kelas,
      new Date(item.timestamp).toLocaleString('id-ID'),
      item.mode === 'harian' ? 'Scan Masuk' : item.mode === 'dhuha' ? 'Sholat Dhuha' : item.mode === 'dzuhur' ? 'Sholat Dzuhur' : `Ekstra: ${item.subject || '-'}`,
      item.status,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Presensi_QR_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered Students for Card Printing
  const studentsForCards = students.filter(s => {
    const matchClass = !selectedCardClass || s.kelas === selectedCardClass;
    const matchSearch = !cardSearch || s.name.toLowerCase().includes(cardSearch.toLowerCase()) || (s.nisn && s.nisn.includes(cardSearch));
    return matchClass && matchSearch;
  });

  // Calculate statistics
  const totalScanned = scanHistory.length;
  const totalHadir = scanHistory.filter(i => i.status === 'Hadir').length;
  const totalTerlambat = scanHistory.filter(i => i.status === 'Terlambat').length;

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
            {/* Scanner UI for All Teachers & Admin */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Left Scanner & Controls (7 Cols) */}
                <div className="lg:col-span-7 space-y-6">
                  
                  {/* Activity Selector Card */}
                  <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-100 dark:border-slate-700 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-extrabold text-slate-800 dark:text-white text-sm flex items-center gap-2">
                        <Sparkles size={16} className="text-purple-600" />
                        Pilih Kegiatan Presensi
                      </h3>
                      <button
                        onClick={() => setSoundEnabled(!soundEnabled)}
                        className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
                          soundEnabled 
                            ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300' 
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                        }`}
                        title="Toggle suara scanner"
                      >
                        {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                        <span>{soundEnabled ? 'Suara ON' : 'Mute'}</span>
                      </button>
                    </div>

                    {/* Activity Buttons Grid (4 Modes: Harian, Dhuha, Dzuhur, Ekstra) */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <button
                        onClick={() => setPresensiMode('harian')}
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
                        onClick={() => setPresensiMode('dhuha')}
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
                        onClick={() => setPresensiMode('dzuhur')}
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
                        onClick={() => setPresensiMode('ekstra')}
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
                                type="button"
                                onClick={() => setSelectedEkstra(ekstra)}
                                className={`px-2.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                                  selectedEkstra === ekstra
                                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                                    : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                                }`}
                              >
                                <span className="truncate">{ekstra}</span>
                                {selectedEkstra === ekstra && <Check size={12} className="shrink-0 ml-1" />}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 text-xs font-medium text-amber-800 dark:text-amber-300 flex items-center gap-2">
                            <Lock size={16} className="shrink-0 text-amber-600" />
                            <span>Menu pilihan Ekstrakurikuler khusus untuk Guru yang telah ditunjuk/dikelola sebagai Pembina Ekstrakurikuler di Dashboard Admin.</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Camera Scanner Viewfinder */}
                  <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-100 dark:border-slate-700 shadow-sm relative space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${isScanning ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
                        <h3 className="font-extrabold text-slate-800 dark:text-white text-sm">
                          {isScanning ? `Kamera Aktif — Presensi ${getModeLabel(presensiMode, selectedEkstra)}` : 'Kamera Non-Aktif'}
                        </h3>
                      </div>

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

                    {/* Viewfinder Frame */}
                    <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-square max-w-sm mx-auto flex items-center justify-center border-2 border-purple-500/40">
                      <div id={scannerContainerId} className="w-full h-full object-cover"></div>

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
                          <div className="capitalize">Kegiatan: <span className="font-bold text-purple-700 dark:text-purple-300">{getModeLabel(presensiMode, selectedEkstra)}</span></div>
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
                            <div className="flex items-center gap-2.5">
                              <div className={`w-2 h-2 rounded-full ${item.status === 'Terlambat' ? 'bg-rose-500' : 'bg-emerald-500'}`}></div>
                              <div>
                                <div className="font-extrabold text-slate-800 dark:text-slate-100">{item.studentName}</div>
                                <div className="text-[10px] text-slate-500">Kelas {item.kelas} • NISN: {item.nisn}</div>
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
          </div>
        )}

        {/* TAB 2: HISTORY & LOGS */}
        {activeTab === 'history' && (
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm space-y-6">
            
            {/* Action Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-slate-800 dark:text-white">Daftar Scan Presensi Hari Ini</h3>
                <p className="text-xs text-slate-500">Total {scanHistory.length} data presensi recorded pada {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {/* Download CSV button ONLY shown for Admin */}
                {isAdmin && (
                  <button
                    onClick={exportToCSV}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <Download size={14} />
                    <span>Ekspor CSV</span>
                  </button>
                )}

                {isAdmin && scanHistory.length > 0 && (
                  <button
                    onClick={handleClearHistory}
                    className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 border border-rose-200 dark:border-rose-800"
                  >
                    <Trash2 size={14} />
                    <span>Reset Log Hari Ini</span>
                  </button>
                )}
              </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 dark:border-slate-700">
              <div className="relative sm:col-span-2">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama siswa atau NISN..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white"
                />
              </div>

              <div>
                <select
                  value={historyClassFilter}
                  onChange={(e) => setHistoryClassFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white"
                >
                  <option value="">Semua Kelas</option>
                  {classes.map(c => (
                    <option key={c} value={c}>Kelas {c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-3">No</th>
                    <th className="px-4 py-3">Waktu Scan</th>
                    <th className="px-4 py-3">NISN</th>
                    <th className="px-4 py-3">Nama Siswa</th>
                    <th className="px-4 py-3">Kelas</th>
                    <th className="px-4 py-3">Kegiatan Presensi</th>
                    <th className="px-4 py-3">Status</th>
                    {isAdmin && <th className="px-4 py-3 text-center">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {filteredHistory.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 8 : 7} className="px-4 py-8 text-center text-slate-400 italic">
                        Tidak ada catatan scan presensi yang cocok.
                      </td>
                    </tr>
                  ) : (
                    filteredHistory.map((item, index) => (
                      <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                        <td className="px-4 py-3 font-bold text-slate-500">{index + 1}</td>
                        <td className="px-4 py-3 font-mono font-medium text-slate-600 dark:text-slate-300">
                          {new Date(item.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-purple-700 dark:text-purple-300">{item.nisn}</td>
                        <td className="px-4 py-3 font-extrabold text-slate-900 dark:text-white">{item.studentName}</td>
                        <td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-300">Kelas {item.kelas}</td>
                        <td className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300">
                          {getModeLabel(item.mode, item.subject)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black ${
                            item.status === 'Terlambat'
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => handleDeleteHistory(item.id)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
                              title="Hapus"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
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

      </div>
    </Layout>
  );
}
