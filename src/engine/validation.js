// Logistics Twin - Validation Module (ES Module)
// Rigorous validation for trucks, shipments, settings, and CSV data inputs

import { isValidCoordinate } from './distance.js';

export function isValidDate(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return !isNaN(d.getTime());
}

/**
 * Validates a Truck object
 */
export function validateTruck(truck, existingTrucks = [], isEdit = false) {
  const errors = [];

  if (!truck || typeof truck !== 'object') {
    return { isValid: false, errors: ["Invalid truck payload."] };
  }

  // 1. Truck ID
  if (!truck.id || String(truck.id).trim() === '') {
    errors.push("Truck ID is required.");
  } else {
    const cleanId = String(truck.id).trim();
    const duplicate = existingTrucks.some(t => t.id === cleanId && (!isEdit || t.id !== truck._originalId));
    if (duplicate && !isEdit) {
      errors.push(`Truck ID '${cleanId}' already exists in fleet.`);
    }
  }

  // 2. Vehicle Type
  if (!truck.vehicleType && !truck.model) {
    errors.push("Vehicle Type or Model is required.");
  }

  // 3. Current Location & Coordinates
  if (!truck.currentLocation && !truck.currentLocationName) {
    errors.push("Current Location is required.");
  }
  const currLat = truck.currentLat ?? truck.currentCoords?.[0];
  const currLng = truck.currentLng ?? truck.currentCoords?.[1];
  if (!isValidCoordinate(currLat, currLng)) {
    errors.push("Current Latitude must be between -90 and 90, Longitude between -180 and 180.");
  }

  // 4. Destination & Coordinates
  if (!truck.destination) {
    errors.push("Destination is required.");
  }
  const destLat = truck.destLat ?? truck.destinationCoords?.[0] ?? truck.destCoords?.[0];
  const destLng = truck.destLng ?? truck.destinationCoords?.[1] ?? truck.destCoords?.[1];
  if (!isValidCoordinate(destLat, destLng)) {
    errors.push("Destination Latitude must be between -90 and 90, Longitude between -180 and 180.");
  }

  // 5. Capacity & Load
  let maxCap = Number(truck.maxCapacity);
  if (isNaN(maxCap) || maxCap <= 0) {
    maxCap = (Number(truck.capacityTons) || 0) * 1000;
  }
  if (maxCap <= 0) {
    errors.push("Maximum Capacity must be a positive number.");
  }

  let currentLoad = Number(truck.currentLoad);
  if (isNaN(currentLoad) || currentLoad < 0) {
    currentLoad = (Number(truck.currentLoadTons) || 0) * 1000;
  }
  if (currentLoad < 0) {
    errors.push("Current Load cannot be negative.");
  } else if (maxCap > 0 && currentLoad > maxCap) {
    errors.push(`Current Load (${currentLoad} kg) cannot exceed Maximum Capacity (${maxCap} kg).`);
  }

  // 6. Mileage & Fuel
  const mileage = Number(truck.mileage || truck.vehicleMileageKmPerL);
  if (isNaN(mileage) || mileage <= 0) {
    errors.push("Vehicle Mileage must be a positive number (km/L).");
  }

  const fuelPrice = Number(truck.fuelPrice || 95.0);
  if (isNaN(fuelPrice) || fuelPrice <= 0) {
    errors.push("Fuel Price must be a positive number (₹/L).");
  }

  // 7. Status
  const validStatuses = ['Available', 'In Transit', 'In-Transit', 'Loading', 'Delayed', 'Maintenance', 'Backhaul Assigned'];
  if (truck.status && !validStatuses.includes(truck.status)) {
    errors.push(`Vehicle Status must be one of: ${validStatuses.join(', ')}.`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates a Shipment object
 */
export function validateShipment(shipment, existingShipments = [], isEdit = false) {
  const errors = [];

  if (!shipment || typeof shipment !== 'object') {
    return { isValid: false, errors: ["Invalid shipment payload."] };
  }

  // 1. Shipment ID
  if (!shipment.id || String(shipment.id).trim() === '') {
    errors.push("Shipment ID is required.");
  } else {
    const cleanId = String(shipment.id).trim();
    const duplicate = existingShipments.some(s => s.id === cleanId && (!isEdit || s.id !== shipment._originalId));
    if (duplicate && !isEdit) {
      errors.push(`Shipment ID '${cleanId}' already exists.`);
    }
  }

  // 2. Pickup Location & Coords
  if (!shipment.pickupLocation && !shipment.origin) {
    errors.push("Pickup Location is required.");
  }
  const pickLat = shipment.pickupLat ?? shipment.originCoords?.[0];
  const pickLng = shipment.pickupLng ?? shipment.originCoords?.[1];
  if (!isValidCoordinate(pickLat, pickLng)) {
    errors.push("Pickup Latitude (-90 to 90) and Longitude (-180 to 180) must be valid coordinates.");
  }

  // 3. Drop Location & Coords
  if (!shipment.dropLocation && !shipment.destination) {
    errors.push("Drop Location is required.");
  }
  const dropLat = shipment.dropLat ?? shipment.destCoords?.[0];
  const dropLng = shipment.dropLng ?? shipment.destCoords?.[1];
  if (!isValidCoordinate(dropLat, dropLng)) {
    errors.push("Drop Latitude (-90 to 90) and Longitude (-180 to 180) must be valid coordinates.");
  }

  // 4. Cargo Weight
  let weight = Number(shipment.cargoWeight);
  if (isNaN(weight) || weight <= 0) {
    weight = (Number(shipment.weightTons) || 0) * 1000;
  }
  if (weight <= 0) {
    errors.push("Cargo Weight must be a positive number.");
  }

  // 5. Time Windows validation (if ISO or date string)
  if (shipment.pickupWindowStart && shipment.pickupWindowEnd) {
    const startMs = new Date(shipment.pickupWindowStart).getTime();
    const endMs = new Date(shipment.pickupWindowEnd).getTime();
    if (!isNaN(startMs) && !isNaN(endMs) && endMs < startMs) {
      errors.push("Pickup Window End cannot be earlier than Pickup Window Start.");
    }
  }

  // 6. Status
  const validStatuses = ['Available', 'Reserved', 'Cancelled', 'Completed'];
  if (shipment.status && !validStatuses.includes(shipment.status)) {
    errors.push(`Shipment Status must be one of: ${validStatuses.join(', ')}.`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates Model Settings
 */
export function validateModelSettings(settings) {
  const errors = [];
  if (!settings || typeof settings !== 'object') {
    return { isValid: false, errors: ["Invalid settings payload."] };
  }

  if (settings.weights) {
    const w = settings.weights;
    ['route', 'time', 'capacity', 'detour', 'cost'].forEach(key => {
      if (w[key] !== undefined) {
        const val = Number(w[key]);
        if (isNaN(val) || val < 0) {
          errors.push(`Weight for '${key}' must be non-negative.`);
        }
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Parses and validates CSV string for Trucks or Shipments
 */
export function parseAndValidateCSV(csvText, type, existingRecords = []) {
  if (!csvText || typeof csvText !== 'string' || csvText.trim() === '') {
    return { isValid: false, parsed: [], errors: ["CSV file is completely empty."] };
  }

  const lines = csvText.trim().split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) {
    return { isValid: false, parsed: [], errors: ["CSV must contain a header row and at least one data row."] };
  }

  const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
  const parsed = [];
  const errors = [];
  const seenIdsInCSV = new Set();

  for (let i = 1; i < lines.length; i++) {
    const rowNum = i + 1;
    const values = lines[i].split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));

    if (values.length < headers.length) {
      errors.push(`Row ${rowNum}: Insufficient columns. Expected ${headers.length}, found ${values.length}.`);
      continue;
    }

    const rowObj = {};
    headers.forEach((h, idx) => {
      rowObj[h] = values[idx];
    });

    if (type === 'trucks') {
      const truck = {
        id: rowObj.id || rowObj.truckId || rowObj.TruckID,
        vehicleType: rowObj.vehicleType || rowObj.VehicleType || "32ft Multi-Axle (15T)",
        currentLocation: rowObj.currentLocation || rowObj.CurrentLocation,
        currentLat: Number(rowObj.currentLat || rowObj.CurrentLatitude),
        currentLng: Number(rowObj.currentLng || rowObj.CurrentLongitude),
        destination: rowObj.destination || rowObj.Destination,
        destLat: Number(rowObj.destLat || rowObj.DestinationLatitude),
        destLng: Number(rowObj.destLng || rowObj.DestinationLongitude),
        maxCapacity: Number(rowObj.maxCapacity || rowObj.MaximumCapacity || 10000),
        currentLoad: Number(rowObj.currentLoad || rowObj.CurrentLoad || 0),
        mileage: Number(rowObj.mileage || rowObj.VehicleMileage || 4.2),
        fuelPrice: Number(rowObj.fuelPrice || rowObj.FuelPrice || 94.50),
        expectedDeliveryTime: rowObj.expectedDeliveryTime || rowObj.ExpectedDeliveryCompletionTime || new Date(Date.now() + 2 * 3600 * 1000).toISOString().slice(0, 16),
        driverAvailability: rowObj.driverAvailability || rowObj.DriverAvailability || "Immediate / On Duty",
        status: rowObj.status || rowObj.VehicleStatus || "Available",
        isSample: false
      };

      if (seenIdsInCSV.has(truck.id)) {
        errors.push(`Row ${rowNum}: Duplicate Truck ID '${truck.id}' found within CSV.`);
      }
      seenIdsInCSV.add(truck.id);

      const v = validateTruck(truck, existingRecords);
      if (!v.isValid) {
        v.errors.forEach(err => errors.push(`Row ${rowNum} (Truck ID '${truck.id || 'N/A'}'): ${err}`));
      } else {
        parsed.push(truck);
      }
    } else if (type === 'shipments') {
      const shipment = {
        id: rowObj.id || rowObj.shipmentId || rowObj.ShipmentID,
        pickupLocation: rowObj.pickupLocation || rowObj.PickupLocation,
        pickupLat: Number(rowObj.pickupLat || rowObj.PickupLatitude),
        pickupLng: Number(rowObj.pickupLng || rowObj.PickupLongitude),
        dropLocation: rowObj.dropLocation || rowObj.DropLocation,
        dropLat: Number(rowObj.dropLat || rowObj.DropLatitude),
        dropLng: Number(rowObj.dropLng || rowObj.DropLongitude),
        cargoWeight: Number(rowObj.cargoWeight || rowObj.CargoWeight || 1000),
        pickupWindowStart: rowObj.pickupWindowStart || rowObj.PickupWindowStart || new Date(Date.now() + 2 * 3600 * 1000).toISOString().slice(0, 16),
        pickupWindowEnd: rowObj.pickupWindowEnd || rowObj.PickupWindowEnd || new Date(Date.now() + 6 * 3600 * 1000).toISOString().slice(0, 16),
        deliveryDeadline: rowObj.deliveryDeadline || rowObj.DeliveryDeadline || new Date(Date.now() + 14 * 3600 * 1000).toISOString().slice(0, 16),
        priority: rowObj.priority || rowObj.Priority || "Standard",
        value: Number(rowObj.value || rowObj.EstimatedShipmentValue || 10000),
        requiredVehicleType: rowObj.requiredVehicleType || rowObj.RequiredVehicleType || "Any",
        specialRequirements: rowObj.specialRequirements || rowObj.SpecialRequirements || "None",
        status: rowObj.status || rowObj.ShipmentStatus || "Available",
        isSample: false
      };

      if (seenIdsInCSV.has(shipment.id)) {
        errors.push(`Row ${rowNum}: Duplicate Shipment ID '${shipment.id}' found within CSV.`);
      }
      seenIdsInCSV.add(shipment.id);

      const v = validateShipment(shipment, existingRecords);
      if (!v.isValid) {
        v.errors.forEach(err => errors.push(`Row ${rowNum} (Shipment ID '${shipment.id || 'N/A'}'): ${err}`));
      } else {
        parsed.push(shipment);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    parsed,
    errors
  };
}

/**
 * Validates a Dispatch Plan against all regional supply network hard constraints.
 * Implements live validator checklist:
 * 1. Stock limit OK
 * 2. Warehouse storage OK
 * 3. Vehicle capacity OK
 * 4. Road restrictions OK
 * 5. No double allocation OK
 * 6. Demand not exceeded OK
 */
export function validateDispatchPlan(plan, network) {
  if (!plan || !network) {
    return {
      isValid: false,
      checklist: [],
      violations: ['Plan or network payload is null'],
    };
  }

  const allocations = plan.allocations || [];
  const warehouses = network.warehouses || [];
  const buyers = network.buyers || [];
  const routes = network.routes || [];
  const vehicles = network.vehicles || [];

  const violations = [];

  // 1. Stock Limit Check (Outflow <= available stock)
  const whOutflows = {};
  allocations.forEach((a) => {
    whOutflows[a.warehouseId] = (whOutflows[a.warehouseId] || 0) + a.quantity;
  });

  const stockLimitViolations = [];
  Object.keys(whOutflows).forEach((whId) => {
    const wh = warehouses.find((w) => w.id === whId);
    if (!wh) {
      const msg = `Allocation references unknown warehouse ID: ${whId}.`;
      stockLimitViolations.push(msg);
      violations.push(msg);
    }
  });
  warehouses.forEach((wh) => {
    const outflow = whOutflows[wh.id] || 0;
    if (outflow > wh.stock) {
      const msg = `Depot ${wh.name} (${wh.id}) outflow (${outflow}u) exceeds available stock (${wh.stock}u).`;
      stockLimitViolations.push(msg);
      violations.push(msg);
    }
  });
  const stockLimitOk = stockLimitViolations.length === 0;

  // 2. Warehouse Storage Capacity Check (Total stock within storageLimit)
  const storageViolations = [];
  warehouses.forEach((wh) => {
    if (wh.stock > wh.storageLimit) {
      const msg = `Depot ${wh.name} (${wh.id}) stock (${wh.stock}u) exceeds max storage limit (${wh.storageLimit}u).`;
      storageViolations.push(msg);
      violations.push(msg);
    }
  });
  const warehouseStorageOk = storageViolations.length === 0;

  // 3. Vehicle Capacity & Discrete Trips Check
  const vehCapacityViolations = [];
  allocations.forEach((a) => {
    const veh = vehicles.find((v) => v.id === a.vehicleId);
    if (veh) {
      const maxCarried = veh.capacity * (a.trips || 1);
      if (a.quantity > maxCarried) {
        const msg = `Allocation ${a.id}: Shipped quantity (${a.quantity}u) exceeds capacity of ${veh.type} (${maxCarried}u in ${a.trips} trip).`;
        vehCapacityViolations.push(msg);
        violations.push(msg);
      }
    }
  });
  const vehicleCapacityOk = vehCapacityViolations.length === 0;

  // 4. Road Restrictions & Closures Check
  const roadViolations = [];
  allocations.forEach((a) => {
    const pathEdges = Array.isArray(a.path) ? a.path : [];
    pathEdges.forEach((edgeId) => {
      const edge = routes.find((r) => r.id === edgeId);
      if (edge) {
        if (edge.status === 'closed') {
          const msg = `Allocation ${a.id} attempted to traverse CLOSED corridor: ${edge.name || edge.id}.`;
          roadViolations.push(msg);
          violations.push(msg);
        }
        const veh = vehicles.find((v) => v.id === a.vehicleId);
        if (veh && edge.restrictions?.maxVehicleWeightTons && veh.weightTons) {
          if (veh.weightTons > edge.restrictions.maxVehicleWeightTons) {
            const msg = `Allocation ${a.id}: Vehicle weight (${veh.weightTons}T) exceeds corridor limit (${edge.restrictions.maxVehicleWeightTons}T) on ${edge.name || edge.id}.`;
            roadViolations.push(msg);
            violations.push(msg);
          }
        }
      }
    });
  });
  const roadRestrictionsOk = roadViolations.length === 0;

  // 5. No Double Resource Allocation Check
  const doubleAllocViolations = [];
  const vehicleTripsUsed = {};
  allocations.forEach((a) => {
    vehicleTripsUsed[a.vehicleId] = (vehicleTripsUsed[a.vehicleId] || 0) + (a.trips || 1);
  });
  vehicles.forEach((v) => {
    const used = vehicleTripsUsed[v.id] || 0;
    const allowed = v.availability || 1;
    if (used > allowed) {
      const msg = `Vehicle ${v.id} (${v.type}) over-allocated: ${used} trips assigned vs ${allowed} available.`;
      doubleAllocViolations.push(msg);
      violations.push(msg);
    }
  });
  const noDoubleAllocationOk = doubleAllocViolations.length === 0;

  // 6. Demand Upper Bound Check
  const demandViolations = [];
  const buyerDeliveries = {};
  allocations.forEach((a) => {
    buyerDeliveries[a.buyerId] = (buyerDeliveries[a.buyerId] || 0) + a.quantity;
  });
  buyers.forEach((b) => {
    const delivered = buyerDeliveries[b.id] || 0;
    if (delivered > b.demandQty) {
      const msg = `Buyer ${b.name} (${b.id}) received ${delivered}u, exceeding order demand (${b.demandQty}u).`;
      demandViolations.push(msg);
      violations.push(msg);
    }
  });
  const demandNotExceededOk = demandViolations.length === 0;

  const checklist = [
    {
      id: 'stockLimit',
      name: 'Warehouse Stock Limit',
      passed: stockLimitOk,
      details: stockLimitOk
        ? 'All depot shipments strictly within available inventory'
        : stockLimitViolations.join(' | '),
    },
    {
      id: 'storageLimit',
      name: 'Warehouse Storage Capacity',
      passed: warehouseStorageOk,
      details: warehouseStorageOk
        ? 'Depot inventory levels within physical capacity limits'
        : storageViolations.join(' | '),
    },
    {
      id: 'vehicleCapacity',
      name: 'Vehicle Capacity & Discrete Trips',
      passed: vehicleCapacityOk,
      details: vehicleCapacityOk
        ? 'Cargo weights bounded by vehicle capacity per trip'
        : vehCapacityViolations.join(' | '),
    },
    {
      id: 'roadRestrictions',
      name: 'Road Restrictions & Closures',
      passed: roadRestrictionsOk,
      details: roadRestrictionsOk
        ? 'Zero closed routes traversed; road weight limits respected'
        : roadViolations.join(' | '),
    },
    {
      id: 'noDoubleAllocation',
      name: 'No Double Resource Allocation',
      passed: noDoubleAllocationOk,
      details: noDoubleAllocationOk
        ? 'No vehicle or stock unit allocated multiple times'
        : doubleAllocViolations.join(' | '),
    },
    {
      id: 'demandNotExceeded',
      name: 'Buyer Demand Upper Bounds',
      passed: demandNotExceededOk,
      details: demandNotExceededOk
        ? 'No buyer receives more than demanded quantity'
        : demandViolations.join(' | '),
    },
  ];

  return {
    isValid: violations.length === 0,
    checklist,
    violations,
  };
}
