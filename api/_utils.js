// Logistics Twin - Serverless API Helpers
// Provides tight CORS, in-memory rate limiting, and typed JSON responses.

const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 120; // 120 reqs/min

/**
 * Applies in-memory rate limiting per client IP
 */
export function checkRateLimit(req) {
  const ip =
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    '127.0.0.1';

  const now = Date.now();
  const clientRecord = rateLimitMap.get(ip);

  if (!clientRecord || now - clientRecord.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { windowStart: now, count: 1 });
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - 1 };
  }

  if (clientRecord.count >= MAX_REQUESTS_PER_WINDOW) {
    return { allowed: false, remaining: 0 };
  }

  clientRecord.count += 1;
  return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - clientRecord.count };
}

/**
 * Handles CORS headers and OPTIONS pre-flight
 */
export function setCorsHeaders(req, res) {
  const allowedOrigin =
    process.env.ALLOWED_ORIGIN ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);
  const requestOrigin = req.headers?.origin;

  if (req.method === 'GET' && !req.headers?.authorization && !req.headers?.cookie) {
    // Read-only endpoints can safely allow wildcard without credentials
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else if (requestOrigin && (requestOrigin === allowedOrigin || !allowedOrigin)) {
    // Exact matching origin or dev reflection with credentials
    res.setHeader('Access-Control-Allow-Origin', requestOrigin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else if (allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else {
    // Fallback: Wildcard WITHOUT Allow-Credentials to adhere to CORS spec
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }
  return false;
}

/**
 * Sends typed JSON response
 */
export function jsonResponse(res, statusCode, data) {
  res.setHeader('Content-Type', 'application/json');
  return res.status(statusCode).json(data);
}

/**
 * Standard error response formatter with Zod issue formatting
 */
export function errorResponse(res, statusCode, message, details = null) {
  return jsonResponse(res, statusCode, {
    success: false,
    error: message,
    details,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Safely parses request body whether string or object
 */
export function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body;
}
