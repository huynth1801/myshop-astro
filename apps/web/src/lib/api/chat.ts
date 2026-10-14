import { z } from 'zod';
import { getValidAccessToken } from './auth';

const BASE_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:8080';

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
  const url = new URL(`${BASE_URL}/api/v1/chat/messages`);
  url.searchParams.set('sessionToken', sessionToken);
  if (after) {
    url.searchParams.set('after', after);
  }

  const token = await getValidAccessToken();
  const headers: Record<string, string> = {
    accept: 'application/json',
  };
  if (token) {
    headers.authorization = `Bearer ${token}`;
  }

  const res = await fetch(url.toString(), {
    headers,
    credentials: 'include',
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch conversation (${res.status})`);
  }

  const data = await res.json();
  return chatConversationSchema.parse(data);
}

export async function sendChatMessage(input: SendChatMessageInput): Promise<ChatMessage> {
  const token = await getValidAccessToken();
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    accept: 'application/json',
  };
  if (token) {
    headers.authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}/api/v1/chat/messages`, {
    method: 'POST',
    headers,
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
