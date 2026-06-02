// Live running tonnage visible DURING the workout (stepper UI).
const { chromium, devices } = require("playwright");
const URL = "http://127.0.0.1:8765/index.html";

const liveText = (page) => page.locator("#workout-tonnage").textContent();

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
  await ex.locator(".ex-head").click();
  await page.waitForTimeout(150);

  const before = (await liveText(page)).trim();
  console.log("live before:", JSON.stringify(before), "(want empty)");

  // Set 1: 40 × 10 → 400
  let active = ex.locator(".set.active");
  await active.locator('.val-input[data-field="weight"]').fill("40");
  await active.locator(".set-go").click();
  await page.click("#timer-skip").catch(() => {});
  await page.waitForTimeout(120);
  const after1 = (await liveText(page)).trim();
  console.log("live after set1:", JSON.stringify(after1), "(want contains 400)");

  // Set 2: 50 × 10 → 900
  active = ex.locator(".set.active");
  await active.locator('.val-input[data-field="weight"]').fill("50");
  await active.locator(".set-go").click();
  await page.click("#timer-skip").catch(() => {});
  await page.waitForTimeout(120);
  const after2 = (await liveText(page)).trim();
  console.log("live after set2:", JSON.stringify(after2), "(want contains 900)");

  // Stepper +2.5 on active set 3 weight (from 0) then confirm → +? just check stepper bumps the field
  active = ex.locator(".set.active");
  await active.locator('.step[data-field="weight"][data-delta="2.5"]').click();
  const bumped = await active.locator('.val-input[data-field="weight"]').inputValue();
  console.log("stepper bumped weight:", JSON.stringify(bumped), "(want \"2.5\")");

  const pass = before === "" && /400/.test(after1) && /900/.test(after2) && bumped === "2.5";
  console.log("RESULT:", pass ? "PASS" : "FAIL");

  await browser.close();
  console.log("ERRORS:", errors.length ? errors : "(none)");
  process.exit(pass && !errors.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(2); });
