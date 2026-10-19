import { useEffect, useState } from 'react';
import { googleLoginUrl } from '../../lib/api/auth';

/** Vietnamese messages for the ?auth_error=… codes the OAuth callback returns. */
const OAUTH_ERRORS: Record<string, string> = {
  access_denied: 'Bạn đã huỷ đăng nhập qua Google.',
  oauth_not_configured: 'Đăng nhập Google chưa được cấu hình trên máy chủ.',
  oauth_email: 'Google chưa xác nhận email của bạn — hãy kiểm tra lại tài khoản Google.',
  state_mismatch: 'Phiên đăng nhập không hợp lệ — hãy thử lại.',
  bad_redirect: 'Địa chỉ trả về không được cho phép.',
  oauth_failed: 'Không đăng nhập được qua Google. Vui lòng thử lại.',
};

export function oauthErrorMessage(code: string): string {
  return OAUTH_ERRORS[code] ?? OAUTH_ERRORS.oauth_failed;
}

/**
 * "Đăng nhập với Google" — a plain link to the API's authorize endpoint
 * (ADR 0004), so it works even before the island finishes hydrating.
 */
export default function GoogleLoginLink() {
  // SSR renders href="#": location only exists in the browser after hydration.
  const [href, setHref] = useState('#');
  useEffect(() => {
    setHref(googleLoginUrl());
  }, []);

  return (
    <a
      href={href}
      className="flex w-full items-center justify-center gap-2 rounded-full border border-border bg-card px-6 py-2.5 text-sm font-semibold transition-colors hover:bg-muted"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="#4285F4"
          d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.54 5.54 0 0 1-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
        />
        <path
          fill="#34A853"
          d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A11.99 11.99 0 0 0 12 24z"
        />
        <path
          fill="#FBBC05"
          d="M5.27 14.29A7.2 7.2 0 0 1 4.89 12c0-.8.14-1.57.38-2.29V6.62H1.29a12 12 0 0 0 0 10.76l3.98-3.09z"
        />
        <path
          fill="#EA4335"
          d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42A11.5 11.5 0 0 0 12 0 11.99 11.99 0 0 0 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"
        />
      </svg>
      Đăng nhập với Google
    </a>
  );
}
