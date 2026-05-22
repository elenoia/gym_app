// Smoke test for the Gym PWA.
// Walks the golden path on an iPhone 13 viewport and captures screenshots.
// Server must be running at http://127.0.0.1:8765
const { chromium, devices } = require("playwright");
const fs = require("fs");
const path = require("path");

const URL = "http://127.0.0.1:8765/index.html";
const OUT = path.join(__dirname, "screenshots");
fs.mkdirSync(OUT, { recursive: true });

const shot = (page, name) => page.screenshot({ path: path.join(OUT, name + ".png"), fullPage: false });
const waitHidden = (page, selector) =>
  page.waitForFunction((s) => document.querySelector(s).classList.contains("hidden"), selector);
const waitVisible = (page, selector) =>
  page.waitForFunction((s) => !document.querySelector(s).classList.contains("hidden"), selector);

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    ...devices["iPhone 13"]
  });
  const page = await context.newPage();

  const errors = [];
  page.on("pageerror", (e) => errors.push("[pageerror] " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("[console.error] " + m.text()); });

  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForSelector("#day-grid .day-card");
  await shot(page, "01-home");

  // Settings
  await page.click("#open-settings");
  await page.waitForSelector("#view-settings.active");
  await shot(page, "02-settings");
  await page.click("#back-from-settings");
  await page.waitForSelector("#view-home.active");

  // Tag A
  await page.click("#day-grid .day-card:nth-child(1)");
  await page.waitForSelector("#view-workout.active");
  await page.waitForSelector(".exercise"); // exercise list rendered
  // Workouts starten jetzt mit aufgeklapptem Warmup, alle Übungen zu — selbst öffnen
  await page.locator(".exercise .exercise-head").first().click();
  await page.waitForSelector(".exercise.open");
  await shot(page, "03-workout-initial");

  // Set 1
  const firstSet = page.locator(".exercise.open .set-row").first();
  await firstSet.locator('input[data-field="weight"]').fill("40");
  await firstSet.locator('input[data-field="reps"]').fill("10");
  await shot(page, "04-set1-filled");

  await firstSet.locator(".set-check").click();
  await waitVisible(page, "#timer-overlay");
  await shot(page, "05-timer-running");
  await page.click("#timer-skip");
  await waitHidden(page, "#timer-overlay");

  // Set 2
  const secondSet = page.locator(".exercise.open .set-row").nth(1);
  await secondSet.locator('input[data-field="weight"]').fill("42.5");
  await secondSet.locator('input[data-field="reps"]').fill("10");
  await secondSet.locator(".set-check").click();
  await waitVisible(page, "#timer-overlay");
  await shot(page, "06-timer-second");
  await page.click("#timer-skip");
  await waitHidden(page, "#timer-overlay");

  // Double-tap-guard sanity: click rapidly twice on set 3 — should still only toggle once
  const thirdSet = page.locator(".exercise.open .set-row").nth(2);
  await thirdSet.locator(".set-check").click();
  await thirdSet.locator(".set-check").click({ delay: 0 });
  // After two rapid clicks, the set should be UN-done again (1st tap toggles on,
  // 2nd within debounce window is ignored — but if guard fails it would toggle off).
  // We'll verify by checking .set-check has .done class:
  const stillDone = await thirdSet.locator(".set-check").evaluate((el) => el.classList.contains("done"));
  console.log("after double-tap, set3 .done =", stillDone, "(want true)");

  await page.click("#timer-skip").catch(() => {});

  // Warm-up Banner ist seit v5 default offen; bestätigen + Screenshot
  await page.waitForSelector("#warmup-banner.open");
  await shot(page, "07-warmup");

  // Try back-home → sheet should appear; click "Weiter trainieren"
  await page.click("#back-home");
  await waitVisible(page, "#sheet");
  await shot(page, "08-confirm-sheet");
  await page.click("#sheet-cancel"); // Weiter trainieren
  await waitHidden(page, "#sheet");

  // Finish workout — at least one set done so no confirm
  await page.click("#finish-workout");
  await page.waitForSelector("#view-home.active");
  await shot(page, "09-home-after");

  // Reload and verify persistence
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector(".day-card");
  const todayText = await page.locator(".day-card").first().locator(".last-done").textContent();
  console.log("Tag A last-done after reload:", todayText);

  // Settings → input font size & defaults
  await page.click("#open-settings");
  await page.waitForSelector("#view-settings.active");
  const restFontSize = await page.locator("#setting-rest").evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  console.log("#setting-rest font-size:", restFontSize);

  // Verify export button exists
  const hasExport = await page.locator("#export-data").count();
  console.log("export button present:", hasExport);

  // localStorage versioning sanity
  const lsKeys = await page.evaluate(() => Object.keys(localStorage));
  console.log("localStorage keys:", lsKeys);

  await browser.close();
  console.log("ERRORS:", errors.length ? errors : "(none)");
  process.exit(errors.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
