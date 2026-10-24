// Logistics Twin - Navigation Bar
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
  Smartphone,
  ShieldCheck,
} from 'lucide-react';
import { useReRoute } from '../context/ReRouteContext';
const NAV_ITEMS = [
  { path: '/', label: 'Supply Network', icon: LayoutDashboard },
  { path: '/disruptions', label: 'Problem Simulator', icon: Zap },
  { path: '/assignments', label: 'Recovery Plan', icon: Layers },
  { path: '/fleet', label: 'Fleet & Dispatch', icon: Truck },
  { path: '/loads', label: 'Loads Pool', icon: Package },
  { path: '/analytics', label: 'Resilience Analytics', icon: Leaf },
  { path: '/settings', label: 'Settings', icon: Sliders },
  { path: '/data', label: 'Data Management', icon: Database },
];

export default function Navbar() {
  const { isJudgeMode } = useReRoute();
  const visibleItems = isJudgeMode
    ? NAV_ITEMS.filter((item) => item.path !== '/settings' && item.path !== '/data')
    : NAV_ITEMS;

  return (
    <nav className="bg-white border-b border-[#E2E8F0] shadow-xs w-full overflow-hidden">
      <div className="max-w-[1680px] mx-auto px-3 sm:px-6 lg:px-8 flex items-center gap-1.5 overflow-x-auto py-2 no-scrollbar">
        {visibleItems.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2 min-h-[44px] rounded-xl text-xs font-bold transition-all shrink-0 ${
                isActive
                  ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-xs'
                  : 'text-[#64748B] hover:text-[#0F172A] hover:bg-slate-50'
              }`
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
