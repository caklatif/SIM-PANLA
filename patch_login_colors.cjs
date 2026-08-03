const fs = require('fs');
let code = fs.readFileSync('./pages/PublicDashboard.tsx', 'utf8');

code = code.replace(/rgba\(37,99,235/g, 'rgba(147,51,234');
code = code.replace(/rgba\(59,130,246/g, 'rgba(168,85,247');

fs.writeFileSync('./pages/PublicDashboard.tsx', code);
