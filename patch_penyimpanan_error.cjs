const fs = require('fs');
let code = fs.readFileSync('./pages/Penyimpanan.tsx', 'utf8');

code = code.replace(/setMessage\(\{ type: 'error', text: 'Terjadi kesalahan saat menyimpan data\.' \}\);/g, "setMessage({ type: 'error', text: 'Terjadi kesalahan saat menyimpan data: ' + (error.message || 'Error tidak diketahui.') });");
code = code.replace(/setMessage\(\{ type: 'error', text: 'Gagal mengubah Tahun Ajaran aktif\.' \}\);/g, "setMessage({ type: 'error', text: 'Gagal mengubah Tahun Ajaran aktif: ' + (e.message || '') });");
code = code.replace(/setMessage\(\{ type: 'error', text: 'Gagal menyimpan masa berlaku\.' \}\);/g, "setMessage({ type: 'error', text: 'Gagal menyimpan masa berlaku: ' + (e.message || '') });");

fs.writeFileSync('./pages/Penyimpanan.tsx', code);
