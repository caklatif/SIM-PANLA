const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../pages/UsersData.tsx');
let content = fs.readFileSync(file, 'utf8');

const targetWaliKelasTd = `<td className="px-6 py-3">{p.wali_kelas ? <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 px-2 py-1 rounded-lg text-xs font-bold"><GraduationCap size={12} /> {p.wali_kelas}</span> : <span className="text-gray-300">-</span>}</td>`;

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

content = content.replace(targetWaliKelasTd, targetWaliKelasTd + statusTd);

fs.writeFileSync(file, content);
console.log('Patched UI for status column');
