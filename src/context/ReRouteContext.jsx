// ReRoute AI 2.0 - Application Data Context & Realtime Provider
// Provides unified access to trucks, shipments, assignments, model settings and realtime sync.
// Handles optimistic updates with automatic rollback on error.

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { createRepository } from '../data/repository.js';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient.js';
import { DEFAULT_SETTINGS } from '../data/mockData.js';

const ReRouteContext = createContext(null);

export function ReRouteProvider({ children, initialForceLocal = false }) {
  const repositoryRef = useRef(createRepository({ forceLocal: initialForceLocal }));
  const [repository, setRepository] = useState(repositoryRef.current);
  const [isDemoMode, setIsDemoMode] = useState(repository.name === 'LocalDemoAdapter');

  const [trucks, setTrucks] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [disruptions, setDisruptions] = useState([]);

  const [selectedTruckId, setSelectedTruckId] = useState('T101');
  const [selectedShipmentId, setSelectedShipmentId] = useState('S1');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toasts, setToasts] = useState([]);

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

  // Fetch all core datasets
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const repo = repositoryRef.current;
      const [tList, sList, aList, sSettings, dList] = await Promise.all([
        repo.getTrucks(),
        repo.getShipments(),
        repo.getAssignments(),
        repo.getModelSettings(),
        repo.getDisruptionEvents(),
      ]);

      setTrucks(tList);
      setShipments(sList);
      setAssignments(aList);
      setSettings(sSettings);
      setDisruptions(dList);

      if (tList.length > 0 && !tList.some((t) => t.id === selectedTruckId)) {
        setSelectedTruckId(tList[0].id);
      }
      if (sList.length > 0 && !sList.some((s) => s.id === selectedShipmentId)) {
        setSelectedShipmentId(sList[0].id);
      }
    } catch (err) {
      console.error('Failed to load ReRoute data:', err);
      setError(err.message || 'Error loading logistics data');
    } finally {
      setLoading(false);
    }
  }, [selectedTruckId, selectedShipmentId]);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Setup Supabase Realtime Subscriptions (if active)
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || isDemoMode) {
      return;
    }

    const channel = supabase
      .channel('reroute-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shipments' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            loadData();
            showToast(`New Load Posted: ${payload.new.name || payload.new.id}`, 'info');
          } else if (payload.eventType === 'UPDATE') {
            setShipments((prev) =>
              prev.map((s) => (s.id === payload.new.id ? { ...s, ...payload.new } : s))
            );
          } else if (payload.eventType === 'DELETE') {
            setShipments((prev) => prev.filter((s) => s.id !== payload.old.id));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'assignments' },
        (payload) => {
          loadData();
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
  }, [isDemoMode, loadData, showToast]);

  // Optimistic Assignment Creation with Rollback
  const assignShipment = async (truckId, shipmentId, evaluationData = {}) => {
    const previousAssignments = [...assignments];
    const previousShipments = [...shipments];

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

    // Optimistic state
    setAssignments((prev) => [tempAssignment, ...prev]);
    setShipments((prev) =>
      prev.map((s) => (s.id === shipmentId ? { ...s, status: 'Assigned' } : s))
    );

    try {
      const created = await repositoryRef.current.createAssignment(tempAssignment);
      setAssignments((prev) =>
        prev.map((a) => (a.id === tempAssignment.id ? created : a))
      );
      return created;
    } catch (err) {
      // Rollback on failure
      setAssignments(previousAssignments);
      setShipments(previousShipments);
      setError(`Assignment failed: ${err.message}`);
      throw err;
    }
  };

  // Optimistic Assignment Deletion with Rollback
  const unassignShipment = async (assignmentId) => {
    const previousAssignments = [...assignments];
    const previousShipments = [...shipments];

    const target = assignments.find((a) => a.id === assignmentId);
    setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
    if (target?.shipmentId) {
      setShipments((prev) =>
        prev.map((s) => (s.id === target.shipmentId ? { ...s, status: 'Available' } : s))
      );
    }

    try {
      await repositoryRef.current.deleteAssignment(assignmentId);
    } catch (err) {
      setAssignments(previousAssignments);
      setShipments(previousShipments);
      setError(`Unassign failed: ${err.message}`);
      throw err;
    }
  };

  // Optimistic Disruption Actions
  const cancelShipment = async (shipmentId, reason = 'Cancelled by shipper tender revocation.') => {
    const previousShipments = [...shipments];

    setShipments((prev) =>
      prev.map((s) => {
        if (s.id !== shipmentId) return s;
        return {
          ...s,
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
              ...(s.whyWhyNot?.reasons || []),
            ],
          },
        };
      })
    );

    try {
      await repositoryRef.current.updateShipmentStatus(shipmentId, 'Cancelled', {
        whyWhyNot: {
          recommendedSummary: `Cancelled: ${reason}`,
          reasons: [
            {
              type: 'cross',
              title: 'Tender Cancelled by Shipper',
              description: reason,
            },
          ],
        },
      });

      await repositoryRef.current.createDisruptionEvent({
        type: 'CANCELLATION',
        shipmentId,
        payload: { reason },
      });
    } catch (err) {
      setShipments(previousShipments);
      setError(`Cancel failed: ${err.message}`);
      throw err;
    }
  };

  const delayShipment = async (shipmentId, delayMins = 60, reason = 'Corridor highway bottleneck delay') => {
    const previousShipments = [...shipments];

    setShipments((prev) =>
      prev.map((s) => {
        if (s.id !== shipmentId) return s;
        return {
          ...s,
          isDelayed: true,
          predictedTruckEta: '15:15',
          etaBufferMinutes: (s.etaBufferMinutes || 15) - delayMins,
          delayRisk: 'high',
          delayRiskReason: reason,
        };
      })
    );

    try {
      await repositoryRef.current.updateShipmentStatus(shipmentId, 'Available', {
        predictedTruckEta: '15:15',
        etaBufferMinutes: -45,
      });

      await repositoryRef.current.createDisruptionEvent({
        type: 'DELAY',
        shipmentId,
        payload: { delayMinutes: delayMins, reason },
      });
    } catch (err) {
      setShipments(previousShipments);
      setError(`Delay update failed: ${err.message}`);
      throw err;
    }
  };

  const shiftShipmentWindow = async (shipmentId, newStart = '15:30', newEnd = '17:00') => {
    const previousShipments = [...shipments];

    setShipments((prev) =>
      prev.map((s) => {
        if (s.id !== shipmentId) return s;
        return {
          ...s,
          pickupWindowStart: newStart,
          pickupWindowEnd: newEnd,
          etaBufferMinutes: 75,
        };
      })
    );

    try {
      await repositoryRef.current.updateShipmentStatus(shipmentId, 'Available', {
        pickupWindowStart: newStart,
        pickupWindowEnd: newEnd,
        etaBufferMinutes: 75,
      });

      await repositoryRef.current.createDisruptionEvent({
        type: 'WINDOW_SHIFT',
        shipmentId,
        payload: { newStart, newEnd },
      });
    } catch (err) {
      setShipments(previousShipments);
      setError(`Window shift failed: ${err.message}`);
      throw err;
    }
  };

  const recordTelemetry = async (point) => {
    // Optimistic update of truck location
    setTrucks((prev) =>
      prev.map((t) => {
        if (t.id !== point.truckId) return t;
        return {
          ...t,
          currentCoords: [point.lat, point.lng],
          currentLat: point.lat,
          currentLng: point.lng,
          speedKmH: point.speed ?? t.speedKmH,
          currentLocationName: point.locationName || t.currentLocationName,
        };
      })
    );

    try {
      await repositoryRef.current.recordTelemetry(point);
    } catch (err) {
      console.warn('Failed to record telemetry:', err);
    }
  };

  const updateAssignmentStatus = async (assignmentId, status) => {
    setAssignments((prev) =>
      prev.map((a) => (a.id === assignmentId ? { ...a, status } : a))
    );

    try {
      await repositoryRef.current.updateAssignmentStatus(assignmentId, status);
      showToast(`Assignment status updated to: ${status}`, 'success');
    } catch (err) {
      console.warn('Failed to update assignment status:', err);
      showToast(`Failed to update assignment: ${err.message}`, 'alert');
    }
  };

  const updateSettings = async (newSettings) => {
    const merged = { ...settings, ...newSettings };
    setSettings(merged);
    try {
      await repositoryRef.current.saveModelSettings(merged);
    } catch (err) {
      console.warn('Failed to persist settings:', err);
    }
  };

  const resetDemo = async () => {
    await repositoryRef.current.resetToDemo();
    await loadData();
    setSelectedShipmentId('S1');
    setSelectedTruckId('T101');
  };

  const selectedTruck = trucks.find((t) => t.id === selectedTruckId) || trucks[0] || null;
  const selectedShipment = shipments.find((s) => s.id === selectedShipmentId) || shipments[0] || null;

  const value = {
    repository: repositoryRef.current,
    adapterName: repositoryRef.current.name,
    isDemoMode,
    loading,
    error,
    toasts,
    showToast,
    dismissToast,
    trucks,
    shipments,
    assignments,
    settings,
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
    recordTelemetry,
    cancelShipment,
    delayShipment,
    shiftShipmentWindow,
    updateSettings,
    resetDemo,
    refreshData: loadData,
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
