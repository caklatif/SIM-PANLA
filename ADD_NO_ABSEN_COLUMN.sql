-- Script untuk menambahkan kolom no_absen ke tabel public.students di Supabase
-- Jalankan script ini di menu "SQL Editor" pada Supabase Dashboard

ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS no_absen INTEGER;

-- Tambahkan indeks untuk performa pengurutan
CREATE INDEX IF NOT EXISTS idx_students_no_absen ON public.students(kelas, no_absen);
