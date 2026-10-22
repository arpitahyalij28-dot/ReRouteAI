// ReRoute AI 2.0 - Authentication & Role Context
// Supports Supabase Auth (magic link) + instant offline Demo Mode with role testing.
// Roles: 'dispatcher' | 'shipper' | 'driver' | 'admin'

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [role, setRole] = useState('dispatcher'); // default full demo role
  const [loading, setLoading] = useState(true);
  const [isDemoUser, setIsDemoUser] = useState(!isSupabaseConfigured);

  // Initialize Supabase Auth session if configured
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      setIsDemoUser(true);
      setRole('dispatcher');
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        setIsDemoUser(false);
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
        setIsDemoUser(true);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        setIsDemoUser(false);
        fetchProfile(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
        setIsDemoUser(true);
        setRole('dispatcher');
        setLoading(false);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!error && data) {
        setProfile(data);
        setRole(data.role || 'dispatcher');
      } else {
        // Default role if profile doesn't exist yet
        setRole('dispatcher');
      }
    } catch {
      setRole('dispatcher');
    } finally {
      setLoading(false);
    }
  };

  const loginWithMagicLink = async (email) => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase is not configured. Please continue in Demo Mode.');
    }
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) throw error;
  };

  const logout = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setProfile(null);
    setIsDemoUser(true);
    setRole('dispatcher');
  };

  const setDemoRole = (newRole) => {
    setRole(newRole);
  };

  const continueInDemoMode = () => {
    setIsDemoUser(true);
    setUser(null);
    setRole('dispatcher');
  };

  const value = {
    user,
    profile,
    role,
    loading,
    isDemoUser,
    loginWithMagicLink,
    logout,
    setDemoRole,
    continueInDemoMode,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
