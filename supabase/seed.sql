-- ==============================================================================
-- ReRoute AI 2.0 — Seed Data for Demo Organization
-- Populates demo-org with 6 trucks, 15 candidate backhaul shipments, and settings
-- ==============================================================================

-- 1. DEMO ORGANIZATION
INSERT INTO public.organizations (id, name, slug)
VALUES ('demo-org', 'ReRoute Demo Logistics Network', 'reroute-demo')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 2. MODEL SETTINGS
INSERT INTO public.model_settings (org_id, weights, speed_kmh, max_detour_km, co2_factor, fuel_price, mileage)
VALUES (
    'demo-org',
    '{"route": 25, "time": 20, "capacity": 20, "detour": 15, "cost": 10, "disruption": 10}'::jsonb,
    45,
    80,
    2.68,
    95.0,
    4.0
)
ON CONFLICT (org_id) DO UPDATE SET weights = EXCLUDED.weights, updated_at = now();

-- 3. FLEET TRUCKS (6 Real Commercial Trucks)
INSERT INTO public.trucks (
    id, org_id, reg_number, model, vehicle_type, origin, destination,
    origin_lat, origin_lng, dest_lat, dest_lng, current_lat, current_lng,
    current_location_name, capacity_tons, max_capacity, current_load_tons, current_load,
    status, empty_return_probability, countdown_seconds, expected_delivery_time,
    driver_name, driver_phone, speed_kmh, total_trip_km, outbound_remaining_km,
    vehicle_mileage_km_per_l, fuel_price_per_l, emission_factor_kg_per_l, is_sample
) VALUES
(
    'T101', 'demo-org', 'MH-15-EG-4921', 'Tata Signa 2823.K (10T Heavy Commercial Vehicle)',
    '10T Heavy Commercial Vehicle', 'Nashik (Ambad MIDC)', 'Mumbai (Bhiwandi Hub 4)',
    19.9575, 73.7420, 19.2967, 73.0631, 19.6450, 73.4850,
    'NH 160 near Kasara Ghat (Descent to Mumbai)', 10, 10000, 10, 10000,
    'In-Transit', 87, 8100, '14:15', 'Suresh Patil', '+91 98230 45812',
    54, 165, 68, 4.0, 95.0, 2.68, true
),
(
    'T102', 'demo-org', 'MH-12-RN-7840', 'Ashok Leyland Ecomet 1215 (7.5T Medium Commercial Vehicle)',
    '7.5T Medium Commercial Vehicle', 'Pune (Chakan MIDC)', 'Mumbai (JNPT Port)',
    18.7606, 73.8567, 18.9499, 72.9515, 18.8234, 73.2845,
    'Mumbai-Pune Expressway (Khopoli)', 7.5, 7500, 7.5, 7500,
    'In-Transit', 79, 5400, '13:30', 'Mahesh Deshmukh', '+91 98451 23901',
    60, 140, 52, 4.8, 95.0, 2.68, true
),
(
    'T103', 'demo-org', 'GJ-15-YY-3312', 'BharatBenz 1923C (12T Multi-Axle)',
    '12T Multi-Axle Heavy Truck', 'Vapi GIDC (Gujarat)', 'Thane (Majiwada Logistics Park)',
    20.3713, 72.9048, 19.2183, 72.9781, 19.8256, 72.8432,
    'NH 48 near Manor (Palghar)', 12, 12000, 12, 12000,
    'In-Transit', 92, 7200, '14:00', 'Ramesh Solanki', '+91 97234 11209',
    52, 155, 65, 3.8, 94.5, 2.68, true
),
(
    'T104', 'demo-org', 'GJ-05-BX-9021', 'Eicher Pro 3015 (8.5T HCV)',
    '8.5T Heavy Commercial Vehicle', 'Surat (Sachin GIDC)', 'Bhiwandi (Mankoli Depot)',
    21.0827, 72.8718, 19.2812, 73.0489, 20.0891, 72.9123,
    'NH 48 near Dahanu Border', 8.5, 8500, 8.5, 8500,
    'In-Transit', 84, 10800, '15:00', 'Kishore Patel', '+91 99042 88712',
    50, 240, 110, 4.4, 94.5, 2.68, true
),
(
    'T105', 'demo-org', 'MH-20-DE-1102', 'Mahindra Blazo X 28 (14T Heavy Hauler)',
    '14T Multi-Axle Hauler', 'Chhatrapati Sambhajinagar (Waluj MIDC)', 'Navi Mumbai (Taloja Industrial Hub)',
    19.8347, 75.2284, 19.0550, 73.1200, 19.2012, 73.8124,
    'Samruddhi Expressway (Igatpuri-Kalyan Link)', 14, 14000, 14, 14000,
    'In-Transit', 88, 6300, '13:45', 'Ganesh Shinde', '+91 94231 67803',
    55, 320, 78, 3.4, 95.0, 2.68, true
),
(
    'T106', 'demo-org', 'MH-15-CV-5544', 'Tata Ultra T.7 (4T Light Commercial Vehicle)',
    '4T Light Commercial Vehicle', 'Nashik (Sinnar MIDC)', 'Kalyan (Godown Zone)',
    19.8456, 73.9892, 19.2437, 73.1355, 19.5123, 73.4129,
    'NH 160 near Shahapur', 4, 4000, 4, 4000,
    'In-Transit', 72, 4200, '13:10', 'Sachin Gaikwad', '+91 98601 44290',
    48, 145, 38, 6.2, 95.0, 2.68, true
)
ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status,
    current_lat = EXCLUDED.current_lat,
    current_lng = EXCLUDED.current_lng,
    updated_at = now();

