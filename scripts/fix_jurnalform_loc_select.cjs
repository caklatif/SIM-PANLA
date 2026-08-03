const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../pages/JurnalForm.tsx');
let content = fs.readFileSync(file, 'utf8');

const target = `useEffect(() => { fetchInitData(); }, [profile]);`;

const rep = `useEffect(() => { fetchInitData(); }, [profile]);

  useEffect(() => {
    if (todaySchedules.length > 0 && location.state?.scheduleId && !initLoading) {
      handleScheduleSelect(location.state.scheduleId);
      // clear state so it doesn't re-trigger on remounts
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [todaySchedules, location.state, initLoading]);`;

content = content.replace(target, rep);

fs.writeFileSync(file, content);
console.log('Fixed JurnalForm prefill schedule 2');
