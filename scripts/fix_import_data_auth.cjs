const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../pages/ImportData.tsx');
let content = fs.readFileSync(file, 'utf8');

// Replace existing useAuth declaration
content = content.replace(
    /const \{ academicYear, semester \} = useAuth\(\);/g,
    `const { academicYear, semester, activeScheduleVersion } = useAuth();`
);

// Remove the one I injected incorrectly if it's there
content = content.replace(
    /const \{ academicYear, semester, activeScheduleVersion \} = useAuth\(\);\n  const \[previewData, setPreviewData\]/g,
    `const [previewData, setPreviewData]`
);

fs.writeFileSync(file, content);
console.log('ImportData auth fixed');
