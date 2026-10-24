// Logistics Twin - Demo Users Seeding Script
// Provisions the 3 official demo accounts in Supabase with pre-set passwords:
// 1. dispatcher@demo.reroute (Role: dispatcher)
// 2. shipper@demo.reroute    (Role: shipper)
// 3. driver@demo.reroute     (Role: driver, assigned to truck T101)
//
// Usage:
//   SUPABASE_SERVICE_ROLE_KEY="ey..." VITE_SUPABASE_URL="https://xxx.supabase.co" node scripts/seed-users.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('\n❌ Missing required environment variables:');
  console.error('Please set VITE_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY');
  console.error('\nExample:');
  console.error('SUPABASE_SERVICE_ROLE_KEY="eyJhbGci..." VITE_SUPABASE_URL="https://your-ref.supabase.co" node scripts/seed-users.js\n');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export const DEMO_PASSWORD = process.env.DEMO_USER_PASSWORD || 'ReRoute2026!Demo';

export const DEMO_ACCOUNTS = [
  {
    email: 'dispatcher@demo.reroute',
    password: DEMO_PASSWORD,
    role: 'dispatcher',
    fullName: 'Chief Dispatcher Sharma',
  },
  {
    email: 'shipper@demo.reroute',
    password: DEMO_PASSWORD,
    role: 'shipper',
    fullName: 'Nashik Agro-Industrial Shipper',
  },
  {
    email: 'driver@demo.reroute',
    password: DEMO_PASSWORD,
    role: 'driver',
    fullName: 'Suresh Patil (T101 Driver)',
  },
];

async function seedDemoUsers() {
  console.log(`\n🚚 Logistics Twin — Seeding 3 Demo Accounts into ${supabaseUrl}...`);

  // Ensure demo-org exists
  const { error: orgError } = await supabase.from('organizations').upsert(
    {
      id: 'demo-org',
      name: 'Western Corridor Logistics Consortium',
      slug: 'demo-org',
    },
    { onConflict: 'id' }
  );

  if (orgError) {
    console.warn(`Warning ensuring demo-org: ${orgError.message}`);
  }

  // Fetch existing users
  const { data: usersList, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    throw new Error(`Failed to list existing users: ${listError.message}`);
  }

  const existingUsers = usersList?.users || [];
  let driverUserId = null;

  for (const account of DEMO_ACCOUNTS) {
    const existing = existingUsers.find((u) => u.email === account.email);
    let userId;

    if (existing) {
      console.log(`Existing user found for ${account.email}, updating password & metadata...`);
      const { data, error } = await supabase.auth.admin.updateUserById(existing.id, {
        password: account.password,
        email_confirm: true,
        user_metadata: {
          role: account.role,
          full_name: account.fullName,
          org_id: 'demo-org',
        },
      });
      if (error) {
        console.error(`Failed to update ${account.email}:`, error.message);
        continue;
      }
      userId = data.user.id;
    } else {
      console.log(`Creating user ${account.email}...`);
      const { data, error } = await supabase.auth.admin.createUser({
        email: account.email,
        password: account.password,
        email_confirm: true,
        user_metadata: {
          role: account.role,
          full_name: account.fullName,
          org_id: 'demo-org',
        },
      });
      if (error) {
        console.error(`Failed to create ${account.email}:`, error.message);
        continue;
      }
      userId = data.user.id;
    }

    // Upsert public profile
    const { error: profileError } = await supabase.from('profiles').upsert(
      {
        id: userId,
        org_id: 'demo-org',
        email: account.email,
        full_name: account.fullName,
        role: account.role,
      },
      { onConflict: 'id' }
    );

    if (profileError) {
      console.error(`Failed to upsert profile for ${account.email}:`, profileError.message);
    } else {
      console.log(`✅ Profile upserted: ${account.email} (${account.role})`);
    }

    if (account.role === 'driver') {
      driverUserId = userId;
    }
  }

  // Assign driver to truck T101
  if (driverUserId) {
    const { error: truckError } = await supabase
      .from('trucks')
      .update({
        assigned_driver_id: driverUserId,
        driver_name: 'Suresh Patil (T101 Driver)',
      })
      .eq('id', 'T101');

    if (truckError) {
      console.warn(`Warning assigning driver to T101: ${truckError.message}`);
    } else {
      console.log(`✅ Truck T101 assigned to driver user ID: ${driverUserId}`);
    }
  }

  console.log('\n🎉 Demo accounts successfully provisioned!');
  console.log('---------------------------------------------------------');
  DEMO_ACCOUNTS.forEach((a) => {
    console.log(`Email:    ${a.email}`);
    console.log(`Password: ${a.password}`);
    console.log(`Role:     ${a.role}`);
    console.log('---------------------------------------------------------');
  });
}

// Run if directly executed
if (process.argv[1]?.endsWith('seed-users.js')) {
  seedDemoUsers().catch((err) => {
    console.error('Seed users script failed:', err);
    process.exit(1);
  });
}
