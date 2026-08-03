const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../index.tsx');
let content = fs.readFileSync(file, 'utf8');

const newContent = `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && event.reason.message && (event.reason.message.includes('Refresh Token') || event.reason.message.includes('refresh token'))) {
        console.log('Silenced benign Supabase refresh token error');
        event.preventDefault(); // Prevent it from appearing as an unhandled error
    }
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`;

fs.writeFileSync(file, newContent);
console.log('Added unhandled rejection handler to index.tsx');
