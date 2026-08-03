const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, '../pages');
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
    let content = fs.readFileSync(path.join(pagesDir, file), 'utf8');
    let original = content;

    content = content.replace(/\.eq\('academic_year', academicYear \|\| '2025\/2026'\)\.eq\('academic_year', academicYear \|\| '2025\/2026'\)/g, `.eq('academic_year', academicYear || '2025/2026')`);
    
    if (content !== original) {
        fs.writeFileSync(path.join(pagesDir, file), content);
        console.log(file, 'duplicates fixed');
    }
}
