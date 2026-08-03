const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../pages/MySchedule.tsx');
let content = fs.readFileSync(file, 'utf8');

// Ensure activeScheduleVersion is extracted from useAuth()
if (!content.includes('activeScheduleVersion')) {
    content = content.replace(
        /const\s*\{\s*([^}]*?academicYear[^}]*?)\}\s*=\s*useAuth\(\);/g,
        (match, vars) => {
            let newVars = vars;
            if (!newVars.includes('activeScheduleVersion')) newVars += ', activeScheduleVersion';
            return `const { ${newVars} } = useAuth();`;
        }
    );
}

// Fix the query
const queryReplacement = `const { data, error } = await supabase
        .from('schedules')
        .select('*')
        .eq('teacher_id', profile?.id)
        .eq('academic_year', academicYear || '2025/2026')
        .eq('semester', semester || 'Ganjil')
        .eq('schedule_version', activeScheduleVersion || 'Utama')
        .order('day_of_week')
        .order('hour');`;

content = content.replace(
    /const \{ data, error \} = await supabase\s*\.from\('schedules'\)\s*\.select\('\*'\)\s*\.eq\('teacher_id', profile\?\.id\)\s*\.order\('day_of_week'\)\s*\.order\('hour'\);/m,
    queryReplacement
);

fs.writeFileSync(file, content);
