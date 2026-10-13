import { z } from 'zod';
import { productSummarySchema } from './products';
import { authHeaders, getValidAccessToken, refreshAccessToken } from './auth';

const SERVER_BASE_URL = import.meta.env.API_BASE_URL || import.meta.env.PUBLIC_API_URL || 'http://localhost:8080';
const CLIENT_BASE_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:8080';

export const postStatusSchema = z.enum(['DRAFT', 'PUBLISHED']);
export type PostStatus = z.infer<typeof postStatusSchema>;

export const postSummarySchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  slug: z.string(),
  summary: z.string().nullish().transform((s) => s ?? ''),
  featuredImage: z.string().nullish(),
  author: z.string().nullish(),
  status: postStatusSchema,
  publishedAt: z.string().nullish(),
  createdAt: z.string().nullish().transform((v) => v || new Date().toISOString()),
});

export type PostSummary = z.infer<typeof postSummarySchema>;

export const pagedPostsSchema = z.object({
  content: z.array(postSummarySchema),
  page: z.number().int(),
  size: z.number().int(),
  totalElements: z.number().int(),
  totalPages: z.number().int(),
});

export type PagedPosts = z.infer<typeof pagedPostsSchema>;

export const postDetailSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  slug: z.string(),
  summary: z.string().nullish().transform((s) => s ?? ''),
  content: z.string(),
  featuredImage: z.string().nullish(),
  author: z.string().nullish(),
  status: postStatusSchema,
  seoTitle: z.string().nullish(),
  seoDescription: z.string().nullish(),
  viewCount: z.number().int(),
  publishedAt: z.string().nullish(),
  createdAt: z.string().nullish().transform((v) => v || new Date().toISOString()),
  relatedProducts: z.array(productSummarySchema).default([]),
});

export type PostDetail = z.infer<typeof postDetailSchema>;

export const adminPostDetailSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  slug: z.string(),
  summary: z.string().nullish().transform((s) => s ?? ''),
  content: z.string(),
  featuredImage: z.string().nullish(),
  author: z.string().nullish(),
  status: postStatusSchema,
  seoTitle: z.string().nullish(),
  seoDescription: z.string().nullish(),
  viewCount: z.number().int(),
  publishedAt: z.string().nullish(),
  createdAt: z.string().nullish().transform((v) => v || new Date().toISOString()),
  updatedAt: z.string().nullish().transform((v) => v || new Date().toISOString()),
  relatedProductIds: z.array(z.string().uuid()).default([]),
});

export type AdminPostDetail = z.infer<typeof adminPostDetailSchema>;

export const crawledPostSchema = z.object({
  title: z.string(),
  summary: z.string().nullish(),
  content: z.string(),
  featuredImage: z.string().nullish(),
  author: z.string().nullish(),
  sourceUrl: z.string(),
  suggestedSlug: z.string(),
});

export type CrawledPost = z.infer<typeof crawledPostSchema>;

export const rssSourceSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  url: z.string(),
  category: z.string().nullish(),
  isActive: z.boolean(),
  lastFetchedAt: z.string().nullish(),
  createdAt: z.string().nullish().transform((v) => v || new Date().toISOString()),
});

export type RssSource = z.infer<typeof rssSourceSchema>;

export const pagedRssSourcesSchema = z.object({
  content: z.array(rssSourceSchema),
  page: z.number().int(),
  size: z.number().int(),
  totalElements: z.number().int(),
  totalPages: z.number().int(),
});

export type PagedRssSources = z.infer<typeof pagedRssSourcesSchema>;

export const rssScanResultSchema = z.object({
  sourcesScanned: z.number().int(),
  articlesScanned: z.number().int(),
  newDraftsCreated: z.number().int(),
  skippedExisting: z.number().int(),
  createdPosts: z.array(postSummarySchema),
});

export type RssScanResult = z.infer<typeof rssScanResultSchema>;

export class BlogApiError extends Error {
  constructor(
    message: string,
    readonly code: string | undefined,
    readonly status: number,
  ) {
    super(message);
  }
}

// ---------------- PUBLIC API (Storefront) ----------------

export async function getPosts(params: {
  page?: number;
  size?: number;
  tag?: string;
  q?: string;
} = {}): Promise<PagedPosts> {
  const query = new URLSearchParams();
  if (params.page !== undefined) query.set('page', String(params.page));
  if (params.size !== undefined) query.set('size', String(params.size));
  if (params.tag) query.set('tag', params.tag);
  if (params.q) query.set('q', params.q);

  const qs = query.toString();
  const url = `${SERVER_BASE_URL}/api/v1/posts${qs ? `?${qs}` : ''}`;
  const res = await fetch(url, { headers: { accept: 'application/json' } });

  if (!res.ok) {
    throw new BlogApiError(`Failed to fetch posts: ${res.status}`, undefined, res.status);
  }

  return pagedPostsSchema.parse(await res.json());
}

export async function getPost(slug: string): Promise<PostDetail> {
  const url = `${SERVER_BASE_URL}/api/v1/posts/${encodeURIComponent(slug)}`;
  const res = await fetch(url, { headers: { accept: 'application/json' } });

  if (res.status === 404) {
    throw new BlogApiError(`Post not found: ${slug}`, 'POST_NOT_FOUND', 404);
  }
  if (!res.ok) {
    throw new BlogApiError(`Failed to fetch post: ${res.status}`, undefined, res.status);
  }

  return postDetailSchema.parse(await res.json());
}

