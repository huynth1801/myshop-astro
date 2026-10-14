import { atom } from 'nanostores';
import {
  fetchConversation,
  getOrInitChatSession,
  sendChatMessage,
  type ChatMessage,
} from '../api/chat';
import { authUser } from './auth';

export const isChatOpen = atom<boolean>(false);
export const chatMessages = atom<ChatMessage[]>([]);
export const unreadAdminCount = atom<number>(0);
export const isSendingMessage = atom<boolean>(false);

let pollingTimer: ReturnType<typeof setInterval> | null = null;
let lastSeenMessageCount = 0;

export function toggleChat(): void {
  const next = !isChatOpen.get();
  isChatOpen.set(next);
  if (next) {
    unreadAdminCount.set(0);
    lastSeenMessageCount = chatMessages.get().length;
    startChatPolling();
  } else {
    stopChatPolling();
  }
}

export function openChat(): void {
  isChatOpen.set(true);
  unreadAdminCount.set(0);
  lastSeenMessageCount = chatMessages.get().length;
  startChatPolling();
}

export function closeChat(): void {
  isChatOpen.set(false);
  stopChatPolling();
}

export async function refreshChatMessages(): Promise<void> {
  const sessionToken = getOrInitChatSession();
  try {
    const conv = await fetchConversation(sessionToken);
    const newMessages = conv.messages;
    const currentOpen = isChatOpen.get();

    if (!currentOpen && newMessages.length > lastSeenMessageCount) {
      const addedAdmin = newMessages
        .slice(lastSeenMessageCount)
        .filter((m) => m.senderType === 'ADMIN').length;
      if (addedAdmin > 0) {
        unreadAdminCount.set(unreadAdminCount.get() + addedAdmin);
      }
    }

    chatMessages.set(newMessages);
    if (currentOpen) {
      lastSeenMessageCount = newMessages.length;
    }
  } catch {
    // Fail silently in background polling
  }
}

export async function submitChatMessage(
  content: string,
  extra?: { currentUrl?: string; productTitle?: string; productSku?: string }
): Promise<void> {
  const trimmed = content.trim();
  if (!trimmed || isSendingMessage.get()) return;

  const sessionToken = getOrInitChatSession();
  const user = authUser.get();

  isSendingMessage.set(true);
  try {
    const sent = await sendChatMessage({
      sessionToken,
      content: trimmed,
      customerName: user?.name,
      customerPhone: undefined,
      currentUrl: extra?.currentUrl ?? (typeof window !== 'undefined' ? window.location.href : undefined),
      productTitle: extra?.productTitle,
      productSku: extra?.productSku,
    });

    const current = chatMessages.get();
    chatMessages.set([...current, sent]);
    lastSeenMessageCount = chatMessages.get().length;
  } finally {
    isSendingMessage.set(false);
  }
}

export function startChatPolling(): void {
  if (pollingTimer) return;
  void refreshChatMessages();
  pollingTimer = setInterval(() => {
    void refreshChatMessages();
  }, 2500);
}

export function stopChatPolling(): void {
  if (pollingTimer) {
    clearInterval(pollingTimer);
    pollingTimer = null;
  }
}
