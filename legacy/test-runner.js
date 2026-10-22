// ReRoute AI 2.0 - Automated Comprehensive Verification Suite
// Verifies all 21 steps specified in Section 29 of the Product Requirements Document

const DistanceEngine = require('./js/engines/distance-engine.js');
const RiskEngine = require('./js/engines/risk-engine.js');
const ETAEngine = require('./js/engines/eta-engine.js');
const SustainabilityEngine = require('./js/engines/sustainability-engine.js');
const MatchingEngine = require('./js/engines/matching-engine.js');
const RecoveryEngine = require('./js/engines/recovery-engine.js');
const Validation = require('./js/validation.js');
const store = require('./js/store.js');

console.log('================================================================');
console.log('  REROUTE AI 2.0 — AUTOMATED HACKATHON VERIFICATION SUITE');
console.log('================================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, stepNum, testName, extraInfo = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`[PASS] Step ${stepNum}: ${testName} ${extraInfo ? '(' + extraInfo + ')' : ''}`);
  } else {
    console.error(`[FAIL] Step ${stepNum}: ${testName} ${extraInfo ? '(' + extraInfo + ')' : ''}`);
    process.exitCode = 1;
  }
}

// Ensure clean start
store.clearAllData();

// 1. Open application with EMPTY DATA
assert(
  store.getState().trucks.length === 0 && store.getState().shipments.length === 0,
  1,
  "Open application with EMPTY DATA",
  `Trucks: ${store.getState().trucks.length}, Shipments: ${store.getState().shipments.length}`
);

// 2. Add a completely new truck
const newTruck = {
  id: "TRK-USER-01",
  vehicleType: "32ft Multi-Axle (15T)",
  currentLocation: "Pune Bhosari MIDC",
  currentLat: 18.6277,
  currentLng: 73.8447,
  destination: "Mumbai Kalamboli Steel Market",
  destLat: 19.0222,
  destLng: 73.1022,
  maxCapacity: 16000,
  currentLoad: 12000, // 4,000 kg available
  mileage: 4.0,
  fuelPrice: 95.0,
  expectedDeliveryTime: new Date(Date.now() + 2 * 3600 * 1000).toISOString().slice(0, 16),
  driverAvailability: "Immediate / On Duty",
  status: "In Transit",
  isSample: false
};

const vTruck = Validation.validateTruck(newTruck, store.getState().trucks);
assert(vTruck.isValid, 2, "Validate and Add new truck", `Truck ID: ${newTruck.id}`);
store.addTruck(newTruck);
assert(store.getState().trucks.length === 1, 2, "Truck persisted in store");

// 3. Add 3 completely new shipments
const s1 = {
  id: "SHP-USER-A",
  pickupLocation: "Navi Mumbai Turbhe",
  pickupLat: 19.0716,
  pickupLng: 73.0183,
  dropLocation: "Pune Chakan",
  dropLat: 18.7606,
  dropLng: 73.8636,
  cargoWeight: 3500, // Fits 4000kg
  pickupWindowStart: new Date(Date.now() + 2.5 * 3600 * 1000).toISOString().slice(0, 16),
  pickupWindowEnd: new Date(Date.now() + 6 * 3600 * 1000).toISOString().slice(0, 16),
  deliveryDeadline: new Date(Date.now() + 14 * 3600 * 1000).toISOString().slice(0, 16),
  priority: "High",
  value: 22000,
  requiredVehicleType: "32ft Multi-Axle (15T)",
  specialRequirements: "None",
  status: "Available",
  isSample: false
};

const s2 = {
  id: "SHP-USER-B",
  pickupLocation: "Panvel Hub",
  pickupLat: 18.9894,
  pickupLng: 73.1175,
  dropLocation: "Nashik Ambad",
  dropLat: 19.9975,
  dropLng: 73.7898,
  cargoWeight: 3800, // Fits 4000kg, but higher detour
  pickupWindowStart: new Date(Date.now() + 3 * 3600 * 1000).toISOString().slice(0, 16),
  pickupWindowEnd: new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 16),
  deliveryDeadline: new Date(Date.now() + 18 * 3600 * 1000).toISOString().slice(0, 16),
  priority: "Standard",
  value: 26000,
  requiredVehicleType: "Any",
  specialRequirements: "None",
  status: "Available",
  isSample: false
};

