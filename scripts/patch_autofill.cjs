const fs = require('fs');
const path = require('path');

function patchFile(filePath) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');

    // 1. Update useState for userId
    content = content.replace(/const \[userId, setUserId\] = useState\(''\);/, "const [userId, setUserId] = useState(() => localStorage.getItem('saved_nip') || '');");

    // 2. Save to localStorage on successful login
    // In Login.tsx: handleSubmit
    // In PublicDashboard.tsx: handleLoginSubmit
    const successTarget = /} else \{\n\s*navigate\('\/dashboard'\);\n\s*\}/g;
    content = content.replace(successTarget, "} else {\n        localStorage.setItem('saved_nip', userId);\n        navigate('/dashboard');\n      }");

    // 3. Add autocomplete attributes to user input
    const userTarget = /<input\s+type="text"\s+value=\{userId\}/g;
    content = content.replace(userTarget, '<input\n                                  name="nip"\n                                  id="nip"\n                                  autoComplete="username"\n                                  type="text"\n                                  value={userId}');

    // 4. Add autocomplete attributes to password input
    const passTarget = /<input\s+type=\{showPassword \? "text" : "password"\}\s+value=\{password\}/g;
    content = content.replace(passTarget, '<input\n                                  name="password"\n                                  id="password"\n                                  autoComplete="current-password"\n                                  type={showPassword ? "text" : "password"}\n                                  value={password}');

    fs.writeFileSync(filePath, content);
    console.log(`Patched ${path.basename(filePath)}`);
}

patchFile(path.join(__dirname, '../pages/Login.tsx'));
patchFile(path.join(__dirname, '../pages/PublicDashboard.tsx'));
