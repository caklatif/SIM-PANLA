-- ==========================================
-- SETUP DATABASE LENGKAP (SI KBM)
-- Jalankan script ini di SQL Editor Supabase
-- ==========================================

-- 1. TABEL PROFILES (Sinkronisasi dengan Auth Users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  nip text unique,
  full_name text,
  role text default 'user' check (role in ('admin', 'user', 'operator')),
  avatar_url text,
  mengajar_mapel text,
  wali_kelas text,
  password_info text, -- KOLOM BARU: Menyimpan password user (Admin Only)
  created_at timestamptz default now()
);

-- Trigger untuk membuat profile otomatis saat user sign up
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data->>'full_name', 'user');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. TABEL SISWA
create table if not exists public.students (
  id uuid default gen_random_uuid() primary key,
  academic_year text default '2025/2026',
  nisn text not null,
  nis text,
  name text not null,
  kelas text not null,
  gender text, -- L/P
  jenjang text, -- 7, 8, 9
  created_at timestamptz default now()
);

-- 3. TABEL JADWAL (SCHEDULES)
create table if not exists public.schedules (
  academic_year text default '2025/2026',
  semester text default 'Genap',
  schedule_version text default 'Utama',
  id uuid default gen_random_uuid() primary key,
  day_of_week int not null,
  hour text not null,
  kelas text not null,
  subject text not null,
  teacher_id uuid references public.profiles(id),
  teacher_nip text,
  created_at timestamptz default now()
);

-- 4. TABEL JURNAL (JOURNALS)
create table if not exists public.journals (
  academic_year text default '2025/2026',
  semester text default 'Genap',
  schedule_version text default 'Utama',
  id uuid default gen_random_uuid() primary key,
  teacher_id uuid references public.profiles(id),
  kelas text not null,
  subject text not null,
  hours text not null,
  material text,
  cleanliness text,
  validation text, -- hadir_kbm, izin_tugas, inval
  notes text,
  assessment_type text, -- harian, tugas, none
  assessment_missing_students text, -- JSON String
  created_at timestamptz default now()
);

-- 5. TABEL ATTENDANCE LOGS (INPUT DARI GURU MAPEL)
create table if not exists public.attendance_logs (
  academic_year text default '2025/2026',
  semester text default 'Genap',
  schedule_version text default 'Utama',
  id uuid default gen_random_uuid() primary key,
  journal_id uuid references public.journals(id) on delete cascade,
  student_id uuid references public.students(id) on delete cascade,
  student_name text,
  status text check (status in ('S', 'I', 'A', 'D')),
  teacher_name text,
  subject text,
  created_at timestamptz default now()
);

-- 6. TABEL JOURNAL NOTES (UNTUK CATATAN MURID)
create table if not exists public.journal_notes (
  academic_year text default '2025/2026',
  semester text default 'Genap',
  schedule_version text default 'Utama',
  id uuid default gen_random_uuid() primary key,
  journal_id uuid references public.journals(id) on delete cascade, 
  student_id uuid references public.students(id) on delete cascade,
  student_name text,
  type text check (type in ('kedisiplinan', 'keaktifan')),
  category text, -- e.g. "Terlambat", "Bertanya"
  note text,
  follow_up text, -- NEW: Jenis Tindak Lanjut
  created_at timestamptz default now()
);
alter table public.journal_notes alter column journal_id drop not null;

-- SAFE MIGRATION: Tambahkan kolom follow_up jika belum ada (untuk database yang sudah berjalan)
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'journal_notes' and column_name = 'follow_up') then
    alter table public.journal_notes add column follow_up text;
  end if;
end $$;

-- 7. TABEL HOMEROOM ATTENDANCE (ABSENSI HARIAN WALI KELAS - MUTLAK)
create table if not exists public.homeroom_attendance (
  academic_year text default '2025/2026',
  semester text default 'Genap',
  schedule_version text default 'Utama',
  id uuid default gen_random_uuid() primary key,
  date date not null,
  kelas text not null,
  student_id uuid references public.students(id) on delete cascade,
  status text check (status in ('S', 'I', 'A', 'D')),
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  unique(date, student_id) -- Satu siswa hanya punya satu status per hari dari wali kelas
);

