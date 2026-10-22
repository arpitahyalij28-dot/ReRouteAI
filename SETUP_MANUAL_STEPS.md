# ReRoute AI 2.0 - Manual Setup & Cloud Configuration Guide

> [!NOTE]
> ReRoute AI 2.0 is designed with **Dual-Mode Architecture**. In **Offline Demo Mode**, zero environment variables or cloud setup are required—evaluators can clone and run `npm install && npm run dev` immediately. Follow this guide when provisioning the multi-tenant Supabase database and production Vercel deployment.

---

## 1. Supabase Cloud Setup

### 1.1 Create Supabase Project
1. Navigate to [Supabase Console](https://supabase.com/dashboard/projects) and log in.
2. Click **New Project**.
3. Choose an organization, enter Project Name: `reroute-ai-production`.
4. Generate and securely store a strong database password.
5. Select Region: **South Asia (Mumbai) `ap-south-1`** for lowest latency on Indian logistics corridors.
6. Click **Create new project**.

---

### 1.2 Run Schema Migrations
1. In the Supabase project sidebar, click **SQL Editor** (icon with `>_`).
2. Click **New Query**.
3. Copy the entire contents of [supabase/migrations/20261022000000_create_reroute_schema.sql](supabase/migrations/20261022000000_create_reroute_schema.sql) and paste into the SQL editor.
4. Click **Run**.
5. Open another query, copy [supabase/migrations/20261022000001_handle_new_user_and_profiles.sql](supabase/migrations/20261022000001_handle_new_user_and_profiles.sql), and click **Run**.
   - This creates 9 core relational tables: `organizations`, `profiles`, `trucks`, `shipments`, `assignments`, `disruption_events`, `telemetry_points`, `model_settings`, and `audit_log`.
   - Attaches `handle_new_user()` trigger on `auth.users` to automatically create profiles with default least-privilege `shipper` role.
   - Enables Row-Level Security (RLS) policies enforcing multi-tenant isolation via `public.current_user_org_id()` and role permissions (`dispatcher`, `shipper`, `driver`, `admin`).
   - Configures idempotent realtime replication for `shipments`, `assignments`, and `disruption_events`.

---

### 1.3 Seed Demonstration Data
1. In the Supabase **SQL Editor**, open another **New Query**.
2. Copy the entire contents of [supabase/seed.sql](supabase/seed.sql) and paste into the editor.
3. Click **Run**.
   - Inserts the default organization `demo-org` (Western Corridor Logistics Consortium).
   - Inserts 6 commercial trucks (`T101` - `T106`) across the Mumbai-Nashik-Pune-Surat network.
   - Inserts 15 candidate backhaul consignments (`S1` - `S15`) including capacity, vehicle type, and time window edge cases.
   - Sets baseline algorithm weights and fuel/emissions factors.

---

### 1.4 Seed Demo User Accounts
Run the user provisioning script locally using your project's `service_role` key:
```bash
SUPABASE_SERVICE_ROLE_KEY="<your-service-role-key>" VITE_SUPABASE_URL="https://<your-project>.supabase.co" node scripts/seed-users.js
```
This automatically provisions 3 ready-to-test accounts with pre-set passwords:
- Dispatcher: `dispatcher@demo.reroute` / `ReRoute2026!Demo`
- Shipper: `shipper@demo.reroute` / `ReRoute2026!Demo`
- Driver: `driver@demo.reroute` / `ReRoute2026!Demo` (assigned to truck `T101`)

---

### 1.4 Retrieve API Credentials
1. In the Supabase sidebar, go to **Project Settings** > **API**.
2. Copy the following keys:
   - **Project URL** (e.g. `https://xyzcompany.supabase.co`)
   - **anon / public key** (safe for client-side browser requests)
   - **service_role key** (secret key with elevated admin permissions—**never expose to frontend**)

---

## 2. Vercel Project & Environment Configuration

### 2.1 Connect Repository to Vercel
1. Navigate to [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New...** > **Project**.
3. Import the GitHub repository: `https://github.com/arpitahyalij28-dot/ReRouteAI`.
4. Framework Preset: **Vite**.
5. Root Directory: `./`.

---

### 2.2 Configure Environment Variables
In the Vercel project deployment screen (or **Settings** > **Environment Variables**), add the following keys:

| Variable Name | Scope | Description | Where to Obtain |
|---|---|---|---|
| `VITE_SUPABASE_URL` | Production & Preview (Client) | Supabase project REST URL | Supabase Dashboard > Settings > API |
| `VITE_SUPABASE_ANON_KEY` | Production & Preview (Client) | Supabase public anonymous API key | Supabase Dashboard > Settings > API |
| `SUPABASE_SERVICE_ROLE_KEY` | Production & Preview (Serverless only) | Secret service role key for administrative functions | Supabase Dashboard > Settings > API |
| `ANTHROPIC_API_KEY` | Production & Preview (Serverless only) | Anthropic API key for natural language explainability | [Anthropic Console](https://console.anthropic.com/) |
| `ANTHROPIC_MODEL` | Production & Preview (Serverless only, Optional) | Model ID (defaults to `claude-3-5-haiku-20241022`) | [Anthropic Docs](https://docs.anthropic.com/) |
| `OPENROUTESERVICE_API_KEY` | Production & Preview (Serverless only) | High-resolution corridor routing proxy key | [OpenRouteService](https://openrouteservice.org/dev/#/signup) |

> [!WARNING]
> Ensure `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, and `OPENROUTESERVICE_API_KEY` do **NOT** have the `VITE_` prefix. This ensures Vite's bundler will never leak them into the client-side JavaScript distribution.

---

## 3. Multi-Tenant RLS & Security Verification

To verify that Row-Level Security (RLS) is properly isolating customer freight data:

### Step 1: Create Two Distinct Organizations
Run in Supabase SQL editor:
```sql
INSERT INTO public.organizations (id, name, slug)
VALUES
  ('org-alpha', 'Alpha Express Carriers', 'alpha-express'),
  ('org-beta', 'Beta Global Freight', 'beta-global');
```

### Step 2: Create Two Test Users in Supabase Auth
1. Go to **Authentication** > **Users** in Supabase.
2. Click **Add User** > **Create User**:
   - `dispatcher@alpha.com` (assigned to `org-alpha`)
   - `dispatcher@beta.com` (assigned to `org-beta`)

### Step 3: Link Profiles
```sql
UPDATE public.profiles
SET org_id = 'org-alpha', role = 'dispatcher'
WHERE email = 'dispatcher@alpha.com';

UPDATE public.profiles
SET org_id = 'org-beta', role = 'dispatcher'
WHERE email = 'dispatcher@beta.com';
```

### Step 4: Verify Cross-Tenant Isolation
1. Sign in as `dispatcher@alpha.com` and post a new shipment via the UI (`Loads Pool`).
2. Sign in as `dispatcher@beta.com` in a separate private browser window.
3. **Expected result**: `dispatcher@beta.com` cannot see `org-alpha`'s shipment or vehicle telemetry. Supabase Postgres RLS policies automatically filter queries by `public.current_user_org_id()` resolved dynamically from `public.profiles`.

---

## 4. Realtime Synchronization Verification

1. Open two browser windows side-by-side pointing to the application.
2. In Window 1 (Shipper mode), go to `/loads` and click **Post New Load Tender**. Fill in details and click **Verify & Post Load**.
3. In Window 2 (Dispatcher Cockpit), observe:
   - A floating realtime toast appears: `New Load Posted: <Consignment Name>`.
   - The Demand Pool and map markers update dynamically without refreshing the page.
