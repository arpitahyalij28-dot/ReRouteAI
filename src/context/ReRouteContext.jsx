// ReRoute AI 2.0 - Application Data Context & Realtime Provider
// Provides unified access to trucks, shipments, assignments, model settings and realtime sync.
// Connects with DataContext for local persistence, dynamic user input, and on-demand demo loading.

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { createRepository } from '../data/repository.js';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient.js';
import { DEFAULT_SETTINGS } from '../data/mockData.js';
import { getCorridorWeather, SIMULATED_HEAVY_RAIN } from '../lib/weather.js';
import AuthContext from './AuthContext';
import DataContext from './DataContext';

const ReRouteContext = createContext(null);

export function addMinutesToTimeString(timeStr, minutesToAdd) {
  if (!timeStr || typeof timeStr !== 'string' || !timeStr.includes(':')) return '12:00';
  const [h, m] = timeStr.split(':').map(Number);
  const total = (h * 60 + m + minutesToAdd + 1440) % 1440;
  const newH = String(Math.floor(total / 60)).padStart(2, '0');
  const newM = String(total % 60).padStart(2, '0');
  return `${newH}:${newM}`;
}

export function timeStringToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string' || !timeStr.includes(':')) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function useAuthSafe() {
  const context = useContext(AuthContext);
  return context || { user: null, profile: null, role: 'dispatcher', isDemoUser: true };
}

