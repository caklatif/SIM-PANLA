const fs = require('fs');
const path = require('path');

const PAGES_DIR = path.join(__dirname, '../pages');

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Only apply if it imports useAuth and has academicYear
    if (content.includes('useAuth') && !content.includes('academicYear')) {
        content = content.replace(/const \{ ([^}]+) \} = useAuth\(\);/, 'const { $1, academicYear, semester } = useAuth();');
    }
    
    // We only want to inject .eq('academic_year', academicYear) for select queries on specific tables.
    // It's safer to just do this manually or with a very specific regex if we know the pattern.
    // Actually, maybe I can just do this manually for the most important pages.
    // Let's just list the tables: 'schedules', 'journals', 'homeroom_attendance', 'journal_notes', 'attendance_logs'
    
    // Just save it back to see.
    fs.writeFileSync(filePath, content);
}

fs.readdirSync(PAGES_DIR).forEach(file => {
    if (file.endsWith('.tsx')) {
        processFile(path.join(PAGES_DIR, file));
    }
});
console.log('useAuth updated');
