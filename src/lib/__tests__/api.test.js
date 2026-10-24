// Logistics Twin - API Client Test Suite
import { describe, it, expect, vi } from 'vitest';
import { apiFetch } from '../api.js';

describe('apiFetch client wrapper', () => {
  it('returns null gracefully on network failure without throwing', async () => {
    // Calling an unreachable endpoint
    const res = await apiFetch('/api/non-existent-endpoint-test-failure');
    expect(res).toBeNull();
  });

  it('aborts and returns null on timeout', async () => {
    // Create an artificial slow fetch mock or short timeout
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 200)));

    const res = await apiFetch('/api/test-timeout', { timeout: 20 });
    expect(res).toBeNull();

    global.fetch = originalFetch;
  });
});
