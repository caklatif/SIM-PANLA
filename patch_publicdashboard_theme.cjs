const fs = require('fs');
let code = fs.readFileSync('./pages/PublicDashboard.tsx', 'utf8');

// Global background and gradient
code = code.replace(/bg-slate-50/g, 'bg-[#F9F7FF]');
code = code.replace(/from-blue-50\/50/g, 'from-purple-100/60');
code = code.replace(/from-blue-400\/20/g, 'from-purple-400/20');
code = code.replace(/to-blue-600\/30/g, 'to-purple-600/30');
code = code.replace(/bg-blue-500\/10/g, 'bg-purple-500/10');

// Academic year pill
code = code.replace(/bg-blue-600/g, 'bg-purple-600');

// Date calendar icon bg
code = code.replace(/bg-blue-50/g, 'bg-purple-50');

// Time
code = code.replace(/text-blue-600/g, 'text-purple-700');
code = code.replace(/text-blue-500/g, 'text-purple-600');

// Card 7
code = code.replace(/text-blue-50\/80/g, 'text-purple-100/80');
code = code.replace(/text-blue-100\/80/g, 'text-purple-200/80');
code = code.replace(/border-blue-200/g, 'border-purple-200');
code = code.replace(/text-blue-500/g, 'text-purple-500');
code = code.replace(/bg-blue-500/g, 'bg-purple-500');

// Card 8
code = code.replace(/text-emerald-50\/80/g, 'text-purple-100/80');
code = code.replace(/text-emerald-100\/80/g, 'text-purple-200/80');
code = code.replace(/border-emerald-200/g, 'border-purple-200');
code = code.replace(/text-emerald-500/g, 'text-purple-500');
code = code.replace(/bg-emerald-500/g, 'bg-purple-500');

// Card 9
code = code.replace(/text-red-50\/80/g, 'text-purple-100/80');
code = code.replace(/text-red-100\/80/g, 'text-purple-200/80');
code = code.replace(/border-red-200/g, 'border-purple-200');
code = code.replace(/text-red-500/g, 'text-purple-500');
code = code.replace(/bg-red-500/g, 'bg-purple-500');

// Progress bar
code = code.replace(/bg-blue-100/g, 'bg-purple-100');
// The bg-blue-500 is already handled above

// Login Button
code = code.replace(/bg-\[\#3B82F6\]/g, 'bg-purple-600');
code = code.replace(/hover:bg-blue-700/g, 'hover:bg-purple-700');
code = code.replace(/shadow-blue-200/g, 'shadow-purple-200');

// Icons in grid 
code = code.replace(/bg-slate-100/g, 'bg-purple-50');
code = code.replace(/text-slate-400/g, 'text-purple-400');
code = code.replace(/text-slate-500/g, 'text-purple-500');

fs.writeFileSync('./pages/PublicDashboard.tsx', code);
