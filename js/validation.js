// ReRoute AI 2.0 - Validation Module
// Validates truck, shipment, settings, and CSV data inputs rigorously

(function() {
  function isValidCoordinate(lat, lng) {
    if (lat === null || lat === undefined || lng === null || lng === undefined) return false;
    const nLat = Number(lat);
    const nLng = Number(lng);
    if (isNaN(nLat) || isNaN(nLng)) return false;
    return nLat >= -90 && nLat <= 90 && nLng >= -180 && nLng <= 180;
  }

  function isValidDate(dateStr) {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return !isNaN(d.getTime());
  }

  /**
   * Validates a Truck object
   *
   * @param {Object} truck
   * @param {Array} existingTrucks - Array of existing trucks to check duplicate IDs
   * @param {boolean} isEdit - True if editing existing truck (allows self ID)
   * @returns {Object} { isValid: boolean, errors: string[] }
   */
  function validateTruck(truck, existingTrucks = [], isEdit = false) {
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
    if (!truck.vehicleType || String(truck.vehicleType).trim() === '') {
      errors.push("Vehicle Type is required.");
    }

    // 3. Current Location & Coordinates
    if (!truck.currentLocation || String(truck.currentLocation).trim() === '') {
      errors.push("Current Location is required.");
    }
    if (!isValidCoordinate(truck.currentLat, truck.currentLng)) {
      errors.push("Current Latitude must be between -90 and 90, Longitude between -180 and 180.");
    }

    // 4. Destination & Coordinates
    if (!truck.destination || String(truck.destination).trim() === '') {
      errors.push("Destination is required.");
    }
    if (!isValidCoordinate(truck.destLat, truck.destLng)) {
      errors.push("Destination Latitude must be between -90 and 90, Longitude between -180 and 180.");
    }

    // 5. Capacity & Load
    const maxCap = Number(truck.maxCapacity);
    if (isNaN(maxCap) || maxCap <= 0) {
      errors.push("Maximum Capacity must be a positive number (kg).");
    }

    const currentLoad = Number(truck.currentLoad);
    if (isNaN(currentLoad) || currentLoad < 0) {
      errors.push("Current Load cannot be negative (kg).");
    } else if (!isNaN(maxCap) && currentLoad > maxCap) {
      errors.push(`Current Load (${currentLoad} kg) cannot exceed Maximum Capacity (${maxCap} kg).`);
    }

    // 6. Mileage & Fuel
    const mileage = Number(truck.mileage);
    if (isNaN(mileage) || mileage <= 0) {
      errors.push("Vehicle Mileage must be a positive number (km/L).");
    }

    const fuelPrice = Number(truck.fuelPrice);
    if (isNaN(fuelPrice) || fuelPrice <= 0) {
      errors.push("Fuel Price must be a positive number (₹/L).");
    }

    // 7. Expected Delivery Completion Time
    if (!isValidDate(truck.expectedDeliveryTime)) {
      errors.push("Expected Delivery Completion Time must be a valid date and time.");
    }

    // 8. Driver Availability
    if (!truck.driverAvailability || String(truck.driverAvailability).trim() === '') {
      errors.push("Driver Availability is required.");
    }

    // 9. Status
    const validStatuses = ['Available', 'In Transit', 'Loading', 'Delayed', 'Maintenance', 'Backhaul Assigned'];
    if (!truck.status || !validStatuses.includes(truck.status)) {
      errors.push(`Vehicle Status must be one of: ${validStatuses.join(', ')}.`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validates a Shipment object
   *
   * @param {Object} shipment
   * @param {Array} existingShipments - Array of existing shipments to check duplicates
   * @param {boolean} isEdit
   * @returns {Object} { isValid: boolean, errors: string[] }
   */
  function validateShipment(shipment, existingShipments = [], isEdit = false) {
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
    if (!shipment.pickupLocation || String(shipment.pickupLocation).trim() === '') {
      errors.push("Pickup Location is required.");
    }
    if (!isValidCoordinate(shipment.pickupLat, shipment.pickupLng)) {
      errors.push("Pickup Latitude (-90 to 90) and Longitude (-180 to 180) must be valid coordinates.");
    }

    // 3. Drop Location & Coords
    if (!shipment.dropLocation || String(shipment.dropLocation).trim() === '') {
      errors.push("Drop Location is required.");
    }
    if (!isValidCoordinate(shipment.dropLat, shipment.dropLng)) {
      errors.push("Drop Latitude (-90 to 90) and Longitude (-180 to 180) must be valid coordinates.");
    }

    // 4. Cargo Weight
    const weight = Number(shipment.cargoWeight);
    if (isNaN(weight) || weight <= 0) {
      errors.push("Cargo Weight must be a positive number (kg).");
    }

    // 5. Time Windows
    if (!isValidDate(shipment.pickupWindowStart)) {
      errors.push("Pickup Window Start must be a valid date/time.");
    }
    if (!isValidDate(shipment.pickupWindowEnd)) {
      errors.push("Pickup Window End must be a valid date/time.");
    } else if (isValidDate(shipment.pickupWindowStart)) {
      const startMs = new Date(shipment.pickupWindowStart).getTime();
      const endMs = new Date(shipment.pickupWindowEnd).getTime();
      if (endMs < startMs) {
        errors.push("Pickup Window End cannot be earlier than Pickup Window Start.");
      }
    }

    if (shipment.deliveryDeadline && isValidDate(shipment.deliveryDeadline)) {
      const deadlineMs = new Date(shipment.deliveryDeadline).getTime();
      const endMs = new Date(shipment.pickupWindowEnd).getTime();
      if (!isNaN(endMs) && deadlineMs < endMs) {
        errors.push("Delivery Deadline cannot be earlier than Pickup Window End.");
      }
    }

    // 6. Priority
    const validPriorities = ['Critical', 'High', 'Standard', 'Flexible'];
    if (shipment.priority && !validPriorities.includes(shipment.priority)) {
      errors.push(`Priority must be one of: ${validPriorities.join(', ')}.`);
    }

    // 7. Value
    if (shipment.value !== undefined && shipment.value !== null && shipment.value !== '') {
      const val = Number(shipment.value);
      if (isNaN(val) || val < 0) {
        errors.push("Estimated Shipment Value must be a non-negative number (₹).");
      }
    }

    // 8. Status
    const validStatuses = ['Available', 'Reserved', 'Cancelled', 'Completed'];
    if (!shipment.status || !validStatuses.includes(shipment.status)) {
      errors.push(`Shipment Status must be one of: ${validStatuses.join(', ')}.`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Parses and validates CSV string for Trucks or Shipments
   *
   * @param {string} csvText - Raw CSV text
   * @param {string} type - 'trucks' or 'shipments'
   * @param {Array} existingRecords - Current records to prevent ID collision
   * @returns {Object} { isValid, parsed: [], errors: [] }
   */
  function parseAndValidateCSV(csvText, type, existingRecords = []) {
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

  const Validation = {
    validateTruck,
    validateShipment,
    parseAndValidateCSV,
    isValidCoordinate,
    isValidDate
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Validation;
  }
  if (typeof window !== 'undefined') {
    window.ReRoute = window.ReRoute || {};
    window.ReRoute.Validation = Validation;
  }
})();
