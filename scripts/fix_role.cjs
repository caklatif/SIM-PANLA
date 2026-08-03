const fs = require('fs');
const path = require('path');

const layoutFile = path.join(__dirname, '../components/Layout.tsx');
let layoutContent = fs.readFileSync(layoutFile, 'utf8');
layoutContent = layoutContent.replace("profile?.role === 'guru'", "profile?.role === 'user'");
fs.writeFileSync(layoutFile, layoutContent);

const dashboardFile = path.join(__dirname, '../pages/PublicDashboard.tsx');
let dashboardContent = fs.readFileSync(dashboardFile, 'utf8');
dashboardContent = dashboardContent.replace("profile?.role === 'guru'", "profile?.role === 'user'");
fs.writeFileSync(dashboardFile, dashboardContent);

console.log('Fixed role guru -> user');
