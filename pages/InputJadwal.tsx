
import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { CalendarPlus, Save, CheckCircle, AlertCircle, Loader2, User, Plus, Trash2, BookOpen, Clock, Edit, X, Database, ListChecks } from 'lucide-react';
import { Profile, Schedule } from '../types';
import { showAlert, showConfirm } from '../utils/alert';

interface ScheduleQueueItem {
    id: string; 
    hari: string;
    kelas: string;
    jam: string[];
    mapel: string;
}

const InputJadwal: React.FC = () => {
  const { academicYear, semester , activeScheduleVersion } = useAuth();
  const [teachers, setTeachers] = useState<Profile[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<Profile | null>(null);
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<{type: 'success' | 'error', msg: string} | null>(null);

  const [scheduleQueue, setScheduleQueue] = useState<ScheduleQueueItem[]>([]);
  const [workingVersion, setWorkingVersion] = useState(activeScheduleVersion || 'Utama');
  const [availableVersions, setAvailableVersions] = useState<string[]>(['Utama']);
  const [dbSchedules, setDbSchedules] = useState<Schedule[]>([]);
  const [loadingDb, setLoadingDb] = useState(false);

  const [editingItem, setEditingItem] = useState<Schedule | null>(null);
  const [editFormData, setEditFormData] = useState({ hari: '', kelas: '', jam: [] as string[], mapel: '' });

  
  const [showNewVersionModal, setShowNewVersionModal] = useState(false);
  const [newVersionName, setNewVersionName] = useState('');

  const [formData, setFormData] = useState({
    hari: 'Senin',
    jam: [] as string[],
    kelas: '',
    mapel: ''
  });

  useEffect(() => { fetchTeachers(); }, []);

  useEffect(() => {
     if (activeScheduleVersion && !workingVersion) setWorkingVersion(activeScheduleVersion);
  }, [activeScheduleVersion]);

  useEffect(() => {
     const fetchVersions = async () => {
         const { data } = await supabase.from('schedules').select('schedule_version').eq('academic_year', academicYear || '2025/2026').eq('semester', semester || 'Ganjil');
         if (data) {
             const versions = Array.from(new Set(data.map(d => d.schedule_version).filter(Boolean)));
             if (versions.length > 0) {
                 if (!versions.includes(workingVersion)) versions.push(workingVersion);
                 setAvailableVersions(versions);
             } else {
                 setAvailableVersions([workingVersion]);
             }
         }
     };
     fetchVersions();
  }, [academicYear, semester, workingVersion]);

  useEffect(() => {
      if (selectedTeacher) {
          fetchTeacherSchedules(selectedTeacher.id);
      }
  }, [workingVersion]);

  
  const handleCreateNewVersion = () => {
      if (!newVersionName.trim()) {
          showAlert("Nama versi tidak boleh kosong!");
          return;
      }
      
      const vName = newVersionName.trim();
      setAvailableVersions(prev => Array.from(new Set([...prev, vName])));
      setWorkingVersion(vName);
      setNewVersionName('');
      setShowNewVersionModal(false);
      showAlert(`Berhasil membuat versi jadwal baru: ${vName}. Silakan tambahkan jadwal.`);
  };



  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('profiles').select('*').neq('nip', null).order('full_name');
      if (error) throw error;
      if (data) {
        const filtered = data.filter(t => 
          (t.role as string) !== 'admin' && 
          (t.role as string) !== 'administrator' && 
          t.role?.toLowerCase() !== 'admin' &&
          !t.full_name?.toLowerCase().includes('admin')
        );
        setTeachers(filtered);
      } 
    } catch (err) { console.error("Gagal load guru", err); } finally { setLoading(false); }
  };

  const fetchTeacherSchedules = async (teacherId: string) => {
      setLoadingDb(true);
      try {
          
          let data = null;
          let error = null;
          try {
              const res = await supabase.from('schedules').select('*').eq('academic_year', academicYear || '2025/2026').eq('semester', semester || 'Ganjil').eq('schedule_version', workingVersion || 'Utama').eq('teacher_id', teacherId).order('day_of_week').order('hour');
              data = res.data;
              error = res.error;
              if (error && (error.code === '42703' || error.message?.includes('academic_year') || error.message?.includes('semester') || error.message?.includes('schedule_version') || error.message?.includes('schema cache'))) {
                  // Fallback if column doesn't exist yet
                  const fallbackRes = await supabase.from('schedules').select('*').eq('teacher_id', teacherId).order('day_of_week').order('hour');
                  console.log('Fallback Res:', fallbackRes);
                  if (fallbackRes.data && fallbackRes.data.length > 0 && fallbackRes.data[0].academic_year !== undefined) {
                      data = fallbackRes.data.filter(s => s.academic_year === (academicYear || '2025/2026') && s.semester === (semester || 'Ganjil'));
                  } else {
                      data = fallbackRes.data || [];
                  }
                  console.log('Filtered data:', data);
                  error = fallbackRes.error;
                  if (!error) console.warn("Kolom academic_year/semester belum ada di tabel schedules. Silakan jalankan SUPABASE_SETUP.sql");
              }
          } catch(e) { error = e; }
          
          if (error) throw error;
          setDbSchedules(data || []);
      } catch (err) { console.error("Gagal load jadwal database", err); } finally { setLoadingDb(false); }
  };

  const handleTeacherChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nip = e.target.value;
    const teacher = teachers.find(t => t.nip === nip) || null;
    setSelectedTeacher(teacher);
    setScheduleQueue([]);
    setStatus(null);

    if (teacher) {
        fetchTeacherSchedules(teacher.id);
        let subjects: string[] = [];
        if (teacher.mengajar_mapel) {
            subjects = teacher.mengajar_mapel.split(/[;,]+/).map(s => s.trim()).filter(Boolean);
        }
        setAvailableSubjects(subjects);
        setFormData(prev => ({ ...prev, mapel: subjects.length === 1 ? subjects[0] : '' }));
    } else {
        setDbSchedules([]);
    }
  };

  const toggleJam = (j: number) => {
    const val = String(j);
    setFormData(prev => {
      const exists = prev.jam.includes(val);
      if (exists) return { ...prev, jam: prev.jam.filter(x => x !== val) };
      return { ...prev, jam: [...prev.jam, val] };
    });
  };

  const handleAddToQueue = () => {
    setStatus(null);
    if (!selectedTeacher) return setStatus({ type: 'error', msg: 'Pilih Guru terlebih dahulu.' });
    if (formData.jam.length === 0) return setStatus({ type: 'error', msg: 'Pilih minimal satu Jam Ke.' });
    if (!formData.kelas || !formData.mapel) return setStatus({ type: 'error', msg: 'Kelas dan Mata Pelajaran harus diisi.' });

    const newItem: ScheduleQueueItem = {
        id: Math.random().toString(36).substr(2, 9),
        hari: formData.hari,
        kelas: formData.kelas,
        jam: [...formData.jam].sort((a,b) => Number(a) - Number(b)),
        mapel: formData.mapel
    };
    setScheduleQueue([...scheduleQueue, newItem]);
    setFormData(prev => ({ ...prev, jam: [], kelas: '' }));
  };

  const handleRemoveFromQueue = (id: string) => setScheduleQueue(prev => prev.filter(item => item.id !== id));

  const handleSaveAll = async () => {
    if (scheduleQueue.length === 0 || !selectedTeacher) return;
    setSubmitting(true);
    setStatus(null);
    try {
        const daysMap: Record<string, number> = { 'Senin': 1, 'Selasa': 2, 'Rabu': 3, 'Kamis': 4, 'Jumat': 5, 'Sabtu': 6, 'Minggu': 7 };
        const payloads = scheduleQueue.map(item => ({
            day_of_week: daysMap[item.hari],
            hour: item.jam.join(', '),
            kelas: item.kelas,
            subject: item.mapel,
            teacher_nip: selectedTeacher.nip,
            teacher_id: selectedTeacher.id,
            academic_year: academicYear || '2025/2026',
            semester: semester || 'Ganjil',
            schedule_version: workingVersion || 'Utama'
        }));
        let { error } = await supabase.from('schedules').insert(payloads);
        if (error && (error.code === '42703' || error.message?.includes('academic_year') || error.message?.includes('semester') || error.message?.includes('schedule_version') || error.message?.includes('schema cache'))) {
            // Fallback without academic_year and semester
            let fallbackPayloads = payloads.map(p => {
                const { schedule_version, ...rest } = p as any;
                return rest;
            });
            let fallbackRes = await supabase.from('schedules').insert(fallbackPayloads);
            
            if (fallbackRes.error && fallbackRes.error.code === '42703') {
                fallbackPayloads = fallbackPayloads.map(p => {
                    const { academic_year, semester, ...rest } = p as any;
                    return rest;
                });
                fallbackRes = await supabase.from('schedules').insert(fallbackPayloads);
            }
            error = fallbackRes.error;
            if (!error) console.warn("Kolom academic_year/semester belum ada di tabel schedules. Data disimpan tanpa tahun ajaran.");
        }
        if (error) throw error;
        setStatus({ type: 'success', msg: `Berhasil menyimpan ${scheduleQueue.length} jadwal baru!` });
        setScheduleQueue([]); 
        fetchTeacherSchedules(selectedTeacher.id); 
    } catch (err: any) { setStatus({ type: 'error', msg: err.message }); } finally { setSubmitting(false); }
  };

  const handleDeleteDbSchedule = async (id: string) => {
      if(!await showConfirm("Yakin ingin menghapus jadwal ini?")) return;
      try {
          const { error } = await supabase.from('schedules').delete().eq('id', id);
          if (error) throw error;
          if (selectedTeacher) fetchTeacherSchedules(selectedTeacher.id);
      } catch (err: any) { showAlert("Gagal menghapus: " + err.message); }
  };

  const openEditModal = (item: Schedule) => {
      const days = ['','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu'];
      const dayName = days[item.day_of_week] || 'Senin';
      const hourArray = item.hour.split(',').map(h => h.trim());
      setEditFormData({ hari: dayName, kelas: item.kelas, jam: hourArray, mapel: item.subject });
      setEditingItem(item);
  };

  const handleUpdateSchedule = async () => {
      if (!editingItem) return;
      setSubmitting(true);
      try {
        const daysMap: Record<string, number> = { 'Senin': 1, 'Selasa': 2, 'Rabu': 3, 'Kamis': 4, 'Jumat': 5, 'Sabtu': 6, 'Minggu': 7 };
        const payload = {
            day_of_week: daysMap[editFormData.hari],
            hour: editFormData.jam.sort((a,b) => Number(a) - Number(b)).join(', '),
            kelas: editFormData.kelas,
            subject: editFormData.mapel
        };
        const { error } = await supabase.from('schedules').update(payload).eq('id', editingItem.id);
        if (error) throw error;
        setEditingItem(null); 
        if (selectedTeacher) fetchTeacherSchedules(selectedTeacher.id); 
      } catch (err: any) { showAlert("Gagal update: " + err.message); } finally { setSubmitting(false); }
  };

  const toggleEditJam = (j: number) => {
    const val = String(j);
    setEditFormData(prev => {
      const exists = prev.jam.includes(val);
      if (exists) return { ...prev, jam: prev.jam.filter(x => x !== val) };
      return { ...prev, jam: [...prev.jam, val] };
    });
  };

  const getDayName = (num: number) => ['','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu'][num] || '-';

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
                <div className="bg-purple-100 p-3 rounded-2xl text-purple-600">
                    <CalendarPlus size={28} />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Jadwal Pelajaran</h2>
                    <p className="text-slate-500 text-sm">Input dan kelola jadwal mengajar.</p>
                </div>
            </div>
            
            <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
                <div className="px-3">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Edit Versi Jadwal</label>
                    <select 
                        className="text-sm font-bold text-purple-700 bg-transparent outline-none cursor-pointer"
                        value={workingVersion}
                        onChange={(e) => setWorkingVersion(e.target.value)}
                    >
                        {availableVersions.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                </div>
                <div className="w-px h-8 bg-slate-200"></div>
                <button 
                    onClick={() => setShowNewVersionModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-xl text-sm font-bold transition-colors"
                >
                    <Plus size={16} /> Buat Jadwal Baru
                </button>
            </div>
        </div>


        <div className="grid lg:grid-cols-3 gap-6 items-start">
            
            <div className="lg:col-span-1 space-y-6">
                <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 sticky top-4">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 ml-1">Pilih Guru Pengajar</label>
                    <select className="w-full border border-slate-200 rounded-xl p-3.5 focus:ring-2 focus:ring-purple-500 bg-white font-bold text-slate-700" value={selectedTeacher?.nip || ''} onChange={handleTeacherChange} disabled={loading || scheduleQueue.length > 0}><option value="">-- Cari Nama Guru --</option>{teachers.map(t => (<option key={t.id} value={t.nip}>{t.full_name}</option>))}</select>
                    {scheduleQueue.length > 0 && <p className="text-[10px] text-orange-500 mt-2 font-bold px-2">* Simpan antrian sebelum ganti guru.</p>}
                </div>

                <div className={`bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-5 transition-all ${!selectedTeacher ? 'opacity-50 pointer-events-none grayscale' : 'opacity-100'}`}>
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-2"><Plus size={18} className="text-purple-600"/><h3 className="font-bold text-slate-800">Tambah Jadwal Baru</h3></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Hari</label><select className="w-full border border-slate-200 rounded-xl p-3 bg-white text-sm" value={formData.hari} onChange={e => setFormData({...formData, hari: e.target.value})}>{['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'].map(d => <option key={d} value={d}>{d}</option>)}</select></div>
                        <div><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Kelas</label><select className="w-full border border-slate-200 rounded-xl p-3 bg-white text-sm" value={formData.kelas} onChange={e => setFormData({...formData, kelas: e.target.value})}><option value="">- Pilih -</option>{['7', '8', '9'].map(level => (['A','B','C','D','E','F','G','H'].map(paralel => (<option key={`${level}${paralel}`} value={`${level}${paralel}`}>{level}{paralel}</option>))))}</select></div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2 ml-1">Jam Ke-</label>
                        <div className="flex flex-wrap gap-2">{[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(j => (<button key={j} type="button" onClick={() => toggleJam(j)} className={`w-9 h-9 rounded-lg text-xs font-bold transition-all border ${formData.jam.includes(String(j)) ? 'bg-purple-600 text-white border-purple-600 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:border-purple-300 hover:text-purple-600'}`}>{j}</button>))}</div>
                    </div>
                    <div><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Mata Pelajaran</label><select className="w-full border border-slate-200 rounded-xl p-3 bg-white text-sm" value={formData.mapel} onChange={e => setFormData({...formData, mapel: e.target.value})}><option value="">-- Pilih Mapel --</option>{availableSubjects.map((s, i) => <option key={i} value={s}>{s}</option>)}</select></div>
                    <button onClick={handleAddToQueue} className="w-full bg-purple-50 text-purple-700 hover:bg-purple-100 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 border border-purple-100 transition-all shadow-sm hover:shadow-md"><ListChecks size={18} /> Tambah ke Antrian</button>
                </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
                {scheduleQueue.length > 0 && (
                    <div className="bg-white rounded-3xl shadow-sm border border-orange-100 overflow-hidden animate-fade-in">
                        <div className="p-5 border-b border-orange-100 bg-orange-50/50 flex justify-between items-center"><h3 className="font-bold text-orange-800 flex items-center gap-2"><Clock size={20} /> Draft / Antrian ({scheduleQueue.length})</h3><span className="text-[10px] font-bold text-orange-600 bg-white px-2 py-1 rounded border border-orange-200 uppercase">Belum Disimpan</span></div>
                        <div className="p-5 space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar">{scheduleQueue.map((item, idx) => (<div key={item.id} className="flex items-center justify-between bg-white border border-orange-100 p-4 rounded-2xl shadow-sm"><div className="flex items-center gap-4"><div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-xs">{idx + 1}</div><div><div className="font-bold text-slate-800 text-sm">{item.mapel}</div><div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5"><span className="bg-slate-100 px-2 rounded-md font-bold">{item.hari}</span><span className="text-slate-300">|</span><span className="font-mono text-purple-600 font-bold bg-purple-50 px-2 rounded-md">Kls {item.kelas}</span><span className="text-slate-300">|</span><span className="flex items-center gap-1 font-medium">Jam {item.jam.join(', ')}</span></div></div></div><button onClick={() => handleRemoveFromQueue(item.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"><Trash2 size={18} /></button></div>))}</div>
                        <div className="p-5 bg-orange-50 border-t border-orange-100">
                             {status && (<div className={`mb-4 p-3 rounded-xl flex items-start gap-3 text-sm font-bold shadow-sm ${status.type === 'success' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>{status.type === 'success' ? <CheckCircle size={18} className="mt-0.5" /> : <AlertCircle size={18} className="mt-0.5" />}{status.msg}</div>)}
                            <button onClick={handleSaveAll} disabled={submitting} className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-orange-200 hover:shadow-orange-300 transition-all">{submitting ? <Loader2 className="animate-spin" /> : <Save size={20} />} Simpan Semua ke Database</button>
                        </div>
                    </div>
                )}

                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col min-h-[400px]">
                     <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center rounded-t-3xl"><h3 className="font-bold text-slate-700 flex items-center gap-2 text-lg"><Database size={20} className="text-purple-500"/> Jadwal Aktif</h3>{selectedTeacher && <span className="text-xs font-bold text-slate-400 bg-white border px-2 py-1 rounded-lg">Total: {dbSchedules.length} JP</span>}</div>
                    <div className="flex-1 p-5">
                        {!selectedTeacher ? <div className="h-full flex flex-col items-center justify-center text-slate-300 text-center py-20"><User size={64} className="mb-4 opacity-20"/><p className="text-sm font-medium">Pilih Guru di panel kiri untuk melihat jadwal.</p></div> : loadingDb ? <div className="flex justify-center py-20"><Loader2 className="animate-spin text-purple-500" size={32}/></div> : dbSchedules.length === 0 ? <div className="text-center py-20 text-slate-400 text-sm italic">Belum ada jadwal tersimpan untuk guru ini.</div> : (
                            <div className="space-y-3">{dbSchedules.map((item) => (<div key={item.id} className="flex items-center justify-between bg-white border border-slate-100 p-4 rounded-2xl hover:border-purple-300 hover:shadow-md transition-all group"><div className="flex items-center gap-5"><div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex flex-col items-center justify-center font-bold text-sm leading-none border border-purple-100 shadow-sm"><span>{item.kelas}</span></div><div><div className="font-bold text-slate-800 text-base">{item.subject}</div><div className="text-xs text-slate-500 flex items-center gap-3 mt-1 font-medium"><span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600">{getDayName(item.day_of_week)}</span><span className="flex items-center gap-1 text-purple-600"><Clock size={12}/> Jam {item.hour}</span></div></div></div><div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => openEditModal(item)} className="p-2 text-purple-500 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors" title="Edit Jadwal"><Edit size={18} /></button><button onClick={() => handleDeleteDbSchedule(item.id)} className="p-2 text-red-500 bg-red-50 hover:bg-red-100 rounded-xl transition-colors" title="Hapus Permanen"><Trash2 size={18} /></button></div></div>))}</div>
                        )}
                    </div>
                </div>
            </div>
        </div>

        {/* MODAL EDIT - TOP ALIGNED & MODERN */}
        {editingItem && (
             <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[calc(env(safe-area-inset-top)+1rem)] sm:p-4 bg-slate-900/50 backdrop-blur-sm transition-all duration-300">
                <div className="bg-white rounded-2xl shadow-2xl w-full md:w-full md:max-w-md overflow-hidden transform transition-all scale-100 relative animate-fade-in border border-slate-100">
                    <div className="bg-purple-600 p-5 flex justify-between items-center text-white">
                        <h3 className="font-bold flex items-center gap-2 text-lg"><Edit size={20} /> Edit Jadwal</h3>
                        <button onClick={() => setEditingItem(null)} className="hover:bg-white/20 p-1.5 rounded-full transition-colors"><X size={20} /></button>
                    </div>
                    <div className="p-6 space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                             <div><label className="block text-xs font-bold text-slate-500 mb-1.5">Hari</label><select className="w-full border border-slate-200 rounded-xl p-3 text-sm bg-white" value={editFormData.hari} onChange={e => setEditFormData({...editFormData, hari: e.target.value})}>{['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'].map(d => <option key={d} value={d}>{d}</option>)}</select></div>
                            <div><label className="block text-xs font-bold text-slate-500 mb-1.5">Kelas</label><select className="w-full border border-slate-200 rounded-xl p-3 text-sm bg-white" value={editFormData.kelas} onChange={e => setEditFormData({...editFormData, kelas: e.target.value})}>{['7', '8', '9'].map(level => (['A','B','C','D','E','F','G','H'].map(paralel => (<option key={`${level}${paralel}`} value={`${level}${paralel}`}>{level}{paralel}</option>))))}</select></div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-2">Jam Ke-</label>
                            <div className="flex flex-wrap gap-2">{[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(j => (<button key={j} type="button" onClick={() => toggleEditJam(j)} className={`w-9 h-9 rounded-lg text-xs font-bold transition-all border ${editFormData.jam.includes(String(j)) ? 'bg-purple-600 text-white border-purple-600 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:border-purple-300'}`}>{j}</button>))}</div>
                        </div>
                        <div><label className="block text-xs font-bold text-slate-500 mb-1.5">Mata Pelajaran</label><input type="text" className="w-full border border-slate-200 rounded-xl p-3 text-sm" value={editFormData.mapel} onChange={e => setEditFormData({...editFormData, mapel: e.target.value})}/></div>
                        <div className="pt-4 flex gap-3">
                            <button onClick={() => setEditingItem(null)} className="flex-1 py-3 text-slate-500 font-bold bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Batal</button>
                            <button onClick={handleUpdateSchedule} disabled={submitting} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg disabled:opacity-50">{submitting ? <Loader2 className="animate-spin" size={18}/> : <Save size={18} />} Update</button>
                        </div>
                    </div>
                </div>
            </div>
        )}
      </div>
    
            {showNewVersionModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-xl border border-slate-100">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-800">Konfirmasi Jadwal Baru</h3>
                            <button onClick={() => setShowNewVersionModal(false)} className="text-slate-400 hover:text-red-500 transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-600 mb-1">Tahun Ajaran</label>
                                <input type="text" className="w-full border rounded-xl p-3 bg-gray-100 text-slate-500 font-medium" value={academicYear || '2025/2026'} disabled />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-600 mb-1">Semester</label>
                                <input type="text" className="w-full border rounded-xl p-3 bg-gray-100 text-slate-500 font-medium" value={semester || 'Ganjil'} disabled />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-600 mb-1">Nama Versi Jadwal Baru</label>
                                <input 
                                    type="text" 
                                    className="w-full border rounded-xl p-3 bg-white focus:ring-2 focus:ring-purple-500 outline-none font-medium text-slate-800" 
                                    value={newVersionName}
                                    onChange={(e) => setNewVersionName(e.target.value)}
                                    placeholder="Contoh: Jadwal UTS, Revisi 2"
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-8">
                            <button onClick={() => setShowNewVersionModal(false)} className="px-5 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">
                                Batal
                            </button>
                            <button onClick={handleCreateNewVersion} className="px-5 py-2.5 rounded-xl font-bold text-white bg-purple-600 hover:bg-purple-700 transition-colors">
                                Buat Jadwal Baru
                            </button>
                        </div>
                    </div>
                </div>
            )}

    </Layout>
  );
};

export default InputJadwal;
