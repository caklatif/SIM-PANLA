const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../index.tsx');
let content = fs.readFileSync(file, 'utf8');

const newContent = content.replace(`window.addEventListener('unhandledrejection', (event) => {`, `
const originalConsoleError = console.error;
console.error = (...args) => {
    if (args[0] && typeof args[0] === 'string' && (args[0].includes('Refresh Token') || args[0].includes('refresh token'))) {
        return;
    }
    if (args[0] && args[0].message && (args[0].message.includes('Refresh Token') || args[0].message.includes('refresh token'))) {
        return;
    }
    originalConsoleError.apply(console, args);
};

window.addEventListener('unhandledrejection', (event) => {`);

fs.writeFileSync(file, newContent);
console.log('Added console.error override to index.tsx');
