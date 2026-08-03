const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../pages/StudentsData.tsx');
let content = fs.readFileSync(file, 'utf8');

// Add import
if (!content.includes('useAuth')) {
    content = content.replace(
        /import \{ supabase \} from '\.\.\/services\/supabase';/,
        `import { supabase } from '../services/supabase';\nimport { useAuth } from '../contexts/AuthContext';`
    );
}

// Add hook
if (!content.includes('const { academicYear } = useAuth();')) {
    content = content.replace(
        /const \[students, setStudents\] = useState<Student\[\]>\(\[\]\);/,
        `const { academicYear } = useAuth();\n  const [students, setStudents] = useState<Student[]>([]);`
    );
}

// Filter fetch query
content = content.replace(
    /let query = supabase\.from\('students'\)\.select\('\*'\);/g,
    `let query = supabase.from('students').select('*').eq('academic_year', academicYear || '2024/2025');`
);
// Also fallback if column doesn't exist
content = content.replace(
    /const \{ data, error \} = await query;/g,
    `let { data, error } = await query;
      if (error && (error.code === '42703' || error.message?.includes('academic_year'))) {
          const res = await supabase.from('students').select('*');
          data = res.data;
          error = res.error;
      }`
);

// Mutasi Keluar
content = content.replace(
    /const \{ data \} = await supabase\.from\('students'\)\.select\('\*'\)\.eq\('kelas', mutasiKeluarData\.kelas\)\.order\('name'\);/g,
    `let { data, error } = await supabase.from('students').select('*').eq('kelas', mutasiKeluarData.kelas).eq('academic_year', academicYear || '2024/2025').order('name');
          if (error && (error.code === '42703' || error.message?.includes('academic_year'))) {
              const res = await supabase.from('students').select('*').eq('kelas', mutasiKeluarData.kelas).order('name');
              data = res.data;
          }`
);

// Save form (insert/update)
content = content.replace(
    /const payload = \{[\s\S]*?jenjang: formData\.jenjang\s*\};/g,
    `const payload = { 
                nisn: formData.nisn, 
                nis: formData.nis, 
                name: formData.name, 
                kelas: formData.kelas,
                gender: formData.gender,
                jenjang: formData.jenjang,
                academic_year: academicYear || '2024/2025'
            };`
);

content = content.replace(
    /const \{ data, error \} = await supabase\.from\('students'\)\.insert\(payload\)\.select\(\)\.single\(\);/g,
    `let { data, error } = await supabase.from('students').insert(payload).select().single();
              if (error && (error.code === '42703' || error.message?.includes('academic_year'))) {
                  const { academic_year, ...rest } = payload as any;
                  const res = await supabase.from('students').insert(rest).select().single();
                  data = res.data;
                  error = res.error;
              }`
);

fs.writeFileSync(file, content);
console.log('StudentsData.tsx updated');
