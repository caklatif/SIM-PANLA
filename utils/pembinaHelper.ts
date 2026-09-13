import { supabase } from '../services/supabase';
import { Profile } from '../types';

export interface PembinaEkstraItem {
  nip?: string;
  nama?: string;
  ekstraList?: string[];
  canScanHarian?: boolean;
  canScanDhuha?: boolean;
}

export const getCachedPembinaList = (): PembinaEkstraItem[] => {
  try {
    const saved = localStorage.getItem('simpanla_pembina_ekstra_list');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Error reading cached pembina list:', e);
  }
  return [];
};

export const fetchPembinaListFromDb = async (): Promise<PembinaEkstraItem[]> => {
  try {
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'pembina_ekstra_list')
      .single();

    if (data?.value) {
      const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
      if (Array.isArray(parsed)) {
        localStorage.setItem('simpanla_pembina_ekstra_list', JSON.stringify(parsed));
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error fetching pembina list from db:', e);
  }
  return getCachedPembinaList();
};

export const checkIsPembinaEkstra = (
  profile: Profile | null | undefined,
  pembinaList: PembinaEkstraItem[] = getCachedPembinaList()
): {
  isPembina: boolean;
  isPramuka: boolean;
  assignedEkstras: string[];
  matchedPembina?: PembinaEkstraItem;
} => {
  if (!profile) {
    return { isPembina: false, isPramuka: false, assignedEkstras: [] };
  }

  const rawNip = profile.nip ? String(profile.nip).trim() : '';
  const cleanNip = rawNip.replace(/[^0-9]/g, '');
  const rawName = profile.full_name ? profile.full_name.trim().toLowerCase() : '';

  // 1. Check in pembina list from app_settings
  const matched = pembinaList.find((p) => {
    const pRawNip = p.nip ? String(p.nip).trim() : '';
    const pCleanNip = pRawNip.replace(/[^0-9]/g, '');
    const pName = p.nama ? p.nama.trim().toLowerCase() : '';

    if (rawNip && pRawNip && rawNip === pRawNip) return true;
    if (cleanNip && pCleanNip && cleanNip === pCleanNip) return true;
    if (rawName && pName && (rawName === pName || rawName.includes(pName) || pName.includes(rawName))) return true;
    return false;
  });

  // 2. Check role and special pembina range (801-810)
  const isRolePembina = profile.role === 'pembina_ekstra';
  const isNipInRange = (() => {
    const num = parseInt(cleanNip, 10);
    return !isNaN(num) && num >= 801 && num <= 810;
  })();

  const isPembina = isRolePembina || isNipInRange || !!matched;

  let assignedEkstras = matched?.ekstraList && Array.isArray(matched.ekstraList)
    ? matched.ekstraList.filter((e) => e && e !== 'Semua')
    : [];

  if (isPembina && assignedEkstras.length === 0) {
    // Default fallback to PRAMUKA for pembina accounts without explicit list
    assignedEkstras = ['PRAMUKA'];
  }

  const isPramuka = assignedEkstras.some((e) => e.toLowerCase().includes('pramuka'));

  return {
    isPembina,
    isPramuka,
    assignedEkstras,
    matchedPembina: matched,
  };
};
