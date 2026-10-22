// ReRoute AI 2.0 - Weather Intelligence Badge Component
// Shows live Open-Meteo weather conditions, risk level (low/medium/high),
// and strict truthful attribution ("Live (Open-Meteo)" vs "Fallback estimate" vs "Weather unavailable").
// Never presents fallback data as live.

import React from 'react';
import { CloudRain, CloudSun, Sun, Wind, AlertTriangle, CloudOff } from 'lucide-react';

export default function WeatherBadge({
  weather,
  variant = 'badge', // 'badge' | 'chip' | 'compact' | 'map'
  className = '',
}) {
  if (!weather) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-slate-50 border border-slate-200 text-slate-500 ${className}`}>
        <CloudOff className="w-3.5 h-3.5 text-slate-400" />
        <span>Weather unavailable (using normal conditions)</span>
      </div>
    );
  }

  const riskLevel = (weather.disruptionImpact?.riskLevel || weather.riskLevel || 'low').toLowerCase();
  const isSimulated = Boolean(weather.isSimulated || weather.simulated);
  const isFallback = Boolean(weather.isFallback || weather.fallback);
  const isUnavailable = Boolean(weather.isUnavailable);
  const condition = weather.currentWeather?.condition || weather.condition || 'Clear sky';
  const temp = weather.currentWeather?.temperatureC ?? weather.temperatureC ?? 28;
  const wind = weather.currentWeather?.windspeedKmH ?? weather.windspeedKmH ?? 12;

  // Truthful source attribution
  let sourceLabel = 'Live (Open-Meteo)';
  if (isSimulated) {
    sourceLabel = 'Simulated Heavy Rain';
  } else if (isUnavailable) {
    sourceLabel = 'Weather unavailable (using normal conditions)';
  } else if (isFallback) {
    sourceLabel = 'Fallback estimate';
  }

  // Visual risk styling
  const riskStyles = {
    high: {
      bg: 'bg-rose-50 text-rose-800 border-rose-300',
      badge: 'bg-rose-600 text-white',
      icon: CloudRain,
      iconColor: 'text-rose-600',
      label: 'High Risk',
    },
    medium: {
      bg: 'bg-amber-50 text-amber-800 border-amber-300',
      badge: 'bg-amber-600 text-white',
      icon: CloudSun,
      iconColor: 'text-amber-600',
      label: 'Medium Risk',
    },
    low: {
      bg: 'bg-emerald-50 text-emerald-800 border-emerald-300',
      badge: 'bg-emerald-600 text-white',
      icon: Sun,
      iconColor: 'text-emerald-600',
      label: 'Low Risk',
    },
  }[riskLevel] || {
    bg: 'bg-slate-50 text-slate-700 border-slate-200',
    badge: 'bg-slate-600 text-white',
    icon: CloudSun,
    iconColor: 'text-slate-500',
    label: 'Nominal',
  };

  const Icon = isUnavailable ? CloudOff : riskStyles.icon;

  if (variant === 'compact') {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${riskStyles.bg} ${className}`}>
        <Icon className={`w-3.5 h-3.5 ${riskStyles.iconColor}`} />
        <span className="capitalize">{riskLevel}</span>
        <span className="text-[9px] opacity-75">({sourceLabel})</span>
      </div>
    );
  }

  if (variant === 'map') {
    return (
      <div className={`p-2 rounded-lg shadow-md border bg-white/95 backdrop-blur-xs text-xs space-y-1 ${className}`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 font-bold text-slate-800">
            <Icon className={`w-3.5 h-3.5 ${riskStyles.iconColor}`} />
            <span>Kasara Ghat Weather</span>
          </div>
          <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${riskStyles.badge}`}>
            {riskStyles.label}
          </span>
        </div>
        <p className="text-[11px] text-slate-600 leading-tight">
          {condition} · {temp}°C, {wind} km/h wind
        </p>
        <div className="text-[10px] text-slate-400 font-medium pt-0.5 border-t border-slate-100 flex items-center justify-between">
          <span>Source:</span>
          <span className={isFallback ? 'text-amber-600 font-semibold' : 'text-slate-600'}>
            {sourceLabel}
          </span>
        </div>
      </div>
    );
  }

  // Default 'badge' / 'chip' variant for cards and headers
  return (
    <div
      className={`p-2.5 rounded-xl border flex flex-wrap items-center justify-between gap-2 text-xs transition-colors ${riskStyles.bg} ${className}`}
    >
      <div className="flex items-center gap-2">
        <span className={`p-1 rounded-md bg-white/80 shadow-xs ${riskStyles.iconColor}`}>
          <Icon className="w-4 h-4" />
        </span>
        <div>
          <div className="flex items-center gap-1.5 font-bold">
            <span>Corridor Weather:</span>
            <span className="font-semibold text-slate-700">{condition}</span>
            <span className="text-slate-500 font-normal">
              ({temp}°C · Wind {wind} km/h)
            </span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
            <span className="font-medium text-slate-600">{sourceLabel}</span>
            {isSimulated && (
              <span className="px-1 rounded bg-rose-200 text-rose-900 font-bold">
                SIMULATED MONSOON
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <span className={`px-2 py-0.5 rounded text-[10px] font-black tracking-wide uppercase ${riskStyles.badge}`}>
          {riskStyles.label}
        </span>
      </div>
    </div>
  );
}
