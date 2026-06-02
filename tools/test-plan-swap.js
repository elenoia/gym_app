// Focused test: machine-only plan (Feature 5) + alternative swap (Feature 6).
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

  // Feature 5: there should be 4 plans total (today-card A + B/C/M list).
  const cards = await page.locator("[data-day]").count();
  console.log("day cards:", cards, "(want 4)");
  const mCard = page.locator('[data-day="M"]');
  const mTitle = await mCard.locator(".day-name").textContent();
  console.log("machine plan title:", JSON.stringify(mTitle), '(want "Maschinen")');

  await mCard.click();
  await page.waitForSelector("#view-workout.active");
  await page.waitForSelector(".ex-card");
  const exCount = await page.locator(".ex-card").count();
  console.log("machine plan exercise count:", exCount, "(want 7)");
  // All exercises in this plan must be machines — assert via app data.
  const allMachines = await page.evaluate(() =>
    PLAN.M.exercises.every(e => EXERCISES[e.id] && EXERCISES[e.id].equipment === "Maschine"));
  console.log("all machine-equipment:", allMachines, "(want true)");
  // Every exercise must have a rendered SVG (new ones included).
  const svgCount = await page.locator(".ex-card .ex-figure svg").count();
  console.log("rendered SVGs:", svgCount, "(want 7)");
  // The new exercises must resolve to real entries.
  const newOk = await page.evaluate(() =>
    ["abduktoren","brustpresse","schulterpresse","reverse_fly"].every(
      id => EXERCISES[id] && EXERCISES[id].name && EXERCISES[id].svg));
  console.log("new exercises defined:", newOk, "(want true)");

  // Back home, into Tag A, swap bankdruecken -> an alternative.
  await page.click("#back-home");
  await page.waitForSelector("#sheet:not(.hidden)").catch(() => {});
  await page.click("#sheet-confirm").catch(() => {}); // confirm abort of empty session
  await page.waitForSelector("#view-home.active");

  await page.click('[data-day="A"]');
  await page.waitForSelector(".ex-card");
  const ex = page.locator('.ex-card[data-ex-id="bankdruecken"]');
  await ex.locator(".ex-head").click();
  await page.waitForTimeout(150);
  await ex.locator(".ex-swap").click();
  await page.waitForSelector("#picker:not(.hidden)");
  const options = await page.locator(".picker-option-label").allTextContents();
  console.log("swap options:", options);
  // Pick the first option (butterfly).
  await page.locator(".picker-option").first().click();
  await page.waitForTimeout(250);

  // The bankdruecken card should be gone, replaced by the chosen alternative.
  const stillBank = await page.locator('.ex-card[data-ex-id="bankdruecken"]').count();
  const nowButterfly = await page.locator('.ex-card[data-ex-id="butterfly"]').count();
  console.log("bankdruecken gone:", stillBank === 0, "(want true)");
  console.log("butterfly present:", nowButterfly === 1, "(want true)");

  const pass = cards === 4 && mTitle === "Maschinen" && exCount === 7 && allMachines &&
               svgCount === 7 && newOk && stillBank === 0 && nowButterfly === 1;
  console.log("RESULT:", pass ? "PASS" : "FAIL");

  await browser.close();
  console.log("ERRORS:", errors.length ? errors : "(none)");
  process.exit(pass && !errors.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(2); });
