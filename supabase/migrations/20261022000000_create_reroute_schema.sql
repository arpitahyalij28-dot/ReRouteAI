-- ==============================================================================
-- ReRoute AI 2.0 — Production Database Schema Migration
-- Migration: 20261022000000_create_reroute_schema.sql
-- Idempotent, re-runnable, secure Row-Level Security with role-based policies.
-- ==============================================================================

-- 1. ORGANIZATIONS TABLE
CREATE TABLE IF NOT EXISTS public.organizations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. USER PROFILES & ROLES
-- Roles: 'dispatcher' | 'shipper' | 'driver' | 'admin'
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    org_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'dispatcher' CHECK (role IN ('dispatcher', 'shipper', 'driver', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. FLEET TRUCKS TABLE
CREATE TABLE IF NOT EXISTS public.trucks (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    reg_number TEXT NOT NULL,
    model TEXT NOT NULL,
    vehicle_type TEXT NOT NULL,
    origin TEXT NOT NULL,
    destination TEXT NOT NULL,
    origin_lat NUMERIC NOT NULL CHECK (origin_lat BETWEEN -90 AND 90),
    origin_lng NUMERIC NOT NULL CHECK (origin_lng BETWEEN -180 AND 180),
    dest_lat NUMERIC NOT NULL CHECK (dest_lat BETWEEN -90 AND 90),
    dest_lng NUMERIC NOT NULL CHECK (dest_lng BETWEEN -180 AND 180),
    current_lat NUMERIC NOT NULL CHECK (current_lat BETWEEN -90 AND 90),
    current_lng NUMERIC NOT NULL CHECK (current_lng BETWEEN -180 AND 180),
    current_location_name TEXT NOT NULL,
    capacity_tons NUMERIC NOT NULL CHECK (capacity_tons > 0),
    max_capacity NUMERIC NOT NULL CHECK (max_capacity > 0),
    current_load_tons NUMERIC NOT NULL DEFAULT 0 CHECK (current_load_tons >= 0),
    current_load NUMERIC NOT NULL DEFAULT 0 CHECK (current_load >= 0),
    status TEXT NOT NULL DEFAULT 'In-Transit' CHECK (status IN ('Available', 'In-Transit', 'Delayed', 'Maintenance', 'Assigned')),
    empty_return_probability NUMERIC NOT NULL DEFAULT 85 CHECK (empty_return_probability BETWEEN 0 AND 100),
    countdown_seconds INTEGER NOT NULL DEFAULT 8100 CHECK (countdown_seconds >= 0),
    expected_delivery_time TEXT NOT NULL,
    driver_name TEXT,
    driver_phone TEXT,
    assigned_driver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    speed_kmh NUMERIC NOT NULL DEFAULT 50 CHECK (speed_kmh > 0),
    total_trip_km NUMERIC NOT NULL DEFAULT 160 CHECK (total_trip_km >= 0),
    outbound_remaining_km NUMERIC NOT NULL DEFAULT 65 CHECK (outbound_remaining_km >= 0),
    vehicle_mileage_km_per_l NUMERIC NOT NULL DEFAULT 4.0 CHECK (vehicle_mileage_km_per_l > 0),
    fuel_price_per_l NUMERIC NOT NULL DEFAULT 95.0 CHECK (fuel_price_per_l > 0),
    emission_factor_kg_per_l NUMERIC NOT NULL DEFAULT 2.68 CHECK (emission_factor_kg_per_l > 0),
    is_sample BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. FREIGHT DEMAND POOL (SHIPMENTS)
CREATE TABLE IF NOT EXISTS public.shipments (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    shipper_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    pickup_location TEXT NOT NULL,
    drop_location TEXT NOT NULL,
    pickup_lat NUMERIC NOT NULL CHECK (pickup_lat BETWEEN -90 AND 90),
    pickup_lng NUMERIC NOT NULL CHECK (pickup_lng BETWEEN -180 AND 180),
    drop_lat NUMERIC NOT NULL CHECK (drop_lat BETWEEN -90 AND 90),
    drop_lng NUMERIC NOT NULL CHECK (drop_lng BETWEEN -180 AND 180),
    weight_tons NUMERIC NOT NULL CHECK (weight_tons > 0),
    cargo_weight NUMERIC NOT NULL CHECK (cargo_weight > 0),
    cargo_type TEXT NOT NULL,
    pickup_window_start TEXT NOT NULL,
    pickup_window_end TEXT NOT NULL,
    pickup_window_start_at TIMESTAMPTZ,
    pickup_window_end_at TIMESTAMPTZ,
    delivery_deadline TIMESTAMPTZ,
    predicted_truck_eta TEXT,
    eta_buffer_minutes INTEGER NOT NULL DEFAULT 0,
    detour_km NUMERIC NOT NULL DEFAULT 0 CHECK (detour_km >= 0),
    freight_offer_inr NUMERIC NOT NULL DEFAULT 0 CHECK (freight_offer_inr >= 0),
    value NUMERIC NOT NULL DEFAULT 0 CHECK (value >= 0),
    delay_risk TEXT NOT NULL DEFAULT 'low' CHECK (delay_risk IN ('low', 'medium', 'high')),
    delay_risk_reason TEXT,
    status TEXT NOT NULL DEFAULT 'Available' CHECK (status IN ('Available', 'Assigned', 'In-Transit', 'Delivered', 'Cancelled')),
    is_cancelled BOOLEAN NOT NULL DEFAULT false,
    required_vehicle_type TEXT NOT NULL DEFAULT 'Any',
    special_requirements TEXT NOT NULL DEFAULT 'None',
    why_why_not JSONB,
    is_sample BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. ASSIGNMENTS (Matched backhauls)
CREATE TABLE IF NOT EXISTS public.assignments (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    truck_id TEXT NOT NULL REFERENCES public.trucks(id) ON DELETE CASCADE,
    shipment_id TEXT NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    match_score NUMERIC NOT NULL DEFAULT 0,
    detour_km NUMERIC NOT NULL DEFAULT 0,
    loaded_km NUMERIC NOT NULL DEFAULT 0,
    eta_arrival TEXT,
    sustainability JSONB,
    cost_gain NUMERIC DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'In-Transit', 'Completed', 'Cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. DISRUPTION EVENTS (Audit & live field simulation logging)
CREATE TABLE IF NOT EXISTS public.disruption_events (
    id TEXT PRIMARY KEY DEFAULT ('EVT-' || gen_random_uuid()),
    org_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('CANCELLATION', 'DELAY', 'WINDOW_SHIFT', 'BREAKDOWN', 'WEATHER', 'RECOVERY', 'DISRUPTION')),
    shipment_id TEXT REFERENCES public.shipments(id) ON DELETE SET NULL,
    truck_id TEXT REFERENCES public.trucks(id) ON DELETE SET NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. TELEMETRY POINTS (Live vehicle GPS radar trail)
CREATE TABLE IF NOT EXISTS public.telemetry_points (
    id BIGSERIAL PRIMARY KEY,
    org_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    truck_id TEXT NOT NULL REFERENCES public.trucks(id) ON DELETE CASCADE,
    lat NUMERIC NOT NULL CHECK (lat BETWEEN -90 AND 90),
    lng NUMERIC NOT NULL CHECK (lng BETWEEN -180 AND 180),
    speed NUMERIC NOT NULL DEFAULT 0 CHECK (speed >= 0),
    heading NUMERIC CHECK (heading BETWEEN 0 AND 360),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. MODEL SETTINGS (Per-organization multi-criteria weights)
CREATE TABLE IF NOT EXISTS public.model_settings (
    org_id TEXT PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
    weights JSONB NOT NULL,
    speed_kmh NUMERIC NOT NULL DEFAULT 45,
    max_detour_km NUMERIC NOT NULL DEFAULT 80,
    co2_factor NUMERIC NOT NULL DEFAULT 2.68,
    fuel_price NUMERIC NOT NULL DEFAULT 95.0,
    mileage NUMERIC NOT NULL DEFAULT 4.0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. AUDIT LOG
CREATE TABLE IF NOT EXISTS public.audit_log (
    id BIGSERIAL PRIMARY KEY,
    org_id TEXT REFERENCES public.organizations(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- --- INDEXES ---
CREATE INDEX IF NOT EXISTS idx_trucks_org_status ON public.trucks(org_id, status);
CREATE INDEX IF NOT EXISTS idx_shipments_org_status ON public.shipments(org_id, status);
CREATE INDEX IF NOT EXISTS idx_assignments_org ON public.assignments(org_id);
CREATE INDEX IF NOT EXISTS idx_assignments_truck ON public.assignments(truck_id);
CREATE INDEX IF NOT EXISTS idx_assignments_shipment ON public.assignments(shipment_id);
CREATE INDEX IF NOT EXISTS idx_disruptions_org_created ON public.disruption_events(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_truck_recorded ON public.telemetry_points(truck_id, recorded_at DESC);

-- --- ROW LEVEL SECURITY (RLS) ---
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trucks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disruption_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telemetry_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Helper functions for RLS membership
CREATE OR REPLACE FUNCTION public.current_user_org_id()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT org_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- 1. PUBLIC DEMO ACCESS: Allows unauthenticated read-only queries for the 'demo-org'
DROP POLICY IF EXISTS "Public Read Demo Org" ON public.organizations;
CREATE POLICY "Public Read Demo Org" ON public.organizations
    FOR SELECT USING (id = 'demo-org' OR id = public.current_user_org_id());

DROP POLICY IF EXISTS "Public Read Demo Trucks" ON public.trucks;
CREATE POLICY "Public Read Demo Trucks" ON public.trucks
    FOR SELECT USING (org_id = 'demo-org' OR org_id = public.current_user_org_id());

DROP POLICY IF EXISTS "Public Read Demo Shipments" ON public.shipments;
CREATE POLICY "Public Read Demo Shipments" ON public.shipments
    FOR SELECT USING (org_id = 'demo-org' OR org_id = public.current_user_org_id());

DROP POLICY IF EXISTS "Public Read Demo Assignments" ON public.assignments;
CREATE POLICY "Public Read Demo Assignments" ON public.assignments
    FOR SELECT USING (org_id = 'demo-org' OR org_id = public.current_user_org_id());

DROP POLICY IF EXISTS "Public Read Demo Settings" ON public.model_settings;
CREATE POLICY "Public Read Demo Settings" ON public.model_settings
    FOR SELECT USING (org_id = 'demo-org' OR org_id = public.current_user_org_id());

DROP POLICY IF EXISTS "Public Read Demo Disruptions" ON public.disruption_events;
CREATE POLICY "Public Read Demo Disruptions" ON public.disruption_events
    FOR SELECT USING (org_id = 'demo-org' OR org_id = public.current_user_org_id());

-- 2. DISPATCHER & ADMIN: Full Org Control
DROP POLICY IF EXISTS "Dispatcher Full Trucks" ON public.trucks;
CREATE POLICY "Dispatcher Full Trucks" ON public.trucks
    FOR ALL
    USING (
        org_id = public.current_user_org_id() 
        AND public.current_user_role() IN ('dispatcher', 'admin')
    )
    WITH CHECK (
        org_id = public.current_user_org_id() 
        AND public.current_user_role() IN ('dispatcher', 'admin')
    );

DROP POLICY IF EXISTS "Dispatcher Full Shipments" ON public.shipments;
CREATE POLICY "Dispatcher Full Shipments" ON public.shipments
    FOR ALL
    USING (
        org_id = public.current_user_org_id() 
        AND public.current_user_role() IN ('dispatcher', 'admin')
    )
    WITH CHECK (
        org_id = public.current_user_org_id() 
        AND public.current_user_role() IN ('dispatcher', 'admin')
    );

DROP POLICY IF EXISTS "Dispatcher Full Assignments" ON public.assignments;
CREATE POLICY "Dispatcher Full Assignments" ON public.assignments
    FOR ALL
    USING (
        org_id = public.current_user_org_id() 
        AND public.current_user_role() IN ('dispatcher', 'admin')
    )
    WITH CHECK (
        org_id = public.current_user_org_id() 
        AND public.current_user_role() IN ('dispatcher', 'admin')
    );

DROP POLICY IF EXISTS "Dispatcher Full Settings" ON public.model_settings;
CREATE POLICY "Dispatcher Full Settings" ON public.model_settings
    FOR ALL
    USING (
        org_id = public.current_user_org_id() 
        AND public.current_user_role() IN ('dispatcher', 'admin')
    )
    WITH CHECK (
        org_id = public.current_user_org_id() 
        AND public.current_user_role() IN ('dispatcher', 'admin')
    );

DROP POLICY IF EXISTS "Dispatcher Full Disruptions" ON public.disruption_events;
CREATE POLICY "Dispatcher Full Disruptions" ON public.disruption_events
    FOR ALL
    USING (
        org_id = public.current_user_org_id() 
        AND public.current_user_role() IN ('dispatcher', 'admin')
    )
    WITH CHECK (
        org_id = public.current_user_org_id() 
        AND public.current_user_role() IN ('dispatcher', 'admin')
    );

-- 3. SHIPPER: Post and manage own shipments
DROP POLICY IF EXISTS "Shipper Manage Own Shipments" ON public.shipments;
CREATE POLICY "Shipper Manage Own Shipments" ON public.shipments
    FOR ALL
    USING (
        org_id = public.current_user_org_id() 
        AND (shipper_user_id = auth.uid() OR public.current_user_role() IN ('dispatcher', 'admin'))
    )
    WITH CHECK (
        org_id = public.current_user_org_id() 
        AND (shipper_user_id = auth.uid() OR public.current_user_role() IN ('dispatcher', 'admin'))
    );

-- 4. DRIVER: View assigned truck and push telemetry
DROP POLICY IF EXISTS "Driver View Assigned Truck" ON public.trucks;
CREATE POLICY "Driver View Assigned Truck" ON public.trucks
    FOR SELECT
    USING (
        org_id = public.current_user_org_id() 
        AND (assigned_driver_id = auth.uid() OR public.current_user_role() IN ('dispatcher', 'admin'))
    );

DROP POLICY IF EXISTS "Driver Insert Telemetry" ON public.telemetry_points;
CREATE POLICY "Driver Insert Telemetry" ON public.telemetry_points
    FOR INSERT
    WITH CHECK (
        org_id = public.current_user_org_id() 
        AND EXISTS (
            SELECT 1 FROM public.trucks 
            WHERE trucks.id = telemetry_points.truck_id 
            AND (trucks.assigned_driver_id = auth.uid() OR public.current_user_role() IN ('dispatcher', 'admin'))
        )
    );

-- 5. REALTIME PUBLICATION: Idempotent publication setup
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['trucks', 'shipments', 'assignments', 'disruption_events', 'model_settings', 'telemetry_points'])
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND tablename = tbl
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
    END IF;
  END LOOP;
END $$;
