// Focused test: tonnage formula (Bug 3) through the real render paths.
const { chromium, devices } = require("playwright");
const URL = "http://127.0.0.1:8765/index.html";

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ ...devices["iPhone 13"] });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push("[pageerror] " + e.message));

  await page.goto(URL, { waitUntil: "networkidle" });

  const iso = new Date().toISOString();
  // One session exercising every branch of the formula.
  await page.evaluate((iso) => {
    const hist = [{
      day: "A", date: iso, exercises: [
        // bilateral normal: 40 * 10 = 400
        { id: "beinpresse", sets: [{ weight: 40, reps: 10, done: true }] },
        // unilateral combined value: 5 * 12 * 2 = 120
        { id: "face_pulls", sets: [{ weight: 5, reps: 12, done: true }] },
        // bodyweight: counts 0 kg
        { id: "liegestuetze", sets: [{ weight: null, reps: 15, done: true }] },
        // unilateral split L/R: 4.5*12 + 4*12 = 102
        { id: "kabelrudern", sets: [{ weightL: 4.5, repsL: 12, weightR: 4, repsR: 12, done: true }] },
        // incomplete (reps missing) -> 0 ; not done -> 0
        { id: "beinstrecker", sets: [{ weight: 30, reps: null, done: true }, { weight: 30, reps: 10, done: false }] },
      ]
    }];
    localStorage.setItem("gym.v1.history", JSON.stringify(hist));
  }, iso);

  await page.reload({ waitUntil: "networkidle" });

  // Calendar per-session tonnage (the dashboard total card was removed by design).
  await page.click("#open-calendar");
  await page.click(".calendar-day.has-workout");
  await page.waitForSelector(".calendar-session");
  const sessTon = await page.locator(".calendar-session-tonnage").first().textContent();
  console.log("session tonnage:", sessTon, "(want 622 kg)");

  const pass = sessTon.includes("622");
  console.log("RESULT:", pass ? "PASS" : "FAIL");

  await browser.close();
  console.log("ERRORS:", errors.length ? errors : "(none)");
  process.exit(pass && !errors.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(2); });
