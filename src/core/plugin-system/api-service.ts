import type { ApiService, ApiEndpoint } from './types';

export function createApiService(apis: Record<string, ApiEndpoint>): ApiService {
  const cache = new Map<string, string>();

  return {
    getUrl(name: string): string {
      const cached = cache.get(name);
      if (cached) return cached;
      const ep = apis[name];
      if (!ep) throw new Error(`Unknown API endpoint: ${name}`);
      const url = `/api${ep.path.startsWith('/') ? ep.path : '/' + ep.path}`;
      cache.set(name, url);
      return url;
    },

    async call(name: string, params?: Record<string, string>, body?: unknown): Promise<unknown> {
      const ep = apis[name];
      if (!ep) throw new Error(`Unknown API endpoint: ${name}`);

      let path = ep.path;
      if (ep.params) {
        const query = new URLSearchParams();
        for (const [k, v] of Object.entries(ep.params)) {
          query.set(k, params?.[k] ?? v);
        }
        const sep = path.includes('?') ? '&' : '?';
        path = `${path}${sep}${query}`;
      } else if (params) {
        const query = new URLSearchParams(params);
        const sep = path.includes('?') ? '&' : '?';
        path = `${path}${sep}${query}`;
      }

      const opts: RequestInit = { method: ep.method, headers: { 'Content-Type': 'application/json' } };
      if (body) opts.body = JSON.stringify(body);

      const res = await fetch(path, opts);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'API error');
      return data;
    },
  };
}
