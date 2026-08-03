const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../SUPABASE_SETUP.sql');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    /DO \$\$\nBEGIN\n  BEGIN\n    ALTER TABLE public\.students ADD CONSTRAINT students_academic_year_nisn_key UNIQUE \(academic_year, nisn\);\n  EXCEPTION\n    WHEN duplicate_table THEN null;\n    WHEN duplicate_object THEN null;\n  END;\nEND \$\$;/g,
    `DO $$\nBEGIN\n  IF NOT EXISTS (\n    SELECT 1 FROM pg_constraint WHERE conname = 'students_academic_year_nisn_key'\n  ) THEN\n    ALTER TABLE public.students ADD CONSTRAINT students_academic_year_nisn_key UNIQUE (academic_year, nisn);\n  END IF;\nEND $$;`
);

fs.writeFileSync(file, content);
console.log('SQL fixed');
