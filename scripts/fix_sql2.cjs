const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../SUPABASE_SETUP.sql');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    /END \$;\n\nDO \$\nBEGIN/g,
    `END $$$$;\n\nDO $$$$\nBEGIN`
);

content = content.replace(
    /END \$;\n$/g,
    `END $$$$;\n`
);

fs.writeFileSync(file, content);
console.log('SQL fixed again');
