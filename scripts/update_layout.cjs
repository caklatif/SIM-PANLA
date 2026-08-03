const fs = require('fs');
const path = require('path');

const layoutFile = path.join(__dirname, '../components/Layout.tsx');
let content = fs.readFileSync(layoutFile, 'utf8');

if (!content.includes('import { LogOut, LayoutDashboard, Grid, User, ChevronRight, MonitorPlay, Moon, Sun, Siren, Activity, Sunset, ArrowUp, AlertCircle, Settings, Database }')) {
    content = content.replace("import { LogOut, LayoutDashboard, Grid, User, ChevronRight, MonitorPlay, Moon, Sun, Siren, Activity, Sunset, ArrowUp, AlertCircle } from 'lucide-react';", "import { LogOut, LayoutDashboard, Grid, User, ChevronRight, MonitorPlay, Moon, Sun, Siren, Activity, Sunset, ArrowUp, AlertCircle, Settings, Database, Users, GraduationCap, Upload, Edit3, Calendar } from 'lucide-react';");
}

if (!content.includes('isAdmin ? (')) {
    const adminMenu = `
                {isAdmin ? (
                    <>
                        <NavItem path="/dashboard" label="Beranda" icon={LayoutDashboard} />
                        <NavItem path="/operator-dashboard" label="Monitor KBM" icon={MonitorPlay} />
                        <NavItem path="/penyimpanan" label="Penyimpanan" icon={Database} />
                        <NavItem path="/settings" label="Pengaturan" icon={Settings} />
                        <div className="pt-4 pb-1">
                            {!collapsed && <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 px-2">Data Master</div>}
                        </div>
                        <NavItem path="/users" label="Data Akun" icon={Users} />
                        <NavItem path="/students" label="Data Siswa" icon={GraduationCap} />
                        <NavItem path="/import-data" label="Import Data" icon={Upload} />
                        <NavItem path="/input-manual" label="Input Manual" icon={Edit3} />
                        <NavItem path="/input-jadwal" label="Input Jadwal" icon={Calendar} />
                        <NavItem path="/profile" label="Profil Saya" icon={User} />
                    </>
                ) : isOperator ? (`;
                
    content = content.replace('{isOperator ? (', adminMenu);
    fs.writeFileSync(layoutFile, content);
    console.log('Layout updated');
} else {
    console.log('Layout already has isAdmin menu');
}

