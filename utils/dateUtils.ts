
// Utility untuk menangani Waktu Indonesia Barat (WIB / Asia/Jakarta)

// Mendapatkan objek Date saat ini dalam WIB
export const getWIBDate = (): Date => {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const wibOffset = 7 * 60 * 60000; // UTC+7
  return new Date(utc + wibOffset);
};

// Mendapatkan String ISO (YYYY-MM-DD) berdasarkan WIB
// Berguna untuk query database filter tanggal hari ini
export const getWIBISOString = (): string => {
  const date = getWIBDate();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Format Tanggal Lengkap Indonesia (Contoh: Senin, 20 Januari 2025)
export const formatDateIndo = (dateInput: string | Date): string => {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta'
  }).format(date);
};

// Format Tanggal Tanda Tangan (Contoh: 20 Januari 2025) - Tanpa Nama Hari
export const formatDateSignature = (dateInput: string | Date): string => {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta'
  }).format(date);
};

// Format Jam (Contoh: 07:30)
export const formatTimeIndo = (dateInput: string | Date): string => {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
    hour12: false
  }).format(date).replace(/\./g, ':');
};
