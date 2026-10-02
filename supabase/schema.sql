-- ==============================================================================
-- ReRoute AI 2.0 — Supabase Cloud Database Schema
-- Provides cloud-synchronized persistent storage for Fleet, Shipments, 
-- Backhaul Assignments, Optimization Model Settings, and Demo State.
-- ==============================================================================

-- 1. FLEET VEHICLES TABLE
CREATE TABLE IF NOT EXISTS public.reroute_trucks (
    id TEXT PRIMARY KEY,
    vehicle_type TEXT NOT NULL,
    current_location TEXT NOT NULL,
    current_lat NUMERIC NOT NULL,
    current_lng NUMERIC NOT NULL,
    destination TEXT NOT NULL,
    dest_lat NUMERIC NOT NULL,
    dest_lng NUMERIC NOT NULL,
    max_capacity NUMERIC NOT NULL,
    current_load NUMERIC NOT NULL DEFAULT 0,
    mileage NUMERIC NOT NULL DEFAULT 4.2,
    fuel_price NUMERIC NOT NULL DEFAULT 94.50,
    expected_delivery_time TEXT NOT NULL,
    driver_availability TEXT NOT NULL DEFAULT 'Immediate / On Duty',
    status TEXT NOT NULL DEFAULT 'Available',
    is_sample BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. FREIGHT DEMOND POOL (SHIPMENTS) TABLE
CREATE TABLE IF NOT EXISTS public.reroute_shipments (
    id TEXT PRIMARY KEY,
    pickup_location TEXT NOT NULL,
    pickup_lat NUMERIC NOT NULL,
    pickup_lng NUMERIC NOT NULL,
    drop_location TEXT NOT NULL,
    drop_lat NUMERIC NOT NULL,
    drop_lng NUMERIC NOT NULL,
    cargo_weight NUMERIC NOT NULL,
    pickup_window_start TEXT NOT NULL,
    pickup_window_end TEXT NOT NULL,
    delivery_deadline TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'Standard',
    value NUMERIC NOT NULL DEFAULT 0,
    required_vehicle_type TEXT NOT NULL DEFAULT 'Any',
    special_requirements TEXT NOT NULL DEFAULT 'None',
    status TEXT NOT NULL DEFAULT 'Available',
    is_sample BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. ASSIGNMENTS TABLE (Matched backhaul trips)
CREATE TABLE IF NOT EXISTS public.reroute_assignments (
    id TEXT PRIMARY KEY,
    truck_id TEXT NOT NULL REFERENCES public.reroute_trucks(id) ON DELETE CASCADE,
    shipment_id TEXT NOT NULL REFERENCES public.reroute_shipments(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    match_score NUMERIC NOT NULL DEFAULT 0,
    detour_km NUMERIC NOT NULL DEFAULT 0,
    loaded_km NUMERIC NOT NULL DEFAULT 0,
    eta_arrival TEXT,
    sustainability JSONB,
    cost_gain NUMERIC DEFAULT 0
);

-- 4. MODEL SETTINGS TABLE (Configurable multi-attribute weights & operational constants)
CREATE TABLE IF NOT EXISTS public.reroute_model_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    settings JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. DEMO STATE TABLE (Active selected vehicle & shipment)
CREATE TABLE IF NOT EXISTS public.reroute_demo_state (
    id TEXT PRIMARY KEY DEFAULT 'global',
    active_truck_id TEXT,
    selected_shipment_id TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.reroute_trucks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reroute_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reroute_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reroute_model_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reroute_demo_state ENABLE ROW LEVEL SECURITY;

-- CREATE OPEN POLICIES FOR HACKATHON COLLABORATION
-- Allows anonymous public reads and writes with valid Supabase Anon Key
DROP POLICY IF EXISTS "Public Read Trucks" ON public.reroute_trucks;
CREATE POLICY "Public Read Trucks" ON public.reroute_trucks FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Modify Trucks" ON public.reroute_trucks;
CREATE POLICY "Public Modify Trucks" ON public.reroute_trucks FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Read Shipments" ON public.reroute_shipments;
CREATE POLICY "Public Read Shipments" ON public.reroute_shipments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Modify Shipments" ON public.reroute_shipments;
CREATE POLICY "Public Modify Shipments" ON public.reroute_shipments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Read Assignments" ON public.reroute_assignments;
CREATE POLICY "Public Read Assignments" ON public.reroute_assignments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Modify Assignments" ON public.reroute_assignments;
CREATE POLICY "Public Modify Assignments" ON public.reroute_assignments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Read Settings" ON public.reroute_model_settings;
CREATE POLICY "Public Read Settings" ON public.reroute_model_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Modify Settings" ON public.reroute_model_settings;
CREATE POLICY "Public Modify Settings" ON public.reroute_model_settings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Read Demo State" ON public.reroute_demo_state;
CREATE POLICY "Public Read Demo State" ON public.reroute_demo_state FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Modify Demo State" ON public.reroute_demo_state;
CREATE POLICY "Public Modify Demo State" ON public.reroute_demo_state FOR ALL USING (true) WITH CHECK (true);

-- ENABLE REALTIME REPLICATION FOR INSTANT MULTI-BROWSER SYNC
ALTER PUBLICATION supabase_realtime ADD TABLE public.reroute_trucks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reroute_shipments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reroute_assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reroute_model_settings;
