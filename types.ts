export interface Profile {
  id: string;
  nip: string;
  full_name: string;
  role: 'admin' | 'user' | 'operator' | 'pembina_ekstra';
  mengajar_mapel?: string;
  wali_kelas?: string;
  avatar_url?: string;
  password_info?: string;
  is_active?: boolean;
}

export interface TeacherData {
  id: string;
  nip: string;
  nama_lengkap: string;
  mapel?: string;
  wali_kelas?: string;
}

export interface Student {
  id: string;
  nisn: string;
  nis?: string;
  name: string;
  kelas: string;
  academic_year?: string;
  gender?: 'L' | 'P';
  jenjang?: string;
}

export interface Schedule {
  academic_year?: string;
  semester?: string;
  id: string;
  day_of_week: number;
  hour: string;
  kelas: string;
  subject: string;
  teacher_nip?: string;
  teacher_id?: string;
}

export interface Journal {
  academic_year?: string;
  semester?: string;
  id: string;
  created_at: string;
  teacher_id: string;
  kelas: string;
  subject: string;
  hours: string;
  material: string;
  cleanliness: 'mengarahkan_piket' | 'sudah_bersih';
  validation: 'izin_tugas' | 'hadir_kbm' | 'inval';
  inval_teacher_name?: string;
  notes?: string;
  teacher?: Profile;
}

export interface AttendanceRecord {
  id: string;
  journal_id: string;
  student_name: string;
  status: 'S' | 'I' | 'A' | 'D';
  teacher_name?: string;
  subject?: string;
}

export interface PublicStats {
  count7: number;
  count8: number;
  count9: number;
  classDetails: Record<string, number>;
  classGenderDetails?: Record<string, { L: number; P: number }>;
  totalJpRequired: number;
  completedJp: number;
  absenceCount: number;
  absenceDetails: { S: number; I: number; A: number };
  absencePerClass: Record<string, number>;
  unfilledKbm: { guru: string; kelas: string; jam: string }[];
  classesWithJournals?: string[];
}

export interface AppSetting {
  key: string;
  value: string;
  description?: string;
}

export interface NonEffectiveDay {
  date: string;
  reason: string;
  hours: string;
}
