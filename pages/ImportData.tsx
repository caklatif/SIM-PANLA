
import React, { useState, useRef, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { createClient } from '@supabase/supabase-js';
import { Upload, FileText, CheckCircle, AlertCircle, Download, Users, Calendar, GraduationCap, X, KeyRound, ShieldAlert, Eye, EyeOff } from 'lucide-react';

const ImportData: React.FC = () => {
  const { academicYear, semester, activeScheduleVersion } = useAuth();
  const [activeTab, setActiveTab] = useState<'students' | 'teachers' | 'schedules'>('teachers');
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{type: 'success' | 'error', msg: string} | null>(null);
  
  // State khusus untuk pembuatan akun (Default true agar user sadar fitur ini)
  const [createAccounts, setCreateAccounts] = useState(true);
  const [targetYear, setTargetYear] = useState(academicYear || '2025/2026');
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [serviceRoleKey, setServiceRoleKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (academicYear && !targetYear) setTargetYear(academicYear);
    
    const fetchYears = async () => {
        const { data } = await supabase.from('app_settings').select('value').eq('key', 'available_years').single();
        if (data?.value) {
            try {
                setAvailableYears(JSON.parse(data.value));
            } catch(e) {
                setAvailableYears([data.value]);
            }
        }
    };
    fetchYears();
  }, [academicYear]);


  // Helper: Konversi Nama Hari ke Angka
  const getDayNumber = (dayName: string): number => {
      const d = String(dayName).trim().toLowerCase();
      if (d === 'senin') return 1;
      if (d === 'selasa') return 2;
      if (d === 'rabu') return 3;
      if (d === 'kamis') return 4;
      if (d === 'jumat') return 5;
      if (d === 'sabtu') return 6;
      if (d === 'minggu') return 7;
      return 0; // Invalid
  };

  // Helper: Parse Jam Range
  const parseHours = (hourStr: string | number): string[] => {
      const str = String(hourStr).trim();
      const result: Set<number> = new Set();
      const parts = str.split(',');
      parts.forEach(part => {
          const p = part.trim();
          if (p.includes('-')) {
              const [start, end] = p.split('-').map(Number);
              if (!isNaN(start) && !isNaN(end)) {
                  for (let i = start; i <= end; i++) result.add(i);
              }
          } else {
              const val = Number(p);
              if (!isNaN(val) && val > 0) result.add(val);
          }
      });
      return Array.from(result).sort((a, b) => a - b).map(String);
  };

  // Helper: Parse CSV Text to JSON
  const parseCSV = (text: string) => {
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length === 0) return [];

    // Deteksi delimiter (koma atau titik koma) berdasarkan baris pertama
    const firstLine = lines[0];
    const delimiter = firstLine.includes(';') ? ';' : ',';

    const headers = firstLine.split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));

    return lines.slice(1).map(line => {
      const values = line.split(delimiter).map(v => v.trim().replace(/^"|"$/g, ''));
      const row: any = {};
      headers.forEach((header, index) => {
        // Handle jika values kurang dari headers
        row[header] = values[index] || '';
      });
      return row;
    });
  };

  const downloadTemplate = () => {
    let csvContent = "";
    let filename = "";

    if (activeTab === 'teachers') {
        csvContent = "NIP;Nama Lengkap;Mata Pelajaran;Wali Kelas\n198001012010011001;Budi Santoso S.Pd;Matematika,IPA;7A\n199002022019032002;Siti Aminah S.Pd;Bahasa Indonesia;8B";
        filename = 'template_guru.csv';
    } else if (activeTab === 'students') {
        // UPDATE: Tambah L/P dan Jenjang
        csvContent = "NISN;NIS;Nama Lengkap;Kelas;L/P;Jenjang\n0012345678;1001;Ahmad Dahlan;7A;L;7\n0087654321;1002;Dewi Sartika;7B;P;7";
        filename = 'template_murid.csv';
    } else if (activeTab === 'schedules') {
        csvContent = "Hari;Jam Ke;Kelas;Mapel;NIP Guru\nSenin;1-2;7A;Matematika;198001012010011001\nSenin;3-4;7A;IPA;198001012010011001\nSelasa;1-3;8B;Bahasa Indonesia;199002022019032002";
        filename = 'template_jadwal.csv';
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
        setFile(selectedFile);
        setStatus(null);
        
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const text = evt.target?.result as string;
                const data = parseCSV(text);
                if (data.length === 0) {
                    setStatus({ type: 'error', msg: 'File CSV kosong atau format salah.' });
                } else {
                    setPreviewData(data);
                }
            } catch (err) {
                setStatus({ type: 'error', msg: 'Gagal membaca file CSV.' });
            }
        };
        reader.readAsText(selectedFile);
    }
  };

  const handleProcessImport = async () => {
    if (!previewData.length) return;
    
    // Validasi Service Key jika createAccounts aktif
    if (activeTab === 'teachers' && createAccounts && (!serviceRoleKey || serviceRoleKey.length < 20)) {
        setStatus({ type: 'error', msg: 'Harap masukkan Service Role Key untuk membuat akun login otomatis.' });
        return;
    }

    setLoading(true);
    setStatus(null);
    let successCount = 0;

    try {
        if (activeTab === 'students') {
            const studentsToInsert = previewData.map((row: any) => ({
                academic_year: targetYear || academicYear || '2025/2026',
                nisn: String(row['NISN'] || row['nisn']),
                nis: String(row['NIS'] || row['nis']),
                name: row['Nama Lengkap'] || row['nama'] || row['Nama'],
                kelas: row['Kelas'] || row['kelas'],
                gender: row['L/P'] || row['l/p'] || row['Gender'] || row['gender'], // Mapping kolom L/P
                jenjang: row['Jenjang'] || row['jenjang'] // Mapping kolom Jenjang
            })).filter(s => s.nisn && s.name && s.kelas);

            if (studentsToInsert.length > 0) {
                // Deduplicate items based on academic_year and nisn
                const uniqueStudentsMap = new Map();
                for (const s of studentsToInsert) {
                    uniqueStudentsMap.set(`${s.academic_year}_${s.nisn}`, s);
                }
                const uniqueStudents = Array.from(uniqueStudentsMap.values());

                const { error: upsertErr } = await supabase.from('students').upsert(uniqueStudents, { onConflict: 'academic_year,nisn' });
                if (upsertErr) throw upsertErr;
                
                successCount = uniqueStudents.length;
            }

        } else if (activeTab === 'teachers') {
            // 1. Setup Admin Client jika opsi Create Account dipilih
            let adminClient = null;
            if (createAccounts) {
                const SUPABASE_URL = 'https://oqdnfhkzneqhvktjqiqe.supabase.co'; 
                adminClient = createClient(SUPABASE_URL, serviceRoleKey, {
                    auth: {
                        autoRefreshToken: false,
                        persistSession: false
                    }
                });
            }

            // 2. Persiapkan Data
            const teachersData = previewData.map((row: any) => ({
                nip: String(row['NIP'] || row['nip']),
                nama_lengkap: row['Nama Lengkap'] || row['nama'] || row['Nama'],
                mapel: row['Mata Pelajaran'] || row['mapel'] || row['Mapel'],
                wali_kelas: row['Wali Kelas'] || row['wali'] || row['Wali']
            })).filter(t => t.nip && t.nama_lengkap);

            let accountCreatedCount = 0;

            // 3. Loop Proses
            for (const t of teachersData) {
                // A. Insert ke tabel_guru (Master Data)
                const { error: guruError } = await supabase.from('tabel_guru').upsert(t, { onConflict: 'nip' });
                if (guruError) console.error("Error upsert tabel_guru", guruError);
                else successCount++;

                // B. Buat Akun Login & Profil (Jika diaktifkan)
                if (createAccounts && adminClient) {
                    try {
                        const email = `${t.nip}@sekolah.id`;
                        const password = 'spanla';
                        
                        // Create Auth User
                        const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
                            email: email,
                            password: password,
                            email_confirm: true,
                            user_metadata: { full_name: t.nama_lengkap }
                        });

                        let userId = authData.user?.id;

                        // Jika user sudah ada (Error: User already registered)
                        if (authError && authError.message.includes('already registered')) {
                             // Coba cari profile yang sudah ada berdasarkan NIP
                             const { data: existProfile } = await supabase.from('profiles').select('id').eq('nip', t.nip).single();
                             userId = existProfile?.id;
                             
                             if (!userId) {
                                 const { data: listUsers } = await adminClient.auth.admin.listUsers();
                                 const foundUser = listUsers.users.find(u => u.email === email);
                                 if (foundUser) userId = foundUser.id;
                             }
                        }

                        // Upsert Profile
                        if (userId) {
                            await supabase.from('profiles').upsert({
                                id: userId,
                                nip: t.nip,
                                full_name: t.nama_lengkap,
                                role: 'user',
                                mengajar_mapel: t.mapel,
                                wali_kelas: t.wali_kelas
                            });
                            accountCreatedCount++;
                        }
                    } catch (accErr) {
                        console.error(`Gagal buat akun untuk ${t.nip}`, accErr);
                    }
                }
            }

            if (createAccounts && successCount > 0) {
                 setStatus({ type: 'success', msg: `Berhasil! ${successCount} data guru disimpan & ${accountCreatedCount} akun login disinkronkan.` });
                 setLoading(false);
                 setFile(null);
                 setPreviewData([]);
                 if (fileInputRef.current) fileInputRef.current.value = "";
                 return; 
            }

        } else if (activeTab === 'schedules') {
            const schedulesToInsert = [];
            
            for (const row of previewData) {
                const nip = String(row['NIP Guru'] || row['nip guru'] || row['NIP'] || '');
                const rawDay = row['Hari'] || row['hari'];
                const rawHour = row['Jam Ke'] || row['jam ke'] || row['jam'];
                const kelas = String(row['Kelas'] || row['kelas']);
                const mapel = row['Mapel'] || row['mapel'] || row['Mata Pelajaran'];
                
                let dayNum = 0;
                if (typeof rawDay === 'number') dayNum = rawDay;
                else dayNum = getDayNumber(rawDay);

                if (dayNum === 0) continue;

                const hoursArray = parseHours(rawHour);
                const hourString = hoursArray.join(', ');

                // Cari ID Guru dari profiles
                let teacherId = null;
                if (nip) {
                    const { data: t } = await supabase.from('profiles').select('id').eq('nip', nip).single();
                    if(t) teacherId = t.id;
                }

                if (hourString) {
                    schedulesToInsert.push({
                        day_of_week: dayNum,
                        hour: hourString,
                        kelas: kelas,
                        subject: mapel,
                        teacher_nip: nip,
                        teacher_id: teacherId,
                        academic_year: targetYear || academicYear || '2025/2026',
                        semester: semester || 'Ganjil',
                        schedule_version: activeScheduleVersion || 'Utama',
                        
                        
                    });
                }
            }
            
             if (schedulesToInsert.length > 0) {
                const { error } = await supabase.from('schedules').insert(schedulesToInsert);
                if (error) throw error;
                successCount = schedulesToInsert.length;
            }
        }

        setStatus({ type: 'success', msg: `Berhasil! ${successCount} data telah tersimpan di Database.` });
        setFile(null);
        setPreviewData([]);
        if (fileInputRef.current) fileInputRef.current.value = "";

    } catch (err: any) {
        setStatus({ type: 'error', msg: err.message || 'Gagal import data.' });
    } finally {
        setLoading(false);
    }
  };

  const handleClear = () => {
      setFile(null);
      setPreviewData([]);
      setStatus(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <FileText className="text-green-600" /> Import Database CSV
                </h2>
                <p className="text-gray-500 text-sm">Upload file CSV (Comma/Semicolon Separated) untuk mengisi data sekolah.</p>
            </div>
            <button 
                onClick={downloadTemplate}
                className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg hover:shadow-green-500/30 transition-all"
            >
                <Download size={18} /> Download Template CSV
            </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b overflow-x-auto bg-gray-50">
                <button 
                    onClick={() => { setActiveTab('teachers'); handleClear(); }}
                    className={`flex-1 min-w-[120px] py-4 text-center font-medium transition-colors flex items-center justify-center gap-2 ${activeTab === 'teachers' ? 'bg-white text-purple-600 border-t-2 border-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <Users size={18} /> Data Guru
                </button>
                <button 
                    onClick={() => { setActiveTab('students'); handleClear(); }}
                    className={`flex-1 min-w-[120px] py-4 text-center font-medium transition-colors flex items-center justify-center gap-2 ${activeTab === 'students' ? 'bg-white text-purple-600 border-t-2 border-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <GraduationCap size={18} /> Data Murid
                </button>
                <button 
                    onClick={() => { setActiveTab('schedules'); handleClear(); }}
                    className={`flex-1 min-w-[120px] py-4 text-center font-medium transition-colors flex items-center justify-center gap-2 ${activeTab === 'schedules' ? 'bg-white text-purple-600 border-t-2 border-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <Calendar size={18} /> Jadwal Pelajaran
                </button>
            </div>

            <div className="p-8">
                
                        {activeTab !== 'teachers' && (
                            <div className="mb-6 bg-purple-50 border border-purple-200 p-4 rounded-xl">
                                <label className="block text-xs font-bold text-purple-800 mb-2">Tahun Ajaran Tujuan Data (Penting):</label>
                                <select 
                                    className="w-full border border-purple-300 rounded-lg p-2 text-sm bg-white focus:ring-2 focus:ring-purple-500"
                                    value={targetYear}
                                    onChange={(e) => setTargetYear(e.target.value)}
                                >
                                    {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                                    {availableYears.length === 0 && <option value={academicYear || '2025/2026'}>{academicYear || '2025/2026'}</option>}
                                </select>
                            </div>
                        )}

                {/* OPSI BUAT AKUN GURU (DITARUH SEBELUM UPLOAD FILE AGAR TERLIHAT) */}
                {activeTab === 'teachers' && (<div className="mb-6 bg-orange-50 border border-orange-200 p-4 rounded-xl space-y-3">
                        <div className="flex items-center gap-2">
                            <input 
                                type="checkbox" 
                                id="createAcc"
                                checked={createAccounts}
                                onChange={(e) => setCreateAccounts(e.target.checked)}
                                className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500"
                            />
                            <label htmlFor="createAcc" className="font-bold text-orange-800 text-sm cursor-pointer select-none">
                                Sinkronisasi ke Authentication (Buat Akun Login)
                            </label>
                        </div>
                        <p className="text-xs text-orange-700 ml-7">
                            Sistem akan membuatkan akun login: <strong>NIP@sekolah.id</strong> dengan password <strong>spanla</strong>.
                        </p>

                        {createAccounts && (
                            <div className="animate-fade-in pl-7 space-y-2">
                                <label className="block text-xs font-bold text-orange-800">Masukkan Service Role Key (Wajib untuk Admin):</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <KeyRound className="h-4 w-4 text-orange-400" />
                                    </div>
                                    <input 
                                        type={showKey ? "text" : "password"}
                                        value={serviceRoleKey}
                                        onChange={(e) => setServiceRoleKey(e.target.value)}
                                        placeholder="Paste Supabase Service Role Key (secret) disini..."
                                        className="w-full pl-9 pr-10 py-2 text-xs border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-mono"
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => setShowKey(!showKey)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-orange-400 hover:text-orange-600"
                                    >
                                        {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                                <div className="flex gap-2 items-start text-[10px] text-orange-600 bg-orange-100 p-2 rounded">
                                    <ShieldAlert size={14} className="mt-0.5 flex-shrink-0" />
                                    <p>Key ini diperlukan untuk akses Admin API (bypass RLS) saat membuat user baru. Tidak disimpan di database.</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div className="mb-6 bg-yellow-50 border border-yellow-200 p-4 rounded-xl flex gap-3 text-sm text-yellow-800">
                    <FileText className="flex-shrink-0 mt-1" />
                    <div>
                        <p className="font-bold">Tips Pengisian CSV:</p>
                        <ul className="list-disc ml-4 mt-1 space-y-1">
                            <li>Gunakan <strong>Titik Koma (;)</strong> atau <strong>Koma (,)</strong> sebagai pemisah.</li>
                            {activeTab === 'teachers' && <li>Format: NIP;Nama;Mapel;Wali</li>}
                            {activeTab === 'students' && <li>Format: NISN;NIS;Nama;Kelas;L/P;Jenjang</li>}
                            {activeTab === 'schedules' && <li>Format: Hari;Jam;Kelas;Mapel;NIP Guru</li>}
                        </ul>
                    </div>
                </div>

                {!file ? (
                    <div 
                        className="border-2 border-dashed border-gray-300 rounded-2xl p-10 text-center hover:bg-purple-50 hover:border-purple-400 transition-colors cursor-pointer group"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                            <Upload className="text-purple-600" size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-700">Klik untuk Upload File CSV</h3>
                        <p className="text-gray-500 text-sm mt-1">Format: .csv (Comma/Semicolon Separated)</p>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileChange} 
                            accept=".csv, .txt" 
                            className="hidden" 
                        />
                    </div>
                ) : (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex items-center justify-between bg-purple-50 p-4 rounded-xl border border-purple-100">
                            <div className="flex items-center gap-3">
                                <FileText className="text-green-600" size={32} />
                                <div>
                                    <p className="font-bold text-gray-800">{file.name}</p>
                                    <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB • {previewData.length} Baris Data</p>
                                </div>
                            </div>
                            <button onClick={handleClear} className="p-2 hover:bg-purple-100 rounded-full text-gray-500">
                                <X size={20} />
                            </button>
                        </div>

                        {previewData.length > 0 && (
                            <div className="bg-gray-50 rounded-xl p-4 max-h-60 overflow-y-auto text-xs border border-gray-200">
                                <p className="font-bold mb-2 text-gray-500 sticky top-0">Preview Data (5 Baris Pertama):</p>
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-gray-300">
                                            {Object.keys(previewData[0]).slice(0, 5).map(key => (
                                                <th key={key} className="py-1 px-2 text-gray-600">{key}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {previewData.slice(0, 5).map((row, idx) => (
                                            <tr key={idx} className="border-b border-gray-200">
                                                {Object.values(row).slice(0, 5).map((val: any, i) => (
                                                    <td key={i} className="py-1 px-2">{val}</td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <button 
                            onClick={handleProcessImport}
                            disabled={loading}
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 transition-all"
                        >
                            {loading ? 'Sedang Memproses...' : 'Simpan ke Database'}
                        </button>
                    </div>
                )}

                {status && (
                    <div className={`mt-6 p-4 rounded-xl flex items-start gap-3 text-sm font-medium animate-fade-in ${status.type === 'success' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                        {status.type === 'success' ? <CheckCircle size={20} className="mt-0.5" /> : <AlertCircle size={20} className="mt-0.5" />}
                        <span className="leading-relaxed">{status.msg}</span>
                    </div>
                )}
            </div>
        </div>
      </div>
    </Layout>
  );
};

export default ImportData;