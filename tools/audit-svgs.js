// Renders the SVG audit page and screenshots it for review.
const { chromium } = require("playwright");
const path = require("path");

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 1600 }, deviceScaleFactor: 2 });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:8765/tools/svg-audit.html", { waitUntil: "networkidle" });
  // Pause so the SMIL animations are visible roughly mid-cycle.
  await page.waitForTimeout(1100);
  await page.screenshot({ path: path.join(__dirname, "screenshots", "svg-audit-mid.png"), fullPage: true });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(__dirname, "screenshots", "svg-audit-late.png"), fullPage: true });
  await browser.close();
  console.log("audit screenshots written");
})();
