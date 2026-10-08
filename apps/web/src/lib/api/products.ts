import { z } from 'zod';

const API_BASE_URL = import.meta.env.API_BASE_URL;

if (!API_BASE_URL) {
  throw new Error('API_BASE_URL is not set — copy apps/web/.env.example to .env');
}

async function apiGet<T>(path: string, schema: z.ZodType<T>): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`API request failed: GET ${path} → ${res.status}`);
  }
  return schema.parse(await res.json());
}

const imageSchema = z.object({
  url: z.string().url(),
  alt: z.string(),
  position: z.number().int(),
});

const categoryRefSchema = z.object({
  slug: z.string(),
  name: z.string(),
});

const variantSchema = z.object({
  id: z.string().uuid(),
  sku: z.string(),
  priceCents: z.number().int().nonnegative(),
  // The API omits null fields (Jackson non_null) — nullish covers absent and null
  compareAtPriceCents: z.number().int().nonnegative().nullish(),
  stock: z.number().int(),
  attributes: z.record(z.unknown()),
});

export const productSummarySchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  shortDescription: z.string().nullish(),
  priceFromCents: z.number().int().nonnegative().nullish(),
  compareAtFromCents: z.number().int().nonnegative().nullish(),
  image: imageSchema.nullish(),
  hoverImage: imageSchema.nullish(),
  category: categoryRefSchema,
  defaultVariantId: z.string().uuid().nullish(),
  inStock: z.boolean(),
  createdAt: z.string(),
});

export const pagedProductsSchema = z.object({
  content: z.array(productSummarySchema),
  page: z.number().int(),
  size: z.number().int(),
  totalElements: z.number().int(),
  totalPages: z.number().int(),
});

export const productDetailSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  shortDescription: z.string().nullish(),
  category: categoryRefSchema,
  images: z.array(imageSchema),
  variants: z.array(variantSchema),
  inStock: z.boolean(),
});

export type ProductSummary = z.infer<typeof productSummarySchema>;
export type ProductDetail = z.infer<typeof productDetailSchema>;
export type ProductVariant = z.infer<typeof variantSchema>;
export type ProductImage = z.infer<typeof imageSchema>;

export type ProductSort = 'newest' | 'price_asc' | 'price_desc';

export async function getProducts(page = 0, size = 60, sort: ProductSort = 'newest') {
  const query = new URLSearchParams({ page: String(page), size: String(size), sort });
  return apiGet(`/api/v1/products?${query}`, pagedProductsSchema);
}

export async function getCategoryProducts(
  categorySlug: string,
  page = 0,
  size = 60,
  sort: ProductSort = 'newest',
) {
  const query = new URLSearchParams({ page: String(page), size: String(size), sort });
  return apiGet(
    `/api/v1/categories/${encodeURIComponent(categorySlug)}/products?${query}`,
    pagedProductsSchema,
  );
}

export async function getProduct(slug: string) {
  return apiGet(`/api/v1/products/${encodeURIComponent(slug)}`, productDetailSchema);
}
