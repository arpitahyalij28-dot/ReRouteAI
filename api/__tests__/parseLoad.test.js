// ReRoute AI 2.0 - Serverless /api/parse-load Tests
import { describe, it, expect, vi, beforeEach } from 'vitest';
import parseLoadHandler from '../parse-load.js';

function createMockReqRes({ method = 'POST', body = {}, headers = {} } = {}) {
  const req = {
    method,
    body,
    headers: { 'x-forwarded-for': '127.0.0.1', ...headers },
  };

  const res = {
    statusCode: 200,
    headers: {},
    responseData: null,
    setHeader(key, value) {
      this.headers[key] = value;
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.responseData = data;
      return this;
    },
    end() {
      return this;
    },
  };

  return { req, res };
}

describe('Serverless Backend Endpoints (/api/parse-load)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects non-POST methods with 405', async () => {
    const { req, res } = createMockReqRes({ method: 'GET' });
    await parseLoadHandler(req, res);

    expect(res.statusCode).toBe(405);
    expect(res.responseData.error).toContain('Method not allowed');
  });

  it('rejects missing or empty text payload with 400', async () => {
    const { req, res } = createMockReqRes({ method: 'POST', body: { text: '' } });
    await parseLoadHandler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.responseData.error).toContain('Invalid request payload');
  });

  it('parses unformatted Hinglish text and returns structured load via local fallback', async () => {
    const { req, res } = createMockReqRes({
      method: 'POST',
      body: {
        text: 'kal subah 6 baje Pune se Surat 12 ton steel bhejna hai, 28000 dunga',
        now: '2026-10-23T00:00:00.000Z',
      },
    });

    await parseLoadHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.responseData.success).toBe(true);
    expect(res.responseData.data.origin).toBe('Pune');
    expect(res.responseData.data.destination).toBe('Surat');
    expect(res.responseData.data.weightTons).toBe(12);
    expect(res.responseData.data.freightOfferInr).toBe(28000);
    expect(res.responseData.confidence.overall).toBeGreaterThanOrEqual(0.8);
    expect(res.responseData.provider).toContain('Deterministic NLP Engine');
  });

  it('handles simulated Anthropic Claude response when ANTHROPIC_API_KEY is present', async () => {
    const originalKey = process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_API_KEY = 'mock-anthropic-key-for-test';

    const mockClaudePayload = {
      origin: 'Nashik',
      destination: 'Vapi',
      weightTons: 8,
      cargoType: 'FMCG Packaging Materials & Cartons',
      freightOfferInr: 18000,
      readyTime: '2026-10-24T10:00:00.000Z',
      pickupWindowStart: '10:00',
      pickupWindowEnd: '12:00',
      priority: 'High',
      specialRequirements: 'Urgent transit',
      confidence: {
        origin: 0.98,
        destination: 0.98,
        weightTons: 0.99,
        cargoType: 0.95,
        freightOfferInr: 0.98,
        overall: 0.97,
      },
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ text: JSON.stringify(mockClaudePayload) }],
      }),
    });

    const { req, res } = createMockReqRes({
      method: 'POST',
      body: { text: 'kal 10am Nashik to Vapi 8T FMCG bhada 18k urgent' },
    });

    await parseLoadHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.responseData.success).toBe(true);
    expect(res.responseData.provider).toBe('Anthropic Claude (AI Parse)');
    expect(res.responseData.data.origin).toBe('Nashik');
    expect(res.responseData.data.destination).toBe('Vapi');
    expect(res.responseData.data.freightOfferInr).toBe(18000);

    // Restore env
    if (originalKey) {
      process.env.ANTHROPIC_API_KEY = originalKey;
    } else {
      delete process.env.ANTHROPIC_API_KEY;
    }
  });
});
