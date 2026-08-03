const fs = require('fs');
let code = fs.readFileSync('./services/supabase.ts', 'utf8');

code = code.replace(/https:\/\/oqdnfhkzneqhvkjtjiqe\.supabase\.co/g, 'https://oqdnfhkzneqhvktjqiqe.supabase.co');

fs.writeFileSync('./services/supabase.ts', code);
