// ReRoute AI 2.0 - Realistic Sample Data
// All coordinates represent authentic Indian logistics corridors.
// All sample records are clearly marked with isSample: true.

window.ReRoute = window.ReRoute || {};

window.ReRoute.SAMPLE_TRUCKS = [
  {
    id: "TRK-801",
    vehicleType: "32ft Multi-Axle (15T)",
    currentLocation: "Pune Logistics Park",
    currentLat: 18.5204,
    currentLng: 73.8567,
    destination: "Mumbai JNPT Port",
    destLat: 18.9496,
    destLng: 72.9515,
    maxCapacity: 15000,
    currentLoad: 11500, // 3500 kg available capacity
    mileage: 4.2, // km/L
    fuelPrice: 94.50, // ₹/L
    expectedDeliveryTime: new Date(Date.now() + 2 * 3600 * 1000).toISOString().slice(0, 16), // in 2 hours
    driverAvailability: "Immediate / On Duty",
    status: "In Transit",
    isSample: true
  },
  {
    id: "TRK-802",
    vehicleType: "24ft Container (9T)",
    currentLocation: "Bengaluru Peenya Hub",
    currentLat: 12.9716,
    currentLng: 77.5946,
    destination: "Chennai Guindy Hub",
    destLat: 13.0827,
    destLng: 80.2707,
    maxCapacity: 9000,
    currentLoad: 7500, // 1500 kg available
    mileage: 5.2,
    fuelPrice: 94.50,
    expectedDeliveryTime: new Date(Date.now() + 4 * 3600 * 1000).toISOString().slice(0, 16),
    driverAvailability: "Mandatory Rest (1.5h required)",
    status: "In Transit",
    isSample: true
  },
  {
    id: "TRK-803",
    vehicleType: "14ft Open Truck (4T)",
    currentLocation: "Delhi Okhla Phase III",
    currentLat: 28.5355,
    currentLng: 77.2600,
    destination: "Jaipur VKIA Hub",
    destLat: 26.9124,
    destLng: 75.7873,
    maxCapacity: 4000,
    currentLoad: 3200, // 800 kg available
    mileage: 6.8,
    fuelPrice: 94.50,
    expectedDeliveryTime: new Date(Date.now() + 1.5 * 3600 * 1000).toISOString().slice(0, 16),
    driverAvailability: "Immediate / On Duty",
    status: "Delayed",
    isSample: true
  },
  {
    id: "TRK-804",
    vehicleType: "Trailer 40ft (25T)",
    currentLocation: "Ahmedabad Sanand Hub",
    currentLat: 23.0225,
    currentLng: 72.5714,
    destination: "Surat Sachin GIDC",
    destLat: 21.1702,
    destLng: 72.8311,
    maxCapacity: 25000,
    currentLoad: 19500, // 5500 kg available
    mileage: 3.5,
    fuelPrice: 94.50,
    expectedDeliveryTime: new Date(Date.now() + 3.5 * 3600 * 1000).toISOString().slice(0, 16),
    driverAvailability: "Immediate / On Duty",
    status: "Available",
    isSample: true
  }
];

