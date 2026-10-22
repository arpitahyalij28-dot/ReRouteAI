// ReRoute AI 2.0 - Core Data Context & Persistence Provider
// Starts completely EMPTY by default. Hydrates from localStorage.
// Demo data is loaded ONLY on explicit user action ("Load Demo Data").

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { DEMO_DATA } from '../data/mockData';
import { getCityCoords, calculateDistanceKm } from '../data/cities';

export const DataContext = createContext(null);

const STORAGE_KEYS = {
  TRUCKS: 'reroute_trucks',
  SHIPMENTS: 'reroute_shipments',
  SELECTED_TRUCK: 'reroute_selected_truck_id',
  SELECTED_SHIPMENT: 'reroute_selected_shipment_id',
};

// Safe localStorage readers that start EMPTY if no user data has been saved
function getStoredArray(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn(`Failed to parse localStorage[${key}]:`, err);
    return [];
  }
}

function getStoredString(key) {
  try {
    return localStorage.getItem(key) || null;
  } catch {
    return null;
  }
}

export function DataProvider({ children }) {
  // 1. Initial State: Starts EMPTY unless hydrated from localStorage
  const [trucks, setTrucks] = useState(() => getStoredArray(STORAGE_KEYS.TRUCKS));
  const [shipments, setShipments] = useState(() => getStoredArray(STORAGE_KEYS.SHIPMENTS));
  const [selectedTruckId, setSelectedTruckIdState] = useState(() =>
    getStoredString(STORAGE_KEYS.SELECTED_TRUCK)
  );
  const [selectedShipmentId, setSelectedShipmentIdState] = useState(() =>
    getStoredString(STORAGE_KEYS.SELECTED_SHIPMENT)
  );

  // UI Modal States for adding/editing data
  const [isAddTruckOpen, setIsAddTruckOpen] = useState(false);
  const [isAddShipmentOpen, setIsAddShipmentOpen] = useState(false);
  const [editingTruck, setEditingTruck] = useState(null);
  const [editingShipment, setEditingShipment] = useState(null);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [isDemoPromptOpen, setIsDemoPromptOpen] = useState(false);
  const [toasts, setToasts] = useState([]);

  // Toast Notification Manager
  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // 2. LocalStorage Persistence
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.TRUCKS, JSON.stringify(trucks));
    } catch (e) {
      console.warn('LocalStorage save trucks failed:', e);
    }
  }, [trucks]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SHIPMENTS, JSON.stringify(shipments));
    } catch (e) {
      console.warn('LocalStorage save shipments failed:', e);
    }
  }, [shipments]);

  useEffect(() => {
    try {
      if (selectedTruckId) {
        localStorage.setItem(STORAGE_KEYS.SELECTED_TRUCK, selectedTruckId);
      } else {
        localStorage.removeItem(STORAGE_KEYS.SELECTED_TRUCK);
      }
    } catch {}
  }, [selectedTruckId]);

  useEffect(() => {
    try {
      if (selectedShipmentId) {
        localStorage.setItem(STORAGE_KEYS.SELECTED_SHIPMENT, selectedShipmentId);
      } else {
        localStorage.removeItem(STORAGE_KEYS.SELECTED_SHIPMENT);
      }
    } catch {}
  }, [selectedShipmentId]);

  // Keep selection synchronized with current truck/shipment lists
  useEffect(() => {
    if (trucks.length > 0) {
      if (!selectedTruckId || !trucks.some((t) => t.id === selectedTruckId)) {
        setSelectedTruckIdState(trucks[0].id);
      }
    } else {
      setSelectedTruckIdState(null);
    }
  }, [trucks, selectedTruckId]);

  useEffect(() => {
    if (shipments.length > 0) {
      if (!selectedShipmentId || !shipments.some((s) => s.id === selectedShipmentId)) {
        setSelectedShipmentIdState(shipments[0].id);
      }
    } else {
      setSelectedShipmentIdState(null);
    }
  }, [shipments, selectedShipmentId]);

  const setSelectedTruckId = useCallback((id) => {
    setSelectedTruckIdState(id);
  }, []);

  const setSelectedShipmentId = useCallback((id) => {
    setSelectedShipmentIdState(id);
  }, []);

  // 3. Actions: Add, Update, Delete Trucks
  const addTruck = useCallback((truckInput) => {
    const originCoords = truckInput.originCoords || getCityCoords(truckInput.origin);
    const destinationCoords = truckInput.destinationCoords || getCityCoords(truckInput.destination);

    // Midpoint or origin for current vehicle position
    const currentLat = (originCoords[0] + destinationCoords[0]) / 2;
    const currentLng = (originCoords[1] + destinationCoords[1]) / 2;
    const currentCoords = truckInput.currentCoords || [currentLat, currentLng];

    const totalKm = calculateDistanceKm(originCoords, destinationCoords);
    const capacityTons = Number(truckInput.capacityTons || 10);
    const currentLoadTons = Number(truckInput.currentLoadTons ?? capacityTons);

    const newTruck = {
      id: truckInput.id || `T${Date.now().toString().slice(-4)}`,
      regNumber: truckInput.regNumber || `MH-${Math.floor(10 + Math.random() * 40)}-${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}-${Math.floor(1000 + Math.random() * 9000)}`,
      model: truckInput.model || `${truckInput.vehicleType || '10T Heavy Commercial Vehicle'} (${capacityTons}T)`,
      vehicleType: truckInput.vehicleType || '10T Heavy Commercial Vehicle',
      origin: truckInput.origin || 'Nashik',
      destination: truckInput.destination || 'Mumbai',
      originCoords,
      destinationCoords,
      currentCoords,
      originLat: originCoords[0],
      originLng: originCoords[1],
      destLat: destinationCoords[0],
      destLng: destinationCoords[1],
      currentLat: currentCoords[0],
      currentLng: currentCoords[1],
      currentLocationName: truckInput.currentLocationName || `Transit along ${truckInput.origin} → ${truckInput.destination} Highway`,
      capacityTons,
      maxCapacity: capacityTons * 1000,
      currentLoadTons,
      currentLoad: currentLoadTons * 1000,
      status: truckInput.status || 'In-Transit',
      emptyReturnProbability: Number(truckInput.emptyReturnProbability || 85),
      countdownSeconds: Number(truckInput.countdownSeconds || 2 * 3600 + 15 * 60),
      expectedDeliveryTime: truckInput.expectedDeliveryTime || truckInput.eta || '14:15',
      driverName: truckInput.driverName || 'Driver',
      driverPhone: truckInput.driverPhone || '+91 98000 00000',
      speedKmH: Number(truckInput.speedKmH || 52),
      totalTripKm: totalKm,
      outboundRemainingKm: Math.round(totalKm * 0.45),
      vehicleMileageKmPerL: Number(truckInput.vehicleMileageKmPerL || 4.0),
      fuelPricePerL: Number(truckInput.fuelPricePerL || 95.0),
      emissionFactorKgPerL: Number(truckInput.emissionFactorKgPerL || 2.68),
      createdAt: new Date().toISOString(),
    };

    setTrucks((prev) => [newTruck, ...prev]);
    setSelectedTruckIdState(newTruck.id);
    showToast(`Vehicle ${newTruck.id} added to corridor fleet`, 'success');
    return newTruck;
  }, [showToast]);

  const updateTruck = useCallback((id, patch) => {
    setTrucks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const merged = { ...t, ...patch };
        if (patch.origin) merged.originCoords = getCityCoords(patch.origin);
        if (patch.destination) merged.destinationCoords = getCityCoords(patch.destination);
        if (patch.capacityTons) merged.maxCapacity = Number(patch.capacityTons) * 1000;
        if (patch.currentLoadTons != null) merged.currentLoad = Number(patch.currentLoadTons) * 1000;
        return merged;
      })
    );
    showToast(`Vehicle ${id} specifications updated`, 'info');
  }, [showToast]);

  const deleteTruck = useCallback((id) => {
    setTrucks((prev) => prev.filter((t) => t.id !== id));
    showToast(`Vehicle ${id} removed from fleet`, 'info');
  }, [showToast]);

  // 4. Actions: Add, Update, Delete Shipments
  const addShipment = useCallback((shipmentInput) => {
    const originCoords = shipmentInput.originCoords || getCityCoords(shipmentInput.origin || shipmentInput.pickupCity);
    const destCoords = shipmentInput.destCoords || getCityCoords(shipmentInput.destination || shipmentInput.dropCity);
    const weightTons = Number(shipmentInput.weightTons || shipmentInput.weight || 8);
    const freightOfferInr = Number(shipmentInput.freightOfferInr || shipmentInput.freightRate || shipmentInput.value || 25000);

    const newId = shipmentInput.id || `S${Date.now().toString().slice(-4)}`;

    const newShipment = {
      id: newId,
      name: shipmentInput.name || `${shipmentInput.origin || shipmentInput.pickupCity} Consignment (${shipmentInput.cargoType || 'General Freight'})`,
      origin: shipmentInput.origin || shipmentInput.pickupCity || 'Mumbai',
      destination: shipmentInput.destination || shipmentInput.dropCity || 'Nashik',
      originCoords,
      destCoords,
      pickupLat: originCoords[0],
      pickupLng: originCoords[1],
      dropLat: destCoords[0],
      dropLng: destCoords[1],
      weightTons,
      cargoWeight: weightTons * 1000,
      cargoType: shipmentInput.cargoType || 'Industrial & FMCG Goods',
      pickupWindowStart: shipmentInput.pickupWindowStart || '14:30',
      pickupWindowEnd: shipmentInput.pickupWindowEnd || '16:00',
      predictedTruckEta: shipmentInput.predictedTruckEta || '14:15',
      etaBufferMinutes: Number(shipmentInput.etaBufferMinutes ?? 15),
      detourKm: Number(shipmentInput.detourKm ?? 8),
      freightOfferInr,
      value: freightOfferInr,
      priority: shipmentInput.priority || 'Standard',
      delayRisk: shipmentInput.delayRisk || 'low',
      delayRiskReason: shipmentInput.delayRiskReason || 'Clear highway connectivity along designated freight corridor',
      status: shipmentInput.status || 'Available',
      requiredVehicleType: shipmentInput.requiredVehicleType || 'Any',
      specialRequirements: shipmentInput.specialRequirements || 'None',
      whyWhyNot: {
        recommendedSummary: `Demand Tender ${newId}: Direct corridor alignment with ₹${freightOfferInr.toLocaleString('en-IN')} freight yield.`,
        reasons: [
          { type: 'check', title: 'Corridor Alignment', description: `${shipmentInput.origin || 'Pickup'} to ${shipmentInput.destination || 'Drop'} vector` },
          { type: 'check', title: 'Payload Matching', description: `${weightTons}t freight ready for loading` },
        ],
      },
      createdAt: new Date().toISOString(),
    };

    setShipments((prev) => [newShipment, ...prev]);
    setSelectedShipmentIdState(newShipment.id);
    showToast(`Load ${newShipment.id} posted to demand pool`, 'success');
    return newShipment;
  }, [showToast]);

  const updateShipment = useCallback((id, patch) => {
    setShipments((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const merged = { ...s, ...patch };
        if (patch.origin) merged.originCoords = getCityCoords(patch.origin);
        if (patch.destination) merged.destCoords = getCityCoords(patch.destination);
        if (patch.weightTons) merged.cargoWeight = Number(patch.weightTons) * 1000;
        if (patch.freightOfferInr != null) merged.value = Number(patch.freightOfferInr);
        return merged;
      })
    );
    showToast(`Consignment ${id} updated`, 'info');
  }, [showToast]);

  const deleteShipment = useCallback((id) => {
    setShipments((prev) => prev.filter((s) => s.id !== id));
    showToast(`Consignment ${id} removed`, 'info');
  }, [showToast]);

  // 5. Actions: Load Demo Data & Clear All Data
  const loadDemoData = useCallback((mode = 'replace') => {
    const demoTrucks = JSON.parse(JSON.stringify(DEMO_DATA.trucks));
    const demoShipments = JSON.parse(JSON.stringify(DEMO_DATA.shipments));

    if (mode === 'merge') {
      setTrucks((curr) => {
        const existingIds = new Set(curr.map((t) => t.id));
        const newOnes = demoTrucks.filter((t) => !existingIds.has(t.id));
        return [...curr, ...newOnes];
      });
      setShipments((curr) => {
        const existingIds = new Set(curr.map((s) => s.id));
        const newOnes = demoShipments.filter((s) => !existingIds.has(s.id));
        return [...curr, ...newOnes];
      });
      showToast('Demo data merged with existing records', 'success');
    } else {
      // Replace Mode
      setTrucks(demoTrucks);
      setShipments(demoShipments);
      setSelectedTruckIdState(demoTrucks[0]?.id || 'T101');
      setSelectedShipmentIdState(demoShipments[0]?.id || 'S1');
      showToast('Demo data loaded (T101 + S1-S3 restored)', 'success');
    }
  }, [showToast]);

  const clearAllData = useCallback(() => {
    setTrucks([]);
    setShipments([]);
    setSelectedTruckIdState(null);
    setSelectedShipmentIdState(null);

    try {
      localStorage.removeItem(STORAGE_KEYS.TRUCKS);
      localStorage.removeItem(STORAGE_KEYS.SHIPMENTS);
      localStorage.removeItem(STORAGE_KEYS.SELECTED_TRUCK);
      localStorage.removeItem(STORAGE_KEYS.SELECTED_SHIPMENT);
      localStorage.removeItem('reroute_demo_trucks');
      localStorage.removeItem('reroute_demo_shipments');
      localStorage.removeItem('reroute_demo_assignments');
    } catch {}

    showToast('All fleet and shipment data cleared. Starting fresh.', 'info');
  }, [showToast]);

  // Derived selected objects
  const selectedTruck = useMemo(() => {
    return trucks.find((t) => t.id === selectedTruckId) || trucks[0] || null;
  }, [trucks, selectedTruckId]);

  const selectedShipment = useMemo(() => {
    return shipments.find((s) => s.id === selectedShipmentId) || shipments[0] || null;
  }, [shipments, selectedShipmentId]);

  // Request load demo data helper (checks if data already exists to ask replace vs merge)
  const handleRequestLoadDemo = useCallback(() => {
    if (trucks.length > 0 || shipments.length > 0) {
      setIsDemoPromptOpen(true);
    } else {
      loadDemoData('replace');
    }
  }, [trucks.length, shipments.length, loadDemoData]);

  const value = {
    trucks,
    shipments,
    selectedTruckId,
    setSelectedTruckId,
    selectedTruck,
    selectedShipmentId,
    setSelectedShipmentId,
    selectedShipment,
    addTruck,
    updateTruck,
    deleteTruck,
    addShipment,
    updateShipment,
    deleteShipment,
    loadDemoData,
    clearAllData,
    handleRequestLoadDemo,

    // Modal & Toast Controls
    isAddTruckOpen,
    setIsAddTruckOpen,
    isAddShipmentOpen,
    setIsAddShipmentOpen,
    editingTruck,
    setEditingTruck,
    editingShipment,
    setEditingShipment,
    isClearConfirmOpen,
    setIsClearConfirmOpen,
    isDemoPromptOpen,
    setIsDemoPromptOpen,
    toasts,
    showToast,
    dismissToast,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useDataContext() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useDataContext must be used within a DataProvider');
  }
  return context;
}

export const useData = useDataContext;
export default DataContext;
