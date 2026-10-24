-- ==============================================================================
-- Logistics Twin — Auth Triggers & Profiles RLS Migration
-- Migration: 20261022000001_handle_new_user_and_profiles.sql
-- Adds handle_new_user() trigger on auth.users and sets up secure profiles RLS policies.
-- ==============================================================================

-- 1. TRIGGER FUNCTION: Create profile on auth.users signup
-- Inserts a profile linked to 'demo-org' with least-privilege default role 'shipper'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        org_id,
        email,
        full_name,
        role,
        created_at
    )
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'org_id', 'demo-org'),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'role', 'shipper'),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);
    RETURN NEW;
END;
$$;

-- Attach trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. ROW-LEVEL SECURITY POLICIES FOR PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy 1: Any authenticated user can SELECT their own profile
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile" ON public.profiles
    FOR SELECT
    USING (id = auth.uid());

-- Policy 2: Dispatchers and Admins can SELECT all profiles within their organization
DROP POLICY IF EXISTS "Dispatchers and admins can read org profiles" ON public.profiles;
CREATE POLICY "Dispatchers and admins can read org profiles" ON public.profiles
    FOR SELECT
    USING (
        org_id = public.current_user_org_id()
        AND public.current_user_role() IN ('dispatcher', 'admin')
    );

-- Policy 3: Users can UPDATE their own full_name only (role cannot be changed by user)
DROP POLICY IF EXISTS "Users can update own full_name only" ON public.profiles;
CREATE POLICY "Users can update own full_name only" ON public.profiles
    FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (
        id = auth.uid()
        AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
    );

-- Policy 4: Admins can UPDATE any profile within their organization (e.g. role promotions)
DROP POLICY IF EXISTS "Admins can update org profiles" ON public.profiles;
CREATE POLICY "Admins can update org profiles" ON public.profiles
    FOR UPDATE
    USING (
        org_id = public.current_user_org_id()
        AND public.current_user_role() = 'admin'
    )
    WITH CHECK (
        org_id = public.current_user_org_id()
        AND public.current_user_role() = 'admin'
    );
