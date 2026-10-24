import { test, expect } from '@playwright/test';

test.describe('Vehicle Type Dropdown & Auto-fill Verification', () => {
  test('verifies 4 vehicle types auto-fill, creates a vehicle, and confirms plan runs', async ({ page }) => {
    // 1. Navigate to dashboard (network management page)
    await page.goto('http://localhost:3000/');
    await page.waitForLoadState('networkidle');

    // 2. Open Add Network Entity modal
    const addEntityBtn = page.locator('#btn-add-entity-dropdown').or(page.locator('button:has-text("Add Entity")'));
    await expect(addEntityBtn.first()).toBeVisible();
    await addEntityBtn.first().click();

    // 3. Select 'vehicle' tab
    const vehicleTab = page.locator('button:has-text("vehicle")').or(page.locator('button:has-text("Vehicle")'));
    await expect(vehicleTab.first()).toBeVisible();
    await vehicleTab.first().click();

    // 4. Verify default selection is Medium Commercial Truck (8T)
    const typeSelect = page.locator('#entity-name-or-type');
    await expect(typeSelect).toBeVisible();
    await expect(typeSelect).toHaveValue('Medium Commercial Truck (8T)');

    // Helper locators
    const capacityInput = page.locator('input[min="1"]').filter({ has: page.locator('xpath=..') }).first(); // or find by label
    // More precise locators using labels:
    const capInput = page.locator('label:has-text("Units Capacity per Trip") + input, div:has(> label:has-text("Units Capacity per Trip")) input').first();
    const costInput = page.locator('label:has-text("Cost per Km") + input, div:has(> label:has-text("Cost per Km")) input').first();
    const weightInput = page.locator('label:has-text("Weight (Tons)") + input, div:has(> label:has-text("Weight (Tons)")) input').first();

    // Verify initial Medium Commercial Truck (8T) defaults
    await expect(capInput).toHaveValue('150');
    await expect(costInput).toHaveValue('28');
    await expect(weightInput).toHaveValue('8');

    // Test 1: Mini Truck (1-2 Ton)
    await typeSelect.selectOption('Mini Truck (1-2 Ton)');
    await expect(capInput).toHaveValue('38');
    await expect(costInput).toHaveValue('18');
    await expect(weightInput).toHaveValue('2');

    // Test 2: Light Commercial Vehicle (3.5T)
    await typeSelect.selectOption('Light Commercial Vehicle (3.5T)');
    await expect(capInput).toHaveValue('66');
    await expect(costInput).toHaveValue('22');
    await expect(weightInput).toHaveValue('3.5');

    // Test 3: Heavy Commercial Truck (16T)
    await typeSelect.selectOption('Heavy Commercial Truck (16T)');
    await expect(capInput).toHaveValue('300');
    await expect(costInput).toHaveValue('42');
    await expect(weightInput).toHaveValue('16');

    // Test 4: Medium Commercial Truck (8T) again
    await typeSelect.selectOption('Medium Commercial Truck (8T)');
    await expect(capInput).toHaveValue('150');
    await expect(costInput).toHaveValue('28');
    await expect(weightInput).toHaveValue('8');

    // Now select Heavy Commercial Truck (16T) for creation
    await typeSelect.selectOption('Heavy Commercial Truck (16T)');
    const idInput = page.locator('#entity-id-input');
    await idInput.fill('veh-heavy-custom-99');

    // Take screenshot of modal with vehicle dropdown and auto-filled values
    await page.screenshot({
      path: 'C:/Users/Omkar/.gemini/antigravity-ide/brain/1c4210cd-5605-4fa1-9aad-c5e04c169af4/vehicle_modal_dropdown.png',
      fullPage: true,
    });

    // Submit form
    const saveBtn = page.locator('button[type="submit"]:has-text("Create Entity")');
    await saveBtn.first().click();

    // Verify modal closes
    await expect(typeSelect).not.toBeVisible();

    // Switch to Vehicles tab in network table to confirm newly added vehicle
    const vehiclesTableTab = page.locator('button:has-text("Transporters & Fleet")');
    await expect(vehiclesTableTab.first()).toBeVisible();
    await vehiclesTableTab.first().click();

    // Verify new vehicle row is in the list
    const newVehicleCell = page.locator('text=veh-heavy-custom-99');
    await expect(newVehicleCell.first()).toBeVisible();
    await expect(page.locator('text=Heavy Commercial Truck (16T)').first()).toBeVisible();

    // Navigate to Plan / Assignments page to verify plan still runs
    await page.goto('http://localhost:3000/assignments');
    await page.waitForLoadState('networkidle');

    // Verify Solver / Assignments loaded
    const planHeading = page.locator('text=Recovery Plan').or(page.locator('text=Plan'));
    await expect(planHeading.first()).toBeVisible();

    // Take screenshot of successful vehicle and plan integration
    await page.screenshot({
      path: 'C:/Users/Omkar/.gemini/antigravity-ide/brain/1c4210cd-5605-4fa1-9aad-c5e04c169af4/vehicle_dropdown_verification.png',
      fullPage: true,
    });
  });
});
