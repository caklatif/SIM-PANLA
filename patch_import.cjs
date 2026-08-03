const fs = require('fs');
let code = fs.readFileSync('./pages/UsersData.tsx', 'utf8');

code = code.replace(/import \{ Search, UserCog/g, 'import { Search, UserCog, AlertCircle');

fs.writeFileSync('./pages/UsersData.tsx', code);
