/**
 * Utility terpusat untuk memvalidasi dan memfilter akun yang berstatus GURU resmi.
 * 
 * Aturan Filter:
 * 1. Tidak menampilkan Admin / Administrator (role admin, nama admin, atau NIP 112233)
 * 2. Tidak menampilkan Operator Sekolah (role operator atau nama mengandung operator/tata usaha)
 * 3. Tidak menampilkan Pembina Ekstrakurikuler non-guru / akun penugasan khusus (NIP 801-810, Program Sekolah)
 * 4. Hanya menampilkan guru yang memiliki NIP valid resmi (minimal 5 karakter, bukan null/kosong)
 */

export interface TeacherFilterable {
  id?: string;
  role?: string | null;
  nip?: string | null;
  full_name?: string | null;
  mengajar_mapel?: string | null;
}

export const isOfficialTeacher = (p: TeacherFilterable | null | undefined): boolean => {
  if (!p) return false;

  const role = (p.role || '').toLowerCase().trim();
  const name = (p.full_name || '').toLowerCase().trim();
  const nip = (p.nip || '').trim();
  const mapel = (p.mengajar_mapel || '').toLowerCase().trim();

  // 1. Filter Akun Admin / Administrator
  if (
    role === 'admin' ||
    role === 'administrator' ||
    name === 'admin' ||
    name === 'administrator' ||
    name.includes('administrator') ||
    name === 'admin sekolah' ||
    nip === '112233'
  ) {
    return false;
  }

  // 2. Filter Akun Operator Sekolah / TU
  if (
    role === 'operator' ||
    role === 'operator sekolah' ||
    role === 'tu' ||
    name.includes('operator') ||
    name.includes('tata usaha')
  ) {
    return false;
  }

  // 3. Filter Akun Khusus Pembina Ekstrakurikuler Non-Guru (NIP 801 - 810)
  const isSpecialExtNip = /^80[1-9]$|^810$/.test(nip);
  if (isSpecialExtNip) {
    return false;
  }

  // Filter berdasarkan mapel khusus akun penugasan pembina
  if (mapel === 'program sekolah') {
    return false;
  }

  // Filter teks pembina ekstrakurikuler jika ada di nama
  if (
    name.includes('pembina ekstra') ||
    name.includes('pelatih ekstra') ||
    name.includes('pembina ekskul')
  ) {
    return false;
  }

  // 4. Wajib memiliki NIP valid (bukan null, kosong, atau NIP dummy pendek < 5 digit)
  if (!nip || nip.length < 5) {
    return false;
  }

  // 5. Filter nama guru dummy / tidak aktif yang ada di database lama
  const excludedNames = [
    'guru baru',
    'agung budiartati, m.pd.',
    'dra.laily asriyah, m.pd.i.'
  ];
  if (excludedNames.includes(name)) {
    return false;
  }

  return true;
};
