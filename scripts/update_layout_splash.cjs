const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../components/Layout.tsx');
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('TeacherLoginSplash')) {
    content = content.replace("import { useNavigate, useLocation } from 'react-router-dom';", "import { useNavigate, useLocation } from 'react-router-dom';\nimport { TeacherLoginSplash } from './TeacherLoginSplash';\nimport { AnimatePresence } from 'motion/react';");

    const functionTarget = `const [showNotifModal, setShowNotifModal] = useState(false);`;
    const functionReplacement = `const [showNotifModal, setShowNotifModal] = useState(false);
  const [showTeacherSplash, setShowTeacherSplash] = useState(() => location.state?.justLoggedIn && profile?.role === 'guru');

  useEffect(() => {
     if (location.state?.justLoggedIn) {
        const timer = setTimeout(() => {
            navigate(location.pathname, { replace: true, state: {} });
        }, 100);
        return () => clearTimeout(timer);
     }
  }, [location, navigate]);`;
    content = content.replace(functionTarget, functionReplacement);

    const renderTarget = `<div className="min-h-screen`;
    const renderReplacement = `<AnimatePresence>
        {showTeacherSplash && <TeacherLoginSplash key="tsplash" onFinish={() => setShowTeacherSplash(false)} hasUnfilled={hasUnfilled} />}
      </AnimatePresence>
      <div className="min-h-screen`;
    content = content.replace(renderTarget, renderReplacement);

    fs.writeFileSync(file, content);
    console.log('Layout.tsx updated with TeacherLoginSplash');
}
