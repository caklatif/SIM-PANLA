const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../components/Layout.tsx');
let content = fs.readFileSync(file, 'utf8');

content = content.replace("<TeacherLoginSplash key=\"tsplash\" onFinish={() => setShowTeacherSplash(false)} hasUnfilled={hasUnfilled} />", 
"<TeacherLoginSplash key=\"tsplash\" onFinish={() => setShowTeacherSplash(false)} hasUnfilled={hasUnfilled} notifCount={notifications.filter(n => !n.isFilled).length} />");
fs.writeFileSync(file, content);

const file2 = path.join(__dirname, '../components/TeacherLoginSplash.tsx');
let content2 = fs.readFileSync(file2, 'utf8');
content2 = content2.replace("hasUnfilled: boolean }", "hasUnfilled: boolean, notifCount: number }");
content2 = content2.replace("({ onFinish, hasUnfilled })", "({ onFinish, hasUnfilled, notifCount })");
content2 = content2.replace(">\n                     !\n                 </span>", ">\n                     {notifCount}\n                 </span>");
fs.writeFileSync(file2, content2);
console.log('Fixed TeacherLoginSplash with notifCount');
