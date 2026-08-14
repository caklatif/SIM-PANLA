-- =========================================================================
-- SCRIPT PERBAIKAN CASCADE DELETE DATA MURID (MUTASI / HAPUS MURID)
-- Jalankan script ini di SQL Editor Supabase jika diperlukan
-- =========================================================================

-- 1. Perbaiki constraint Foreign Key pada tabel attendance_logs
DO $$
BEGIN
  ALTER TABLE public.attendance_logs 
    DROP CONSTRAINT IF EXISTS attendance_logs_student_id_fkey;
    
  ALTER TABLE public.attendance_logs 
    ADD CONSTRAINT attendance_logs_student_id_fkey 
    FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;
EXCEPTION
  WHEN OTHERS THEN RAISE NOTICE 'attendance_logs constraint updated or skipped';
END $$;

-- 2. Perbaiki constraint Foreign Key pada tabel homeroom_attendance
DO $$
BEGIN
  ALTER TABLE public.homeroom_attendance 
    DROP CONSTRAINT IF EXISTS homeroom_attendance_student_id_fkey;
    
  ALTER TABLE public.homeroom_attendance 
    ADD CONSTRAINT homeroom_attendance_student_id_fkey 
    FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;
EXCEPTION
  WHEN OTHERS THEN RAISE NOTICE 'homeroom_attendance constraint updated or skipped';
END $$;

-- 3. Perbaiki constraint Foreign Key pada tabel journal_notes
DO $$
BEGIN
  ALTER TABLE public.journal_notes 
    DROP CONSTRAINT IF EXISTS journal_notes_student_id_fkey;
    
  ALTER TABLE public.journal_notes 
    ADD CONSTRAINT journal_notes_student_id_fkey 
    FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;
EXCEPTION
  WHEN OTHERS THEN RAISE NOTICE 'journal_notes constraint updated or skipped';
END $$;
