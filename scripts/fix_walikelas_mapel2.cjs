const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../pages/UsersData.tsx');
let content = fs.readFileSync(file, 'utf8');

// The replacement I did earlier for finalMapelNew is probably dangling. Let's fix handleCreateUser instead.

content = content.replace(
    /const handleCreateUser = async \(\) => \{\n\s*if \(\!newUser\.nip \|\| \!newUser\.fullName \|\| \!newUser\.password\) \{ alert\("NIP, Nama Lengkap, dan Password wajib diisi\."\); return; \}\n\s*if \(\!serviceKey\) \{ alert\("Service Role Key wajib diisi untuk membuat akun Login\."\); return; \}\n\s*setSaving\(true\);\n\s*try \{/g,
    `const handleCreateUser = async () => {\n      if (!newUser.nip || !newUser.fullName || !newUser.password) { alert("NIP, Nama Lengkap, dan Password wajib diisi."); return; }\n      if (!serviceKey) { alert("Service Role Key wajib diisi untuk membuat akun Login."); return; }\n      setSaving(true);\n      try {\n          let finalMapelNew = newUser.mapel;\n          if (newUser.waliKelas && newUser.waliKelas.trim() !== '') {\n              const mapelsNew = finalMapelNew ? finalMapelNew.split(',').map(m => m.trim()) : [];\n              if (!mapelsNew.includes('Sabtu bersama Wali Kelas')) {\n                 mapelsNew.push('Sabtu bersama Wali Kelas');\n                 finalMapelNew = mapelsNew.join(', ');\n              }\n          }\n`
);

fs.writeFileSync(file, content);
console.log('Patched handleCreateUser');
