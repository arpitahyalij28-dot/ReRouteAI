// Disruption-Aware Logistics Twin - Nashik Regional Supply Network Demo Dataset
// Track 3-05: Nashik & Western Maharashtra Industrial-Agro Supply Corridor
// Fully labeled demo dataset with verified alternate resilience routes for every critical buyer.

import {
  createSupplier,
  createWarehouse,
  createBuyer,
  createRoute,
  createVehicle,
  createScenarioSettings,
  ROUTE_STATUS,
  BUYER_PRIORITY,
} from '../engine/network.js';

export const DEMO_METADATA = {
  name: 'Nashik-Mumbai-Pune Regional Logistics Twin (Track 3-05)',
  region: 'Nashik & Western Maharashtra Corridor',
  label: 'DEMO DATA',
  isDemo: true,
  description:
    'Comprehensive multi-tier regional network connecting Nashik agro/auto hubs, mountain corridor warehouses, and Mumbai/Pune distribution centers with high-density alternative routes.',
};

// --- 1. SUPPLIERS (Tier 1 Production Sources) ---
export const DEMO_SUPPLIERS = [
  createSupplier({
    id: 'sup-dindori',
    name: 'Sahyadri Agro Processing Hub',
    location: {
      name: 'Dindori Agro Mega Park, Nashik',
      lat: 20.201,
      lng: 73.832,
    },
    supplyLimit: 1200,
    product: 'Perishable Agro Produce, Grapes & Packaged Foods',
  }),
  createSupplier({
    id: 'sup-ambad',
    name: 'Godavari Industrial & Precision Spares',
    location: {
      name: 'Ambad MIDC Industrial Zone, Nashik',
      lat: 19.9575,
      lng: 73.742,
    },
    supplyLimit: 950,
    product: 'Automotive Sub-assemblies & Electrical Hardware',
  }),
  createSupplier({
    id: 'sup-sinnar',
    name: 'Sinnar Packaging & Polymer Materials',
    location: {
      name: 'Sinnar Special Economic Zone (SEZ)',
      lat: 19.845,
      lng: 73.992,
    },
    supplyLimit: 800,
    product: 'Industrial Polymer Liners & Corrugated Packaging',
  }),
];

// --- 2. WAREHOUSES (Tier 2 Consolidation & Buffer Depots) ---
export const DEMO_WAREHOUSES = [
  createWarehouse({
    id: 'wh-satpur',
    name: 'Central Nashik Consolidated Depot',
    location: {
      name: 'Satpur MIDC Freight Hub, Nashik',
      lat: 20.005,
      lng: 73.754,
    },
    stock: 650,
    storageLimit: 1500,
  }),
  createWarehouse({
    id: 'wh-igatpuri',
    name: 'Igatpuri Mountain Corridor Gateway',
    location: {
      name: 'Igatpuri NH 160 Corridor Depot',
      lat: 19.6967,
      lng: 73.5594,
    },
    stock: 480,
    storageLimit: 1000,
  }),
  createWarehouse({
    id: 'wh-bhiwandi',
    name: 'Bhiwandi Super-Fulfillment Depot',
    location: {
      name: 'Bhiwandi Logistics Hub 4',
      lat: 19.2967,
      lng: 73.0631,
    },
    stock: 850,
    storageLimit: 2000,
  }),
];

// --- 3. BUYERS (Tier 3 Demand Points with Priorities & Deadlines) ---
export const DEMO_BUYERS = [
  createBuyer({
    id: 'buy-thane-med',
    name: 'Thane Civil Hospital & Medical Stores',
    location: {
      name: 'Thane (Majiwada Medical Terminal)',
      lat: 19.2183,
      lng: 72.9781,
    },
    demandQty: 320,
    deadline: 5, // 5 hours max
    priority: BUYER_PRIORITY.HIGH,
  }),
  createBuyer({
    id: 'buy-vashi-apmc',
    name: 'Vashi APMC Agricultural Mandi',
    location: {
      name: 'Navi Mumbai (Vashi APMC Market)',
      lat: 19.076,
      lng: 72.998,
    },
    demandQty: 450,
    deadline: 7, // 7 hours max
    priority: BUYER_PRIORITY.HIGH,
  }),
  createBuyer({
    id: 'buy-kalyan-dist',
    name: 'Kalyan Regional Distribution Center',
    location: {
      name: 'Kalyan West Godown Belt',
      lat: 19.2437,
      lng: 73.1355,
    },
    demandQty: 280,
    deadline: 8,
    priority: BUYER_PRIORITY.MEDIUM,
  }),
  createBuyer({
    id: 'buy-panvel-cold',
    name: 'Panvel Agro Cold-Chain Terminal',
    location: {
      name: 'Panvel Freight & Cold Cargo Depot',
      lat: 18.9894,
      lng: 73.1175,
    },
    demandQty: 350,
    deadline: 10,
    priority: BUYER_PRIORITY.MEDIUM,
  }),
  createBuyer({
    id: 'buy-chakan-auto',
    name: 'Chakan Auto Assembly Plant',
    location: {
      name: 'Pune (Chakan MIDC Industrial Corridor)',
      lat: 18.758,
      lng: 73.856,
    },
    demandQty: 260,
    deadline: 12,
    priority: BUYER_PRIORITY.MEDIUM,
  }),
  createBuyer({
    id: 'buy-mumbai-fmcg',
    name: 'Mumbai South Retail Logistics Hub',
    location: {
      name: 'Mumbai (Wadala Port / South Gateway)',
      lat: 19.018,
      lng: 72.858,
    },
    demandQty: 200,
    deadline: 14,
    priority: BUYER_PRIORITY.LOW,
  }),
];

