// Exercise detail screen: open via figure tap, verify content, swap, screenshot.
const { chromium, devices } = require("playwright");
const URL = "http://127.0.0.1:8765/index.html";

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ ...devices["iPhone 13"] });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push("[pageerror] " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("[console] " + m.text()); });

  await page.goto(URL, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });

  await page.click('[data-day="A"]');
  await page.waitForSelector(".ex-card");
  // Open detail of bankdruecken via its figure
  await page.locator('.ex-card[data-ex-id="bankdruecken"] .ex-figure').click();
  await page.waitForSelector("#view-exercise.active");
  await page.waitForTimeout(150);

  const title = await page.locator("#detail-title").textContent();
  const tags = await page.locator("#detail-tags .tag").allTextContents();
  const schemes = await page.locator("#detail-scheme .scheme b").allTextContents();
  const note = await page.locator("#detail-note p").textContent();
  const altCount = await page.locator("#detail-alts .alt").count();
  const figSvg = await page.locator("#detail-figure svg").count();
  console.log("title:", JSON.stringify(title));
  console.log("tags:", tags);
  console.log("scheme:", schemes);
  console.log("note non-empty:", note.trim().length > 0);
  console.log("alternatives:", altCount, " figure svg:", figSvg);
  await page.screenshot({ path: "screenshots/redesign-detail.png" });

  // Swap to first alternative → returns to workout with replaced exercise
  await page.locator("#detail-alts .alt").first().click();
  await page.waitForSelector("#view-workout.active");
  await page.waitForTimeout(150);
  const bankGone = await page.locator('.ex-card[data-ex-id="bankdruecken"]').count();
  console.log("bankdruecken replaced:", bankGone === 0, "(want true)");

  const pass = /Bankdr/.test(title) && tags.includes("Freihantel") &&
               schemes.some(s => /3 ×/.test(s)) && note.trim().length > 0 &&
               altCount >= 1 && figSvg === 1 && bankGone === 0;
  console.log("RESULT:", pass ? "PASS" : "FAIL");

  await browser.close();
  console.log("ERRORS:", errors.length ? errors : "(none)");
  process.exit(pass && !errors.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(2); });
