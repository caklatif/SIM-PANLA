const fs = require('fs');
const path = require('path');

const files = [
    'pages/Kedisiplinan.tsx',
    'pages/Dashboard.tsx',
    'pages/KinerjaGuru.tsx',
    'pages/OperatorDashboard.tsx',
    'pages/PublicDashboard.tsx',
    'pages/JurnalForm.tsx',
    'pages/InputManual.tsx'
];

const injectionDate = `.eq('semester', semester || 'Ganjil').gte('date', semesterStart ? \`\${semesterStart}\` : '2000-01-01').lte('date', semesterEnd ? \`\${semesterEnd}\` : '2100-01-01')`;
const injectionCreatedAt = `.eq('semester', semester || 'Ganjil').gte('created_at', semesterStart ? \`\${semesterStart}T00:00:00+07:00\` : '2000-01-01T00:00:00+07:00').lte('created_at', semesterEnd ? \`\${semesterEnd}T23:59:59+07:00\` : '2100-01-01T23:59:59+07:00')`;


files.forEach(f => {
    const filePath = path.join(__dirname, '../', f);
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');

    // Replace for homeroom_attendance
    const hrRegex = /(supabase\s*\.from\('homeroom_attendance'\)[\s\S]*?)\.eq\('semester', semester \|\| 'Ganjil'\)/g;
    content = content.replace(hrRegex, `$1${injectionDate}`);

    // Replace for journal_notes
    const jnRegex = /(supabase\s*\.from\('journal_notes'\)[\s\S]*?)\.eq\('semester', semester \|\| 'Ganjil'\)/g;
    content = content.replace(jnRegex, `$1${injectionCreatedAt}`);

    fs.writeFileSync(filePath, content);
    console.log(`Updated dates 2 in ${f}`);
});
