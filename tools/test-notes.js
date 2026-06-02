// Focused test: editable per-exercise notes (Feature 2).
const { chromium, devices } = require("playwright");
const URL = "http://127.0.0.1:8765/index.html";

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ ...devices["iPhone 13"] });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push("[pageerror] " + e.message));

  await page.goto(URL, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });

  // Tag A, expand the cable-row exercise (kabelrudern) and read its default note.
  await page.click("#day-grid .day-card:nth-child(1)");
  await page.waitForSelector(".exercise");
  const exHandle = page.locator('.exercise:has(textarea[data-note-ex="kabelrudern"])');
  await exHandle.locator(".exercise-head").click();
  await page.waitForTimeout(150);
  const defaultNote = await page.locator('textarea[data-note-ex="kabelrudern"]').inputValue();
  console.log("default note present:", /4,5 kg/.test(defaultNote), "(want true)");

  // Edit it.
  await page.locator('textarea[data-note-ex="kabelrudern"]').fill("Neuer Griff, 5 kg pro Seite");
  await page.waitForTimeout(100);

  // Reload, re-open, verify persistence.
  await page.reload({ waitUntil: "networkidle" });
  await page.click("#day-grid .day-card:nth-child(1)");
  await page.waitForSelector(".exercise");
  const exHandle2 = page.locator('.exercise:has(textarea[data-note-ex="kabelrudern"])');
  await exHandle2.locator(".exercise-head").click();
  await page.waitForTimeout(150);
  const saved = await page.locator('textarea[data-note-ex="kabelrudern"]').inputValue();
  console.log("saved note:", JSON.stringify(saved), '(want "Neuer Griff, 5 kg pro Seite")');

  const pass = /4,5 kg/.test(defaultNote) && saved === "Neuer Griff, 5 kg pro Seite";
  console.log("RESULT:", pass ? "PASS" : "FAIL");

  await browser.close();
  console.log("ERRORS:", errors.length ? errors : "(none)");
  process.exit(pass && !errors.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(2); });
