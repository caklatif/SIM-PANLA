const fs = require('fs');
const glob = require('glob');
const path = require('path');

const files = glob.sync('{pages,components,contexts}/**/*.tsx');

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let modified = false;

    // Check if it uses alert or confirm
    if (/([^a-zA-Z0-9_]alert\()/.test(content) || /([^a-zA-Z0-9_]confirm\()/.test(content) || /window\.confirm\(/.test(content)) {
        
        // Add import
        const depth = file.split('/').length - 1;
        const relativePath = depth === 1 ? '../utils/alert' : '../../utils/alert'; // Assuming simple depth, e.g. pages/File.tsx depth=1
        
        if (!content.includes("import { showAlert")) {
            // Find last import
            const lastImportIndex = content.lastIndexOf('import ');
            if (lastImportIndex !== -1) {
                const endOfLastImport = content.indexOf('\n', lastImportIndex);
                content = content.substring(0, endOfLastImport) + `\nimport { showAlert, showConfirm } from '${relativePath}';` + content.substring(endOfLastImport);
            } else {
                content = `import { showAlert, showConfirm } from '${relativePath}';\n` + content;
            }
        }

        // Replace window.confirm
        content = content.replace(/window\.confirm\(/g, 'await showConfirm(');
        // Replace confirm
        content = content.replace(/([^a-zA-Z0-9_])confirm\(/g, '$1await showConfirm(');
        
        // Replace alert
        content = content.replace(/([^a-zA-Z0-9_])alert\(/g, '$1showAlert(');

        modified = true;
    }

    if (modified) {
        fs.writeFileSync(file, content);
        console.log(`Updated ${file}`);
    }
});
