// Logistics Twin - Serverless API Client
// Provides a resilient wrapper around backend /api/* serverless endpoints with a 4s timeout.
// Returns null on any failure (network error, timeout, 4xx/5xx) so all callers gracefully
// fall back to the client-side pure mathematical engine.

const API_BASE = import.meta.env?.VITE_API_BASE || '';
const DEFAULT_TIMEOUT_MS = 4000;

/**
 * Robust fetch wrapper with automatic timeout, JSON serialization and null fallback.
 * @param {string} path - e.g. '/api/route', '/api/recover', '/api/weather'
 * @param {RequestInit} [options] - Standard fetch options
 * @returns {Promise<any | null>} JSON response payload or null on failure
 */
export async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeout || DEFAULT_TIMEOUT_MS);

  // Allow custom signal chaining if provided
  if (options.signal) {
    options.signal.addEventListener('abort', () => controller.abort());
  }

  try {
    const fetchOptions = {
      ...options,
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        ...(options.body && typeof options.body === 'string' ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {}),
      },
    };

    const res = await fetch(url, fetchOptions);
    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`[API] ${path} returned HTTP ${res.status}`);
      return null;
    }

    const data = await res.json();
    return data;
  } catch (err) {
    clearTimeout(timeoutId);
    // Timeout or network disconnect (e.g. offline demo mode or npm run dev without vercel dev)
    if (err.name === 'AbortError') {
      console.info(`[API] ${path} timed out after ${DEFAULT_TIMEOUT_MS}ms. Using local engine fallback.`);
    } else {
      console.info(`[API] ${path} unreachable (${err.message}). Using local engine fallback.`);
    }
    return null;
  }
}

export default apiFetch;
