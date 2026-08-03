const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../pages/SettingsPage.tsx');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    /<input \s*className="w-full border rounded-lg p-3 font-medium" \s*value=\{settings\['academic_year'\] \|\| ''\}\s*onChange=\{e => setSettings\(\{\.\.\.settings, academic_year: e\.target\.value\}\)\}\s*placeholder="Contoh: 2024\/2025"\s*\/>/g,
    `<input 
                                className="w-full border rounded-lg p-3 font-medium bg-gray-100 text-gray-500 cursor-not-allowed" 
                                value={settings['academic_year'] || ''}
                                readOnly
                            />
                            <p className="text-[10px] text-gray-400 mt-1">* Diatur dari menu Penyimpanan</p>`
);

content = content.replace(
    /<select \s*className="w-full border rounded-lg p-3 bg-white"\s*value=\{settings\['semester'\] \|\| 'Ganjil'\}\s*onChange=\{e => setSettings\(\{\.\.\.settings, semester: e\.target\.value\}\)\}\s*>\s*<option value="Ganjil">Ganjil<\/option>\s*<option value="Genap">Genap<\/option>\s*<\/select>/g,
    `<select 
                                className="w-full border rounded-lg p-3 bg-gray-100 text-gray-500 cursor-not-allowed"
                                value={settings['semester'] || 'Ganjil'}
                                disabled
                            >
                                <option value="Ganjil">Ganjil</option>
                                <option value="Genap">Genap</option>
                            </select>
                            <p className="text-[10px] text-gray-400 mt-1">* Diatur dari menu Penyimpanan</p>`
);

fs.writeFileSync(file, content);
console.log('Updated SettingsPage');
