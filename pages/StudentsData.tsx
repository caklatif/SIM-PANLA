
import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Student } from '../types';
import { Search, GraduationCap, Edit, UserPlus, UserMinus, Trash2, Save, X, Loader2, Filter, ArrowRight , TrendingUp } from 'lucide-react';
import { showAlert, showConfirm } from '../utils/alert';

const StudentsData: React.FC = () => {
  const { academicYear } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'selection' | 'masuk' | 'keluar'>('selection');
  const [showKenaikanModal, setShowKenaikanModal] = useState(false);
  const [targetYear, setTargetYear] = useState('');
  const [kenaikanLoading, setKenaikanLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    nisn: '',
    nis: '',
    name: '',
    kelas: '',
    gender: 'L',
    jenjang: '7'
  });

  const [mutasiKeluarData, setMutasiKeluarData] = useState({
      kelas: '',
      studentId: '',
      status: 'aktif' as 'aktif' | 'tidak_aktif'
  });
  const [studentsForDropdown, setStudentsForDropdown] = useState<Student[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, [filterClass]); 

  useEffect(() => {
    if (modalType === 'keluar' && mutasiKeluarData.kelas) {
        const fetchClassStudents = async () => {
             let { data, error } = await supabase.from('students').select('*').eq('academic_year', academicYear || '2025/2026').eq('kelas', mutasiKeluarData.kelas).eq('academic_year', academicYear || '2025/2026').order('name');
          if (error && (error.code === '42703' || error.message?.includes('academic_year'))) {
              const res = await supabase.from('students').select('*').eq('academic_year', academicYear || '2025/2026').eq('kelas', mutasiKeluarData.kelas).order('name');
              if (academicYear === '2025/2026') data = res.data;
              else data = [];
          }
             setStudentsForDropdown(data || []);
        };
        fetchClassStudents();
    }
  }, [modalType, mutasiKeluarData.kelas]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      let query = supabase.from('students').select('*').eq('academic_year', academicYear || '2025/2026');
      if (filterClass) query = query.eq('kelas', filterClass);
      let { data, error } = await query.order('kelas', { ascending: true }).order('name', { ascending: true });
      if (error && (error.code === '42703' || error.message?.includes('academic_year'))) {
          // Fallback if column missing
          let fallbackQuery = supabase.from('students').select('*').eq('academic_year', academicYear || '2025/2026');
          if (filterClass) fallbackQuery = fallbackQuery.eq('kelas', filterClass);
          const res = await fallbackQuery.order('kelas', { ascending: true }).order('name', { ascending: true });
          
          // Assume old data belongs to 2025/2026
          if (academicYear === '2025/2026') {
             data = res.data;
          } else {
             data = [];
          }
          error = res.error;
      }
      if (error) throw error;
      setStudents(data || []);
    } catch (err: any) {
      showAlert('Gagal mengambil data murid: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const openMutasiModal = () => { setModalType('selection'); setIsModalOpen(true); };

  const handleMutasiSelection = (type: 'masuk' | 'keluar') => {
      setModalType(type);
      setEditingId(null);
      setFormData({ nisn: '', nis: '', name: '', kelas: filterClass || '7A', gender: 'L', jenjang: '7' });
      setMutasiKeluarData({ kelas: '', studentId: '', status: 'aktif' });
  };

  const handleEdit = (s: Student) => {
      setEditingId(s.id);
      setFormData({
          nisn: s.nisn,
          nis: s.nis || '',
          name: s.name,
          kelas: s.kelas,
          gender: (s.gender as any) || 'L',
          jenjang: s.jenjang || '7'
      });
      setModalType('masuk');
      setIsModalOpen(true);
  };

  
  const handleKenaikanKelas = async () => {
      if (!targetYear) {
          showAlert('Pilih Tahun Ajaran tujuan!');
          return;
      }
      if (targetYear === academicYear) {
          showAlert('Tahun Ajaran tujuan tidak boleh sama dengan yang sekarang!');
          return;
      }
      
      const confirmMsg = `Apakah Anda yakin memproses kenaikan kelas dari ${academicYear} ke ${targetYear}?\n\nSiswa Kelas 7 akan naik ke Kelas 8.\nSiswa Kelas 8 akan naik ke Kelas 9.\nSiswa Kelas 9 akan diluluskan (Data tidak disalin ke tahun ajaran baru).`;
      if (!await showConfirm(confirmMsg)) return;
      
      setKenaikanLoading(true);
      try {
          const { data: currentStudents, error: fetchErr } = await supabase
              .from('students')
              .select('*')
              .eq('academic_year', academicYear);
              
          if (fetchErr) throw fetchErr;
          if (!currentStudents || currentStudents.length === 0) {
              showAlert('Tidak ada data murid di tahun ajaran saat ini.');
              setKenaikanLoading(false);
              return;
          }
          
          const newRecords = [];
          for (const student of currentStudents) {
              const currentGrade = parseInt(student.jenjang);
              if (isNaN(currentGrade) || currentGrade === 9) {
                  continue;
              }
              
              const newGrade = currentGrade + 1;
              let newKelasName = student.kelas;
              if (student.kelas.startsWith(currentGrade.toString())) {
                  newKelasName = student.kelas.replace(currentGrade.toString(), newGrade.toString());
              }
              
              newRecords.push({
                  academic_year: targetYear,
                  nisn: student.nisn,
                  nis: student.nis,
                  name: student.name,
                  kelas: newKelasName,
                  gender: student.gender,
                  jenjang: newGrade.toString()
              });
          }
          
          if (newRecords.length === 0) {
              showAlert('Tidak ada murid yang dapat dinaikkan (semua kelas 9 atau data tidak valid).');
              setKenaikanLoading(false);
              return;
          }
          
          const { error: insertErr } = await supabase
              .from('students')
              .insert(newRecords);
              
          if (insertErr) {
              if (insertErr.code === '23505') {
                  throw new Error('Beberapa siswa sudah ada di tahun ajaran tujuan. Kenaikan kelas mungkin sudah diproses.');
              }
              throw insertErr;
          }
          
          showAlert(`Berhasil memproses kenaikan kelas untuk ${newRecords.length} murid!`);
          setShowKenaikanModal(false);
      } catch (err: any) {
          showAlert('Gagal memproses kenaikan kelas: ' + err.message);
      } finally {
          setKenaikanLoading(false);
      }
  };

  const handleSaveMasuk = async () => {
      if (!formData.nisn || !formData.name || !formData.kelas) {
          showAlert("NISN, Nama, dan Kelas wajib diisi!");
          return;
      }
      setSaving(true);
      try {
          const payload = { 
                nisn: formData.nisn, 
                nis: formData.nis, 
                name: formData.name, 
                kelas: formData.kelas,
                gender: formData.gender,
                jenjang: formData.jenjang,
                academic_year: academicYear || '2025/2026'
            };

          if (editingId) {
              const { error } = await supabase.from('students').update(payload).eq('id', editingId);
              if (error) throw error;
              setStudents(prev => prev.map(s => s.id === editingId ? { ...s, ...payload } as Student : s));
          } else {
              let { data, error } = await supabase.from('students').insert(payload).select().single();
              if (error && (error.code === '42703' || error.message?.includes('academic_year'))) {
                  const { academic_year, ...rest } = payload as any;
                  const res = await supabase.from('students').insert(rest).select().single();
                  data = res.data;
                  error = res.error;
              }
              if (error) throw error;
              if (data) setStudents(prev => [...prev, data].sort((a,b) => a.kelas.localeCompare(b.kelas) || a.name.localeCompare(b.name)));
          }
          setIsModalOpen(false);
      } catch (err: any) {
          showAlert("Gagal menyimpan: " + err.message);
      } finally {
          setSaving(false);
      }
  };

  const executeDeleteStudent = async (studentId: string) => {
    // 1. Hapus riwayat di attendance_logs
    const { error: errAtt } = await supabase.from('attendance_logs').delete().eq('student_id', studentId);
    if (errAtt) console.warn("Error deleting attendance_logs:", errAtt);

    // 2. Hapus riwayat di homeroom_attendance
    const { error: errHome } = await supabase.from('homeroom_attendance').delete().eq('student_id', studentId);
    if (errHome) console.warn("Error deleting homeroom_attendance:", errHome);

    // 3. Hapus catatan di journal_notes
    const { error: errNotes } = await supabase.from('journal_notes').delete().eq('student_id', studentId);
    if (errNotes) console.warn("Error deleting journal_notes:", errNotes);

    // 4. Hapus data utama murid dari tabel students
    const { error } = await supabase.from('students').delete().eq('id', studentId);
    if (error) throw error;
  };

  const handleDeleteStudent = async (s: Student) => {
      const confirmed = await showConfirm(`Apakah Anda yakin ingin menghapus data murid "${s.name}" (${s.kelas})?\n\nCatatan: Seluruh riwayat presensi terkait murid ini juga akan dibersihkan.`);
      if (!confirmed) return;

      setLoading(true);
      try {
          await executeDeleteStudent(s.id);
          setStudents(prev => prev.filter(item => item.id !== s.id));
          showAlert(`Data murid "${s.name}" berhasil dihapus.`);
      } catch (err: any) {
          showAlert("Gagal menghapus murid: " + err.message);
      } finally {
          setLoading(false);
      }
  };

  const handleSaveKeluar = async () => {
      if (!mutasiKeluarData.kelas || !mutasiKeluarData.studentId) {
          showAlert("Pilih Kelas dan Murid terlebih dahulu.");
          return;
      }
      setSaving(true);
      try {
          if (mutasiKeluarData.status === 'tidak_aktif') {
              await executeDeleteStudent(mutasiKeluarData.studentId);
              setStudents(prev => prev.filter(s => s.id !== mutasiKeluarData.studentId));
              showAlert("Data murid berhasil dihapus (Mutasi Keluar).");
          } else {
              showAlert("Tidak ada perubahan disimpan karena status 'Aktif'.");
          }
          setIsModalOpen(false);
      } catch (err: any) {
          showAlert("Gagal memproses: " + err.message);
      } finally {
          setSaving(false);
      }
  };

  const filteredStudents = students.filter(s => 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.nisn.includes(searchTerm)
  );

  const availableClasses = ['7A','7B','7C','7D','7E','7F','7G','7H',
                            '8A','8B','8C','8D','8E','8F','8G','8H',
                            '9A','9B','9C','9D','9E','9F','9G','9H'];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <GraduationCap className="text-purple-600" /> Data Murid
            </h2>
            <p className="text-slate-500 text-sm">Kelola data murid, mutasi masuk dan keluar.</p>
          </div>
          <button onClick={openMutasiModal} className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-purple-200 hover:shadow-purple-300 hover:-translate-y-0.5 transition-all">
             <UserPlus size={18} /> Mutasi Murid
          </button>
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 items-center">
            <div className="flex-1 w-full relative">
                <Search className="absolute left-4 top-3.5 text-slate-400" size={18} />
                <input type="text" placeholder="Cari Nama / NISN..." className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm font-medium" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <div className="w-full md:w-64 relative">
                 <Filter className="absolute left-4 top-3.5 text-slate-400" size={18} />
                 <select className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white text-sm font-bold text-slate-700 appearance-none" value={filterClass} onChange={e => setFilterClass(e.target.value)}>
                    <option value="">Semua Kelas</option>
                    {availableClasses.map(c => <option key={c} value={c}>{c}</option>)}
                 </select>
                 <ArrowRight className="absolute right-4 top-3.5 text-slate-400 rotate-90" size={14} />
            </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
           <div className="overflow-x-auto">
             <table className="w-full text-sm text-left">
               <thead className="bg-slate-50/80 text-slate-500 font-bold uppercase text-xs border-b border-slate-100">
                 <tr>
                   <th className="px-6 py-5">Nama Murid</th>
                   <th className="px-6 py-5">NISN / NIS</th>
                   <th className="px-6 py-5 text-center">Kelas</th>
                   <th className="px-6 py-5 text-center">L/P</th>
                   <th className="px-6 py-5 text-center">Aksi</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                 {loading ? <tr><td colSpan={5} className="px-6 py-12 text-center"><Loader2 className="animate-spin mx-auto text-purple-500"/></td></tr> : filteredStudents.length === 0 ? <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">Tidak ada data murid ditemukan.</td></tr> : (
                   filteredStudents.map((s) => (
                     <tr key={s.id} className="hover:bg-purple-50/30 transition-colors group">
                       <td className="px-6 py-4 font-bold text-slate-700">{s.name}</td>
                       <td className="px-6 py-4 text-slate-500 font-mono text-xs">{s.nisn} <span className="text-slate-300">{s.nis ? `/ ${s.nis}` : ''}</span></td>
                        <td className="px-6 py-4 text-center"><span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg font-bold text-xs">{s.kelas}</span></td>
                       <td className="px-6 py-4 text-center"><span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${s.gender === 'P' ? 'bg-pink-50 text-pink-600 border border-pink-100' : 'bg-purple-50 text-purple-600 border border-purple-100'}`}>{s.gender || 'L'}</span></td>
                       <td className="px-6 py-4 text-center"><div className="flex items-center justify-center gap-1.5">
                            <button onClick={() => handleEdit(s)} className="p-2 text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors" title="Edit Data Murid">
                              <Edit size={16}/>
                            </button>
                            <button onClick={() => handleDeleteStudent(s)} className="p-2 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors" title="Hapus Data Murid">
                              <Trash2 size={16}/>
                            </button>
                          </div></td>
                     </tr>
                   ))
                 )}
               </tbody>
             </table>
           </div>
           <div className="p-4 bg-slate-50/50 text-xs text-slate-400 font-medium border-t border-slate-100 flex justify-between">
               <span>Total: {filteredStudents.length} Murid</span>
               <span>Database: public.students</span>
           </div>
        </div>

        {/* Dynamic Modal - TOP ALIGNED & MODERN */}

            {isModalOpen && (
                <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[calc(env(safe-area-inset-top)+1rem)] sm:p-4 bg-slate-900/50 backdrop-blur-sm transition-all duration-300">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100 relative animate-fade-in border border-slate-100">
                    <div className="bg-purple-600 p-5 flex justify-between items-center text-white">
                        <h3 className="font-bold flex items-center gap-2 text-lg">
                            <GraduationCap size={22}/> 
                            {modalType === 'selection' ? 'Pilih Jenis Mutasi' : modalType === 'masuk' ? (editingId ? 'Edit Data Murid' : 'Mutasi Masuk') : 'Mutasi Keluar'}
                        </h3>
                        <button onClick={() => setIsModalOpen(false)} className="hover:bg-white/20 p-1.5 rounded-full transition-colors"><X size={20}/></button>
                    </div>
                    
                    <div className="p-6">
                        {modalType === 'selection' && (
                            <div className="grid grid-cols-2 gap-4">
                                <button onClick={() => handleMutasiSelection('masuk')} className="flex flex-col items-center justify-center gap-3 p-6 bg-emerald-50 border border-emerald-100 rounded-2xl hover:bg-emerald-100/80 hover:border-emerald-200 hover:-translate-y-1 transition-all group shadow-sm">
                                    <div className="w-14 h-14 bg-emerald-200 rounded-full flex items-center justify-center text-emerald-700 group-hover:scale-110 transition-transform"><UserPlus size={28} /></div>
                                    <div className="text-center"><span className="font-bold text-emerald-800 block">Mutasi Masuk</span><span className="text-[10px] text-emerald-600 font-medium">Tambah murid baru</span></div>
                                </button>
                                <button onClick={() => handleMutasiSelection('keluar')} className="flex flex-col items-center justify-center gap-3 p-6 bg-rose-50 border border-rose-100 rounded-2xl hover:bg-rose-100/80 hover:border-rose-200 hover:-translate-y-1 transition-all group shadow-sm">
                                    <div className="w-14 h-14 bg-rose-200 rounded-full flex items-center justify-center text-rose-700 group-hover:scale-110 transition-transform"><UserMinus size={28} /></div>
                                    <div className="text-center"><span className="font-bold text-rose-800 block">Mutasi Keluar</span><span className="text-[10px] text-rose-600 font-medium">Hapus murid</span></div>
                                </button>
                            </div>
                        )}

                        {modalType === 'masuk' && (
                             <div className="space-y-4">
                                <div><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Nama Lengkap</label><input className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-purple-500" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Nama Murid" /></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">NISN</label><input className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-purple-500" value={formData.nisn} onChange={e => setFormData({...formData, nisn: e.target.value})} placeholder="001xxxx" /></div>
                                    <div><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">NIS (Opsional)</label><input className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-purple-500" value={formData.nis} onChange={e => setFormData({...formData, nis: e.target.value})} placeholder="1234" /></div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Kelas</label>
                                        <select className="w-full border border-slate-200 rounded-xl p-3 bg-white focus:ring-2 focus:ring-purple-500" value={formData.kelas} onChange={e => setFormData({...formData, kelas: e.target.value})}>{availableClasses.map(c => <option key={c} value={c}>{c}</option>)}</select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Jenis Kelamin</label>
                                        <div className="flex gap-2">
                                            <label className={`flex-1 text-center py-3 rounded-xl cursor-pointer border font-bold text-sm transition-all ${formData.gender === 'L' ? 'bg-purple-100 border-purple-300 text-purple-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}><input type="radio" className="hidden" name="gender" value="L" checked={formData.gender === 'L'} onChange={() => setFormData({...formData, gender: 'L'})} /> L</label>
                                            <label className={`flex-1 text-center py-3 rounded-xl cursor-pointer border font-bold text-sm transition-all ${formData.gender === 'P' ? 'bg-pink-100 border-pink-300 text-pink-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}><input type="radio" className="hidden" name="gender" value="P" checked={formData.gender === 'P'} onChange={() => setFormData({...formData, gender: 'P'})} /> P</label>
                                        </div>
                                    </div>
                                </div>
                                <button onClick={handleSaveMasuk} disabled={saving} className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 mt-4 shadow-lg shadow-purple-200 disabled:opacity-50 transition-all">{saving ? <Loader2 className="animate-spin" /> : <Save size={20} />} Simpan Data</button>
                            </div>
                        )}

                        {modalType === 'keluar' && (
                             <div className="space-y-4">
                                 <div><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Pilih Kelas</label><select className="w-full border border-slate-200 rounded-xl p-3 bg-white focus:ring-2 focus:ring-rose-500" value={mutasiKeluarData.kelas} onChange={e => setMutasiKeluarData({...mutasiKeluarData, kelas: e.target.value, studentId: ''})}><option value="">-- Pilih Kelas --</option>{availableClasses.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                                <div><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Pilih Murid</label><select className="w-full border border-slate-200 rounded-xl p-3 bg-white disabled:bg-slate-50 disabled:text-slate-400 focus:ring-2 focus:ring-rose-500" value={mutasiKeluarData.studentId} disabled={!mutasiKeluarData.kelas} onChange={e => setMutasiKeluarData({...mutasiKeluarData, studentId: e.target.value})}><option value="">-- Pilih Nama Murid --</option>{studentsForDropdown.map(s => (<option key={s.id} value={s.id}>{s.name} ({s.nisn})</option>))}</select></div>
                                {mutasiKeluarData.studentId && (
                                    <div className="bg-rose-50 p-4 rounded-xl border border-rose-100 mt-2">
                                        <label className="block text-xs font-bold text-rose-800 mb-2">Konfirmasi Tindakan</label>
                                        <div className="flex flex-col gap-2">
                                            <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-rose-100/50 rounded-lg transition-colors">
                                                <input type="radio" name="status" value="tidak_aktif" checked={mutasiKeluarData.status === 'tidak_aktif'} onChange={() => setMutasiKeluarData({...mutasiKeluarData, status: 'tidak_aktif'})} className="text-rose-600 focus:ring-rose-500"/>
                                                <div><span className="text-sm font-bold text-rose-700 block">Hapus Permanen</span><span className="text-[10px] text-rose-500">Data akan hilang dari database.</span></div>
                                            </label>
                                        </div>
                                    </div>
                                )}
                                <button onClick={handleSaveKeluar} disabled={saving || !mutasiKeluarData.studentId} className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 mt-4 shadow-lg disabled:opacity-50 transition-all ${mutasiKeluarData.status === 'tidak_aktif' ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200' : 'bg-slate-200 text-slate-500'}`}>{saving ? <Loader2 className="animate-spin" /> : 'Proses Mutasi Keluar'}</button>
                             </div>
                        )}
                    </div>
                </div>
            </div>
        )}
      </div>
    </Layout>
  );
};

export default StudentsData;
