const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../components/Layout.tsx');
let content = fs.readFileSync(file, 'utf8');

// Replace imports
content = content.replace(
    /import \{ useTheme \} from '\.\.\/contexts\/ThemeContext'; \/\/ Import Theme Context/,
    `import { getWIBISOString } from '../utils/dateUtils';\nimport { Bell, CheckCircle2, XCircle, X } from 'lucide-react';`
);

// Add state to Layout
content = content.replace(
    /const \[showScrollTop, setShowScrollTop\] = useState\(false\);/,
    `const [showScrollTop, setShowScrollTop] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [hasUnfilled, setHasUnfilled] = useState(false);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const { activeScheduleVersion } = useAuth();
`
);

const fetchNotifsLogic = `
  useEffect(() => {
        if (profile && !isAdmin && !isOperator && !isHeadmaster) {
            const fetchNotifs = async () => {
                try {
                    const dateObj = new Date();
                    const jsDay = dateObj.getDay();
                    const dbDay = jsDay === 0 ? 7 : jsDay;
                    const todayStr = getWIBISOString();
                    const todayStart = \`\${todayStr}T00:00:00+07:00\`;
                    const todayEnd = \`\${todayStr}T23:59:59+07:00\`;

                    let { data: scheds, error: schedErr } = await supabase.from('schedules').select('*')
                        .eq('teacher_id', profile.id)
                        .eq('day_of_week', dbDay)
                        .eq('academic_year', academicYear || '2025/2026')
                        .eq('semester', semester || 'Ganjil')
                        .eq('schedule_version', activeScheduleVersion || 'Utama');
                        
                    if (schedErr && (schedErr.code === '42703' || schedErr.message?.includes('academic_year'))) {
                        const fallback = await supabase.from('schedules').select('*').eq('teacher_id', profile.id).eq('day_of_week', dbDay);
                        if (academicYear === '2025/2026') scheds = fallback.data;
                        else scheds = [];
                    }

                    const { data: journals } = await supabase.from('journals').select('id, kelas, subject, created_at')
                        .eq('teacher_id', profile.id)
                        .eq('academic_year', academicYear || '2025/2026')
                        .eq('semester', semester || 'Ganjil')
                        .gte('created_at', todayStart)
                        .lte('created_at', todayEnd);

                    const jData = journals || [];
                    const notifs = (scheds || []).map((s: any) => {
                        const isFilled = jData.some((j: any) => j.kelas === s.kelas && s.subject.toLowerCase().includes(j.subject.toLowerCase()));
                        return { ...s, isFilled };
                    });
                    
                    notifs.sort((a,b) => parseInt(a.hour) - parseInt(b.hour));
                    setNotifications(notifs);
                    setHasUnfilled(notifs.some(n => !n.isFilled));
                } catch(e) {}
            };
            fetchNotifs();
        }
  }, [profile, academicYear, semester, activeScheduleVersion]);
`;

content = content.replace(
    /const handleLogoutClick = \(\) => \{/,
    `${fetchNotifsLogic}\n  const handleLogoutClick = () => {`
);

// Remove useTheme
content = content.replace(
    /const \{ theme, toggleTheme \} = useTheme\(\); \/\/ Use Theme\n/,
    ''
);

// Remove Theme toggle button
content = content.replace(
    /<button \n\s*onClick=\{toggleTheme\}[\s\S]*?\{theme === 'dark' \? <Sun size=\{18\} \/> : <Moon size=\{18\} \/>\}[\s\S]*?<\/button>/m,
    ''
);

// Desktop top bar theme toggle
content = content.replace(
    /<button onClick=\{toggleTheme\}[\s\S]*?\{theme === 'dark' \? <Sun size=\{18\} \/> : <Moon size=\{18\} \/>\}\n\s*<\/button>/m,
    `{!isAdmin && !isOperator && !isHeadmaster && (
        <button onClick={() => setShowNotifModal(true)} className="relative w-9 h-9 bg-slate-50 dark:bg-slate-700 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-300 border border-slate-200 dark:border-slate-600 transition-transform active:scale-95">
            <Bell size={18} />
            {hasUnfilled && (
                <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 border-2 border-white dark:border-slate-800 rounded-full"></span>
            )}
        </button>
     )}`
);

// Sidebar top toggle
content = content.replace(
    /<button \n\s*onClick=\{toggleTheme\}[\s\S]*?\{theme === 'dark' \? <Sun size=\{18\} \/> : <Moon size=\{18\} \/>\}[\s\S]*?<\/button>/m,
    `{!isAdmin && !isOperator && !isHeadmaster && (
        <button onClick={() => setShowNotifModal(true)} className={\`relative flex items-center gap-3 p-2 rounded-xl transition-all \${collapsed ? 'justify-center' : ''} bg-white text-slate-500 border border-gray-200 hover:scale-105\`}>
            <Bell size={18} />
            {hasUnfilled && (
                <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 border-2 border-white rounded-full"></span>
            )}
            {!collapsed && <span className="text-xs font-bold">Notifikasi</span>}
        </button>
    )}`
);


// Add the Notif Modal logic at the bottom before final </div>
const notifModal = `
      {showNotifModal && (
        <div className="fixed inset-0 z-[9999] flex justify-center items-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in" onClick={() => setShowNotifModal(false)}>
           <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl w-full max-w-sm rounded-3xl shadow-2xl p-5 transform scale-100 transition-all border border-white/50 dark:border-slate-700/50 relative overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100 dark:border-slate-700">
                  <h3 className="text-lg font-extrabold text-slate-800 dark:text-white flex items-center gap-2"><Bell size={20} className="text-blue-500"/> Notifikasi Jurnal</h3>
                  <button onClick={() => setShowNotifModal(false)} className="text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 dark:bg-slate-700 dark:hover:bg-slate-600 p-1 rounded-full transition-colors"><X size={20}/></button>
              </div>
              
              <div className="space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar pr-1">
                  {notifications.length === 0 ? (
                      <div className="text-center py-6">
                          <p className="text-sm font-bold text-gray-500 dark:text-gray-400">Tidak ada jadwal mengajar hari ini.</p>
                      </div>
                  ) : (
                      notifications.map((n, i) => (
                          <div key={i} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-100 dark:border-slate-600">
                              <div>
                                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{n.subject} - Kelas {n.kelas}</p>
                                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Jam ke-{n.hour}</p>
                              </div>
                              <div>
                                  {n.isFilled ? (
                                      <CheckCircle2 size={24} className="text-emerald-500" />
                                  ) : (
                                      <XCircle size={24} className="text-red-500" />
                                  )}
                              </div>
                          </div>
                      ))
                  )}
              </div>
           </div>
        </div>
      )}
`;

content = content.replace(
    /<\/div>\n\s*\);\n\};\n/m,
    `${notifModal}\n    </div>\n  );\n};\n`
);

fs.writeFileSync(file, content);
console.log('Fixed Layout notifications and theme');
