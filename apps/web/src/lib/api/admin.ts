import { z } from 'zod';
import { authHeaders, getValidAccessToken, refreshAccessToken } from './auth';

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
  attributes: z.record(z.unknown()).nullish().transform((a) => a ?? {}),
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
  variants: z.array(variantSchema).default([]),
});

const adminPagedSchema = z.object({
  content: z.array(adminProductSummarySchema),
  page: z.number().int(),
  size: z.number().int(),
  totalElements: z.number().int(),
  totalPages: z.number().int(),
});

const adminImageSchema = z.object({
  id: z.string().uuid().nullish().transform((id) => id ?? '00000000-0000-0000-0000-000000000000'),
  url: z.string(),
  alt: z.string().nullish().transform((a) => a ?? ''),
  position: z.number().int().nullish().transform((p) => p ?? 0),
});

const adminDetailSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullish().transform((d) => d ?? ''),
  shortDescription: z.string().nullish(),
  status: productStatusSchema,
  category: categoryRefSchema,
  variants: z.array(variantSchema).default([]),
  images: z.array(adminImageSchema).default([]),
  createdAt: z.string().nullish().transform((c) => c ?? new Date().toISOString()),
});

const categorySchema = z.object({ id: z.string().uuid(), slug: z.string(), name: z.string(), hasParent: z.boolean() });

export type AdminProduct = z.infer<typeof adminProductSummarySchema>;
export type AdminProductDetail = z.infer<typeof adminDetailSchema>;
export type AdminVariant = z.infer<typeof variantSchema>;
export type AdminCategory = z.infer<typeof categorySchema>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function adminFetch<T>(path: string, init: RequestInit, schema: z.ZodType<T, any, any>): Promise<T> {
  let token = await getValidAccessToken();

  const executeRequest = async (activeToken: string | null) => {
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      accept: 'application/json',
      ...(activeToken ? { authorization: `Bearer ${activeToken}` } : {}),
      ...(init.headers as Record<string, string> | undefined),
    };

    return fetch(`${BASE_URL}${path}`, {
      ...init,
      credentials: 'include',
      headers,
    });
  };

  let res = await executeRequest(token);

  if (res.status === 401) {
    const refreshedToken = await refreshAccessToken();
    if (refreshedToken) {
      token = refreshedToken;
      res = await executeRequest(refreshedToken);
    }
  }
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
  if (res.status === 204) return schema.parse(undefined); // deletes have no body
  const data = await res.json();
  try {
    return schema.parse(data);
  } catch (zodErr) {
    if (zodErr instanceof z.ZodError) {
      console.error(`Zod validation error on ${path}:`, zodErr.issues, data);
      const detail = zodErr.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
      throw new AdminError(`Dữ liệu không khớp định dạng: ${detail}`, 'INVALID_RESPONSE', res.status);
    }
    throw zodErr;
  }
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
  sku?: string;
  priceCents?: number;
  compareAtPriceCents?: number | null;
  stock?: number;
  attributes?: Record<string, unknown>;
}

export async function updateVariant(variantId: string, patch: VariantPatch): Promise<AdminVariant> {
  return adminFetch(`/api/v1/admin/variants/${variantId}`, { method: 'PATCH', body: JSON.stringify(patch) }, variantSchema);
}

export async function deleteVariant(variantId: string): Promise<void> {
  await adminFetch(`/api/v1/admin/variants/${variantId}`, { method: 'DELETE' }, z.void());
}

export async function addImageByUrl(
  productId: string,
  url: string,
  alt?: string,
): Promise<AdminProductDetail> {
  return adminFetch(
    `/api/v1/admin/products/${productId}/images`,
    { method: 'POST', body: JSON.stringify({ url, alt }) },
    adminDetailSchema,
  );
}

/** Multipart upload — the browser sets the boundary, so no content-type header. */
export async function uploadImage(
  productId: string,
  file: File,
  alt?: string,
): Promise<AdminProductDetail> {
  const form = new FormData();
  form.append('file', file);
  if (alt) form.append('alt', alt);
  const res = await fetch(`${BASE_URL}/api/v1/admin/products/${productId}/images/upload`, {
    method: 'POST',
    credentials: 'include',
    headers: { accept: 'application/json', ...authHeaders() },
    body: form,
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
  return adminDetailSchema.parse(await res.json());
}

export async function updateImage(
  productId: string,
  imageId: string,
  patch: { url?: string; alt?: string },
): Promise<AdminProductDetail> {
  return adminFetch(
    `/api/v1/admin/products/${productId}/images/${imageId}`,
    { method: 'PATCH', body: JSON.stringify(patch) },
    adminDetailSchema,
  );
}

export async function updateImageAlt(
  productId: string,
  imageId: string,
  alt: string,
): Promise<AdminProductDetail> {
  return updateImage(productId, imageId, { alt });
}

export async function replaceImageUpload(
  productId: string,
  imageId: string,
  file: File | Blob,
  alt?: string,
): Promise<AdminProductDetail> {
  const form = new FormData();
  form.append('file', file, file instanceof File ? file.name : 'edited-image.webp');
  if (alt) form.append('alt', alt);
  const res = await fetch(`${BASE_URL}/api/v1/admin/products/${productId}/images/${imageId}/upload`, {
    method: 'POST',
    credentials: 'include',
    headers: { accept: 'application/json', ...authHeaders() },
    body: form,
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
  return adminDetailSchema.parse(await res.json());
}

export async function reorderImages(
  productId: string,
  imageIds: string[],
): Promise<AdminProductDetail> {
  return adminFetch(
    `/api/v1/admin/products/${productId}/images/order`,
    { method: 'PUT', body: JSON.stringify({ imageIds }) },
    adminDetailSchema,
  );
}

export async function deleteImage(productId: string, imageId: string): Promise<void> {
  await adminFetch(`/api/v1/admin/products/${productId}/images/${imageId}`, { method: 'DELETE' }, z.void());
}

export interface NewVariant {
  sku: string;
  priceCents: number;
  compareAtPriceCents?: number;
  stock: number;
  attributes?: Record<string, unknown>;
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
