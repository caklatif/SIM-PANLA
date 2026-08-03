const fs = require('fs');
const path = require('path');

const settingsFile = path.join(__dirname, '../pages/SettingsPage.tsx');
let content = fs.readFileSync(settingsFile, 'utf8');

// Add availableYears state
if (!content.includes('const [availableYears, setAvailableYears]')) {
    content = content.replace(
        "const [nonEffectiveDays, setNonEffectiveDays] = useState<NonEffectiveDay[]>([]);",
        "const [nonEffectiveDays, setNonEffectiveDays] = useState<NonEffectiveDay[]>([]);\n  const [availableYears, setAvailableYears] = useState<string[]>(['2024/2025']);"
    );
}

// In fetchSettings, fetch available_years
if (!content.includes("if (setting.key === 'available_years')")) {
    const fetchReplace = `
          data.forEach(setting => {
              if (setting.key === 'non_effective_days') {
                  try {
                      setNonEffectiveDays(JSON.parse(setting.value));
                  } catch (e) { console.error(e); }
              } else if (setting.key === 'subjects_list') {
                  try { setSubjectsList(JSON.parse(setting.value)); } catch(e) {}
              } else if (setting.key === 'discipline_types') {
                  try { setDisciplineTypes(JSON.parse(setting.value)); } catch(e) {}
              } else if (setting.key === 'follow_up_types') {
                  try { setFollowUpTypes(JSON.parse(setting.value)); } catch(e) {}
              } else if (setting.key === 'activity_types') {
                  try { setActivityTypes(JSON.parse(setting.value)); } catch(e) {}
              } else if (setting.key === 'available_years') {
                  try { setAvailableYears(JSON.parse(setting.value)); } catch(e) {}
              } else {
                  newSettings[setting.key] = setting.value;
              }
          });
    `;
    // We'll just replace the whole data.forEach block
    content = content.replace(/data\.forEach\(setting => \{[\s\S]*?\}\);/m, fetchReplace);
}

// Replace the input with a select
if (content.includes('<input \n                                className="w-full border rounded-lg p-3 font-medium" \n                                value={settings[\'academic_year\'] || \'\'}')) {
    const selectInput = `
                            <select 
                                className="w-full border rounded-lg p-3 bg-white font-medium" 
                                value={settings['academic_year'] || ''}
                                onChange={e => setSettings({...settings, academic_year: e.target.value})}
                            >
                                {availableYears.map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
    `;
    content = content.replace(
        /<input \s*className="w-full border rounded-lg p-3 font-medium" \s*value=\{settings\['academic_year'\] \|\| ''\}\s*onChange=\{e => setSettings\(\{\.\.\.settings, academic_year: e\.target\.value\}\)\}\s*placeholder="Contoh: 2024\/2025"\s*\/>/m,
        selectInput
    );
}

fs.writeFileSync(settingsFile, content);
console.log('SettingsPage updated');
