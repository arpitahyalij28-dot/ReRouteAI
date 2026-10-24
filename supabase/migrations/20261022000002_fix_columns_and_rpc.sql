-- ==============================================================================
-- Logistics Twin — Column & Policy Fixes + Atomic RPC Functions
-- Migration: 20261022000002_fix_columns_and_rpc.sql
-- Fixes column mismatches, enforces strict RLS policies, and introduces atomic RPCs.
-- ==============================================================================

-- 1. Ensure default for shipper_user_id on shipments
ALTER TABLE public.shipments 
    ALTER COLUMN shipper_user_id SET DEFAULT auth.uid();

-- 2. Telemetry Points: Add SELECT policy so authorized users can read vehicle trails
DROP POLICY IF EXISTS "Org can read telemetry points" ON public.telemetry_points;
CREATE POLICY "Org can read telemetry points" ON public.telemetry_points
    FOR SELECT
    USING (
        org_id = public.current_user_org_id() 
        OR org_id = 'demo-org'
    );

-- 3. Assignments: Add narrow driver UPDATE policy
-- Drivers can update ONLY assignments assigned to the truck they drive
DROP POLICY IF EXISTS "Drivers can update own truck assignments" ON public.assignments;
CREATE POLICY "Drivers can update own truck assignments" ON public.assignments
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.trucks t
            WHERE t.id = assignments.truck_id
            AND t.assigned_driver_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.trucks t
            WHERE t.id = assignments.truck_id
            AND t.assigned_driver_id = auth.uid()
        )
    );

-- 4. Shipments: Enforce Shipper Own-Only Read Policy
-- Dispatchers/admins see all shipments in org; Shippers see only their own shipments;
-- Drivers see shipments assigned to their truck; Anonymous visitors see demo-org.
DROP POLICY IF EXISTS "Public Read Demo Shipments" ON public.shipments;
DROP POLICY IF EXISTS "Read Shipments Policy" ON public.shipments;
CREATE POLICY "Read Shipments Policy" ON public.shipments
    FOR SELECT
    USING (
        -- Dispatchers and Admins see full organization demand pool
        (public.current_user_role() IN ('dispatcher', 'admin') AND org_id = public.current_user_org_id())
        -- Shippers see ONLY their own posted consignments
        OR (public.current_user_role() = 'shipper' AND shipper_user_id = auth.uid())
        -- Drivers see shipments assigned to their vehicle
        OR (public.current_user_role() = 'driver' AND EXISTS (
            SELECT 1 FROM public.assignments a
            JOIN public.trucks t ON t.id = a.truck_id
            WHERE a.shipment_id = shipments.id AND t.assigned_driver_id = auth.uid()
        ))
        -- Unauthenticated demo visitors can read demo-org sandbox loads
        OR (auth.uid() IS NULL AND org_id = 'demo-org')
    );

-- 5. Audit Log: Add Dispatcher/Admin read policy and write policy
DROP POLICY IF EXISTS "Dispatcher can read audit log" ON public.audit_log;
CREATE POLICY "Dispatcher can read audit log" ON public.audit_log
    FOR SELECT
    USING (
        org_id = public.current_user_org_id()
        AND public.current_user_role() IN ('dispatcher', 'admin')
    );

DROP POLICY IF EXISTS "Authenticated users can insert audit log" ON public.audit_log;
CREATE POLICY "Authenticated users can insert audit log" ON public.audit_log
    FOR INSERT
    WITH CHECK (
        org_id = public.current_user_org_id()
        OR org_id = 'demo-org'
    );

-- 6. Atomic Assignment RPC Function (SECURITY INVOKER)
-- Inserts assignment, updates shipment status to 'Assigned', and records audit log in 1 transaction
CREATE OR REPLACE FUNCTION public.create_assignment_atomic(
    p_id TEXT,
    p_org_id TEXT,
    p_truck_id TEXT,
    p_shipment_id TEXT,
    p_match_score NUMERIC DEFAULT 0,
    p_detour_km NUMERIC DEFAULT 0,
    p_loaded_km NUMERIC DEFAULT 0,
    p_eta_arrival TEXT DEFAULT '',
    p_sustainability JSONB DEFAULT NULL,
    p_cost_gain NUMERIC DEFAULT 0,
    p_status TEXT DEFAULT 'Active'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    v_assignment public.assignments%ROWTYPE;
BEGIN
    -- 1. Insert assignment record
    INSERT INTO public.assignments (
        id, org_id, truck_id, shipment_id, match_score, detour_km,
        loaded_km, eta_arrival, sustainability, cost_gain, status, assigned_at
    )
    VALUES (
        p_id, p_org_id, p_truck_id, p_shipment_id, p_match_score, p_detour_km,
        p_loaded_km, p_eta_arrival, p_sustainability, p_cost_gain, p_status, NOW()
    )
    RETURNING * INTO v_assignment;

    -- 2. Update shipment status to Assigned
    UPDATE public.shipments
    SET status = 'Assigned', updated_at = NOW()
    WHERE id = p_shipment_id AND org_id = p_org_id;

    -- 3. Write audit log entry
    INSERT INTO public.audit_log (org_id, user_id, action, entity_type, entity_id, new_state)
    VALUES (p_org_id, auth.uid(), 'ASSIGNMENT_CREATED', 'assignment', p_id, to_jsonb(v_assignment));

    RETURN to_jsonb(v_assignment);
END;
$$;

-- 7. Atomic Shipment Cancellation RPC Function (SECURITY INVOKER)
CREATE OR REPLACE FUNCTION public.cancel_shipment_atomic(
    p_shipment_id TEXT,
    p_org_id TEXT,
    p_reason TEXT DEFAULT 'Cancelled by tender authority'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    v_shipment public.shipments%ROWTYPE;
BEGIN
    -- 1. Update shipment
    UPDATE public.shipments
    SET status = 'Cancelled', is_cancelled = true, updated_at = NOW()
    WHERE id = p_shipment_id AND org_id = p_org_id
    RETURNING * INTO v_shipment;

    -- 2. Update any active assignment
    UPDATE public.assignments
    SET status = 'Cancelled'
    WHERE shipment_id = p_shipment_id AND org_id = p_org_id;

    -- 3. Create disruption event
    INSERT INTO public.disruption_events (org_id, type, shipment_id, payload)
    VALUES (p_org_id, 'CANCELLATION', p_shipment_id, jsonb_build_object('reason', p_reason));

    -- 4. Audit log
    INSERT INTO public.audit_log (org_id, user_id, action, entity_type, entity_id, new_state)
    VALUES (p_org_id, auth.uid(), 'SHIPMENT_CANCELLED', 'shipment', p_shipment_id, to_jsonb(v_shipment));

    RETURN to_jsonb(v_shipment);
END;
$$;
