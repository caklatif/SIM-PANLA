
import React, { useEffect, useState, useRef } from 'react';
import { Layout } from '../components/Layout';
import { supabase } from '../services/supabase';
import { createClient } from '@supabase/supabase-js'; 
import { Profile } from '../types';
import { Search, UserCog, AlertCircle, GraduationCap, Shield, Edit, Save, X, Loader2, ChevronDown, Check, UserPlus, KeyRound, Eye, EyeOff, Lock, User, RefreshCw } from 'lucide-react';
import { showAlert, showConfirm } from '../utils/alert';

const PasswordCell = ({ password }: { password?: string }) => {
  const [show, setShow] = useState(false);
  
  if (!password) return <span className="text-gray-400 italic text-[10px] bg-gray-50 px-2 py-1 rounded border border-gray-100">Terenkripsi</span>;
  
  return (
    <div className="flex items-center gap-2 bg-yellow-50 px-2 py-1.5 rounded-lg border border-yellow-200 w-fit">
      <span className="font-mono text-xs font-bold text-slate-700 min-w-[70px]">
          {show ? password : '••••••••'}
      </span>
      <button 
        onClick={() => setShow(!show)} 
        className="text-yellow-600 hover:text-yellow-800 transition-colors p-0.5"
        title={show ? "Sembunyikan" : "Lihat Password"}
      >
        {show ? <EyeOff size={14}/> : <Eye size={14}/>}
      </button>
    </div>
  );
};

