const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../pages/InputJadwal.tsx');
let content = fs.readFileSync(file, 'utf8');

const t = `                  if (fallbackRes.data && fallbackRes.data.length > 0 && fallbackRes.data[0].academic_year !== undefined) {
                      data = fallbackRes.data.filter(s => s.academic_year === (academicYear || '2025/2026') && s.semester === (semester || 'Ganjil'));
                  } else {
                      data = fallbackRes.data || [];
                  }`;
const r = `                  console.log('Fallback Res:', fallbackRes);
                  if (fallbackRes.data && fallbackRes.data.length > 0 && fallbackRes.data[0].academic_year !== undefined) {
                      data = fallbackRes.data.filter(s => s.academic_year === (academicYear || '2025/2026') && s.semester === (semester || 'Ganjil'));
                  } else {
                      data = fallbackRes.data || [];
                  }
                  console.log('Filtered data:', data);`;

if (content.includes(t)) {
    content = content.replace(t, r);
    fs.writeFileSync(file, content);
    console.log('Injected debug InputJadwal');
}
