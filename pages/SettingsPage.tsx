
import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { supabase } from '../services/supabase';
import { Settings, Save, Plus, Trash2, Calendar, Loader2, Info, Clock, CheckSquare, Square, User, BookOpen, AlertCircle, Sparkles, Gavel } from 'lucide-react';
import { AppSetting, NonEffectiveDay, Profile } from '../types';
import { showAlert, showConfirm } from '../utils/alert';

const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<Record<string, string>>({
    academic_year: '',
    semester: 'Ganjil',
    headmaster: '',
    headmaster_nip: '',
    late_time_limit: '07:15'
  });
  const [nonEffectiveDays, setNonEffectiveDays] = useState<NonEffectiveDay[]>([]);
  const [availableYears, setAvailableYears] = useState<string[]>(['2025/2026']);
  const [teachers, setTeachers] = useState<Profile[]>([]); // List Guru for Dropdown
  
  // Master Lists
  const [subjectsList, setSubjectsList] = useState<string[]>([]);
  const [disciplineTypes, setDisciplineTypes] = useState<string[]>([]);
  const [followUpTypes, setFollowUpTypes] = useState<string[]>([]); // New: Tindak Lanjut
  const [activityTypes, setActivityTypes] = useState<string[]>([]);

  // Input States
  const [newSubject, setNewSubject] = useState('');
  const [newDiscipline, setNewDiscipline] = useState('');
  const [newFollowUp, setNewFollowUp] = useState(''); // New Input
  const [newActivity, setNewActivity] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // New Day Input State
  const [newDay, setNewDay] = useState({ date: '', reason: '' });
  
  // Hours Selection State
  const [isFullDay, setIsFullDay] = useState(true);
  const [selectedHours, setSelectedHours] = useState<string[]>([]);

  useEffect(() => {
    const initData = async () => {
        setLoading(true);
        await Promise.all([fetchSettings(), fetchTeachers()]);
        setLoading(false);
    };
    initData();
  }, []);

  const fetchTeachers = async () => {
      try {
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .neq('nip', null)
            .order('full_name');
          if (data) setTeachers(data);
      } catch (err) {
          console.error("Gagal load data guru", err);
      }
  };

  const fetchSettings = async () => {
    try {
        const { data, error } = await supabase.from('app_settings').select('*');
        if (error) throw error;
        
        const settingsMap: Record<string, string> = {};
        let days: NonEffectiveDay[] = [];
        let subs: string[] = [];
        let disc: string[] = [];
        let follow: string[] = [];
        let act: string[] = [];

        if (data) {
            data.forEach(item => {
                if (item.key === 'non_effective_days') {
                    try { days = item.value ? JSON.parse(item.value) : []; } catch (e) { days = []; }
                } else if (item.key === 'subjects_list') {
                     try { subs = item.value ? JSON.parse(item.value) : []; } catch (e) { subs = []; }
                } else if (item.key === 'discipline_types') {
                     try { disc = item.value ? JSON.parse(item.value) : []; } catch (e) { disc = []; }
                } else if (item.key === 'follow_up_types') {
                     try { follow = item.value ? JSON.parse(item.value) : []; } catch (e) { follow = []; }
                } else if (item.key === 'activity_types') {
                     try { act = item.value ? JSON.parse(item.value) : []; } catch (e) { act = []; }
                } else {
                    settingsMap[item.key] = item.value || '';
                }
            });
        }

        // Merge with existing state
        setSettings(prev => ({ ...prev, ...settingsMap }));
        setNonEffectiveDays(days);
        setSubjectsList(subs);
        setDisciplineTypes(disc);
        setFollowUpTypes(follow);
        setActivityTypes(act);
    } catch (err: any) {
        console.error("Error fetching settings:", err.message);
    }
  };

  const handleHeadmasterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const selectedNip = e.target.value;
      const selectedTeacher = teachers.find(t => t.nip === selectedNip);
      
      if (selectedTeacher) {
          setSettings(prev => ({
              ...prev,
              headmaster: selectedTeacher.full_name,
              headmaster_nip: selectedTeacher.nip
          }));
      } else {
          setSettings(prev => ({ ...prev, headmaster: '', headmaster_nip: '' }));
      }
  };

  // HELPER LIST MANAGEMENT
  const addToList = (item: string, list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, setInput: React.Dispatch<React.SetStateAction<string>>) => {
      if(item.trim() && !list.includes(item.trim())) {
          setList([...list, item.trim()].sort());
          setInput('');
      }
  };

  const removeFromList = async (item: string, list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>) => {
      if(await showConfirm(`Hapus item "${item}"?`)) {
          setList(prev => prev.filter(s => s !== item));
      }
  };

  const handleSaveGeneral = async () => {
      setSaving(true);
      try {
          // Upsert general settings
          const updates = Object.entries(settings).map(([key, value]) => ({
              key, value
          }));

          // Add Lists
          updates.push({ key: 'subjects_list', value: JSON.stringify(subjectsList) });
          updates.push({ key: 'discipline_types', value: JSON.stringify(disciplineTypes) });
          updates.push({ key: 'follow_up_types', value: JSON.stringify(followUpTypes) });
          updates.push({ key: 'activity_types', value: JSON.stringify(activityTypes) });

          const { error } = await supabase.from('app_settings').upsert(updates);
          if (error) throw error;
          
          showAlert("Pengaturan umum & data master berhasil disimpan!");
      } catch (err: any) {
          showAlert("Gagal menyimpan: " + (err.message || err));
      } finally {
          setSaving(false);
      }
  };

  // HOLIDAY MANAGEMENT
  const toggleHour = (h: number) => {
      const val = String(h);
      setSelectedHours(prev => 
          prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]
      );
  };

  const handleAddDay = () => {
      if (!newDay.date || !newDay.reason) {
          showAlert("Tanggal dan Keterangan wajib diisi.");
          return;
      }
      if (!isFullDay && selectedHours.length === 0) {
          showAlert("Pilih minimal satu jam jika bukan Full Day.");
          return;
      }
      const hoursString = isFullDay 
        ? "Full Day" 
        : selectedHours.sort((a,b) => Number(a) - Number(b)).join(', ');

      const dayToAdd: NonEffectiveDay = {
          date: newDay.date,
          reason: newDay.reason,
          hours: hoursString
      };

      const updatedDays = [...nonEffectiveDays, dayToAdd];
      setNonEffectiveDays(updatedDays);
      setNewDay({ date: '', reason: '' });
      setIsFullDay(true);
      setSelectedHours([]);
      saveDays(updatedDays);
  };

  const handleDeleteDay = (idx: number) => {
      const updatedDays = nonEffectiveDays.filter((_, i) => i !== idx);
      setNonEffectiveDays(updatedDays);
      saveDays(updatedDays);
  };

  const saveDays = async (days: NonEffectiveDay[]) => {
      try {
          const { error } = await supabase.from('app_settings').upsert({
              key: 'non_effective_days',
              value: JSON.stringify(days)
          });
          if (error) throw error;
      } catch (err: any) {
          showAlert("Gagal menyimpan hari libur: " + (err.message || "Unknown error"));
      }
  };

  if (loading) return <Layout><div className="flex justify-center p-10"><Loader2 className="animate-spin"/></div></Layout>;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3 mb-6">
            <div className="bg-gray-800 p-3 rounded-2xl text-white">
                <Settings size={28} />
            </div>
            <div>
                <h2 className="text-2xl font-bold text-gray-800">Pengaturan Aplikasi</h2>
                <p className="text-gray-500 text-sm">Konfigurasi tahun ajaran, kepala sekolah, dan data master.</p>
            </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
            {/* KOLOM KIRI: UMUM & MAPEL */}
            <div className="space-y-6">
                {/* SETTING UMUM */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <Info size={18} className="text-purple-500"/> Informasi Sekolah
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Tahun Ajaran</label>
                            
                            <input 
                                className="w-full border rounded-lg p-3 font-medium bg-gray-100 text-gray-500 cursor-not-allowed" 
                                value={settings['academic_year'] || ''}
                                readOnly
                            />
                            <p className="text-[10px] text-gray-400 mt-1">* Diatur dari menu Penyimpanan</p>
    
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Semester</label>
                            <select 
                                className="w-full border rounded-lg p-3 bg-gray-100 text-gray-500 cursor-not-allowed"
                                value={settings['semester'] || 'Ganjil'}
                                disabled
                            >
                                <option value="Ganjil">Ganjil</option>
                                <option value="Genap">Genap</option>
                            </select>
                            <p className="text-[10px] text-gray-400 mt-1">* Diatur dari menu Penyimpanan</p>
                        </div>
                        
                        <div className="bg-purple-50 p-3 rounded-xl border border-purple-100">
                            <label className="block text-xs font-bold text-purple-800 mb-1">Kepala Sekolah</label>
                            <div className="relative">
                                <User className="absolute left-3 top-3.5 text-purple-400" size={16}/>
                                <select 
                                    className="w-full border border-purple-200 rounded-lg p-3 pl-9 font-medium bg-white focus:ring-2 focus:ring-purple-500 outline-none" 
                                    value={settings['headmaster_nip'] || ''}
                                    onChange={handleHeadmasterChange}
                                >
                                    <option value="">-- Pilih Kepala Sekolah --</option>
                                    {teachers.map(t => (
                                        <option key={t.id} value={t.nip}>{t.full_name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                                <span className="text-[10px] font-bold text-gray-500 bg-white px-2 py-1 rounded border">NIP</span>
                                <input 
                                    type="text" 
                                    readOnly
                                    className="flex-1 bg-transparent border-none text-xs text-gray-600 font-mono focus:ring-0 p-0"
                                    value={settings['headmaster_nip'] || '-'}
                                    placeholder="NIP otomatis..."
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* PENGATURAN JAM PRESENSI & KETERLAMBATAN */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                        <Clock size={18} className="text-amber-500"/> Pengaturan Jam Keterlambatan (Presensi QR)
                    </h3>
                    <p className="text-xs text-gray-500 mb-4">
                        Tentukan batas waktu siswa scan masuk pagi. Siswa yang memindai kartu setelah jam ini otomatis berstatus <strong>Terlambat</strong>.
                    </p>

                    <div className="space-y-4">
                        <div className="bg-amber-50/80 p-4 rounded-xl border border-amber-200/70 space-y-3">
                            <label className="block text-xs font-bold text-amber-900">Ketik Jam & Menit Manual (Batas Masuk Tepat Waktu)</label>
                            
                            <div className="flex flex-wrap items-center gap-3">
                                {/* Jam Input */}
                                <div className="flex items-center gap-1">
                                    <input 
                                        type="number"
                                        min="0"
                                        max="23"
                                        placeholder="07"
                                        className="w-16 text-center bg-white border-2 border-amber-300 rounded-xl py-2 text-xl font-mono font-black text-slate-800 focus:ring-2 focus:ring-amber-500 outline-none shadow-sm"
                                        value={(settings['late_time_limit'] || '07:15').split(':')[0] || '07'}
                                        onChange={e => {
                                            let val = parseInt(e.target.value || '0', 10);
                                            if (isNaN(val)) val = 0;
                                            if (val < 0) val = 0;
                                            if (val > 23) val = 23;
                                            const normH = String(val).padStart(2, '0');
                                            const m = (settings['late_time_limit'] || '07:15').split(':')[1] || '15';
                                            setSettings(prev => ({ ...prev, late_time_limit: `${normH}:${m}` }));
                                        }}
                                    />
                                    <span className="text-xl font-bold font-mono text-amber-600">:</span>
                                    {/* Menit Input */}
                                    <input 
                                        type="number"
                                        min="0"
                                        max="59"
                                        placeholder="15"
                                        className="w-16 text-center bg-white border-2 border-amber-300 rounded-xl py-2 text-xl font-mono font-black text-slate-800 focus:ring-2 focus:ring-amber-500 outline-none shadow-sm"
                                        value={(settings['late_time_limit'] || '07:15').split(':')[1] || '15'}
                                        onChange={e => {
                                            let val = parseInt(e.target.value || '0', 10);
                                            if (isNaN(val)) val = 0;
                                            if (val < 0) val = 0;
                                            if (val > 59) val = 59;
                                            const normM = String(val).padStart(2, '0');
                                            const h = (settings['late_time_limit'] || '07:15').split(':')[0] || '07';
                                            setSettings(prev => ({ ...prev, late_time_limit: `${h}:${normM}` }));
                                        }}
                                    />
                                </div>

                                <div className="text-xs text-amber-800 font-bold">
                                    WIB <span className="text-slate-500 text-[10px] block font-normal">(Format 24 Jam)</span>
                                </div>
                            </div>

                            {/* Preset Buttons */}
                            <div className="pt-2 border-t border-amber-200/60">
                                <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block mb-1.5">Pilihan Cepat Waktu Masuk:</span>
                                <div className="flex flex-wrap gap-1.5">
                                    {['06:30', '06:45', '07:00', '07:10', '07:15', '07:20', '07:30', '07:45', '08:00'].map(timePreset => (
                                        <button
                                            type="button"
                                            key={timePreset}
                                            onClick={() => setSettings(prev => ({ ...prev, late_time_limit: timePreset }))}
                                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                                                (settings['late_time_limit'] || '07:15') === timePreset
                                                    ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                                                    : 'bg-white text-slate-700 border-amber-200 hover:bg-amber-100'
                                            }`}
                                        >
                                            {timePreset}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1 text-slate-600">
                            <div className="font-bold text-slate-700 flex items-center gap-1.5">
                                <Info size={14} className="text-blue-500"/>
                                <span>Simulasi Status Presensi:</span>
                            </div>
                            <div className="pl-5 text-[11px]">
                                • Scan $\le$ <strong>{settings['late_time_limit'] || '07:15'}</strong>: <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">Hadir Tepat Waktu</span>
                            </div>
                            <div className="pl-5 text-[11px]">
                                • Scan &gt; <strong>{settings['late_time_limit'] || '07:15'}</strong>: <span className="text-rose-700 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">Terlambat</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* MASTER MAPEL */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                     <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <BookOpen size={18} className="text-purple-500"/> Input Mata Pelajaran
                    </h3>
                    <div className="space-y-4">
                        <div className="flex gap-2">
                             <input 
                                className="flex-1 border rounded-lg p-2.5 text-sm" 
                                value={newSubject}
                                onChange={e => setNewSubject(e.target.value)}
                                placeholder="Tambah Mapel Baru..."
                                onKeyDown={e => e.key === 'Enter' && addToList(newSubject, subjectsList, setSubjectsList, setNewSubject)}
                             />
                             <button 
                                onClick={() => addToList(newSubject, subjectsList, setSubjectsList, setNewSubject)}
                                className="bg-purple-600 text-white px-3 rounded-lg hover:bg-purple-700"
                             >
                                 <Plus size={18} />
                             </button>
                        </div>
                        <div className="flex flex-wrap gap-2 max-h-[150px] overflow-y-auto p-1 custom-scrollbar">
                            {subjectsList.length === 0 ? <p className="text-gray-400 text-xs italic">Belum ada mapel diinput.</p> :
                             subjectsList.map((sub, idx) => (
                                <div key={idx} className="bg-purple-50 text-purple-700 px-2 py-1 rounded-md text-xs font-bold border border-purple-100 flex items-center gap-1 group">
                                    {sub}
                                    <button onClick={() => removeFromList(sub, subjectsList, setSubjectsList)} className="text-purple-400 hover:text-red-500"><Trash2 size={12}/></button>
                                </div>
                             ))
                            }
                        </div>
                    </div>
                </div>
            </div>

            {/* KOLOM KANAN: HARI NON EFEKTIF & CATATAN JURNAL */}
            <div className="space-y-6">
                 
                 {/* MASTER JENIS CATATAN */}
                 <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <Sparkles size={18} className="text-orange-500"/> Master Jurnal Catatan
                    </h3>
                    <div className="space-y-5">
                        
                        {/* Kedisiplinan */}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-2">Jenis Kedisiplinan (Pelanggaran)</label>
                            <div className="flex gap-2 mb-2">
                                <input 
                                    className="flex-1 border rounded-lg p-2 text-xs" 
                                    value={newDiscipline}
                                    onChange={e => setNewDiscipline(e.target.value)}
                                    placeholder="Contoh: Terlambat, Tidur..."
                                    onKeyDown={e => e.key === 'Enter' && addToList(newDiscipline, disciplineTypes, setDisciplineTypes, setNewDiscipline)}
                                />
                                <button onClick={() => addToList(newDiscipline, disciplineTypes, setDisciplineTypes, setNewDiscipline)} className="bg-orange-500 text-white px-2 rounded-lg"><Plus size={16}/></button>
                            </div>
                            <div className="flex flex-wrap gap-1.5 mb-4">
                                {disciplineTypes.map((item, idx) => (
                                    <span key={idx} className="bg-orange-50 text-orange-700 px-2 py-0.5 rounded text-[10px] font-bold border border-orange-100 flex items-center gap-1">
                                        {item}
                                        <button onClick={() => removeFromList(item, disciplineTypes, setDisciplineTypes)} className="hover:text-red-500"><Trash2 size={10}/></button>
                                    </span>
                                ))}
                            </div>
                        </div>
                        
                        {/* Tindak Lanjut */}
                        <div className="border-t border-dashed border-gray-200 pt-3">
                            <label className="block text-xs font-bold text-gray-500 mb-2 flex items-center gap-1"><Gavel size={12}/> Jenis Tindak Lanjut (Kedisiplinan)</label>
                            <div className="flex gap-2 mb-2">
                                <input 
                                    className="flex-1 border rounded-lg p-2 text-xs" 
                                    value={newFollowUp}
                                    onChange={e => setNewFollowUp(e.target.value)}
                                    placeholder="Contoh: Teguran Lisan..."
                                    onKeyDown={e => e.key === 'Enter' && addToList(newFollowUp, followUpTypes, setFollowUpTypes, setNewFollowUp)}
                                />
                                <button onClick={() => addToList(newFollowUp, followUpTypes, setFollowUpTypes, setNewFollowUp)} className="bg-red-500 text-white px-2 rounded-lg"><Plus size={16}/></button>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {followUpTypes.map((item, idx) => (
                                    <span key={idx} className="bg-red-50 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold border border-red-100 flex items-center gap-1">
                                        {item}
                                        <button onClick={() => removeFromList(item, followUpTypes, setFollowUpTypes)} className="hover:text-red-500"><Trash2 size={10}/></button>
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Keaktifan */}
                        <div className="border-t border-dashed border-gray-200 pt-3">
                            <label className="block text-xs font-bold text-gray-500 mb-2">Jenis Keaktifan (Prestasi/Aktif)</label>
                            <div className="flex gap-2 mb-2">
                                <input 
                                    className="flex-1 border rounded-lg p-2 text-xs" 
                                    value={newActivity}
                                    onChange={e => setNewActivity(e.target.value)}
                                    placeholder="Contoh: Bertanya, Presentasi..."
                                    onKeyDown={e => e.key === 'Enter' && addToList(newActivity, activityTypes, setActivityTypes, setNewActivity)}
                                />
                                <button onClick={() => addToList(newActivity, activityTypes, setActivityTypes, setNewActivity)} className="bg-green-500 text-white px-2 rounded-lg"><Plus size={16}/></button>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {activityTypes.map((item, idx) => (
                                    <span key={idx} className="bg-green-50 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold border border-green-100 flex items-center gap-1">
                                        {item}
                                        <button onClick={() => removeFromList(item, activityTypes, setActivityTypes)} className="hover:text-red-500"><Trash2 size={10}/></button>
                                    </span>
                                ))}
                            </div>
                        </div>

                    </div>
                 </div>

                 <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <Calendar size={18} className="text-red-500"/> Hari Non-Efektif
                    </h3>
                    
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-4 space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 mb-1">Tanggal</label>
                                <input 
                                    type="date" 
                                    className="w-full border rounded-lg p-2 text-sm"
                                    value={newDay.date}
                                    onChange={e => setNewDay({...newDay, date: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 mb-1">Keterangan</label>
                                <input 
                                    type="text" 
                                    className="w-full border rounded-lg p-2 text-sm"
                                    placeholder="Contoh: Rapat Dinas"
                                    value={newDay.reason}
                                    onChange={e => setNewDay({...newDay, reason: e.target.value})}
                                />
                            </div>
                        </div>

                        <div>
                             <div className="flex items-center gap-2 mb-2 cursor-pointer" onClick={() => setIsFullDay(!isFullDay)}>
                                 {isFullDay ? <CheckSquare size={18} className="text-purple-600"/> : <Square size={18} className="text-gray-400"/>}
                                 <label className="text-sm font-bold text-gray-700 cursor-pointer select-none">Libur Seharian (Full Day)</label>
                             </div>
                             {!isFullDay && (
                                 <div className="animate-fade-in p-3 bg-gray-100 rounded-xl border border-gray-200">
                                     <label className="block text-[10px] font-bold text-gray-500 mb-2">Pilih Jam yang Diliburkan:</label>
                                     <div className="flex flex-wrap gap-2">
                                         {[1,2,3,4,5,6,7,8,9,10].map(h => (
                                             <button
                                                 key={h}
                                                 onClick={() => toggleHour(h)}
                                                 className={`w-8 h-8 rounded-lg text-xs font-bold transition-all border ${
                                                     selectedHours.includes(String(h))
                                                     ? 'bg-red-500 text-white border-red-500 shadow-sm'
                                                     : 'bg-white text-gray-600 border-gray-300 hover:border-red-300'
                                                 }`}
                                             >
                                                 {h}
                                             </button>
                                         ))}
                                     </div>
                                 </div>
                             )}
                        </div>

                        <button 
                           onClick={handleAddDay}
                           className="w-full bg-green-600 text-white p-2.5 rounded-xl hover:bg-green-700 font-bold flex items-center justify-center gap-2"
                        >
                            <Plus size={18} /> Tambah Hari Libur
                        </button>
                    </div>

                    <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                        {nonEffectiveDays.length === 0 ? (
                            <p className="text-center text-gray-400 text-sm py-4">Tidak ada hari libur diinput.</p>
                        ) : (
                            nonEffectiveDays.map((day, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl shadow-sm">
                                    <div>
                                        <div className="font-bold text-gray-800 text-sm">{day.reason}</div>
                                        <div className="text-xs text-gray-500 flex gap-2 items-center mt-1">
                                            <Calendar size={12}/>
                                            <span>{new Date(day.date).toLocaleDateString('id-ID')}</span>
                                            <span className="text-red-500 font-bold bg-red-50 px-1.5 rounded flex items-center gap-1">
                                                <Clock size={10}/>
                                                {day.hours === "Full Day" ? "Full Day" : `Jam ke: ${day.hours}`}
                                            </span>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleDeleteDay(idx)}
                                        className="text-gray-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-full transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <button 
                    onClick={handleSaveGeneral}
                    disabled={saving}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                >
                    {saving ? <Loader2 className="animate-spin" /> : <Save size={18} />} Simpan Semua Pengaturan
                </button>
            </div>
        </div>
      </div>
    </Layout>
  );
};

export default SettingsPage;