export function ReRouteProvider({ children, initialForceLocal = false }) {
  const auth = useAuthSafe();
  const dataCtx = useContext(DataContext);
  const userId = auth.user?.id || null;
  const orgId = auth.profile?.org_id || auth.profile?.orgId || null;

  // Re-create repository when auth state changes
  const repository = useMemo(() => {
    return createRepository({
      user: auth.user,
      profile: auth.profile,
      forceLocal: initialForceLocal,
    });
  }, [userId, orgId, initialForceLocal, auth.user, auth.profile]);

  const repoRef = useRef(repository);
  useEffect(() => {
    repoRef.current = repository;
  }, [repository]);

  const [isDemoMode, setIsDemoMode] = useState(repository.name === 'LocalDemoAdapter');
  useEffect(() => {
    setIsDemoMode(repository.name === 'LocalDemoAdapter');
  }, [repository]);

  // Fallback states if DataContext is not present in tree
  const [fallbackTrucks, setFallbackTrucks] = useState([]);
  const [fallbackShipments, setFallbackShipments] = useState([]);
  const [fallbackSelectedTruckId, setFallbackSelectedTruckId] = useState(null);
  const [fallbackSelectedShipmentId, setFallbackSelectedShipmentId] = useState(null);

  // Active trucks and shipments (prefer DataContext)
  const trucks = dataCtx ? dataCtx.trucks : fallbackTrucks;
  const shipments = dataCtx ? dataCtx.shipments : fallbackShipments;
  const selectedTruckId = dataCtx ? dataCtx.selectedTruckId : fallbackSelectedTruckId;
  const selectedShipmentId = dataCtx ? dataCtx.selectedShipmentId : fallbackSelectedShipmentId;

  const setSelectedTruckId = dataCtx ? dataCtx.setSelectedTruckId : setFallbackSelectedTruckId;
  const setSelectedShipmentId = dataCtx ? dataCtx.setSelectedShipmentId : setFallbackSelectedShipmentId;

  const selectedTruck = dataCtx
    ? dataCtx.selectedTruck
    : trucks.find((t) => t.id === selectedTruckId) || trucks[0] || null;

  const selectedShipment = dataCtx
    ? dataCtx.selectedShipment
    : shipments.find((s) => s.id === selectedShipmentId) || shipments[0] || null;

  const [assignments, setAssignments] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [disruptions, setDisruptions] = useState([]);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchCount, setFetchCount] = useState(0);
  const fetchCountRef = useRef(0);
  const [error, setError] = useState(null);

  // Fallback toast state
  const [internalToasts, setInternalToasts] = useState([]);
  const toasts = dataCtx ? dataCtx.toasts : internalToasts;

  const showToast = useCallback(
    (message, type = 'info') => {
      if (dataCtx?.showToast) {
        dataCtx.showToast(message, type);
      } else {
        const id = Date.now() + Math.random();
        setInternalToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => {
          setInternalToasts((prev) => prev.filter((t) => t.id !== id));
        }, 4500);
      }
    },
    [dataCtx]
  );

  const dismissToast = useCallback(
    (id) => {
      if (dataCtx?.dismissToast) {
        dataCtx.dismissToast(id);
      } else {
        setInternalToasts((prev) => prev.filter((t) => t.id !== id));
      }
    },
    [dataCtx]
  );

  const [isJudgeMode, setIsJudgeModeState] = useState(() => {
    try {
      return localStorage.getItem('reroute_judge_mode') === 'true';
    } catch {
      return false;
    }
  });

  const setIsJudgeMode = useCallback((val) => {
    setIsJudgeModeState(val);
    try {
      localStorage.setItem('reroute_judge_mode', String(val));
    } catch {}
  }, []);

  // Weather Intelligence State & Heavy Rain Simulation
  const [simulateHeavyRain, setSimulateHeavyRainState] = useState(() => {
    try {
      return localStorage.getItem('reroute_simulate_heavy_rain') === 'true';
    } catch {
      return false;
    }
  });

  const [corridorWeather, setCorridorWeather] = useState(null);

  const setSimulateHeavyRain = useCallback((val) => {
    setSimulateHeavyRainState(val);
    try {
      localStorage.setItem('reroute_simulate_heavy_rain', String(val));
    } catch {}
  }, []);

  const toggleSimulateHeavyRain = useCallback(() => {
    setSimulateHeavyRainState((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('reroute_simulate_heavy_rain', String(next));
      } catch {}
      return next;
    });
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function loadWeather() {
      try {
        const w = await getCorridorWeather(selectedTruck, { simulateHeavyRain });
        if (isMounted) {
          setCorridorWeather(w);
        }
      } catch {
        if (isMounted) {
          setCorridorWeather(null);
        }
      }
    }
    loadWeather();
    return () => {
      isMounted = false;
    };
  }, [selectedTruck?.id, selectedTruck?.currentLat, selectedTruck?.currentLng, simulateHeavyRain]);

  const effectiveSettings = useMemo(() => {
    return {
      ...settings,
      weather: corridorWeather,
      weatherEnabled: settings.weatherEnabled !== false,
      weatherPenalties: settings.weatherPenalties || { low: 0, medium: 15, high: 35 },
    };
  }, [settings, corridorWeather]);

  // Fetch settings & assignments
  const loadData = useCallback(async (isBackground = false) => {
    if (isBackground) {
      setRefreshing(true);
    }
    setError(null);
    try {
      fetchCountRef.current += 1;
      setFetchCount(fetchCountRef.current);

      const [aList, sSettings, dList] = await Promise.all([
        repository.getAssignments(),
        repository.getModelSettings(),
        repository.getDisruptionEvents(),
      ]);

      setAssignments(aList || []);
      if (sSettings) setSettings(sSettings);
      if (dList) setDisruptions(dList);

      // In Supabase cloud mode, sync trucks & shipments from Postgres
      if (repository.name === 'SupabaseAdapter') {
        const [cloudTrucks, cloudShipments] = await Promise.all([
          repository.getTrucks(),
          repository.getShipments(),
        ]);
        if (dataCtx?.setTrucks) {
          dataCtx.setTrucks(cloudTrucks);
          dataCtx.setShipments(cloudShipments);
        } else {
          setFallbackTrucks(cloudTrucks);
          setFallbackShipments(cloudShipments);
        }
      }
    } catch (err) {
      console.error('Failed to load ReRoute data:', err);
      setError(err.message || 'Error loading logistics data');
    } finally {
      if (isBackground) {
        setRefreshing(false);
      }
    }
  }, [repository, dataCtx]);

  useEffect(() => {
    loadData(false);
  }, [loadData]);

  // Setup Supabase Realtime Subscriptions (only in cloud mode)
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || isDemoMode || repository.name !== 'SupabaseAdapter') {
      return;
    }

    const channel = supabase
      .channel(`reroute-realtime-${repository.orgId || 'demo'}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shipments' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            loadData(true);
            showToast(`New Load Posted: ${payload.new.name || payload.new.id}`, 'info');
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'assignments' },
        (payload) => {
          loadData(true);
          if (payload.eventType === 'INSERT') {
            showToast(`Assignment Dispatched: Truck ${payload.new.truck_id}`, 'success');
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'disruption_events' },
        (payload) => {
          if (payload.new) {
            setDisruptions((prev) => [payload.new, ...prev]);
            showToast(`Disruption Alert: ${payload.new.type}`, 'alert');
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [repository, isDemoMode, loadData, showToast]);

  // Assignment Creation
  const assignShipment = async (truckId, shipmentId, evaluationData = {}) => {
    const tempAssignment = {
      id: `A-${Date.now()}`,
      truckId,
      shipmentId,
      assignedAt: new Date().toISOString(),
      matchScore: evaluationData.matchScore || 0,
      detourKm: evaluationData.detourKm || 0,
      loadedKm: evaluationData.loadedKm || 0,
      etaArrival: evaluationData.eta?.arrivalFormatted || '',
      sustainability: evaluationData.sustainability || null,
      costGain: evaluationData.sustainability?.costSavedInr || 0,
      status: 'Active',
    };

    setAssignments((prev) => [tempAssignment, ...prev]);
    if (dataCtx?.updateShipment) {
      dataCtx.updateShipment(shipmentId, { status: 'Assigned' });
    } else {
      setFallbackShipments((prev) =>
        prev.map((s) => (s.id === shipmentId ? { ...s, status: 'Assigned' } : s))
      );
    }

    try {
      const created = await repoRef.current.createAssignment(tempAssignment);
      setAssignments((prev) =>
        prev.map((a) => (a.id === tempAssignment.id ? created : a))
      );
      return created;
    } catch {
      return tempAssignment;
    }
  };

  // Assignment Deletion
  const unassignShipment = async (assignmentId) => {
    const target = assignments.find((a) => a.id === assignmentId);
    setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
    if (target?.shipmentId) {
      if (dataCtx?.updateShipment) {
        dataCtx.updateShipment(target.shipmentId, { status: 'Available' });
      } else {
        setFallbackShipments((prev) =>
          prev.map((s) => (s.id === target.shipmentId ? { ...s, status: 'Available' } : s))
        );
      }
    }

    try {
      await repoRef.current.deleteAssignment(assignmentId);
    } catch {}
  };

  // Disruption Actions
  const cancelShipment = async (shipmentId, reason = 'Cancelled by shipper tender revocation.') => {
    const currentList = dataCtx ? dataCtx.shipments : fallbackShipments;
    const target = currentList.find((s) => s.id === shipmentId);

    const patch = {
      status: 'Cancelled',
      isCancelled: true,
      whyWhyNot: {
        recommendedSummary: `Cancelled: ${reason}`,
        reasons: [
          {
            type: 'cross',
            title: 'Tender Cancelled by Shipper',
            description: reason,
          },
          ...(target?.whyWhyNot?.reasons || []),
        ],
      },
    };

    if (dataCtx?.updateShipment) {
      dataCtx.updateShipment(shipmentId, patch);
    } else {
      setFallbackShipments((prev) =>
        prev.map((s) => (s.id === shipmentId ? { ...s, ...patch } : s))
      );
    }

    try {
      await repoRef.current.updateShipmentStatus(shipmentId, 'Cancelled', patch);
      await repoRef.current.createDisruptionEvent({
        type: 'CANCELLATION',
        shipmentId,
        payload: { reason },
      });
    } catch {}
  };

  const delayShipment = async (shipmentId, delayMins = 60, reason = 'Corridor highway bottleneck delay') => {
    const currentList = dataCtx ? dataCtx.shipments : fallbackShipments;
    const target = currentList.find((s) => s.id === shipmentId);
    if (!target) return;

    const currentEta = target.predictedTruckEta || '14:15';
    const newEta = addMinutesToTimeString(currentEta, delayMins);
    const windowEndMins = timeStringToMinutes(target.pickupWindowEnd || '16:00');
    const newEtaMins = timeStringToMinutes(newEta);
    const newBuffer = windowEndMins - newEtaMins;
    const delayRisk = newBuffer < 0 ? 'high' : newBuffer < 30 ? 'medium' : 'low';

    const patch = {
      isDelayed: true,
      predictedTruckEta: newEta,
      etaBufferMinutes: newBuffer,
      delayRisk,
      delayRiskReason: reason,
    };

    if (dataCtx?.updateShipment) {
      dataCtx.updateShipment(shipmentId, patch);
    } else {
      setFallbackShipments((prev) =>
        prev.map((s) => (s.id === shipmentId ? { ...s, ...patch } : s))
      );
    }

    try {
      await repoRef.current.updateShipmentStatus(shipmentId, 'Available', patch);
      await repoRef.current.createDisruptionEvent({
        type: 'DELAY',
        shipmentId,
        payload: { delayMinutes: delayMins, reason },
      });
    } catch {}
  };

  const shiftShipmentWindow = async (shipmentId, shiftOrNewStart = 60, optionalEnd = null) => {
    const currentList = dataCtx ? dataCtx.shipments : fallbackShipments;
    const target = currentList.find((s) => s.id === shipmentId);
    if (!target) return;

    let newStart, newEnd;
    if (typeof shiftOrNewStart === 'number') {
      newStart = addMinutesToTimeString(target.pickupWindowStart || '14:00', shiftOrNewStart);
      newEnd = addMinutesToTimeString(target.pickupWindowEnd || '16:00', shiftOrNewStart);
    } else {
      newStart = shiftOrNewStart;
      newEnd = optionalEnd || addMinutesToTimeString(newStart, 90);
    }

    const etaMins = timeStringToMinutes(target.predictedTruckEta || '14:15');
    const newBuffer = timeStringToMinutes(newEnd) - etaMins;

    const patch = {
      pickupWindowStart: newStart,
      pickupWindowEnd: newEnd,
      etaBufferMinutes: newBuffer,
    };

    if (dataCtx?.updateShipment) {
      dataCtx.updateShipment(shipmentId, patch);
    } else {
      setFallbackShipments((prev) =>
        prev.map((s) => (s.id === shipmentId ? { ...s, ...patch } : s))
      );
    }

    try {
      await repoRef.current.updateShipmentStatus(shipmentId, 'Available', patch);
      await repoRef.current.createDisruptionEvent({
        type: 'WINDOW_SHIFT',
        shipmentId,
        payload: { newStart, newEnd },
      });
    } catch {}
  };

  const updateAssignmentStatus = async (assignmentId, status) => {
    setAssignments((prev) =>
      prev.map((a) => (a.id === assignmentId ? { ...a, status } : a))
    );

    try {
      await repoRef.current.updateAssignmentStatus(assignmentId, status);
      showToast(`Assignment status updated to: ${status}`, 'success');
    } catch (err) {
      showToast(`Failed to update assignment: ${err.message}`, 'alert');
    }
  };

  const updateSettings = async (newSettings) => {
    const merged = { ...settings, ...newSettings };
    setSettings(merged);
    try {
      await repoRef.current.saveModelSettings(merged);
    } catch (err) {
      console.warn('Failed to persist settings:', err);
    }
  };

  const resetDemo = async () => {
    setSimulateHeavyRain(false);
    if (dataCtx?.loadDemoData) {
      dataCtx.loadDemoData('replace');
    } else {
      await repoRef.current.resetToDemo();
      await loadData(false);
    }
  };

  const value = {
    repository,
    adapterName: repository.name,
    isDemoMode,
    isJudgeMode,
    setIsJudgeMode,
    loading,
    refreshing,
    fetchCount,
    error,
    toasts,
    showToast,
    dismissToast,
    trucks,
    shipments,
    assignments,
    settings: effectiveSettings,
    rawSettings: settings,
    corridorWeather,
    simulateHeavyRain,
    setSimulateHeavyRain,
    toggleSimulateHeavyRain,
    disruptions,
    selectedTruckId,
    setSelectedTruckId,
    selectedTruck,
    selectedShipmentId,
    setSelectedShipmentId,
    selectedShipment,
    assignShipment,
    unassignShipment,
    updateAssignmentStatus,
    cancelShipment,
    delayShipment,
    shiftShipmentWindow,
    updateSettings,
    resetDemo,
    refreshData: loadData,


    // Logistics Twin Regional Supply Network state (Track 3-05)
    network: dataCtx?.network,
    setNetwork: dataCtx?.setNetwork,
    isDemoData: dataCtx?.isDemoData,
    setIsDemoData: dataCtx?.setIsDemoData,
    addSupplier: dataCtx?.addSupplier,
    updateSupplier: dataCtx?.updateSupplier,
    deleteSupplier: dataCtx?.deleteSupplier,
    addWarehouse: dataCtx?.addWarehouse,
    updateWarehouse: dataCtx?.updateWarehouse,
    deleteWarehouse: dataCtx?.deleteWarehouse,
    addBuyer: dataCtx?.addBuyer,
    updateBuyer: dataCtx?.updateBuyer,
    deleteBuyer: dataCtx?.deleteBuyer,
    addRoute: dataCtx?.addRoute,
    updateRoute: dataCtx?.updateRoute,
    deleteRoute: dataCtx?.deleteRoute,
    addVehicle: dataCtx?.addVehicle,
    updateVehicle: dataCtx?.updateVehicle,
    deleteVehicle: dataCtx?.deleteVehicle,
    updateScenarioSettings: dataCtx?.updateScenarioSettings,

    // Disruption Simulator (Track 3-05)
    disruptionsConfig: dataCtx?.disruptionsConfig,
    setDisruptionsConfig: dataCtx?.setDisruptionsConfig,
    scenarioResult: dataCtx?.scenarioResult,
    isScenarioSimulated: dataCtx?.isScenarioSimulated,
    applyDisruptions: dataCtx?.applyDisruptions,
    clearDisruptions: dataCtx?.clearDisruptions,

    // Data layer CRUD from DataContext
    addTruck: dataCtx?.addTruck,
    updateTruck: dataCtx?.updateTruck,
    deleteTruck: dataCtx?.deleteTruck,
    addShipment: dataCtx?.addShipment,
    updateShipment: dataCtx?.updateShipment,
    deleteShipment: dataCtx?.deleteShipment,
    loadDemoData: dataCtx?.loadDemoData,
    clearAllData: dataCtx?.clearAllData,
    handleRequestLoadDemo: dataCtx?.handleRequestLoadDemo,

    // Modal & Dialog state
    isAddTruckOpen: dataCtx?.isAddTruckOpen,
    setIsAddTruckOpen: dataCtx?.setIsAddTruckOpen,
    isAddShipmentOpen: dataCtx?.isAddShipmentOpen,
    setIsAddShipmentOpen: dataCtx?.setIsAddShipmentOpen,
    editingTruck: dataCtx?.editingTruck,
    setEditingTruck: dataCtx?.setEditingTruck,
    editingShipment: dataCtx?.editingShipment,
    setEditingShipment: dataCtx?.setEditingShipment,
    isClearConfirmOpen: dataCtx?.isClearConfirmOpen,
    setIsClearConfirmOpen: dataCtx?.setIsClearConfirmOpen,
    isDemoPromptOpen: dataCtx?.isDemoPromptOpen,
    setIsDemoPromptOpen: dataCtx?.setIsDemoPromptOpen,
  };

  return (
    <ReRouteContext.Provider value={value}>
      {children}
    </ReRouteContext.Provider>
  );
}

export function useReRoute() {
  const context = useContext(ReRouteContext);
  if (!context) {
    throw new Error('useReRoute must be used within a ReRouteProvider');
  }
  return context;
}

export default ReRouteContext;
