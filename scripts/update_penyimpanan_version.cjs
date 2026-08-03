const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../pages/Penyimpanan.tsx');
let content = fs.readFileSync(file, 'utf8');

// Add state for availableVersions
if (!content.includes('availableScheduleVersions')) {
    content = content.replace(
        /const \[activeScheduleVersion, setActiveScheduleVersion\] = useState\(''\);/g,
        `const [activeScheduleVersion, setActiveScheduleVersion] = useState('');\n    const [availableScheduleVersions, setAvailableScheduleVersions] = useState<string[]>(['Utama']);`
    );

    // Fetch available schedule versions in fetchSettings
    const fetchVersions = `
                // Fetch available schedule versions
                const { data: schedData } = await supabase.from('schedules').select('schedule_version').eq('academic_year', currentData?.value || '2025/2026').eq('semester', semData?.value || 'Ganjil');
                if (schedData) {
                    const versions = Array.from(new Set(schedData.map((d: any) => d.schedule_version).filter(Boolean)));
                    if (versions.length > 0) setAvailableScheduleVersions(versions as string[]);
                }
    `;
    
    // add it inside fetchSettings, after setting active semester
    content = content.replace(
        /const \{ data: schedVerData \} = await supabase/g,
        `${fetchVersions}\n                const { data: schedVerData } = await supabase`
    );

    // Replace the text input with a select dropdown
    const selectUI = `
                                    <select 
                                        className="flex-1 border rounded-xl p-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                                        value={activeScheduleVersion}
                                        onChange={(e) => setActiveScheduleVersion(e.target.value)}
                                    >
                                        {availableScheduleVersions.map(v => <option key={v} value={v}>{v}</option>)}
                                        {!availableScheduleVersions.includes(activeScheduleVersion) && activeScheduleVersion && <option value={activeScheduleVersion}>{activeScheduleVersion}</option>}
                                    </select>
    `;
    content = content.replace(
        /<input\s+type="text"\s+className="flex-1 border[^>]+value=\{activeScheduleVersion\}[^>]+onChange=\{[^}]+\}[^>]+placeholder="Contoh: Utama"\s*\/>/g,
        selectUI
    );

    fs.writeFileSync(file, content);
    console.log('Penyimpanan.tsx version updated to select');
}