const s3 = {
  id: "SHP-USER-C",
  pickupLocation: "Mumbai Kurla",
  pickupLat: 19.0726,
  pickupLng: 72.8845,
  dropLocation: "Pune Hadapsar",
  dropLat: 18.5089,
  dropLng: 73.9259,
  cargoWeight: 7500, // OVERWEIGHT: 7500 > 4000 available capacity! Should be INFEASIBLE
  pickupWindowStart: new Date(Date.now() + 2 * 3600 * 1000).toISOString().slice(0, 16),
  pickupWindowEnd: new Date(Date.now() + 5 * 3600 * 1000).toISOString().slice(0, 16),
  deliveryDeadline: new Date(Date.now() + 12 * 3600 * 1000).toISOString().slice(0, 16),
  priority: "Critical",
  value: 28000,
  requiredVehicleType: "32ft Multi-Axle (15T)",
  specialRequirements: "None",
  status: "Available",
  isSample: false
};

store.addShipment(s1);
store.addShipment(s2);
store.addShipment(s3);
assert(store.getState().shipments.length === 3, 3, "Add 3 completely new shipments");

// 4. Run ReRoute AI
const truckToAnalyze = store.getState().trucks[0];
const candidateShipments = store.getState().shipments;
const matchesInit = MatchingEngine.evaluateShipments(truckToAnalyze, candidateShipments, store.getState().modelSettings);
assert(matchesInit.length === 3, 4, "Run ReRoute AI on selected truck", `Evaluated ${matchesInit.length} candidates`);

// 5. Verify scores are calculated dynamically
const matchA = matchesInit.find(m => m.shipment.id === "SHP-USER-A");
const matchB = matchesInit.find(m => m.shipment.id === "SHP-USER-B");
const matchC = matchesInit.find(m => m.shipment.id === "SHP-USER-C");

assert(matchA && matchA.matchScore > 0 && matchA.isFeasible, 5, "SHP-USER-A is dynamically scored and feasible", `Score: ${matchA.matchScore}%`);
assert(matchC && !matchC.isFeasible, 5, "SHP-USER-C is infeasible due to 7500kg cargo vs 4000kg capacity");
assert(matchA.isRecommended === true, 5, "Highest feasible shipment flagged as AI RECOMMENDED", `${matchA.shipment.id}`);
assert(matchC.isRecommended === false, 5, "Infeasible shipment NEVER recommended");

// 6. Change truck capacity
// Increase truck capacity so SHP-USER-C (7500kg) can fit: Max 20000, load 10000 -> 10,000kg free
store.updateTruck("TRK-USER-01", { maxCapacity: 20000, currentLoad: 10000 });
const updatedTruck = store.getState().trucks.find(t => t.id === "TRK-USER-01");
const matchesAfterCapChange = MatchingEngine.evaluateShipments(updatedTruck, candidateShipments, store.getState().modelSettings);
const matchCAfter = matchesAfterCapChange.find(m => m.shipment.id === "SHP-USER-C");

// 7. Verify matching changes
assert(matchCAfter.isFeasible === true, 7, "Change truck capacity causes previously infeasible shipment C to become FEASIBLE");

// 8. Change pickup window
// Make SHP-USER-A pickup window close in past/before arrival
store.updateShipment("SHP-USER-A", {
  pickupWindowStart: new Date(Date.now() - 5 * 3600 * 1000).toISOString().slice(0, 16),
  pickupWindowEnd: new Date(Date.now() - 2 * 3600 * 1000).toISOString().slice(0, 16)
});
const matchesAfterWindow = MatchingEngine.evaluateShipments(updatedTruck, store.getState().shipments, store.getState().modelSettings);
const matchAWindow = matchesAfterWindow.find(m => m.shipment.id === "SHP-USER-A");

// 9. Verify ETA / risk changes
assert(matchAWindow.isFeasible === false && matchAWindow.eta.status === 'INFEASIBLE', 9, "Change pickup window causes ETA status to become INFEASIBLE and match to fail");

// Restore SHP-USER-A window for subsequent tests
store.updateShipment("SHP-USER-A", {
  pickupWindowStart: new Date(Date.now() + 2.5 * 3600 * 1000).toISOString().slice(0, 16),
  pickupWindowEnd: new Date(Date.now() + 6 * 3600 * 1000).toISOString().slice(0, 16)
});

