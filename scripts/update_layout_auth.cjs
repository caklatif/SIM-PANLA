const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../components/Layout.tsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Get semester and academicYear from useAuth
content = content.replace(
  'const { signOut, profile, isOperator, isAdmin } = useAuth();',
  'const { signOut, profile, isOperator, isAdmin, academicYear, semester, activeScheduleVersion } = useAuth();'
);

// 2. Remove separate useAuth call for activeScheduleVersion
content = content.replace(
  'const { activeScheduleVersion } = useAuth();',
  ''
);

// 3. Remove local state for semester and academicYear
content = content.replace(/const \[semester, setSemester\] = useState\('...'\);\n/, '');
content = content.replace(/const \[academicYear, setAcademicYear\] = useState\('...'\);\n/, '');

// 4. Remove fetchSettings inside Layout.tsx
const fetchSettingsRegex = /const fetchSettings = async \(\) => \{[\s\S]*?fetchSettings\(\);/;
content = content.replace(fetchSettingsRegex, '');

// 5. Change setHasUnfilled logic to check if there are ANY schedules today, as requested.
// Wait, the requested was: "tanda merah jika ada jadwal mengajar di hari ketika mengakses"
// If they mean unfilled: we can leave it as notifs.some(n => !n.isFilled).
// I will change it to notifs.some(n => !n.isFilled) just in case, wait, it was ALREADY that.
// Why did it not work? Because academicYear was '...'! Since I removed the local state, it will now correctly be '2025/2026' when loading!
// BUT wait, AuthContext academicYear is default '2025/2026'. AuthContext takes time to load from supabase, but while it's loading, it is '2025/2026'.
// So when Layout mounts, academicYear is '2025/2026'. The schedule query will run immediately!
// Let's modify the useEffect for fetchNotifs to depend on the context ones. It already does!

fs.writeFileSync(file, content);
console.log('Updated Layout.tsx auth states');
