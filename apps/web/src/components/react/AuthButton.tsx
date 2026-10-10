import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AuthError } from '../../lib/api/auth';
import { login, register } from '../../lib/api/auth';
import { authOpen, authUser, bootstrapAuth, setUser, signOut } from '../../lib/stores/auth';
import { useStore } from '../../lib/stores/useStore';

/**
 * Header auth island: silent session restore on mount, sign-in/register modal,
 * greeting + sign-out when logged in. Hydrates client:idle (not above-the-fold
 * critical like the cart).
 */
export default function AuthButton() {
  const user = useStore(authUser);
  const open = useStore(authOpen);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void bootstrapAuth();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') authOpen.set(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const authUser =
        mode === 'login' ? await login(email, password) : await register(email, password, name);
      setUser(authUser);
      authOpen.set(false);
      setPassword('');
    } catch (e) {
      if (e instanceof AuthError && e.code === 'EMAIL_TAKEN') {
        setError('Email này đã có tài khoản — chuyển sang Đăng nhập.');
      } else if (e instanceof AuthError && e.code === 'INVALID_CREDENTIALS') {
        setError('Email hoặc mật khẩu không đúng.');
      } else if (e instanceof AuthError && e.code === 'VALIDATION_ERROR') {
        setError('Kiểm tra lại form — mật khẩu cần tối thiểu 12 ký tự.');
      } else {
        setError('Có lỗi xảy ra. Vui lòng thử lại.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {user ? (
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden text-muted-foreground sm:inline">
            Chào, <strong>{user.name}</strong>
          </span>
          <button
            type="button"
            onClick={() => void signOut()}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Đăng xuất
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => authOpen.set(true)}
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Đăng nhập
        </button>
      )}

      {open &&
        createPortal(
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40"
            aria-hidden="true"
            onClick={() => authOpen.set(false)}
          />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div
              role="dialog"
              aria-modal="true"
              aria-label={mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
              className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl"
            >
              <div className="mb-4 flex gap-4 border-b border-border text-sm">
                {(['login', 'register'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => {
                      setMode(tab);
                      setError(null);
                    }}
                    aria-pressed={mode === tab}
                    className={[
                      '-mb-px border-b-2 pb-2 transition',
                      mode === tab
                        ? 'border-foreground font-medium text-foreground'
                        : 'border-transparent text-muted-foreground hover:text-foreground',
                    ].join(' ')}
                  >
                    {tab === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
                  </button>
                ))}
              </div>

              <form onSubmit={(event) => void handleSubmit(event)} className="space-y-3">
                {mode === 'register' && (
                  <label className="block text-sm">
                    <span className="text-muted-foreground">Name</span>
                    <input
                      type="text"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      required
                      autoComplete="name"
                      className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 outline-none focus:border-foreground"
                    />
                  </label>
                )}
                <label className="block text-sm">
                  <span className="text-muted-foreground">Email</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    autoComplete="email"
                    className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 outline-none focus:border-foreground"
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-muted-foreground">Password</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    minLength={mode === 'register' ? 12 : undefined}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 outline-none focus:border-foreground"
                  />
                  {mode === 'register' && (
                    <span className="mt-1 block text-xs text-muted-foreground">Tối thiểu 12 ký tự</span>
                  )}
                </label>

                {error && (
                  <p className="text-sm text-accent" role="alert">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full rounded-full bg-primary px-6 py-2.5 font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
                >
                  {busy ? 'Vui lòng đợi…' : mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
                </button>
              </form>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
