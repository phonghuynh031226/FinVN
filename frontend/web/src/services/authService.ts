import { UserProfile } from '../types/user';
import { storageService } from './storage';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: 'standard' | 'icon';
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              logo_alignment?: 'left' | 'center';
              width?: string | number;
              locale?: string;
            }
          ) => void;
          prompt: (momentListener?: (moment: any) => void) => void;
          revoke: (hint: string, done: () => void) => void;
        };
      };
    };
  }
}

const CONNECTOR_URL = ((import.meta.env.VITE_BANK_CONNECTOR_URL as string | undefined)?.trim() || window.location.origin).replace(/\/$/, '');
const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string || '').trim();

const USER_STORAGE_KEY = 'finvn_auth_user';
const CSRF_COOKIE = 'finvn_csrf';

type AuthListener = (user: UserProfile | null) => void;

class AuthService {
  private currentUser: UserProfile | null = null;
  private listeners: Set<AuthListener> = new Set();
  private isInitialized = false;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      localStorage.removeItem('finvn_auth_token');
      this.currentUser = null;
      void this.restoreSession();
    } catch {
      this.currentUser = null;
      this.currentUser = null;
    }
  }

  public getCurrentUser(): UserProfile | null {
    return this.currentUser;
  }

  public getToken(): string | null {
    return null;
  }

  public getUserId(): string {
    return this.currentUser?.id || '';
  }

  public isAuthenticated(): boolean {
    return Boolean(this.currentUser);
  }

  public subscribe(listener: AuthListener): () => void {
    this.listeners.add(listener);
    listener(this.currentUser);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    for (const listener of this.listeners) {
      listener(this.currentUser);
    }
  }

  public async loginWithGoogleToken(credential: string): Promise<UserProfile> {
    const resp = await fetch(`${CONNECTOR_URL}/api/auth/google`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.detail || 'Đăng nhập Google không thành công.');
    }

    const data = await resp.json();
    this.currentUser = data.user;

    try {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(this.currentUser));
      localStorage.removeItem('finvn_auth_token');
    } catch {
      // ignore
    }

    this.notify();
    return this.currentUser!;
  }

  public logout() {
    void this.apiFetch(`${CONNECTOR_URL}/api/auth/logout`, { method: 'POST' }).catch(() => undefined);
    this.currentUser = null;
    try {
      localStorage.removeItem(USER_STORAGE_KEY);
      localStorage.removeItem('finvn_auth_token');
      storageService.clearAll();
    } catch {
      // ignore
    }
    this.notify();
  }

  public async restoreSession(): Promise<void> {
    try {
      const response = await fetch(`${CONNECTOR_URL}/api/auth/me`, { credentials: 'include' });
      if (!response.ok) throw new Error('Session expired');
      const user = await response.json();
      this.currentUser = { ...user, isAuthenticated: true } as UserProfile;
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(this.currentUser));
    } catch {
      this.currentUser = null;
      localStorage.removeItem(USER_STORAGE_KEY);
    }
    this.notify();
  }

  public apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
    const csrf = document.cookie.split('; ').find((part) => part.startsWith(`${CSRF_COOKIE}=`))?.split('=').slice(1).join('=');
    const headers = new Headers(init.headers);
    if (csrf && !['GET', 'HEAD', 'OPTIONS'].includes((init.method || 'GET').toUpperCase())) {
      headers.set('X-CSRF-Token', decodeURIComponent(csrf));
    }
    return fetch(input, { ...init, headers, credentials: 'include' });
  }

  public renderGoogleButton(
    container: HTMLElement,
    onSuccess: (user: UserProfile) => void,
    onError: (err: string) => void,
    options?: { theme?: 'outline' | 'filled_blue' | 'filled_black'; width?: number }
  ) {
    if (!GOOGLE_CLIENT_ID) {
      onError('Chưa cấu hình VITE_GOOGLE_CLIENT_ID');
      return;
    }

    const initGIS = () => {
      if (!window.google?.accounts?.id) {
        setTimeout(initGIS, 200);
        return;
      }

      try {
        if (!this.isInitialized) {
          window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: async (res) => {
              try {
                const user = await this.loginWithGoogleToken(res.credential);
                onSuccess(user);
              } catch (err: any) {
                onError(err.message || 'Đăng nhập Google thất bại');
              }
            },
            auto_select: false,
            cancel_on_tap_outside: true,
          });
          this.isInitialized = true;
        }

        container.innerHTML = '';
        window.google.accounts.id.renderButton(container, {
          type: 'standard',
          theme: options?.theme || 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'pill',
          logo_alignment: 'left',
          width: options?.width || 220,
          locale: 'vi',
        });
      } catch (e: any) {
        onError(e.message || 'Lỗi khởi tạo nút Google');
      }
    };

    initGIS();
  }
}

export const authService = new AuthService();
