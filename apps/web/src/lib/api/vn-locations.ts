export interface LocationItem {
  code: number | string;
  name: string;
  divisionType?: string;
  codename?: string;
}

export interface WardOption extends LocationItem {
  wardName?: string;
  districtName?: string;
}

// Vietnam Administrative Divisions Open API v2 (34 Tỉnh/Thành phố & Phường/Xã mới bãi bỏ cấp quận/huyện)
const API_BASE = 'https://provinces.open-api.vn/api/v2';

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

  // Multi-word token matching (e.g. "ben thanh", "sai gon", "thu duc", "phuong 10")
  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
  if (tokens.length > 1) {
    const allMatch = tokens.every((token) => {
      if (normalizedName.includes(token)) return true;
      if (/^p\s*\.?\s*\d+/.test(token)) {
        const num = token.replace(/\D/g, '');
        return normalizedName.includes(`phuong ${num}`) || normalizedName.includes(`p. ${num}`);
      }
      return false;
    });
    if (allMatch) return true;
  }

  return false;
}

// SessionStorage helper with error safety
function getFromStorage(key: string): LocationItem[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const val = sessionStorage.getItem(`myshop_vn_v2_${key}`);
    return val ? (JSON.parse(val) as LocationItem[]) : null;
  } catch {
    return null;
  }
}

function setToStorage(key: string, data: LocationItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(`myshop_vn_v2_${key}`, JSON.stringify(data));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Fetch 34 official provinces/cities of Vietnam (API v2).
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
    console.warn('Failed to fetch provinces from open-api.vn v2, using fallback list', err);
  }

  // Fallback initial provinces if API is blocked or offline
  return FALLBACK_PROVINCES;
}

/**
 * Fetch all new wards/communes in a province (API v2 - 2-tier administrative model).
 * Endpoint: /api/v2/p/{provinceCode}?depth=2
 */
export async function fetchProvinceWards(provinceCode: number | string): Promise<WardOption[]> {
  if (!provinceCode) return [];
  const cacheKey = `province_wards_${provinceCode}`;
  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey)! as WardOption[];
  }

  const stored = getFromStorage(cacheKey);
  if (stored && stored.length > 0) {
    memoryCache.set(cacheKey, stored);
    return stored as WardOption[];
  }

  try {
    const res = await fetch(`${API_BASE}/p/${provinceCode}?depth=2`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const rawWards = data?.wards || [];
    const items: WardOption[] = rawWards.map(
      (w: { code: number; name: string; division_type?: string; codename?: string }) => ({
        code: w.code,
        name: w.name,
        wardName: w.name,
        districtName: '',
        divisionType: w.division_type,
        codename: w.codename,
      })
    );

    if (items.length > 0) {
      memoryCache.set(cacheKey, items);
      setToStorage(cacheKey, items);
      return items;
    }
  } catch (err) {
    console.warn(`Failed to fetch all wards for province ${provinceCode} from v2`, err);
  }

  return [];
}

/**
 * Backwards-compatible stubs for legacy 3-tier calls
 */
export async function fetchDistricts(_provinceCode: number | string): Promise<LocationItem[]> {
  return [];
}

export async function fetchWards(_districtCode: number | string): Promise<LocationItem[]> {
  return [];
}

// 34 official new provinces/cities of Vietnam
export const FALLBACK_PROVINCES: LocationItem[] = [
  { code: 1, name: 'Thành phố Hà Nội' },
  { code: 4, name: 'Tỉnh Cao Bằng' },
  { code: 8, name: 'Tỉnh Tuyên Quang' },
  { code: 11, name: 'Tỉnh Điện Biên' },
  { code: 12, name: 'Tỉnh Lai Châu' },
  { code: 14, name: 'Tỉnh Sơn La' },
  { code: 15, name: 'Tỉnh Lào Cai' },
  { code: 19, name: 'Tỉnh Thái Nguyên' },
  { code: 20, name: 'Tỉnh Lạng Sơn' },
  { code: 22, name: 'Thành phố Quảng Ninh' },
  { code: 24, name: 'Thành phố Bắc Ninh' },
  { code: 25, name: 'Tỉnh Phú Thọ' },
  { code: 31, name: 'Thành phố Hải Phòng' },
  { code: 33, name: 'Tỉnh Hưng Yên' },
  { code: 37, name: 'Tỉnh Ninh Bình' },
  { code: 38, name: 'Tỉnh Thanh Hóa' },
  { code: 40, name: 'Tỉnh Nghệ An' },
  { code: 42, name: 'Tỉnh Hà Tĩnh' },
  { code: 44, name: 'Tỉnh Quảng Trị' },
  { code: 46, name: 'Thành phố Huế' },
  { code: 48, name: 'Thành phố Đà Nẵng' },
  { code: 51, name: 'Tỉnh Quảng Ngãi' },
  { code: 52, name: 'Tỉnh Gia Lai' },
  { code: 56, name: 'Tỉnh Khánh Hòa' },
  { code: 66, name: 'Tỉnh Đắk Lắk' },
  { code: 68, name: 'Tỉnh Lâm Đồng' },
  { code: 75, name: 'Thành phố Đồng Nai' },
  { code: 79, name: 'Thành phố Hồ Chí Minh' },
  { code: 80, name: 'Tỉnh Tây Ninh' },
  { code: 82, name: 'Tỉnh Đồng Tháp' },
  { code: 86, name: 'Tỉnh Vĩnh Long' },
  { code: 91, name: 'Tỉnh An Giang' },
  { code: 92, name: 'Thành phố Cần Thơ' },
  { code: 96, name: 'Tỉnh Cà Mau' },
];
