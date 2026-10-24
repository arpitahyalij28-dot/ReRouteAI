# Engine & Data Model Requests

## Proposal: Standardize Demo Network Vehicle Classes

- **Context**: The `NetworkEntityModal` now standardizes on 4 core regional vehicle classes via `src/data/vehicleTypes.js`:
  1. `Mini Truck (1-2 Ton)` (2T, 38 units, ₹18/km)
  2. `Light Commercial Vehicle (3.5T)` (3.5T, 66 units, ₹22/km)
  3. `Medium Commercial Truck (8T)` (8T, 150 units, ₹28/km)
  4. `Heavy Commercial Truck (16T)` (16T, 300 units, ₹42/km)

- **Current State in `src/data/networkDemo.js`**:
  `DEMO_VEHICLES` contains ad-hoc labels such as:
  - `Light Truck (4T)`
  - `Medium Truck (7T)`
  - `Heavy Commercial (10T)`
  - `Electric Van (2T)`
  - `Trailer Multi-Axle (20T)`

- **Compatibility**:
  The modal's vehicle type dropdown seamlessly handles these existing values via its dynamic `Custom: <old value>` option without data loss.

- **Recommendation**:
  In a future data migration phase, update `DEMO_VEHICLES` in `src/data/networkDemo.js` to map directly to the 4 canonical `VEHICLE_TYPES` once all existing test snapshots and mock scenario expectations are aligned.
