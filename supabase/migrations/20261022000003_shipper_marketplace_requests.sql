-- ==============================================================================
-- Logistics Twin — Shipper-to-Truck Marketplace & Reservation Schema
-- Migration: 20261022000003_shipper_marketplace_requests.sql
-- Enables Uber-style on-demand reverse matching, soft reservation locks (10 min),
-- and shipper backhaul request lifecycle with strict Row-Level Security.
-- ==============================================================================

-- 1. TRUCK REQUESTS TABLE
CREATE TABLE IF NOT EXISTS public.truck_requests (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE DEFAULT 'demo-org',
    truck_id TEXT NOT NULL REFERENCES public.trucks(id) ON DELETE CASCADE,
    shipment_id TEXT NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
    shipper_id UUID REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
    status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'accepted', 'rejected', 'expired')),
    offered_rate_inr NUMERIC NOT NULL CHECK (offered_rate_inr >= 0),
    quote_inr NUMERIC NOT NULL CHECK (quote_inr >= 0),
    savings_inr NUMERIC NOT NULL DEFAULT 0 CHECK (savings_inr >= 0),
    detour_km NUMERIC NOT NULL DEFAULT 0 CHECK (detour_km >= 0),
    eta_buffer_minutes INTEGER NOT NULL DEFAULT 0,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (timezone('utc'::text, now()) + interval '10 minutes'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index for fast status and lookup queries
CREATE INDEX IF NOT EXISTS idx_truck_requests_org_status ON public.truck_requests(org_id, status);
CREATE INDEX IF NOT EXISTS idx_truck_requests_truck_id ON public.truck_requests(truck_id);
CREATE INDEX IF NOT EXISTS idx_truck_requests_shipment_id ON public.truck_requests(shipment_id);

-- 2. ENABLE ROW-LEVEL SECURITY
ALTER TABLE public.truck_requests ENABLE ROW LEVEL SECURITY;

-- 3. RLS POLICIES FOR TRUCK REQUESTS

-- Policy 1: SELECT
DROP POLICY IF EXISTS "Read Truck Requests Policy" ON public.truck_requests;
CREATE POLICY "Read Truck Requests Policy" ON public.truck_requests
    FOR SELECT
    USING (
        -- Dispatchers and Admins see full organization marketplace requests
        (public.current_user_role() IN ('dispatcher', 'admin') AND org_id = public.current_user_org_id())
        -- Shippers see ONLY requests they initiated
        OR (public.current_user_role() = 'shipper' AND shipper_id = auth.uid())
        -- Drivers see requests dispatched to their vehicle
        OR (public.current_user_role() = 'driver' AND EXISTS (
            SELECT 1 FROM public.trucks t
            WHERE t.id = truck_requests.truck_id AND t.assigned_driver_id = auth.uid()
        ))
        -- Unauthenticated demo visitors can read demo-org sandbox requests
        OR (auth.uid() IS NULL AND org_id = 'demo-org')
    );

-- Policy 2: INSERT
DROP POLICY IF EXISTS "Insert Truck Requests Policy" ON public.truck_requests;
CREATE POLICY "Insert Truck Requests Policy" ON public.truck_requests
    FOR INSERT
    WITH CHECK (
        -- Dispatchers/Admins can post requests
        (public.current_user_role() IN ('dispatcher', 'admin') AND org_id = public.current_user_org_id())
        -- Shippers can create requests with their own user id
        OR (public.current_user_role() = 'shipper' AND org_id = public.current_user_org_id() AND (shipper_id = auth.uid() OR shipper_id IS NULL))
        -- Anonymous visitors can test marketplace on demo-org
        OR (auth.uid() IS NULL AND org_id = 'demo-org')
    );

-- Policy 3: UPDATE (Status changes: accept, reject, expire)
DROP POLICY IF EXISTS "Update Truck Requests Policy" ON public.truck_requests;
CREATE POLICY "Update Truck Requests Policy" ON public.truck_requests
    FOR UPDATE
    USING (
        -- Dispatchers and Admins can update any request in their org
        (public.current_user_role() IN ('dispatcher', 'admin') AND org_id = public.current_user_org_id())
        -- Drivers can accept/reject requests targeted at their vehicle
        OR (public.current_user_role() = 'driver' AND EXISTS (
            SELECT 1 FROM public.trucks t
            WHERE t.id = truck_requests.truck_id AND t.assigned_driver_id = auth.uid()
        ))
        -- Shippers can cancel/update their own pending requests
        OR (public.current_user_role() = 'shipper' AND shipper_id = auth.uid())
        -- Anonymous demo visitors on demo-org
        OR (auth.uid() IS NULL AND org_id = 'demo-org')
    )
    WITH CHECK (
        (public.current_user_role() IN ('dispatcher', 'admin') AND org_id = public.current_user_org_id())
        OR (public.current_user_role() = 'driver' AND EXISTS (
            SELECT 1 FROM public.trucks t
            WHERE t.id = truck_requests.truck_id AND t.assigned_driver_id = auth.uid()
        ))
        OR (public.current_user_role() = 'shipper' AND shipper_id = auth.uid())
        OR (auth.uid() IS NULL AND org_id = 'demo-org')
    );
