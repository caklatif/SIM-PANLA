const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../SUPABASE_SETUP.sql');
let content = fs.readFileSync(file, 'utf8');

// Replace 2024/2025 with 2025/2026 for the default values in migration and table creations
content = content.replace(/'2024\/2025'/g, "'2025/2026'");

fs.writeFileSync(file, content);
console.log('SUPABASE_SETUP.sql updated');
