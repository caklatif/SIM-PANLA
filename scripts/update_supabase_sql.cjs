const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../SUPABASE_SETUP.sql');
let content = fs.readFileSync(file, 'utf8');

// Also update the students table definition
content = content.replace(
    /create table if not exists public\.students \([\s\S]*?kelas text not null,/g,
    `create table if not exists public.students (\n  id uuid default gen_random_uuid() primary key,\n  academic_year text default '2024/2025',\n  nisn text not null,\n  nis text,\n  name text not null,\n  kelas text not null,`
);

content += `\n\n-- MIGRATE EXISTING TABLES: Add academic_year to students if it doesn't exist\nDO $$\nBEGIN\n  BEGIN\n    ALTER TABLE public.students ADD COLUMN academic_year text DEFAULT '2024/2025';\n  EXCEPTION\n    WHEN duplicate_column THEN null;\n  END;\n  -- also drop unique constraint on nisn if it exists, to allow same nisn in different academic_year\n  BEGIN\n    ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_nisn_key;\n  EXCEPTION\n    WHEN others THEN null;\n  END;\nEND $$;`;

fs.writeFileSync(file, content);
console.log('SUPABASE_SETUP.sql updated');
