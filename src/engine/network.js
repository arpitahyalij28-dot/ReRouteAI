// Disruption-Aware Logistics Twin - Network Engine Module (Pure ES Module)
// Contains core data models, validation helpers, pathfinders, and network topology tools.
// Zero React, zero network calls, zero external dependencies.

import { isValidCoordinate } from './distance.js';

export const ROUTE_STATUS = {
  OPEN: 'open',
  SLOW: 'slow',
  CLOSED: 'closed',
};

export const BUYER_PRIORITY = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
};

/**
 * Normalizes location input to a standard { name, lat, lng } object.
 */
export function normalizeLocation(loc, defaultName = 'Hub') {
  if (!loc) return { name: defaultName, lat: 19.9975, lng: 73.7898 };
  if (Array.isArray(loc) && loc.length >= 2) {
    return { name: defaultName, lat: Number(loc[0]), lng: Number(loc[1]) };
  }
  return {
    name: loc.name || defaultName,
    lat: Number(loc.lat ?? loc.coordinates?.[0] ?? 19.9975),
    lng: Number(loc.lng ?? loc.coordinates?.[1] ?? 73.7898),
  };
}

/**
 * Creates and validates a Supplier entity.
 */
export function createSupplier({
  id,
  name,
  location,
  supplyLimit = 1000,
  product = 'General Goods',
}) {
  if (!id) throw new Error('Supplier requires an id');
  const loc = normalizeLocation(location, name);
  return {
    id: String(id),
    name: String(name || id),
    location: loc,
    supplyLimit: Math.max(0, Number(supplyLimit) || 0),
    product: String(product || 'General Cargo'),
  };
}

/**
 * Creates and validates a Warehouse entity.
 */
export function createWarehouse({
  id,
  name,
  location,
  stock = 500,
  storageLimit = 1500,
}) {
  if (!id) throw new Error('Warehouse requires an id');
  const loc = normalizeLocation(location, name);
  const maxStorage = Math.max(0, Number(storageLimit) || 0);
  const currentStock = Math.max(0, Number(stock) || 0);
  return {
    id: String(id),
    name: String(name || id),
    location: loc,
    stock: Math.min(currentStock, maxStorage || currentStock),
    storageLimit: maxStorage,
  };
}

/**
 * Creates and validates a Buyer entity.
 */
export function createBuyer({
  id,
  name,
  location,
  demandQty = 200,
  deadline = 8, // hours or string representation
  priority = BUYER_PRIORITY.MEDIUM,
}) {
  if (!id) throw new Error('Buyer requires an id');
  const loc = normalizeLocation(location, name);
  const validPriorities = Object.values(BUYER_PRIORITY);
  const safePriority = validPriorities.includes(priority?.toLowerCase?.())
    ? priority.toLowerCase()
    : BUYER_PRIORITY.MEDIUM;

  return {
    id: String(id),
    name: String(name || id),
    location: loc,
    demandQty: Math.max(0, Number(demandQty) || 0),
    deadline: Number(deadline) || 8, // hours from baseline T0
    priority: safePriority,
  };
}

/**
 * Creates and validates a Route (edge) between two network nodes.
 */
export function createRoute({
  id,
  from,
  to,
  distanceKm = 50,
  baseTravelTimeH = 1.0,
  status = ROUTE_STATUS.OPEN,
  speedFactor = 1.0,
  restrictions = {},
  riskScore = 0.1,
  name,
}) {
  if (!id) throw new Error('Route requires an id');
  if (!from || !to) throw new Error('Route requires both from and to node IDs');

  const validStatuses = Object.values(ROUTE_STATUS);
  const safeStatus = validStatuses.includes(status) ? status : ROUTE_STATUS.OPEN;

  return {
    id: String(id),
    from: String(from),
    to: String(to),
    name: name || `${from} -> ${to}`,
    distanceKm: Math.max(0.1, Number(distanceKm) || 1),
    baseTravelTimeH: Math.max(0.01, Number(baseTravelTimeH) || 0.1),
    status: safeStatus,
    speedFactor: Math.max(0.1, Math.min(2.0, Number(speedFactor) || 1.0)),
    restrictions: {
      maxVehicleWeightTons: restrictions.maxVehicleWeightTons ?? restrictions.maxWeightTons ?? null,
      bannedVehicleTypes: Array.isArray(restrictions.bannedVehicleTypes)
        ? [...restrictions.bannedVehicleTypes]
        : [],
    },
    riskScore: Math.max(0, Math.min(1.0, Number(riskScore) || 0)),
  };
}

