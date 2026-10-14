import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Sparkles } from 'lucide-react';
import { useStore } from '../../lib/stores/useStore';
import {
  isChatOpen,
  chatMessages,
  unreadAdminCount,
  isSendingMessage,
  toggleChat,
  closeChat,
  submitChatMessage,
  refreshChatMessages,
} from '../../lib/stores/chat';

interface ChatWidgetProps {
  productTitle?: string;
  productSku?: string;
}

export function ChatWidget({ productTitle, productSku }: ChatWidgetProps) {
  const isOpen = useStore(isChatOpen);
  const messages = useStore(chatMessages);
  const unreadCount = useStore(unreadAdminCount);
  const isSending = useStore(isSendingMessage);
  const [inputText, setInputText] = useState('');
  const [detectedTitle, setDetectedTitle] = useState<string | undefined>(productTitle);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void refreshChatMessages();
  }, []);

  useEffect(() => {
    if (productTitle) {
      setDetectedTitle(productTitle);
    } else if (typeof window !== 'undefined' && window.location.pathname.includes('/products/')) {
      const h1 = document.querySelector('h1')?.textContent?.trim();
      if (h1) setDetectedTitle(h1);
    }
  }, [productTitle, isOpen]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isOpen, messages]);

  async function handleSend(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!inputText.trim() || isSending) return;
    const text = inputText;
    setInputText('');
    await submitChatMessage(text, { productTitle: detectedTitle, productSku });
  }

  function handleQuickPrompt(prompt: string) {
    setInputText(prompt);
  }

  return (
    <>
      {/* Floating Trigger Button */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center">
        <button
          type="button"
          onClick={toggleChat}
          aria-label={isOpen ? 'Đóng chat' : 'Mở chat tư vấn'}
          className="relative group flex items-center justify-center w-14 h-14 rounded-full bg-neutral-900 text-white shadow-xl hover:bg-neutral-800 transition-all duration-300 hover:scale-105 active:scale-95"
        >
          {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}

          {/* Unread badge */}
          {unreadCount > 0 && !isOpen && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-5 h-5 px-1.5 text-[11px] font-bold text-white bg-rose-500 rounded-full animate-bounce">
              {unreadCount}
            </span>
          )}

          {/* Online status indicator dot */}
          {!isOpen && (
            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full" />
          )}
        </button>
      </div>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[380px] h-[520px] max-h-[80vh] bg-white rounded-2xl shadow-2xl border border-neutral-200/80 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="px-4 py-3.5 bg-neutral-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="relative w-9 h-9 rounded-full bg-neutral-800 flex items-center justify-center border border-neutral-700">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border border-neutral-900 rounded-full" />
              </div>
              <div>
                <h3 className="text-sm font-semibold leading-tight">Thuy Shop Tư Vấn</h3>
                <p className="text-[11px] text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Trực tuyến qua Telegram
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={closeChat}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition"
              aria-label="Đóng chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Product context pill if viewing a product */}
          {detectedTitle && (
            <div className="px-3 py-2 bg-neutral-50 border-b border-neutral-100 flex items-center justify-between text-xs text-neutral-600">
              <span className="truncate pr-2">🛍️ Đang xem: <b className="text-neutral-800">{detectedTitle}</b></span>
              <button
                type="button"
                onClick={() => handleQuickPrompt(`Shop ơi tư vấn mẫu "${detectedTitle}" giúp mình với!`)}
                className="text-[11px] text-neutral-900 font-medium hover:underline shrink-0"
              >
                Hỏi mẫu này
              </button>
            </div>
          )}

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-neutral-50/50">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col justify-center items-center text-center px-4 text-neutral-500">
                <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mb-3 text-neutral-400">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium text-neutral-800 mb-1">Xin chào bạn!</p>
                <p className="text-xs text-neutral-500 mb-4">
                  Shop tư vấn trực tiếp tới Telegram của chủ shop. Bạn hãy nhắn tin để được hỗ trợ nhé!
                </p>
                <div className="flex flex-col gap-1.5 w-full">
                  <button
                    type="button"
                    onClick={() => handleQuickPrompt('Shop tư vấn size giúp mình với ạ!')}
                    className="text-xs text-left px-3 py-2 bg-white border border-neutral-200 rounded-xl hover:border-neutral-900 transition"
                  >
                    💬 Tư vấn size phù hợp
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickPrompt('Thời gian và phí giao hàng như thế nào ạ?')}
                    className="text-xs text-left px-3 py-2 bg-white border border-neutral-200 rounded-xl hover:border-neutral-900 transition"
                  >
                    🚚 Thời gian và phí giao hàng
                  </button>
                </div>
              </div>
            ) : (
              messages.map((msg) => {
                const isAdmin = msg.senderType === 'ADMIN';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isAdmin ? 'items-start' : 'items-end'}`}
                  >
                    <span className="text-[10px] text-neutral-400 mb-1 px-1">
                      {isAdmin ? 'Thuy Shop' : 'Bạn'}
                    </span>
                    <div
                      className={`px-3.5 py-2.5 rounded-2xl max-w-[85%] text-sm leading-relaxed shadow-sm ${
                        isAdmin
                          ? 'bg-white text-neutral-900 border border-neutral-200/80 rounded-tl-sm'
                          : 'bg-neutral-900 text-white rounded-tr-sm'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Footer Input */}
          <form onSubmit={handleSend} className="p-3 bg-white border-t border-neutral-100">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Nhập tin nhắn..."
                disabled={isSending}
                className="flex-1 px-3.5 py-2.5 text-sm bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-neutral-900 focus:bg-white transition"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || isSending}
                className="p-2.5 bg-neutral-900 text-white rounded-xl hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed transition shrink-0"
                aria-label="Gửi tin nhắn"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[10px] text-neutral-400 text-center mt-2">
              ⚡ Phản hồi trực tiếp tới điện thoại chủ shop qua Telegram
            </p>
          </form>
        </div>
      )}
    </>
  );
}
