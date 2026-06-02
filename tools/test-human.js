// Reproduces a REAL human typing flow (not fill/seed) to catch gaps the other
// tests bypass. Types digit-by-digit, checks the box, finishes, reads the total.
const { chromium, devices } = require("playwright");
const URL = "http://127.0.0.1:8765/index.html";

async function run(label, fn) {
  const browser = await chromium.launch();
  const context = await browser.newContext({ ...devices["iPhone 13"] });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push("[pageerror] " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("[console] " + m.text()); });
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  const result = await fn(page);
  await browser.close();
  console.log(`[${label}] errors:`, errors.length ? errors : "(none)");
  return { result, errors };
}

(async () => {
  let allPass = true;

  // Scenario 1: type weight+reps like a human, check, finish, read total.
  const s1 = await run("type+check", async (page) => {
    await page.click("#day-grid .day-card:nth-child(1)"); // Tag A
    await page.waitForSelector(".exercise");
    const ex = page.locator(".exercise").first();
    await ex.locator(".exercise-head").click();
    await page.waitForTimeout(120);
    const set = ex.locator(".set-row").first();
    await set.locator('input[data-field="weight"]').pressSequentially("40", { delay: 40 });
    await set.locator('input[data-field="reps"]').pressSequentially("10", { delay: 40 });
    await set.locator(".set-check").click();
    await page.click("#timer-skip").catch(() => {});
    await page.waitForTimeout(120);
    await page.click("#finish-workout");
    await page.waitForSelector("#view-home.active");
    await page.waitForTimeout(150);
    const total = await page.locator(".tonnage-value").textContent().catch(() => "(no card)");
    console.log("  home total:", total, "(want 400 kg)");
    return /400/.test(total);
  });
  allPass = allPass && s1.result && !s1.errors.length;

  // Scenario 2: enter values but FORGET to check the box, then finish.
  const s2 = await run("no-check", async (page) => {
    await page.click("#day-grid .day-card:nth-child(1)");
    await page.waitForSelector(".exercise");
    const ex = page.locator(".exercise").first();
    await ex.locator(".exercise-head").click();
    await page.waitForTimeout(120);
    const set = ex.locator(".set-row").first();
    await set.locator('input[data-field="weight"]').pressSequentially("40", { delay: 40 });
    await set.locator('input[data-field="reps"]').pressSequentially("10", { delay: 40 });
    // no check
    await page.click("#finish-workout");
    // confirm "Trotzdem beenden?" sheet
    await page.waitForSelector("#sheet:not(.hidden)").catch(() => {});
    await page.click("#sheet-confirm").catch(() => {});
    await page.waitForSelector("#view-home.active");
    await page.waitForTimeout(150);
    const total = await page.locator(".tonnage-value").textContent().catch(() => "(no card)");
    console.log("  home total (unchecked):", total, "(0 expected -> card hidden = '(no card)')");
    return true; // informational
  });

  // Scenario 3: check the box FIRST, then type the numbers.
  const s3 = await run("check-then-type", async (page) => {
    await page.click("#day-grid .day-card:nth-child(1)");
    await page.waitForSelector(".exercise");
    const ex = page.locator(".exercise").first();
    await ex.locator(".exercise-head").click();
    await page.waitForTimeout(120);
    const set = ex.locator(".set-row").first();
    await set.locator(".set-check").click();
    await page.click("#timer-skip").catch(() => {});
    await set.locator('input[data-field="weight"]').pressSequentially("40", { delay: 40 });
    await set.locator('input[data-field="reps"]').pressSequentially("10", { delay: 40 });
    await page.click("#finish-workout");
    await page.waitForSelector("#view-home.active");
    await page.waitForTimeout(150);
    const total = await page.locator(".tonnage-value").textContent().catch(() => "(no card)");
    console.log("  home total (check-first):", total, "(want 400 kg)");
    return /400/.test(total);
  });
  allPass = allPass && s3.result && !s3.errors.length;

  console.log("\nRESULT:", allPass ? "PASS" : "FAIL");
  process.exit(allPass ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(2); });
