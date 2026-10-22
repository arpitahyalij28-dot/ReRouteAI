// ReRoute AI 2.0 - Dynamic Disruption Recovery Endpoint
// POST /api/recover
// Self-healing recovery triggered when an active assignment or candidate load is cancelled or disrupted.

import { z } from 'zod';
import { setCorsHeaders, jsonResponse, errorResponse, parseBody, checkRateLimit } from './_utils.js';
import { executeRecoverySequence } from '../src/engine/index.js';

const RecoverSchema = z.object({
  truck: z.object({
    id: z.string(),
  }).passthrough(),
  shipments: z.array(
    z.object({
      id: z.string(),
    }).passthrough()
  ).min(1, 'At least one candidate shipment is required'),
  cancelledShipmentId: z.string().min(1, 'Cancelled shipment ID is required'),
  reason: z.string().optional(),
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
  const parseResult = RecoverSchema.safeParse(body);

  if (!parseResult.success) {
    return errorResponse(res, 400, 'Invalid request payload', parseResult.error.format());
  }

  try {
    const { truck, shipments, cancelledShipmentId, reason, settings } = parseResult.data;
    const recoveryResult = await executeRecoverySequence(
      truck,
      shipments,
      cancelledShipmentId,
      settings || {},
      reason || 'Shipper tender cancellation'
    );

    return jsonResponse(res, 200, {
      success: true,
      ...recoveryResult,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('API recover error:', err);
    return errorResponse(res, 500, `Recovery execution failed: ${err.message}`);
  }
}
