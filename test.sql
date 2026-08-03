DO $$
BEGIN
  BEGIN
    CREATE TABLE students (academic_year text, nisn text);
    ALTER TABLE students ADD CONSTRAINT students_academic_year_nisn_key UNIQUE (academic_year, nisn);
  EXCEPTION
    WHEN duplicate_table THEN null;
    WHEN duplicate_object THEN null;
  END;
END $$;
