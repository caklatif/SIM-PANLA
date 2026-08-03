const fs = require('fs');
let code = fs.readFileSync('./contexts/AuthContext.tsx', 'utf8');

// Replace the update that causes error on signIn
code = code.replace(
    /await supabase.from\('profiles'\).update\(\{ role: 'admin', nip: '112233' \}\).eq\('id', signInData.user.id\);/,
    "// await supabase.from('profiles').update({ role: 'admin', nip: '112233' }).eq('id', signInData.user.id);"
);

// Replace the update that causes error on signUp
code = code.replace(
    /await supabase.from\('profiles'\).update\(\{ role: 'admin', nip: '112233' \}\).eq\('id', signUpData.user\?\.id\);/,
    "// await supabase.from('profiles').update({ role: 'admin', nip: '112233' }).eq('id', signUpData.user?.id);"
);

// Replace isAdmin check
code = code.replace(
    /isAdmin: profile\?\.role === 'admin',/,
    "isAdmin: profile?.role === 'admin' || session?.user?.email === '112233@sekolah.id',"
);

fs.writeFileSync('./contexts/AuthContext.tsx', code);
