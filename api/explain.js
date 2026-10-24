// Logistics Twin - Explainable Decision Summary Endpoint
// POST /api/explain
// Generates a 3-sentence dispatcher-friendly explanation for an optimization decision.
// Uses LLM if API key is present in server environment, otherwise returns a deterministic template.
// Security: Never sends secrets, driver names, or PII; only numeric factor metrics.

import { z } from 'zod';
import { setCorsHeaders, jsonResponse, errorResponse, parseBody, checkRateLimit } from './_utils.js';

const ExplainSchema = z.object({
  shipmentId: z.string(),
  truckId: z.string().optional().default('Selected Truck'),
  matchScore: z.number().min(0).max(100),
  isFeasible: z.boolean().default(true),
  factors: z.object({
    route: z.number().optional().default(50),
    time: z.number().optional().default(50),
    capacity: z.number().optional().default(50),
    detour: z.number().optional().default(50),
    cost: z.number().optional().default(50),
    disruption: z.number().optional().default(50),
  }).passthrough().optional(),
  detourKm: z.number().optional().default(10),
  etaBufferMinutes: z.number().optional().default(15),
  capacityUtilizationPct: z.number().optional().default(80),
  grossYieldInr: z.number().optional().default(25000),
  weatherRiskLevel: z.enum(['low', 'medium', 'high']).optional(),
  weatherPenalty: z.number().optional().default(0),
  weatherDisruptionDelta: z.number().optional().default(0),
});

function generateDeterministicExplanation(data) {
  const {
    shipmentId,
    matchScore,
    isFeasible,
    factors = {},
    detourKm,
    etaBufferMinutes,
    capacityUtilizationPct,
    grossYieldInr,
    weatherRiskLevel,
    weatherPenalty,
  } = data;

  if (!isFeasible) {
    return `Shipment ${shipmentId} was disqualified by the optimization engine because it breaches core physical or timing feasibility limits. The required payload or schedule cannot be safely accommodated by the vehicle's remaining corridor capacity. Dispatchers should keep this vehicle committed to compliant candidates.`;
  }

  const timingPhrase =
    etaBufferMinutes >= 30
      ? `Truck reaches the pickup bay with a comfortable ${etaBufferMinutes}-minute buffer before dock cutoff.`
      : etaBufferMinutes >= 0
      ? `Truck arrives on schedule with a tight ${etaBufferMinutes}-minute buffer before dock operations begin.`
      : `Truck arrives ${Math.abs(etaBufferMinutes)} minutes after ideal pickup, introducing minor schedule risk.`;

  const detourPhrase =
    detourKm <= 10
      ? `With only ${detourKm} km of incremental detour, return vector diversion is minimal.`
      : `The route requires a +${detourKm} km detour from the direct home corridor.`;

  const yieldPhrase = `The backhaul delivers ${capacityUtilizationPct}% payload utilization and ₹${grossYieldInr.toLocaleString('en-IN')} gross spot yield.`;

  const weatherPhrase =
    weatherPenalty > 0 || (weatherRiskLevel && weatherRiskLevel !== 'low')
      ? ` Corridor atmospheric conditions indicate ${weatherRiskLevel || 'moderate'} weather risk with a -${weatherPenalty || 15} pt disruption penalty.`
      : '';

  return `Shipment ${shipmentId} ranks at ${matchScore}% overall compatibility based on multi-criteria analysis. ${timingPhrase} ${detourPhrase} ${yieldPhrase}${weatherPhrase}`;
}

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
  const parseResult = ExplainSchema.safeParse(body);

  if (!parseResult.success) {
    return errorResponse(res, 400, 'Invalid request payload', parseResult.error.format());
  }

  const data = parseResult.data;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (anthropicKey) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);

      const prompt = `You are an AI logistics assistant for freight dispatchers. In exactly 3 professional, concise sentences, explain why shipment ${data.shipmentId} achieved a match score of ${data.matchScore}% (${data.isFeasible ? 'FEASIBLE' : 'INFEASIBLE'}).
Factors: Route ${data.factors?.route}/100, Time ${data.factors?.time}/100 (buffer: ${data.etaBufferMinutes}m), Capacity ${data.factors?.capacity}/100 (${data.capacityUtilizationPct}% full), Detour ${data.factors?.detour}/100 (+${data.detourKm}km), Cost ${data.factors?.cost}/100 (₹${data.grossYieldInr}), Disruption ${data.factors?.disruption}/100${data.weatherPenalty ? `, Weather Penalty: -${data.weatherPenalty}pts (${data.weatherRiskLevel || 'high'})` : ''}.
Do not include headings, bullet points, or markdown. Output only the 3 sentences.`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-20241022',
          max_tokens: 200,
          messages: [{ role: 'user', content: prompt }],
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.ok) {
        const json = await response.json();
        const text = json.content?.[0]?.text?.trim();
        if (text) {
          return jsonResponse(res, 200, {
            success: true,
            provider: 'Anthropic Claude (AI Explained)',
            explanation: text,
            timestamp: new Date().toISOString(),
          });
        }
      }
    } catch {
      // Fall through to deterministic template if LLM call fails
    }
  }

  const deterministic = generateDeterministicExplanation(data);
  return jsonResponse(res, 200, {
    success: true,
    provider: 'Deterministic Multi-Criteria Rules (Template Fallback)',
    explanation: deterministic,
    timestamp: new Date().toISOString(),
  });
}
