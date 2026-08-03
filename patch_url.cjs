const fs = require('fs');

const files = ['./pages/ImportData.tsx', './pages/UsersData.tsx'];
for (const file of files) {
    let code = fs.readFileSync(file, 'utf8');
    code = code.replace(/https:\/\/aobgqejpjomgwxiosgin\.supabase\.co/g, 'https://oqdnfhkzneqhvktjqiqe.supabase.co');
    fs.writeFileSync(file, code);
}
