const fs = require('fs');
let code = fs.readFileSync('./contexts/AuthContext.tsx', 'utf8');

code = code.replace(/await fetchProfile\(signUpData\.user\?\.id\);/g, 'await fetchProfile(signUpData.user?.id || "");');

fs.writeFileSync('./contexts/AuthContext.tsx', code);
