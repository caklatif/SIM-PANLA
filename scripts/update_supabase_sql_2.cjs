const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../SUPABASE_SETUP.sql');
let content = fs.readFileSync(file, 'utf8');

content += `\n  BEGIN\n    ALTER TABLE public.students ADD CONSTRAINT students_academic_year_nisn_key UNIQUE (academic_year, nisn);\n  EXCEPTION\n    WHEN duplicate_table THEN null;\n    WHEN duplicate_object THEN null;\n  END;\n`;

fs.writeFileSync(file, content);
console.log('SUPABASE_SETUP.sql updated 2');