-- 4. FREIGHT DEMAND POOL (15 Shipments with Edge Cases)
INSERT INTO public.shipments (
    id, org_id, name, pickup_location, drop_location,
    pickup_lat, pickup_lng, drop_lat, drop_lng, weight_tons, cargo_weight,
    cargo_type, pickup_window_start, pickup_window_end, predicted_truck_eta,
    eta_buffer_minutes, detour_km, freight_offer_inr, value, delay_risk, delay_risk_reason,
    status, is_cancelled, required_vehicle_type, special_requirements, why_why_not, is_sample
) VALUES
(
    'S1', 'demo-org', 'Mumbai Industrial Consignment (Automotive FMCG)', 'Mumbai (Wadala Logistics Hub)', 'Nashik (Satpur MIDC)',
    18.9950, 72.8650, 19.9975, 73.7600, 8.0, 8000,
    'Automotive Sub-Assemblies & Tier-1 Spares', '14:30', '16:00', '14:15',
    15, 6, 28500, 28500, 'low', 'Uncongested arterial expressway link; verified dock bay availability',
    'Available', false, 'Any', 'None',
    '{"recommendedSummary": "Top match: High payload capacity utilization, minimum detour from Nashik return leg, and verified bay readiness."}'::jsonb, true
),
(
    'S2', 'demo-org', 'Thane Industrial Consignment (FMCG Packaging)', 'Thane (Balkum Industrial Area)', 'Nashik (Ambad MIDC)',
    19.2183, 72.9781, 19.9575, 73.7420, 7.0, 7000,
    'FMCG Packaging Materials & Corrugated Cartons', '15:00', '16:30', '14:15',
    45, 12, 24000, 24000, 'low', 'Clear highway access; automated pallet load bays',
    'Available', false, 'Any', 'None',
    '{"recommendedSummary": "Feasible runner-up: Excellent timing buffer but lower freight yield and slightly higher detour than S1."}'::jsonb, true
),
(
    'S3', 'demo-org', 'Panvel Pharma Link (Temperature-Sensitive)', 'Panvel (Cold Storage Terminal)', 'Nashik (Dindori Agro Hub)',
    18.9894, 73.1175, 20.1983, 73.8344, 5.5, 5500,
    'Active Pharmaceutical Ingredients (Reefer)', '14:45', '16:15', '14:15',
    30, 34, 31000, 31000, 'medium', 'Requires active reefer power check & high detour through Panvel junction',
    'Available', false, 'Refrigerated Van', 'Temperature Controlled (2-8°C)',
    '{"recommendedSummary": "Sub-optimal: High gross yield but excessive 34 km southern detour creates deadhead mileage overhead."}'::jsonb, true
),
(
    'S4', 'demo-org', 'JNPT Heavy Machinery (Port Clearance)', 'JNPT Port (Uran CFS Terminal)', 'Pune (Bhosari MIDC)',
    18.9499, 72.9515, 18.6275, 73.8375, 14.0, 14000,
    'Heavy Industrial Press Tooling & Castings', '15:30', '17:00', '14:15',
    75, 78, 36000, 36000, 'high', 'Capacity overflow: 14t exceeds 10t truck rating; route leads south toward Pune instead of Nashik',
    'Available', false, 'Any', 'Overweight Permit',
    '{"recommendedSummary": "Infeasible candidate: Cargo weight (14.0t) exceeds maximum truck payload rating (10.0t). Strict safety lockout."}'::jsonb, true
),
(
    'S5', 'demo-org', 'Taloja Heavy Steel Coils (Flatbed Required)', 'Navi Mumbai (Taloja MIDC)', 'Surat (Udhna GIDC)',
    19.0550, 73.1200, 21.1612, 72.8423, 11.0, 11000,
    'Cold Rolled Steel Coils', '14:00', '16:00', '14:15',
    -15, 42, 42000, 42000, 'high', 'Requires specialized Flatbed Trailer with coil racks',
    'Available', false, 'Flatbed Trailer', 'Chain binders and coil wedges',
    '{"recommendedSummary": "Infeasible: Vehicle type mismatch. Requires Flatbed Trailer with coil racks."}'::jsonb, true
),
(
    'S6', 'demo-org', 'Bhiwandi Textile Remnants (Expired Tender)', 'Bhiwandi (Rajnoli Complex)', 'Pune (Hadapsar Industrial Zone)',
    19.2967, 73.0631, 18.5089, 73.9260, 6.0, 6000,
    'Textile Rolls & Garment Trims', '10:00', '11:30', '14:15',
    -165, 18, 18000, 18000, 'high', 'Pickup window expired at 11:30 IST; dock bay closed',
    'Available', false, 'Any', 'None',
    '{"recommendedSummary": "Infeasible: Tender cutoff window elapsed by >2.5 hours."}'::jsonb, true
),
(
    'S7', 'demo-org', 'Vasai Hardware Components (Tender Dispatched)', 'Vasai (Waliv Industrial Zone)', 'Nashik (Gonde MIDC)',
    19.3919, 72.8397, 19.8214, 73.6912, 9.0, 9000,
    'Precision Architectural Hardware', '14:45', '16:30', '14:15',
    30, 14, 27000, 27000, 'low', 'Already assigned to alternative fleet carrier',
    'Assigned', false, 'Any', 'None',
    '{"recommendedSummary": "Infeasible: Load status is Assigned."}'::jsonb, true
),
(
    'S8', 'demo-org', 'Bhiwandi Consumer Electronics Hub', 'Bhiwandi (Dapode Warehouse Hub)', 'Pune (Chakan Auto MIDC)',
    19.2812, 73.0489, 18.7606, 73.8567, 4.0, 4000,
    'Packaged LED Displays & Appliances', '14:45', '17:00', '14:15',
    30, 15, 22000, 22000, 'low', 'Clear loading bays; high-priority palletized load',
    'Available', false, 'Any', 'Fragile Goods Handling',
    '{"recommendedSummary": "Viable Pune return backhaul for trucks moving south."}'::jsonb, true
),
(
    'S9', 'demo-org', 'Surat Technical Textiles Export', 'Surat (Pandesara GIDC)', 'Mumbai (Kalamboli Steel Market)',
    21.1412, 72.8256, 19.0278, 73.1023, 6.5, 6500,
    'High-Tenacity Industrial Fabrics', '16:00', '18:30', '15:00',
    60, 8, 26000, 26000, 'low', 'Direct access to NH 48 corridor southbound',
    'Available', false, 'Any', 'Tarpaulin Cover Mandatory',
    '{"recommendedSummary": "Prime southbound return load from Gujarat into Mumbai MMR."}'::jsonb, true
),
(
    'S10', 'demo-org', 'Vapi Specialty Polymers Resins', 'Vapi (GIDC Phase 2)', 'Thane (Wagle Estate)',
    20.3713, 72.9048, 19.1912, 72.9512, 8.5, 8500,
    'Industrial Polypropylene Resins', '15:00', '17:30', '14:30',
    30, 10, 29500, 29500, 'low', 'Dedicated chemical loading gate with verified weighbridge',
    'Available', false, 'Any', 'None',
    '{"recommendedSummary": "High yield backhaul candidate with strong payload density."}'::jsonb, true
),
(
    'S11', 'demo-org', 'Lasalgaon Agricultural Produce (Onions)', 'Nashik (Lasalgaon APMC)', 'Navi Mumbai (Vashi APMC Market)',
    20.1456, 74.2289, 19.0768, 73.0084, 9.0, 9000,
    'Perishable Agri Produce (Ventilated)', '15:15', '17:00', '14:15',
    60, 22, 25000, 25000, 'medium', 'Market yard congestion during peak trading hours',
    'Available', false, 'Any', 'Ventilated Body',
    '{"recommendedSummary": "Solid agricultural return load from Nashik district to Mumbai APMC."}'::jsonb, true
),
(
    'S12', 'demo-org', 'Pune Precision Die Castings', 'Pune (Talegaon Dabhade)', 'Nashik (Ambad MIDC)',
    18.7299, 73.6812, 19.9575, 73.7420, 5.0, 5000,
    'Automotive Transmission Housings', '15:45', '18:00', '15:00',
    45, 28, 21500, 21500, 'low', 'Direct connection via NH 60 Pune-Nashik highway',
    'Available', false, 'Any', 'None',
    '{"recommendedSummary": "Connects Pune industrial auto belt back to Nashik."}'::jsonb, true
),
(
    'S13', 'demo-org', 'Bhiwandi E-Commerce Express Sort', 'Bhiwandi (Amazon Fulfilment Center)', 'Vapi (Balitha Hub)',
    19.2967, 73.0631, 20.4012, 72.9312, 3.5, 3500,
    'Priority Retail Express Parcels', '14:30', '16:00', '14:15',
    15, 5, 19000, 19000, 'low', 'Dedicated rapid dispatch dock with barcode scan validation',
    'Available', false, 'Any', 'Sealed Container Lock',
    '{"recommendedSummary": "Quick northbound return cargo with zero turnaround delay."}'::jsonb, true
),
(
    'S14', 'demo-org', 'Tarapur Heavy Electrical Transformers', 'Tarapur MIDC (Boisar)', 'Pune (Ranjangaon MIDC)',
    19.8056, 72.6845, 18.7756, 74.2412, 16.0, 16000,
    'Industrial High Voltage Transformers', '15:00', '18:00', '14:15',
    45, 85, 48000, 48000, 'high', 'Extreme cargo weight (16t) requires multi-axle heavy duty vehicle',
    'Available', false, 'Multi-Axle Heavy Hauler', 'Heavy Cargo Escort',
    '{"recommendedSummary": "Infeasible: 16.0t cargo breaches rating of standard 10t and 12t trucks."}'::jsonb, true
),
(
    'S15', 'demo-org', 'Silvassa Injection Molding Polymers', 'Silvassa (Piparia Industrial Estate)', 'Mumbai (Goregaon Logistics Depot)',
    20.2764, 73.0083, 19.1663, 72.8526, 7.0, 7000,
    'Virgin Polymer Granules', '16:00', '19:00', '15:15',
    45, 12, 23500, 23500, 'low', 'Direct link onto NH 48 expressway into suburban Mumbai',
    'Available', false, 'Any', 'None',
    '{"recommendedSummary": "Reliable medium-weight backhaul into northern Mumbai."}'::jsonb, true
)
ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status,
    updated_at = now();
