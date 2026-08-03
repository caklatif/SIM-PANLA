const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../contexts/AuthContext.tsx');
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('activeScheduleVersion')) {
    // 1. Add to AuthContextType
    content = content.replace(
        /semester: string;/g,
        `semester: string;\n  activeScheduleVersion: string;`
    );

    // 2. Add to state
    content = content.replace(
        /const \[semester, setSemester\] = useState<string>\('Genap'\);/g,
        `const [semester, setSemester] = useState<string>('Genap');\n  const [activeScheduleVersion, setActiveScheduleVersion] = useState<string>('Utama');`
    );

    // 3. Add to query
    content = content.replace(
        /\['academic_year', 'semester'\]/g,
        `['academic_year', 'semester', 'active_schedule_version']`
    );

    // 4. Update state from DB
    content = content.replace(
        /if \(item\.key === 'semester' && item\.value\) setSemester\(item\.value\);/g,
        `if (item.key === 'semester' && item.value) setSemester(item.value);\n               if (item.key === 'active_schedule_version' && item.value) setActiveScheduleVersion(item.value);`
    );

    // 5. Provide in context
    content = content.replace(
        /academicYear, semester/g,
        `academicYear, semester, activeScheduleVersion`
    );

    fs.writeFileSync(file, content);
    console.log('AuthContext patched with activeScheduleVersion');
} else {
    console.log('AuthContext already patched');
}
