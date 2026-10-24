// ReRoute AI 2.0 - Playwright End-to-End Suite
// Covers:
// 1. Guided demo autoplay & navigation controls
// 2. Disruption recovery: cancelling top load promotes next feasible candidate
// 3. Mobile responsiveness: document.documentElement.scrollWidth <= innerWidth
// 4. Zero runtime console errors across critical routes

import { test, expect } from '@playwright/test';

test.describe('ReRoute AI 2.0 - End-to-End Test Suite', () => {
  test('1. executes guided demo and verifies stage navigation', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-testid="env-badge"]')).toBeVisible();

    // Open 2-Min Demo Script modal
    const demoGuideBtn = page.locator('button:has-text("2-Min Demo Script")').or(page.locator('button[title*="2-minute"]'));
    await demoGuideBtn.first().click();

    // Start Guided Demo Autoplay
    const runTourBtn = page.locator('[data-testid="run-guided-demo-btn"]');
    await expect(runTourBtn).toBeVisible();
    await runTourBtn.click();

    // Verify Guided Tour Bar renders with stage info
    const tourBar = page.locator('text=Stage 1 of 7').or(page.locator('text=STAGE 1 OF 7'));
    await expect(tourBar.first()).toBeVisible();

    // Test Tour Stage Controls (Next Stage)
    const nextBtn = page.locator('button[title="Next Stage"]');
    await nextBtn.click();
    await expect(page.locator('text=Stage 2 of 7').or(page.locator('text=STAGE 2 OF 7')).first()).toBeVisible();

    // Test Exit Tour
    const exitBtn = page.locator('button[title="Exit Guided Tour"]').or(page.locator('button[title*="Exit"]'));
    await exitBtn.first().click();
    await expect(tourBar.first()).not.toBeVisible();
  });

  test('2. cancelling top load autonomously recovers and promotes next feasible load', async ({ page }) => {
    await page.goto('/');

    // If initial empty state, load demo data so S1 candidate load is present
    const loadDemoBtn = page.locator('button:has-text("Load Demo Data")').or(page.locator('button:has-text("Demo")'));
    if (await loadDemoBtn.first().isVisible().catch(() => false)) {
      await loadDemoBtn.first().click();
    }

    // Verify initial cockpit state with Before vs After summary
    await expect(page.locator('text=Before vs After')).toBeVisible();

    // Locate Disruption Simulator
    const cancelBtn = page.locator('button:has-text("Cancel"), button:has-text("Cancel S1 Load")').first();
    await expect(cancelBtn).toBeVisible();
    await cancelBtn.click();

    // Verify Autonomous Recovery Banner displays
    const recoveryBanner = page.locator('text=Autonomous Re-routing').or(page.locator('text=Recovery complete'));
    await expect(recoveryBanner.first()).toBeVisible({ timeout: 5000 });

    // Verify next feasible candidate is promoted (status / match score)
    const promotedCandidate = page.locator('text=S2').or(page.locator('text=Recommended'));
    await expect(promotedCandidate.first()).toBeVisible();
  });

  test('3. responsive layouts maintain zero horizontal overflow across devices', async ({ page }) => {
    const viewports = [
      { name: 'Small Phone', width: 360, height: 740 },
      { name: 'iPhone 14/15', width: 390, height: 844 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Desktop', width: 1440, height: 900 },
    ];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/');

      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const innerWidth = await page.evaluate(() => window.innerWidth);

      expect(
        scrollWidth,
        `Horizontal overflow detected on ${vp.name} (${vp.width}px): scrollWidth ${scrollWidth} > innerWidth ${innerWidth}`
      ).toBeLessThanOrEqual(innerWidth);
    }
  });

  test('4. critical navigation routes produce zero runtime console errors', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Ignore expected network mock fallback 404s in local test runner
        if (!text.includes('404') && !text.includes('favicon')) {
          consoleErrors.push(text);
        }
      }
    });

    const routes = ['/', '/fleet', '/loads', '/assignments', '/disruptions', '/settings'];
    for (const r of routes) {
      await page.goto(r);
      await page.waitForLoadState('domcontentloaded');
    }

    expect(consoleErrors, `Encountered unexpected console errors: ${consoleErrors.join(', ')}`).toEqual([]);
  });
});
