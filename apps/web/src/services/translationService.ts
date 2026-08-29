import { Language } from '../i18n/sourceStrings';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');
const CACHE_STORAGE_KEY = 'queuesense_runtime_translation_cache';

class TranslationService {
  private cache: Map<string, string> = new Map();
  private pendingRequests: Map<string, Promise<string>> = new Map();
  private isLoadedFromStorage = false;

  constructor() {
    this.loadStorageCache();
  }

  private loadStorageCache() {
    if (this.isLoadedFromStorage || typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(CACHE_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        Object.entries(parsed).forEach(([k, v]) => {
          if (typeof v === 'string') this.cache.set(k, v);
        });
      }
    } catch {}
    this.isLoadedFromStorage = true;
  }

  private persistStorageCache() {
    if (typeof window === 'undefined') return;
    try {
      const obj: Record<string, string> = {};
      this.cache.forEach((v, k) => {
        obj[k] = v;
      });
      localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(obj));
    } catch {}
  }

  private getCacheKey(text: string, targetLang: Language): string {
    return `${targetLang}:${text.trim()}`;
  }

  public getCached(text: string, targetLang: Language): string | undefined {
    if (!text || targetLang === 'en') return text;
    const key = this.getCacheKey(text, targetLang);
    return this.cache.get(key);
  }

  public async translateText(text: string, targetLang: Language): Promise<string> {
    if (!text || !text.trim() || targetLang === 'en') return text;

    const cacheKey = this.getCacheKey(text, targetLang);
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey)!;
    }

    const promise = (async () => {
      try {
        // 1. Try Backend Fastify translation API
        const response = await fetch(`${API_BASE}/api/v1/translate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            targetLang,
            sourceLang: 'en',
          }),
        });

        if (response.ok) {
          const json = await response.json();
          if (json.translatedText) {
            this.cache.set(cacheKey, json.translatedText);
            this.persistStorageCache();
            return json.translatedText;
          }
        }
      } catch (err) {
        // Backend API not reachable, try direct public fallback
      }

      try {
        // 2. Direct Translation Service Fallback (MyMemory public translation API)
        const pair = `en|${targetLang}`;
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(pair)}`;
        const res = await fetch(url);
        if (res.ok) {
          const json = await res.json();
          const translated = json.responseData?.translatedText;
          if (translated && !translated.toUpperCase().includes('MYMEMORY WARNING')) {
            this.cache.set(cacheKey, translated);
            this.persistStorageCache();
            return translated;
          }
        }
      } catch {}

      return text;
    })();

    this.pendingRequests.set(cacheKey, promise);

    try {
      const result = await promise;
      return result;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  public async translateBatch(texts: string[], targetLang: Language): Promise<Record<string, string>> {
    if (!texts || texts.length === 0 || targetLang === 'en') {
      const map: Record<string, string> = {};
      texts.forEach((t) => (map[t] = t));
      return map;
    }

    const results: Record<string, string> = {};
    const missing: string[] = [];

    texts.forEach((text) => {
      const cached = this.getCached(text, targetLang);
      if (cached) {
        results[text] = cached;
      } else {
        missing.push(text);
      }
    });

    if (missing.length === 0) {
      return results;
    }

    try {
      // Send batch to backend translation API
      const response = await fetch(`${API_BASE}/api/v1/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          texts: missing,
          targetLang,
          sourceLang: 'en',
        }),
      });

      if (response.ok) {
        const json = await response.json();
        if (json.translations) {
          Object.entries(json.translations).forEach(([src, trans]) => {
            if (typeof trans === 'string') {
              this.cache.set(this.getCacheKey(src, targetLang), trans);
              results[src] = trans;
            }
          });
          this.persistStorageCache();
        }
      }
    } catch {}

    // Fallback for remaining missing items
    await Promise.all(
      missing.map(async (str) => {
        if (!results[str]) {
          const trans = await this.translateText(str, targetLang);
          results[str] = trans;
        }
      })
    );

    return results;
  }
}

export const translationService = new TranslationService();
