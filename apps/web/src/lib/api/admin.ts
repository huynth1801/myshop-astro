import { z } from 'zod';
import { authHeaders } from './auth';

const BASE_URL = import.meta.env.PUBLIC_API_URL;

if (!BASE_URL) {
  throw new Error('PUBLIC_API_URL is not set — copy apps/web/.env.example to .env');
}

/**
 * Client for the /api/v1/admin/** surface (Phase 2 admin CRUD). Every response
 * is Zod-parsed; every request rides the in-memory Bearer token from auth.ts.
 * The API enforces ADMIN anyway (403) — the UI mirrors that for UX only.
 */

export class AdminError extends Error {
  constructor(
    message: string,
    readonly code: string | undefined,
    readonly status: number,
  ) {
    super(message);
  }
}

const categoryRefSchema = z.object({ slug: z.string(), name: z.string() });

const imageSchema = z.object({
  url: z.string(),
  alt: z.string(),
  position: z.number().int(),
});

const variantSchema = z.object({
  id: z.string().uuid(),
  sku: z.string(),
  priceCents: z.number().int().nonnegative(),
  compareAtPriceCents: z.number().int().nonnegative().nullish(),
  stock: z.number().int(),
  attributes: z.record(z.unknown()),
});

const productStatusSchema = z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']);

export const adminProductSummarySchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  status: productStatusSchema,
  category: categoryRefSchema,
  priceFromCents: z.number().int().nonnegative().nullish(),
  priceToCents: z.number().int().nonnegative().nullish(),
  variantCount: z.number().int(),
  totalStock: z.number().int(),
  inStock: z.boolean(),
  image: imageSchema.nullish(),
  createdAt: z.string(),
});

const adminPagedSchema = z.object({
  content: z.array(adminProductSummarySchema),
  page: z.number().int(),
  size: z.number().int(),
  totalElements: z.number().int(),
  totalPages: z.number().int(),
});

const adminDetailSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  shortDescription: z.string().nullish(),
  status: productStatusSchema,
  category: categoryRefSchema,
  variants: z.array(variantSchema),
  images: z.array(imageSchema),
  createdAt: z.string(),
});

const categorySchema = z.object({ id: z.string().uuid(), slug: z.string(), name: z.string(), hasParent: z.boolean() });

export type AdminProduct = z.infer<typeof adminProductSummarySchema>;
export type AdminProductDetail = z.infer<typeof adminDetailSchema>;
export type AdminVariant = z.infer<typeof variantSchema>;
export type AdminCategory = z.infer<typeof categorySchema>;

async function adminFetch<T>(path: string, init: RequestInit, schema: z.ZodType<T>): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json',
      ...authHeaders(),
      ...init.headers,
    },
  });
  if (!res.ok) {
    let code: string | undefined;
    let message = `Request failed (${res.status})`;
    try {
      const problem: { code?: string; detail?: string } = await res.json();
      code = problem.code;
      message = problem.detail ?? message;
    } catch {
      // keep generic message
    }
    throw new AdminError(message, code, res.status);
  }
  return schema.parse(await res.json());
}

/** Category options for the product form (admin endpoint — has ids). */
export async function listCategories(): Promise<AdminCategory[]> {
  return adminFetch('/api/v1/admin/categories', {}, z.array(categorySchema));
}

export async function listProducts(
  params: { q?: string; status?: 'DRAFT' | 'ACTIVE' | 'ARCHIVED'; categoryId?: string; page?: number } = {},
): Promise<z.infer<typeof adminPagedSchema>> {
  const query = new URLSearchParams({ page: String(params.page ?? 0), size: '20' });
  if (params.q && params.q.trim() !== '') query.set('q', params.q.trim());
  if (params.status) query.set('status', params.status);
  if (params.categoryId) query.set('categoryId', params.categoryId);
  return adminFetch(`/api/v1/admin/products?${query}`, {}, adminPagedSchema);
}

export async function getProduct(id: string): Promise<AdminProductDetail> {
  return adminFetch(`/api/v1/admin/products/${id}`, {}, adminDetailSchema);
}

export interface ProductPatch {
  name?: string;
  description?: string;
  shortDescription?: string;
  status?: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  categoryId?: string;
}

export async function updateProduct(id: string, patch: ProductPatch): Promise<AdminProductDetail> {
  return adminFetch(`/api/v1/admin/products/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }, adminDetailSchema);
}

export interface VariantPatch {
  priceCents?: number;
  compareAtPriceCents?: number | null;
  stock?: number;
}

export async function updateVariant(variantId: string, patch: VariantPatch): Promise<AdminVariant> {
  return adminFetch(`/api/v1/admin/variants/${variantId}`, { method: 'PATCH', body: JSON.stringify(patch) }, variantSchema);
}

export interface NewVariant {
  sku: string;
  priceCents: number;
  compareAtPriceCents?: number;
  stock: number;
}

export async function addVariant(productId: string, body: NewVariant): Promise<AdminProductDetail> {
  return adminFetch(`/api/v1/admin/products/${productId}/variants`, { method: 'POST', body: JSON.stringify(body) }, adminDetailSchema);
}

export interface NewProduct {
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  categoryId: string;
}

export async function createProduct(body: NewProduct): Promise<AdminProductDetail> {
  return adminFetch('/api/v1/admin/products', { method: 'POST', body: JSON.stringify(body) }, adminDetailSchema);
}
