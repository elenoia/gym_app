// Focused test: deleting a workout session from the calendar (Bug 1).
const { chromium, devices } = require("playwright");
const URL = "http://127.0.0.1:8765/index.html";

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ ...devices["iPhone 13"] });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push("[pageerror] " + e.message));

  await page.goto(URL, { waitUntil: "networkidle" });

  // Seed two sessions on the same day (today) so we can delete one and keep one.
  const today = new Date();
  const iso1 = new Date(today.getTime()).toISOString();
  const iso2 = new Date(today.getTime() - 3 * 3600 * 1000).toISOString();
  await page.evaluate(({ iso1, iso2 }) => {
    const hist = [
      { day: "A", date: iso2, exercises: [{ id: "beinpresse", sets: [{ weight: 40, reps: 10, done: true }] }] },
      { day: "B", date: iso1, exercises: [{ id: "hip_thrust", sets: [{ weight: 50, reps: 8, done: true }] }] },
    ];
    localStorage.setItem("gym.v1.history", JSON.stringify(hist));
  }, { iso1, iso2 });

  await page.reload({ waitUntil: "networkidle" });
  await page.click("#open-calendar");
  await page.waitForSelector("#view-calendar.active");
  await page.click(".calendar-day.has-workout");
  await page.waitForSelector(".calendar-session");

  const before = await page.locator(".calendar-session").count();
  console.log("sessions before delete:", before, "(want 2)");

  // Delete the first session, confirm in the sheet.
  await page.locator(".calendar-session-delete").first().click();
  await page.waitForSelector("#sheet:not(.hidden)");
  await page.click("#sheet-confirm");
  await page.waitForTimeout(400);

  const after = await page.locator(".calendar-session").count();
  console.log("sessions after delete:", after, "(want 1)");

  // Verify it persists in storage too.
  const remaining = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("gym.v1.history")).length);
  console.log("history length in storage:", remaining, "(want 1)");

  // Delete the last one → detail area should clear and day loses marker.
  await page.locator(".calendar-session-delete").first().click();
  await page.waitForSelector("#sheet:not(.hidden)");
  await page.click("#sheet-confirm");
  await page.waitForTimeout(400);
  const emptyDetail = await page.locator("#cal-detail").innerHTML();
  const markers = await page.locator(".calendar-day.has-workout").count();
  console.log("detail empty after deleting all:", emptyDetail.trim() === "", "(want true)");
  console.log("calendar workout markers left:", markers, "(want 0)");

  // Cancel path: re-seed, open, click delete, cancel → stays.
  await page.evaluate(({ iso1 }) => {
    localStorage.setItem("gym.v1.history", JSON.stringify([
      { day: "A", date: iso1, exercises: [{ id: "beinpresse", sets: [{ weight: 40, reps: 10, done: true }] }] },
    ]));
  }, { iso1 });
  await page.reload({ waitUntil: "networkidle" });
  await page.click("#open-calendar");
  await page.click(".calendar-day.has-workout");
  await page.waitForSelector(".calendar-session");
  await page.locator(".calendar-session-delete").first().click();
  await page.waitForSelector("#sheet:not(.hidden)");
  await page.click("#sheet-cancel");
  await page.waitForTimeout(400);
  const afterCancel = await page.locator(".calendar-session").count();
  console.log("sessions after CANCEL:", afterCancel, "(want 1)");

  await browser.close();
  console.log("ERRORS:", errors.length ? errors : "(none)");
  process.exit(errors.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
