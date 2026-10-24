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

  // Check BeforeVsAfterCard
  const beforeVsAfterHeading = await page.locator('text=Fleet Performance: Before vs After').innerText();
  console.log('Found BeforeVsAfterCard:', beforeVsAfterHeading);

  // Check clicking shipments
  const s2Button = page.locator('button:has-text("S2"), div:has-text("S2")').first();
  if (await s2Button.count() > 0) {
    await s2Button.click();
    console.log('Clicked S2 shipment');
  }

  // 1.1 Test Guided Demo Modal & Autoplay Runner
  const demoGuideBtn = page.locator('button:has-text("2-Min Demo Script")');
  await demoGuideBtn.click();
  console.log('Opened 2-Min Demo Script modal');

  const runGuidedDemoBtn = page.locator('[data-testid="run-guided-demo-btn"]');
  await runGuidedDemoBtn.click();
  console.log('Clicked Run Guided Demo button');

  const tourBarText = await page.locator('text=Stage 1 of 7').first().innerText();
  console.log('Tour Bar rendered:', tourBarText);


  // 2. Test Responsive Viewports (360px, 390px, 768px, 1440px)
  const viewports = [360, 390, 768, 1440];
  for (const width of viewports) {
    const vpContext = await browser.newContext({
      viewport: { width, height: 800 },
    });
    const vpPage = await vpContext.newPage();
    await vpPage.goto('http://localhost:4173/', { waitUntil: 'networkidle' });

    const scrollWidth = await vpPage.evaluate(() => document.documentElement.scrollWidth);
    const innerWidth = await vpPage.evaluate(() => window.innerWidth);
    console.log(`Viewport ${width}px -> scrollWidth: ${scrollWidth}, innerWidth: ${innerWidth}`);

    if (scrollWidth > innerWidth) {
      throw new Error(`Horizontal scroll detected at ${width}px: scrollWidth ${scrollWidth} > innerWidth ${innerWidth}`);
    }
    await vpContext.close();
  }

  console.log('Zero horizontal scroll verified across 360, 390, 768, and 1440px!');
  console.log('Console Errors encountered:', consoleErrors);

  await browser.close();
}

testBrowser().catch((err) => {
  console.error('Browser test failed:', err);
  process.exit(1);
});