/**
 * Creates and validates a Vehicle entity.
 */
export function createVehicle({
  id,
  type = 'Medium Commercial Vehicle (7T)',
  capacity = 100,
  availableFrom = 'wh-1',
  availability = 1,
  availableCount = 1,
  costPerKm = 25,
  restrictions = {},
  weightTons = 7,
}) {
  if (!id) throw new Error('Vehicle requires an id');
  const count = Number(availability ?? availableCount ?? 1);

  return {
    id: String(id),
    type: String(type),
    capacity: Math.max(1, Number(capacity) || 100),
    availableFrom: String(availableFrom),
    availability: Math.max(0, count),
    costPerKm: Math.max(1, Number(costPerKm) || 20),
    weightTons: Number(weightTons || restrictions.weightTons || 7),
    restrictions: {
      isDangerousGoodsCertified: Boolean(restrictions.isDangerousGoodsCertified),
      isRefrigerated: Boolean(restrictions.isRefrigerated),
      ...restrictions,
    },
  };
}

/**
 * Creates scenario configuration parameters.
 */
export function createScenarioSettings({
  fuelPricePerLitre = 95.0,
  demandMultiplier = 1.0,
  timeHorizonHours = 24,
  weights = {},
} = {}) {
  return {
    fuelPricePerLitre: Math.max(10, Number(fuelPricePerLitre) || 95.0),
    demandMultiplier: Math.max(0.1, Number(demandMultiplier) || 1.0),
    timeHorizonHours: Math.max(1, Number(timeHorizonHours) || 24),
    weights: {
      transportCost: Number(weights.transportCost ?? 1.0),
      travelTime: Number(weights.travelTime ?? 1.2),
      latenessPenalty: Number(weights.latenessPenalty ?? 15.0),
      unmetDemandPenalty: Number(weights.unmetDemandPenalty ?? 50.0),
      riskPenalty: Number(weights.riskPenalty ?? 8.0),
      stockBufferReward: Number(weights.stockBufferReward ?? 2.0),
    },
  };
}

/**
 * Validates a complete Network object.
 */
