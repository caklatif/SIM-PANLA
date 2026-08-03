const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../pages/AppsMenu.tsx');
let content = fs.readFileSync(file, 'utf8');

// Update imports
content = content.replace(
  /NotebookPen, FileText, ClipboardList, Siren, QrCode, CalendarClock,\s+Database, UserCog, CalendarRange, GraduationCap, Settings, BookX,\s+Keyboard, Sunset/g,
  'BookOpenText, TrendingUp, UserCheck, ShieldAlert, ScanLine, Compass, Database, UserCog, CalendarRange, GraduationCap, Settings, UserMinus, Keyboard, Sun'
);

// Update teacher icons
content = content.replace(/icon=\{NotebookPen\}/g, 'icon={BookOpenText}');
content = content.replace(/icon=\{CalendarClock\}/g, 'icon={Compass}');
content = content.replace(/icon=\{Sunset\}/g, 'icon={Sun}');
content = content.replace(/icon=\{ClipboardList\}/g, 'icon={UserCheck}');
content = content.replace(/icon=\{BookX\}/g, 'icon={UserMinus}');
content = content.replace(/icon=\{FileText\}/g, 'icon={TrendingUp}');
content = content.replace(/icon=\{Siren\}/g, 'icon={ShieldAlert}');
content = content.replace(/icon=\{QrCode\}/g, 'icon={ScanLine}');

// Tweak gradients to be more professional / elegant?
// Or keep gradients as is since only icons were requested.
// We can make them slightly more sophisticated.

fs.writeFileSync(file, content);
console.log('AppsMenu updated');
