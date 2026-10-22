// ReRoute AI 2.0 - Load Parser Client Library
// Tries /api/parse-load serverless endpoint (with Claude) and seamlessly falls back
// to the local pure engine parser without ever failing or freezing the UI.

import { apiFetch } from './api.js';
import { parseLoadText } from '../engine/loadParser.js';

/**
 * Parses raw WhatsApp/transporter message into structured consignment fields.
 * @param {string} text - Message in English, Hindi, Hinglish, or Marathi
 * @param {object} [options] - Optional config (e.g. { now: ISOString })
 * @returns {Promise<object>} Structured load data with confidence metrics and provider info
 */
export async function parseLoadMessage(text, options = {}) {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return {
      success: false,
      error: 'Please enter a load message to parse.',
      data: null,
      confidence: { overall: 0 },
    };
  }

  const trimmed = text.trim();

  // 1. Try serverless endpoint (Anthropic Claude if configured)
  try {
    const res = await apiFetch('/api/parse-load', {
      method: 'POST',
      body: JSON.stringify({
        text: trimmed,
        now: options.now || new Date().toISOString(),
      }),
    });

    if (res && res.success && res.data) {
      return res;
    }
  } catch {
    // Ignore network error and fall through
  }

  // 2. Pure local client engine fallback (guaranteed offline execution)
  const localResult = parseLoadText(trimmed, options);
  return {
    ...localResult,
    provider: 'Deterministic NLP Rules (Client Offline)',
  };
}

export { parseLoadText };
