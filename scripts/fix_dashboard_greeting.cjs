const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../pages/Dashboard.tsx');
let content = fs.readFileSync(file, 'utf8');

const getGreetingLogic = `
    const currentHour = new Date().getHours();
    let greeting = 'Selamat Malam';
    if (currentHour >= 5 && currentHour < 11) greeting = 'Selamat Pagi';
    else if (currentHour >= 11 && currentHour < 15) greeting = 'Selamat Siang';
    else if (currentHour >= 15 && currentHour < 18) greeting = 'Selamat Sore';
`;

// Insert the logic before the first `return (`
content = content.replace(
    /return \(\s*<Layout>/,
    `${getGreetingLogic}
  return (
    <Layout>`
);

content = content.replace(
    /<div>\s*<h1 className="text-xl md:text-2xl font-extrabold leading-tight tracking-tight">\{profile\?\.full_name\}<\/h1>/,
    `<div>
                        <p className="text-blue-100 text-sm font-bold opacity-90 mb-0.5">{greeting},</p>
                        <h1 className="text-xl md:text-2xl font-extrabold leading-tight tracking-tight">{profile?.full_name}</h1>`
);

fs.writeFileSync(file, content);
console.log('Fixed Dashboard greeting');
