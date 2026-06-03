// Test: Live-Session-Persistenz (Increment 1).
// Startet einen eigenen statischen Server, prüft dass eine laufende Einheit
// einen Reload übersteht und beim Beenden/Abbrechen aufgeräumt wird.
const { chromium, devices } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml" };

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split("?")[0]);
      if (p === "/") p = "/index.html";
      const file = path.join(ROOT, p);
      if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

const assert = (cond, msg) => { if (!cond) throw new Error("FAIL: " + msg); console.log("  ok — " + msg); };

(async () => {
  const server = await startServer();
  const URL = `http://127.0.0.1:${server.address().port}/index.html`;
  const browser = await chromium.launch();
  const context = await browser.newContext({ ...devices["iPhone 13"] });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push("[pageerror] " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("[console.error] " + m.text()); });

  try {
    // Service Worker hier neutralisieren (Mock) — sonst cached er alte Assets
    // zwischen Reloads. register() lehnt ab, die App fängt das ab.
    await context.addInitScript(() => {
      Object.defineProperty(navigator, "serviceWorker", {
        configurable: true,
        get: () => ({ register: () => Promise.reject(new Error("sw disabled in test")), addEventListener() {} })
      });
    });
    await page.goto(URL, { waitUntil: "networkidle" });

    // Training starten (Schnellstart-Karte) und ersten Satz abhaken.
    await page.click(".today-card");
    await page.waitForSelector("#view-workout.active");
    await page.click('.ex-card .ex-toggle');          // erste Karte aufklappen
    await page.waitForSelector('.set.active .set-go');
    await page.click('.set.active .set-go');           // Satz 1 fertig
    await page.waitForFunction(() => document.querySelectorAll('.set.done').length >= 1);
    const doneBefore = await page.$$eval('.set.done', els => els.length);
    assert(doneBefore >= 1, `vor Reload ${doneBefore} Satz/Sätze abgehakt`);

    // Reload mitten im Training.
    await page.goto(URL, { waitUntil: "networkidle" });
    await page.waitForSelector("#view-workout.active", { timeout: 5000 });
    assert(true, "nach Reload direkt zurück in der Workout-Ansicht");
    const doneAfter = await page.$$eval('.set.done', els => els.length);
    assert(doneAfter === doneBefore, `abgehakte Sätze überleben Reload (${doneAfter})`);

    // ── Skip (Increment 2) ──
    // Ringnenner vor Skip merken (Gesamt-Sätze).
    const totalBefore = await page.evaluate(() => {
      const m = document.querySelector("#workout-ring-label").textContent.match(/\/(\d+)/);
      return m ? +m[1] : null;
    });
    // Letzte Übung aufklappen und „Heute auslassen".
    const lastToggle = await page.$$('.ex-card .ex-toggle');
    await lastToggle[lastToggle.length - 1].click();
    await page.waitForSelector('.ex-skip');
    await page.$$eval('.ex-skip', els => els[els.length - 1].click());
    await page.waitForSelector('.ex-card.skipped');
    assert(true, "Übung zeigt 'übersprungen'-Zustand (eigene Karte)");
    const totalAfter = await page.evaluate(() => {
      const m = document.querySelector("#workout-ring-label").textContent.match(/\/(\d+)/);
      return m ? +m[1] : null;
    });
    assert(totalAfter < totalBefore, `übersprungene Sätze raus aus Nenner (${totalBefore} → ${totalAfter})`);
    const skipNote = await page.textContent("#workout-tonnage");
    assert(/übersprungen/.test(skipNote), `Statuszeile weist Skip aus: "${skipNote.trim()}"`);
    // Skip überlebt Reload.
    await page.goto(URL, { waitUntil: "networkidle" });
    await page.waitForSelector("#view-workout.active");
    assert(await page.$('.ex-card.skipped') !== null, "übersprungen überlebt Reload");
    // Wieder aufnehmen.
    await page.click('.ex-resume');
    await page.waitForFunction(() => !document.querySelector('.ex-card.skipped'));
    assert(true, "Übung wieder aufgenommen (reversibel)");

    // ── Übung hinzufügen (Increment 3) ──
    const exCountBefore = await page.$$eval('.ex-card', els => els.length);
    await page.click("#add-exercise");
    await page.waitForSelector("#picker.visible");
    assert(!(await page.$eval("#picker-search", el => el.classList.contains("hidden"))), "Picker zeigt Suchfeld");
    await page.fill("#picker-search", "lieg");
    await page.waitForFunction(() => document.querySelectorAll('.picker-option').length >= 1);
    const optCount = await page.$$eval('.picker-option', els => els.length);
    assert(optCount >= 1, `Suche filtert (${optCount} Treffer für "lieg")`);
    await page.click('.picker-option');
    await page.waitForFunction((n) => document.querySelectorAll('.ex-card').length === n + 1, exCountBefore);
    assert(await page.$('.ex-added') !== null, "neue Übung trägt Badge 'Zusatz heute'");
    // Hinzugefügte Übung überlebt Reload.
    await page.goto(URL, { waitUntil: "networkidle" });
    await page.waitForSelector("#view-workout.active");
    assert(await page.$$eval('.ex-card', els => els.length) === exCountBefore + 1, "hinzugefügte Übung überlebt Reload");

    // Beenden → aktive Session wird aufgeräumt.
    await page.click("#finish-workout");
    await page.waitForSelector("#view-home.active", { timeout: 5000 });
    const stored = await page.evaluate(() => localStorage.getItem("gym.v1.activeSession"));
    assert(stored === null, "activeSession nach Beenden gelöscht");

    // Reload auf Home bleibt Home (kein Wiederaufleben).
    await page.goto(URL, { waitUntil: "networkidle" });
    await page.waitForSelector("#view-home.active", { timeout: 5000 });
    assert(true, "Reload auf Home bleibt Home");

    // Neue Einheit desselben Workouts → MUSS wieder leer sein (Kern der
    // „nur für heute"-Regel): kein Zusatz, nichts übersprungen.
    await page.click(".today-card");
    await page.waitForSelector("#view-workout.active");
    const exCountNew = await page.$$eval('.ex-card', els => els.length);
    assert(exCountNew === exCountBefore, `neue Einheit ohne den Zusatz von vorhin (${exCountNew} == ${exCountBefore})`);
    assert(await page.$('.ex-card.skipped') === null, "neue Einheit ohne übersprungene Übungen");
    assert(await page.$('.ex-added') === null, "neue Einheit ohne 'Zusatz heute'-Badge");

    // Abbrechen → aktive Session wird aufgeräumt.
    await page.click("#back-home");
    await page.waitForSelector("#sheet.visible");
    await page.click("#sheet-confirm");               // "Abbrechen" bestätigen
    await page.waitForSelector("#view-home.active");
    const storedAfterAbort = await page.evaluate(() => localStorage.getItem("gym.v1.activeSession"));
    assert(storedAfterAbort === null, "activeSession nach Abbrechen gelöscht");

    if (errors.length) throw new Error("Konsolen-/Page-Fehler:\n" + errors.join("\n"));
    console.log("\n✓ Alle Persistenz-Checks bestanden.");
  } catch (e) {
    console.error("\n✗ " + e.message);
    if (errors.length) console.error(errors.join("\n"));
    process.exitCode = 1;
  } finally {
    await browser.close();
    server.close();
  }
})();
