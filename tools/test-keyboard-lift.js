// Bottom-Sheet bleibt im sichtbaren Bereich über der Bildschirmtastatur: die
// Suche darf die Trefferliste nicht verdecken. Testet den CSS-Vertrag
// (--vv-height / --vv-top) deterministisch, indem die Variablen am #picker
// simuliert werden (unabhängig vom VisualViewport-Listener).
const { chromium, devices } = require("playwright");
const URL = "http://127.0.0.1:8765/index.html";
const assert = (c, m) => { if (!c) throw new Error("FAIL: " + m); console.log("  ok — " + m); };

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ ...devices["iPhone 13"] });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push("[pageerror] " + e.message));
  try {
    await page.goto(URL, { waitUntil: "networkidle" });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: "networkidle" });

    // Suchbaren Picker öffnen (Übung hinzufügen im manuellen Editor).
    await page.click("#open-calendar");
    await page.click("#cal-add");
    await page.click("#editor-add-ex");
    await page.waitForSelector("#picker.visible");

    const innerH = await page.evaluate(() => window.innerHeight);

    // Tastatur simulieren: sichtbaren Bereich um KB verkleinern, indem
    // --vv-height am #picker gesetzt wird (gewinnt über :root).
    const KB = 320;
    const visH = innerH - KB;
    await page.evaluate((h) => {
      const p = document.querySelector("#picker");
      p.style.setProperty("--vv-height", h + "px");
      p.style.setProperty("--vv-top", "0px");
    }, visH);
    await page.waitForTimeout(60);

    const sheetH = await page.evaluate(() => Math.round(document.querySelector("#picker").getBoundingClientRect().height));
    assert(sheetH === visH, `Sheet füllt genau den sichtbaren Bereich (${sheetH} == ${visH})`);

    const searchBottom = await page.evaluate(() => document.querySelector("#picker-search").getBoundingClientRect().bottom);
    assert(searchBottom <= visH, `Suchfeld liegt über der Tastatur (${Math.round(searchBottom)} <= ${visH})`);

    const listBottom = await page.evaluate(() => document.querySelector("#picker-list").getBoundingClientRect().bottom);
    assert(listBottom <= visH + 2, `Trefferliste endet über der Tastatur (${Math.round(listBottom)} <= ${visH})`);

    const firstTop = await page.evaluate(() => { const o = document.querySelector("#picker-list .picker-option"); return o ? o.getBoundingClientRect().top : null; });
    assert(firstTop != null && firstTop < visH, "erste Übung sichtbar (nicht von der Tastatur verdeckt)");

    // Ohne Tastatur füllt das Sheet die volle Höhe (Fallback 100dvh).
    await page.evaluate(() => {
      const p = document.querySelector("#picker");
      p.style.removeProperty("--vv-height");
      p.style.removeProperty("--vv-top");
    });
    await page.waitForTimeout(60);
    const fullH = await page.evaluate(() => Math.round(document.querySelector("#picker").getBoundingClientRect().height));
    assert(fullH === innerH, `ohne Tastatur volle Höhe (${fullH} == ${innerH})`);

    if (errors.length) throw new Error("Konsolen-/Page-Fehler:\n" + errors.join("\n"));
    console.log("\n✓ Sheet-Lift OK.");
  } catch (e) {
    console.error("\n✗ " + e.message);
    if (errors.length) console.error(errors.join("\n"));
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
