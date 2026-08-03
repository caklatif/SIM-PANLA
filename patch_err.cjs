const fs = require('fs');
const path = 'pages/PublicDashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(`catch (err) { console.error(err); }`, `catch (err) { console.error('FETCH ERROR:', err); alert('Fetch error: ' + (err.message || JSON.stringify(err))); }`);

fs.writeFileSync(path, content, 'utf8');
