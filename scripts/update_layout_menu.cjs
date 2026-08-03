const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../components/Layout.tsx');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    /<NavItem path="\/penyimpanan" label="Penyimpanan" icon=\{Database\} \/>/g,
    `<NavItem path="/penyimpanan" label="Buat T.A" icon={Database} />`
);

content = content.replace(
    /<BottomNavItem path="\/penyimpanan" label="Simpan" icon=\{Database\} \/>/g,
    `<BottomNavItem path="/penyimpanan" label="Buat T.A" icon={Database} />`
);

fs.writeFileSync(file, content);
console.log('Layout menu updated');
