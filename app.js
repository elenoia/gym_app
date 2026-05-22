/**
 * Hauptlogik der App.
 *
 * Speicherung: alles in localStorage unter "gym.v1.*"-Keys.
 * Wenn localStorage nicht verfügbar ist (Safari Private Mode etc.),
 * läuft alles über einen In-Memory-Fallback weiter — Workouts gehen
 * dann nur für die Session, aber die App stürzt nicht ab.
 */

(() => {
  // ─── Storage (defensiv, versioniert) ─────────────────
  const STORAGE_PREFIX = "gym.v1.";
  const memoryStore = new Map();
  let storageAvailable = (() => {
    try {
      const k = STORAGE_PREFIX + "_probe";
      localStorage.setItem(k, "1");
      localStorage.removeItem(k);
      return true;
    } catch {
      return false;
    }
  })();

  function storageGet(key) {
    const fullKey = STORAGE_PREFIX + key;
    if (storageAvailable) {
      try { return localStorage.getItem(fullKey); }
      catch { storageAvailable = false; }
    }
    return memoryStore.has(fullKey) ? memoryStore.get(fullKey) : null;
  }
  function storageSet(key, value) {
    const fullKey = STORAGE_PREFIX + key;
    if (storageAvailable) {
      try { localStorage.setItem(fullKey, value); return; }
      catch { storageAvailable = false; }
    }
    memoryStore.set(fullKey, value);
  }
  function storageRemove(key) {
    const fullKey = STORAGE_PREFIX + key;
    if (storageAvailable) {
      try { localStorage.removeItem(fullKey); }
      catch { storageAvailable = false; }
    }
    memoryStore.delete(fullKey);
  }

  // Einmalige Migration: alte unversionierte Keys übernehmen.
  (function migrate() {
    if (!storageAvailable) return;
    const old = ["gym.settings", "gym.history", "gym.lastWeights"];
    for (const oldKey of old) {
      try {
        const val = localStorage.getItem(oldKey);
        if (val == null) continue;
        const newKey = STORAGE_PREFIX + oldKey.replace("gym.", "");
        if (localStorage.getItem(newKey) == null) {
          localStorage.setItem(newKey, val);
        }
        localStorage.removeItem(oldKey);
      } catch { /* ignore */ }
    }
  })();

  function loadJSON(key, fallback) {
    const raw = storageGet(key);
    if (raw == null) return fallback;
    try { return JSON.parse(raw); }
    catch { return fallback; }
  }
  function saveJSON(key, value) {
    storageSet(key, JSON.stringify(value));
  }

  // ─── State ───────────────────────────────────────────
  const state = {
    currentDay: null,
    workout: null,
    timer: null,
    settings: loadSettings()
  };

  // ─── DOM-Refs ────────────────────────────────────────
  const $ = (sel) => document.querySelector(sel);
  const views = {
    home: $("#view-home"),
    workout: $("#view-workout"),
    settings: $("#view-settings"),
    calendar: $("#view-calendar")
  };

  // ─── Settings ────────────────────────────────────────
  function loadSettings() {
    const defaults = { sound: true, vibration: true, defaultRest: 90 };
    return { ...defaults, ...loadJSON("settings", {}) };
  }
  function saveSettings() { saveJSON("settings", state.settings); }

  // ─── Verlauf ─────────────────────────────────────────
  function loadHistory()      { return loadJSON("history", []); }
  function saveHistory(h)     { saveJSON("history", h); }
  function loadLastWeights()  { return loadJSON("lastWeights", {}); }
  function saveLastWeights(w) { saveJSON("lastWeights", w); }

  function getLastSessionForDay(day) {
    const history = loadHistory();
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].day === day) return history[i];
    }
    return null;
  }

  function formatLastDone(day) {
    const last = getLastSessionForDay(day);
    if (!last) return "Noch nicht trainiert";
    const date = new Date(last.date);
    const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return "Heute trainiert";
    if (days === 1) return "Gestern trainiert";
    if (days < 7) return `Vor ${days} Tagen`;
    return date.toLocaleDateString("de-DE", { day: "numeric", month: "short" });
  }

  // ─── Navigation ──────────────────────────────────────
  function showView(name) {
    Object.values(views).forEach(v => v.classList.remove("active"));
    views[name].classList.add("active");
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  // ─── Tonnage / PR-Helfer ─────────────────────────────
  function sessionTonnage(session) {
    let t = 0;
    for (const ex of session.exercises) {
      for (const s of ex.sets) {
        if (!s.done) continue;
        const w = parseFloat(s.weight);
        const r = parseFloat(s.reps);
        if (Number.isFinite(w) && Number.isFinite(r)) t += w * r;
      }
    }
    return t;
  }
  function totalTonnage() {
    return loadHistory().reduce((sum, s) => sum + sessionTonnage(s), 0);
  }
  function formatKg(n) {
    const rounded = Math.round(n);
    return rounded.toLocaleString("de-DE");
  }
  // Map exId → bisheriges Max-Gewicht über alle Sessions (nur abgehakte Sätze)
  function buildPRMap() {
    const map = {};
    for (const session of loadHistory()) {
      for (const ex of session.exercises) {
        for (const s of ex.sets) {
          if (!s.done) continue;
          const w = parseFloat(s.weight);
          if (!Number.isFinite(w)) continue;
          if (map[ex.id] == null || w > map[ex.id]) map[ex.id] = w;
        }
      }
    }
    return map;
  }

  // ─── Home rendern ────────────────────────────────────
  function renderHome() {
    const grid = $("#day-grid");
    grid.innerHTML = "";
    Object.entries(PLAN).forEach(([key, day]) => {
      const card = document.createElement("button");
      card.className = "day-card";
      card.innerHTML = `
        <div class="day-card-content">
          <span class="day-card-letter">${key}</span>
          <h3>${day.title}</h3>
          <p>${day.subtitle}</p>
          <p class="last-done">${formatLastDone(key)}</p>
        </div>
        <div class="day-card-arrow">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
      `;
      card.addEventListener("click", () => startWorkout(key));
      grid.appendChild(card);
    });
    renderTonnageCard();
  }

  function renderTonnageCard() {
    const host = $("#home-tonnage");
    if (!host) return;
    const t = totalTonnage();
    if (t <= 0) { host.innerHTML = ""; host.classList.add("hidden"); return; }
    host.classList.remove("hidden");
    host.innerHTML = `
      <span class="tonnage-label">Insgesamt bewegt</span>
      <span class="tonnage-value">${formatKg(t)} kg</span>
    `;
  }

  // ─── Workout starten ─────────────────────────────────
  function startWorkout(dayKey) {
    const day = PLAN[dayKey];
    const lastWeights = loadLastWeights();
    const last = getLastSessionForDay(dayKey);

    state.currentDay = dayKey;
    const prBaseline = buildPRMap();
    state.workout = {
      day: dayKey,
      startedAt: Date.now(),
      warmupDone: WARMUP_ITEMS.map(() => false),
      prBaseline,
      exercises: day.exercises.map(ex => {
        const lastEx = last ? last.exercises.find(e => e.id === ex.id) : null;
        const defaultWeight = lastWeights[ex.id] ?? "";
        return {
          id: ex.id,
          sets: Array.from({ length: ex.sets }, (_, i) => ({
            weight: lastEx?.sets?.[i]?.weight ?? defaultWeight,
            reps: lastEx?.sets?.[i]?.reps ?? "",
            done: false,
            // Hinweis fürs UI: letztes Mal pro Satz (kann null sein)
            lastWeight: lastEx?.sets?.[i]?.weight ?? null,
            lastReps: lastEx?.sets?.[i]?.reps ?? null
          })),
          // rest: plan-spezifischer Wert ist Wahrheit. Settings-Default ist
          // nur Fallback, falls in plan.js keiner gesetzt ist.
          rest: (typeof ex.rest === "number" && ex.rest > 0) ? ex.rest : state.settings.defaultRest,
          repsLow: ex.repsLow,
          repsHigh: ex.repsHigh,
          expanded: false
        };
      })
    };

    renderWorkout();
    showView("workout");
  }

  // ─── Warm-up als Checkliste ──────────────────────────
  function renderWarmup() {
    const content = $("#warmup-content");
    content.innerHTML = WARMUP_ITEMS.map((text, i) => `
      <div class="warmup-item${state.workout.warmupDone[i] ? " done" : ""}" data-warmup="${i}">
        <button class="warmup-check${state.workout.warmupDone[i] ? " done" : ""}" aria-label="Warm-up-Punkt abhaken">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </button>
        <span class="warmup-text">${text}</span>
      </div>
    `).join("");
    content.querySelectorAll(".warmup-item").forEach(row => {
      const i = parseInt(row.dataset.warmup, 10);
      row.querySelector(".warmup-check").addEventListener("click", (e) => {
        e.stopPropagation();
        state.workout.warmupDone[i] = !state.workout.warmupDone[i];
        row.classList.toggle("done");
        row.querySelector(".warmup-check").classList.toggle("done");
        updateWarmupLabel();
      });
    });
    updateWarmupLabel();
  }

  function updateWarmupLabel() {
    const total = WARMUP_ITEMS.length;
    const done = state.workout.warmupDone.filter(Boolean).length;
    const label = $("#warmup-label");
    if (done === total) {
      label.innerHTML = `Warm-up <svg class="warmup-done-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
      label.classList.add("complete");
    } else {
      label.textContent = `Warm-up · ${done}/${total}`;
      label.classList.remove("complete");
    }
  }

  // ─── Mini-Verlauf einer Übung (letzte 5 Sessions) ────
  function renderExerciseHistory(exId) {
    const history = loadHistory();
    // Sammle die letzten 5 Sessions, in denen diese Übung mit gültigen Daten vorkommt.
    const points = [];
    for (let i = history.length - 1; i >= 0 && points.length < 5; i--) {
      const session = history[i];
      const ex = session.exercises.find(e => e.id === exId);
      if (!ex) continue;
      const maxW = ex.sets.reduce((m, s) => {
        if (!s.done) return m;
        const w = parseFloat(s.weight);
        return Number.isFinite(w) && w > m ? w : m;
      }, 0);
      if (maxW <= 0) continue;
      points.push({ date: new Date(session.date), weight: maxW });
    }
    if (points.length === 0) {
      return `<div class="exercise-history"><div class="exercise-history-title">Letzte Sessions</div><div class="exercise-history-empty">Noch keine Daten</div></div>`;
    }
    points.reverse(); // älteste links
    const maxBar = Math.max(...points.map(p => p.weight));
    const bars = points.map(p => {
      const h = Math.max(4, Math.round((p.weight / maxBar) * 36));
      const d = p.date.toLocaleDateString("de-DE", { day: "numeric", month: "numeric" });
      return `
        <div class="exercise-history-item">
          <span class="exercise-history-weight">${p.weight} kg</span>
          <div class="exercise-history-bar" style="height:${h}px"></div>
          <span class="exercise-history-date">${d}</span>
        </div>`;
    }).join("");
    return `<div class="exercise-history">
      <div class="exercise-history-title">Letzte Sessions (Max. pro Tag)</div>
      <div class="exercise-history-list">${bars}</div>
    </div>`;
  }

  // ─── PR-Badges aktualisieren ─────────────────────────
  // Ein Satz ist PR, wenn er abgehakt ist und sein Gewicht strikt grösser ist
  // als das Baseline-Max aus den bisherigen Sessions UND als alle abgehakten
  // Sätze derselben Übung in dieser Session, die einen kleineren Index haben.
  // So kann auch innerhalb einer Session mehrfach ein PR gesetzt werden.
  function updatePRBadges(exObj, exIdx) {
    const baseline = state.workout.prBaseline[exObj.id] ?? -Infinity;
    let runningMax = baseline;
    exObj.sets.forEach((set, sIdx) => {
      const slot = document.querySelector(`[data-pr-slot="${exIdx}-${sIdx}"]`);
      if (!slot) return;
      const w = parseFloat(set.weight);
      const isPR = set.done && Number.isFinite(w) && w > runningMax;
      slot.innerHTML = isPR ? `<span class="pr-badge">PR</span>` : "";
      if (set.done && Number.isFinite(w) && w > runningMax) runningMax = w;
    });
  }

  // ─── Workout-Ansicht rendern ─────────────────────────
  function renderWorkout() {
    const day = PLAN[state.currentDay];
    $("#workout-title").textContent = day.title;
    updateProgress();
    renderWarmup();

    const list = $("#exercise-list");
    list.innerHTML = "";
    state.workout.exercises.forEach((ex, exIdx) => {
      const meta = EXERCISES[ex.id];
      const card = document.createElement("div");
      card.className = "exercise" + (ex.expanded ? " open" : "");

      card.innerHTML = `
        <button class="exercise-head" data-action="toggle">
          <div class="exercise-svg">${meta.svg}</div>
          <div class="exercise-meta">
            <h3 class="exercise-name">${meta.name}</h3>
            <p class="exercise-target">${meta.target} · ${ex.sets.length} × ${ex.repsLow}–${ex.repsHigh} Wdh.</p>
          </div>
          <div class="exercise-toggle">
            <svg class="chev" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
        </button>
        <div class="exercise-body">
          ${ex.sets.map((set, sIdx) => {
            const hint = (set.lastWeight != null && set.lastWeight !== "") || (set.lastReps != null && set.lastReps !== "")
              ? `Zuletzt: ${set.lastWeight ?? "–"} kg × ${set.lastReps ?? "–"}`
              : "";
            return `
            <div class="set-row${set.done ? " done" : ""}" data-set="${sIdx}">
              <div class="set-num">${sIdx + 1}</div>
              <div class="set-input-wrap">
                <input class="set-input" type="text" inputmode="decimal" autocomplete="off" enterkeyhint="next"
                       value="${set.weight}" data-field="weight" data-ex="${exIdx}" data-set="${sIdx}" placeholder="–"/>
                <span class="set-input-unit">kg</span>
              </div>
              <div class="set-input-wrap">
                <input class="set-input" type="text" inputmode="numeric" autocomplete="off" enterkeyhint="done"
                       value="${set.reps}" data-field="reps" data-ex="${exIdx}" data-set="${sIdx}" placeholder="${ex.repsLow}–${ex.repsHigh}"/>
                <span class="set-input-unit">Wdh.</span>
              </div>
              <button class="set-check${set.done ? " done" : ""}" data-check="${exIdx}-${sIdx}" aria-label="Satz abhaken">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </button>
              ${hint ? `<div class="set-hint">${hint}</div>` : ""}
              <div class="set-pr" data-pr-slot="${exIdx}-${sIdx}"></div>
            </div>`;
          }).join("")}
          ${renderExerciseHistory(ex.id)}
          <div class="exercise-notes">${meta.notes}</div>
        </div>
      `;

      // Aufklappen
      card.querySelector('[data-action="toggle"]').addEventListener("click", (e) => {
        if (e.target.closest("input")) return;
        ex.expanded = !ex.expanded;
        card.classList.toggle("open");
        if (card.classList.contains("open")) {
          requestAnimationFrame(() => {
            card.scrollIntoView({ behavior: "smooth", block: "start" });
          });
        }
      });

      // Inputs
      card.querySelectorAll(".set-input").forEach(input => {
        const persist = (e) => {
          const exIdxI = parseInt(e.target.dataset.ex);
          const sIdxI = parseInt(e.target.dataset.set);
          const field = e.target.dataset.field;
          // Akzeptiere DE-Komma und EN-Punkt gleichwertig; ignoriere alles
          // andere — sonst kann ein versehentliches "22,5" als Datenverlust
          // im abgehakten Satz landen (Tonnage = 0).
          const raw = e.target.value.trim().replace(",", ".");
          const val = raw === "" ? "" : parseFloat(raw);
          state.workout.exercises[exIdxI].sets[sIdxI][field] = val;
        };
        input.addEventListener("change", persist);
        input.addEventListener("input", persist);
      });

      // Satz abhaken — mit Doppel-Tap-Schutz
      card.querySelectorAll(".set-check").forEach(btn => {
        let busy = false;
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          if (busy) return;
          busy = true;
          setTimeout(() => { busy = false; }, 350);

          const [exI, sI] = btn.dataset.check.split("-").map(Number);
          const exObj = state.workout.exercises[exI];
          const set = exObj.sets[sI];
          set.done = !set.done;
          btn.classList.toggle("done");
          btn.closest(".set-row").classList.toggle("done");
          updateProgress();
          if (set.done) {
            startTimer(exObj.rest);
            if (set.weight !== "" && !isNaN(set.weight)) {
              const lw = loadLastWeights();
              lw[exObj.id] = set.weight;
              saveLastWeights(lw);
            }
          } else {
            // Wenn ein gerade-eben gestarteter Timer noch läuft, abbrechen
            // (Nutzerin hat Häkchen sofort zurückgenommen)
            stopTimer();
          }
          updatePRBadges(exObj, exI);
        });
      });

      list.appendChild(card);
    });

    // erste Übung default aufgeklappt
    if (state.workout.exercises.length > 0 && !state.workout.exercises.some(e => e.expanded)) {
      state.workout.exercises[0].expanded = true;
      list.firstChild.classList.add("open");
    }
    // Initialer PR-Badge-Pass (für den seltenen Fall, dass Sätze schon abgehakt sind)
    state.workout.exercises.forEach((ex, exIdx) => updatePRBadges(ex, exIdx));
  }

  function updateProgress() {
    const day = PLAN[state.currentDay];
    let done = 0, total = 0;
    state.workout.exercises.forEach(ex => {
      ex.sets.forEach(s => {
        total++;
        if (s.done) done++;
      });
    });
    $("#workout-progress").textContent = `${day.subtitle} · ${done} / ${total} Sätze`;
  }

  // ─── Timer (Wall-Clock-basiert) ──────────────────────
  // Zähle nicht mit setInterval-Dekrement, sondern berechne aus end-Timestamp.
  // Das hält die Anzeige korrekt, wenn der Tab im Hintergrund war oder der
  // Browser den Interval drosselt.
  function startTimer(seconds) {
    stopTimer();
    const now = Date.now();
    state.timer = {
      endAt: now + seconds * 1000,
      total: seconds,
      tickId: null,
      finished: false
    };
    showTimerOverlay();
    updateTimerDisplay();
    state.timer.tickId = setInterval(tickTimer, 250);
  }

  function tickTimer() {
    if (!state.timer) return;
    const remainingMs = state.timer.endAt - Date.now();
    if (remainingMs <= 0 && !state.timer.finished) {
      state.timer.finished = true;
      finishTimer();
      return;
    }
    updateTimerDisplay();
  }

  function stopTimer() {
    if (state.timer?.tickId) clearInterval(state.timer.tickId);
    state.timer = null;
    hideTimerOverlay();
  }

  function finishTimer() {
    if (state.timer?.tickId) clearInterval(state.timer.tickId);
    if (state.settings.sound) playBeep();
    if (state.settings.vibration && navigator.vibrate) {
      try { navigator.vibrate([200, 100, 200]); } catch {}
    }
    setTimeout(() => {
      hideTimerOverlay();
      state.timer = null;
    }, 500);
  }

  function updateTimerDisplay() {
    if (!state.timer) return;
    const remainingMs = state.timer.endAt - Date.now();
    const s = Math.max(0, Math.ceil(remainingMs / 1000));
    const min = Math.floor(s / 60);
    const sec = s % 60;
    $("#timer-display").textContent =
      `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }

  function showTimerOverlay() { $("#timer-overlay").classList.remove("hidden"); }
  function hideTimerOverlay() { $("#timer-overlay").classList.add("hidden"); }

  // ─── Web Audio Beep ──────────────────────────────────
  // iOS verlangt User-Gesture für ersten AudioContext.
  // Wir initialisieren beim ersten Tap und resumen, falls suspended.
  let audioCtx = null;
  function ensureAudio() {
    if (!audioCtx) {
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        audioCtx = new Ctx();
      } catch { return; }
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume().catch(() => {});
    }
  }
  // Beim ersten Click/Touch initialisieren (einmalig).
  const audioInit = () => {
    ensureAudio();
    window.removeEventListener("pointerdown", audioInit);
    window.removeEventListener("touchstart", audioInit);
  };
  window.addEventListener("pointerdown", audioInit, { once: false });
  window.addEventListener("touchstart", audioInit, { once: false });

  function playBeep() {
    ensureAudio();
    if (!audioCtx) return;
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.value = 880;
      osc.type = "sine";
      const t = audioCtx.currentTime;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.3, t + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      osc.start(t);
      osc.stop(t + 0.6);
    } catch {
      // Audio nicht verfügbar, leise scheitern
    }
  }

  // ─── Workout beenden ─────────────────────────────────
  function finishWorkout() {
    const history = loadHistory();
    const session = {
      day: state.workout.day,
      date: new Date().toISOString(),
      exercises: state.workout.exercises.map(ex => ({
        id: ex.id,
        sets: ex.sets.map(s => ({
          weight: s.weight === "" ? null : s.weight,
          reps: s.reps === "" ? null : s.reps,
          done: s.done
        }))
      }))
    };
    history.push(session);
    if (history.length > 100) history.shift();
    saveHistory(history);

    const lw = loadLastWeights();
    state.workout.exercises.forEach(ex => {
      const doneWeights = ex.sets
        .filter(s => s.done && s.weight !== "" && !isNaN(s.weight))
        .map(s => parseFloat(s.weight));
      if (doneWeights.length > 0) {
        lw[ex.id] = Math.max(...doneWeights);
      }
    });
    saveLastWeights(lw);

    const tonnage = sessionTonnage(session);
    state.workout = null;
    state.currentDay = null;

    showSessionSummary(tonnage);
  }

  // ─── Session-Summary mit Tonnage-Zähler ──────────────
  function showSessionSummary(tonnage) {
    const overlay = $("#session-summary");
    const valueEl = $("#session-summary-value");
    overlay.classList.remove("hidden");

    if (tonnage <= 0) {
      valueEl.textContent = "0";
    } else {
      // Zahlen-Hochzählen über ~1.2s
      const start = performance.now();
      const dur = 1200;
      function tick(now) {
        const t = Math.min(1, (now - start) / dur);
        const eased = 1 - Math.pow(1 - t, 3);
        const v = Math.round(tonnage * eased);
        valueEl.textContent = v.toLocaleString("de-DE");
        if (t < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }

    setTimeout(() => {
      overlay.classList.add("hidden");
      renderHome();
      showView("home");
    }, 2400);

    // Tap-to-dismiss falls Userin schneller weiter will
    const dismiss = () => {
      overlay.classList.add("hidden");
      overlay.removeEventListener("click", dismiss);
      renderHome();
      showView("home");
    };
    overlay.addEventListener("click", dismiss);
  }

  // ─── Bottom Sheet (Confirm-Ersatz) ───────────────────
  function confirmSheet({ title, message, confirmLabel = "OK", cancelLabel = "Abbrechen", danger = false }) {
    return new Promise((resolve) => {
      const sheet = $("#sheet");
      const titleEl = $("#sheet-title");
      const msgEl = $("#sheet-message");
      const okBtn = $("#sheet-confirm");
      const cancelBtn = $("#sheet-cancel");

      titleEl.textContent = title || "";
      titleEl.style.display = title ? "" : "none";
      msgEl.textContent = message || "";
      okBtn.textContent = confirmLabel;
      cancelBtn.textContent = cancelLabel;
      okBtn.classList.toggle("danger", !!danger);

      sheet.classList.remove("hidden");
      requestAnimationFrame(() => sheet.classList.add("visible"));

      function close(result) {
        sheet.classList.remove("visible");
        setTimeout(() => sheet.classList.add("hidden"), 220);
        okBtn.removeEventListener("click", onOk);
        cancelBtn.removeEventListener("click", onCancel);
        sheet.removeEventListener("click", onBackdrop);
        resolve(result);
      }
      const onOk = () => close(true);
      const onCancel = () => close(false);
      const onBackdrop = (e) => { if (e.target === sheet) close(false); };
      okBtn.addEventListener("click", onOk);
      cancelBtn.addEventListener("click", onCancel);
      sheet.addEventListener("click", onBackdrop);
    });
  }

  function infoSheet({ title, message }) {
    return confirmSheet({ title, message, confirmLabel: "OK", cancelLabel: "" }).then(() => {});
  }

  // ─── Kalender ────────────────────────────────────────
  const calendarState = { year: null, month: null, selectedDayKey: null };

  function ymdKey(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function groupHistoryByDay() {
    const map = {};
    for (const session of loadHistory()) {
      const d = new Date(session.date);
      const key = ymdKey(d);
      if (!map[key]) map[key] = [];
      map[key].push(session);
    }
    return map;
  }

  function renderCalendar() {
    const now = new Date();
    if (calendarState.year == null) {
      calendarState.year = now.getFullYear();
      calendarState.month = now.getMonth();
    }
    const { year, month } = calendarState;
    const monthName = new Date(year, month, 1).toLocaleDateString("de-DE", { month: "long", year: "numeric" });
    $("#cal-month").textContent = monthName.charAt(0).toUpperCase() + monthName.slice(1);

    const firstOfMonth = new Date(year, month, 1);
    // Montag=0 ... Sonntag=6
    const leading = (firstOfMonth.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const grid = $("#cal-grid");
    grid.innerHTML = "";

    const byDay = groupHistoryByDay();
    const todayKey = ymdKey(now);

    for (let i = 0; i < leading; i++) {
      const cell = document.createElement("div");
      cell.className = "calendar-day empty";
      grid.appendChild(cell);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dayDate = new Date(year, month, d);
      const key = ymdKey(dayDate);
      const cell = document.createElement("div");
      cell.className = "calendar-day";
      cell.textContent = String(d);
      if (key === todayKey) cell.classList.add("today");
      if (byDay[key]) {
        cell.classList.add("has-workout");
        if (calendarState.selectedDayKey === key) cell.classList.add("selected");
        cell.dataset.dayKey = key;
        cell.addEventListener("click", () => {
          calendarState.selectedDayKey = key;
          renderCalendar();
        });
      }
      grid.appendChild(cell);
    }

    renderCalendarDetail(byDay);
  }

  function renderCalendarDetail(byDay) {
    const host = $("#cal-detail");
    const key = calendarState.selectedDayKey;
    if (!key || !byDay[key]) { host.innerHTML = ""; return; }
    const sessions = byDay[key];
    const dateLabel = new Date(key).toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" });
    host.innerHTML = `<div class="calendar-session-date">${dateLabel}</div>` +
      sessions.map(session => {
        const day = PLAN[session.day];
        const dayTitle = day ? day.title : session.day;
        const t = sessionTonnage(session);
        const exHtml = session.exercises.map(ex => {
          const meta = EXERCISES[ex.id];
          const name = meta ? meta.name : ex.id;
          const sets = ex.sets
            .filter(s => s.done)
            .map(s => `${s.weight ?? "–"} kg × ${s.reps ?? "–"}`)
            .join(" · ");
          if (!sets) return "";
          return `<div class="calendar-session-ex">
            <span class="calendar-session-ex-name">${name}</span>
            <div class="calendar-session-ex-sets">${sets}</div>
          </div>`;
        }).join("");
        return `<div class="calendar-session">
          <div class="calendar-session-head">
            <span class="calendar-session-day">${dayTitle}</span>
            <span class="calendar-session-tonnage">${formatKg(t)} kg</span>
          </div>
          ${exHtml}
        </div>`;
      }).join("");
  }

  // ─── Settings-Ansicht ────────────────────────────────
  function renderSettings() {
    $("#setting-sound").checked = state.settings.sound;
    $("#setting-vibration").checked = state.settings.vibration;
    $("#setting-rest").value = state.settings.defaultRest;
    $("#storage-status").textContent = storageAvailable
      ? ""
      : "Hinweis: Browser-Speicher ist nicht verfügbar. Verlauf bleibt nur für diese Sitzung erhalten.";
  }

  // ─── Daten Export / Import ───────────────────────────
  function exportData() {
    return JSON.stringify({
      version: 1,
      exportedAt: new Date().toISOString(),
      settings: state.settings,
      history: loadHistory(),
      lastWeights: loadLastWeights()
    }, null, 2);
  }

  async function exportToClipboard() {
    const json = exportData();
    try {
      await navigator.clipboard.writeText(json);
      await infoSheet({ title: "In Zwischenablage kopiert", message: "Speichere die Daten in Notizen, Mail oder einer Datei." });
    } catch {
      const dlg = $("#export-dialog");
      $("#export-textarea").value = json;
      dlg.classList.remove("hidden");
      requestAnimationFrame(() => dlg.classList.add("visible"));
    }
  }

  function hideSheetDialog(id) {
    const dlg = $(id);
    dlg.classList.remove("visible");
    setTimeout(() => dlg.classList.add("hidden"), 220);
  }

  function importFromText(text) {
    let data;
    try { data = JSON.parse(text); }
    catch { throw new Error("Ungültiges Format — kein gültiges JSON."); }
    // Akzeptiere sowohl version (neu) als auch schemaVersion (alt) = 1.
    const v = data?.version ?? data?.schemaVersion;
    if (!data || typeof data !== "object" || v !== 1) {
      throw new Error("Unbekanntes Schema oder veraltete Version.");
    }
    if (data.settings && typeof data.settings === "object") {
      state.settings = { ...state.settings, ...data.settings };
      saveSettings();
    }
    if (Array.isArray(data.history)) saveHistory(data.history);
    if (data.lastWeights && typeof data.lastWeights === "object") saveLastWeights(data.lastWeights);
  }

  async function confirmAndImport(text) {
    const ok = await confirmSheet({
      title: "Daten importieren?",
      message: "Vorhandene Daten werden überschrieben.",
      confirmLabel: "Importieren",
      cancelLabel: "Abbrechen",
      danger: true
    });
    if (!ok) return false;
    try {
      importFromText(text);
      // Erfolg → Reload, wie spezifiziert
      window.location.reload();
      return true;
    } catch (e) {
      await infoSheet({ title: "Import fehlgeschlagen", message: e.message });
      return false;
    }
  }

  async function importFromClipboard() {
    let text = "";
    try {
      text = await navigator.clipboard.readText();
    } catch {
      const dlg = $("#import-dialog");
      $("#import-textarea").value = "";
      dlg.classList.remove("hidden");
      requestAnimationFrame(() => dlg.classList.add("visible"));
      return;
    }
    await confirmAndImport(text);
  }

  // ─── Event-Listener ──────────────────────────────────
  function setupEvents() {
    $("#back-home").addEventListener("click", async () => {
      const ok = await confirmSheet({
        title: "Training abbrechen?",
        message: "Der Fortschritt der laufenden Session wird nicht gespeichert.",
        confirmLabel: "Abbrechen",
        cancelLabel: "Weiter trainieren",
        danger: true
      });
      if (ok) {
        stopTimer();
        state.workout = null;
        showView("home");
      }
    });

    $("#finish-workout").addEventListener("click", async () => {
      const anyDone = state.workout.exercises.some(ex => ex.sets.some(s => s.done));
      if (!anyDone) {
        const ok = await confirmSheet({
          title: "Noch kein Satz abgehakt",
          message: "Trotzdem beenden?",
          confirmLabel: "Beenden",
          cancelLabel: "Zurück"
        });
        if (!ok) return;
      }
      stopTimer();
      finishWorkout();
    });

    $("#open-settings").addEventListener("click", () => {
      renderSettings();
      showView("settings");
    });

    $("#back-from-settings").addEventListener("click", () => {
      showView(state.workout ? "workout" : "home");
    });

    $("#open-calendar").addEventListener("click", () => {
      renderCalendar();
      showView("calendar");
    });
    $("#back-from-calendar").addEventListener("click", () => showView("home"));
    $("#cal-prev").addEventListener("click", () => {
      calendarState.month -= 1;
      if (calendarState.month < 0) { calendarState.month = 11; calendarState.year -= 1; }
      calendarState.selectedDayKey = null;
      renderCalendar();
    });
    $("#cal-next").addEventListener("click", () => {
      calendarState.month += 1;
      if (calendarState.month > 11) { calendarState.month = 0; calendarState.year += 1; }
      calendarState.selectedDayKey = null;
      renderCalendar();
    });

    $("#setting-sound").addEventListener("change", (e) => {
      state.settings.sound = e.target.checked;
      saveSettings();
    });
    $("#setting-vibration").addEventListener("change", (e) => {
      state.settings.vibration = e.target.checked;
      saveSettings();
    });
    $("#setting-rest").addEventListener("change", (e) => {
      state.settings.defaultRest = parseInt(e.target.value) || 90;
      saveSettings();
    });

    $("#reset-data").addEventListener("click", async () => {
      const ok = await confirmSheet({
        title: "Alle Daten löschen?",
        message: "Verlauf und gespeicherte Gewichte werden unwiderruflich entfernt.",
        confirmLabel: "Löschen",
        cancelLabel: "Abbrechen",
        danger: true
      });
      if (ok) {
        storageRemove("history");
        storageRemove("lastWeights");
        await infoSheet({ title: "Daten gelöscht", message: "Verlauf und Gewichte sind zurückgesetzt." });
        renderHome();
      }
    });

    $("#export-data").addEventListener("click", exportToClipboard);
    $("#import-data").addEventListener("click", importFromClipboard);

    // Export-Fallback-Dialog schliessen
    $("#export-dialog-close").addEventListener("click", () => hideSheetDialog("#export-dialog"));
    $("#export-copy").addEventListener("click", async () => {
      try { await navigator.clipboard.writeText($("#export-textarea").value); } catch {}
    });

    // Import-Fallback-Dialog
    $("#import-dialog-close").addEventListener("click", () => hideSheetDialog("#import-dialog"));
    $("#import-apply").addEventListener("click", async () => {
      const text = $("#import-textarea").value;
      hideSheetDialog("#import-dialog");
      await confirmAndImport(text);
    });

    $("#warmup-toggle").addEventListener("click", () => {
      $("#warmup-banner").classList.toggle("open");
    });

    $("#timer-skip").addEventListener("click", stopTimer);
    $("#timer-plus").addEventListener("click", () => {
      if (state.timer) {
        state.timer.endAt += 15 * 1000;
        updateTimerDisplay();
      }
    });
    $("#timer-minus").addEventListener("click", () => {
      if (state.timer) {
        state.timer.endAt = Math.max(Date.now() + 1000, state.timer.endAt - 15 * 1000);
        updateTimerDisplay();
      }
    });
  }

  // ─── Service Worker ──────────────────────────────────
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").then(reg => {
        // Periodisch nach Update suchen, ohne den User zu stören.
        // Wenn ein neuer SW aktiv wird, sanft reloaden.
        let refreshing = false;
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (refreshing) return;
          refreshing = true;
          window.location.reload();
        });
        setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
      }).catch(() => {});
    });
  }

  // ─── Initialisierung ─────────────────────────────────
  renderHome();
  setupEvents();
})();
