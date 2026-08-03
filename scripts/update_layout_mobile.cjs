const fs = require('fs');
const path = require('path');

const layoutFile = path.join(__dirname, '../components/Layout.tsx');
let content = fs.readFileSync(layoutFile, 'utf8');

if (!content.includes('Mobile Nav for Admin')) {
    const adminMobileNav = `
      {/* Mobile Nav for Admin */}
      {showNav && isAdmin && (
           <div className="md:hidden fixed bottom-6 left-0 right-0 z-40 flex justify-center pointer-events-none pb-[env(safe-area-inset-bottom)]">
                <nav className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border border-slate-200 dark:border-slate-700 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex items-center p-2 pointer-events-auto gap-2">
                    <BottomNavItem path="/dashboard" label="Beranda" icon={LayoutDashboard} />
                    <BottomNavItem path="/penyimpanan" label="Simpan" icon={Database} />
                    <BottomNavItem path="/settings" label="Pengaturan" icon={Settings} />
                    <BottomNavItem path="/profile" label="Profil" icon={User} />
                </nav>
           </div>
      )}
      {/* Mobile Nav for Operator */}`;
      
    content = content.replace('{/* Mobile Nav for Operator */}', adminMobileNav);
    
    // Also change {showNav && !isOperator && ( to {showNav && !isOperator && !isAdmin && (
    content = content.replace('{showNav && !isOperator && (', '{showNav && !isOperator && !isAdmin && (');
    content = content.replace('{showNav && isOperator && (', '{showNav && isOperator && !isAdmin && (');
    
    fs.writeFileSync(layoutFile, content);
    console.log('Mobile nav updated');
}

