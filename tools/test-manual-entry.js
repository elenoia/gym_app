// Manuelles Training eintragen / bearbeiten / löschen.
// Prüft: gleiches history-Format wie live, chronologische Sortierung,
// lastWeights-Neuberechnung, Validierung, verschiedene Eingabetypen.
const { chromium, devices } = require("playwright");
const URL = "http://127.0.0.1:8765/index.html";

const assert = (cond, msg) => { if (!cond) throw new Error("FAIL: " + msg); console.log("  ok — " + msg); };
const history = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("gym.v1.history") || "[]"));
const lastW = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("gym.v1.lastWeights") || "{}"));

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

    // ── Eintragen: rückdatiertes Training (normal: Beinpresse) ──
    await page.click("#open-calendar");
    await page.waitForSelector("#view-calendar.active");
    await page.click("#cal-add");
    await page.waitForSelector("#view-session-editor.active");
    await page.fill("#editor-date", "2025-06-10");
    // Plan Aufbau ist Default; Übung hinzufügen
    await page.click("#editor-add-ex");
    await page.waitForSelector("#picker.visible");
    await page.fill("#picker-search", "Beinpresse");
    await page.waitForTimeout(200);
    await page.locator("#picker-list").getByText("Beinpresse", { exact: true }).click();
    await page.waitForSelector(".editor-ex");
    // Satz 1: 100 kg × 10 ; Satz 2: 100 × 8
    await page.fill('.editor-field input[data-ex="0"][data-set="0"][data-f="weight"]', "100");
    await page.fill('.editor-field input[data-ex="0"][data-set="0"][data-f="reps"]', "10");
    await page.fill('.editor-field input[data-ex="0"][data-set="1"][data-f="weight"]', "100");
    await page.fill('.editor-field input[data-ex="0"][data-set="1"][data-f="reps"]', "8");
    // dritten (leeren) Satz entfernen, damit kein leerer Satz übrig bleibt
    await page.click('[data-del-set="0-2"]');
    await page.click("#editor-save");
    await page.waitForSelector("#view-calendar.active");

    let h = await history(page);
    assert(h.length === 1, "Session in history geschrieben");
    const s = h[0];
    assert(s.day === "A" && typeof s.date === "string", "day + ISO-date gesetzt");
    assert(Array.isArray(s.flags) && Array.isArray(s.exercises), "flags[] + exercises[] vorhanden");
    assert(s.exercises[0].id === "beinpresse" && s.exercises[0].sets.length === 2, "Übung + 2 Sätze");
    const set0 = s.exercises[0].sets[0];
    assert(set0.done === true && set0.weight === 100 && set0.reps === 10, "Set-Format wie live (done/weight/reps)");
    let lw = await lastW(page);
    assert(lw.beinpresse === 100, "lastWeights aus History neu berechnet (100)");

    // ── Eingabetyp: einseitig/split (face_pulls) ──
    await page.click("#cal-add");
    await page.waitForSelector("#view-session-editor.active");
    await page.fill("#editor-date", "2025-06-12");
    await page.click("#editor-add-ex");
    await page.waitForSelector("#picker.visible");
    await page.fill("#picker-search", "Face");
    await page.waitForTimeout(200);
    await page.locator("#picker-list .picker-option").first().click();
    await page.waitForSelector(".editor-ex");
    // unilateral → L/R-Umschalter sichtbar; auf L/R schalten
    await page.click('[data-split-ex="0"][data-split="1"]');
    await page.waitForTimeout(100);
    await page.fill('.editor-field input[data-ex="0"][data-set="0"][data-f="weightL"]', "5");
    await page.fill('.editor-field input[data-ex="0"][data-set="0"][data-f="repsL"]', "12");
    await page.fill('.editor-field input[data-ex="0"][data-set="0"][data-f="weightR"]', "4");
    await page.fill('.editor-field input[data-ex="0"][data-set="0"][data-f="repsR"]', "10");
    await page.click('[data-del-set="0-2"]');
    await page.click('[data-del-set="0-1"]');
    await page.click("#editor-save");
    await page.waitForSelector("#view-calendar.active");
    h = await history(page);
    const fp = h.find(x => x.exercises[0] && x.exercises[0].id === "face_pulls");
    assert(fp && fp.exercises[0].sets[0].split === true, "Split-Set gespeichert (split:true)");
    assert(fp.exercises[0].sets[0].weightL === 5 && fp.exercises[0].sets[0].repsR === 10, "L/R-Werte korrekt");
    assert(fp.exercises[0].sets[0].unilateral === true, "unilateral-Flag gesetzt");

    // ── Chronologische Sortierung: die rückdatierte (10.06.) muss VOR der
    //    späteren (12.06.) liegen; history[last] ist die jüngste. ──
    const dates = h.map(x => x.date);
    const sorted = [...dates].sort();
    assert(JSON.stringify(dates) === JSON.stringify(sorted), "History chronologisch aufsteigend sortiert");

    // getLastSessionForDay-Annahme: füge eine NOCH ÄLTERE A-Session ein →
    // darf NICHT als „letzte A" gelten (lastWeights bleibt 100, nicht 60).
    await page.click("#cal-add");
    await page.waitForSelector("#view-session-editor.active");
    await page.fill("#editor-date", "2025-01-01");
    await page.click("#editor-add-ex");
    await page.waitForSelector("#picker.visible");
    await page.fill("#picker-search", "Beinpresse");
    await page.waitForTimeout(200);
    await page.locator("#picker-list").getByText("Beinpresse", { exact: true }).click();
    await page.fill('.editor-field input[data-ex="0"][data-set="0"][data-f="weight"]', "60");
    await page.fill('.editor-field input[data-ex="0"][data-set="0"][data-f="reps"]', "10");
    await page.click('[data-del-set="0-2"]');
    await page.click('[data-del-set="0-1"]');
    await page.click("#editor-save");
    await page.waitForSelector("#view-calendar.active");
    lw = await lastW(page);
    assert(lw.beinpresse === 100, "rückdatierte ältere Session ändert lastWeights NICHT (bleibt 100)");
    h = await history(page);
    assert(h[0].date < h[h.length - 1].date, "älteste Session steht vorne in der History");

    // ── Validierung: leere Wdh. blockiert das Speichern ──
    await page.click("#cal-add");
    await page.waitForSelector("#view-session-editor.active");
    await page.click("#editor-add-ex");
    await page.waitForSelector("#picker.visible");
    await page.fill("#picker-search", "Butterfly");
    await page.waitForTimeout(200);
    await page.locator("#picker-list .picker-option").first().click();
    await page.fill('.editor-field input[data-ex="0"][data-set="0"][data-f="weight"]', "30"); // reps leer lassen
    await page.click("#editor-save");
    await page.waitForSelector("#sheet.visible");
    const sheetMsg = await page.textContent("#sheet-message");
    assert(/Wiederholungen/.test(sheetMsg), "Validierung: leere Wdh. wird moniert");
    await page.click("#sheet-confirm");
    await page.waitForSelector("#sheet:not(.visible)").catch(() => {});
    // korrigieren + speichern
    await page.fill('.editor-field input[data-ex="0"][data-set="0"][data-f="reps"]', "12");
    await page.click('[data-del-set="0-2"]');
    await page.click('[data-del-set="0-1"]');
    await page.click("#editor-save");
    await page.waitForSelector("#view-calendar.active");

    // ── Bearbeiten: bestehende Beinpresse-Session (100→105), kein Duplikat ──
    const countBefore = (await history(page)).length;
    h = await history(page);
    const target = h.find(x => x.exercises.some(e => e.id === "beinpresse" && e.sets[0].weight === 100));
    const td = new Date(target.date);
    const targetKey = `${td.getFullYear()}-${String(td.getMonth() + 1).padStart(2, "0")}-${String(td.getDate()).padStart(2, "0")}`;
    // Kalender auf den Zielmonat blättern — Richtung aus der Monatsanzeige ableiten.
    const MONTHS = ["januar", "februar", "märz", "april", "mai", "juni", "juli", "august", "september", "oktober", "november", "dezember"];
    const tgt = td.getFullYear() * 12 + td.getMonth();
    for (let i = 0; i < 60; i++) {
      const [mName, yStr] = (await page.textContent("#cal-month")).trim().toLowerCase().split(" ");
      const cur = (+yStr) * 12 + MONTHS.indexOf(mName);
      if (cur === tgt) break;
      await page.click(cur > tgt ? "#cal-prev" : "#cal-next");
      await page.waitForTimeout(40);
    }
    // Zieltag selektieren → Detail mit Edit-Button öffnet sich.
    await page.click(`.calendar-day[data-day-key="${targetKey}"]`);
    await page.locator(`.calendar-session-edit[data-edit-date="${target.date}"]`).click();
    await page.waitForSelector("#view-session-editor.active");
    await page.fill('.editor-field input[data-ex="0"][data-set="0"][data-f="weight"]', "105");
    await page.click("#editor-save");
    await page.waitForSelector("#view-calendar.active");
    h = await history(page);
    assert(h.length === countBefore, "Bearbeiten erzeugt kein Duplikat");
    const edited = h.find(x => x.exercises.some(e => e.id === "beinpresse" && e.sets[0].weight === 105));
    assert(!!edited, "Bearbeitung gespeichert (100 → 105)");
    lw = await lastW(page);
    assert(lw.beinpresse === 105, "lastWeights nach Bearbeiten neu berechnet (105)");

    if (errors.length) throw new Error("Konsolen-/Page-Fehler:\n" + errors.join("\n"));
    console.log("\n✓ Alle Checks zum manuellen Eintragen bestanden.");
  } catch (e) {
    console.error("\n✗ " + e.message);
    if (errors.length) console.error(errors.join("\n"));
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
