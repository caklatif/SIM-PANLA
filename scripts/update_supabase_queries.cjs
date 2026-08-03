const fs = require('fs');
const path = require('path');

const PAGES_DIR = path.join(__dirname, '../pages');

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Add useAuth if not present
    if (!content.includes('academicYear') && content.includes('useAuth')) {
        content = content.replace(/const \{\s*([^}]+)\s*\} = useAuth\(\);/, 'const { $1, academicYear, semester } = useAuth();');
    }

    // A simple hack: we can just add a global filter to the supabase client for this session?
    // Supabase doesn't support global client filters out of the box.
    // Let's replace common patterns for 'schedules', 'journals', 'attendance_logs', 'journal_notes', 'homeroom_attendance'
    
    const tables = ['schedules', 'journals', 'attendance_logs', 'journal_notes', 'homeroom_attendance'];
    
    tables.forEach(table => {
        // Pattern: supabase.from('table').select(...)
        const regex = new RegExp(`supabase\\.from\\(\\'${table}\\'\\)\\.select\\(([^)]*)\\)`, 'g');
        content = content.replace(regex, `supabase.from('${table}').select($1).eq('academic_year', academicYear || '2024/2025').eq('semester', semester || 'Genap')`);
        
        // Also .select('*', { count: 'exact' })
        // Just match supabase.from('table').select(...) precisely.
    });

    fs.writeFileSync(filePath, content);
}

fs.readdirSync(PAGES_DIR).forEach(file => {
    if (file.endsWith('.tsx')) {
        processFile(path.join(PAGES_DIR, file));
    }
});
console.log('Queries updated');