-- 8. TABEL GURU (DATA MASTER REFERENSI)
create table if not exists public.tabel_guru (
  id uuid default gen_random_uuid() primary key,
  nip text unique not null,
  nama_lengkap text not null,
  mapel text,
  wali_kelas text,
  created_at timestamptz default now()
);

-- 9. TABEL SETTINGS
create table if not exists public.app_settings (
  key text primary key,
  value text,
  description text
);

-- SEED SETTINGS DEFAULT
insert into public.app_settings (key, value, description)
values 
  ('academic_year', '2025/2026', 'Tahun Ajaran Aktif'),
  ('semester', 'Genap', 'Semester Aktif'),
  ('active_schedule_version', 'Utama', 'Versi Jadwal Aktif'),
  ('headmaster', 'Nama Kepala Sekolah', 'Kepala Sekolah'),
  ('non_effective_days', '[]', 'Hari Libur'),
  ('subjects_list', '["Matematika","Bahasa Indonesia","IPA","IPS","PKn","Bahasa Inggris","PJOK","Seni Budaya","Prakarya","PAI","PAK"]', 'Master Mapel'),
  ('discipline_types', '["Terlambat Masuk","Tidur di Kelas","Tidak Membawa Buku","Mengganggu Teman","Bermain HP","Seragam Tidak Lengkap"]', 'Master Jenis Kedisiplinan'),
  ('follow_up_types', '["Teguran Lisan","Teguran Tertulis","Pindah Tempat Duduk","Konfiskasi HP","Lapor Wali Kelas","Lapor BK"]', 'Master Jenis Tindak Lanjut'),
  ('activity_types', '["Bertanya","Menjawab Pertanyaan","Mengerjakan di Depan","Presentasi","Membantu Teman"]', 'Master Jenis Keaktifan')
on conflict (key) do nothing;


-- ==========================================
-- ROW LEVEL SECURITY (RLS) & POLICIES
-- ==========================================

-- Enable RLS (Aman dijalankan berulang)
alter table public.profiles enable row level security;
alter table public.students enable row level security;
alter table public.schedules enable row level security;
alter table public.journals enable row level security;
alter table public.attendance_logs enable row level security;
alter table public.journal_notes enable row level security;
alter table public.homeroom_attendance enable row level security;
alter table public.tabel_guru enable row level security;
alter table public.app_settings enable row level security;

-- Create a security definer function to avoid infinite recursion
create or replace function public.is_admin() returns boolean as $
begin
  return public.is_admin();
end;
$ language plpgsql security definer;

-- PROFILES
drop policy if exists "Public read profiles" on public.profiles;
create policy "Public read profiles" on public.profiles for select to authenticated, anon using (true);

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile" on public.profiles for update to authenticated using (auth.uid() = id);

-- ADMIN POLICIES FOR PROFILES
drop policy if exists "Admins manage profiles" on public.profiles;
create policy "Admins manage profiles" on public.profiles for all to authenticated using (
  public.is_admin()
);

-- STUDENTS
drop policy if exists "Read students" on public.students;
create policy "Read students" on public.students for select to authenticated, anon using (true);

-- SCHEDULES
drop policy if exists "Read schedules" on public.schedules;
create policy "Read schedules" on public.schedules for select to authenticated, anon using (true);

-- JOURNALS (UPDATED FOR ADMIN IMPORT)
drop policy if exists "Read journals" on public.journals;
create policy "Read journals" on public.journals for select to authenticated, anon using (true);

drop policy if exists "Teachers create journals" on public.journals;
drop policy if exists "Teachers and Admins create journals" on public.journals;
-- Allow insert if user is the teacher owning the journal OR user is an admin
create policy "Teachers and Admins create journals" on public.journals for insert to authenticated with check (
  auth.uid() = teacher_id OR 
  public.is_admin()
);

drop policy if exists "Teachers update own journals" on public.journals;
drop policy if exists "Teachers and Admins update journals" on public.journals;
-- Allow update if user is the teacher owning the journal OR user is an admin
create policy "Teachers and Admins update journals" on public.journals for update to authenticated using (
  auth.uid() = teacher_id OR 
  public.is_admin()
);

-- ATTENDANCE LOGS
drop policy if exists "Read attendance" on public.attendance_logs;
create policy "Read attendance" on public.attendance_logs for select to authenticated, anon using (true);

