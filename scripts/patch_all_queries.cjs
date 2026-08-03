const fs = require('fs');
const path = require('path');

const files = [
    'pages/Dashboard.tsx',
    'pages/KinerjaGuru.tsx',
    'pages/OperatorDashboard.tsx',
    'pages/PublicDashboard.tsx',
    'pages/RekapAbsensi.tsx',
    'pages/RekapDhuha.tsx',
    'pages/LaporanJurnal.tsx',
    'pages/JurnalForm.tsx'
];

files.forEach(f => {
    const filePath = path.join(__dirname, '../', f);
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');

    // Make sure we extract semesterStart and semesterEnd from useAuth()
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
        fs.writeFileSync(filePath, content);
        console.log(`Updated auth destructuring in ${f}`);
    }
});
