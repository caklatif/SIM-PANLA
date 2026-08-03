const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../components/Layout.tsx');
let content = fs.readFileSync(file, 'utf8');

const targetState = `  const [showTeacherSplash, setShowTeacherSplash] = useState(() => location.state?.justLoggedIn && profile?.role === 'user');

  useEffect(() => {
     if (location.state?.justLoggedIn) {
        const timer = setTimeout(() => {
            navigate(location.pathname, { replace: true, state: {} });
        }, 100);
        return () => clearTimeout(timer);
     }
  }, [location, navigate]);`;

const newState = `  const [showTeacherSplash, setShowTeacherSplash] = useState(false);

  useEffect(() => {
     if (location.state?.justLoggedIn && profile?.role === 'user') {
        setShowTeacherSplash(true);
        const timer = setTimeout(() => {
            navigate(location.pathname, { replace: true, state: {} });
        }, 100);
        return () => clearTimeout(timer);
     }
  }, [location.state?.justLoggedIn, profile?.role, navigate, location.pathname]);`;

content = content.replace(targetState, newState);
fs.writeFileSync(file, content);
console.log('Fixed showTeacherSplash in Layout');
