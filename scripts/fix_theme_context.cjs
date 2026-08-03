const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../contexts/ThemeContext.tsx');
const newContent = `import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    const root = window.document.documentElement;
    // Force remove dark mode class that might have been cached
    root.classList.remove('dark');
    // Clear old localStorage setting
    localStorage.removeItem('theme');
  }, []);

  const toggleTheme = () => {
    // Disabled functionality
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
`;

fs.writeFileSync(file, newContent);
console.log('Fixed ThemeContext');
