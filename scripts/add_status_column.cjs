const fs = require('fs');
const path = require('path');
let content = fs.readFileSync(path.join(__dirname, '../pages/UsersData.tsx'), 'utf8');

// 1. Add toggle active function
const toggleTarget = "const toggleMapelSelection = (subject: string, isEditMode: boolean) => {";
const toggleFunction = `  const toggleActiveStatus = async (user: Profile) => {
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
  };
  
  `;
content = content.replace(toggleTarget, toggleFunction + toggleTarget);

// 2. Add header column
content = content.replace('<th className="px-6 py-4">Wali Kelas</th>', '<th className="px-6 py-4">Wali Kelas</th>\n                   <th className="px-6 py-4">Status</th>');

// 3. Update colSpans
content = content.replace(/colSpan=\{6\}/g, "colSpan={7}");

// 4. Add data column
const waliKelasTd = `<td className="px-6 py-3">{p.wali_kelas ? <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 px-2 py-1 rounded-lg text-xs font-bold border border-purple-100"><GraduationCap size={12}/> {p.wali_kelas}</span> : <span className="text-gray-300 italic text-xs">Bukan Wali</span>}</td>`;

const statusTd = `
                       <td className="px-6 py-3">
                           <button 
                               onClick={() => toggleActiveStatus(p)}
                               className={\`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border transition-colors \${p.is_active !== false ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}\`}
                               title="Klik untuk mengubah status"
                           >
                               {p.is_active !== false ? 'Aktif' : 'Tidak Aktif'}
                           </button>
                       </td>`;
content = content.replace(waliKelasTd, waliKelasTd + statusTd);

fs.writeFileSync(path.join(__dirname, '../pages/UsersData.tsx'), content);
console.log('Patched UsersData.tsx with is_active status');
