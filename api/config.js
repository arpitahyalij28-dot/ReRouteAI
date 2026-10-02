// Vercel Serverless Function: /api/config
// Safely provides Supabase public credentials from environment variables to the frontend.
// Never exposes service role keys or administrative secrets.

module.exports = (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL || 
                      process.env.NEXT_PUBLIC_SUPABASE_URL || 
                      process.env.VITE_SUPABASE_URL || '';

  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 
                         process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
                         process.env.VITE_SUPABASE_ANON_KEY || '';

  const isConfigured = Boolean(supabaseUrl && supabaseAnonKey);

  res.status(200).json({
    configured: isConfigured,
    supabaseUrl: supabaseUrl,
    supabaseAnonKey: supabaseAnonKey,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'production'
  });
};
