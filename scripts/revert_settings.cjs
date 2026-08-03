const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../pages/SettingsPage.tsx');
let content = fs.readFileSync(file, 'utf8');

const selectInput = `<select 
                                className="w-full border rounded-lg p-3 bg-white font-medium" 
                                value={settings['academic_year'] || ''}
                                onChange={e => setSettings({...settings, academic_year: e.target.value})}
                            >
                                {availableYears.map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>`;

const textInput = `<input 
                                className="w-full border rounded-lg p-3 font-medium" 
                                value={settings['academic_year'] || ''}
                                onChange={e => setSettings({...settings, academic_year: e.target.value})}
                                placeholder="Contoh: 2024/2025"
                            />`;

content = content.replace(
    /<select \s*className="w-full border rounded-lg p-3 bg-white font-medium" \s*value=\{settings\['academic_year'\] \|\| ''\}\s*onChange=\{e => setSettings\(\{\.\.\.settings, academic_year: e\.target\.value\}\)\}\s*>\s*\{availableYears\.map\(year => \(\s*<option key=\{year\} value=\{year\}>\{year\}<\/option>\s*\)\)\}\s*<\/select>/m,
    textInput
);

fs.writeFileSync(file, content);
console.log('Settings reverted');
