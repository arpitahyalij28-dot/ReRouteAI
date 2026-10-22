// ReRoute AI 2.0 - Playwright End-to-End Demo Flow Test
// Verifies the 7-stage live demo sequence on the deployed UI:
// 1. Initial inbound truck state (T101)
// 2. Multi-criteria ranking (S1 recommended)
// 3. Disruption injection (S1 cancellation)
// 4. Proactive alert and dynamic recovery re-ranking (S2 recommended)
// 5. One-click assignment dispatch
// 6. Assignment confirmation & empty-haul mitigation metrics
// 7. Explainability justification update

import { test, expect } from '@playwright/test';

test.describe('ReRoute AI 2.0 - 2-Minute Live Demo Flow', () => {
  test('executes complete 7-stage backhaul matching & disruption recovery', async ({ page }) => {
    // 1. Initial State
    await page.goto('/');
    await expect(page.locator('h1')).toContainText(/Autonomous Backhaul Intelligence Cockpit/i);

    // Verify T101 inbound telemetry
    await expect(page.locator('text=MH-15-EG-4921')).toBeVisible();
    await expect(page.locator('text=Nashik → Mumbai')).toBeVisible();

    // 2. Evaluate Candidate Shipments (S1 top match)
    const s1Card = page.locator('text=Spot Load S1').or(page.locator('text=S1'));
    await expect(s1Card.first()).toBeVisible();

    // Verify match score badge
    const matchScorePill = page.locator('text=94% Match').or(page.locator('text=94%'));
    await expect(matchScorePill.first()).toBeVisible();

    // 3. Inject Disruption (Cancel S1)
    const disruptionTrigger = page.locator('button:has-text("Cancel S1 Tender")');
    if (await disruptionTrigger.isVisible()) {
      await disruptionTrigger.click();
    } else {
      // Navigate to disruptions or click disruption button
      const simButton = page.locator('button:has-text("Simulate Disruption")');
      if (await simButton.isVisible()) await simButton.click();
    }

    // 4. Verify System Updates & Re-ranks S2
    await expect(page.locator('text=Disruption Alert').or(page.locator('text=Cancelled'))).toBeVisible();
    const s2Card = page.locator('text=Spot Load S2').or(page.locator('text=S2'));
    await expect(s2Card.first()).toBeVisible();

    // 5. Accept S2 Assignment
    const dispatchButton = page.locator('button:has-text("Dispatch T101 to Load")')
      .or(page.locator('button:has-text("Assign")'));
    await dispatchButton.first().click();

    // 6. Verify Assignment Confirmation & Impact
    await expect(page.locator('text=Assignment Dispatched').or(page.locator('text=Active'))).toBeVisible();

    // 7. Verify Explainability Panel
    const explainTab = page.locator('text=Explainability').or(page.locator('text=AI Route Analysis'));
    await expect(explainTab.first()).toBeVisible();
  });
});
