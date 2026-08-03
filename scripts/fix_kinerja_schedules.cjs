const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../pages/KinerjaGuru.tsx');
let content = fs.readFileSync(file, 'utf8');

// Also import useAuth
if (!content.includes('useAuth')) {
    content = content.replace(
        /import \{ supabase \} from '\.\.\/services\/supabase';/,
        `import { supabase } from '../services/supabase';\nimport { useAuth } from '../contexts/AuthContext';`
    );
}

// Add hook
if (!content.includes('const { academicYear, semester } = useAuth();')) {
    content = content.replace(
        /const KinerjaGuru: React\.FC = \(\) => \{/,
        `const KinerjaGuru: React.FC = () => {\n  const { academicYear, semester } = useAuth();`
    );
}

content = content.replace(
    /supabase\.from\('schedules'\)\.select\('\*'\),/g,
    `supabase.from('schedules').select('*').eq('academic_year', academicYear || '2024/2025').eq('semester', semester || 'Ganjil').then(async (res) => {
                  if (res.error && (res.error.code === '42703' || res.error.message?.includes('academic_year'))) {
                      const fallback = await supabase.from('schedules').select('*');
                      if (academicYear === '2025/2026' && semester === 'Genap') return fallback;
                      return { data: [], error: null };
                  }
                  return res;
              }),`
);

content = content.replace(
    /const \{ data \} = await supabase\.from\('schedules'\)\.select\('\*'\)\.eq\('teacher_id', teacher\.id\)\.order\('day_of_week'\)\.order\('hour'\);/g,
    `let { data, error } = await supabase.from('schedules').select('*').eq('teacher_id', teacher.id).eq('academic_year', academicYear || '2024/2025').eq('semester', semester || 'Ganjil').order('day_of_week').order('hour');
          if (error && (error.code === '42703' || error.message?.includes('academic_year'))) {
              const res = await supabase.from('schedules').select('*').eq('teacher_id', teacher.id).order('day_of_week').order('hour');
              if (academicYear === '2025/2026' && semester === 'Genap') data = res.data;
              else data = [];
          }`
);

fs.writeFileSync(file, content);
console.log('KinerjaGuru.tsx schedules fixed');
