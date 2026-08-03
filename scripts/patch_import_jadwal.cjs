const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../pages/ImportData.tsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Ensure useAuth is imported
if (!content.includes('import { useAuth }')) {
    content = content.replace(
        /import \{ supabase \} from '\.\.\/services\/supabase';/g,
        `import { supabase } from '../services/supabase';\nimport { useAuth } from '../contexts/AuthContext';`
    );
}

// 2. Extract settings from useAuth
if (!content.includes('const { academicYear')) {
    content = content.replace(
        /const \[previewData, setPreviewData\]/g,
        `const { academicYear, semester, activeScheduleVersion } = useAuth();\n  const [previewData, setPreviewData]`
    );
}

// 3. Add to schedulesToInsert
content = content.replace(
    /teacher_id: teacherId,\n/g,
    `teacher_id: teacherId,\n                        academic_year: academicYear || '2025/2026',\n                        semester: semester || 'Ganjil',\n                        schedule_version: activeScheduleVersion || 'Utama',\n`
);

fs.writeFileSync(file, content);
console.log('ImportData.tsx schedules patched');
