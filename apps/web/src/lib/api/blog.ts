import { z } from 'zod';
import { productSummarySchema } from './products';
import { authHeaders } from './auth';

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
  createdAt: z.string(),
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
  createdAt: z.string(),
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
  createdAt: z.string(),
  updatedAt: z.string().nullish(),
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
  const res = await fetch(`${CLIENT_BASE_URL}${path}`, {
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

  return schema.parse(await res.json());
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

export async function adminCrawlPost(sourceUrl: string): Promise<CrawledPost> {
  return adminBlogFetch('/api/v1/admin/posts/crawl', {
    method: 'POST',
    body: JSON.stringify({ sourceUrl }),
  }, crawledPostSchema);
}
