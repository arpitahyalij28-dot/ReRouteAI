import { FACTOR_WEIGHTS } from "../data/mockData";

export function calculateShipmentScore(shipment, weights = FACTOR_WEIGHTS) {
  const rf = shipment.rawFactors;
  const routeScore = Number((rf.route * weights.route).toFixed(2));
  const timeScore = Number((rf.time * weights.time).toFixed(2));
  const capScore = Number((rf.capacity * weights.capacity).toFixed(2));
  const detourScore = Number((rf.detour * weights.detour).toFixed(2));
  const costScore = Number((rf.cost * weights.cost).toFixed(2));
  const riskScore = Number((rf.risk * weights.risk).toFixed(2));

  const totalScore = Math.round(routeScore + timeScore + capScore + detourScore + costScore + riskScore);

  return {
    shipmentId: shipment.id,
    totalScore,
    factors: {
      route: {
        rawScore: rf.route,
        weight: weights.route,
        weightedScore: routeScore,
        label: "Route Compatibility",
        weightPctLabel: "25%",
        detail: `${rf.route}/100 alignment with Mumbai-Nashik arterial highway corridor`,
      },
      time: {
        rawScore: rf.time,
        weight: weights.time,
        weightedScore: timeScore,
        label: "Time Compatibility",
        weightPctLabel: "20%",
        detail:
          shipment.etaBufferMinutes >= 0
            ? `Truck arrives ${shipment.etaBufferMinutes}m ahead of dock window (${shipment.pickupWindowStart})`
            : `Window mismatch: Truck arrives ${Math.abs(shipment.etaBufferMinutes)}m after cutoff`,
      },
      capacity: {
        rawScore: rf.capacity,
        weight: weights.capacity,
        weightedScore: capScore,
        label: "Capacity Fit",
        weightPctLabel: "20%",
        detail: `${shipment.weightTons}t cargo fits within 10t max payload rating`,
      },
      detour: {
        rawScore: rf.detour,
        weight: weights.detour,
        weightedScore: detourScore,
        label: "Detour Efficiency",
        weightPctLabel: "15%",
        detail: `${shipment.detourKm} km incremental diversion from nominal return vector`,
      },
      cost: {
        rawScore: rf.cost,
        weight: weights.cost,
        weightedScore: costScore,
        label: "Cost Efficiency",
        weightPctLabel: "10%",
        detail: `Gross yield: ₹${shipment.freightOfferInr.toLocaleString("en-IN")} (spot market premium)`,
      },
      risk: {
        rawScore: rf.risk,
        weight: weights.risk,
        weightedScore: riskScore,
        label: "Low Disruption Risk",
        weightPctLabel: "10%",
        detail: `${shipment.delayRisk.toUpperCase()} risk — ${shipment.delayRiskReason}`,
      },
    },
  };
}

export function rankShipments(shipments, weights = FACTOR_WEIGHTS) {
  const ranked = [...shipments.map((s) => ({
    shipment: s,
    score: calculateShipmentScore(s, weights),
  }))].sort((a, b) => {
    if (a.shipment.isCancelled && !b.shipment.isCancelled) return 1;
    if (!a.shipment.isCancelled && b.shipment.isCancelled) return -1;
    return b.score.totalScore - a.score.totalScore;
  });

  const recommended = ranked.find((item) => !item.shipment.isCancelled);
  const recommendedId = recommended ? recommended.shipment.id : null;

  return { ranked, recommendedId };
}

export function calculateSustainabilityMetrics(shipment, truck) {
  if (!shipment || shipment.isCancelled) {
    return {
      emptyKmAvoided: 0,
      additionalDetourKm: 0,
      fuelSavedLitres: 0,
      costSavedInr: 0,
      co2ReducedKg: 0,
      vehicleUtilizationPct: 0,
    };
  }

  const nominalReturnKm = shipment.id === "S3" ? 120 : truck.totalTripKm;
  const emptyKmAvoided = Math.max(0, nominalReturnKm - shipment.detourKm);
  const additionalDetourKm = shipment.detourKm;
  const fuelSavedLitres = Number((emptyKmAvoided / truck.vehicleMileageKmPerL).toFixed(1));
  const costSavedInr = Math.round(fuelSavedLitres * truck.fuelPricePerL);
  const co2ReducedKg = Number((fuelSavedLitres * truck.emissionFactorKgPerL).toFixed(1));
  const vehicleUtilizationPct = Math.round((shipment.weightTons / truck.capacityTons) * 100);

  return {
    emptyKmAvoided,
    additionalDetourKm,
    fuelSavedLitres,
    costSavedInr,
    co2ReducedKg,
    vehicleUtilizationPct,
  };
}

export function formatCountdown(seconds) {
  if (seconds <= 0) {
    return {
      hours: 0,
      minutes: 0,
      seconds: 0,
      formatted: "00h 00m 00s (Empty Now)",
    };
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n) => n.toString().padStart(2, "0");
  return {
    hours: h,
    minutes: m,
    seconds: s,
    formatted: `${pad(h)}h ${pad(m)}m ${pad(s)}s`,
  };
}
