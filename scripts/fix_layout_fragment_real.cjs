const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../components/Layout.tsx');
let content = fs.readFileSync(file, 'utf8');

// Remove the erroneous </> from line 427 area
content = content.replace("      )}\n    </>", "      )}\n");

// Add </> at the end of the file properly
const lastDivIndex = content.lastIndexOf('</div>\n  );');
if (lastDivIndex !== -1) {
    content = content.substring(0, lastDivIndex) + '</div>\n    </>\n  );' + content.substring(lastDivIndex + 11);
}

fs.writeFileSync(file, content);
console.log('Fixed Layout fragment for real');
