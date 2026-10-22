import { chromium } from '@playwright/test';

async function testBrowser() {
  console.log('Launching local Google Chrome for browser verification...');
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });

  // 1. Test at 1440px (Desktop)
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await desktopContext.newPage();
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });

  const badgeText = await page.locator('[data-testid="env-badge"]').innerText();
  console.log('1440px Desktop Env Badge Text:', badgeText);

  const activeTrucksText = await page.locator('text=Active Trucks:').locator('..').innerText();
  console.log('1440px Desktop Active Trucks:', activeTrucksText);

  // Check clicking shipments
  const s2Button = page.locator('button:has-text("S2"), div:has-text("S2")').first();
  if (await s2Button.count() > 0) {
    await s2Button.click();
    console.log('Clicked S2 shipment');
  }

  // 2. Test at 390px (Mobile)
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const mobilePage = await mobileContext.newPage();
  mobilePage.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  await mobilePage.goto('http://localhost:4173/', { waitUntil: 'networkidle' });

  const mobileBadgeText = await mobilePage.locator('[data-testid="env-badge"]').innerText();
  console.log('390px Mobile Env Badge Text:', mobileBadgeText);

  const scrollWidth = await mobilePage.evaluate(() => document.documentElement.scrollWidth);
  const innerWidth = await mobilePage.evaluate(() => window.innerWidth);
  console.log(`390px Mobile ScrollWidth: ${scrollWidth}, InnerWidth: ${innerWidth}`);

  console.log('Console Errors encountered:', consoleErrors);

  await browser.close();
}

testBrowser().catch((err) => {
  console.error('Browser test failed:', err);
  process.exit(1);
});
