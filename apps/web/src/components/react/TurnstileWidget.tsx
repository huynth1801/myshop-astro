import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          'error-callback'?: () => void;
          'expired-callback'?: () => void;
          theme?: 'light' | 'dark' | 'auto';
        }
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

interface Props {
  onVerify: (token: string) => void;
  className?: string;
}

export default function TurnstileWidget({ onVerify, className = '' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  const siteKey = import.meta.env.PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    // If no sitekey is configured, bypass Turnstile widget rendering (e.g. local dev)
    if (!siteKey || !containerRef.current) return;

    let timer: NodeJS.Timeout | null = null;

    const initWidget = () => {
      if (window.turnstile && containerRef.current && !widgetIdRef.current) {
        try {
          widgetIdRef.current = window.turnstile.render(containerRef.current, {
            sitekey: siteKey,
            callback: (token: string) => onVerify(token),
            'expired-callback': () => onVerify(''),
            'error-callback': () => onVerify(''),
            theme: 'auto',
          });
        } catch {
          // ignore render error if already initialized
        }
      } else if (!window.turnstile) {
        timer = setTimeout(initWidget, 200);
      }
    };

    initWidget();

    return () => {
      if (timer) clearTimeout(timer);
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore cleanup errors
        }
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, onVerify]);

  if (!siteKey) return null;

  return <div ref={containerRef} className={`my-2 flex justify-center ${className}`} />;
}
