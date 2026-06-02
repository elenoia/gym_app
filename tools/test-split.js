// Focused test: unilateral split L/R logging (Feature 4) end-to-end.
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

  // Tag A → open face_pulls (unilateral).
  await page.click("#day-grid .day-card:nth-child(1)");
  await page.waitForSelector(".exercise");
  const ex = page.locator('.exercise:has(textarea[data-note-ex="face_pulls"])');
  await ex.locator(".exercise-head").click();
  await page.waitForTimeout(150);

  const hasToggle = await ex.locator(".split-toggle-input").count();
  console.log("split toggle present on face_pulls:", hasToggle === 1, "(want true)");

  // Switch to split mode.
  await ex.locator(".split-toggle").click();
  await page.waitForTimeout(200);
  const exAfter = page.locator('.exercise:has(textarea[data-note-ex="face_pulls"])');
  const lWeight = exAfter.locator('input[data-field="weightL"]').first();
  const lReps = exAfter.locator('input[data-field="repsL"]').first();
  const rWeight = exAfter.locator('input[data-field="weightR"]').first();
  const rReps = exAfter.locator('input[data-field="repsR"]').first();
  console.log("L/R inputs visible:", await lWeight.count() && await rWeight.count(), "(want 1)");

  await lWeight.fill("5"); await lReps.fill("12");
  await rWeight.fill("4"); await rReps.fill("10");
  await exAfter.locator(".set-row-split .set-check").first().click();
  await page.click("#timer-skip").catch(() => {});
  await page.waitForTimeout(150);

  // Live total during the session = 5*12 + 4*10 = 100
  const liveTotal = (await page.locator("#workout-tonnage").textContent()).trim();
  console.log("live total:", JSON.stringify(liveTotal), "(want contains 100)");

  // Finish.
  await page.click("#finish-workout");
  await page.waitForSelector("#view-home.active");
  await page.waitForTimeout(150);

  // Calendar shows L/R summary + per-session tonnage (dashboard card removed).
  await page.click("#open-calendar");
  await page.click(".calendar-day.has-workout");
  await page.waitForSelector(".calendar-session");
  const detail = await page.locator(".calendar-session-ex-sets").first().textContent();
  const calTon = await page.locator(".calendar-session-tonnage").first().textContent();
  console.log("calendar set detail:", JSON.stringify(detail.trim()), "tonnage:", calTon);

  const pass = hasToggle === 1 && /100/.test(liveTotal) && calTon.includes("100") &&
               /L 5×12/.test(detail) && /R 4×10/.test(detail);
  console.log("RESULT:", pass ? "PASS" : "FAIL");

  await browser.close();
  console.log("ERRORS:", errors.length ? errors : "(none)");
  process.exit(pass && !errors.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(2); });
