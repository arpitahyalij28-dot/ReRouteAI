// Disruption-Aware Logistics Twin - Problem Simulator Engine (Pure ES Module)
// Implements 5 disruption problems with configurable severity and multi-disruption combination.
// Operates strictly on a deep copy of the network, never mutating the base network.

import {
  cloneNetwork,
  ROUTE_STATUS,
  BUYER_PRIORITY,
  getEffectiveTravelTime,
  findPaths,
} from './network.js';

export const DISRUPTION_TYPES = {
  ROAD_CLOSED: 'road_closed',
  WAREHOUSE_STOCK_LOW: 'warehouse_stock_low',
  DEMAND_SPIKE: 'demand_spike',
  FUEL_PRICE_UP: 'fuel_price_up',
  HEAVY_RAIN: 'heavy_rain',
};

export const DEFAULT_DISRUPTIONS = {
  roadClosed: {
    enabled: false,
    routeId: 'r-igatpuri-bhiwandi', // Kasara Ghat artery default
    status: ROUTE_STATUS.CLOSED,
  },
  warehouseStockLow: {
    enabled: false,
    warehouseId: 'wh-bhiwandi', // Bhiwandi Super Depot default
    reductionPct: 50, // 10% to 100%
  },
  demandSpike: {
    enabled: false,
    buyerId: 'buy-thane-med', // Thane Hospital default
    spikePct: 50, // 10% to 100%
  },
  fuelPriceUp: {
    enabled: false,
    increasePct: 25, // 10% to 40%
  },
  heavyRain: {
    enabled: false,
    severityPct: 60, // 30% to 100%
  },
};

/**
 * Applies a disruption configuration to a deep COPY of the base network.
 * Returns the disrupted network and an impact analysis report.
 */
