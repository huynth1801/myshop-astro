import type { VariantOption } from '../components/react/AddToCartButton';

export interface DimensionGroup {
  key: string;
  label: string;
  values: string[];
}

export const ATTR_GROUP_LABELS: Record<string, { label: string; order: number }> = {
  color: { label: 'Màu sắc', order: 1 },
  size: { label: 'Kích cỡ', order: 2 },
};

export const COLOR_SWATCHES: Record<string, string> = {
  đen: '#1f1f1f',
  da: '#dcb899',
  'màu nude': '#e3be9f',
  nude: '#e3be9f',
  nâu: '#7c5339',
  xám: '#9e9e9e',
  ghi: '#a6a6a6',
  hồng: '#f4a6b8',
  tím: '#8a65a8',
  'tím than': '#3b2f5c',
  trắng: '#ffffff',
  xanh: '#4b779a',
  'xanh rêu': '#546b4e',
  'xanh lá': '#4a7c59',
};

/** Detect dimension groups (color, size...) and unique values in preserve order. */
export function extractDimensionGroups(variants: VariantOption[]): DimensionGroup[] {
  const keysSet = new Set<string>();
  for (const v of variants) {
    if (v.attributes) {
      for (const k of Object.keys(v.attributes)) {
        keysSet.add(k);
      }
    }
  }

  const sortedKeys = Array.from(keysSet).sort((a, b) => {
    const orderA = ATTR_GROUP_LABELS[a]?.order ?? 99;
    const orderB = ATTR_GROUP_LABELS[b]?.order ?? 99;
    return orderA - orderB;
  });

  const groups: DimensionGroup[] = [];
  for (const key of sortedKeys) {
    const seen = new Set<string>();
    const values: string[] = [];
    for (const v of variants) {
      const val = v.attributes?.[key];
      if (val != null) {
        const strVal = String(val).trim();
        if (strVal && !seen.has(strVal)) {
          seen.add(strVal);
          values.push(strVal);
        }
      }
    }
    if (values.length > 0) {
      groups.push({
        key,
        label: ATTR_GROUP_LABELS[key]?.label ?? key,
        values,
      });
    }
  }

  return groups;
}

/** Find variant matching the current multi-dimensional selection. */
export function findMatchingVariant(
  variants: VariantOption[],
  selected: Record<string, string>,
): VariantOption | undefined {
  return variants.find((v) => {
    if (!v.attributes) return false;
    return Object.entries(selected).every(([key, val]) => String(v.attributes?.[key]).trim() === val);
  });
}

/** Check availability and stock for a candidate option in a group. */
export function checkOptionAvailability(
  variants: VariantOption[],
  currentSelection: Record<string, string>,
  targetKey: string,
  targetValue: string,
): { exists: boolean; inStock: boolean; stock: number } {
  const candidates = variants.filter((v) => {
    if (!v.attributes) return false;
    if (String(v.attributes[targetKey]).trim() !== targetValue) return false;
    for (const [k, val] of Object.entries(currentSelection)) {
      if (k !== targetKey && v.attributes[k] != null) {
        if (String(v.attributes[k]).trim() !== val) return false;
      }
    }
    return true;
  });

  if (candidates.length === 0) {
    return { exists: false, inStock: false, stock: 0 };
  }
  const totalStock = candidates.reduce((sum, c) => sum + c.stock, 0);
  return { exists: true, inStock: totalStock > 0, stock: totalStock };
}

/** Pick a sensible default selection: preferably an in-stock variant. */
export function getDefaultSelection(
  variants: VariantOption[],
  groups: DimensionGroup[],
): Record<string, string> {
  const preferred = variants.find((v) => v.stock > 0) ?? variants[0];
  const selection: Record<string, string> = {};

  for (const g of groups) {
    const valFromPreferred = preferred?.attributes?.[g.key];
    if (valFromPreferred != null) {
      selection[g.key] = String(valFromPreferred).trim();
    } else if (g.values[0]) {
      selection[g.key] = g.values[0];
    }
  }
  return selection;
}

/** Get color swatch hex code if available. */
export function getColorSwatch(value: string): string | null {
  const lower = value.toLowerCase().trim();
  for (const [name, hex] of Object.entries(COLOR_SWATCHES)) {
    if (lower === name || lower.includes(name)) {
      return hex;
    }
  }
  return null;
}