const UsersData: React.FC = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [subjectsList, setSubjectsList] = useState<string[]>([]);

  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [editFormData, setEditFormData] = useState({
    mengajar_mapel: '',
    wali_kelas: ''
  });
  
  
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncKey, setSyncKey] = useState('');
  const [syncStats, setSyncStats] = useState<{ total: number, created: number, errors: number, lastError?: string } | null>(null);

    const handleSyncGuru = async () => {
      if (!syncKey) { showAlert("Service Role Key wajib diisi untuk sinkronisasi."); return; }
      setSyncing(true);
      setSyncStats(null);
      let created = 0;
      let errors = 0;
      let lastErrorMsg = "";
      
      try {
          const SUPABASE_URL = 'https://oqdnfhkzneqhvktjqiqe.supabase.co';
          const adminClient = createClient(SUPABASE_URL, syncKey, { auth: { autoRefreshToken: false, persistSession: false } });
          
          const { data: guruData, error: guruError } = await supabase.from('tabel_guru').select('*');
          if (guruError) throw guruError;
          
          const { data: { users }, error: usersError } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
          if (usersError) throw usersError;

          for (const g of guruData) {
              try {
                  const email = `${g.nip}@sekolah.id`;
                  const password = 'spanla';
                  let userId = null;
                  
                  // Cari apakah user auth sudah ada
                  const existingUser = users.find(u => u.email === email);
                  
                  if (existingUser) {
                      userId = existingUser.id;
                  } else {
                      // Buat user baru jika belum ada
                      const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
                          email: email,
                          password: password,
                          email_confirm: true,
                          user_metadata: { full_name: g.nama_lengkap }
                      });
                      if (authError) {
                          errors++;
                          lastErrorMsg = authError.message;
                          continue;
                      }
                      userId = authData.user?.id;
                  }

                  if (userId) {
                      // Selalu upsert profile (untuk mengisi NIP dan Mapel yang kosong/baru)
                      await adminClient.from('profiles').upsert({
                          id: userId,
                          nip: g.nip,
                          full_name: g.nama_lengkap,
                          role: 'user',
                          mengajar_mapel: g.mapel,
                          wali_kelas: g.wali_kelas,
                          password_info: password
                      });
                      created++;
                  }
              } catch (e: any) {
                  errors++;
                  lastErrorMsg = e.message || "Error saat sync profile";
              }
          }
          setSyncStats({ total: guruData.length, created, errors, lastError: lastErrorMsg });
          fetchData();
      } catch (err: any) {
          showAlert("Gagal sinkronisasi: " + err.message);
      } finally {
          setSyncing(false);
      }
  };
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({
      nip: '',
      fullName: '',
      password: 'spanla', 
      role: 'user',
      mapel: '',
      waliKelas: ''
  });

  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetData, setResetData] = useState({
      userId: '',
      userName: '',
      newPassword: ''
  });

  const [serviceKey, setServiceKey] = useState('');
  const [showServiceKey, setShowServiceKey] = useState(false);

  const [saving, setSaving] = useState(false);

  const [isMapelDropdownOpen, setIsMapelDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
    const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
            setIsMapelDropdownOpen(false);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [profilesRes, settingsRes] = await Promise.all([
          supabase.from('profiles').select('*').order('full_name', { ascending: true }),
          supabase.from('app_settings').select('value').eq('key', 'subjects_list').single()
      ]);
      if (profilesRes.data) setProfiles(profilesRes.data);
      if (settingsRes.data?.value) {
          try { 
            let parsed = JSON.parse(settingsRes.data.value);
            if (!parsed.includes('Sabtu bersama Wali Kelas')) {
                parsed.push('Sabtu bersama Wali Kelas');
            }
            setSubjectsList(parsed); 
        } catch(e) { console.error("Parse subjects error", e); }
      }
    } catch (err: any) { showAlert('Gagal mengambil data user: ' + err.message); } finally { setLoading(false); }
  };

  const handleEditClick = (user: Profile) => {
    setEditingUser(user);
    setEditFormData({ mengajar_mapel: user.mengajar_mapel || '', wali_kelas: user.wali_kelas || '' });
    setIsMapelDropdownOpen(false);
  };

  const handleOpenReset = (user: Profile) => {
      setResetData({ userId: user.id, userName: user.full_name, newPassword: '' });
      setResetModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    setSaving(true);
    try {
      let finalMapel = editFormData.mengajar_mapel;
      if (editFormData.wali_kelas && editFormData.wali_kelas.trim() !== '') {
        const mapels = finalMapel ? finalMapel.split(',').map(m => m.trim()) : [];
        if (!mapels.includes('Sabtu bersama Wali Kelas')) {
           mapels.push('Sabtu bersama Wali Kelas');
           finalMapel = mapels.join(', ');
        }
      }
      const payload = {
          mengajar_mapel: finalMapel,
          wali_kelas: editFormData.wali_kelas
      };

      const { error: profileError } = await supabase.from('profiles').update(payload).eq('id', editingUser.id);
      if (profileError) throw profileError;

      if (editingUser.nip) {
         await supabase.from('tabel_guru').update({ mapel: finalMapel, wali_kelas: editFormData.wali_kelas }).eq('nip', editingUser.nip);
      }

      setProfiles(prev => prev.map(p => p.id === editingUser.id ? { ...p, mengajar_mapel: finalMapel, wali_kelas: editFormData.wali_kelas } : p));
      setEditingUser(null);
    } catch (err: any) { showAlert('Gagal menyimpan data: ' + err.message); } finally { setSaving(false); }
  };

  const handleCreateUser = async () => {
      if (!newUser.nip || !newUser.fullName || !newUser.password) { showAlert("NIP, Nama Lengkap, dan Password wajib diisi."); return; }
      if (!serviceKey) { showAlert("Service Role Key wajib diisi untuk membuat akun Login."); return; }
      setSaving(true);
      try {
          let finalMapelNew = newUser.mapel;
          if (newUser.waliKelas && newUser.waliKelas.trim() !== '') {
              const mapelsNew = finalMapelNew ? finalMapelNew.split(',').map(m => m.trim()) : [];
              if (!mapelsNew.includes('Sabtu bersama Wali Kelas')) {
                 mapelsNew.push('Sabtu bersama Wali Kelas');
                 finalMapelNew = mapelsNew.join(', ');
              }
          }

          const SUPABASE_URL = 'https://oqdnfhkzneqhvktjqiqe.supabase.co'; 
          const adminClient = createClient(SUPABASE_URL, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

          const email = `${newUser.nip}@sekolah.id`;
          const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
              email: email,
              password: newUser.password,
              email_confirm: true,
              user_metadata: { full_name: newUser.fullName }
          });

          if (authError) throw new Error("Gagal membuat Auth User: " + authError.message);
          if (!authData.user) throw new Error("Gagal mendapatkan data user baru.");
          const userId = authData.user.id;

          const { error: profileError } = await adminClient.from('profiles').upsert({
              id: userId, nip: newUser.nip, full_name: newUser.fullName, role: newUser.role,
              mengajar_mapel: typeof finalMapelNew !== 'undefined' ? finalMapelNew : newUser.mapel, wali_kelas: newUser.waliKelas, password_info: newUser.password
          });
          if (profileError) throw new Error("Gagal membuat Profile: " + profileError.message);

          await supabase.from('tabel_guru').upsert({ nip: newUser.nip, nama_lengkap: newUser.fullName, mapel: typeof finalMapelNew !== 'undefined' ? finalMapelNew : newUser.mapel, wali_kelas: newUser.waliKelas });

          showAlert("User berhasil ditambahkan!");
          setIsAddModalOpen(false);
          setNewUser({ nip: '', fullName: '', password: 'spanla', role: 'user', mapel: '', waliKelas: '' });
          fetchData(); 
      } catch (err: any) { showAlert(err.message); } finally { setSaving(false); }
  };

  const handleResetPasswordAction = async () => {
      if(!resetData.newPassword || !serviceKey) { showAlert("Password baru dan Service Key wajib diisi."); return; }
      setSaving(true);
      try {
          const SUPABASE_URL = 'https://oqdnfhkzneqhvktjqiqe.supabase.co'; 
          const adminClient = createClient(SUPABASE_URL, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

          const { error: authError } = await adminClient.auth.admin.updateUserById(resetData.userId, { password: resetData.newPassword });
          if (authError) throw new Error("Gagal update Auth: " + authError.message);

          const { error: profileError } = await supabase.from('profiles').update({ password_info: resetData.newPassword }).eq('id', resetData.userId);
          if (profileError) throw new Error("Gagal update Profile: " + profileError.message);

          showAlert("Password berhasil direset!");
          setProfiles(prev => prev.map(p => p.id === resetData.userId ? { ...p, password_info: resetData.newPassword } : p));
          setResetModalOpen(false);
          setResetData({ userId: '', userName: '', newPassword: '' });
      } catch(e: any) { showAlert(e.message); } finally { setSaving(false); }
  };

    const toggleMapelSelection = (subject: string, isEditMode: boolean) => {
      let currentString = isEditMode ? editFormData.mengajar_mapel : newUser.mapel;
      let currentSelection = currentString ? currentString.split(',').map(s => s.trim()) : [];
      if (currentSelection.includes(subject)) currentSelection = currentSelection.filter(s => s !== subject); else currentSelection.push(subject);
      const newString = currentSelection.filter(Boolean).join(', ');
      if (isEditMode) setEditFormData({ ...editFormData, mengajar_mapel: newString }); else setNewUser({ ...newUser, mapel: newString });
  };

  const filteredProfiles = profiles.filter(t => t.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || t.nip?.includes(searchTerm));
  const availableClasses = ['7A','7B','7C','7D','7E','7F','7G','7H','8A','8B','8C','8D','8E','8F','8G','8H','9A','9B','9C','9D','9E','9F','9G','9H'];

  return (
    <Layout>
      <div className="space-y-6 relative">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><UserCog className="text-purple-600" /> Data User (Profiles)</h2>
            <p className="text-gray-500 text-sm">Kelola data login, password, dan akademik pengguna.</p>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="h-4 w-4 text-gray-400" /></div>
                <input type="text" placeholder="Cari User / NIP..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 w-full border border-gray-300 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"/>
              </div>
              <button onClick={() => setIsSyncModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-blue-200 hover:shadow-blue-300 transition-all flex-shrink-0"><RefreshCw size={18} /> Sinkronisasi Guru</button>
              <button onClick={() => setIsAddModalOpen(true)} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-purple-200 hover:shadow-purple-300 transition-all flex-shrink-0"><UserPlus size={18} /> Tambah User</button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
           <div className="overflow-x-auto">
             <table className="w-full text-sm text-left">
               <thead className="bg-gray-50 text-gray-600 font-bold uppercase text-xs">
                 <tr>
                   <th className="px-6 py-4">User Info</th>
                   <th className="px-6 py-4">Password Info</th>
                   <th className="px-6 py-4">Role</th>
                   <th className="px-6 py-4">Mapel (Profil)</th>
                   <th className="px-6 py-4">Wali Kelas</th>
                   
                   <th className="px-6 py-4 text-center">Aksi</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-100">
                 {loading ? <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">Memuat data profiles...</td></tr> : filteredProfiles.length === 0 ? <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">Tidak ada data user ditemukan.</td></tr> : (
                   filteredProfiles.map((p) => (
                     <tr key={p.id} className="hover:bg-purple-50/50 transition-colors group">
                       <td className="px-6 py-3"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">{p.avatar_url ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs font-bold">{p.full_name?.charAt(0)}</div>}</div><div><div className="font-bold text-gray-800">{p.full_name}</div><div className="text-xs text-gray-500 font-mono">{p.nip}</div></div></div></td>
                       <td className="px-6 py-3"><PasswordCell password={p.password_info} /></td>
                       <td className="px-6 py-3">{p.role === 'admin' ? <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-2 py-1 rounded-lg text-xs font-bold"><Shield size={12} /> Admin</span> : <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded-lg text-xs font-bold">User</span>}</td>
                       <td className="px-6 py-3 text-gray-600 max-w-xs truncate" title={p.mengajar_mapel}>{p.mengajar_mapel ? <div className="flex flex-wrap gap-1">{p.mengajar_mapel.split(',').map((m, i) => <span key={i} className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 px-2 py-0.5 rounded text-[10px] font-bold border border-purple-100">{m.trim()}</span>)}</div> : <span className="text-gray-300 italic">Belum diisi</span>}</td>
                       <td className="px-6 py-3">{p.wali_kelas ? <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 px-2 py-1 rounded-lg text-xs font-bold"><GraduationCap size={12} /> {p.wali_kelas}</span> : <span className="text-gray-300">-</span>}</td>
                       
                       <td className="px-6 py-3 text-center"><div className="flex justify-center gap-2"><button onClick={() => handleOpenReset(p)} className="p-2 bg-yellow-50 text-yellow-600 rounded-lg hover:bg-yellow-100 transition-colors border border-yellow-100" title="Reset Password"><KeyRound size={16} /></button><button onClick={() => handleEditClick(p)} className="p-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors border border-purple-100" title="Edit Data Akademik"><Edit size={16} /></button></div></td>
                     </tr>
                   ))
                 )}
               </tbody>
             </table>
           </div>
        </div>

        {/* MODAL RESET PASSWORD - TOP ALIGNED */}
        {resetModalOpen && (
            <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[calc(env(safe-area-inset-top)+1rem)] sm:p-4 bg-slate-900/50 backdrop-blur-sm transition-all duration-300">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100 border border-slate-100 relative animate-fade-in">
                    <div className="bg-yellow-500 p-4 flex justify-between items-center text-white">
                        <h3 className="font-bold flex items-center gap-2"><KeyRound size={20} /> Reset Password</h3>
                        <button onClick={() => setResetModalOpen(false)} className="hover:bg-white/20 p-1 rounded-full transition-colors"><X size={20} /></button>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="text-center mb-2">
                            <div className="w-12 h-12 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-2"><RefreshCw size={24} /></div>
                            <p className="text-sm text-gray-500">Anda akan mereset password untuk:</p>
                            <p className="font-bold text-lg text-slate-800">{resetData.userName}</p>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Password Baru</label>
                            <input className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-yellow-500" placeholder="Masukkan password baru..." value={resetData.newPassword} onChange={e => setResetData({...resetData, newPassword: e.target.value})}/>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Service Role Key (Wajib)</label>
                            <div className="relative">
                                <input type={showServiceKey ? "text" : "password"} className="w-full border border-orange-300 rounded-lg p-2 pr-10 text-xs font-mono focus:ring-2 focus:ring-orange-500 bg-white" placeholder="Paste Service Role Key..." value={serviceKey} onChange={e => setServiceKey(e.target.value)}/>
                                <button type="button" onClick={() => setShowServiceKey(!showServiceKey)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600">{showServiceKey ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                            </div>
                            <p className="text-[10px] text-orange-600 mt-1">* Diperlukan untuk update di sistem Auth.</p>
                        </div>
                        <button onClick={handleResetPasswordAction} disabled={saving} className="w-full bg-yellow-500 hover:bg-yellow-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 mt-2">{saving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18} />} Simpan Password Baru</button>
                    </div>
                </div>
            </div>
        )}

        {/* MODAL EDIT AKADEMIK - TOP ALIGNED */}
        {editingUser && (
            <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[calc(env(safe-area-inset-top)+1rem)] sm:p-4 bg-slate-900/50 backdrop-blur-sm transition-all duration-300">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100 border border-slate-100 relative animate-fade-in">
                    <div className="bg-purple-600 p-4 flex justify-between items-center text-white">
                        <h3 className="font-bold flex items-center gap-2"><UserCog size={20} /> Edit Data Akademik</h3>
                        <button onClick={() => setEditingUser(null)} className="hover:bg-white/20 p-1 rounded-full transition-colors"><X size={20} /></button>
                    </div>
                    <div className="p-6 space-y-5">
                        <div className="bg-purple-50 p-3 rounded-lg border border-purple-100 mb-4">
                            <p className="text-xs text-purple-600 font-bold uppercase">Mengedit User:</p>
                            <p className="font-bold text-gray-800">{editingUser.full_name}</p>
                            <p className="text-xs text-gray-500 font-mono">{editingUser.nip}</p>
                        </div>
                        <div className="relative" ref={dropdownRef}>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Mata Pelajaran (Multi-Select)</label>
                            <button onClick={() => setIsMapelDropdownOpen(!isMapelDropdownOpen)} className="w-full text-left border border-gray-300 rounded-xl p-3 bg-white focus:ring-2 focus:ring-purple-500 flex justify-between items-center"><span className={`truncate ${!editFormData.mengajar_mapel ? 'text-gray-400' : 'text-gray-800'}`}>{editFormData.mengajar_mapel || "-- Pilih Mata Pelajaran --"}</span><ChevronDown size={16} className="text-gray-400" /></button>
                            {isMapelDropdownOpen && (
                                <div className="absolute z-20 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto p-1 custom-scrollbar">
                                    {subjectsList.length === 0 ? <div className="p-3 text-center text-gray-400 text-xs">Belum ada data Master Mapel.</div> : subjectsList.map((subj, idx) => { const isSelected = editFormData.mengajar_mapel.includes(subj); return (<div key={idx} onClick={() => toggleMapelSelection(subj, true)} className={`flex items-center justify-between p-3 rounded-lg cursor-pointer text-sm mb-1 transition-colors ${isSelected ? 'bg-purple-50 text-purple-700 font-bold' : 'hover:bg-gray-50 text-gray-700'}`}><span>{subj}</span>{isSelected && <Check size={16} className="text-purple-600"/>}</div>); })}
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Wali Kelas</label>
                            <select className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white" value={editFormData.wali_kelas} onChange={e => {
    const val = e.target.value;
    let newMapel = editFormData.mengajar_mapel;
    if (val) {
        const mapels = newMapel ? newMapel.split(',').map(m => m.trim()) : [];
        if (!mapels.includes('Sabtu bersama Wali Kelas')) {
            mapels.push('Sabtu bersama Wali Kelas');
            newMapel = mapels.join(', ');
        }
    }
    setEditFormData({...editFormData, wali_kelas: val, mengajar_mapel: newMapel});
}}>
                                <option value="">-- Bukan Wali Kelas --</option>
                                {availableClasses.map(k => <option key={k} value={k}>{k}</option>)}
                            </select>
                        </div>
                        <div className="pt-4 flex gap-3">
                            <button onClick={() => setEditingUser(null)} className="flex-1 py-3 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-colors">Batal</button>
                            <button onClick={handleSaveEdit} disabled={saving} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg disabled:opacity-50">{saving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18} />} Simpan</button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Sync Modal */}
        {isSyncModalOpen && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-all duration-300">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                    <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-white">
                        <div>
                            <h3 className="text-xl font-bold text-gray-800">Sinkronisasi Data Guru</h3>
                            <p className="text-sm text-gray-500 mt-1">Buat akun login otomatis untuk data guru yang belum memilikinya.</p>
                        </div>
                        <button onClick={() => setIsSyncModalOpen(false)} className="text-gray-400 hover:text-red-500 transition-colors p-2 rounded-xl hover:bg-red-50"><X size={24} /></button>
                    </div>
                    <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/50">
                        <div className="space-y-5">
                            <div className="bg-blue-50 border border-blue-100 text-blue-700 p-4 rounded-xl text-sm leading-relaxed flex gap-3">
                                <AlertCircle size={24} className="shrink-0 text-blue-600" />
                                <div>
                                    <p className="font-bold mb-1">Perhatian:</p>
                                    <p>Fitur ini akan mengecek <strong>Tabel Guru</strong> dan membuatkan Akun Login (Profile) dengan password default <strong>spanla</strong> untuk NIP yang belum terdaftar di menu ini, serta <strong>menyinkronkan data Mapel</strong> untuk akun yang sudah ada.</p>
                                </div>
                            </div>
                            
                                                        <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Service Role Key</label>
                                <p className="text-xs text-gray-500 mb-2">Bukan API Key biasa (anon). Dapatkan di <strong>Supabase &gt; Project Settings &gt; API &gt; service_role (secret)</strong>.</p>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <KeyRound size={18} className="text-gray-400" />
                                    </div>
                                    <input 
                                        type={showServiceKey ? "text" : "password"} 
                                        className="w-full pl-10 pr-10 border border-gray-300 rounded-xl p-3 bg-white focus:ring-2 focus:ring-blue-500 font-mono text-sm" 
                                        placeholder="eyJh..." 
                                        value={syncKey} 
                                        onChange={e => setSyncKey(e.target.value)} 
                                    />
                                    <button 
                                        type="button" 
                                        onClick={() => setShowServiceKey(!showServiceKey)} 
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-blue-500"
                                    >
                                        {showServiceKey ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            {syncStats && (
                                <div className="mt-4 bg-white p-4 rounded-xl border border-gray-200">
                                    <h4 className="font-bold text-gray-800 mb-2">Hasil Sinkronisasi:</h4>
                                    <ul className="text-sm space-y-1 text-gray-600">
                                        <li>Total guru belum ada akun: <strong>{syncStats.total}</strong></li>
                                        <li className="text-green-600">Berhasil dibuat: <strong>{syncStats.created}</strong></li>
                                        <li className="text-red-500">Gagal dibuat: <strong>{syncStats.errors}</strong></li>
                                        {syncStats.lastError && <li className="text-red-500 text-xs mt-2 bg-red-50 p-2 rounded"><strong>Error Terakhir:</strong> {syncStats.lastError}</li>}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end flex-shrink-0">
                        <button onClick={handleSyncGuru} disabled={syncing} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg disabled:opacity-50 transition-all">
                            {syncing ? <Loader2 className="animate-spin" size={20} /> : <RefreshCw size={20} />} 
                            Mulai Sinkronisasi
                        </button>
                    </div>
                </div>
            </div>
        )}
        {/* MODAL ADD USER - TOP ALIGNED */}
        {isAddModalOpen && (
            <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[calc(env(safe-area-inset-top)+1rem)] sm:p-4 bg-slate-900/50 backdrop-blur-sm transition-all duration-300">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all scale-100 border border-slate-100 relative animate-fade-in flex flex-col max-h-[85vh]">
                    <div className="bg-green-600 p-4 flex justify-between items-center text-white flex-shrink-0">
                        <h3 className="font-bold flex items-center gap-2"><UserPlus size={20} /> Tambah User Manual</h3>
                        <button onClick={() => setIsAddModalOpen(false)} className="hover:bg-white/20 p-1 rounded-full transition-colors"><X size={20} /></button>
                    </div>
                    <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                        <div className="bg-green-50 p-4 rounded-xl border border-green-100 space-y-3">
                            <div className="flex items-center gap-2 text-green-800 font-bold border-b border-green-200 pb-2 mb-2"><KeyRound size={16}/> Akun Login</div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">NIP (User ID)</label>
                                    <div className="relative"><User className="absolute left-3 top-2.5 text-gray-400" size={16} /><input className="w-full pl-9 border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-green-500" placeholder="199xxx" value={newUser.nip} onChange={e => setNewUser({...newUser, nip: e.target.value})}/></div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Password</label>
                                    <div className="relative"><Lock className="absolute left-3 top-2.5 text-gray-400" size={16} /><input type="text" className="w-full pl-9 border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-green-500" placeholder="Password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})}/></div>
                                    <p className="text-[10px] text-gray-400 mt-1">Default: spanla</p>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Service Role Key (Wajib)</label>
                                <div className="relative"><input type={showServiceKey ? "text" : "password"} className="w-full border border-green-300 rounded-lg p-2 pr-10 text-xs font-mono focus:ring-2 focus:ring-green-500 bg-white" placeholder="Paste Service Role Key..." value={serviceKey} onChange={e => setServiceKey(e.target.value)}/><button type="button" onClick={() => setShowServiceKey(!showServiceKey)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600">{showServiceKey ? <EyeOff size={16} /> : <Eye size={16} />}</button></div>
                                <p className="text-[10px] text-green-600 mt-1">* Diperlukan untuk membuat user di Authentication Supabase.</p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Nama Lengkap</label>
                                <input className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-green-500" placeholder="Nama Guru..." value={newUser.fullName} onChange={e => setNewUser({...newUser, fullName: e.target.value})}/>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Role</label>
                                <select className="w-full border border-gray-300 rounded-xl p-3 bg-white focus:ring-2 focus:ring-green-500" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}><option value="user">User (Guru)</option><option value="operator">Operator</option><option value="admin">Administrator</option></select>
                            </div>
                            <div className="relative">
                                <label className="block text-sm font-bold text-gray-700 mb-1">Mata Pelajaran (Multi-Select)</label>
                                <button onClick={() => setIsMapelDropdownOpen(!isMapelDropdownOpen)} className="w-full text-left border border-gray-300 rounded-xl p-3 bg-white focus:ring-2 focus:ring-green-500 flex justify-between items-center"><span className={`truncate ${!newUser.mapel ? 'text-gray-400' : 'text-gray-800'}`}>{newUser.mapel || "-- Pilih Mata Pelajaran --"}</span><ChevronDown size={16} className="text-gray-400" /></button>
                                {isMapelDropdownOpen && (<div className="absolute z-20 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto p-1 custom-scrollbar">{subjectsList.length === 0 ? <div className="p-3 text-center text-gray-400 text-xs">Belum ada data Master Mapel.</div> : subjectsList.map((subj, idx) => { const isSelected = newUser.mapel.includes(subj); return (<div key={idx} onClick={() => toggleMapelSelection(subj, false)} className={`flex items-center justify-between p-3 rounded-lg cursor-pointer text-sm mb-1 transition-colors ${isSelected ? 'bg-green-50 text-green-700 font-bold' : 'hover:bg-gray-50 text-gray-700'}`}><span>{subj}</span>{isSelected && <Check size={16} className="text-green-600"/>}</div>); })}</div>)}
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Wali Kelas</label>
                                <select className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-green-500 bg-white" value={newUser.waliKelas} onChange={e => {
    const val = e.target.value;
    let newMapel = newUser.mapel;
    if (val) {
        const mapels = newMapel ? newMapel.split(',').map(m => m.trim()) : [];
        if (!mapels.includes('Sabtu bersama Wali Kelas')) {
            mapels.push('Sabtu bersama Wali Kelas');
            newMapel = mapels.join(', ');
        }
    }
    setNewUser({...newUser, waliKelas: val, mapel: newMapel});
}}><option value="">-- Bukan Wali Kelas --</option>{availableClasses.map(k => <option key={k} value={k}>{k}</option>)}</select>
                            </div>
                        </div>
                    </div>
                    <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end flex-shrink-0">
                        <button onClick={handleCreateUser} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg disabled:opacity-50 transition-all">{saving ? <Loader2 className="animate-spin" /> : <UserPlus size={20} />} Tambah User</button>
                    </div>
                </div>
            </div>
        )}
      </div>
    </Layout>
  );
};

export default UsersData;