// ---------------- ADMIN API ----------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function adminBlogFetch<T>(
  path: string,
  init: RequestInit,
  schema: z.ZodType<T, any, any>,
): Promise<T> {
  let token = await getValidAccessToken();

  const executeRequest = async (activeToken: string | null) => {
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      accept: 'application/json',
      ...(activeToken ? { authorization: `Bearer ${activeToken}` } : {}),
      ...(init.headers as Record<string, string> | undefined),
    };

    return fetch(`${CLIENT_BASE_URL}${path}`, {
      ...init,
      credentials: 'include',
      headers,
    });
  };

  let res = await executeRequest(token);

  // If unauthenticated (token missing or expired), silently refresh and retry once
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
      const err = await res.json();
      code = err.code;
      message = err.message || err.detail || message;
    } catch {
      // not JSON problem details
    }
    throw new BlogApiError(message, code, res.status);
  }

  if (res.status === 204) {
    return undefined as unknown as T;
  }

  const json = await res.json();
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    console.warn(`[adminBlogFetch] Schema parse warning for ${path}:`, parsed.error);
    return json as unknown as T;
  }
  return parsed.data;
}

export async function adminListPosts(params: {
  page?: number;
  size?: number;
  status?: PostStatus;
  q?: string;
} = {}): Promise<PagedPosts> {
  const query = new URLSearchParams();
  if (params.page !== undefined) query.set('page', String(params.page));
  if (params.size !== undefined) query.set('size', String(params.size));
  if (params.status) query.set('status', params.status);
  if (params.q) query.set('q', params.q);

  const qs = query.toString();
  return adminBlogFetch(`/api/v1/admin/posts${qs ? `?${qs}` : ''}`, { method: 'GET' }, pagedPostsSchema);
}

export async function adminGetPost(id: string): Promise<AdminPostDetail> {
  return adminBlogFetch(`/api/v1/admin/posts/${id}`, { method: 'GET' }, adminPostDetailSchema);
}

export interface AdminCreatePostInput {
  title: string;
  slug?: string;
  summary?: string;
  content: string;
  featuredImage?: string | null;
  author?: string | null;
  status?: PostStatus;
  seoTitle?: string | null;
  seoDescription?: string | null;
  relatedProductIds?: string[];
}

export async function adminCreatePost(input: AdminCreatePostInput): Promise<AdminPostDetail> {
  return adminBlogFetch('/api/v1/admin/posts', {
    method: 'POST',
    body: JSON.stringify(input),
  }, adminPostDetailSchema);
}

export async function adminUpdatePost(
  id: string,
  input: Partial<AdminCreatePostInput>,
): Promise<AdminPostDetail> {
  return adminBlogFetch(`/api/v1/admin/posts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  }, adminPostDetailSchema);
}

export async function adminDeletePost(id: string): Promise<void> {
  await adminBlogFetch(`/api/v1/admin/posts/${id}`, { method: 'DELETE' }, z.void());
}

export const bulkOperationResultSchema = z.object({
  count: z.number().int(),
});
export type BulkOperationResult = z.infer<typeof bulkOperationResultSchema>;

export async function adminBulkDeletePosts(ids: string[]): Promise<BulkOperationResult> {
  return adminBlogFetch('/api/v1/admin/posts/bulk-delete', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  }, bulkOperationResultSchema);
}

export async function adminBulkUpdatePostStatus(
  ids: string[],
  status: PostStatus,
): Promise<BulkOperationResult> {
  return adminBlogFetch('/api/v1/admin/posts/bulk-status', {
    method: 'POST',
    body: JSON.stringify({ ids, status }),
  }, bulkOperationResultSchema);
}

export async function adminCrawlPost(sourceUrl: string): Promise<CrawledPost> {
  return adminBlogFetch('/api/v1/admin/posts/crawl', {
    method: 'POST',
    body: JSON.stringify({ sourceUrl }),
  }, crawledPostSchema);
}

export async function adminListRssSources(page = 0, size = 20): Promise<PagedRssSources> {
  return adminBlogFetch(`/api/v1/admin/rss-sources?page=${page}&size=${size}`, { method: 'GET' }, pagedRssSourcesSchema);
}

export async function adminCreateRssSource(input: {
  name: string;
  url: string;
  category?: string;
  isActive?: boolean;
}): Promise<RssSource> {
  return adminBlogFetch('/api/v1/admin/rss-sources', {
    method: 'POST',
    body: JSON.stringify(input),
  }, rssSourceSchema);
}

export async function adminDeleteRssSource(id: string): Promise<void> {
  await adminBlogFetch(`/api/v1/admin/rss-sources/${id}`, { method: 'DELETE' }, z.void());
}

export async function adminScanAllRss(): Promise<RssScanResult> {
  return adminBlogFetch('/api/v1/admin/rss-sources/scan-all', { method: 'POST' }, rssScanResultSchema);
}

export async function adminScanRssSource(id: string): Promise<RssScanResult> {
  return adminBlogFetch(`/api/v1/admin/rss-sources/${id}/scan`, { method: 'POST' }, rssScanResultSchema);
}

