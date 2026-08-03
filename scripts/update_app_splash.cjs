const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../App.tsx');
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('AppSplash')) {
    content = content.replace("import React from 'react';", "import React, { useState } from 'react';\nimport { AnimatePresence } from 'motion/react';\nimport { AppSplash } from './components/AppSplash';");

    const functionTarget = `const App: React.FC = () => {`;
    const functionReplacement = `const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(() => !sessionStorage.getItem('splashShown'));
  const handleSplashFinish = () => {
    sessionStorage.setItem('splashShown', 'true');
    setShowSplash(false);
  };`;
    content = content.replace(functionTarget, functionReplacement);

    const routerTarget = `<HashRouter>`;
    const routerReplacement = `<HashRouter>
          <AnimatePresence>
            {showSplash && <AppSplash key="splash" onFinish={handleSplashFinish} />}
          </AnimatePresence>`;
    content = content.replace(routerTarget, routerReplacement);

    fs.writeFileSync(file, content);
    console.log('App.tsx updated with AppSplash');
}
