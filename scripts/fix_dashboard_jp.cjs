const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../pages/PublicDashboard.tsx');
let content = fs.readFileSync(file, 'utf8');

const replacement = `
    const todayObj = new Date(todayStr);
    const jsDay = todayObj.getDay();
    let jpPerClass = 0;
    if (jsDay === 1) jpPerClass = 7;
    else if (jsDay >= 2 && jsDay <= 4) jpPerClass = 8;
    else if (jsDay === 5) jpPerClass = 5;
    else if (jsDay === 6) jpPerClass = 6;
    
    const calculatedTotalJp = jpPerClass * 24;

    try {`;

content = content.replace('try {', replacement);
content = content.replace('totalJpRequired: 240,', 'totalJpRequired: calculatedTotalJp,');

fs.writeFileSync(file, content);
console.log('Fixed totalJpRequired in PublicDashboard.tsx');
