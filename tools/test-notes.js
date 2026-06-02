// Editable per-exercise notes (stepper-UI note toggle/edit).
const { chromium, devices } = require("playwright");
const URL = "http://127.0.0.1:8765/index.html";

async function openNoteEdit(page) {
  const ex = page.locator('.ex-card[data-ex-id="kabelrudern"]');
  await ex.locator(".ex-head").click();
  await page.waitForTimeout(150);
  // Peek shows the default note; open the editor.
  await ex.locator(".note-toggle").click();
  await page.waitForTimeout(150);
  return page.locator('textarea.note-input[data-note-ex="kabelrudern"]');
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
  await page.click('[data-day="A"]');
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
