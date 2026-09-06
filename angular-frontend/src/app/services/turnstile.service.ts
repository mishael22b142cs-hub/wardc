import { Injectable } from '@angular/core';
import { environment } from '@environments/environment';

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id?: string) => void;
      remove: (id: string) => void;
      getResponse: (id?: string) => string | undefined;
    };
  }
}

export interface TurnstileHandle {
  /** Current token, or '' if not yet solved / expired. */
  getResponse(): string;
  /** Force a fresh challenge (token is single-use). */
  reset(): void;
  /** Remove the widget from the DOM. */
  remove(): void;
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

@Injectable({ providedIn: 'root' })
export class TurnstileService {
  private scriptPromise?: Promise<void>;

  /** True when a site key is configured; otherwise the widget is skipped. */
  get enabled(): boolean {
    return !!environment.turnstileSiteKey;
  }

  private loadScript(): Promise<void> {
    if (this.scriptPromise) return this.scriptPromise;
    this.scriptPromise = new Promise<void>((resolve, reject) => {
      if (window.turnstile) return resolve();
      const s = document.createElement('script');
      s.src = SCRIPT_SRC;
      s.async = true;
      s.defer = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Failed to load Turnstile'));
      document.head.appendChild(s);
    });
    return this.scriptPromise;
  }

  /** Render a widget into `el`. Resolves once the API is ready. */
  async render(el: HTMLElement): Promise<TurnstileHandle> {
    if (!this.enabled) {
      return { getResponse: () => 'disabled', reset: () => {}, remove: () => {} };
    }
    await this.loadScript();
    // window.turnstile is set synchronously once api.js runs
    for (let i = 0; i < 50 && !window.turnstile; i++) {
      await new Promise((r) => setTimeout(r, 100));
    }
    if (!window.turnstile) throw new Error('Turnstile API unavailable');

    let token = '';
    const id = window.turnstile.render(el, {
      sitekey: environment.turnstileSiteKey,
      callback: (t: string) => (token = t),
      'expired-callback': () => (token = ''),
      'error-callback': () => (token = ''),
      theme: 'auto',
    });

    return {
      getResponse: () => token || window.turnstile?.getResponse(id) || '',
      reset: () => {
        token = '';
        window.turnstile?.reset(id);
      },
      remove: () => window.turnstile?.remove(id),
    };
  }
}
