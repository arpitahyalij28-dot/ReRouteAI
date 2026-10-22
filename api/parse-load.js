// ReRoute AI 2.0 - WhatsApp & Regional Message Load Parser Endpoint
// POST /api/parse-load
// Accepts unstructured Hinglish/Hindi/English freight tenders and extracts structured load parameters.
// Uses Anthropic Claude (if key present) with strict JSON output or falls back to pure deterministic regex engine.

import { z } from 'zod';
import { setCorsHeaders, jsonResponse, errorResponse, parseBody, checkRateLimit } from './_utils.js';
import { parseLoadText } from '../src/engine/loadParser.js';

const ParseLoadInputSchema = z.object({
  text: z.string().min(3, 'Text must be at least 3 characters').max(2000, 'Text cannot exceed 2000 characters'),
  now: z.string().optional(),
});

const ParsedLoadOutputSchema = z.object({
  origin: z.string().min(2),
  destination: z.string().min(2),
  weightTons: z.number().positive(),
  cargoType: z.string(),
  freightOfferInr: z.number().nullable().optional(),
  readyTime: z.string().optional(),
  pickupWindowStart: z.string(),
  pickupWindowEnd: z.string(),
  priority: z.enum(['High', 'Medium', 'Standard']).optional().default('Medium'),
  specialRequirements: z.string().optional().default('None'),
  confidence: z
    .object({
      origin: z.number().min(0).max(1).optional(),
      destination: z.number().min(0).max(1).optional(),
      weightTons: z.number().min(0).max(1).optional(),
      cargoType: z.number().min(0).max(1).optional(),
      freightOfferInr: z.number().min(0).max(1).optional(),
      overall: z.number().min(0).max(1).optional(),
    })
    .passthrough()
    .optional(),
});

export default async function handler(req, res) {
  if (setCorsHeaders(req, res)) return;

  if (req.method !== 'POST') {
    return errorResponse(res, 405, 'Method not allowed. Use POST.');
  }

  const rateCheck = checkRateLimit(req);
  if (!rateCheck.allowed) {
    return errorResponse(res, 429, 'Rate limit exceeded.');
  }

  const body = parseBody(req);
  const parseResult = ParseLoadInputSchema.safeParse(body);

  if (!parseResult.success) {
    return errorResponse(res, 400, 'Invalid request payload', parseResult.error.format());
  }

  const { text, now } = parseResult.data;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (anthropicKey) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);

      const prompt = `You are a freight logistics parser for Indian transport operators. Parse the following unstructured WhatsApp or broker load message (which may be in English, Hindi, Hinglish, or Marathi) into a STRICT JSON object.

Input text: "${text}"
Current reference time (now): ${now || new Date().toISOString()}

Return ONLY a valid JSON object matching this schema exactly, with NO markdown backticks, NO explanations, NO intro:
{
  "origin": "<City name in Western India, e.g. Pune, Mumbai, Nashik, Surat>",
  "destination": "<City name in Western India, e.g. Surat, Vapi, Nashik, Mumbai>",
  "weightTons": <number, payload in metric tons, convert kg to tons if needed>,
  "cargoType": "<standard category like 'Steel coils & structural metal', 'FMCG Packaging Materials & Cartons', 'Pharmaceutical & Cold-Chain Goods', 'Automotive Sub-Assemblies & Tier-1 Spares', or 'General Dry Freight'>",
  "freightOfferInr": <number or null, spot price offered in INR>,
  "readyTime": "<ISO 8601 string calculated from relative terms like 'kal subah 6 baje'>",
  "pickupWindowStart": "<HH:mm format, e.g. 06:00>",
  "pickupWindowEnd": "<HH:mm format, e.g. 08:00>",
  "priority": "<'High' or 'Medium'>",
  "specialRequirements": "<any special requirements like tarp, refrigerated, or 'None'>",
  "confidence": {
    "origin": <0.0 to 1.0>,
    "destination": <0.0 to 1.0>,
    "weightTons": <0.0 to 1.0>,
    "cargoType": <0.0 to 1.0>,
    "freightOfferInr": <0.0 to 1.0>,
    "overall": <0.0 to 1.0>
  }
}`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-20241022',
          max_tokens: 450,
          messages: [{ role: 'user', content: prompt }],
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.ok) {
        const json = await response.json();
        const rawContent = json.content?.[0]?.text?.trim();
        if (rawContent) {
          // Clean possible markdown wrappers if LLM returned them
          const cleanedJsonStr = rawContent.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
          const parsedLlm = JSON.parse(cleanedJsonStr);
          const validated = ParsedLoadOutputSchema.safeParse(parsedLlm);
          if (validated.success) {
            return jsonResponse(res, 200, {
              success: true,
              provider: 'Anthropic Claude (AI Parse)',
              data: validated.data,
              confidence: validated.data.confidence || { overall: 0.95 },
              rawText: text,
              timestamp: new Date().toISOString(),
            });
          }
        }
      }
    } catch {
      // Fall through to deterministic engine
    }
  }

  // Pure deterministic NLP fallback
  const deterministicResult = parseLoadText(text, { now });

  return jsonResponse(res, 200, {
    success: deterministicResult.success,
    provider: 'Deterministic NLP Engine (Local Fallback)',
    data: deterministicResult.data,
    confidence: deterministicResult.confidence,
    rawText: text,
    timestamp: new Date().toISOString(),
  });
}
