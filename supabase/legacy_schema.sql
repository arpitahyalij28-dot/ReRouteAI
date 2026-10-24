-- ==============================================================================
-- Logistics Twin — Legacy Schema (Archived)
-- Archived for reference. New production migrations live in supabase/migrations/
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