// --- 4. VEHICLES (Stationed Across Warehouses) ---
export const DEMO_VEHICLES = [
  // Satpur fleet
  createVehicle({
    id: 'veh-sat-1',
    type: 'Light Truck (4T)',
    capacity: 80,
    availableFrom: 'wh-satpur',
    availability: 2,
    costPerKm: 18,
    weightTons: 4,
  }),
  createVehicle({
    id: 'veh-sat-2',
    type: 'Medium Truck (7T)',
    capacity: 140,
    availableFrom: 'wh-satpur',
    availability: 2,
    costPerKm: 26,
    weightTons: 7,
  }),
  createVehicle({
    id: 'veh-sat-3',
    type: 'Heavy Commercial (10T)',
    capacity: 220,
    availableFrom: 'wh-satpur',
    availability: 1,
    costPerKm: 34,
    weightTons: 11,
  }),

  // Igatpuri fleet
  createVehicle({
    id: 'veh-igat-1',
    type: 'Heavy Commercial (10T)',
    capacity: 200,
    availableFrom: 'wh-igatpuri',
    availability: 2,
    costPerKm: 32,
    weightTons: 10,
  }),
  createVehicle({
    id: 'veh-igat-2',
    type: 'Medium Truck (8T)',
    capacity: 160,
    availableFrom: 'wh-igatpuri',
    availability: 1,
    costPerKm: 28,
    weightTons: 8,
  }),
  createVehicle({
    id: 'veh-igat-3',
    type: 'Electric Van (2T)',
    capacity: 40,
    availableFrom: 'wh-igatpuri',
    availability: 2,
    costPerKm: 12,
    weightTons: 2.2,
  }),

  // Bhiwandi fleet
  createVehicle({
    id: 'veh-bhiw-1',
    type: 'Heavy Commercial (14T)',
    capacity: 280,
    availableFrom: 'wh-bhiwandi',
    availability: 2,
    costPerKm: 42,
    weightTons: 15,
  }),
  createVehicle({
    id: 'veh-bhiw-2',
    type: 'Trailer Multi-Axle (20T)',
    capacity: 400,
    availableFrom: 'wh-bhiwandi',
    availability: 1,
    costPerKm: 55,
    weightTons: 24,
    restrictions: { bannedVehicleTypes: ['Narrow City Street'] },
  }),
  createVehicle({
    id: 'veh-bhiw-3',
    type: 'Medium Truck (9T)',
    capacity: 180,
    availableFrom: 'wh-bhiwandi',
    availability: 2,
    costPerKm: 30,
    weightTons: 9,
  }),
];

