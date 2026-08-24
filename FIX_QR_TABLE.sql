-- TABEL QR PRESENSI LOGS (LOG SCAN REALTIME PRESENSI QR)
CREATE TABLE IF NOT EXISTS public.qr_presensi_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid,
  student_name text,
  nisn text,
  kelas text,
  mode text DEFAULT 'harian',
  status text DEFAULT 'Hadir',
  subject text,
  notes text,
  scanned_at timestamptz DEFAULT now(),
  academic_year text DEFAULT '2025/2026',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.qr_presensi_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read qr_presensi_logs" ON public.qr_presensi_logs;
CREATE POLICY "Public read qr_presensi_logs" ON public.qr_presensi_logs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated insert qr_presensi_logs" ON public.qr_presensi_logs;
CREATE POLICY "Authenticated insert qr_presensi_logs" ON public.qr_presensi_logs FOR INSERT TO authenticated, anon WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated update qr_presensi_logs" ON public.qr_presensi_logs;
CREATE POLICY "Authenticated update qr_presensi_logs" ON public.qr_presensi_logs FOR UPDATE TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "Authenticated delete qr_presensi_logs" ON public.qr_presensi_logs;
CREATE POLICY "Authenticated delete qr_presensi_logs" ON public.qr_presensi_logs FOR DELETE TO authenticated, anon USING (true);
