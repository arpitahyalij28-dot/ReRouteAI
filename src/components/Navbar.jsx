// ReRoute AI 2.0 - Navigation Bar
// Top navigation tabs connecting all system pages

import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Truck,
  Package,
  Layers,
  Zap,
  Leaf,
  Sliders,
  Database,
} from 'lucide-react';

const NAV_ITEMS = [
  { path: '/', label: 'Cockpit', icon: LayoutDashboard },
  { path: '/fleet', label: 'Fleet Optimizer', icon: Truck },
  { path: '/loads', label: 'Loads Pool', icon: Package },
  { path: '/assignments', label: 'Assignments', icon: Layers },
  { path: '/disruptions', label: 'Disruptions', icon: Zap },
  { path: '/analytics', label: 'ESG Analytics', icon: Leaf },
  { path: '/settings', label: 'Settings', icon: Sliders },
  { path: '/data', label: 'Data Gateway', icon: Database },
];

export default function Navbar() {
  return (
    <nav className="bg-white border-b border-[#E2E8F0] shadow-xs">
      <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-1 overflow-x-auto py-2">
        {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                isActive
                  ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-xs'
                  : 'text-[#64748B] hover:text-[#0F172A] hover:bg-slate-50'
              }`
            }
          >
            <Icon className="w-3.5 h-3.5 shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
