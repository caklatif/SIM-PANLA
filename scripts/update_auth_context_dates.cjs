const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../contexts/AuthContext.tsx');
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('semesterStart')) {
    // Add to AuthContextType
    content = content.replace(
        /academicYear: string;\n\s*semester: string;\n\s*activeScheduleVersion: string;/,
        `academicYear: string;\n  semester: string;\n  semesterStart: string;\n  semesterEnd: string;\n  activeScheduleVersion: string;`
    );

    // Add state variables
    content = content.replace(
        /const \[academicYear, setAcademicYear\] = useState<string>\('2025\/2026'\);\n\s*const \[semester, setSemester\] = useState<string>\('Genap'\);/,
        `const [academicYear, setAcademicYear] = useState<string>('2025/2026');
  const [semester, setSemester] = useState<string>('Genap');
  const [semesterStart, setSemesterStart] = useState<string>('');
  const [semesterEnd, setSemesterEnd] = useState<string>('');`
    );

    // Fetch the dates
    const fetchDates = `
            const { data: semStart } = await supabase.from('app_settings').select('value').eq('key', 'semester_start').single();
            if (semStart?.value) setSemesterStart(semStart.value);
            const { data: semEnd } = await supabase.from('app_settings').select('value').eq('key', 'semester_end').single();
            if (semEnd?.value) setSemesterEnd(semEnd.value);
`;
    content = content.replace(
        /const \{ data: sem \} = await supabase\.from\('app_settings'\)\.select\('value'\)\.eq\('key', 'semester'\)\.single\(\);\n\s*if \(sem\?\.value\) setSemester\(sem\.value\);/,
        `const { data: sem } = await supabase.from('app_settings').select('value').eq('key', 'semester').single();
            if (sem?.value) setSemester(sem.value);
${fetchDates}`
    );

    // Add to provider value
    content = content.replace(
        /academicYear,\n\s*semester,\n\s*activeScheduleVersion/g,
        `academicYear,\n        semester,\n        semesterStart,\n        semesterEnd,\n        activeScheduleVersion`
    );
}

fs.writeFileSync(file, content);
console.log('Updated AuthContext');
