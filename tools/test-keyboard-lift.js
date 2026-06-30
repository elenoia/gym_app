// Bottom-Sheet hebt sich über die Bildschirmtastatur: Suche darf die
// Trefferliste nicht verdecken. Testet den CSS-Vertrag (--kb) deterministisch,
// indem --kb am #picker simuliert wird (unabhängig vom VisualViewport-Listener).
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

    // Tastatur simulieren: --kb direkt am #picker setzen (gewinnt über :root).
    const KB = 320;
    await page.evaluate((kb) => document.querySelector("#picker").style.setProperty("--kb", kb + "px"), KB);
    await page.waitForTimeout(320); // padding-bottom-Transition abwarten

    const innerH = await page.evaluate(() => window.innerHeight);
    const pad = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector("#picker")).paddingBottom));
    assert(Math.round(pad) === KB, `Sheet hebt sich um die Tastaturhöhe (padding-bottom ${Math.round(pad)})`);

    const searchBottom = await page.evaluate(() => document.querySelector("#picker-search").getBoundingClientRect().bottom);
    assert(searchBottom < innerH - KB, `Suchfeld liegt über der Tastatur (${Math.round(searchBottom)} < ${innerH - KB})`);

    const listBottom = await page.evaluate(() => document.querySelector("#picker-list").getBoundingClientRect().bottom);
    assert(listBottom <= innerH - KB + 2, `Trefferliste endet über der Tastatur (${Math.round(listBottom)})`);
    const firstTop = await page.evaluate(() => { const o = document.querySelector("#picker-list .picker-option"); return o ? o.getBoundingClientRect().top : null; });
    assert(firstTop != null && firstTop < innerH - KB, "erste Übung sichtbar (nicht von der Tastatur verdeckt)");

    // Ohne Tastatur kein zusätzliches Padding.
    await page.evaluate(() => document.querySelector("#picker").style.removeProperty("--kb"));
    await page.waitForTimeout(320);
    const pad0 = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector("#picker")).paddingBottom));
    assert(pad0 === 0, "ohne Tastatur kein zusätzliches Padding (0)");

    if (errors.length) throw new Error("Konsolen-/Page-Fehler:\n" + errors.join("\n"));
    console.log("\n✓ Tastatur-Lift OK.");
  } catch (e) {
    console.error("\n✗ " + e.message);
    if (errors.length) console.error(errors.join("\n"));
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
