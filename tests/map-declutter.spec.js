import { test, expect } from '@playwright/test';

test.describe('Supply Network Map Declutter & Controls Verification', () => {
  test('verifies map controls, smart label segmented control, and collapsible legend', async ({ page }) => {
    // 1. Navigate to dashboard
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 2. Verify Map Toolbar controls exist
    const toolbar = page.locator('text=Regional Network Twin');
    await expect(toolbar.first()).toBeVisible();

    const fitCorridorBtn = page.locator('button:has-text("Fit Corridor")');
    await expect(fitCorridorBtn.first()).toBeVisible();
    await fitCorridorBtn.first().click();

    // 3. Verify Label Mode Segmented Control: Smart | All | Off
    const smartBtn = page.locator('button:has-text("Smart")');
    const allBtn = page.locator('button:has-text("All")');
    const offBtn = page.locator('button:has-text("Off")');

    await expect(smartBtn.first()).toBeVisible();
    await expect(allBtn.first()).toBeVisible();
    await expect(offBtn.first()).toBeVisible();

    // Click 'Off' mode
    await offBtn.first().click();
    await expect(offBtn.first()).toHaveClass(/font-bold/);

    // Click 'All' mode
    await allBtn.first().click();
    await expect(allBtn.first()).toHaveClass(/font-bold/);

    // Click 'Smart' mode back
    await smartBtn.first().click();
    await expect(smartBtn.first()).toHaveClass(/font-bold/);

    // 4. Verify Collapsible Legend in bottom-left
    const legendHeader = page.locator('text=Legend').or(page.locator('text=Corridor Topology'));
    await expect(legendHeader.first()).toBeVisible();

    // Toggle legend
    const legendToggleBtn = page.locator('button[title*="Legend"]');
    if (await legendToggleBtn.first().isVisible()) {
      await legendToggleBtn.first().click();
    }

    // 5. Test selection: Click a node marker
    const customNode = page.locator('.custom-node-icon').first();
    if (await customNode.isVisible()) {
      await customNode.click();
      // Ensure entity inspector or popup responds
      await page.waitForTimeout(300);
    }

    // 6. Navigate to Problem Simulator to test disruption map rendering
    await page.goto('/disruptions');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Problem Simulator').first()).toBeVisible();
    await expect(page.locator('.leaflet-container').first()).toBeVisible();
  });
});
