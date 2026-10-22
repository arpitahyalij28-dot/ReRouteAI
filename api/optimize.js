// ReRoute AI 2.0 - Single Truck Optimization Endpoint
// POST /api/optimize
// Validates payload with zod, executes pure matching engine, returns ranked candidate backhauls.

import { z } from 'zod';
import { setCorsHeaders, jsonResponse, errorResponse, parseBody, checkRateLimit } from './_utils.js';
import { evaluateShipments } from '../src/engine/index.js';

const OptimizeSchema = z.object({
  truck: z.object({
    id: z.string(),
  }).passthrough(),
  shipments: z.array(
    z.object({
      id: z.string(),
    }).passthrough()
  ).min(1, 'At least one candidate shipment is required'),
  settings: z.object({}).passthrough().optional(),
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
  const parseResult = OptimizeSchema.safeParse(body);

  if (!parseResult.success) {
    return errorResponse(res, 400, 'Invalid request payload', parseResult.error.format());
  }

  try {
    const { truck, shipments, settings } = parseResult.data;
    const evaluated = evaluateShipments(truck, shipments, settings || {});

    return jsonResponse(res, 200, {
      success: true,
      solver: 'Weighted Multi-Criteria Scoring',
      truckId: truck.id,
      evaluatedCount: evaluated.length,
      feasibleCount: evaluated.filter((e) => e.isFeasible).length,
      recommendedId: evaluated.metadata?.recommendedId || null,
      latencyMs: evaluated.metadata?.latencyMs || 0,
      results: evaluated,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('API optimize error:', err);
    return errorResponse(res, 500, `Optimization failed: ${err.message}`);
  }
}
