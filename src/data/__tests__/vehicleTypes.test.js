import { describe, it, expect } from 'vitest';
import { VEHICLE_TYPES, DEFAULT_VEHICLE_TYPE, getVehicleType } from '../vehicleTypes.js';

describe('VEHICLE_TYPES Shared Constant', () => {
  it('contains exactly 4 standardized regional truck classes', () => {
    expect(VEHICLE_TYPES).toHaveLength(4);
  });

  it('verifies correct weight, capacity, and cost defaults for all 4 classes', () => {
    const mini = VEHICLE_TYPES.find((v) => v.label.includes('Mini Truck'));
    expect(mini).toBeDefined();
    expect(mini.label).toBe('Mini Truck (1-2 Ton)');
    expect(mini.weightTons).toBe(2);
    expect(mini.capacity).toBe(38);
    expect(mini.costPerKm).toBe(18);

    const light = VEHICLE_TYPES.find((v) => v.label.includes('Light Commercial Vehicle'));
    expect(light).toBeDefined();
    expect(light.label).toBe('Light Commercial Vehicle (3.5T)');
    expect(light.weightTons).toBe(3.5);
    expect(light.capacity).toBe(66);
    expect(light.costPerKm).toBe(22);

    const medium = VEHICLE_TYPES.find((v) => v.label.includes('Medium Commercial Truck'));
    expect(medium).toBeDefined();
    expect(medium.label).toBe('Medium Commercial Truck (8T)');
    expect(medium.weightTons).toBe(8);
    expect(medium.capacity).toBe(150);
    expect(medium.costPerKm).toBe(28);

    const heavy = VEHICLE_TYPES.find((v) => v.label.includes('Heavy Commercial Truck'));
    expect(heavy).toBeDefined();
    expect(heavy.label).toBe('Heavy Commercial Truck (16T)');
    expect(heavy.weightTons).toBe(16);
    expect(heavy.capacity).toBe(300);
    expect(heavy.costPerKm).toBe(42);
  });

  it('sets DEFAULT_VEHICLE_TYPE to Medium Commercial Truck (8T)', () => {
    expect(DEFAULT_VEHICLE_TYPE).toBe('Medium Commercial Truck (8T)');
  });

  it('resolves vehicle config via getVehicleType helper', () => {
    const res = getVehicleType('Heavy Commercial Truck (16T)');
    expect(res).toBeDefined();
    expect(res.weightTons).toBe(16);

    const notFound = getVehicleType('Unknown Rocket (50T)');
    expect(notFound).toBeNull();
  });
});
