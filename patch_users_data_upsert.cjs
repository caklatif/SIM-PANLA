const fs = require('fs');
let code = fs.readFileSync('./pages/UsersData.tsx', 'utf8');

code = code.replace(
    /await supabase\.from\('profiles'\)\.insert\(\{([\s\S]*?)\}\);/g,
    'await adminClient.from(\'profiles\').upsert({$1});'
);

fs.writeFileSync('./pages/UsersData.tsx', code);
