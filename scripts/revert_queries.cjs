const fs = require('fs');
const path = require('path');

const PAGES_DIR = path.join(__dirname, '../pages');

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Remove .eq('academic_year', ...) and .eq('semester', ...)
    content = content.replace(/\.eq\('academic_year',\s*academicYear\s*\|\|\s*'[^']+'\)/g, '');
    content = content.replace(/\.eq\('semester',\s*semester\s*\|\|\s*'[^']+'\)/g, '');
    
    // Remove academic_year and semester from inserts
    content = content.replace(/academic_year:\s*academicYear\s*\|\|\s*'[^']+',?/g, '');
    content = content.replace(/semester:\s*semester\s*\|\|\s*'[^']+',?/g, '');

    fs.writeFileSync(filePath, content);
}

fs.readdirSync(PAGES_DIR).forEach(file => {
    if (file.endsWith('.tsx')) {
        processFile(path.join(PAGES_DIR, file));
    }
});
console.log('Queries reverted');
