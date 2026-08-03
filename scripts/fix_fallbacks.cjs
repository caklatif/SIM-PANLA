const fs = require('fs');
const path = require('path');

function fixFile(filename) {
    const file = path.join(__dirname, '../pages/', filename);
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf8');

    content = content.replace(/error\.code === 'PGRST204'/g, "(error.code === '42703' || error.message?.includes('academic_year') || error.message?.includes('semester'))");
    content = content.replace(/schedError\.code === 'PGRST204'/g, "(schedError.code === '42703' || schedError.message?.includes('academic_year') || schedError.message?.includes('semester'))");
    content = content.replace(/journalError\.code === 'PGRST204'/g, "(journalError.code === '42703' || journalError.message?.includes('academic_year') || journalError.message?.includes('semester'))");
    content = content.replace(/recError\.code === 'PGRST204'/g, "(recError.code === '42703' || recError.message?.includes('academic_year') || recError.message?.includes('semester'))");
    content = content.replace(/attError\.code === 'PGRST204'/g, "(attError.code === '42703' || attError.message?.includes('academic_year') || attError.message?.includes('semester'))");
    content = content.replace(/noteError\.code === 'PGRST204'/g, "(noteError.code === '42703' || noteError.message?.includes('academic_year') || noteError.message?.includes('semester'))");
    content = content.replace(/journError\.code === 'PGRST204'/g, "(journError.code === '42703' || journError.message?.includes('academic_year') || journError.message?.includes('semester'))");

    fs.writeFileSync(file, content);
    console.log(filename, 'fixed');
}

['InputJadwal.tsx', 'InputManual.tsx', 'JurnalForm.tsx', 'Kedisiplinan.tsx', 'KinerjaGuru.tsx', 'OperatorDashboard.tsx', 'PublicDashboard.tsx'].forEach(fixFile);
