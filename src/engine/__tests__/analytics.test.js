import { describe, it, expect } from 'vitest';
import { runMonteCarloStressTest, runSPOFAnalysis, findBackupRoutes } from '../analytics.js';
import { getDemoNetwork } from '../../data/networkDemo.js';

describe('Resilience Analytics & Bonus Engine (Track 3-05)', () => {
  const network = getDemoNetwork();

  it('runs deterministic 50-scenario Monte Carlo stress test with seeded RNG', () => {
    const stress = runMonteCarloStressTest(network, 50, 42);

    expect(stress.totalRuns).toBe(50);
    expect(stress.complianceRate80).toBeGreaterThanOrEqual(0);
    expect(stress.complianceRate80).toBeLessThanOrEqual(100);
    expect(stress.avgResilienceScore).toBeGreaterThanOrEqual(0);
    expect(stress.avgResilienceScore).toBeLessThanOrEqual(100);
    expect(stress.distribution).toBeDefined();
    expect(stress.worstScenario).toBeDefined();
    expect(stress.bestScenario).toBeDefined();
    expect(stress.scenarios.length).toBeGreaterThan(0);
  });

  it('ranks Single Points of Failure (SPOF) for routes and warehouses', () => {
    const spof = runSPOFAnalysis(network);

    expect(spof.rankedRoutes).toBeDefined();
    expect(spof.rankedRoutes.length).toBeGreaterThan(0);
    expect(spof.rankedWarehouses).toBeDefined();
    expect(spof.rankedWarehouses.length).toBe(network.warehouses.length);

    // Verify sorted descending by impactScore
    for (let i = 0; i < spof.rankedRoutes.length - 1; i++) {
      expect(spof.rankedRoutes[i].impactScore).toBeGreaterThanOrEqual(spof.rankedRoutes[i + 1].impactScore);
    }
  });

  it('discovers Plan B Backup Routes for critical regional buyers', () => {
    const backups = findBackupRoutes(network);

    expect(backups.length).toBe(network.buyers.length);

    // Critical buyers like Thane Hospital must have viable backup routes
    const thaneHospital = backups.find((b) => b.buyerId === 'buy-thane-med');
    expect(thaneHospital).toBeDefined();
    expect(thaneHospital.hasBackup).toBe(true);
    expect(thaneHospital.primaryRoute).toBeDefined();
    expect(thaneHospital.backupRoute).toBeDefined();
  });
});
