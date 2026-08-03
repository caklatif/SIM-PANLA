const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../SUPABASE_SETUP.sql');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/-- MIGRATE EXISTING TABLES:[\s\S]*$/, 
`-- MIGRATE EXISTING TABLES: Add academic_year to students if it doesn't exist
DO $$$$
BEGIN
  BEGIN
    ALTER TABLE public.students ADD COLUMN academic_year text DEFAULT '2025/2026';
  EXCEPTION
    WHEN duplicate_column THEN null;
  END;
  
  -- also drop unique constraint on nisn if it exists, to allow same nisn in different academic_year
  BEGIN
    ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_nisn_key;
  EXCEPTION
    WHEN others THEN null;
  END;
END $$$$;

DO $$$$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'students_academic_year_nisn_key'
  ) THEN
    ALTER TABLE public.students ADD CONSTRAINT students_academic_year_nisn_key UNIQUE (academic_year, nisn);
  END IF;
END $$$$;
`);

fs.writeFileSync(file, content);
console.log('SQL fixed completely');
