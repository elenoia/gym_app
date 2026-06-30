// Reps prefilled to the planned default (10) so logging only weight still counts.
// Stepper UI: type weight, leave reps untouched, confirm via .set-go.
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

  await page.click('[data-day="A"]');
  await page.waitForSelector(".ex-card");
  const ex = page.locator('.ex-card[data-ex-id="beinpresse"]');
  // Wisch-Layout: Karte ist immer offen, kein Aufklappen nötig.

  const repsPrefill = await ex.locator('.set.active .val-input[data-field="reps"]').inputValue();
  console.log("reps prefill (active set):", JSON.stringify(repsPrefill), "(want \"10\")");

  const weights = ["40", "50", "50"];
  for (let i = 0; i < 3; i++) {
    const active = ex.locator(".set.active");
    await active.locator('.val-input[data-field="weight"]').fill(weights[i]); // reps untouched
    await active.locator(".set-go").click();
    await page.click("#timer-skip").catch(() => {});
    await page.waitForTimeout(100);
  }

  const live = (await page.locator("#workout-tonnage").textContent()).trim();
  console.log("live total:", JSON.stringify(live), "(want contains 1.400)");

  await page.click("#finish-workout");
  await page.waitForSelector("#view-home.active");
  await page.waitForTimeout(150);
  await page.click("#open-calendar");
  await page.click(".calendar-day.has-workout");
  await page.waitForSelector(".calendar-session");
  const calTon = await page.locator(".calendar-session-tonnage").first().textContent();
  console.log("calendar tonnage:", calTon, "(want 1.400 kg)");

  const pass = repsPrefill === "10" && /1\.400/.test(live) && /1\.400/.test(calTon);
  console.log("RESULT:", pass ? "PASS" : "FAIL");

  await browser.close();
  console.log("ERRORS:", errors.length ? errors : "(none)");
  process.exit(pass && !errors.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(2); });
