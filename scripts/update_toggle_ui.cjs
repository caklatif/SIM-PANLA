const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../pages/UsersData.tsx');
let content = fs.readFileSync(file, 'utf8');

const targetStatusTd = `<td className="px-6 py-3">
                           <button 
                               onClick={() => toggleActiveStatus(p)}
                               className={\`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border transition-colors \${p.is_active !== false ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}\`}
                               title="Klik untuk mengubah status"
                           >
                               {p.is_active !== false ? 'Aktif' : 'Tidak Aktif'}
                           </button>
                       </td>`;

const toggleStatusTd = `<td className="px-6 py-3">
                           <div className="flex items-center gap-2">
                               <button 
                                   onClick={() => toggleActiveStatus(p)}
                                   className={\`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 \${p.is_active !== false ? 'bg-green-500' : 'bg-gray-300'}\`}
                                   title="Klik untuk mengubah status"
                               >
                                   <span className={\`inline-block h-4 w-4 transform rounded-full bg-white transition-transform \${p.is_active !== false ? 'translate-x-6' : 'translate-x-1'}\`} />
                               </button>
                               <span className={\`text-xs font-bold \${p.is_active !== false ? 'text-green-600' : 'text-gray-500'}\`}>
                                   {p.is_active !== false ? 'Aktif' : 'Non-Aktif'}
                               </span>
                           </div>
                       </td>`;

content = content.replace(targetStatusTd, toggleStatusTd);

const targetToggleFn = `const toggleActiveStatus = async (user: Profile) => {
      const newStatus = user.is_active === false ? true : false;
      try {
          const { error } = await supabase.from('profiles').update({ is_active: newStatus }).eq('id', user.id);
          if (error) {
              if (error.code === '42703' || error.message?.includes('is_active')) {
                  alert("Kolom 'is_active' belum ada di database. Silakan jalankan perintah SQL ini di Supabase SQL Editor:\\n\\nALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;");
              } else {
                  throw error;
              }
              return;
          }
          setProfiles(prev => prev.map(p => p.id === user.id ? { ...p, is_active: newStatus } : p));
      } catch(e: any) { alert("Gagal update status: " + e.message); }
  };`;

const newToggleFn = `const toggleActiveStatus = async (user: Profile) => {
      const newStatus = user.is_active === false ? true : false;
      try {
          const { data, error } = await supabase.from('profiles').update({ is_active: newStatus }).eq('id', user.id).select();
          if (error) {
              if (error.code === '42703' || error.message?.includes('is_active')) {
                  alert("Kolom 'is_active' belum ada di database. Silakan jalankan perintah SQL ini di Supabase SQL Editor:\\n\\nALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;");
              } else {
                  throw error;
              }
              return;
          }
          if (!data || data.length === 0) {
              alert("Gagal mengubah status. Ini terjadi karena Anda perlu menambahkan izin (RLS) di database agar Admin bisa mengubah profil. Silakan jalankan perintah SQL ini di Supabase SQL Editor:\\n\\nCREATE POLICY \\"Admins update all profiles\\" ON public.profiles FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));");
              // Tetap update state lokal sementara untuk testing, atau uncomment return di bawah agar state tidak berubah
              // return;
          }
          setProfiles(prev => prev.map(p => p.id === user.id ? { ...p, is_active: newStatus } : p));
      } catch(e: any) { alert("Gagal update status: " + e.message); }
  };`;

content = content.replace(targetToggleFn, newToggleFn);

fs.writeFileSync(file, content);
console.log('UI updated to switch toggle and added RLS check.');
