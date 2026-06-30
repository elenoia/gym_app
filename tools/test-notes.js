// Editable per-exercise notes (stepper-UI note toggle/edit).
const { chromium, devices } = require("playwright");
const URL = "http://127.0.0.1:8765/index.html";

async function openNoteEdit(page) {
  const ex = page.locator('.ex-card[data-ex-id="kabelrudern"]');
  const ta = page.locator('textarea.note-input[data-note-ex="kabelrudern"]');
  // Wisch-Layout: Karte ist immer offen (Kopf-Tap öffnet das Detail, nicht
  // mehr ein Aufklappen). Editor evtl. schon offen (Zustand übersteht Reload) —
  // dann direkt nutzen, sonst über den Peek-Toggle öffnen.
  if (await ta.count() === 0) {
    await ex.locator(".note-toggle").click();
    await page.waitForTimeout(150);
  }
  return ta;
}

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
  let ta = await openNoteEdit(page);
  const defaultNote = await ta.inputValue();
  console.log("default note present:", /4,5 kg/.test(defaultNote), "(want true)");

  await ta.fill("Neuer Griff, 5 kg pro Seite");
  await page.waitForTimeout(100);

  await page.reload({ waitUntil: "networkidle" });
  // Session-Persistenz: die laufende Einheit wird nach dem Reload automatisch
  // wiederhergestellt (Workout-Ansicht statt Home) — kein erneuter Tag-Start.
  await page.waitForSelector("#view-workout.active");
  await page.waitForSelector(".ex-card");
  ta = await openNoteEdit(page);
  const saved = await ta.inputValue();
  console.log("saved note:", JSON.stringify(saved), '(want "Neuer Griff, 5 kg pro Seite")');

  const pass = /4,5 kg/.test(defaultNote) && saved === "Neuer Griff, 5 kg pro Seite";
  console.log("RESULT:", pass ? "PASS" : "FAIL");

  await browser.close();
  console.log("ERRORS:", errors.length ? errors : "(none)");
  process.exit(pass && !errors.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(2); });
