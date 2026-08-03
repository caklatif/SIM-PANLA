const fs = require('fs');
const path = require('path');

const files = [
    'pages/Dashboard.tsx',
    'pages/KinerjaGuru.tsx',
    'pages/OperatorDashboard.tsx',
    'pages/PublicDashboard.tsx',
    'pages/RekapAbsensi.tsx',
    'pages/RekapDhuha.tsx',
    'pages/JurnalForm.tsx',
    'pages/InputManual.tsx',
    'pages/Kedisiplinan.tsx',
    'pages/AbsensiRapor.tsx'
];

const injection = `.eq('semester', semester || 'Ganjil').gte('created_at', semesterStart ? \`\${semesterStart}T00:00:00+07:00\` : '2000-01-01T00:00:00+07:00').lte('created_at', semesterEnd ? \`\${semesterEnd}T23:59:59+07:00\` : '2100-01-01T23:59:59+07:00')`;

files.forEach(f => {
    const filePath = path.join(__dirname, '../', f);
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');

    // Make sure we extract semesterStart and semesterEnd from useAuth() if not already
    if (!content.includes('semesterStart')) {
        content = content.replace(
            /const\s*\{\s*([^}]*?academicYear[^}]*?)\}\s*=\s*useAuth\(\);/g,
            (match, vars) => {
                let newVars = vars;
                if (!newVars.includes('semesterStart')) newVars += ', semesterStart';
                if (!newVars.includes('semesterEnd')) newVars += ', semesterEnd';
                return `const { ${newVars} } = useAuth();`;
            }
        );
    }

    // Replace for journals
    const journalRegex = /(supabase\s*\.from\('journals'\)[\s\S]*?)\.eq\('semester', semester \|\| 'Ganjil'\)/g;
    content = content.replace(journalRegex, `$1${injection}`);

    // Replace for attendance_logs
    const logsRegex = /(supabase\s*\.from\('attendance_logs'\)[\s\S]*?)\.eq\('semester', semester \|\| 'Ganjil'\)/g;
    content = content.replace(logsRegex, `$1${injection}`);

    fs.writeFileSync(filePath, content);
    console.log(`Updated dates in ${f}`);
});
