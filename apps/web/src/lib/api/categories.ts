import { z } from 'zod';

const API_BASE_URL = import.meta.env.API_BASE_URL;

if (!API_BASE_URL) {
  throw new Error('API_BASE_URL is not set — copy apps/web/.env.example to .env');
}

export const categorySchema = z.object({
  slug: z.string(),
  name: z.string(),
  hasParent: z.boolean(),
});

export type Category = z.infer<typeof categorySchema>;

export async function getCategories(): Promise<Category[]> {
  const res = await fetch(`${API_BASE_URL}/api/v1/categories`, {
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
