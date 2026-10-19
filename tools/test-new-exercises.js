// Neue Übungen „Rear Delt Row“ + „Kettlebell Halo“: Daten-Modell, Alternativen
// (beidseitig), Impro-Filter, Loggen, Verlauf, PR-Liste, Wdh.-pro-Richtung-Label
// und dass vorhandene localStorage-Daten unangetastet bleiben.
const { chromium, devices } = require("playwright");
const URL = "http://127.0.0.1:8765/index.html";
const assert = (c, m) => { if (!c) throw new Error("FAIL: " + m); console.log("  ok — " + m); };

const OLD_HISTORY = [
  { day: "A", date: "2025-05-05T12:00:00.000Z", warmup: { mode: "mobility" }, flags: [], exercises: [{ id: "face_pulls", sets: [{ done: true, weight: 10, reps: 12 }] }] }
];
const OLD_WEIGHTS = { face_pulls: 10, beinpresse: 80 };

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ ...devices["iPhone 13"] });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push("[pageerror] " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("[console] " + m.text()); });

  try {
    await page.goto(URL, { waitUntil: "networkidle" });
    await page.evaluate(([h, w]) => {
      localStorage.clear();
      localStorage.setItem("gym.v1.history", JSON.stringify(h));
      localStorage.setItem("gym.v1.lastWeights", JSON.stringify(w));
    }, [OLD_HISTORY, OLD_WEIGHTS]);
    await page.reload({ waitUntil: "networkidle" });

    // ── Datenmodell ──
    const m = await page.evaluate(() => ({
      row: EXERCISES.rear_delt_row, halo: EXERCISES.kettlebell_halo,
      faceAlts: EXERCISES.face_pulls.alternatives, pullAlts: EXERCISES.rear_delt_pull.alternatives,
      lw: JSON.parse(localStorage.getItem("gym.v1.lastWeights"))
    }));
    assert(m.row.name === "Rear Delt Row (breites Kabelrudern)" && m.row.equipment === "Kabel" && !m.row.unilateral && m.row.metric === "weight", "Rear Delt Row: Kabel, bilateral, Gewicht × Wdh.");
    assert(m.halo.name === "Kettlebell Halo" && m.halo.equipment === "Kettlebell" && !m.halo.unilateral && m.halo.repsPerDirection, "Halo: Kettlebell, bilateral, Wdh. pro Richtung");
    assert(m.row.alternatives.includes("face_pulls") && m.row.alternatives.includes("rear_delt_pull"), "Row → Face Pulls + Rear Delt Pull");
    assert(m.faceAlts.includes("rear_delt_row") && m.pullAlts.includes("rear_delt_row"), "Rückverlinkung beidseitig");
    assert(m.lw.rear_delt_row === undefined && m.lw.kettlebell_halo === undefined, "frische Gewichtshistorie (kein lastWeights-Eintrag)");
    assert(/<svg/.test(m.row.svg) && /<svg/.test(m.halo.svg), "SVGs vorhanden");

    // ── Impro-Filter: Kandidaten je Region (gleiche Logik wie chooseImproExercise) ──
    const pool = await page.evaluate(() => Object.fromEntries(PLAN.I.regions.map(r => [r.key,
      Object.keys(EXERCISES).filter(id => EXERCISES[id].muscles.some(mu => r.muscles.includes(mu)))])));
    assert(pool.schultern.includes("rear_delt_row") && pool.ruecken.includes("rear_delt_row"), "Row in Impro „Schultern“ + „Rücken“");
    assert(pool.schultern.includes("kettlebell_halo") && pool.rumpf.includes("kettlebell_halo"), "Halo in Impro „Schultern“ + „Rumpf“");
    assert(!pool.brust.includes("rear_delt_row") && !pool.beine_po.includes("kettlebell_halo"), "nicht in fremden Regionen");

    // ── Impro-Session: Schultern-Slot → Rear Delt Row, Rumpf-Slot → Halo ──
    async function improSession(rowW, haloW) {
      await page.click('[data-day="I"]');
      await page.waitForSelector(".impro-choose");
      const pick = async (region, name) => {
        await page.locator(`.impro-choose[aria-label^="${region}"]`).click();
        await page.waitForSelector("#picker.visible");
        await page.locator("#picker-list .picker-option", { hasText: name }).first().click();
        await page.waitForTimeout(150);
      };
      await pick("Schultern", "Rear Delt Row");
      await pick("Rumpf", "Kettlebell Halo");
      for (const [id, w] of [["rear_delt_row", rowW], ["kettlebell_halo", haloW]]) {
        const ex = page.locator(`.ex-card[data-ex-id="${id}"]`);
        if (id === "kettlebell_halo") {
          const cap = await ex.locator(".set.active .set-cap").textContent();
          assert(cap.trim() === "Wdh. pro Richtung", "Halo: Satz-Beschriftung „Wdh. pro Richtung“");
        }
        for (let i = 0; i < 3; i++) {
          await ex.locator('.set.active .val-input[data-field="weight"]').fill(String(w));
          await ex.locator(".set.active .set-go").click();
          await page.click("#timer-skip").catch(() => {});
          await page.waitForTimeout(80);
        }
      }
      await page.click("#finish-workout");
      await page.waitForSelector("#sheet:not(.hidden)", { timeout: 1500 }).then(() => page.click("#sheet-confirm")).catch(() => {});
      await page.waitForSelector("#view-home.active");
    }
    await improSession(15, 8);
    await improSession(17.5, 10);

    const after = await page.evaluate(() => ({
      h: JSON.parse(localStorage.getItem("gym.v1.history")),
      lw: JSON.parse(localStorage.getItem("gym.v1.lastWeights"))
    }));
    assert(after.h.length === 3, `Verlauf: alte Session + 2 neue (${after.h.length})`);
    assert(after.h.some(s => s.date === OLD_HISTORY[0].date && s.exercises[0].id === "face_pulls"), "alte Session unverändert erhalten");
    assert(after.lw.face_pulls === 10 && after.lw.beinpresse === 80, "alte lastWeights erhalten");
    assert(after.lw.rear_delt_row === 17.5 && after.lw.kettlebell_halo === 10, `neue lastWeights (${after.lw.rear_delt_row} / ${after.lw.kettlebell_halo})`);

    // ── Statistik: Verlauf + PR ──
    await page.click("#open-stats");
    await page.waitForSelector("#view-stats.active");
    const prText = await page.locator(".pr-list").innerText();
    assert(/Rear Delt Row[^\n]*\n?[^\n]*17,5 kg/.test(prText), "PR Rear Delt Row = 17,5 kg");
    assert(/Kettlebell Halo[^\n]*\n?[^\n]*10 kg/.test(prText), "PR Kettlebell Halo = 10 kg");
    await page.click("#stats-pick");
    await page.waitForSelector("#picker.visible");
    await page.locator("#picker-list .picker-option", { hasText: "Rear Delt Row" }).first().click();
    await page.waitForTimeout(150);
    assert(await page.locator(".chart .chart-pt").count() === 2, "Gewichtsverlauf Rear Delt Row: 2 Punkte");
    const kv = await page.locator(".stats-kv-n").allTextContents();
    assert(/17,5 kg/.test(kv[0]) && /17,5 kg/.test(kv[1]), `zuletzt/Bestwert 17,5 kg (${kv.join(" / ")})`);
    const mg = await page.locator(".mg-row").allInnerTexts();
    assert(mg.some(t => /Hintere Schulter/.test(t)) && mg.some(t => /Rumpf/.test(t)), "Muskelgruppen-Verteilung enthält neue Gruppen");
    await page.click("#back-from-stats");

    // ── Drittes Training: Vorbelegung + „Letztes Mal“ aus neuer Historie ──
    await page.click('[data-day="I"]');
    await page.locator('.impro-choose[aria-label^="Rücken"]').click();
    await page.waitForSelector("#picker.visible");
    const rueckenOpts = await page.locator(".picker-option-label").allTextContents();
    assert(rueckenOpts.some(t => /Rear Delt Row/.test(t)), "Impro-Picker „Rücken“ zeigt Rear Delt Row");
    await page.locator("#picker-list .picker-option", { hasText: "Rear Delt Row" }).first().click();
    await page.waitForTimeout(150);
    const pre = await page.locator('.ex-card[data-ex-id="rear_delt_row"] .set.active .val-input[data-field="weight"]').inputValue();
    assert(pre === "17.5", `Gewicht mit letztem Wert vorbelegt (${pre})`);
    await page.locator('.ex-card[data-ex-id="rear_delt_row"] .ex-head').click();
    await page.waitForSelector("#view-exercise.active");
    const alts = await page.locator("#detail-alts .alt-main b").allTextContents();
    assert(alts.includes("Face Pulls") && alts.some(t => /Rear Delt Pull/.test(t)), `Detail-Alternativen (${alts.join(", ")})`);
    await page.screenshot({ path: "screenshots/new-exercises-detail.png" });

    if (errors.length) throw new Error("Konsolen-/Page-Fehler:\n" + errors.join("\n"));
    console.log("\n✓ Alle Checks für die neuen Übungen bestanden.");
  } catch (e) {
    console.error("\n✗ " + e.message);
    if (errors.length) console.error(errors.join("\n"));
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
