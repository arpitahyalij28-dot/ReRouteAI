// Logistics Twin - Simplified Planner Auth Context
// Single default "Planner" persona with no login required.
// App opens directly to the main cockpit dashboard.

import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

const DEFAULT_PLANNER_USER = {
  id: 'planner-1',
  email: 'planner@logisticstwin.local',
};

const DEFAULT_PLANNER_PROFILE = {
  id: 'planner-1',
  full_name: 'Regional Logistics Planner',
  role: 'planner',
  org_id: 'demo-org',
  org_name: 'Regional Logistics Network',
};

export function AuthProvider({ children }) {
  const [user] = useState(DEFAULT_PLANNER_USER);
  const [profile] = useState(DEFAULT_PLANNER_PROFILE);
  const [role] = useState('planner');
  const [loading] = useState(false);
  const [isDemoUser] = useState(true);

  const value = {
    user,
    profile,
    role,
    loading,
    isDemoUser,
    loginWithPassword: async () => ({ user: DEFAULT_PLANNER_USER }),
    loginWithMagicLink: async () => {},
    logout: async () => {},
    setDemoRole: () => {},
    continueInDemoMode: () => {},
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    return {
      user: DEFAULT_PLANNER_USER,
      profile: DEFAULT_PLANNER_PROFILE,
      role: 'planner',
      loading: false,
      isDemoUser: true,
      loginWithPassword: async () => ({ user: DEFAULT_PLANNER_USER }),
      loginWithMagicLink: async () => {},
      logout: async () => {},
      setDemoRole: () => {},
      continueInDemoMode: () => {},
    };
  }
  return context;
}

export default AuthContext;
