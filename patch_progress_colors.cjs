const fs = require('fs');
let code = fs.readFileSync('./pages/PublicDashboard.tsx', 'utf8');

code = code.replace(/bg-\[\#f4f7ff\]/g, 'bg-purple-100');
code = code.replace(/rgba\(37,99,235,0\.12\)/g, 'rgba(147, 51, 234, 0.12)'); // shadow color
code = code.replace(/text-\[\#1d4ed8\]/g, 'text-purple-600');
code = code.replace(/bg-\[\#1d4ed8\]/g, 'bg-purple-600');
code = code.replace(/text-\[\#1e3a8a\]/g, 'text-slate-800');
code = code.replace(/text-\[\#1e40af\]/g, 'text-slate-600');
code = code.replace(/bg-purple-50 rounded-full/g, 'bg-purple-100 rounded-full');

fs.writeFileSync('./pages/PublicDashboard.tsx', code);
