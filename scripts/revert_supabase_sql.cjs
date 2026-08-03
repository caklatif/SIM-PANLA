const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../SUPABASE_SETUP.sql');
let content = fs.readFileSync(file, 'utf8');

const regex = /-- Update untuk menambahkan kolom is_active di profil guru[\s\S]*?;/g;
content = content.replace(regex, '');

const regex2 = /-- Update untuk mengizinkan admin mengubah profil \(seperti status is_active\)[\s\S]*?\);/g;
content = content.replace(regex2, '');

fs.writeFileSync(file, content.trim() + '\n');
console.log('Reverted SUPABASE_SETUP.sql');
