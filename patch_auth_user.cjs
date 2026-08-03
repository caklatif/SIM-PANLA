const fs = require('fs');
let code = fs.readFileSync('./contexts/AuthContext.tsx', 'utf8');

code = code.replace(/signUpData\.user\.id/g, 'signUpData.user?.id');

fs.writeFileSync('./contexts/AuthContext.tsx', code);
