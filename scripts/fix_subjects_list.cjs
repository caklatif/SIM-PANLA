const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../pages/UsersData.tsx');
let content = fs.readFileSync(file, 'utf8');

// In fetchProfiles, we fetch settingsRes for subjects_list
const target = `try { setSubjectsList(JSON.parse(settingsRes.data.value)); } catch(e) { console.error("Parse subjects error", e); }`;
const replacement = `try { 
            let parsed = JSON.parse(settingsRes.data.value);
            if (!parsed.includes('Sabtu bersama Wali Kelas')) {
                parsed.push('Sabtu bersama Wali Kelas');
            }
            setSubjectsList(parsed); 
        } catch(e) { console.error("Parse subjects error", e); }`;

content = content.replace(target, replacement);

fs.writeFileSync(file, content);
console.log('Patched subjectsList');
