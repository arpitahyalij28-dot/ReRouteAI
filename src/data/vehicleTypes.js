/**
 * Shared Vehicle Type definitions for the Regional Supply Network Twin.
 * Contains demo defaults for weight, trip capacity, and operating cost per kilometer.
 */

// Demo defaults for standardized regional vehicle classes
export const VEHICLE_TYPES = [
  {
    id: 'mini',
    label: 'Mini Truck (1-2 Ton)',
    value: 'Mini Truck (1-2 Ton)',
    weightTons: 2,
    capacity: 38,
    costPerKm: 18,
    // Demo defaults: Mini truck scaled for intra-city narrow routes
    defaultCapacity: 38,
    defaultCostPerKm: 18,
  },
  {
    id: 'light',
    label: 'Light Commercial Vehicle (3.5T)',
    value: 'Light Commercial Vehicle (3.5T)',
    weightTons: 3.5,
    capacity: 66,
    costPerKm: 22,
    // Demo defaults: LCV scaled for regional distributor supply runs
    defaultCapacity: 66,
    defaultCostPerKm: 22,
  },
  {
    id: 'medium',
    label: 'Medium Commercial Truck (8T)',
    value: 'Medium Commercial Truck (8T)',
    weightTons: 8,
    capacity: 150,
    costPerKm: 28,
    // Demo defaults: Benchmark baseline (8T = 150 units @ Rs 28/km)
    defaultCapacity: 150,
    defaultCostPerKm: 28,
  },
  {
    id: 'heavy',
    label: 'Heavy Commercial Truck (16T)',
    value: 'Heavy Commercial Truck (16T)',
    weightTons: 16,
    capacity: 300,
    costPerKm: 42,
    // Demo defaults: Multi-axle hauler for bulk highway corridor logistics
    defaultCapacity: 300,
    defaultCostPerKm: 42,
  },
];

export const DEFAULT_VEHICLE_TYPE = 'Medium Commercial Truck (8T)';

/**
 * Finds vehicle type configuration by value, label, or id.
 */
export function getVehicleType(typeString) {
  if (!typeString) return null;
  return (
    VEHICLE_TYPES.find(
      (vt) =>
        vt.value === typeString ||
        vt.label === typeString ||
        vt.id === typeString
    ) || null
  );
}
