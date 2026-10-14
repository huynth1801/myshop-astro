export interface LocationItem {
  code: number | string;
  name: string;
  divisionType?: string;
  codename?: string;
}

const API_BASE = 'https://provinces.open-api.vn/api/v1';

// In-memory runtime cache
const memoryCache = new Map<string, LocationItem[]>();

/**
 * Remove Vietnamese accents/diacritics and normalize string for flexible search.
 */
export function removeVietnameseTones(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, (match) => (match === 'đ' ? 'd' : 'D'))
    .toLowerCase()
    .trim();
}

/**
 * Check if a location item matches a search query with Vietnamese diacritic support & abbreviations.
 */
export function matchesLocationQuery(item: LocationItem, query: string): boolean {
  const normalizedQuery = removeVietnameseTones(query);
  if (!normalizedQuery) return true;

  const normalizedName = removeVietnameseTones(item.name);
  if (normalizedName.includes(normalizedQuery)) return true;

  // Shortcuts & popular abbreviations
  if (normalizedQuery === 'hcm' || normalizedQuery === 'sg' || normalizedQuery === 'tphcm') {
    return normalizedName.includes('ho chi minh');
  }
  if (normalizedQuery === 'hn') {
    return normalizedName.includes('ha noi');
  }
  if (normalizedQuery === 'dn') {
    return normalizedName.includes('da nang');
  }
  if (normalizedQuery === 'hp') {
    return normalizedName.includes('hai phong');
  }
  if (normalizedQuery === 'ct') {
    return normalizedName.includes('can tho');
  }

  // "q1", "q2", "q.tan binh" -> "quan 1", "quan tan binh"
  if (/^q\s*\.?\s*\d+/.test(normalizedQuery)) {
    const num = normalizedQuery.replace(/\D/g, '');
    if (normalizedName.includes(`quan ${num}`) || normalizedName.includes(`q. ${num}`)) {
      return true;
    }
  }

  // "p1", "p10", "p.10" -> "phuong 10"
  if (/^p\s*\.?\s*\d+/.test(normalizedQuery)) {
    const num = normalizedQuery.replace(/\D/g, '');
    if (normalizedName.includes(`phuong ${num}`) || normalizedName.includes(`p. ${num}`)) {
      return true;
    }
  }

  return false;
}

// SessionStorage helper with error safety
function getFromStorage(key: string): LocationItem[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const val = sessionStorage.getItem(`myshop_vn_${key}`);
    return val ? (JSON.parse(val) as LocationItem[]) : null;
  } catch {
    return null;
  }
}

function setToStorage(key: string, data: LocationItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(`myshop_vn_${key}`, JSON.stringify(data));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Fetch 63 provinces/cities of Vietnam.
 */
export async function fetchProvinces(): Promise<LocationItem[]> {
  const cacheKey = 'provinces';
  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey)!;
  }

  const stored = getFromStorage(cacheKey);
  if (stored && stored.length > 0) {
    memoryCache.set(cacheKey, stored);
    return stored;
  }

  try {
    const res = await fetch(`${API_BASE}/p/`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const items: LocationItem[] = Array.isArray(data)
      ? data.map((p: { code: number; name: string; division_type?: string; codename?: string }) => ({
          code: p.code,
          name: p.name,
          divisionType: p.division_type,
          codename: p.codename,
        }))
      : [];

    if (items.length > 0) {
      memoryCache.set(cacheKey, items);
      setToStorage(cacheKey, items);
      return items;
    }
  } catch (err) {
    console.warn('Failed to fetch provinces from open-api.vn, using fallback list', err);
  }

  // Fallback initial provinces if API is blocked or offline
  return FALLBACK_PROVINCES;
}

/**
 * Fetch districts for a given province code.
 */
export async function fetchDistricts(provinceCode: number | string): Promise<LocationItem[]> {
  if (!provinceCode) return [];
  const cacheKey = `districts_${provinceCode}`;
  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey)!;
  }

  const stored = getFromStorage(cacheKey);
  if (stored && stored.length > 0) {
    memoryCache.set(cacheKey, stored);
    return stored;
  }

  try {
    const res = await fetch(`${API_BASE}/p/${provinceCode}?depth=2`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const districts = data?.districts || [];
    const items: LocationItem[] = districts.map(
      (d: { code: number; name: string; division_type?: string; codename?: string }) => ({
        code: d.code,
        name: d.name,
        divisionType: d.division_type,
        codename: d.codename,
      })
    );

    if (items.length > 0) {
      memoryCache.set(cacheKey, items);
      setToStorage(cacheKey, items);
    }
    return items;
  } catch (err) {
    console.warn(`Failed to fetch districts for province ${provinceCode}`, err);
    return [];
  }
}

/**
 * Fetch wards for a given district code.
 */
