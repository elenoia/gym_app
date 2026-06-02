// Security: a malicious imported history payload must NOT execute when the
// calendar renders it. All dynamic history fields must be escaped on output.
const { chromium, devices } = require("playwright");
const URL = "http://127.0.0.1:8765/index.html";

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ ...devices["iPhone 13"] });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push("[pageerror] " + e.message));

  await page.goto(URL, { waitUntil: "networkidle" });

  // Seed a hostile history entry (as if imported): XSS in day, exercise id,
  // weight and reps. onerror would set window.__pwned if the markup parsed.
  const iso = new Date().toISOString();
  await page.evaluate((iso) => {
    const payload = `<img src=x onerror="window.__pwned=1">`;
    const hist = [{
      day: payload,
      date: iso,
      exercises: [{
        id: payload,
        sets: [{ weight: payload, reps: payload, done: true }]
      }]
    }];
    localStorage.setItem("gym.v1.history", JSON.stringify(hist));
    window.__pwned = 0;
  }, iso);

  await page.reload({ waitUntil: "networkidle" });
  await page.evaluate(() => { window.__pwned = 0; });
  await page.click("#open-calendar");
  await page.click(".calendar-day.has-workout");
  await page.waitForSelector(".calendar-session");
  await page.waitForTimeout(300);

  const pwned = await page.evaluate(() => window.__pwned);
  const injectedImg = await page.locator(".calendar-session img").count();
  // The literal text should still be visible (escaped), proving it rendered as text.
  const bodyText = await page.locator("#cal-detail").textContent();
  const shownAsText = bodyText.includes("onerror");

  console.log("window.__pwned:", pwned, "(want 0)");
  console.log("injected <img> elements:", injectedImg, "(want 0)");
  console.log("payload shown as text:", shownAsText, "(want true)");

  const pass = pwned === 0 && injectedImg === 0 && shownAsText;
  console.log("RESULT:", pass ? "PASS" : "FAIL");

  await browser.close();
  console.log("ERRORS:", errors.length ? errors : "(none)");
  process.exit(pass ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(2); });
