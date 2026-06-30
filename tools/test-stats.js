// Statistik-Ansicht: liest read-only aus history. Prüft Leerzustand,
// Gewichtsverlauf (Arbeitsgewicht je Session), PR-Liste, Metrik-Kennzeichnung
// (kg / Sekunden / Gegengewicht / nur Wdh.), Volumen + Muskelgruppen.
const { chromium, devices } = require("playwright");
const URL = "http://127.0.0.1:8765/index.html";
const assert = (c, m) => { if (!c) throw new Error("FAIL: " + m); console.log("  ok — " + m); };

// Bekannte History im exakten Live-Format.
const HISTORY = [
  { day: "A", date: "2025-05-05T12:00:00.000Z", warmup: { mode: "mobility" }, flags: [], exercises: [{ id: "beinpresse", sets: [{ done: true, weight: 80, reps: 10 }] }] },
  { day: "B", date: "2025-05-07T12:00:00.000Z", warmup: { mode: "mobility" }, flags: [], exercises: [{ id: "klimmzug_unterstuetzt", sets: [{ done: true, weight: 30, reps: 8, inverse: true }] }] },
  { day: "A", date: "2025-05-09T12:00:00.000Z", warmup: { mode: "mobility" }, flags: [], exercises: [{ id: "liegestuetze", sets: [{ done: true, weight: null, reps: 15 }] }] },
  { day: "A", date: "2025-05-12T12:00:00.000Z", warmup: { mode: "mobility" }, flags: [], exercises: [{ id: "beinpresse", sets: [{ done: true, weight: 90, reps: 10 }] }] },
  { day: "C", date: "2025-05-14T12:00:00.000Z", warmup: { mode: "mobility" }, flags: [], exercises: [{ id: "bosu_core", sets: [{ done: true, metric: "duration", duration: 45 }] }] },
  { day: "A", date: "2025-05-19T12:00:00.000Z", warmup: { mode: "mobility" }, flags: [], exercises: [{ id: "beinpresse", sets: [{ done: true, weight: 100, reps: 10 }] }] },
  { day: "B", date: "2025-05-21T12:00:00.000Z", warmup: { mode: "mobility" }, flags: [], exercises: [{ id: "klimmzug_unterstuetzt", sets: [{ done: true, weight: 20, reps: 8, inverse: true }] }] }
];

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ ...devices["iPhone 13"] });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push("[pageerror] " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("[console] " + m.text()); });

  try {
    await page.goto(URL, { waitUntil: "networkidle" });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: "networkidle" });

    // ── Leerzustand ──
    await page.click("#open-stats");
    await page.waitForSelector("#view-stats.active");
    assert(await page.$(".stats-empty") !== null, "Leerzustand: freundliche Meldung statt Diagramm");
    await page.click("#back-from-stats");

    // ── History injizieren (read-only-Konsum) ──
    await page.evaluate((h) => localStorage.setItem("gym.v1.history", JSON.stringify(h)), HISTORY);
    await page.reload({ waitUntil: "networkidle" });
    await page.click("#open-stats");
    await page.waitForSelector("#view-stats.active");
    assert(await page.$(".stats-empty") === null, "mit Daten: kein Leerzustand");

    // Übersicht
    const trainings = await page.locator(".stats-cell").first().locator(".stats-n").textContent();
    assert(trainings.trim() === "7", `Übersicht: 7 Trainings (${trainings.trim()})`);

    // ── Gewichtsverlauf: Beinpresse wählen → 3 Punkte, zuletzt/Best = 100 ──
    await page.click("#stats-pick");
    await page.waitForSelector("#picker.visible");
    await page.locator("#picker-list .picker-option", { hasText: "Beinpresse" }).first().click();
    await page.waitForTimeout(150);
    const pts = await page.locator(".chart .chart-pt").count();
    const hasLine = await page.locator(".chart .chart-line").count();
    assert(pts === 3, `Kurve hat 3 Punkte (Beinpresse, je Session) — ${pts}`);
    assert(hasLine === 1, "Linie zwischen den Punkten vorhanden");
    const kv = await page.locator(".stats-kv-n").allTextContents();
    assert(/100 kg/.test(kv[0]) && /100 kg/.test(kv[1]), `zuletzt + Bestwert = 100 kg (${kv.join(" / ")})`);

    // ── Inverse Übung: Kennzeichnung „niedriger = besser" + Bestwert = 20 ──
    await page.click("#stats-pick");
    await page.waitForSelector("#picker.visible");
    await page.locator("#picker-list .picker-option", { hasText: "Klimmzüge" }).first().click();
    await page.waitForTimeout(150);
    const cap = await page.locator(".stats-caption").first().textContent();
    assert(/niedriger = besser/.test(cap), "invertierte Übung sauber gekennzeichnet");
    const kvInv = await page.locator(".stats-kv-n").allTextContents();
    assert(/20 kg/.test(kvInv[1]), `inverser Bestwert = niedrigstes Gegengewicht 20 kg (${kvInv.join(" / ")})`);

    // ── PR-Liste: Werte je Metrik ──
    const prText = await page.locator(".pr-list").innerText();
    assert(/Beinpresse[\s\S]*100 kg/.test(prText), "PR Beinpresse 100 kg");
    assert(/45 s/.test(prText), "PR Zeit-Übung in Sekunden (45 s)");
    assert(/15 Wdh\./.test(prText), "Körpergewicht-Übung sauber als '15 Wdh.' statt falscher kg");
    assert(/20 kg/.test(prText), "PR invers 20 kg (niedrigstes Gegengewicht)");

    // ── Optional: Volumen-Balken + Muskelgruppen ──
    assert(await page.locator(".chart-bar").count() >= 1, "Volumen-Balkendiagramm gerendert");
    assert(await page.locator(".mg-row").count() >= 1, "Muskelgruppen-Verteilung gerendert");

    if (errors.length) throw new Error("Konsolen-/Page-Fehler:\n" + errors.join("\n"));
    console.log("\n✓ Alle Statistik-Checks bestanden.");
  } catch (e) {
    console.error("\n✗ " + e.message);
    if (errors.length) console.error(errors.join("\n"));
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