drop policy if exists "Teachers create attendance" on public.attendance_logs;
create policy "Teachers create attendance" on public.attendance_logs for insert to authenticated with check (true);

drop policy if exists "Teachers delete attendance" on public.attendance_logs;
create policy "Teachers delete attendance" on public.attendance_logs for delete to authenticated using (true);

-- JOURNAL NOTES
drop policy if exists "Read journal notes" on public.journal_notes;
create policy "Read journal notes" on public.journal_notes for select to authenticated, anon using (true);

drop policy if exists "Teachers manage journal notes" on public.journal_notes;
create policy "Teachers manage journal notes" on public.journal_notes for all to authenticated using (true);

-- HOMEROOM ATTENDANCE
drop policy if exists "Read homeroom_attendance" on public.homeroom_attendance;
create policy "Read homeroom_attendance" on public.homeroom_attendance for select to authenticated, anon using (true);

drop policy if exists "Wali Kelas manage homeroom_attendance" on public.homeroom_attendance;
create policy "Wali Kelas manage homeroom_attendance" on public.homeroom_attendance for all to authenticated using (true);

-- TABEL GURU & SETTINGS
drop policy if exists "Read tabel_guru" on public.tabel_guru;
create policy "Read tabel_guru" on public.tabel_guru for select to authenticated, anon using (true);

drop policy if exists "Read settings" on public.app_settings;
create policy "Read settings" on public.app_settings for select to authenticated, anon using (true);


-- ADMIN POLICIES FOR STUDENTS
drop policy if exists "Admins manage students" on public.students;
create policy "Admins manage students" on public.students for all to authenticated using (
  public.is_admin()
);

-- ADMIN POLICIES FOR SCHEDULES
drop policy if exists "Admins manage schedules" on public.schedules;
create policy "Admins manage schedules" on public.schedules for all to authenticated using (
  public.is_admin()
);

-- ADMIN POLICIES FOR SETTINGS
drop policy if exists "Admins manage settings" on public.app_settings;
create policy "Admins manage settings" on public.app_settings for all to authenticated using (
  public.is_admin()
);

-- ADMIN POLICIES FOR GURU
drop policy if exists "Admins manage tabel_guru" on public.tabel_guru;
create policy "Admins manage tabel_guru" on public.tabel_guru for all to authenticated using (
  public.is_admin()
);

-- STORAGE BUCKETS
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict (id) do nothing;

drop policy if exists "Avatar Public Read" on storage.objects;
create policy "Avatar Public Read" on storage.objects for select using ( bucket_id = 'avatars' );

drop policy if exists "Avatar Upload" on storage.objects;
create policy "Avatar Upload" on storage.objects for insert with check ( bucket_id = 'avatars' and auth.role() = 'authenticated' );


-- MIGRATION: Tambahkan academic_year ke tabel-tabel utama
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'schedules' and column_name = 'academic_year') then
    alter table public.schedules add column academic_year text default '2025/2026';
    alter table public.schedules add column semester text default 'Genap';
    alter table public.schedules add column schedule_version text default 'Utama';
    
    alter table public.journals add column academic_year text default '2025/2026';
    alter table public.journals add column semester text default 'Genap';
    
    alter table public.homeroom_attendance add column academic_year text default '2025/2026';
    alter table public.homeroom_attendance add column semester text default 'Genap';
    
    alter table public.journal_notes add column academic_year text default '2025/2026';
    alter table public.journal_notes add column semester text default 'Genap';

    alter table public.attendance_logs add column academic_year text default '2025/2026';
    alter table public.attendance_logs add column semester text default 'Genap';
  end if;
end $$;


-- MIGRATE EXISTING TABLES: Add academic_year to students if it doesn't exist
DO $$
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
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'students_academic_year_nisn_key'
  ) THEN
    ALTER TABLE public.students ADD CONSTRAINT students_academic_year_nisn_key UNIQUE (academic_year, nisn);
  END IF;
END $$;

-- 10. TABEL QR PRESENSI LOGS (LOG SCAN REALTIME PRESENSI QR)
CREATE TABLE IF NOT EXISTS public.qr_presensi_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid,
  student_name text,
  nisn text,
  kelas text,
  mode text DEFAULT 'harian',
  status text DEFAULT 'Hadir',
  subject text,
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
