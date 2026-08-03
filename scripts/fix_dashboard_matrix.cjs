const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../pages/Dashboard.tsx');
let content = fs.readFileSync(file, 'utf8');

const target = `              return { teacher, scheduleMap };
          });`;
const replacement = `              return { teacher, scheduleMap };
          });
          
          // Filter matrix: hanya tampilkan guru yang memiliki jadwal di hari ini
          const filteredMatrix = matrix.filter(item => 
              Object.values(item.scheduleMap).some(slot => slot.hasSchedule)
          );
          
          setMatrixData(filteredMatrix);`;

content = content.replace(target, replacement);

fs.writeFileSync(file, content);
console.log('Patched Dashboard matrix filter');
