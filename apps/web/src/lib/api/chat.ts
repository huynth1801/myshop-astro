import { z } from 'zod';
import { authHeaders } from './auth';
import { bootstrapAuth } from '../stores/auth';
import { getApiBaseUrl } from './urls';

/**
 * Bearer headers when a signed-in session exists, empty for guests.
 * Awaits the shared session bootstrap instead of calling getValidAccessToken()
 * so the chat widget — mounted on every page — never triggers the /refresh
 * round-trip by itself (bootstrap is a no-op network-wise for guests).
 */
async function chatAuthHeaders(): Promise<Record<string, string>> {
  await bootstrapAuth();
  return authHeaders();
}

export const chatMessageSchema = z.object({
  id: z.string().uuid(),
  sessionToken: z.string().nullish(),
  senderType: z.enum(['CUSTOMER', 'ADMIN']),
  content: z.string(),
  metadata: z.record(z.unknown()).nullish(),
  createdAt: z.string(),
});

export const chatConversationSchema = z.object({
  sessionToken: z.string(),
  customerName: z.string().nullish(),
  customerPhone: z.string().nullish(),
  messages: z.array(chatMessageSchema),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type ChatConversation = z.infer<typeof chatConversationSchema>;

export interface SendChatMessageInput {
  sessionToken?: string;
  content: string;
  customerName?: string;
  customerPhone?: string;
  currentUrl?: string;
  productTitle?: string;
  productSku?: string;
}

const CHAT_SESSION_KEY = 'myshop_chat_session_token';

export function getOrInitChatSession(): string {
  if (typeof window === 'undefined') {
    return 'ssr-temp-session';
  }
  let token = localStorage.getItem(CHAT_SESSION_KEY);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(CHAT_SESSION_KEY, token);
  }
  return token;
}

export async function fetchConversation(sessionToken: string, after?: string): Promise<ChatConversation> {
  const url = new URL(`${getApiBaseUrl()}/api/v1/chat/messages`);
  url.searchParams.set('sessionToken', sessionToken);
  if (after) {
    url.searchParams.set('after', after);
  }

  const res = await fetch(url.toString(), {
    headers: {
      accept: 'application/json',
      ...(await chatAuthHeaders()),
    },
    credentials: 'include',
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch conversation (${res.status})`);
  }

  const data = await res.json();
  return chatConversationSchema.parse(data);
}

export async function sendChatMessage(input: SendChatMessageInput): Promise<ChatMessage> {
  const res = await fetch(`${getApiBaseUrl()}/api/v1/chat/messages`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json',
      ...(await chatAuthHeaders()),
    },
    credentials: 'include',
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    let detail = `Gửi tin nhắn thất bại (${res.status})`;
    try {
      const err = await res.json();
      if (err.detail) detail = err.detail;
    } catch {
      // ignore
    }
    throw new Error(detail);
  }

  const data = await res.json();
  return chatMessageSchema.parse(data);
}
