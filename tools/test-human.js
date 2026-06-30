// Real human flow on the stepper UI: type into the active set's value field,
// confirm with .set-go, read the live total. Plus the "didn't confirm" case.
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

async function openFirst(page) {
  await page.click('[data-day="A"]');
  await page.waitForSelector(".ex-card");
  const ex = page.locator(".ex-card").first();
  // Wisch-Layout: Karte ist immer offen, kein Aufklappen nötig.
  return ex;
}

(async () => {
  let allPass = true;

  // Scenario 1: type weight, confirm → live shows 400.
  const s1 = await run("type+confirm", async (page) => {
    const ex = await openFirst(page);
    const active = ex.locator(".set.active");
    await active.locator('.val-input[data-field="weight"]').pressSequentially("40", { delay: 40 });
    await active.locator(".set-go").click();
    await page.click("#timer-skip").catch(() => {});
    await page.waitForTimeout(120);
    const total = (await page.locator("#workout-tonnage").textContent()).trim();
    console.log("  live total:", JSON.stringify(total), "(want 400)");
    return /400/.test(total);
  });
  allPass = allPass && s1.result && !s1.errors.length;

  // Scenario 2: type but DON'T confirm → nothing counted, live empty.
  const s2 = await run("no-confirm", async (page) => {
    const ex = await openFirst(page);
    const active = ex.locator(".set.active");
    await active.locator('.val-input[data-field="weight"]').pressSequentially("40", { delay: 40 });
    const live = (await page.locator("#workout-tonnage").textContent()).trim();
    console.log("  live total (unconfirmed):", JSON.stringify(live), "(want empty)");
    return live === "";
  });
  allPass = allPass && s2.result && !s2.errors.length;

  console.log("\nRESULT:", allPass ? "PASS" : "FAIL");
  process.exit(allPass ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(2); });
