const fs = require('fs');
const path = 'pages/PublicDashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

const t1 = `        let completedJp = 0;
        if (journalsRes.data) {
            journalsRes.data.forEach((j: any) => {
                if (typeof j.hours === 'string') {
                    const parts = j.hours.split(',').filter((h: string) => h.trim().length > 0);
                    completedJp += parts.length;
                }
            });
        }`;
const r1 = `        let completedJp = 0;
        const classesWithJournalsSet = new Set<string>();
        if (journalsRes.data) {
            journalsRes.data.forEach((j: any) => {
                if (j.kelas) classesWithJournalsSet.add(j.kelas.trim());
                if (typeof j.hours === 'string') {
                    const parts = j.hours.split(',').filter((h: string) => h.trim().length > 0);
                    completedJp += parts.length;
                }
            });
        }`;

const t2 = `            absencePerClass: absencePerClass,
            unfilledKbm: []
        });`;
const r2 = `            absencePerClass: absencePerClass,
            unfilledKbm: [],
            classesWithJournals: Array.from(classesWithJournalsSet)
        });`;

if (content.includes(t1) && content.includes(t2)) {
    content = content.replace(t1, r1);
    content = content.replace(t2, r2);
    fs.writeFileSync(path, content, 'utf8');
    console.log('Patched stats calc');
} else {
    console.log('Target not found', !content.includes(t1) ? 't1' : '', !content.includes(t2) ? 't2' : '');
}
