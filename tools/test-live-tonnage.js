// Test: live running tonnage visible DURING the workout (the gap that made it
// feel "broken" — no sum was shown until after finishing).
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

  await page.click('[data-day="A"]'); // Tag A
  await page.waitForSelector(".exercise");
  const ex = page.locator(".exercise").first();
  await ex.locator(".exercise-head").click();
  await page.waitForTimeout(120);

  // Before anything: empty.
  const before = (await liveText(page)).trim();
  console.log("live before:", JSON.stringify(before), "(want empty)");

  // Enter set 1 and check it → live should show 400.
  const s1 = ex.locator(".set-row").nth(0);
  await s1.locator('input[data-field="weight"]').pressSequentially("40", { delay: 30 });
  await s1.locator('input[data-field="reps"]').pressSequentially("10", { delay: 30 });
  await s1.locator(".set-check").click();
  await page.click("#timer-skip").catch(() => {});
  await page.waitForTimeout(120);
  const after1 = (await liveText(page)).trim();
  console.log("live after set1:", JSON.stringify(after1), "(want contains 400)");

  // Enter + check set 2 (50×10) → live should show 900.
  const s2 = ex.locator(".set-row").nth(1);
  await s2.locator('input[data-field="weight"]').pressSequentially("50", { delay: 30 });
  await s2.locator('input[data-field="reps"]').pressSequentially("10", { delay: 30 });
  await s2.locator(".set-check").click();
  await page.click("#timer-skip").catch(() => {});
  await page.waitForTimeout(120);
  const after2 = (await liveText(page)).trim();
  console.log("live after set2:", JSON.stringify(after2), "(want contains 900)");

  // Edit set 1's weight to 60 (already checked) → live should jump to 1.100.
  const w1 = s1.locator('input[data-field="weight"]');
  await w1.fill("");
  await w1.pressSequentially("60", { delay: 30 });
  await page.waitForTimeout(120);
  const afterEdit = (await liveText(page)).trim();
  console.log("live after editing set1->60:", JSON.stringify(afterEdit), "(want contains 1.100)");

  const pass = before === "" &&
               /400/.test(after1) &&
               /900/.test(after2) &&
               /1\.100/.test(afterEdit);
  console.log("RESULT:", pass ? "PASS" : "FAIL");

  await browser.close();
  console.log("ERRORS:", errors.length ? errors : "(none)");
  process.exit(pass && !errors.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(2); });
