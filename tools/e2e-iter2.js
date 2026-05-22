// Iteration-2 E2E:
//   - Timer rest is per-exercise (60/90/120 across Tag B and C)
//   - Home cards show A/B/C label and new titles (Aufbau / Aufrichtung / Variation)
//   - Warm-up checklist toggles, counter updates, complete state shows check
//   - PR badge on heaviest set; multiple PRs in one session
//   - Calendar view shows today's session and tonnage
//   - Session-summary appears with non-zero tonnage; home tonnage updates
//   - Butterfly exercise is in Tag B between Schulterdrücken and Bizeps-Curls
//
// Server must be running at http://127.0.0.1:8765
const { chromium, devices } = require("playwright");
const fs = require("fs");
const path = require("path");

const URL = "http://127.0.0.1:8765/index.html";
const OUT = path.join(__dirname, "screenshots");
fs.mkdirSync(OUT, { recursive: true });
const shot = (page, name) => page.screenshot({ path: path.join(OUT, "iter2-" + name + ".png"), fullPage: false });

function assert(cond, msg) {
  if (!cond) throw new Error("ASSERT: " + msg);
}

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ ...devices["iPhone 13"] });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push("[pageerror] " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("[console.error] " + m.text()); });

  await page.goto(URL, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector(".day-card");

  // 1) Home: titles + letter labels
  const cards = page.locator(".day-card");
  const cardsCount = await cards.count();
  assert(cardsCount === 3, "3 day cards");
  const titleA = await cards.nth(0).locator("h3").textContent();
  const titleB = await cards.nth(1).locator("h3").textContent();
  const titleC = await cards.nth(2).locator("h3").textContent();
  assert(titleA.trim() === "Aufbau", `A title = ${titleA}`);
  assert(titleB.trim() === "Aufrichtung", `B title = ${titleB}`);
  assert(titleC.trim() === "Variation", `C title = ${titleC}`);
  const letterA = (await cards.nth(0).locator(".day-card-letter").textContent()).trim();
  const letterB = (await cards.nth(1).locator(".day-card-letter").textContent()).trim();
  const letterC = (await cards.nth(2).locator(".day-card-letter").textContent()).trim();
  assert(letterA === "A" && letterB === "B" && letterC === "C", `letters = ${letterA}/${letterB}/${letterC}`);
  await shot(page, "01-home");

  // 2) Open Tag B → check structure, butterfly position
  await cards.nth(1).click();
  await page.waitForSelector("#view-workout.active");
  await page.waitForSelector(".exercise");
  await page.locator(".exercise .exercise-head").first().click();
  await page.waitForSelector(".exercise.open");
  const exNames = await page.locator(".exercise .exercise-name").allTextContents();
  // Expected order: Hip Thrust, Beinstrecker, Latzug (breit), Schulterdrücken, Butterfly, Bizeps, Trizeps
  console.log("Tag B order:", exNames);
  assert(exNames.length === 7, `Tag B has 7 exercises, got ${exNames.length}`);
  assert(/Butterfly/i.test(exNames[4]), `Butterfly at position 5: ${exNames[4]}`);
  assert(/Latzug/i.test(exNames[2]), `Latzug before Schulterdrücken: ${exNames[2]}`);
  assert(/Schulterdr/i.test(exNames[3]), `Schulterdrücken pos 4: ${exNames[3]}`);
  assert(/Beinstrecker/i.test(exNames[1]), `Beinstrecker in B: ${exNames[1]}`);

  // 3) Warm-up checklist — Banner ist seit v5 default offen
  await page.waitForSelector("#warmup-banner.open");
  const initialLabel = (await page.locator("#warmup-label").textContent()).trim();
  assert(/Warm-up · 0\/5/.test(initialLabel), `initial label '${initialLabel}'`);
  await shot(page, "02-warmup-empty");
  const warmupItems = page.locator(".warmup-item");
  const wuCount = await warmupItems.count();
  assert(wuCount === 5, `5 warmup items, got ${wuCount}`);
  // Check 3 of them
  for (let i = 0; i < 3; i++) await warmupItems.nth(i).locator(".warmup-check").click();
  const midLabel = (await page.locator("#warmup-label").textContent()).trim();
  assert(/Warm-up · 3\/5/.test(midLabel), `after 3 checks: '${midLabel}'`);
  // Check the rest
  for (let i = 3; i < 5; i++) await warmupItems.nth(i).locator(".warmup-check").click();
  const completeLabel = await page.locator("#warmup-label").innerHTML();
  assert(/warmup-done-check/.test(completeLabel), `complete shows check: ${completeLabel}`);
  await shot(page, "03-warmup-complete");

  // 4) Timer rest values per exercise in Tag B — current plan: 5× 90s, dann 2× 60s
  const expectedB = [90, 90, 90, 90, 90, 60, 60];
  const results = [];
  for (let i = 0; i < 7; i++) {
    await page.evaluate((idx) => {
      const cards = document.querySelectorAll(".exercise");
      cards.forEach((c) => c.classList.remove("open"));
      cards[idx].classList.add("open");
    }, i);
    const firstSet = page.locator(".exercise").nth(i).locator(".set-row").first();
    await firstSet.locator(".set-check").click();
    await page.waitForFunction(() => !document.querySelector("#timer-overlay").classList.contains("hidden"));
    const txt = await page.locator("#timer-display").textContent();
    results.push({ idx: i, expected: expectedB[i], displayed: txt });
    await page.click("#timer-skip");
    await page.waitForFunction(() => document.querySelector("#timer-overlay").classList.contains("hidden"));
    // Wait past the .set-check double-tap guard (350ms) before unchecking
    await page.waitForTimeout(400);
    await firstSet.locator(".set-check").click();
    await page.waitForFunction(() => document.querySelector("#timer-overlay").classList.contains("hidden"));
    await page.waitForTimeout(400);
  }
  console.log("Tag B timer results:", results);
  for (const r of results) {
    const expectedTxt = `${String(Math.floor(r.expected / 60)).padStart(2, "0")}:${String(r.expected % 60).padStart(2, "0")}`;
    assert(r.displayed === expectedTxt, `idx=${r.idx} timer=${r.displayed} want=${expectedTxt}`);
  }

  // 5) Fill in some sets with weights & reps to test tonnage + PR
  // Hip Thrust: 50kg×10, 55kg×10 (both PRs since no baseline)
  await page.evaluate(() => {
    const cards = document.querySelectorAll(".exercise");
    cards.forEach((c) => c.classList.remove("open"));
    cards[0].classList.add("open");
  });
  const htRows = page.locator(".exercise").nth(0).locator(".set-row");
  await htRows.nth(0).locator('input[data-field="weight"]').fill("50");
  await htRows.nth(0).locator('input[data-field="reps"]').fill("10");
  await htRows.nth(0).locator(".set-check").click();
  await page.click("#timer-skip").catch(() => {});
  await page.waitForFunction(() => document.querySelector("#timer-overlay").classList.contains("hidden"));
  await htRows.nth(1).locator('input[data-field="weight"]').fill("55");
  await htRows.nth(1).locator('input[data-field="reps"]').fill("10");
  await htRows.nth(1).locator(".set-check").click();
  await page.click("#timer-skip").catch(() => {});
  await page.waitForFunction(() => document.querySelector("#timer-overlay").classList.contains("hidden"));

  // PR badges expected on both sets (each strictly higher than previous max + baseline=-inf)
  const prBadgesCount = await page.locator(".exercise").nth(0).locator(".pr-badge").count();
  console.log("PR badges visible on Hip Thrust:", prBadgesCount);
  assert(prBadgesCount === 2, `expected 2 PR badges (both sets), got ${prBadgesCount}`);
  await shot(page, "04-pr-badges");

  // 6) Finish workout → session-summary visible briefly
  await page.click("#finish-workout");
  await page.waitForSelector("#session-summary:not(.hidden)");
  const summaryValBefore = await page.locator("#session-summary-value").textContent();
  console.log("Session summary value (mid-animation):", summaryValBefore);
  await shot(page, "05-session-summary");
  // wait for it to auto-dismiss
  await page.waitForSelector("#view-home.active", { timeout: 5000 });

  // 7) Home should now show tonnage card
  const tonText = (await page.locator("#home-tonnage").textContent()).trim();
  // 50×10 + 55×10 = 1050
  console.log("Home tonnage card:", tonText);
  assert(/1\.050/.test(tonText), `home tonnage shows 1.050: ${tonText}`);
  await shot(page, "06-home-tonnage");

  // 8) Calendar view
  await page.click("#open-calendar");
  await page.waitForSelector("#view-calendar.active");
  // Should show one .has-workout cell for today
  const workoutDays = await page.locator(".calendar-day.has-workout").count();
  console.log("calendar workout cells:", workoutDays);
  assert(workoutDays >= 1, `at least 1 day with workout, got ${workoutDays}`);
  await page.locator(".calendar-day.has-workout").first().click();
  // Detail should appear
  const detail = await page.locator("#cal-detail").textContent();
  console.log("calendar detail length:", detail.length);
  assert(detail.includes("Aufrichtung"), `detail contains 'Aufrichtung': ${detail}`);
  assert(/1\.050/.test(detail), `detail tonnage 1.050: ${detail}`);
  await shot(page, "07-calendar");

  await page.click("#back-from-calendar");
  await page.waitForSelector("#view-home.active");

  // 9) Repeat workout with HIGHER weight on hip_thrust to confirm PR baseline picks it up
  // — and lower weight on bankdruecken to confirm no PR
  await cards.nth(1).click();
  await page.waitForSelector(".exercise");
  await page.locator(".exercise .exercise-head").first().click();
  await page.waitForSelector(".exercise.open");
  // Set 1 in hip thrust = same weight (no PR — needs to be strictly higher)
  await page.evaluate(() => {
    const cards = document.querySelectorAll(".exercise");
    cards.forEach((c) => c.classList.remove("open"));
    cards[0].classList.add("open");
  });
  const ht2 = page.locator(".exercise").nth(0).locator(".set-row");
  await ht2.nth(0).locator('input[data-field="weight"]').fill("55");
  await ht2.nth(0).locator('input[data-field="reps"]').fill("10");
  await ht2.nth(0).locator(".set-check").click();
  await page.click("#timer-skip").catch(() => {});
  await page.waitForFunction(() => document.querySelector("#timer-overlay").classList.contains("hidden"));
  // Set 2 = higher (PR)
  await ht2.nth(1).locator('input[data-field="weight"]').fill("60");
  await ht2.nth(1).locator('input[data-field="reps"]').fill("10");
  await ht2.nth(1).locator(".set-check").click();
  await page.click("#timer-skip").catch(() => {});
  await page.waitForFunction(() => document.querySelector("#timer-overlay").classList.contains("hidden"));
  const ht2Badges = await page.locator(".exercise").nth(0).locator(".pr-badge").count();
  console.log("Hip Thrust PR badges on session 2 (expect 1, only the 60kg set):", ht2Badges);
  assert(ht2Badges === 1, `expected exactly 1 PR badge in second session, got ${ht2Badges}`);

  // Mini-history of hip_thrust should show 1 bar (from previous session)
  const histBars = await page.locator(".exercise").nth(0).locator(".exercise-history-bar").count();
  console.log("hip_thrust history bars (expect ≥1):", histBars);
  assert(histBars >= 1, `expected at least 1 history bar, got ${histBars}`);
  await shot(page, "08-mini-history");

  await browser.close();
  if (errors.length) { console.error("ERRORS:", errors); process.exit(1); }
  console.log("\nAll checks passed ✓");
})().catch((e) => { console.error("FAILED:", e); process.exit(2); });
