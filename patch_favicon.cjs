const fs = require('fs');
const path = 'index.html';
let content = fs.readFileSync(path, 'utf8');

// Replace the icon link to use favicon.ico as well
const target = '<link rel="icon" type="image/png" href="/pwa-192x192.png" />';
const repl = '<link rel="icon" type="image/x-icon" href="/favicon.ico" />\n    <link rel="icon" type="image/png" sizes="192x192" href="/pwa-192x192.png" />';

if (content.includes(target)) {
    content = content.replace(target, repl);
    fs.writeFileSync(path, content, 'utf8');
    console.log('Patched index.html with favicon.ico');
} else {
    // If target not found, maybe it's already there or something else. Let's just insert it before apple-touch-icon
    if (!content.includes('favicon.ico')) {
        content = content.replace('<link rel="apple-touch-icon"', '<link rel="icon" type="image/x-icon" href="/favicon.ico" />\n    <link rel="apple-touch-icon"');
        fs.writeFileSync(path, content, 'utf8');
        console.log('Inserted favicon.ico');
    }
}