export function applyDisruptionScenario(baseNetwork, config = {}) {
  if (!baseNetwork) return null;

  // Rule: Always work on a deep copy of the base network
  const network = cloneNetwork(baseNetwork);
  const activeConfig = {
    roadClosed: { ...DEFAULT_DISRUPTIONS.roadClosed, ...(config.roadClosed || {}) },
    warehouseStockLow: {
      ...DEFAULT_DISRUPTIONS.warehouseStockLow,
      ...(config.warehouseStockLow || {}),
    },
    demandSpike: { ...DEFAULT_DISRUPTIONS.demandSpike, ...(config.demandSpike || {}) },
    fuelPriceUp: { ...DEFAULT_DISRUPTIONS.fuelPriceUp, ...(config.fuelPriceUp || {}) },
    heavyRain: { ...DEFAULT_DISRUPTIONS.heavyRain, ...(config.heavyRain || {}) },
  };

  const affectedRoutes = [];
  const affectedWarehouses = [];
  const affectedBuyers = [];
  let fuelImpact = null;

  // 1. Problem: Road Closed
  if (activeConfig.roadClosed.enabled) {
    const targetRoute = network.routes.find((r) => r.id === activeConfig.roadClosed.routeId);
    if (targetRoute) {
      const prevStatus = targetRoute.status;
      targetRoute.status = activeConfig.roadClosed.status || ROUTE_STATUS.CLOSED;
      affectedRoutes.push({
        id: targetRoute.id,
        name: targetRoute.name,
        from: targetRoute.from,
        to: targetRoute.to,
        previousStatus: prevStatus,
        newStatus: targetRoute.status,
        reason: 'Direct road closure applied in simulator',
        severity: 1.0,
      });
    }
  }

  // 2. Problem: Warehouse Stock Low
  if (activeConfig.warehouseStockLow.enabled) {
    const targetWh = network.warehouses.find(
      (w) => w.id === activeConfig.warehouseStockLow.warehouseId
    );
    if (targetWh) {
      const originalStock = targetWh.stock;
      const reductionFactor = Math.min(
        1.0,
        Math.max(0.1, (Number(activeConfig.warehouseStockLow.reductionPct) || 50) / 100)
      );
      const newStock = Math.max(0, Math.round(originalStock * (1.0 - reductionFactor)));
      targetWh.stock = newStock;

      affectedWarehouses.push({
        id: targetWh.id,
        name: targetWh.name,
        originalStock,
        newStock,
        reductionPct: Math.round(reductionFactor * 100),
        deficitUnits: originalStock - newStock,
        storageLimit: targetWh.storageLimit,
      });
    }
  }

  // 3. Problem: Demand Spike
  if (activeConfig.demandSpike.enabled) {
    const targetBuyer = network.buyers.find((b) => b.id === activeConfig.demandSpike.buyerId);
    if (targetBuyer) {
      const originalDemand = targetBuyer.demandQty;
      const spikeFactor = Math.max(
        0.1,
        (Number(activeConfig.demandSpike.spikePct) || 50) / 100
      );
      const newDemand = Math.round(originalDemand * (1.0 + spikeFactor));
      targetBuyer.demandQty = newDemand;

      affectedBuyers.push({
        id: targetBuyer.id,
        name: targetBuyer.name,
        originalDemand,
        newDemand,
        spikePct: Math.round(spikeFactor * 100),
        extraUnits: newDemand - originalDemand,
        priority: targetBuyer.priority,
      });
    }
  }

  // 4. Problem: Fuel Price Up
  if (activeConfig.fuelPriceUp.enabled) {
    const increaseFactor = Math.min(
      0.5,
      Math.max(0.1, (Number(activeConfig.fuelPriceUp.increasePct) || 25) / 100)
    );
    const originalPrice = network.settings?.fuelPricePerLitre || 95.0;
    const newPrice = Math.round(originalPrice * (1.0 + increaseFactor) * 10) / 10;

    network.settings = {
      ...network.settings,
      fuelPricePerLitre: newPrice,
    };

    // Propagate cost increase to vehicles fleet operating cost
    network.vehicles.forEach((v) => {
      v.costPerKm = Math.round(v.costPerKm * (1.0 + increaseFactor * 0.45) * 10) / 10;
    });

    fuelImpact = {
      originalPrice,
      newPrice,
      increasePct: Math.round(increaseFactor * 100),
    };
  }

  // 5. Problem: Heavy Rain (Monsoon Ghat Disruption)
  if (activeConfig.heavyRain.enabled) {
    const rainSeverity = Math.min(
      1.0,
      Math.max(0.3, (Number(activeConfig.heavyRain.severityPct) || 60) / 100)
    );

    network.routes.forEach((route) => {
      // Ghat section / high-risk corridor vulnerability
      const isGhatRoute =
        route.riskScore >= 0.35 ||
        route.id.includes('kasara') ||
        route.id.includes('igatpuri') ||
        route.name?.toLowerCase?.().includes('kasara');

      if (isGhatRoute) {
        if (rainSeverity >= 0.8) {
          // Torrential downpour / landslide closure
          const prev = route.status;
          route.status = ROUTE_STATUS.CLOSED;
          affectedRoutes.push({
            id: route.id,
            name: route.name,
            from: route.from,
            to: route.to,
            previousStatus: prev,
            newStatus: ROUTE_STATUS.CLOSED,
            reason: `Torrential monsoon rain (${Math.round(rainSeverity * 100)}% severity): Ghat route closed due to flash flood hazard`,
            severity: rainSeverity,
          });
        } else {
          // Slowed down route
          const prev = route.status;
          if (route.status !== ROUTE_STATUS.CLOSED) {
            route.status = ROUTE_STATUS.SLOW;
            route.speedFactor = Math.max(0.25, Math.round((1.0 - rainSeverity * 0.6) * 100) / 100);
            affectedRoutes.push({
              id: route.id,
              name: route.name,
              from: route.from,
              to: route.to,
              previousStatus: prev,
              newStatus: ROUTE_STATUS.SLOW,
              reason: `Monsoon rain (${Math.round(rainSeverity * 100)}% severity): Heavy fog and waterlogging slowdown`,
              severity: rainSeverity,
            });
          }
        }
      } else if (rainSeverity > 0.5 && route.status === ROUTE_STATUS.OPEN) {
        // Mild regional rain impact on other routes
        route.speedFactor = Math.max(0.7, Math.round((1.0 - rainSeverity * 0.25) * 100) / 100);
      }
    });
  }

  // 6. Impact Analyzer: Generate "Affected Deliveries"
  const affectedDeliveries = analyzeDeliveryImpacts(network, baseNetwork);

  const isDisrupted =
    activeConfig.roadClosed.enabled ||
    activeConfig.warehouseStockLow.enabled ||
    activeConfig.demandSpike.enabled ||
    activeConfig.fuelPriceUp.enabled ||
    activeConfig.heavyRain.enabled;

  return {
    disruptedNetwork: network,
    config: activeConfig,
    isDisrupted,
    affectedRoutes,
    affectedWarehouses,
    affectedBuyers,
    fuelImpact,
    affectedDeliveries,
  };
}

