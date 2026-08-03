const fs = require('fs');
const path = 'pages/PublicDashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

const t1 = `supabase.from('journals').select('hours').gte('created_at', startOfDay)`;
const r1 = `supabase.from('journals').select('hours, kelas').gte('created_at', startOfDay)`;

if (content.includes(t1)) {
    content = content.replace(t1, r1);
    fs.writeFileSync(path, content, 'utf8');
    console.log('Patched journal query');
} else {
    console.log('Target t1 not found');
}