window.ReRoute.SAMPLE_SHIPMENTS = [
  {
    id: "SHP-301",
    pickupLocation: "Navi Mumbai Taloja MIDC",
    pickupLat: 19.0330,
    pickupLng: 73.0297,
    dropLocation: "Pune Chakan Auto Cluster",
    dropLat: 18.7606,
    dropLng: 73.8636,
    cargoWeight: 3200, // Fits TRK-801 (has 3500kg free)
    pickupWindowStart: new Date(Date.now() + 2.5 * 3600 * 1000).toISOString().slice(0, 16),
    pickupWindowEnd: new Date(Date.now() + 6 * 3600 * 1000).toISOString().slice(0, 16),
    deliveryDeadline: new Date(Date.now() + 14 * 3600 * 1000).toISOString().slice(0, 16),
    priority: "Critical",
    value: 22500,
    requiredVehicleType: "32ft Multi-Axle (15T)",
    specialRequirements: "Forklift Loading",
    status: "Available",
    isSample: true
  },
  {
    id: "SHP-302",
    pickupLocation: "Panvel Cold Chain Complex",
    pickupLat: 18.9894,
    pickupLng: 73.1175,
    dropLocation: "Thane Bhiwandi Hub",
    dropLat: 19.2967,
    dropLng: 73.0631,
    cargoWeight: 2600,
    pickupWindowStart: new Date(Date.now() + 3 * 3600 * 1000).toISOString().slice(0, 16),
    pickupWindowEnd: new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 16),
    deliveryDeadline: new Date(Date.now() + 16 * 3600 * 1000).toISOString().slice(0, 16),
    priority: "High",
    value: 16000,
    requiredVehicleType: "Any",
    specialRequirements: "Express Backhaul",
    status: "Available",
    isSample: true
  },
  {
    id: "SHP-303",
    pickupLocation: "JNPT Free Trade Zone",
    pickupLat: 18.9496,
    pickupLng: 72.9515,
    dropLocation: "Nashik Ambad Industrial Area",
    dropLat: 19.9975,
    dropLng: 73.7898,
    cargoWeight: 3400,
    pickupWindowStart: new Date(Date.now() + 4 * 3600 * 1000).toISOString().slice(0, 16),
    pickupWindowEnd: new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 16),
    deliveryDeadline: new Date(Date.now() + 18 * 3600 * 1000).toISOString().slice(0, 16),
    priority: "Standard",
    value: 24000,
    requiredVehicleType: "Any",
    specialRequirements: "None",
    status: "Available",
    isSample: true
  },
  {
    id: "SHP-304",
    pickupLocation: "Mumbai Kurla West",
    pickupLat: 19.0726,
    pickupLng: 72.8845,
    dropLocation: "Pune Hadapsar SEZ",
    dropLat: 18.5089,
    dropLng: 73.9259,
    cargoWeight: 5500, // OVERWEIGHT for TRK-801 remaining capacity! Tests Explainability "Why Not?"
    pickupWindowStart: new Date(Date.now() + 2 * 3600 * 1000).toISOString().slice(0, 16),
    pickupWindowEnd: new Date(Date.now() + 5 * 3600 * 1000).toISOString().slice(0, 16),
    deliveryDeadline: new Date(Date.now() + 12 * 3600 * 1000).toISOString().slice(0, 16),
    priority: "Flexible",
    value: 19000,
    requiredVehicleType: "32ft Multi-Axle (15T)",
    specialRequirements: "None",
    status: "Available",
    isSample: true
  },
  {
    id: "SHP-305",
    pickupLocation: "Chennai Ennore Port",
    pickupLat: 13.2618,
    pickupLng: 80.3292,
    dropLocation: "Bengaluru Electronic City",
    dropLat: 12.8452,
    dropLng: 77.6602,
    cargoWeight: 1400, // Fits TRK-802 (has 1500kg free)
    pickupWindowStart: new Date(Date.now() + 4.5 * 3600 * 1000).toISOString().slice(0, 16),
    pickupWindowEnd: new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 16),
    deliveryDeadline: new Date(Date.now() + 20 * 3600 * 1000).toISOString().slice(0, 16),
    priority: "High",
    value: 18500,
    requiredVehicleType: "24ft Container (9T)",
    specialRequirements: "Hazmat Clearance",
    status: "Available",
    isSample: true
  },
  {
    id: "SHP-306",
    pickupLocation: "Jaipur Sitapura Industrial",
    pickupLat: 26.7725,
    pickupLng: 75.8344,
    dropLocation: "Delhi Gurgaon Border",
    dropLat: 28.4595,
    dropLng: 77.0266,
    cargoWeight: 750, // Fits TRK-803 (has 800kg free)
    pickupWindowStart: new Date(Date.now() + 2 * 3600 * 1000).toISOString().slice(0, 16),
    pickupWindowEnd: new Date(Date.now() + 6 * 3600 * 1000).toISOString().slice(0, 16),
    deliveryDeadline: new Date(Date.now() + 15 * 3600 * 1000).toISOString().slice(0, 16),
    priority: "Standard",
    value: 11000,
    requiredVehicleType: "Any",
    specialRequirements: "None",
    status: "Available",
    isSample: true
  }
];
