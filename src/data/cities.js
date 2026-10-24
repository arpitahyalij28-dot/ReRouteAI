// Logistics Twin - Maharashtra & Western India Key Logistics Hubs & Cities
// Geocoded lookup dictionary for dynamic route plotting and distance computation.

export const CITIES = [
  { name: 'Nashik', state: 'Maharashtra', lat: 19.9975, lng: 73.7898, hub: 'Ambad / Satpur MIDC' },
  { name: 'Mumbai', state: 'Maharashtra', lat: 19.0760, lng: 72.8777, hub: 'Wadala / Mumbai Port' },
  { name: 'Pune', state: 'Maharashtra', lat: 18.5204, lng: 73.8567, hub: 'Chakan / Bhosari MIDC' },
  { name: 'Thane', state: 'Maharashtra', lat: 19.2183, lng: 72.9781, hub: 'Majiwada / Balkum Ind. Area' },
  { name: 'Igatpuri', state: 'Maharashtra', lat: 19.6967, lng: 73.5594, hub: 'NH 160 Toll Crossway' },
  { name: 'Bhiwandi', state: 'Maharashtra', lat: 19.2967, lng: 73.0631, hub: 'Bhiwandi Hub 4 Logistics Depot' },
  { name: 'Navi Mumbai', state: 'Maharashtra', lat: 18.9499, lng: 72.9515, hub: 'JNPT / Taloja Industrial Link' },
  { name: 'Panvel', state: 'Maharashtra', lat: 18.9894, lng: 73.1175, hub: 'Cold Storage & Agro Terminal' },
  { name: 'Kalyan', state: 'Maharashtra', lat: 19.2437, lng: 73.1355, hub: 'Godown Warehousing Zone' },
  { name: 'Chhatrapati Sambhajinagar (Aurangabad)', state: 'Maharashtra', lat: 19.8762, lng: 75.3433, hub: 'Waluj MIDC Industrial Area' },
  { name: 'Nagpur', state: 'Maharashtra', lat: 21.1458, lng: 79.0882, hub: 'MIHAN Multi-Modal Hub' },
  { name: 'Kolhapur', state: 'Maharashtra', lat: 16.7050, lng: 74.2433, hub: 'Shiroli / Gokul Shirgaon MIDC' },
  { name: 'Solapur', state: 'Maharashtra', lat: 17.6599, lng: 75.9064, hub: 'Textile & Agro Transport Hub' },
  { name: 'Surat', state: 'Gujarat', lat: 21.1702, lng: 72.8311, hub: 'Sachin GIDC Industrial Hub' },
  { name: 'Vapi', state: 'Gujarat', lat: 20.3713, lng: 72.9048, hub: 'Vapi GIDC Freight Terminal' },
  { name: 'Vadodara', state: 'Gujarat', lat: 22.3072, lng: 73.1812, hub: 'Makarpura GIDC' },
  { name: 'Ahmedabad', state: 'Gujarat', lat: 23.0225, lng: 72.5714, hub: 'Sanand / Changodar Freight Hub' },
  { name: 'Delhi NCR', state: 'Delhi', lat: 28.6139, lng: 77.2090, hub: 'Northern Corridor Intermodal' },
  { name: 'Bengaluru', state: 'Karnataka', lat: 12.9716, lng: 77.5946, hub: 'Peenya Industrial Logistics' },
  { name: 'Hyderabad', state: 'Telangana', lat: 17.3850, lng: 78.4867, hub: 'Medchal Freight Corridor' },
];

export const CITY_MAP = Object.fromEntries(
  CITIES.map((c) => [c.name.toLowerCase(), c])
);

/**
 * Resolves a city name (fuzzy or exact) to [latitude, longitude].
 * Falls back to default Maharashtra coordinate center if unmatched.
 */
export function getCityCoords(cityName) {
  if (!cityName || typeof cityName !== 'string') {
    return [19.5, 73.3]; // Central Maharashtra corridor fallback
  }

  const query = cityName.trim().toLowerCase();

  // 1. Direct or partial match in CITY_MAP
  for (const city of CITIES) {
    const cName = city.name.toLowerCase();
    if (query === cName || query.includes(cName) || cName.includes(query)) {
      return [city.lat, city.lng];
    }
  }

  // 2. Common aliases
  if (query.includes('aurangabad') || query.includes('sambhajinagar')) {
    return [19.8762, 75.3433];
  }
  if (query.includes('jnpt') || query.includes('uran') || query.includes('taloja')) {
    return [18.9499, 72.9515];
  }
  if (query.includes('kasara') || query.includes('ghat')) {
    return [19.6450, 73.4850];
  }
  if (query.includes('shahapur') || query.includes('asangaon')) {
    return [19.4398, 73.3087];
  }

  return [19.5, 73.3];
}

/**
 * Calculates Haversine distance in kilometers between two coordinate pairs or city names.
 */
export function calculateDistanceKm(from, to) {
  const coords1 = Array.isArray(from) ? from : getCityCoords(from);
  const coords2 = Array.isArray(to) ? to : getCityCoords(to);

  if (!coords1 || !coords2) return 150;

  const [lat1, lon1] = coords1;
  const [lat2, lon2] = coords2;

  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const straightLine = R * c;

  // Real road winding factor is typically 1.25x - 1.35x in India
  return Math.round(straightLine * 1.28);
}
