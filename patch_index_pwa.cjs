const fs = require('fs');
let content = fs.readFileSync('index.html', 'utf8');

// Ensure manifest.json is linked
if (!content.includes('manifest.json')) {
    content = content.replace('</head>', '    <link rel="manifest" href="/manifest.json">\n  </head>');
}

fs.writeFileSync('index.html', content, 'utf8');
console.log('Patched index.html with manifest');
