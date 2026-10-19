import { z } from 'zod';
import { getApiBaseUrl } from './urls';

export const categorySchema = z.object({
  slug: z.string(),
  name: z.string(),
  hasParent: z.boolean(),
});

export type Category = z.infer<typeof categorySchema>;

export async function getCategories(): Promise<Category[]> {
  const baseUrl = getApiBaseUrl();
  const res = await fetch(`${baseUrl}/api/v1/categories`, {
    headers: { accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`API request failed: GET /api/v1/categories → ${res.status}`);
  }
  return z.array(categorySchema).parse(await res.json());
}

/** Vietnamese display names for seeded categories; falls back to the API name. */
const VI_NAMES: Record<string, string> = {
  apparel: 'Đồ mặc',
  accessories: 'Phụ kiện',
  underwear: 'Đồ lót & định hình',
};

export function categoryDisplayName(category: Category): string {
  return VI_NAMES[category.slug] ?? category.name;
}
