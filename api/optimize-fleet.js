// ReRoute AI 2.0 - Fleet-Wide Combinatorial Assignment Endpoint
// POST /api/optimize-fleet
// Solves 1-to-1 conflict-free optimal assignment between N trucks and M shipments using the Hungarian algorithm.

import { z } from 'zod';
import { setCorsHeaders, jsonResponse, errorResponse, parseBody, checkRateLimit } from './_utils.js';
import { optimizeFleet } from '../src/engine/index.js';

const OptimizeFleetSchema = z.object({
  trucks: z.array(
    z.object({
      id: z.string(),
    }).passthrough()
  ).min(1, 'At least one truck is required'),
  shipments: z.array(
    z.object({
      id: z.string(),
    }).passthrough()
  ).min(1, 'At least one shipment is required'),
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
  const parseResult = OptimizeFleetSchema.safeParse(body);

  if (!parseResult.success) {
    return errorResponse(res, 400, 'Invalid request payload', parseResult.error.format());
  }

  try {
    const { trucks, shipments, settings } = parseResult.data;
    const result = optimizeFleet(trucks, shipments, settings || {});

    return jsonResponse(res, 200, {
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('API optimize-fleet error:', err);
    return errorResponse(res, 500, `Fleet optimization failed: ${err.message}`);
  }
}