export async function fetchWards(districtCode: number | string): Promise<LocationItem[]> {
  if (!districtCode) return [];
  const cacheKey = `wards_${districtCode}`;
  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey)!;
  }

  const stored = getFromStorage(cacheKey);
  if (stored && stored.length > 0) {
    memoryCache.set(cacheKey, stored);
    return stored;
  }

  try {
    const res = await fetch(`${API_BASE}/d/${districtCode}?depth=2`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const wards = data?.wards || [];
    const items: LocationItem[] = wards.map(
      (w: { code: number; name: string; division_type?: string; codename?: string }) => ({
        code: w.code,
        name: w.name,
        divisionType: w.division_type,
        codename: w.codename,
      })
    );

    if (items.length > 0) {
      memoryCache.set(cacheKey, items);
      setToStorage(cacheKey, items);
    }
    return items;
  } catch (err) {
    console.warn(`Failed to fetch wards for district ${districtCode}`, err);
    return [];
  }
}

// 63 official provinces/cities as instant offline fallback
export const FALLBACK_PROVINCES: LocationItem[] = [
  { code: 79, name: 'Thành phố Hồ Chí Minh' },
  { code: 1, name: 'Thành phố Hà Nội' },
  { code: 48, name: 'Thành phố Đà Nẵng' },
  { code: 31, name: 'Thành phố Hải Phòng' },
  { code: 92, name: 'Thành phố Cần Thơ' },
  { code: 89, name: 'Tỉnh An Giang' },
  { code: 77, name: 'Tỉnh Bà Rịa - Vũng Tàu' },
  { code: 24, name: 'Tỉnh Bắc Giang' },
  { code: 6, name: 'Tỉnh Bắc Kạn' },
  { code: 95, name: 'Tỉnh Bạc Liêu' },
  { code: 27, name: 'Tỉnh Bắc Ninh' },
  { code: 83, name: 'Tỉnh Bến Tre' },
  { code: 52, name: 'Tỉnh Bình Định' },
  { code: 74, name: 'Tỉnh Bình Dương' },
  { code: 70, name: 'Tỉnh Bình Phước' },
  { code: 60, name: 'Tỉnh Bình Thuận' },
  { code: 96, name: 'Tỉnh Cà Mau' },
  { code: 4, name: 'Tỉnh Cao Bằng' },
  { code: 66, name: 'Tỉnh Đắk Lắk' },
  { code: 67, name: 'Tỉnh Đắk Nông' },
  { code: 11, name: 'Tỉnh Điện Biên' },
  { code: 75, name: 'Tỉnh Đồng Nai' },
  { code: 87, name: 'Tỉnh Đồng Tháp' },
  { code: 64, name: 'Tỉnh Gia Lai' },
  { code: 2, name: 'Tỉnh Hà Giang' },
  { code: 35, name: 'Tỉnh Hà Nam' },
  { code: 42, name: 'Tỉnh Hà Tĩnh' },
  { code: 30, name: 'Tỉnh Hải Dương' },
  { code: 93, name: 'Tỉnh Hậu Giang' },
  { code: 17, name: 'Tỉnh Hòa Bình' },
  { code: 33, name: 'Tỉnh Hưng Yên' },
  { code: 56, name: 'Tỉnh Khánh Hòa' },
  { code: 91, name: 'Tỉnh Kiên Giang' },
  { code: 62, name: 'Tỉnh Kon Tum' },
  { code: 12, name: 'Tỉnh Lai Châu' },
  { code: 68, name: 'Tỉnh Lâm Đồng' },
  { code: 20, name: 'Tỉnh Lạng Sơn' },
  { code: 10, name: 'Tỉnh Lào Cai' },
  { code: 80, name: 'Tỉnh Long An' },
  { code: 36, name: 'Tỉnh Nam Định' },
  { code: 40, name: 'Tỉnh Nghệ An' },
  { code: 37, name: 'Tỉnh Ninh Bình' },
  { code: 58, name: 'Tỉnh Ninh Thuận' },
  { code: 25, name: 'Tỉnh Phú Thọ' },
  { code: 54, name: 'Tỉnh Phú Yên' },
  { code: 44, name: 'Tỉnh Quảng Bình' },
  { code: 49, name: 'Tỉnh Quảng Nam' },
  { code: 51, name: 'Tỉnh Quảng Ngãi' },
  { code: 22, name: 'Tỉnh Quảng Ninh' },
  { code: 45, name: 'Tỉnh Quảng Trị' },
  { code: 94, name: 'Tỉnh Sóc Trăng' },
  { code: 14, name: 'Tỉnh Sơn La' },
  { code: 72, name: 'Tỉnh Tây Ninh' },
  { code: 34, name: 'Tỉnh Thái Bình' },
  { code: 19, name: 'Tỉnh Thái Nguyên' },
  { code: 38, name: 'Tỉnh Thanh Hóa' },
  { code: 46, name: 'Tỉnh Thừa Thiên Huế' },
  { code: 82, name: 'Tỉnh Tiền Giang' },
  { code: 84, name: 'Tỉnh Trà Vinh' },
  { code: 8, name: 'Tỉnh Tuyên Quang' },
  { code: 86, name: 'Tỉnh Vĩnh Long' },
  { code: 26, name: 'Tỉnh Vĩnh Phúc' },
  { code: 15, name: 'Tỉnh Yên Bái' },
];