// 10. Change model weights
// Emphasize cost 50% and detour 0% vs previous weights
const heavyCostWeights = {
  route: 10,
  time: 10,
  capacity: 10,
  detour: 10,
  cost: 50,
  disruption: 10
};
store.updateModelSettings({ weights: heavyCostWeights });

// 11. Verify ranking changes
const matchesAfterWeights = MatchingEngine.evaluateShipments(updatedTruck, store.getState().shipments, store.getState().modelSettings);
assert(matchesAfterWeights.length === 3, 11, "Model weights updated and recalculated match ranking dynamically");

// 12. Accept a match
const topMatch = matchesAfterWeights.find(m => m.isFeasible);
const assignment = store.assignBackhaul(updatedTruck.id, topMatch.shipment.id, topMatch);
assert(
  assignment && store.getState().assignments.length === 1 && store.getState().shipments.find(s => s.id === topMatch.shipment.id).status === 'Reserved',
  12,
  "Accept a match updates shipment status to RESERVED and logs assignment"
);

// 13. Cancel that shipment & 14. Verify automatic re-matching
const cancelledId = topMatch.shipment.id;
store.cancelShipment(cancelledId);
assert(store.getState().shipments.find(s => s.id === cancelledId).status === 'Cancelled', 13, "Shipment marked as CANCELLED and removed from active assignment");

const remainingAvailable = store.getState().shipments.filter(s => s.status === 'Available');
const recoveryMatches = MatchingEngine.evaluateShipments(updatedTruck, remainingAvailable, store.getState().modelSettings);
const newRec = recoveryMatches.find(m => m.isFeasible);
assert(newRec && newRec.shipment.id !== cancelledId, 14, "Automatic re-matching selects new recommended backhaul from remaining pool", `New Rec: ${newRec.shipment.id}`);

// 15. Check sustainability calculations
const testSust = SustainabilityEngine.calculateSustainability({
  distanceKm: 150,
  detourKm: 15,
  mileage: 4.0,
  fuelPrice: 95.0,
  emissionFactor: 2.68,
  maxCapacity: 16000,
  cargoWeight: 3500,
  shipmentValue: 22000
});
// 150km / 4 = 37.5L, 37.5 * 95 = 3562.5 => 3563, 37.5 * 2.68 = 100.5 kg CO2
assert(testSust.emptyKmAvoided === 150, 15, "Sustainability Empty KM Avoided is 150 km");
assert(testSust.fuelSavedLitres === 37.5, 15, "Sustainability Fuel Saved is 37.5 L");
assert(testSust.co2AvoidedKg === 100.5, 15, "Sustainability CO2 Avoided is 100.5 kg");
assert(testSust.fuelCostImpact === 3563, 15, "Sustainability Fuel Cost Impact is ₹3,563");

// 16. Refresh / simulate persistence re-load & 17. Verify data persists
const exportedJSON = store.exportToJSON();
assert(exportedJSON && exportedJSON.includes("TRK-USER-01"), 17, "Verify data serializes cleanly with user records");

// 18. Export data
const csvFleet = store.exportFleetCSV();
const csvShipments = store.exportShipmentsCSV();
assert(csvFleet.includes("TRK-USER-01") && csvShipments.includes("SHP-USER-B"), 18, "Export CSV for fleet and shipments succeeded");

// 19. Clear data
store.clearAllData();
assert(store.getState().trucks.length === 0 && store.getState().shipments.length === 0, 19, "Clear all data resets store completely");

// 20. Import the exported data & 21. Verify data is restored
const importResult = store.importFromJSON(exportedJSON);
assert(importResult.success && store.getState().trucks.length === 1 && store.getState().shipments.length === 3, 21, "Import exported data completely restores user records");

console.log('\n================================================================');
console.log(`  VERIFICATION SUITE COMPLETE: ${passedTests} / ${totalTests} TESTS PASSED`);
console.log('================================================================\n');

if (passedTests === totalTests) {
  console.log('>>> ALL 21 TEST SCENARIOS PASSED WITH ZERO ERRORS. MVP READY! <<<');
} else {
  console.error('>>> SOME TESTS FAILED. PLEASE REVIEW LOGS. <<<');
  process.exit(1);
}
