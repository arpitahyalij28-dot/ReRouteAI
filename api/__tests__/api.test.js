// Logistics Twin - Serverless API Endpoints Test Suite
import { describe, it, expect } from 'vitest';
import healthHandler from '../health.js';
import optimizeHandler from '../optimize.js';
import optimizeFleetHandler from '../optimize-fleet.js';
import recoverHandler from '../recover.js';
import weatherHandler from '../weather.js';
import explainHandler from '../explain.js';
import routeHandler from '../route.js';
import geocodeHandler from '../geocode.js';

import { INITIAL_TRUCK, INITIAL_TRUCKS, INITIAL_SHIPMENTS } from '../../src/data/mockData.js';

// Mock Express/Vercel Request & Response
function createMockReqRes({ method = 'GET', query = {}, body = {}, headers = {} } = {}) {
  const req = {
    method,
    query,
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

describe('Serverless Backend Endpoints (/api/*)', () => {
  it('GET /api/health returns healthy status and version 2.0.0', async () => {
    const { req, res } = createMockReqRes({ method: 'GET' });
    await healthHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.responseData.status).toBe('healthy');
    expect(res.responseData.version).toBe('2.0.0');
    expect(res.responseData.service).toContain('Logistics Twin');
  });

  it('POST /api/optimize validates body and evaluates candidate backhauls', async () => {
    // 1. Missing body should return 400
    const { req: badReq, res: badRes } = createMockReqRes({ method: 'POST', body: {} });
    await optimizeHandler(badReq, badRes);
    expect(badRes.statusCode).toBe(400);

    // 2. Valid body should return 200 with ranked evaluations
    const { req, res } = createMockReqRes({
      method: 'POST',
      body: {
        truck: INITIAL_TRUCK,
        shipments: INITIAL_SHIPMENTS.slice(0, 4),
      },
    });
    await optimizeHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.responseData.success).toBe(true);
    expect(res.responseData.solver).toBe('Weighted Multi-Criteria Scoring');
    expect(res.responseData.results.length).toBe(4);
    expect(res.responseData.recommendedId).toBe('S1');
    expect(res.responseData.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('POST /api/optimize-fleet executes Hungarian assignment with zero conflicts', async () => {
    const { req, res } = createMockReqRes({
      method: 'POST',
      body: {
        trucks: INITIAL_TRUCKS,
        shipments: INITIAL_SHIPMENTS,
      },
    });
    await optimizeFleetHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.responseData.success).toBe(true);
    expect(res.responseData.solver).toContain('Hungarian');
    expect(res.responseData.totalMatches).toBeGreaterThan(0);

    // Conflict-free guarantee: no truck assigned twice
    const assignedTrucks = res.responseData.assignments.map((a) => a.truckId);
    const uniqueTrucks = new Set(assignedTrucks);
    expect(uniqueTrucks.size).toBe(assignedTrucks.length);

    // Conflict-free guarantee: no shipment assigned twice
    const assignedShipments = res.responseData.assignments.map((a) => a.shipmentId);
    const uniqueShipments = new Set(assignedShipments);
    expect(uniqueShipments.size).toBe(assignedShipments.length);
  });

  it('POST /api/recover dynamically promotes alternative shipment upon cancellation', async () => {
    const { req, res } = createMockReqRes({
      method: 'POST',
      body: {
        truck: INITIAL_TRUCK,
        shipments: INITIAL_SHIPMENTS.slice(0, 4),
        cancelledShipmentId: 'S1',
        reason: 'Shipper crane maintenance',
      },
    });
    await recoverHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.responseData.success).toBe(true);
    expect(res.responseData.promotedShipmentId).toBe('S2');
    expect(res.responseData.stages.length).toBe(5);
  });

  it('GET /api/weather computes disruption risk delta from coordinates', async () => {
    const { req, res } = createMockReqRes({
      method: 'GET',
      query: { lat: '19.645', lng: '73.485' },
    });
    await weatherHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.responseData.location).toEqual({ lat: 19.645, lng: 73.485 });
    expect(res.responseData.disruptionImpact).toBeDefined();
    expect(typeof res.responseData.disruptionImpact.disruptionRiskDelta).toBe('number');
  });

  it('POST /api/explain generates 3-sentence explanation from numeric factors', async () => {
    const { req, res } = createMockReqRes({
      method: 'POST',
      body: {
        shipmentId: 'S1',
        matchScore: 87,
        isFeasible: true,
        factors: {
          route: 85,
          time: 90,
          capacity: 80,
          detour: 95,
          cost: 85,
          disruption: 90,
        },
        detourKm: 6,
        etaBufferMinutes: 15,
        capacityUtilizationPct: 80,
        grossYieldInr: 28500,
      },
    });
    await explainHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.responseData.success).toBe(true);
    expect(res.responseData.explanation).toContain('Shipment S1');
    expect(typeof res.responseData.explanation).toBe('string');
  });

  it('GET /api/route returns route coordinates with distance and duration', async () => {
    const { req, res } = createMockReqRes({
      method: 'GET',
      query: { from: '19.9575,73.7420', to: '19.2967,73.0631' },
    });
    await routeHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.responseData.distanceKm).toBeGreaterThan(0);
    expect(res.responseData.durationMinutes).toBeGreaterThan(0);
    expect(Array.isArray(res.responseData.coordinates)).toBe(true);
  });

  it('GET /api/geocode resolves corridor cities and coordinates cleanly', async () => {
    const { req, res } = createMockReqRes({
      method: 'GET',
      query: { query: 'Bhiwandi' },
    });
    await geocodeHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.responseData.name).toBe('Bhiwandi');
    expect(res.responseData.lat).toBeCloseTo(19.2967, 1);
    expect(res.responseData.lng).toBeCloseTo(73.0631, 1);
  });
});