/**
 * Analyzes how disruptions affect each buyer's delivery commitments,
 * identifying severed primary routes, stock deficits, and backup availability.
 */
export function analyzeDeliveryImpacts(disruptedNetwork, baseNetwork) {
  if (!disruptedNetwork?.buyers) return [];

  const impacts = [];
  const warehouses = disruptedNetwork.warehouses || [];
  const totalStockAvailable = warehouses.reduce((sum, w) => sum + (w.stock || 0), 0);

  disruptedNetwork.buyers.forEach((buyer) => {
    const baseBuyer = baseNetwork?.buyers?.find((b) => b.id === buyer.id) || buyer;
    const isHighPriority = buyer.priority === BUYER_PRIORITY.HIGH;

    // Check all open paths from any warehouse
    const allPaths = warehouses.flatMap((wh) => findPaths(disruptedNetwork, wh.id, buyer.id, 3));
    const openPaths = allPaths.filter((p) => !p.isClosed);
    const slowPaths = allPaths.filter((p) => p.hasSlow && !p.isClosed);

    // Baseline paths for comparison
    const basePaths = warehouses.flatMap((wh) =>
      baseNetwork ? findPaths(baseNetwork, wh.id, buyer.id, 3) : []
    );
    const baseOpenCount = basePaths.filter((p) => !p.isClosed).length;

    let status = 'normal';
    let headline = 'Delivery route operational';
    let detail = 'Normal transit time and sufficient warehouse buffers.';

    if (openPaths.length === 0) {
      status = 'severed';
      headline = 'All incoming route corridors blocked!';
      detail = `No open path exists from any warehouse to ${buyer.name}. Re-routing requires clearing road closures.`;
    } else if (openPaths.length < baseOpenCount) {
      status = 'rerouted';
      headline = `Primary corridor blocked (${openPaths.length} alternate path(s) remaining)`;
      detail = `Primary delivery line closed. Requires rerouting via alternate bypass corridor.`;
    } else if (slowPaths.length > 0 && openPaths.length === slowPaths.length) {
      status = 'delayed';
      headline = 'Transit delayed due to slow weather corridors';
      detail = `Travel time increased. Risk of exceeding ${buyer.deadline}h deadline.`;
    } else if (buyer.demandQty > totalStockAvailable) {
      status = 'stock_deficit';
      headline = `Stock deficit: Demand (${buyer.demandQty}u) exceeds available network stock (${totalStockAvailable}u)`;
      detail = `Regional warehouses have insufficient aggregate stock to satisfy order.`;
    } else if (buyer.demandQty > baseBuyer.demandQty) {
      status = 'demand_spiked';
      headline = `Surge in delivery demand (+${buyer.demandQty - baseBuyer.demandQty} units)`;
      detail = `Demand spiked by ${Math.round(((buyer.demandQty - baseBuyer.demandQty) / baseBuyer.demandQty) * 100)}%. Requires additional vehicle trips.`;
    }

    if (status !== 'normal') {
      impacts.push({
        buyerId: buyer.id,
        buyerName: buyer.name,
        location: buyer.location?.name || 'Corridor',
        priority: buyer.priority,
        demandQty: buyer.demandQty,
        deadline: buyer.deadline,
        status,
        headline,
        detail,
        openAlternatePaths: openPaths.length,
        isHighPriority,
      });
    }
  });

  return impacts;
}
