// ReRoute AI 2.0 - Role Switcher Component
// Allows instant switching between Dispatcher, Shipper, and Driver personas in Demo Mode,
// as well as providing sign-in / sign-out controls.

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, ChevronDown, Check, User, Smartphone, Package, LayoutDashboard, LogIn, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ROLES = [
  {
    id: 'dispatcher',
    label: 'Dispatcher',
    description: 'Full Cockpit & Fleet Optimizer',
    icon: LayoutDashboard,
    route: '/',
    color: 'text-blue-600',
  },
  {
    id: 'shipper',
    label: 'Shipper',
    description: 'Demand Pool & Load Posting',
    icon: Package,
    route: '/loads',
    color: 'text-emerald-600',
  },
  {
    id: 'driver',
    label: 'Driver (T101)',
    description: 'Mobile Navigation & Telemetry',
    icon: Smartphone,
    route: '/driver',
    color: 'text-amber-600',
  },
];

export default function RoleSwitcher() {
  const { role, setDemoRole, isDemoUser, user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeRoleObj = ROLES.find((r) => r.id === role) || ROLES[0];

  const handleSelectRole = (r) => {
    setDemoRole(r.id);
    setIsOpen(false);
    navigate(r.route);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Role Pill Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#E2E8F0] bg-white hover:bg-slate-50 transition-all text-xs font-semibold shadow-xs cursor-pointer"
        title="Switch user role in Demo Mode"
      >
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-[#64748B]">Role:</span>
        <span className="text-[#0F172A] font-bold">{activeRoleObj.label}</span>
        <ChevronDown className="w-3.5 h-3.5 text-[#64748B]" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-[#E2E8F0] p-2 z-50 animate-in fade-in">
          <div className="px-3 py-2 border-b border-[#E2E8F0] mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] block">
              {isDemoUser ? 'Demo Mode Persona' : 'Authenticated Profile'}
            </span>
            <span className="text-xs font-bold text-[#0F172A]">
              {user?.email || 'Evaluator / Demo Session'}
            </span>
          </div>

          <div className="space-y-1">
            {ROLES.map((r) => {
              const Icon = r.icon;
              const isSelected = r.id === role;
              return (
                <button
                  key={r.id}
                  onClick={() => handleSelectRole(r)}
                  className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-colors cursor-pointer ${
                    isSelected ? 'bg-blue-50 text-blue-900 font-bold' : 'hover:bg-slate-50 text-[#0F172A]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`p-1.5 rounded-lg bg-slate-100 ${r.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold">{r.label}</div>
                      <div className="text-[10px] text-[#64748B]">{r.description}</div>
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                </button>
              );
            })}
          </div>

          <div className="border-t border-[#E2E8F0] mt-2 pt-2">
            {isDemoUser ? (
              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate('/login');
                }}
                className="w-full flex items-center gap-2 p-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5 text-blue-600" />
                <span>Cloud Sign In</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  logout();
                  setIsOpen(false);
                  navigate('/login');
                }}
                className="w-full flex items-center gap-2 p-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
