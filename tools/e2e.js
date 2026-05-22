// End-to-end test: second-workout hints, offline mode, export/import.
// Server must be at http://127.0.0.1:8765
const { chromium, devices } = require("playwright");
const fs = require("fs");
const path = require("path");

const URL = "http://127.0.0.1:8765/index.html";
const OUT = path.join(__dirname, "screenshots");
fs.mkdirSync(OUT, { recursive: true });
const shot = (page, name) => page.screenshot({ path: path.join(OUT, name + ".png"), fullPage: false });
const waitVisible = (page, sel) => page.waitForFunction((s) => !document.querySelector(s).classList.contains("hidden"), sel);
const waitHidden  = (page, sel) => page.waitForFunction((s) => document.querySelector(s).classList.contains("hidden"), sel);

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    ...devices["iPhone 13"],
    permissions: ["clipboard-read", "clipboard-write"]
  });
  const page = await context.newPage();

  const errors = [];
  page.on("pageerror", (e) => errors.push("[pageerror] " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("[console.error] " + m.text()); });

  await page.goto(URL, { waitUntil: "networkidle" });

  // Seed: complete a Tag A workout via direct localStorage so we test per-set hints
  await page.evaluate(() => {
    const session = {
      day: "A",
      date: new Date().toISOString(),
      exercises: [
        { id: "beinpresse",     sets: [{weight: 80, reps: 12, done: true}, {weight: 85, reps: 11, done: true}, {weight: 85, reps: 10, done: true}] },
        { id: "bankdruecken",   sets: [{weight: 12, reps: 10, done: true}, {weight: 12, reps: 9, done: true}, {weight: 10, reps: 10, done: true}] },
        { id: "kabelrudern",    sets: [{weight: 30, reps: 12, done: true}, {weight: 30, reps: 12, done: true}, {weight: 32, reps: 10, done: true}] },
        { id: "rueckenstrecker",sets: [{weight: null, reps: 12, done: true}, {weight: null, reps: 12, done: true}, {weight: null, reps: 10, done: true}] },
        { id: "face_pulls",     sets: [{weight: 14, reps: 15, done: true}, {weight: 14, reps: 14, done: true}, {weight: 14, reps: 12, done: true}] },
        { id: "bauchmaschine",  sets: [{weight: 25, reps: 12, done: true}, {weight: 25, reps: 12, done: true}, {weight: 25, reps: 10, done: true}] }
      ]
    };
    localStorage.setItem("gym.v1.history", JSON.stringify([session]));
    localStorage.setItem("gym.v1.lastWeights", JSON.stringify({
      beinpresse: 85, bankdruecken: 12, kabelrudern: 32, face_pulls: 14, bauchmaschine: 25
    }));
  });

  await page.reload({ waitUntil: "networkidle" });
  await shot(page, "e2e-01-home-with-history");

  // Open Tag A again — per-set hints should now show
  await page.click("#day-grid .day-card:nth-child(1)");
  await page.waitForSelector("#view-workout.active");
  await page.waitForSelector(".exercise.open");
  await shot(page, "e2e-02-workout-with-hints");

  const hintCount = await page.locator(".set-hint").count();
  console.log("set-hint rows visible:", hintCount, "(want >= 3 for beinpresse)");

  // Should show "Zuletzt: 80 kg × 12" etc.
  const firstHint = await page.locator(".set-hint").first().textContent();
  console.log("first hint:", firstHint);

  // Pre-fill values should be set
  const firstWeight = await page.locator('.exercise.open input[data-field="weight"]').first().inputValue();
  console.log("set1 weight prefilled:", firstWeight, "(want 80)");

  // Leave workout: click back, confirm "Training abbrechen"
  await page.click("#back-home");
  await waitVisible(page, "#sheet");
  await page.click("#sheet-confirm");
  await waitHidden(page, "#sheet");
  await page.waitForSelector("#view-home.active");

  // Settings → export
  await page.click("#open-settings");
  await page.waitForSelector("#view-settings.active");
  await shot(page, "e2e-03-settings");

  await page.click("#export-data");
  await waitVisible(page, "#sheet");
  await shot(page, "e2e-04-export-confirm");
  const exportTitle = await page.locator("#sheet-title").textContent();
  console.log("export sheet title:", exportTitle);
  await page.click("#sheet-confirm");
  await waitHidden(page, "#sheet");

  // Verify clipboard contents
  const clipText = await page.evaluate(() => navigator.clipboard.readText());
  const parsed = JSON.parse(clipText);
  console.log("clipboard schemaVersion:", parsed.schemaVersion, "history len:", parsed.history.length);

  // Offline test: stop network, reload, app should still load via SW
  await context.setOffline(true);
  await page.reload({ waitUntil: "load" });
  await page.waitForSelector("#day-grid .day-card", { timeout: 5000 });
  await shot(page, "e2e-05-offline-home");
  await context.setOffline(false);

  // Timer wall-clock check: start a workout, check off a set, sleep 2s of wall time but freeze JS in background
  await page.click("#day-grid .day-card:nth-child(1)");
  await page.waitForSelector(".exercise.open");
  await page.locator(".exercise.open .set-check").first().click();
  await waitVisible(page, "#timer-overlay");
  const timerAtStart = await page.locator("#timer-display").textContent();
  // Wait 3 seconds wall time
  await page.waitForTimeout(3000);
  const timerAfter = await page.locator("#timer-display").textContent();
  console.log("timer at start:", timerAtStart, "after 3s wall:", timerAfter);

  await browser.close();
  console.log("ERRORS:", errors.length ? errors : "(none)");
  process.exit(errors.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
