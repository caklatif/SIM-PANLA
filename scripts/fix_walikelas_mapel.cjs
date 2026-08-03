const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../pages/UsersData.tsx');
let content = fs.readFileSync(file, 'utf8');

// handleSaveEdit
content = content.replace(
    /const handleSaveEdit = async \(\) => \{\n\s*if \(\!editingUser\) return;\n\s*setSaving\(true\);\n\s*try \{/g,
    `const handleSaveEdit = async () => {\n    if (!editingUser) return;\n    setSaving(true);\n    try {\n      let finalMapel = editFormData.mengajar_mapel;\n      if (editFormData.wali_kelas && editFormData.wali_kelas.trim() !== '') {\n        const mapels = finalMapel ? finalMapel.split(',').map(m => m.trim()) : [];\n        if (!mapels.includes('Sabtu bersama Wali Kelas')) {\n           mapels.push('Sabtu bersama Wali Kelas');\n           finalMapel = mapels.join(', ');\n        }\n      }\n      const payload = {\n          mengajar_mapel: finalMapel,\n          wali_kelas: editFormData.wali_kelas\n      };\n`
);

content = content.replace(
    /const \{ error: profileError \} = await supabase.from\('profiles'\).update\(\{\n\s*mengajar_mapel: editFormData.mengajar_mapel,\n\s*wali_kelas: editFormData.wali_kelas\n\s*\}\).eq\('id', editingUser.id\);/g,
    `const { error: profileError } = await supabase.from('profiles').update(payload).eq('id', editingUser.id);`
);

content = content.replace(
    /await supabase.from\('tabel_guru'\).update\(\{\n\s*mapel: editFormData.mengajar_mapel,\n\s*wali_kelas: editFormData.wali_kelas\n\s*\}\).eq\('nip', editingUser.nip\);/g,
    `await supabase.from('tabel_guru').update({ mapel: finalMapel, wali_kelas: editFormData.wali_kelas }).eq('nip', editingUser.nip);`
);

content = content.replace(
    /setProfiles\(prev => prev.map\(p => p.id === editingUser.id \? \{ ...p, mengajar_mapel: editFormData.mengajar_mapel, wali_kelas: editFormData.wali_kelas \} : p\)\);/g,
    `setProfiles(prev => prev.map(p => p.id === editingUser.id ? { ...p, mengajar_mapel: finalMapel, wali_kelas: editFormData.wali_kelas } : p));`
);

// handleSaveNewUser
content = content.replace(
    /const handleSaveNewUser = async \(\) => \{\n\s*if \(\!newUser.nip \|\| \!newUser.fullName \|\| \!newUser.password \|\| \!serviceKey\) \{\n\s*alert\("NIP, Nama, Password, dan Service Key wajib diisi!"\);\n\s*return;\n\s*\}\n\s*setSaving\(true\);\n\s*try \{/g,
    `const handleSaveNewUser = async () => {\n      if (!newUser.nip || !newUser.fullName || !newUser.password || !serviceKey) {\n          alert("NIP, Nama, Password, dan Service Key wajib diisi!");\n          return;\n      }\n      setSaving(true);\n      try {\n        let finalMapelNew = newUser.mapel;\n        if (newUser.waliKelas && newUser.waliKelas.trim() !== '') {\n            const mapelsNew = finalMapelNew ? finalMapelNew.split(',').map(m => m.trim()) : [];\n            if (!mapelsNew.includes('Sabtu bersama Wali Kelas')) {\n               mapelsNew.push('Sabtu bersama Wali Kelas');\n               finalMapelNew = mapelsNew.join(', ');\n            }\n        }\n`
);

content = content.replace(
    /mengajar_mapel: newUser.mapel, wali_kelas: newUser.waliKelas, password_info: newUser.password/g,
    `mengajar_mapel: typeof finalMapelNew !== 'undefined' ? finalMapelNew : newUser.mapel, wali_kelas: newUser.waliKelas, password_info: newUser.password`
);

content = content.replace(
    /await supabase.from\('tabel_guru'\).upsert\(\{ nip: newUser.nip, nama_lengkap: newUser.fullName, mapel: newUser.mapel, wali_kelas: newUser.waliKelas \}\);/g,
    `await supabase.from('tabel_guru').upsert({ nip: newUser.nip, nama_lengkap: newUser.fullName, mapel: typeof finalMapelNew !== 'undefined' ? finalMapelNew : newUser.mapel, wali_kelas: newUser.waliKelas });`
);

fs.writeFileSync(file, content);
console.log('Patched handleSaveEdit and handleSaveNewUser');
