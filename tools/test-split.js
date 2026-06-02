// Unilateral split L/R logging (stepper UI) end-to-end.
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
  let ex = page.locator('.ex-card[data-ex-id="face_pulls"]');
  await ex.locator(".ex-head").click();
  await page.waitForTimeout(150);

  // Segmented L/R control present on unilateral exercise.
  const hasSeg = await ex.locator('.seg button[data-split="1"]').count();
  console.log("L/R segmented present on face_pulls:", hasSeg === 1, "(want true)");

  // Switch to split → active set shows L and R steppers.
  await ex.locator('.seg button[data-split="1"]').click();
  await page.waitForTimeout(200);
  ex = page.locator('.ex-card[data-ex-id="face_pulls"]');
  const active = ex.locator(".set.active");
  await active.locator('.val-input[data-field="weightL"]').fill("5");
  await active.locator('.val-input[data-field="repsL"]').fill("12");
  await active.locator('.val-input[data-field="weightR"]').fill("4");
  await active.locator('.val-input[data-field="repsR"]').fill("10");
  await active.locator(".set-go").click();
  await page.click("#timer-skip").catch(() => {});
  await page.waitForTimeout(150);

  // Live total = 5*12 + 4*10 = 100
  const liveTotal = (await page.locator("#workout-tonnage").textContent()).trim();
  console.log("live total:", JSON.stringify(liveTotal), "(want contains 100)");

  await page.click("#finish-workout");
  await page.waitForSelector("#view-home.active");
  await page.waitForTimeout(150);
  await page.click("#open-calendar");
  await page.click(".calendar-day.has-workout");
  await page.waitForSelector(".calendar-session");
  const detail = await page.locator(".calendar-session-ex-sets").first().textContent();
  const calTon = await page.locator(".calendar-session-tonnage").first().textContent();
  console.log("calendar set detail:", JSON.stringify(detail.trim()), "tonnage:", calTon);

  const pass = hasSeg === 1 && /100/.test(liveTotal) && calTon.includes("100") &&
               /L 5×12/.test(detail) && /R 4×10/.test(detail);
  console.log("RESULT:", pass ? "PASS" : "FAIL");

  await browser.close();
  console.log("ERRORS:", errors.length ? errors : "(none)");
  process.exit(pass && !errors.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(2); });
