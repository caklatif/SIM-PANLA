const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../App.tsx');
let content = fs.readFileSync(file, 'utf8');

content = content.replace("import { AnimatePresence } from 'motion/react';\n", "");
content = content.replace("import { AppSplash } from './components/AppSplash';\n", "");
content = content.replace("import React, { useState } from 'react';", "import React from 'react';");

const targetState = `  const [showSplash, setShowSplash] = useState(() => !sessionStorage.getItem('splashShown'));
  const handleSplashFinish = () => {
    sessionStorage.setItem('splashShown', 'true');
    setShowSplash(false);
  };`;
content = content.replace(targetState, "");

const targetRender = `          <AnimatePresence>
            {showSplash && <AppSplash key="splash" onFinish={handleSplashFinish} />}
          </AnimatePresence>`;
content = content.replace(targetRender, "");

fs.writeFileSync(file, content);
console.log('App.tsx updated to remove AppSplash');
