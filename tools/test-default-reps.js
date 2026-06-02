// Reproduces Elena's screenshot: enter only weight (40,50,50), leave reps
// untouched, check all three. With reps prefilled to the planned default (10),
// the live total must read 40*10 + 50*10 + 50*10 = 1400.
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

  await page.click("#day-grid .day-card:nth-child(1)"); // Tag A → Beinpresse first
  await page.waitForSelector(".exercise");
  const ex = page.locator(".exercise").first();
  await ex.locator(".exercise-head").click();
  await page.waitForTimeout(120);

  // Reps field should already hold a real default value (10), not be empty.
  const repsPrefill = await ex.locator(".set-row").nth(0).locator('input[data-field="reps"]').inputValue();
  console.log("reps prefill (set1):", JSON.stringify(repsPrefill), "(want \"10\")");

  const weights = ["40", "50", "50"];
  for (let i = 0; i < 3; i++) {
    const s = ex.locator(".set-row").nth(i);
    await s.locator('input[data-field="weight"]').pressSequentially(weights[i], { delay: 30 });
    // deliberately DO NOT touch reps
    await s.locator(".set-check").click();
    await page.click("#timer-skip").catch(() => {});
    await page.waitForTimeout(80);
  }

  const live = (await page.locator("#workout-tonnage").textContent()).trim();
  console.log("live total:", JSON.stringify(live), "(want contains 1.400)");

  // Finish and confirm it persists to the home total.
  await page.click("#finish-workout");
  await page.waitForSelector("#view-home.active");
  await page.waitForTimeout(150);
  const home = await page.locator(".tonnage-value").textContent().catch(() => "(no card)");
  console.log("home total:", home, "(want 1.400 kg)");

  const pass = repsPrefill === "10" && /1\.400/.test(live) && /1\.400/.test(home);
  console.log("RESULT:", pass ? "PASS" : "FAIL");

  await browser.close();
  console.log("ERRORS:", errors.length ? errors : "(none)");
  process.exit(pass && !errors.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(2); });
