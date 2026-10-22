// ReRoute AI 2.0 - Health Check Endpoint
// GET /api/health

import { setCorsHeaders, jsonResponse, checkRateLimit, errorResponse } from './_utils.js';
import { supabase, isSupabaseConfigured } from '../src/lib/supabaseClient.js';

const startTime = Date.now();

export default async function handler(req, res) {
  if (setCorsHeaders(req, res)) return;

  const rateCheck = checkRateLimit(req);
  if (!rateCheck.allowed) {
    return errorResponse(res, 429, 'Rate limit exceeded. Please wait.');
  }

  let dbStatus = 'Not configured (Demo Mode active)';
  let dbLatencyMs = null;

  if (isSupabaseConfigured && supabase) {
    const dbStart = performance.now();
    try {
      const { error } = await supabase.from('trucks').select('id', { head: true, count: 'exact' });
      dbLatencyMs = Number((performance.now() - dbStart).toFixed(2));
      dbStatus = error ? `Error: ${error.message}` : 'Connected';
    } catch (err) {
      dbStatus = `Unreachable: ${err.message}`;
    }
  }

  return jsonResponse(res, 200, {
    status: 'healthy',
    service: 'ReRoute AI Serverless API',
    version: '2.0.0',
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
    database: {
      status: dbStatus,
      configured: isSupabaseConfigured,
      latencyMs: dbLatencyMs,
    },
    system: {
      nodeVersion: process.version,
      memory: process.memoryUsage?.() || {},
    },
    timestamp: new Date().toISOString(),
  });
}
