const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../pages/MySchedule.tsx');
let content = fs.readFileSync(file, 'utf8');

const t = `      if (error) throw error;
      if (data) setSchedules(data);`;
const r = `      if (error) throw error;
      console.log('fetchSchedule result:', { data, profile_id: profile?.id, academicYear, semester, activeScheduleVersion });
      if (data) setSchedules(data);`;

if (content.includes(t)) {
    content = content.replace(t, r);
    fs.writeFileSync(file, content);
    console.log('Injected debug');
}