// --- 5. ROUTES (Network Edges with Full Alternate Paths) ---
export const DEMO_ROUTES = [
  // Inbound: Suppliers -> Warehouses
  createRoute({
    id: 'r-dindori-satpur',
    from: 'sup-dindori',
    to: 'wh-satpur',
    name: 'Dindori Agro Expressway to Satpur Depot',
    distanceKm: 25,
    baseTravelTimeH: 0.7,
    status: ROUTE_STATUS.OPEN,
    riskScore: 0.1,
  }),
  createRoute({
    id: 'r-ambad-satpur',
    from: 'sup-ambad',
    to: 'wh-satpur',
    name: 'Ambad Industrial Arterial Link',
    distanceKm: 12,
    baseTravelTimeH: 0.4,
    status: ROUTE_STATUS.OPEN,
    riskScore: 0.05,
  }),
  createRoute({
    id: 'r-sinnar-satpur',
    from: 'sup-sinnar',
    to: 'wh-satpur',
    name: 'Sinnar-Satpur State Highway 17',
    distanceKm: 32,
    baseTravelTimeH: 0.9,
    status: ROUTE_STATUS.OPEN,
    riskScore: 0.15,
  }),
  createRoute({
    id: 'r-sinnar-igatpuri',
    from: 'sup-sinnar',
    to: 'wh-igatpuri',
    name: 'Sinnar to Igatpuri via Ghoti Crossway',
    distanceKm: 48,
    baseTravelTimeH: 1.2,
    status: ROUTE_STATUS.OPEN,
    riskScore: 0.2,
  }),

  // Inter-Warehouse Corridor Links
  createRoute({
    id: 'r-satpur-igatpuri',
    from: 'wh-satpur',
    to: 'wh-igatpuri',
    name: 'NH 160 Nashik-Igatpuri Four-Lane Corridor',
    distanceKm: 45,
    baseTravelTimeH: 1.1,
    status: ROUTE_STATUS.OPEN,
    riskScore: 0.25,
  }),
  createRoute({
    id: 'r-igatpuri-bhiwandi',
    from: 'wh-igatpuri',
    to: 'wh-bhiwandi',
    name: 'Kasara Ghat NH 160 Main Freight Artery',
    distanceKm: 82,
    baseTravelTimeH: 2.2,
    status: ROUTE_STATUS.OPEN,
    restrictions: { maxVehicleWeightTons: 32 },
    riskScore: 0.45,
  }),
  createRoute({
    id: 'r-satpur-bhiwandi-alt',
    from: 'wh-satpur',
    to: 'wh-bhiwandi',
    name: 'Wada-Jawahar Mountain Bypass Highway (Alternate Artery)',
    distanceKm: 135,
    baseTravelTimeH: 3.6,
    speedFactor: 0.9,
    status: ROUTE_STATUS.OPEN,
    restrictions: { maxVehicleWeightTons: 20 },
    riskScore: 0.35,
  }),

  // Outbound: Warehouses -> Buyers
  createRoute({
    id: 'r-bhiwandi-thane',
    from: 'wh-bhiwandi',
    to: 'buy-thane-med',
    name: 'Bhiwandi to Thane Majiwada Direct Express',
    distanceKm: 16,
    baseTravelTimeH: 0.5,
    status: ROUTE_STATUS.OPEN,
    riskScore: 0.1,
  }),
  createRoute({
    id: 'r-bhiwandi-vashi',
    from: 'wh-bhiwandi',
    to: 'buy-vashi-apmc',
    name: 'Bhiwandi to Navi Mumbai APMC Corridor',
    distanceKm: 34,
    baseTravelTimeH: 0.9,
    status: ROUTE_STATUS.OPEN,
    riskScore: 0.15,
  }),
  createRoute({
    id: 'r-bhiwandi-kalyan',
    from: 'wh-bhiwandi',
    to: 'buy-kalyan-dist',
    name: 'Bhiwandi-Kalyan Industrial Ring Link',
    distanceKm: 14,
    baseTravelTimeH: 0.4,
    status: ROUTE_STATUS.OPEN,
    riskScore: 0.1,
  }),
  createRoute({
    id: 'r-bhiwandi-panvel',
    from: 'wh-bhiwandi',
    to: 'buy-panvel-cold',
    name: 'Bhiwandi to Panvel Cargo Link',
    distanceKm: 46,
    baseTravelTimeH: 1.2,
    status: ROUTE_STATUS.OPEN,
    riskScore: 0.2,
  }),
  createRoute({
    id: 'r-satpur-chakan',
    from: 'wh-satpur',
    to: 'buy-chakan-auto',
    name: 'Nashik-Pune NH 60 Sangamner Expressway',
    distanceKm: 175,
    baseTravelTimeH: 4.0,
    status: ROUTE_STATUS.OPEN,
    riskScore: 0.2,
  }),
  createRoute({
    id: 'r-bhiwandi-wadala',
    from: 'wh-bhiwandi',
    to: 'buy-mumbai-fmcg',
    name: 'Bhiwandi to Mumbai Port Eastern Freeway Link',
    distanceKm: 42,
    baseTravelTimeH: 1.2,
    status: ROUTE_STATUS.OPEN,
    riskScore: 0.2,
  }),

  // Critical Alternate Routes for Disaster / Disruption Recovery
  createRoute({
    id: 'r-igatpuri-thane-alt',
    from: 'wh-igatpuri',
    to: 'buy-thane-med',
    name: 'Igatpuri to Thane Hospital Priority Fast-Track',
    distanceKm: 98,
    baseTravelTimeH: 2.4,
    status: ROUTE_STATUS.OPEN,
    riskScore: 0.3,
  }),
  createRoute({
    id: 'r-igatpuri-kalyan-alt',
    from: 'wh-igatpuri',
    to: 'buy-kalyan-dist',
    name: 'Igatpuri-Murbad-Kalyan Alternate Rural Link',
    distanceKm: 92,
    baseTravelTimeH: 2.5,
    speedFactor: 0.85,
    status: ROUTE_STATUS.OPEN,
    restrictions: { maxVehicleWeightTons: 16 },
    riskScore: 0.3,
  }),
  createRoute({
    id: 'r-satpur-kalyan-direct',
    from: 'wh-satpur',
    to: 'buy-kalyan-dist',
    name: 'Satpur to Kalyan Direct Freight Line',
    distanceKm: 130,
    baseTravelTimeH: 3.2,
    status: ROUTE_STATUS.OPEN,
    riskScore: 0.3,
  }),
  createRoute({
    id: 'r-igatpuri-chakan-alt',
    from: 'wh-igatpuri',
    to: 'buy-chakan-auto',
    name: 'Igatpuri to Chakan via Alephata Junction Bypass',
    distanceKm: 165,
    baseTravelTimeH: 3.8,
    status: ROUTE_STATUS.OPEN,
    riskScore: 0.3,
  }),
  createRoute({
    id: 'r-igatpuri-panvel-alt',
    from: 'wh-igatpuri',
    to: 'buy-panvel-cold',
    name: 'Igatpuri-Mumbra-Panvel Bypass Artery',
    distanceKm: 110,
    baseTravelTimeH: 2.8,
    status: ROUTE_STATUS.OPEN,
    riskScore: 0.35,
  }),

  // Lateral Cross-Hub Links (Buyer-to-Buyer Rerouting)
  createRoute({
    id: 'r-thane-vashi',
    from: 'buy-thane-med',
    to: 'buy-vashi-apmc',
    name: 'Thane-Belapur Road Inter-City Link',
    distanceKm: 18,
    baseTravelTimeH: 0.5,
    status: ROUTE_STATUS.OPEN,
    riskScore: 0.1,
  }),
  createRoute({
    id: 'r-kalyan-panvel',
    from: 'buy-kalyan-dist',
    to: 'buy-panvel-cold',
    name: 'Kalyan-Shilphata-Panvel Multi-Modal Route',
    distanceKm: 32,
    baseTravelTimeH: 0.8,
    status: ROUTE_STATUS.OPEN,
    riskScore: 0.15,
  }),
  createRoute({
    id: 'r-vashi-wadala',
    from: 'buy-vashi-apmc',
    to: 'buy-mumbai-fmcg',
    name: 'Vashi to Mumbai Wadala Eastern Freeway',
    distanceKm: 22,
    baseTravelTimeH: 0.6,
    status: ROUTE_STATUS.OPEN,
    riskScore: 0.1,
  }),
  createRoute({
    id: 'r-panvel-chakan',
    from: 'buy-panvel-cold',
    to: 'buy-chakan-auto',
    name: 'Mumbai-Pune Expressway to Chakan Interchange',
    distanceKm: 115,
    baseTravelTimeH: 2.4,
    status: ROUTE_STATUS.OPEN,
    riskScore: 0.25,
  }),
];

// --- 6. SCENARIO SETTINGS ---
export const DEMO_SCENARIO_SETTINGS = createScenarioSettings({
  fuelPricePerLitre: 95.0,
  demandMultiplier: 1.0,
  timeHorizonHours: 24,
});

/**
 * Returns a complete, validated copy of the Nashik Regional Supply Network.
 */
export function getDemoNetwork() {
  return {
    metadata: { ...DEMO_METADATA },
    suppliers: DEMO_SUPPLIERS.map((s) => ({ ...s, location: { ...s.location } })),
    warehouses: DEMO_WAREHOUSES.map((w) => ({ ...w, location: { ...w.location } })),
    buyers: DEMO_BUYERS.map((b) => ({ ...b, location: { ...b.location } })),
    vehicles: DEMO_VEHICLES.map((v) => ({ ...v, restrictions: { ...v.restrictions } })),
    routes: DEMO_ROUTES.map((r) => ({
      ...r,
      restrictions: {
        ...r.restrictions,
        bannedVehicleTypes: [...(r.restrictions?.bannedVehicleTypes || [])],
      },
    })),
    settings: { ...DEMO_SCENARIO_SETTINGS, weights: { ...DEMO_SCENARIO_SETTINGS.weights } },
  };
}
