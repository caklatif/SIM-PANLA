-- ==========================================
-- SCRIPT RESET DATABASE
-- Jalankan di SQL Editor Supabase
-- ==========================================

-- 1. Hapus semua data KBM dan Master
DELETE FROM public.homeroom_attendance;
DELETE FROM public.journal_notes;
DELETE FROM public.attendance_logs;
DELETE FROM public.journals;
DELETE FROM public.schedules;
DELETE FROM public.students;
DELETE FROM public.tabel_guru;

-- 2. Hapus semua akun user dari auth.users
-- (Otomatis akan menghapus profiles karena ada cascade delete)
DELETE FROM auth.users;
