# ReRoute AI 2.0 — Predictive Backhaul Intelligence

> **Predictive • Proactive • Explainable • Resilient • Sustainable**  
> AI-driven backhaul intelligence platform designed to eliminate empty miles (deadhead return trips) for commercial freight fleets in high-density logistics corridors.

Live Deployment: [https://reroute-ai-2.vercel.app/](https://reroute-ai-2.vercel.app/)

---

## 🚀 Key Capabilities & Pipeline Flow

The platform executes a 7-stage end-to-end intelligent logistics pipeline:

1. **Predict**: In-transit trajectory tracking with early empty return probability calculation (87% risk before reaching unassigned state).
2. **Warn**: Live countdown timer alerting dispatchers 2h 15m ahead of vehicle arrival at the unloading depot.
3. **Match**: Spatial-temporal candidate discovery along the active transit corridor (Mumbai MMR ↔ Nashik Industrial Belt via NH 160).
4. **Optimize**: Multi-Criteria Linear Programming (MCLP) scoring across 6 weighted operational factors:
   - **Route Alignment (25%)**
   - **Time Compatibility (20%)**
   - **Payload Capacity Fit (20%)**
   - **Detour Efficiency (15%)**
   - **Freight Cost Yield (10%)**
   - **Disruption Delay Risk (10%)**
5. **Explain**: Comprehensive "Why / Why Not?" operational decision audit cards and head-to-head comparison between candidates (S1 vs S2).
6. **Recover**: Dynamic disruption simulation engine testing real-time self-healing re-routing with sub-450ms solver latency when loads are cancelled or delayed.
7. **Measure**: Carbon-Aware ESG Scope 1 sustainability metrics (empty km eliminated, diesel litres saved, freight cost saved, and CO₂ emissions reduced).

---

## 🛠 Tech Stack

- **Frontend Framework**: React 18 (Vite SPA)
- **Styling**: Tailwind CSS
- **Interactive Mapping**: Leaflet.js with OpenStreetMap tiles, custom waypoint pill tooltips, and animated live vehicle radar pins
- **Icons**: Lucide React
- **Animations**: Custom requestAnimationFrame count-up transitions
- **Deployment**: Vercel Static Build

---

## 💻 Getting Started Locally

### Prerequisites
- Node.js (v18 or newer recommended)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/arpitahyalij28-dot/ReRouteAI.git

# Navigate into the project folder
cd ReRouteAI

# Install dependencies
npm install

# Start local development server
npm run dev
```

Visit `http://localhost:3000` in your browser.

### Production Build

```bash
npm run build
npm run preview
```

---

## 📁 Repository Structure

```
ReRouteAI/
├── index.html                   # HTML entry point with Leaflet & Inter fonts
├── package.json                 # Dependencies & build scripts
├── vite.config.js               # Vite bundler configuration
├── tailwind.config.js           # Tailwind theme configuration
├── postcss.config.js            # PostCSS configuration
├── vercel.json                  # Vercel deployment routing configuration
├── src/
│   ├── main.jsx                 # React root mount
│   ├── App.jsx                  # Main application state and coordinator
│   ├── index.css                # Tailwind directives and custom map styles
│   ├── data/
│   │   └── mockData.js          # Realistic corridor waypoints, truck and load datasets
│   ├── utils/
│   │   └── scoring.js           # Multi-criteria scoring algorithms & sustainability math
│   └── components/
│       ├── Header.jsx           # Top telemetry bar & status indicators
│       ├── PipelineStages.jsx   # 7-stage interactive pipeline indicator
│       ├── TruckCard.jsx        # Vehicle status, deadhead risk gauge & live countdown
│       ├── CorridorMap.jsx      # Interactive Leaflet map with return vectors & GPS markers
│       ├── DisruptionSimulator.jsx # Disruption injection & autonomous recovery tester
│       ├── ShipmentCard.jsx     # Ranked load candidate cards with match score badges
│       ├── ExplainabilityPanel.jsx # Why/Why Not checklist & formula weight breakdowns
│       ├── SustainabilityDashboard.jsx # ESG metrics (KM, Fuel, INR, CO2) with count-up animations
│       ├── DemoGuideModal.jsx   # 2-minute live demo walkthrough script
│       └── CountUp.jsx          # Easing counter animation helper
├── legacy-vanilla/              # Preserved original vanilla JavaScript & Express backend files
└── supabase/
    └── schema.sql               # Database schema definition
```
