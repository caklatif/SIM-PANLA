const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../pages/ImportData.tsx');
let content = fs.readFileSync(file, 'utf8');

// Add states for targetYear and availableYears
if (!content.includes('targetYear')) {
    content = content.replace(
        /const \[createAccounts, setCreateAccounts\] = useState\(true\);/g,
        `const [createAccounts, setCreateAccounts] = useState(true);\n  const [targetYear, setTargetYear] = useState(academicYear || '2025/2026');\n  const [availableYears, setAvailableYears] = useState<string[]>([]);`
    );

    // Add useEffect to fetch available years and update targetYear if academicYear changes
    const fetchCode = `
  useEffect(() => {
    if (academicYear && !targetYear) setTargetYear(academicYear);
    
    const fetchYears = async () => {
        const { data } = await supabase.from('app_settings').select('value').eq('key', 'available_years').single();
        if (data?.value) {
            try {
                setAvailableYears(JSON.parse(data.value));
            } catch(e) {
                setAvailableYears([data.value]);
            }
        }
    };
    fetchYears();
  }, [academicYear]);
`;
    content = content.replace(
        /const fileInputRef = useRef<HTMLInputElement>\(null\);/g,
        `const fileInputRef = useRef<HTMLInputElement>(null);\n${fetchCode}`
    );

    // Update studentsToInsert
    content = content.replace(
        /academic_year: academicYear \|\| '2025\/2026',/g,
        `academic_year: targetYear || academicYear || '2025/2026',`
    );

    // Update schedulesToInsert
    content = content.replace(
        /academic_year: academicYear \|\| '2025\/2026',/g,
        `academic_year: targetYear || academicYear || '2025/2026',`
    );

    // Add UI selector
    const uiSelector = `
                        {activeTab !== 'teachers' && (
                            <div className="mb-6 bg-blue-50 border border-blue-200 p-4 rounded-xl">
                                <label className="block text-xs font-bold text-blue-800 mb-2">Tahun Ajaran Tujuan Data (Penting):</label>
                                <select 
                                    className="w-full border border-blue-300 rounded-lg p-2 text-sm bg-white focus:ring-2 focus:ring-blue-500"
                                    value={targetYear}
                                    onChange={(e) => setTargetYear(e.target.value)}
                                >
                                    {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                                    {availableYears.length === 0 && <option value={academicYear || '2025/2026'}>{academicYear || '2025/2026'}</option>}
                                </select>
                            </div>
                        )}
`;
    content = content.replace(
        /\{\/\* OPSI BUAT AKUN GURU \(DITARUH SEBELUM UPLOAD FILE AGAR TERLIHAT\) \*\/\}/g,
        `${uiSelector}\n                {/* OPSI BUAT AKUN GURU (DITARUH SEBELUM UPLOAD FILE AGAR TERLIHAT) */}`
    );

    fs.writeFileSync(file, content);
    console.log('ImportData year patched');
}