export function validateNetwork(network) {
  const errors = [];
  if (!network || typeof network !== 'object') {
    return { isValid: false, errors: ['Network must be a non-null object'] };
  }

  const { suppliers = [], warehouses = [], buyers = [], routes = [], vehicles = [] } = network;

  const nodeIds = new Set([
    ...suppliers.map((s) => s.id),
    ...warehouses.map((w) => w.id),
    ...buyers.map((b) => b.id),
  ]);

  if (nodeIds.size < suppliers.length + warehouses.length + buyers.length) {
    errors.push('Duplicate node IDs detected across suppliers, warehouses, and buyers.');
  }

  routes.forEach((route) => {
    if (!nodeIds.has(route.from)) {
      errors.push(`Route ${route.id} has invalid 'from' node: ${route.from}`);
    }
    if (!nodeIds.has(route.to)) {
      errors.push(`Route ${route.id} has invalid 'to' node: ${route.to}`);
    }
  });

  const warehouseIds = new Set(warehouses.map((w) => w.id));
  vehicles.forEach((veh) => {
    if (!nodeIds.has(veh.availableFrom) && !warehouseIds.has(veh.availableFrom)) {
      errors.push(`Vehicle ${veh.id} stationed at unknown location: ${veh.availableFrom}`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Deep-clones the entire network so scenarios / disruptions can mutate safely.
 */
export function cloneNetwork(network) {
  if (!network) return null;
  return JSON.parse(JSON.stringify(network));
}

/**
 * Returns outgoing routes from a node.
 */
export function getRoutesFrom(network, nodeId) {
  if (!network?.routes) return [];
  return network.routes.filter((r) => r.from === nodeId);
}

/**
 * Returns incoming routes to a node.
 */
export function getRoutesTo(network, nodeId) {
  if (!network?.routes) return [];
  return network.routes.filter((r) => r.to === nodeId);
}

/**
 * Returns the direct route between two nodes if exists.
 */
export function getRouteBetween(network, fromId, toId) {
  if (!network?.routes) return null;
  return network.routes.find((r) => r.from === fromId && r.to === toId) || null;
}

/**
 * Calculates effective travel time on a route given status and speed factor.
 */
export function getEffectiveTravelTime(route) {
  if (!route) return Infinity;
  if (route.status === ROUTE_STATUS.CLOSED) return Infinity;

  const factor = Math.max(0.1, Number(route.speedFactor) || 1.0);
  const statusMultiplier = route.status === ROUTE_STATUS.SLOW ? 0.5 : 1.0;
  return route.baseTravelTimeH / (factor * statusMultiplier);
}

/**
 * Checks if a vehicle can traverse a given route based on status and restrictions.
 */
export function canVehicleTraverse(route, vehicle) {
  if (!route) return false;
  if (route.status === ROUTE_STATUS.CLOSED) return false;

  if (route.restrictions?.maxVehicleWeightTons && vehicle?.weightTons) {
    if (vehicle.weightTons > route.restrictions.maxVehicleWeightTons) {
      return false;
    }
  }

  if (
    Array.isArray(route.restrictions?.bannedVehicleTypes) &&
    vehicle?.type &&
    route.restrictions.bannedVehicleTypes.includes(vehicle.type)
  ) {
    return false;
  }

  return true;
}

/**
 * Finds all simple paths between startNodeId and endNodeId up to maxHops.
 */
export function findPaths(network, startNodeId, endNodeId, maxHops = 3) {
  if (!network?.routes || !startNodeId || !endNodeId) return [];

  const results = [];

  function dfs(currId, currentPath, visitedNodes, currentDistance, currentTime) {
    if (currId === endNodeId) {
      results.push({
        path: [...currentPath],
        hops: currentPath.length,
        totalDistanceKm: currentDistance,
        totalTravelTimeH: currentTime,
        isClosed: currentPath.some((r) => r.status === ROUTE_STATUS.CLOSED),
        hasSlow: currentPath.some((r) => r.status === ROUTE_STATUS.SLOW),
        maxRisk: Math.max(...currentPath.map((r) => r.riskScore || 0), 0),
      });
      return;
    }

    if (currentPath.length >= maxHops) return;

    const outgoing = getRoutesFrom(network, currId);
    for (const route of outgoing) {
      if (!visitedNodes.has(route.to)) {
        visitedNodes.add(route.to);
        currentPath.push(route);
        const time = getEffectiveTravelTime(route);

        dfs(
          route.to,
          currentPath,
          visitedNodes,
          currentDistance + route.distanceKm,
          currentTime + time
        );

        currentPath.pop();
        visitedNodes.delete(route.to);
      }
    }
  }

  const visited = new Set([startNodeId]);
  dfs(startNodeId, [], visited, 0, 0);

  // Sort paths by travel time (shortest/fastest first)
  results.sort((a, b) => a.totalTravelTimeH - b.totalTravelTimeH);
  return results;
}

/**
 * Returns key network-level summary metrics.
 */
export function getNetworkSummary(network) {
  if (!network) return null;

  const suppliers = network.suppliers || [];
  const warehouses = network.warehouses || [];
  const buyers = network.buyers || [];
  const routes = network.routes || [];
  const vehicles = network.vehicles || [];

  const totalSupplyLimit = suppliers.reduce((sum, s) => sum + (s.supplyLimit || 0), 0);
  const totalStock = warehouses.reduce((sum, w) => sum + (w.stock || 0), 0);
  const totalStorageLimit = warehouses.reduce((sum, w) => sum + (w.storageLimit || 0), 0);
  const totalDemand = buyers.reduce(
    (sum, b) => sum + (b.demandQty || 0) * (network.settings?.demandMultiplier || 1),
    0
  );
  const totalFleetCapacity = vehicles.reduce(
    (sum, v) => sum + (v.capacity || 0) * (v.availability || 0),
    0
  );

  const openRoutes = routes.filter((r) => r.status === ROUTE_STATUS.OPEN).length;
  const slowRoutes = routes.filter((r) => r.status === ROUTE_STATUS.SLOW).length;
  const closedRoutes = routes.filter((r) => r.status === ROUTE_STATUS.CLOSED).length;

  return {
    suppliersCount: suppliers.length,
    warehousesCount: warehouses.length,
    buyersCount: buyers.length,
    routesCount: routes.length,
    vehiclesCount: vehicles.length,
    openRoutes,
    slowRoutes,
    closedRoutes,
    totalSupplyLimit,
    totalStock,
    totalStorageLimit,
    totalDemand,
    totalFleetCapacity,
  };
}
