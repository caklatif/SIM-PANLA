const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../types.ts');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    `classDetails: Record<string, number>;`,
    `classDetails: Record<string, number>;\n  classGenderDetails?: Record<string, { L: number; P: number }>;`
);

fs.writeFileSync(file, content);
console.log('Done update_public_stats_type');
