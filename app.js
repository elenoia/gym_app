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
    calendar: $("#view-calendar"),
    exercise: $("#view-exercise")
  };

  // ─── Inline-Icons (stroke-based, currentColor) ───────
  const ICONS = {
    back:  `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`,
    chevR: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`,
    chevD: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`,
    check: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
    plus:  `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
    minus: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
    swap:  `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 2 21 6 17 10"/><path d="M3 6h18"/><polyline points="7 14 3 18 7 22"/><path d="M21 18H3"/></svg>`,
    skip:  `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></svg>`,
    trend: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 17 9 11 13 15 21 7"/><polyline points="15 7 21 7 21 13"/></svg>`,
    info:  `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><line x1="12" y1="11" x2="12" y2="16"/><circle cx="12" cy="7.8" r="0.4" fill="currentColor"/></svg>`,
    play:  `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor"><polygon points="6 4 20 12 6 20 6 4" fill="currentColor" stroke="none"/></svg>`,
    undo:  `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 14 4 9 9 4"/><path d="M4 9h11a5 5 0 0 1 0 10h-4"/></svg>`,
    // Batterie-Glyph für „Weniger Energie" (leerer Ladestand).
    energy: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="16" height="10" rx="2.5"/><line x1="21" y1="10" x2="21" y2="14"/><line x1="5.5" y1="12" x2="8.5" y2="12"/></svg>`,
  };

  // Mascot fürs Plan-Badge — nach Reihenfolge A/B/C/D, danach zyklisch.
  const MASCOT_KEYS = ["A", "B", "C", "D"];
  function mascotFor(idx) {
    return (typeof MASCOTS !== "undefined" && MASCOTS[MASCOT_KEYS[idx % 4]]) || "";
  }
  // "Beine, Brust" → "Beine · Brust"
  function dotted(s) { return String(s || "").replace(/\s*,\s*/g, " · "); }

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

  // ─── Aktive Session (durchführungs-gebunden) ─────────
  // Spiegelt die GERADE laufende Einheit (state.workout) in localStorage, damit
  // ein Reload mitten im Training nichts verliert. WICHTIG: rein session-/
  // durchführungs-gebunden — der Plan (plan.js) wird nie verändert. Eine NEUE
  // Einheit überschreibt den Key (startWorkout), Beenden/Abbrechen löschen ihn.
  // Dadurch sind spontane Anpassungen (Skip/Hinzufügen) automatisch „nur heute".
  function saveActiveSession() {
    if (!state.workout) return;
    saveJSON("activeSession", state.workout);
  }
  function clearActiveSession() { storageRemove("activeSession"); }
  // Lädt eine unterbrochene Einheit zurück — defensiv: nur wenn der Tag noch
  // existiert und mindestens eine bekannte Übung übrig bleibt.
  function loadActiveSession() {
    const w = loadJSON("activeSession", null);
    if (!w || typeof w !== "object" || !PLAN[w.day] || !Array.isArray(w.exercises)) return null;
    // Übungen mit zwischenzeitlich entfernter ID aussortieren (Render greift
    // direkt auf EXERCISES[id].name/.svg zu und würde sonst crashen).
    // Leere Impro-Slots (Platzhalter) bleiben erhalten, damit eine unterbrochene
    // Zusammenstellung den Reload übersteht.
    w.exercises = w.exercises.filter(ex => ex && (ex.placeholder || EXERCISES[ex.id]));
    if (!w.exercises.length) return null;
    if (!Array.isArray(w.warmupDone)) w.warmupDone = WARMUP_ITEMS.map(() => false);
    // Warm-up-Auswahl defensiv normalisieren (alte aktive Session ohne Feld).
    if (!w.warmup || typeof w.warmup !== "object") w.warmup = defaultWarmup();
    if (w.warmup.mode !== "cardio") w.warmup.mode = "mobility";
    if (!w.warmup.cardio || typeof w.warmup.cardio !== "object") w.warmup.cardio = defaultWarmup().cardio;
    if (w.warmup.cardio.kind !== "laufband") w.warmup.cardio.kind = "rudern";
    // Session-Marker defensiv (alte aktive Session ohne Feld).
    if (!w.flags || typeof w.flags !== "object") w.flags = defaultFlags();
    return w;
  }
  // Editierbare Notizen pro Übung (global, nicht pro Session): { exId: "text" }
  function loadUserNotes()    { return loadJSON("userNotes", {}); }
  function saveUserNotes(n)   { saveJSON("userNotes", n); }
  // Effektive Notiz = gespeicherte Notiz, sonst vorbelegter Default.
  function getUserNote(exId) {
    const stored = loadUserNotes()[exId];
    if (stored != null) return stored;
    return EXERCISES[exId]?.noteDefault ?? "";
  }
  function setUserNote(exId, text) {
    const notes = loadUserNotes();
    notes[exId] = text;
    saveUserNotes(notes);
  }

  // Minimal-Escape für Text, der in HTML/Textarea landet.
  // Escape für Text UND Attribut-Kontexte (deckt auch Quotes ab). Wichtig für
  // alles, was aus dem Speicher/Import stammt und per innerHTML gerendert wird.
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

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

  // ─── Tonnage / Volumen / PR-Helfer ───────────────────
  // FORMEL (Gesamtgewicht / „bewegt"):
  //
  //     Volumen = Σ über alle ABGEHAKTEN Sätze von  Gewicht × Wiederholungen
  //
  // Sonderregeln (Punkt 3 des Umbaus):
  //   • Einseitige Übungen zählen PRO SEITE:
  //       – Gemeinsamer Wert (z. B. 4,5 kg × 12) = Last pro Seite, beidseitig
  //         ausgeführt → 4,5 × 12 × 2.
  //       – Getrennt geloggt (links/rechts) → linke + rechte Seite einzeln summiert.
  //   • Körpergewichts-Übungen (Liegestütze, Hyperextension …) tragen 0 kg zur
  //     kg-Summe bei — die Wiederholungen werden trotzdem gespeichert.
  //   • Sätze ohne gültiges Gewicht ODER ohne gültige Wdh. zählen 0.
  //   • Nicht abgehakte Sätze zählen 0.
  //
  // Maßgeblich ist, was im Satz GESPEICHERT wurde: ein Satz kann seine eigene
  // `unilateral`-Markierung mitführen (vom Logging gesetzt); fehlt sie, gelten
  // die Übungs-Metadaten als Fallback.
  function num(v) {
    if (v === "" || v == null) return NaN;
    return parseFloat(v);
  }
  function sideVolume(weight, reps) {
    const w = num(weight), r = num(reps);
    return (Number.isFinite(w) && Number.isFinite(r)) ? w * r : 0;
  }
  function setVolume(set, exMeta) {
    if (!set || !set.done) return 0;
    // Zeit-Übung (Haltedauer) trägt keine kg-Tonnage. Flag entweder am Satz
    // (gespeicherte Session) oder über die Übungs-Metadaten (laufendes Workout).
    if (set.metric === "duration" || (exMeta && exMeta.metric === "duration")) return 0;
    // Invertierte Übung (Gegengewicht ist keine bewegte Last) → 0 kg.
    if (set.inverse === true || (exMeta && exMeta.inverseProgression)) return 0;
    // Körpergewicht: keine kg-Tonnage (nur Wdh. werden geloggt).
    if (exMeta && exMeta.equipment === "Körpergewicht") return 0;
    // Getrennt geloggte Seiten (links/rechts): nur wenn der Satz explizit als
    // Split markiert ist ODER ein echtes L/R-GEWICHT trägt. Bewusst NUR am
    // Gewicht festgemacht (nicht an Wdh.): laufende Sätze haben leere
    // Gewichts-Platzhalter (""), aber vorbelegte Wdh. — eine Wdh.-basierte
    // Prüfung würde gemeinsame Sätze fälschlich als Split behandeln (→ 0).
    const hasSideWeight = Number.isFinite(num(set.weightL)) || Number.isFinite(num(set.weightR));
    if (set.split === true || hasSideWeight) {
      return sideVolume(set.weightL, set.repsL) + sideVolume(set.weightR, set.repsR);
    }
    // Gemeinsamer Wert; einseitig → pro Seite, also verdoppelt.
    const base = sideVolume(set.weight, set.reps);
    const unilateral = set.unilateral ?? (exMeta ? exMeta.unilateral : false);
    return unilateral ? base * 2 : base;
  }
  // Summiert die Tonnage über eine Übungsliste — geteilt von gespeicherter
  // Session (sessionTonnage) und laufendem Workout (currentWorkoutTonnage).
  function tonnageOf(exercises) {
    let t = 0;
    for (const ex of exercises) {
      const exMeta = EXERCISES[ex.id];
      for (const s of ex.sets) t += setVolume(s, exMeta);
    }
    return t;
  }
  function sessionTonnage(session) {
    return tonnageOf(session.exercises);
  }
  // Repräsentatives „schwerstes" Gewicht eines Satzes — für PR-Badges, Vorgaben
  // und Mini-Verlauf. Berücksichtigt gemeinsame und getrennte (L/R) Werte.
  function setTopWeight(set) {
    const vals = [set.weight, set.weightL, set.weightR].map(num).filter(Number.isFinite);
    return vals.length ? Math.max(...vals) : NaN;
  }
  // Repräsentativer Wert einer Übung für den „zuletzt"-Carry-Forward (lastWeights):
  //   • Zeit-Übung  → längste Haltedauer (Maximum der Sekunden)
  //   • invertiert  → niedrigstes Gegengewicht (beste Leistung)
  //   • normal      → schwerstes Gewicht
  // Liefert null, wenn kein abgehakter Satz einen gültigen Wert hat.
  function repValueForStore(ex) {
    const meta = EXERCISES[ex.id] || {};
    const done = ex.sets.filter(s => s.done);
    if (meta.metric === "duration") {
      const vals = done.map(s => num(s.duration)).filter(Number.isFinite);
      return vals.length ? Math.max(...vals) : null;
    }
    const vals = done.map(setTopWeight).filter(Number.isFinite);
    if (!vals.length) return null;
    return meta.inverseProgression ? Math.min(...vals) : Math.max(...vals);
  }
  function formatKg(n) {
    const rounded = Math.round(n);
    return rounded.toLocaleString("de-DE");
  }
  // ─── Home rendern ────────────────────────────────────
  function renderHome() {
    // Datums-Overline
    const now = new Date();
    const dateEl = $("#home-date");
    if (dateEl) {
      const wd = now.toLocaleDateString("de-DE", { weekday: "long" });
      const dm = now.toLocaleDateString("de-DE", { day: "numeric", month: "long" });
      dateEl.textContent = `${wd.charAt(0).toUpperCase()}${wd.slice(1)} · ${dm}`;
    }

    const keys = Object.keys(PLAN);
    const todayKey = keys[0];
    const today = PLAN[todayKey];

    // „Heute dran"-Karte
    const todayHost = $("#home-today");
    todayHost.innerHTML = `
      <p class="section-label">Schnellstart</p>
      <button class="today-card" data-day="${todayKey}">
        <span class="today-top">
          <span class="today-mascot">${mascotFor(0)}</span>
          <span class="today-main">
            <span class="today-name">${escapeHtml(today.title)}</span>
            <span class="today-muscles">${escapeHtml(dotted(today.subtitle))}</span>
          </span>
        </span>
        <span class="today-foot">
          <span class="today-meta">${today.exercises.length} Übungen · ${escapeHtml(formatLastDone(todayKey))}</span>
          <span class="today-go">${ICONS.play} Start</span>
        </span>
      </button>`;
    todayHost.querySelector(".today-card").addEventListener("click", () => startWorkout(todayKey));

    // Recap der letzten Einheit
    renderRecap();

    // Weitere Pläne
    const plansHost = $("#home-plans");
    plansHost.innerHTML = `
      <p class="section-label rest-label-sec">Weitere Pläne</p>
      <div class="day-list">
        ${keys.slice(1).map((k, i) => `
          <button class="day-card" data-day="${k}">
            <span class="day-badge">${mascotFor(i + 1)}</span>
            <span class="day-main">
              <span class="day-name">${escapeHtml(PLAN[k].title)}</span>
              <span class="day-muscles">${escapeHtml(dotted(PLAN[k].subtitle))}</span>
            </span>
            <span class="day-last">${escapeHtml(formatLastDone(k))}</span>
            <span class="day-chev">${ICONS.chevR}</span>
          </button>`).join("")}
      </div>`;
    plansHost.querySelectorAll(".day-card").forEach(btn =>
      btn.addEventListener("click", () => startWorkout(btn.dataset.day)));
  }

  // Schlanke Recap-Leiste: Kennzahlen der zuletzt abgeschlossenen Einheit.
  function renderRecap() {
    const host = $("#home-recap");
    if (!host) return;
    const history = loadHistory();
    if (!history.length) { host.innerHTML = ""; return; }
    const last = history[history.length - 1];
    const dayName = PLAN[last.day] ? PLAN[last.day].title : last.day;
    let setsDone = 0;
    const exIds = new Set();
    for (const ex of last.exercises) {
      for (const s of ex.sets) if (s.done) { setsDone++; exIds.add(ex.id); }
    }
    const cells = [
      { n: String(setsDone),            l: "Sätze" },
      { n: String(exIds.size),          l: "Übungen" },
      { n: formatKg(sessionTonnage(last)), l: "kg bewegt" },
    ];
    host.innerHTML = `
      <p class="section-label rest-label-sec">Letztes Training · ${escapeHtml(dayName)}</p>
      <div class="recap">
        ${cells.map(c => `<div class="recap-cell"><span class="recap-n">${escapeHtml(c.n)}</span><span class="recap-l">${escapeHtml(c.l)}</span></div>`).join("")}
      </div>`;
  }

  // Baut einen Übungs-Eintrag fürs laufende Workout. `spec` liefert sets/reps/rest
  // (aus dem Plan oder beim Tauschen aus der Original-Übung). Trägt den letzten
  // Stand pro Satz als Vorbelegung + „Zuletzt"-Hinweis mit — auch seitengetrennt.
  function buildWorkoutExercise(exId, spec, last, lastWeights) {
    const meta = EXERCISES[exId] || {};
    const lastEx = last ? last.exercises.find(e => e.id === exId) : null;
    // Vorbelegtes Gewicht: zuletzt benutzt → sonst hinterlegtes Startgewicht
    // (z. B. RDL 12 kg für die erste Einheit) → sonst leer.
    const defaultWeight = lastWeights[exId] ?? meta.startWeight ?? "";
    // Wdh. werden mit der geplanten Mindestzahl vorbelegt (z. B. 10 bei „10–12"),
    // als echter, editierbarer Wert — sonst bliebe das Feld leer und der Satz
    // würde mit 0 in die Summe eingehen. Letztes Mal hat Vorrang, falls erfasst.
    const defaultReps = spec.repsLow ?? 10;
    const setCount = spec.sets || 3;

    // Zeit-Übung: eigener, schlanker Satz-Aufbau (Sekunden statt Gewicht/Wdh.).
    if (meta.metric === "duration") {
      const defaultDuration = lastWeights[exId] ?? meta.startDuration ?? 30;
      return {
        id: exId,
        metric: "duration",
        unilateral: false,
        split: false,
        sets: Array.from({ length: setCount }, (_, i) => {
          const ls = lastEx?.sets?.[i] || {};
          return {
            duration: ls.duration ?? defaultDuration,
            durationBase: ls.duration ?? defaultDuration, // unreduzierter Zielwert
            manual: false,
            done: false,
            lastDuration: ls.duration ?? null
          };
        }),
        rest: (typeof spec.rest === "number" && spec.rest > 0) ? spec.rest : state.settings.defaultRest,
        repsLow: spec.repsLow ?? 8,
        repsHigh: spec.repsHigh ?? 12,
        expanded: false
      };
    }

    return {
      id: exId,
      metric: "weight",
      inverseProgression: !!meta.inverseProgression,
      unilateral: !!meta.unilateral,
      // Beim einseitigen Loggen Seiten getrennt — Vorgabe folgt dem letzten Mal.
      split: meta.unilateral ? !!(lastEx?.sets?.some(s => s && s.split)) : false,
      sets: Array.from({ length: setCount }, (_, i) => {
        const ls = lastEx?.sets?.[i] || {};
        return {
          weight:  ls.weight  ?? defaultWeight,
          reps:    ls.reps    ?? defaultReps,
          weightL: ls.weightL ?? "",
          repsL:   ls.repsL   ?? defaultReps,
          weightR: ls.weightR ?? "",
          repsR:   ls.repsR   ?? defaultReps,
          // Unreduzierte Zielwerte (für den Energie-Abschlag, idempotent).
          weightBase:  ls.weight  ?? defaultWeight,
          weightLBase: ls.weightL ?? "",
          weightRBase: ls.weightR ?? "",
          manual: false,
          done: false,
          // „Zuletzt"-Hinweise pro Satz (können null sein)
          lastWeight:  ls.weight  ?? null,
          lastReps:    ls.reps    ?? null,
          lastWeightL: ls.weightL ?? null,
          lastRepsL:   ls.repsL   ?? null,
          lastWeightR: ls.weightR ?? null,
          lastRepsR:   ls.repsR   ?? null
        };
      }),
      // rest: plan-spezifischer Wert ist Wahrheit. Settings-Default ist
      // nur Fallback, falls in plan.js keiner gesetzt ist.
      rest: (typeof spec.rest === "number" && spec.rest > 0) ? spec.rest : state.settings.defaultRest,
      repsLow: spec.repsLow ?? 8,
      repsHigh: spec.repsHigh ?? 12,
      expanded: false
    };
  }

  // ─── Workout starten ─────────────────────────────────
  function startWorkout(dayKey) {
    const day = PLAN[dayKey];
    const lastWeights = loadLastWeights();
    const last = getLastSessionForDay(dayKey);

    state.currentDay = dayKey;
    state.workout = {
      day: dayKey,
      startedAt: Date.now(),
      warmupDone: WARMUP_ITEMS.map(() => false),
      warmup: defaultWarmup(), // frische Auswahl pro Einheit (nicht klebrig)
      flags: defaultFlags(),   // Periode/Energie/krank — frisch pro Einheit
      impro: !!day.impro,
      // Impro: leere Region-Slots (Platzhalter), die beim Start gefüllt werden.
      // Sonst: feste Plan-Übungen.
      exercises: day.impro
        ? day.regions.map(r => ({
            placeholder: true,
            slotKey: r.key,
            region: r.label,
            muscles: r.muscles,
            spec: { sets: day.sets, repsLow: day.repsLow, repsHigh: day.repsHigh, rest: day.rest },
            sets: []
          }))
        : day.exercises.map(ex => buildWorkoutExercise(ex.id, ex, last, lastWeights))
    };

    saveActiveSession(); // überschreibt evtl. alte aktive Session → neue Einheit startet leer
    renderWorkout();
    const deck = $("#workout-deck"); if (deck) deck.scrollLeft = 0; // beim Warm-up starten
    showView("workout");
  }

  // ─── Warm-up: Mobility-Checkliste ODER Cardio ────────
  // Pro Einheit wählbar (entweder/oder). Die Auswahl lebt in
  // state.workout.warmup und wird über saveActiveSession gespiegelt
  // (reload-sicher), aber bei jeder neuen Einheit frisch gesetzt — also
  // kein „klebriger" Default (siehe startWorkout / defaultWarmup).
  function defaultWarmup() {
    return { mode: "mobility", cardio: { kind: "rudern", distance: "", minutes: "" } };
  }
  // Zahl deutsch formatiert (Tausenderpunkt / Dezimalkomma), wie sonst auch.
  function numDe(n) {
    const v = Number(n);
    return Number.isFinite(v) ? v.toLocaleString("de-DE") : "";
  }

  function renderWarmup() {
    const wu = state.workout.warmup || (state.workout.warmup = defaultWarmup());
    const content = $("#warmup-content");
    const seg = `<div class="seg wu-seg" data-wu-mode>
      <button class="${wu.mode === "cardio" ? "" : "on"}" data-mode="mobility">Mobility</button>
      <button class="${wu.mode === "cardio" ? "on" : ""}" data-mode="cardio">Cardio</button>
    </div>`;
    content.innerHTML = seg + (wu.mode === "cardio" ? cardioFormHTML(wu.cardio) : mobilityListHTML());

    // Mobility / Cardio umschalten
    content.querySelectorAll("[data-wu-mode] button").forEach(b => {
      b.addEventListener("click", () => {
        wu.mode = b.dataset.mode === "cardio" ? "cardio" : "mobility";
        saveActiveSession();
        renderWarmup();
      });
    });

    if (wu.mode === "cardio") bindCardioForm(content, wu.cardio);
    else bindMobilityList(content);
    updateWarmupLabel();
  }

  function mobilityListHTML() {
    return WARMUP_ITEMS.map((text, i) => `
      <div class="warmup-item${state.workout.warmupDone[i] ? " done" : ""}" data-warmup="${i}">
        <button class="warmup-check${state.workout.warmupDone[i] ? " done" : ""}" aria-label="Warm-up-Punkt abhaken">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </button>
        <span class="warmup-text">${text}</span>
      </div>
    `).join("");
  }

  function bindMobilityList(content) {
    content.querySelectorAll(".warmup-item").forEach(row => {
      const i = parseInt(row.dataset.warmup, 10);
      // Ganze Zeile ist Tap-Ziel (nicht nur der 26px-Button) — daumenfreundlich.
      row.addEventListener("click", () => {
        state.workout.warmupDone[i] = !state.workout.warmupDone[i];
        row.classList.toggle("done");
        row.querySelector(".warmup-check").classList.toggle("done");
        updateWarmupLabel();
        saveActiveSession();
      });
    });
  }

  // Distanz-Einheit folgt der Cardio-Art: Rudern in Metern, Laufband in km.
  function cardioUnit(kind) { return kind === "laufband" ? "km" : "m"; }
  function cardioFormHTML(c) {
    const unit = cardioUnit(c.kind);
    const distMode = c.kind === "laufband" ? "decimal" : "numeric";
    const val = (v) => (v === "" || v == null) ? "" : v;
    return `<div class="cardio-form">
      <div class="seg" data-cardio-kind>
        <button class="${c.kind === "laufband" ? "" : "on"}" data-kind="rudern">Rudern</button>
        <button class="${c.kind === "laufband" ? "on" : ""}" data-kind="laufband">Laufband</button>
      </div>
      <div class="cardio-fields">
        <label class="cardio-field">
          <span class="cardio-lbl">Distanz</span>
          <span class="cardio-input"><input class="val-input" type="text" inputmode="${distMode}" autocomplete="off" data-cardio="distance" value="${val(c.distance)}"/><i>${unit}</i></span>
        </label>
        <label class="cardio-field">
          <span class="cardio-lbl">Minuten <em>optional</em></span>
          <span class="cardio-input"><input class="val-input" type="text" inputmode="numeric" autocomplete="off" data-cardio="minutes" value="${val(c.minutes)}"/><i>min</i></span>
        </label>
      </div>
    </div>`;
  }

  function bindCardioForm(content, c) {
    // Art wechseln (ändert auch die Distanz-Einheit) → neu rendern.
    content.querySelectorAll("[data-cardio-kind] button").forEach(b => {
      b.addEventListener("click", () => {
        c.kind = b.dataset.kind === "laufband" ? "laufband" : "rudern";
        saveActiveSession();
        renderWarmup();
      });
    });
    // Distanz / Minuten — Komma als Dezimaltrenner erlaubt (z. B. 1,5 km).
    content.querySelectorAll("[data-cardio]").forEach(input => {
      const persist = (e) => {
        const field = e.target.dataset.cardio;
        const raw = e.target.value.trim().replace(",", ".");
        c[field] = raw === "" ? "" : parseFloat(raw);
        updateWarmupLabel();
        saveActiveSession();
      };
      input.addEventListener("input", persist);
      input.addEventListener("change", persist);
    });
  }

  // Kurzfassung fürs Banner-Meta (z. B. „Rudern · 1.500 m").
  function cardioShort(c) {
    if (!c) return "";
    const kind = c.kind === "laufband" ? "Laufband" : "Rudern";
    const d = (c.distance === "" || c.distance == null) ? null : c.distance;
    return d != null ? `${kind} · ${numDe(d)} ${cardioUnit(c.kind)}` : kind;
  }

  function updateWarmupLabel() {
    const wu = state.workout.warmup || defaultWarmup();
    const label = $("#warmup-label");
    const meta = $("#warmup-meta");
    if (wu.mode === "cardio") {
      // Cardio hat bewusst keinen „erledigt"-Status — Meta zeigt nur die Werte.
      label.textContent = "Warm-up";
      meta.textContent = cardioShort(wu.cardio) || "Cardio";
      $("#warmup-check").classList.remove("on");
      $("#warmup-banner").classList.remove("wu-complete");
      return;
    }
    const total = WARMUP_ITEMS.length;
    const done = state.workout.warmupDone.filter(Boolean).length;
    const allDone = done === total;
    label.textContent = allDone ? "Warm-up erledigt" : "Warm-up";
    meta.textContent = `${done}/${total}`;
    $("#warmup-check").classList.toggle("on", allDone);
    $("#warmup-banner").classList.toggle("wu-complete", allDone);
  }

  // ─── Session-Marker (Periode / wenig Energie / krank) ─────
  // Optionaler Tag pro Einheit. Frisch pro Session, via saveActiveSession
  // gespiegelt, im Verlauf gespeichert. Ein aktiver Marker:
  //   1. senkt die Zielgewichte automatisch um 15 % (reversibel, idempotent),
  //   2. schützt den „zuletzt"-Referenzwert — eine markierte Einheit zieht die
  //      Vorbelegung NICHT nach unten (niedrigeres Gewicht ≠ Rückschritt).
  const FLAG_DEFS = [
    { key: "periode", label: "Periode" },
    { key: "wenigEnergie", label: "Wenig Energie" },
    { key: "krank", label: "Krank" }
  ];
  const ENERGY_REDUCTION = 0.85; // −15 %
  function defaultFlags() { return { periode: false, wenigEnergie: false, krank: false }; }
  function anyFlag(f) { return !!(f && (f.periode || f.wenigEnergie || f.krank)); }
  function activeFlagKeys(f) { return FLAG_DEFS.filter(d => f && f[d.key]).map(d => d.key); }
  function flagLabel(key) { const d = FLAG_DEFS.find(x => x.key === key); return d ? d.label : key; }
  function round05(n) { return Math.round(n * 2) / 2; }

  // Wendet den Energie-Abschlag auf alle noch OFFENEN, nicht manuell geänderten
  // Sätze an — immer aus dem unreduzierten Base-Wert gerechnet (idempotent &
  // reversibel). Faktor 1.0 = kein Marker → stellt die Normalwerte wieder her.
  // Richtungs-korrekt: invertierte Übung bekommt MEHR Gegengewicht, Zeit-Übung
  // weniger Sekunden, Körpergewicht/Wdh. bleiben unangetastet.
  function applyEnergyAdjustment() {
    if (!state.workout) return;
    const factor = anyFlag(state.workout.flags) ? ENERGY_REDUCTION : 1.0;
    for (const ex of state.workout.exercises) {
      const meta = EXERCISES[ex.id] || {};
      for (const s of ex.sets) {
        if (s.done || s.manual) continue;
        if (meta.metric === "duration") {
          if (s.durationBase !== "" && s.durationBase != null) {
            s.duration = factor === 1 ? s.durationBase : Math.max(1, Math.round(s.durationBase * factor));
          }
          continue;
        }
        // invertiert: weniger Leistung = MEHR Gegengewicht → Faktor spiegeln.
        const f = meta.inverseProgression ? (2 - factor) : factor;
        const adj = (base) => (base === "" || base == null) ? base : round05(base * f);
        s.weight  = adj(s.weightBase);
        s.weightL = adj(s.weightLBase);
        s.weightR = adj(s.weightRBase);
      }
    }
  }

  function renderFlags() {
    const host = $("#workout-flags");
    if (!host) return;
    const f = state.workout.flags || (state.workout.flags = defaultFlags());
    host.innerHTML = FLAG_DEFS.map(d =>
      `<button class="wk-flag${f[d.key] ? " on" : ""}" data-flag="${d.key}" aria-pressed="${f[d.key] ? "true" : "false"}">${escapeHtml(d.label)}</button>`
    ).join("");
    host.querySelectorAll(".wk-flag").forEach(btn => {
      btn.addEventListener("click", () => {
        const key = btn.dataset.flag;
        f[key] = !f[key];
        applyEnergyAdjustment(); // greift sofort auf die offenen Sätze
        haptic(12);
        saveActiveSession();
        renderWorkout();
      });
    });
  }

  // Bestes „letztes Mal" einer Übung (für den Overload-Hinweis).
  //   • Zeit-Übung  → längste zuletzt gehaltene Dauer  → { duration }
  //   • invertiert  → NIEDRIGSTES Gegengewicht (beste Leistung) → { w, r }
  //   • normal      → höchstes Gewicht + zugehörige Wdh.        → { w, r }
  function lastBest(ex) {
    const meta = EXERCISES[ex.id] || {};
    if (meta.metric === "duration") {
      let best = null;
      for (const s of ex.sets) {
        const d = num(s.lastDuration);
        if (Number.isFinite(d) && d > 0 && (!best || d > best.duration)) best = { duration: d };
      }
      return best;
    }
    const inverse = !!meta.inverseProgression;
    let best = null;
    const isBetter = (w) => !best ? true : (inverse ? w < best.w : w > best.w);
    for (const s of ex.sets) {
      const cands = [
        { w: s.lastWeight, r: s.lastReps },
        { w: s.lastWeightL, r: s.lastRepsL },
        { w: s.lastWeightR, r: s.lastRepsR }
      ];
      for (const c of cands) {
        const w = num(c.w), r = num(c.r);
        if (Number.isFinite(w) && w > 0 && isBetter(w)) best = { w, r: Number.isFinite(r) ? r : null };
      }
    }
    return best && best.w > 0 ? best : null;
  }

  // Formatiert das „Letztes Mal" je nach Mess-Modus.
  //   normal → „60 kg × 10"   invertiert → „25 kg Gegengewicht × 8"   Zeit → „45 s"
  function formatLastBest(ex, ob) {
    if (!ob) return null;
    const meta = EXERCISES[ex.id] || {};
    if (meta.metric === "duration") return `${numDe(ob.duration)} s`;
    const suffix = meta.inverseProgression ? " Gegengewicht" : "";
    return `${numDe(ob.w)} kg${suffix}${ob.r != null ? ` × ${numDe(ob.r)}` : ""}`;
  }

  // Beschriftung über dem aktiven Satz, wo das Standard-„kg × Wdh." nicht passt.
  function setCaption(ex) {
    const meta = EXERCISES[ex.id] || {};
    if (meta.metric === "duration") return "Haltedauer (Sek.)";
    if (meta.inverseProgression) return "Gegengewicht (kg)";
    return "";
  }

  // ─── Set-Rendering (Stepper-Logging) ─────────────────
  // Ein Stepper: [−] [Eingabefeld] [+]. Hybrid — ± verstellt, Antippen tippt.
  function stepperHTML(field, value, unit, exIdx, sIdx, delta) {
    const isWeight = field.startsWith("weight");
    const v = (value === "" || value == null) ? "" : value;
    return `<span class="stepper">
      <button class="step" data-ex="${exIdx}" data-set="${sIdx}" data-field="${field}" data-delta="${-delta}" aria-label="weniger">${ICONS.minus}</button>
      <span class="val"><input class="val-input" type="text" inputmode="${isWeight ? "decimal" : "numeric"}" autocomplete="off"
            value="${v}" data-field="${field}" data-ex="${exIdx}" data-set="${sIdx}"/><i>${unit}</i></span>
      <button class="step" data-ex="${exIdx}" data-set="${sIdx}" data-field="${field}" data-delta="${delta}" aria-label="mehr">${ICONS.plus}</button>
    </span>`;
  }

  // Kompakte Lese-Darstellung eines Satzes (done/next).
  function setReadHTML(ex, set) {
    if (ex.metric === "duration") {
      const d = (set.duration === "" || set.duration == null) ? "–" : set.duration;
      return `<span class="set-read">${d} s</span>`;
    }
    if (ex.split) {
      const side = (w, r) => `${w ?? "–"}×${r ?? "–"}`;
      return `<span class="set-read">L ${side(set.weightL, set.repsL)}<i> · </i>R ${side(set.weightR, set.repsR)}</span>`;
    }
    return `<span class="set-read">${set.weight === "" || set.weight == null ? "–" : set.weight} kg<i>×</i>${set.reps === "" || set.reps == null ? "–" : set.reps}</span>`;
  }

  function setRowHTML(ex, set, exIdx, sIdx, activeIdx) {
    const stateCls = set.done ? "done" : (sIdx === activeIdx ? "active" : "next");
    if (stateCls !== "active") {
      // Erledigter Satz: antippbar zum Zurücknehmen → dezentes Undo-Glyph als
      // Affordance (sonst ist nicht erkennbar, dass man rückgängig machen kann).
      if (set.done) {
        return `<div class="set done" data-undo="${exIdx}-${sIdx}" data-set="${sIdx}" role="button" aria-label="Satz ${sIdx + 1} rückgängig machen">
          <span class="set-n">${sIdx + 1}</span>
          ${setReadHTML(ex, set)}
          <span class="set-undo" aria-hidden="true">${ICONS.undo}</span>
          <span class="set-mark ok">${ICONS.check}</span>
        </div>`;
      }
      return `<div class="set next" data-set="${sIdx}">
        <span class="set-n">${sIdx + 1}</span>
        ${setReadHTML(ex, set)}
        <span class="set-mark"></span>
      </div>`;
    }
    // Aktiver Satz → Stepper-Felder oben, Bestätigen als vollbreiter Button
    // darunter. So läuft nichts über den Kartenrand und das Tap-Ziel ist groß.
    const go = `<button class="set-go" data-go="${exIdx}-${sIdx}" aria-label="Satz ${sIdx + 1} bestätigen">${ICONS.check}<span>Satz fertig</span></button>`;
    const cap = setCaption(ex);
    const capHTML = cap ? `<span class="set-cap">${cap}</span>` : "";
    // Zeit-Übung: ein einzelner Sekunden-Stepper (kein Gewicht, keine Wdh.).
    if (ex.metric === "duration") {
      return `<div class="set active" data-set="${sIdx}">
        ${capHTML}
        <div class="set-fields">
          <span class="set-n">${sIdx + 1}</span>
          ${stepperHTML("duration", set.duration, "s", exIdx, sIdx, 5)}
        </div>
        ${go}
      </div>`;
    }
    if (ex.split) {
      return `<div class="set active split" data-set="${sIdx}">
        <div class="set-fields">
          <span class="set-n">${sIdx + 1}</span>
          <div class="set-sides">
            <div class="side"><span class="side-l">L</span>${stepperHTML("weightL", set.weightL, "kg", exIdx, sIdx, 2.5)}${stepperHTML("repsL", set.repsL, "Wdh", exIdx, sIdx, 1)}</div>
            <div class="side"><span class="side-l">R</span>${stepperHTML("weightR", set.weightR, "kg", exIdx, sIdx, 2.5)}${stepperHTML("repsR", set.repsR, "Wdh", exIdx, sIdx, 1)}</div>
          </div>
        </div>
        ${go}
      </div>`;
    }
    return `<div class="set active" data-set="${sIdx}">
      ${capHTML}
      <div class="set-fields">
        <span class="set-n">${sIdx + 1}</span>
        ${stepperHTML("weight", set.weight, "kg", exIdx, sIdx, 2.5)}
        ${stepperHTML("reps", set.reps, "Wdh", exIdx, sIdx, 1)}
      </div>
      ${go}
    </div>`;
  }

  // L/R-Umschalter (Segmented Control) für einseitige Übungen.
  function segHTML(ex, exIdx) {
    return `<div class="seg" data-seg-ex="${exIdx}">
      <button class="${ex.split ? "" : "on"}" data-split="0">Beidseitig</button>
      <button class="${ex.split ? "on" : ""}" data-split="1">Einseitig L / R</button>
    </div>`;
  }

  // Notiz im Training — eingeklappt (Vorschau) oder ausgeklappt (Textarea).
  function noteHTML(ex) {
    const note = getUserNote(ex.id);
    // Vollbild-Layout: genug Platz → Notiz ist immer direkt editierbar
    // ausgeklappt (kein Peek/Toggle mehr).
    return `<div class="note-edit">
      <span class="ovl note-ovl">${ICONS.info} Deine Notiz</span>
      <textarea class="note-input" rows="3" data-note-ex="${ex.id}" placeholder="Griff, Sitzposition, Gefühl …">${escapeHtml(note)}</textarea>
    </div>`;
  }

  // ─── Workout-Ansicht rendern ─────────────────────────
  function renderWorkout() {
    const day = PLAN[state.currentDay];
    $("#workout-title").textContent = day.title;
    $("#workout-sub").textContent = dotted(day.subtitle);
    updateProgress();
    renderWarmup();
    renderFlags();

    const list = $("#exercise-list");
    list.innerHTML = "";
    state.workout.exercises.forEach((ex, exIdx) => {
      // Impro: leerer Region-Slot → Auswahl-Karte statt Übungskarte.
      if (ex.placeholder) {
        const slotCard = document.createElement("div");
        slotCard.className = "ex-card impro-slot deck-screen";
        slotCard.dataset.label = ex.region || "Übung wählen";
        slotCard.dataset.done = "false";
        slotCard.innerHTML = `
          <button class="impro-choose" data-slot="${exIdx}" aria-label="${escapeHtml(ex.region)}: Übung wählen">
            <span class="impro-slot-region">${escapeHtml(ex.region)}</span>
            <span class="impro-slot-hint">${ICONS.plus} Übung wählen</span>
          </button>`;
        slotCard.querySelector(".impro-choose").addEventListener("click", () => chooseImproExercise(exIdx));
        list.appendChild(slotCard);
        return;
      }

      const meta = EXERCISES[ex.id];
      const activeIdx = ex.sets.findIndex(s => !s.done);
      const ob = lastBest(ex);
      const allDone = ex.sets.length > 0 && ex.sets.every(s => s.done);
      // Dezente Vorschau: was kommt nach dieser Übung? Nächste Übung (bzw.
      // Region bei leerem Impro-Slot) oder der Abschluss-Screen.
      const nextEx = state.workout.exercises[exIdx + 1];
      const nextLabel = nextEx
        ? (nextEx.placeholder ? nextEx.region : (EXERCISES[nextEx.id]?.name || nextEx.region || "Nächste Übung"))
        : "Training beenden";
      const card = document.createElement("div");
      card.className = "ex-card deck-screen";
      card.dataset.exId = ex.id;
      card.dataset.label = meta.name;
      card.dataset.done = allDone ? "true" : "false";

      // Dritter Zustand „übersprungen": eigener, neutraler Look (nicht rot,
      // nicht ausgeblendet, nicht wie „nicht geschafft"). Reversibel über
      // „Aufnehmen". Zählt nicht in den Fortschritt (siehe updateProgress).
      if (ex.skipped) {
        card.className = "ex-card skipped deck-screen";
        card.dataset.done = "false";
        card.innerHTML = `
          <div class="ex-head">
            <span class="ex-figure" aria-hidden="true">${meta.svg}</span>
            <div class="ex-skip-main">
              <h3>${escapeHtml(meta.name)}</h3>
              <span class="skip-pill">${ICONS.skip} Heute ausgelassen</span>
            </div>
            <button class="ex-resume" data-resume="${exIdx}" aria-label="${escapeHtml(meta.name)} wieder aufnehmen">${ICONS.undo}<span>Aufnehmen</span></button>
          </div>`;
        card.querySelector("[data-resume]").addEventListener("click", () => {
          const i = +card.querySelector("[data-resume]").dataset.resume;
          state.workout.exercises[i].skipped = false;
          state.workout.exercises[i].expanded = true;
          haptic(15);
          renderWorkout();
        });
        list.appendChild(card);
        return;
      }

      card.innerHTML = `
        <button class="ex-head" data-detail="${exIdx}" aria-label="${escapeHtml(meta.name)} – Details">
          <span class="ex-figure">${meta.svg}</span>
          <span class="ex-meta">
            <h3>${escapeHtml(meta.name)}${ex.addedInSession ? `<span class="ex-added">Zusatz heute</span>` : ""}</h3>
            <p>${escapeHtml(meta.target)} · ${ex.metric === "duration" ? `${ex.sets.length} × Halten` : `${ex.sets.length} × ${ex.repsLow}–${ex.repsHigh}`}</p>
          </span>
          ${allDone ? `<span class="ex-done-badge">${ICONS.check} fertig</span>` : ""}
        </button>
        <div class="ex-body">
          ${ex.unilateral ? segHTML(ex, exIdx) : ""}
          ${ob ? `<div class="oh-hint">${ICONS.trend} Letztes Mal <b>${escapeHtml(formatLastBest(ex, ob))}</b></div>` : ""}
          <div class="set-stack">
            ${ex.sets.map((set, sIdx) => setRowHTML(ex, set, exIdx, sIdx, activeIdx)).join("")}
          </div>
          ${noteHTML(ex)}
          <div class="ex-actions">
            <button class="ex-energy${anyFlag(state.workout.flags) ? " on" : ""}" data-energy="${exIdx}" aria-pressed="${state.workout.flags && state.workout.flags.wenigEnergie ? "true" : "false"}">${ICONS.energy} Weniger Energie</button>
          </div>
          <button class="ex-next" data-next-from="${exIdx}">
            <span class="ex-next-ovl">Als Nächstes</span>
            <span class="ex-next-name">${escapeHtml(nextLabel)}</span>
            ${ICONS.chevR}
          </button>
        </div>`;

      // Kopf antippen → Übungsdetail (Animation, Tags, Tauschen)
      const headBtn = card.querySelector(".ex-head[data-detail]");
      if (headBtn) headBtn.addEventListener("click", () => openExerciseDetail(+headBtn.dataset.detail));

      // Stepper ± — verstellt den Wert des aktiven Satzes
      card.querySelectorAll(".step").forEach(btn => {
        btn.addEventListener("click", () => {
          const exI = +btn.dataset.ex, sI = +btn.dataset.set, field = btn.dataset.field, d = parseFloat(btn.dataset.delta);
          const set = state.workout.exercises[exI].sets[sI];
          const cur = num(set[field]);
          set[field] = Math.max(0, +(((Number.isFinite(cur) ? cur : 0) + d).toFixed(1)));
          // Gewicht/Dauer von Hand verstellt → vom Energie-Abschlag ausnehmen.
          if (field.startsWith("weight") || field === "duration") set.manual = true;
          const inp = card.querySelector(`.val-input[data-ex="${exI}"][data-set="${sI}"][data-field="${field}"]`);
          if (inp) inp.value = set[field];
          updateLiveTonnage();
          saveActiveSession();
        });
      });

      // Direkte Tastatureingabe im Stepper-Feld (Hybrid)
      card.querySelectorAll(".val-input").forEach(input => {
        const persist = (e) => {
          const exI = +e.target.dataset.ex, sI = +e.target.dataset.set, field = e.target.dataset.field;
          const set = state.workout.exercises[exI].sets[sI];
          const raw = e.target.value.trim().replace(",", ".");
          set[field] = raw === "" ? "" : parseFloat(raw);
          if (field.startsWith("weight") || field === "duration") set.manual = true;
          updateLiveTonnage();
          saveActiveSession();
        };
        input.addEventListener("input", persist);
        input.addEventListener("change", persist);
      });

      // Notiz bearbeiten (immer ausgeklappt → kein Toggle mehr)
      const noteInput = card.querySelector(".note-input");
      if (noteInput) {
        const persistNote = (e) => setUserNote(e.target.dataset.noteEx, e.target.value);
        noteInput.addEventListener("input", persistNote);
        noteInput.addEventListener("change", persistNote);
      }

      // L/R-Umschalter (Segmented Control)
      card.querySelectorAll(".seg button").forEach(b => {
        b.addEventListener("click", () => {
          state.workout.exercises[exIdx].split = b.dataset.split === "1";
          renderWorkout();
        });
      });

      // „Weniger Energie": einziger Aktions-Button pro Übung. Wiederverwendung
      // der bestehenden Gewicht-reduzieren-Logik — toggelt den Session-Marker
      // `wenigEnergie` und lässt applyEnergyAdjustment() die offenen Sätze
      // anpassen (session-weit, wie der Flag-Button). Keine neue Logik.
      const energyBtn = card.querySelector(".ex-energy");
      if (energyBtn) energyBtn.addEventListener("click", () => {
        const f = state.workout.flags || (state.workout.flags = defaultFlags());
        f.wenigEnergie = !f.wenigEnergie;
        applyEnergyAdjustment();
        haptic(12);
        saveActiveSession();
        renderWorkout();
      });

      // „Als Nächstes"-Vorschau antippen → zum nächsten Deck-Screen wischen.
      const nextBtn = card.querySelector(".ex-next");
      if (nextBtn) nextBtn.addEventListener("click", () => {
        const deck = $("#workout-deck");
        if (!deck) return;
        const screens = [...deck.querySelectorAll(".deck-screen")];
        const idx = screens.indexOf(card);
        if (idx >= 0 && screens[idx + 1]) {
          screens[idx + 1].scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
        }
      });

      // Satz bestätigen → done, Pause starten
      card.querySelectorAll(".set-go").forEach(btn => {
        let busy = false;
        btn.addEventListener("click", () => {
          if (busy) return; busy = true; setTimeout(() => { busy = false; }, 350);
          const [exI, sI] = btn.dataset.go.split("-").map(Number);
          const exObj = state.workout.exercises[exI];
          const set = exObj.sets[sI];
          set.done = true;
          haptic(15); // kurzer Tick beim Abhaken
          // „Zuletzt"-Wert merken — metric-/invers-bewusst (Zeit: längste,
          // invertiert: niedrigstes Gegengewicht, normal: schwerstes).
          // An markierten Einheiten NICHT aktualisieren: ein schwacher Tag soll
          // die Vorbelegung nicht nach unten ziehen (Periode/Energie/krank).
          const rep = repValueForStore(exObj);
          if (rep != null && !anyFlag(state.workout.flags)) {
            const lw = loadLastWeights(); lw[exObj.id] = rep; saveLastWeights(lw);
          }
          startTimer(exObj.rest);
          renderWorkout();
        });
      });

      // Erledigten Satz wieder öffnen (Antippen)
      card.querySelectorAll(".set[data-undo]").forEach(row => {
        row.addEventListener("click", () => {
          const [exI, sI] = row.dataset.undo.split("-").map(Number);
          state.workout.exercises[exI].sets[sI].done = false;
          stopTimer();
          renderWorkout();
        });
      });

      list.appendChild(card);
    });

    // Warm-up-Checkliste bleibt im Vollbild-Screen aufgeklappt sichtbar.
    $("#warmup-banner").classList.add("open");

    // Fortschrittspunkte neu aufbauen, nachdem alle Screens im DOM sind.
    renderDots();

    // Jede Render-auslösende Mutation (abhaken, undo, split, tauschen …) hier
    // mitsichern. Handler ohne Re-Render (Stepper ±, Eingabe, Warm-up) speichern
    // zusätzlich selbst.
    saveActiveSession();
  }

  function updateProgress() {
    updateLiveTonnage();
  }

  // Fortschrittspunkte: ein Punkt pro Deck-Screen (Warm-up, jede Übung,
  // Abschluss) in Dokumentreihenfolge. Antippen springt direkt hin.
  // Erledigte Übungen (alle Sätze done) bekommen einen gefüllten Punkt.
  function renderDots() {
    const dotsHost = $("#workout-dots");
    const deck = $("#workout-deck");
    if (!dotsHost || !deck) return;
    const screens = [...deck.querySelectorAll(".deck-screen")];
    dotsHost.innerHTML = screens.map((scr, i) =>
      `<button class="wk-dot${scr.dataset.done === "true" ? " done" : ""}" data-dot="${i}" role="tab" aria-label="${escapeHtml(scr.dataset.label || "Screen " + (i + 1))}"></button>`
    ).join("");
    dotsHost.querySelectorAll(".wk-dot").forEach((d, i) => {
      d.addEventListener("click", () => {
        screens[i].scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
      });
    });

    // Zähler „X von Y Übungen": nur echte Übungs-Screens (ohne Warm-up/Abschluss),
    // erledigt = alle Sätze abgehakt (data-done).
    const countEl = $("#workout-count");
    if (countEl) {
      const exScreens = screens.filter(s => s.classList.contains("ex-card"));
      const doneEx = exScreens.filter(s => s.dataset.done === "true").length;
      countEl.innerHTML = exScreens.length
        ? `<b>${doneEx}</b> von ${exScreens.length} Übungen`
        : "";
    }
    updateActiveDot();
  }

  // Aktiven Punkt aus der horizontalen Scroll-Position ableiten (jeder Screen
  // ist 100 % breit). Funktioniert für Touch-Momentum wie für Maus/Trackpad.
  function updateActiveDot() {
    const deck = $("#workout-deck");
    const dotsHost = $("#workout-dots");
    if (!deck || !dotsHost) return;
    const w = deck.clientWidth || 1;
    const idx = Math.round(deck.scrollLeft / w);
    dotsHost.querySelectorAll(".wk-dot").forEach((d, i) => d.classList.toggle("active", i === idx));
  }

  // Live mitlaufende Tonnage der laufenden Session (noch nicht gespeicherter State).
  function currentWorkoutTonnage() {
    return state.workout ? tonnageOf(state.workout.exercises) : 0;
  }
  function updateLiveTonnage() {
    const el = $("#workout-tonnage");
    if (!el) return;
    const t = currentWorkoutTonnage();
    const skipped = state.workout ? state.workout.exercises.filter(e => e.skipped).length : 0;
    const parts = [];
    if (t > 0) parts.push(`${formatKg(t)} kg bewegt`);
    // Übersprungenes explizit ausweisen („… · 1 übersprungen") statt es als
    // fehlende Übung zu kaschieren.
    if (skipped > 0) parts.push(`${skipped} übersprungen`);
    el.textContent = parts.join(" · ");
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

  // Haptik als progressive enhancement: respektiert die Vibrations-Einstellung,
  // existiert nur auf Geräten mit navigator.vibrate (z. B. Android-Chrome;
  // iOS Safari kennt es nicht → still ohne Effekt).
  function haptic(pattern) {
    if (state.settings.vibration && navigator.vibrate) {
      try { navigator.vibrate(pattern); } catch {}
    }
  }

  function finishTimer() {
    if (state.timer?.tickId) clearInterval(state.timer.tickId);
    if (state.settings.sound) playBeep();
    haptic([200, 100, 200]);
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

  // iOS friert JS ein, wenn die App im Hintergrund ist — setInterval pausiert,
  // Audio/Vibration feuern nicht. Bei Rückkehr holen wir das nach: ist die
  // Pause abgelaufen, sofort beep + vibrate, sonst Anzeige sync'n.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    if (!state.timer || state.timer.finished) return;
    if (state.timer.endAt - Date.now() <= 0) {
      state.timer.finished = true;
      finishTimer();
    } else {
      updateTimerDisplay();
    }
  });

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

  // Persistiert einen Satz schlank: im Split-Modus die L/R-Werte, sonst den
  // gemeinsamen Wert. `unilateral`/`split` werden mitgespeichert, damit die
  // Tonnage später aus den GELOGGTEN Daten rechnet (nicht aus aktueller Meta).
  function serializeSet(s, ex) {
    const n = (v) => (v === "" || v == null ? null : v);
    const out = { done: s.done };
    // Zeit-Übung: nur die Haltedauer; Flag mitschreiben (Tonnage/Anzeige).
    if (ex.metric === "duration") {
      out.metric = "duration";
      out.duration = n(s.duration);
      return out;
    }
    if (ex.split) {
      out.split = true;
      out.weightL = n(s.weightL);
      out.repsL = n(s.repsL);
      out.weightR = n(s.weightR);
      out.repsR = n(s.repsR);
    } else {
      out.weight = n(s.weight);
      out.reps = n(s.reps);
    }
    if (ex.unilateral) out.unilateral = true;
    // Invertiert (Gegengewicht) mitschreiben, damit die Tonnage später 0 ist.
    if (ex.inverseProgression) out.inverse = true;
    return out;
  }

  // Warm-up schlank für den Verlauf: bei Mobility nur der Modus, bei Cardio
  // zusätzlich Art + Distanz/Minuten (leere Werte → null, kein NaN).
  function serializeWarmup(wu) {
    if (!wu || wu.mode !== "cardio") return { mode: "mobility" };
    const c = wu.cardio || {};
    const numOrNull = (v) => {
      const n = Number(v);
      return (v === "" || v == null || !Number.isFinite(n)) ? null : n;
    };
    return {
      mode: "cardio",
      cardio: {
        kind: c.kind === "laufband" ? "laufband" : "rudern",
        distance: numOrNull(c.distance),
        minutes: numOrNull(c.minutes)
      }
    };
  }

  // ─── Workout beenden ─────────────────────────────────
  function finishWorkout() {
    const history = loadHistory();
    const flagged = anyFlag(state.workout.flags);
    // Unbefüllte Impro-Slots (Platzhalter) fließen nicht in den Verlauf ein.
    const realExercises = state.workout.exercises.filter(ex => ex && !ex.placeholder && ex.id);
    const session = {
      day: state.workout.day,
      date: new Date().toISOString(),
      warmup: serializeWarmup(state.workout.warmup),
      flags: activeFlagKeys(state.workout.flags), // [] wenn nichts markiert
      exercises: realExercises.map(ex => ({
        id: ex.id,
        sets: ex.sets.map(s => serializeSet(s, ex))
      }))
    };
    history.push(session);
    if (history.length > 100) history.shift();
    saveHistory(history);

    // Carry-Forward NUR bei nicht-markierten Einheiten — ein markierter Tag
    // (Periode/Energie/krank) zieht die Vorbelegung nicht nach unten.
    if (!flagged) {
      const lw = loadLastWeights();
      realExercises.forEach(ex => {
        // metric-/invers-bewusst (Zeit: längste, invertiert: niedrigstes
        // Gegengewicht, normal: schwerstes).
        const rep = repValueForStore(ex);
        if (rep != null) lw[ex.id] = rep;
      });
      saveLastWeights(lw);
    }

    const tonnage = sessionTonnage(session);
    state.workout = null;
    state.currentDay = null;
    clearActiveSession(); // Einheit abgeschlossen → aktive Session aufräumen

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

  // ─── Bottom Sheets / Dialoge ─────────────────────────
  // Gemeinsames Auf-/Zuklapp-Verhalten (Klasse + 220ms-Abblende) für alle Sheets.
  function openSheet(el) {
    el.classList.remove("hidden");
    requestAnimationFrame(() => el.classList.add("visible"));
  }
  function closeSheet(el) {
    el.classList.remove("visible");
    setTimeout(() => el.classList.add("hidden"), 220);
  }

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
      // Info-Sheets ohne Abbrechen-Label: leeren Button ausblenden.
      cancelBtn.style.display = cancelLabel ? "" : "none";
      okBtn.classList.toggle("danger", !!danger);

      openSheet(sheet);

      function close(result) {
        closeSheet(sheet);
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

  // Listen-Picker (z. B. Alternativübungen). Liefert den gewählten value oder null.
  // Optional `searchable`: blendet ein Suchfeld ein, das die Optionen live filtert
  // (für lange Listen wie das gesamte Übungs-Repertoire).
  function pickSheet(title, items, { searchable = false } = {}) {
    return new Promise((resolve) => {
      const sheet = $("#picker");
      $("#picker-title").textContent = title;
      const list = $("#picker-list");
      const cancelBtn = $("#picker-cancel");
      const search = $("#picker-search");

      // Optionen anhand des Filtertexts (Label + Sub) rendern.
      function renderOptions(filter = "") {
        const q = filter.trim().toLowerCase();
        const matches = items.filter(it =>
          !q || `${it.label} ${it.sub || ""}`.toLowerCase().includes(q));
        list.innerHTML = matches.length
          ? matches.map(it => `
            <button class="picker-option" data-idx="${items.indexOf(it)}">
              <span class="picker-option-label">${escapeHtml(it.label)}</span>
              ${it.sub ? `<span class="picker-option-sub">${escapeHtml(it.sub)}</span>` : ""}
            </button>`).join("")
          : `<p class="picker-empty">Keine Übung gefunden.</p>`;
      }

      search.classList.toggle("hidden", !searchable);
      search.value = "";
      renderOptions();
      openSheet(sheet);
      if (searchable) requestAnimationFrame(() => search.focus());

      function close(result) {
        closeSheet(sheet);
        list.removeEventListener("click", onListClick);
        cancelBtn.removeEventListener("click", onCancel);
        sheet.removeEventListener("click", onBackdrop);
        search.removeEventListener("input", onSearch);
        resolve(result);
      }
      const onListClick = (e) => {
        const btn = e.target.closest(".picker-option");
        if (!btn) return;
        close(items[parseInt(btn.dataset.idx)].value);
      };
      const onSearch = (e) => renderOptions(e.target.value);
      const onCancel = () => close(null);
      const onBackdrop = (e) => { if (e.target === sheet) close(null); };
      list.addEventListener("click", onListClick);
      cancelBtn.addEventListener("click", onCancel);
      sheet.addEventListener("click", onBackdrop);
      search.addEventListener("input", onSearch);
    });
  }

  // Punkt 6: Übung im laufenden Workout gegen eine hinterlegte Alternative tauschen.
  // Sätze/Wdh./Pause der aktuellen Übung bleiben erhalten; die neue Übung wird mit
  // ihrem letzten Stand (falls vorhanden) vorbelegt.
  function replaceExercise(exI, newId) {
    const exObj = state.workout.exercises[exI];
    const spec = { sets: exObj.sets.length, repsLow: exObj.repsLow, repsHigh: exObj.repsHigh, rest: exObj.rest };
    const replacement = buildWorkoutExercise(newId, spec, getLastSessionForDay(state.currentDay), loadLastWeights());
    replacement.expanded = true;
    state.workout.exercises[exI] = replacement;
    applyEnergyAdjustment(); // aktiven Marker auch auf die neue Übung anwenden
    renderWorkout();
  }
  // Spontan eine Übung NUR für diese Einheit ergänzen (session-only). Öffnet das
  // gesamte Repertoire (ohne bereits enthaltene) mit Suche; die Wahl wird mit
  // Default-Schema ans Ende gehängt und als „Zusatz heute" markiert.
  async function addExerciseToSession() {
    if (!state.workout) return;
    const present = new Set(state.workout.exercises.map(e => e.id));
    const choices = Object.keys(EXERCISES)
      .filter(id => !present.has(id))
      .map(id => ({ value: id, label: EXERCISES[id].name, sub: EXERCISES[id].target }))
      .sort((a, b) => a.label.localeCompare(b.label, "de"));
    if (!choices.length) {
      await infoSheet({ title: "Alles dabei", message: "Alle Übungen sind bereits in dieser Einheit." });
      return;
    }
    const chosen = await pickSheet("Übung hinzufügen", choices, { searchable: true });
    if (!chosen) return;
    const spec = { sets: 3, repsLow: 10, repsHigh: 12, rest: state.settings.defaultRest };
    const ex = buildWorkoutExercise(chosen, spec, getLastSessionForDay(state.currentDay), loadLastWeights());
    ex.addedInSession = true;
    ex.expanded = true;
    state.workout.exercises.push(ex);
    applyEnergyAdjustment(); // aktiven Marker auch auf die neue Übung anwenden
    renderWorkout();
    const cards = $("#exercise-list").children;
    const lastCard = cards[cards.length - 1];
    if (lastCard) requestAnimationFrame(() => lastCard.scrollIntoView({ behavior: "smooth", block: "center" }));
  }

  async function openSwap(exI) {
    const meta = EXERCISES[state.workout.exercises[exI].id] || {};
    const alts = (meta.alternatives || []).filter(id => EXERCISES[id]);
    if (!alts.length) return;
    const chosen = await pickSheet("Übung tauschen", alts.map(id => ({
      value: id, label: EXERCISES[id].name, sub: EXERCISES[id].target
    })));
    if (chosen) replaceExercise(exI, chosen);
  }

  // ─── Impro-Tag: Region-Slots füllen ──────────────────
  // Öffnet einen nach Muskelgruppe gefilterten Picker für den Slot an exIdx.
  // Bereits in anderen Slots gewählte Übungen werden ausgeblendet (keine Dopplung).
  async function chooseImproExercise(exIdx) {
    if (!state.workout) return;
    const slot = state.workout.exercises[exIdx];
    if (!slot) return;
    const region = slot.region;
    const muscles = slot.muscles || [];
    const taken = new Set(
      state.workout.exercises.filter((e, i) => i !== exIdx && e.id).map(e => e.id)
    );
    const choices = Object.keys(EXERCISES)
      .filter(id => !taken.has(id))
      .filter(id => (EXERCISES[id].muscles || []).some(m => muscles.includes(m)))
      .map(id => ({ value: id, label: EXERCISES[id].name, sub: EXERCISES[id].target }))
      .sort((a, b) => a.label.localeCompare(b.label, "de"));
    if (!choices.length) {
      await infoSheet({ title: region, message: "Keine passende Übung im Repertoire (alle schon gewählt?)." });
      return;
    }
    const chosen = await pickSheet(`${region}: Übung wählen`, choices, { searchable: true });
    if (!chosen) return;
    const spec = slot.spec || { sets: 3, repsLow: 10, repsHigh: 12, rest: state.settings.defaultRest };
    const ex = buildWorkoutExercise(chosen, spec, getLastSessionForDay(state.currentDay), loadLastWeights());
    // Slot-Bezug mitführen, damit die Übung später wieder gewechselt werden kann.
    ex.slotKey = slot.slotKey;
    ex.region = region;
    ex.muscles = muscles;
    ex.spec = spec;
    ex.expanded = true;
    state.workout.exercises[exIdx] = ex;
    applyEnergyAdjustment(); // aktiven Marker auch auf die neue Übung anwenden
    renderWorkout();
  }

  // ─── Übungsdetail-Screen ─────────────────────────────
  function fmtRest(sec) {
    const s = Math.max(0, parseInt(sec, 10) || 0);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }
  function openExerciseDetail(exIdx) {
    state.detailExIdx = exIdx;
    renderExerciseDetail();
    showView("exercise");
  }
  function renderExerciseDetail() {
    const ex = state.workout.exercises[state.detailExIdx];
    if (!ex) return;
    const meta = EXERCISES[ex.id];
    $("#detail-title").textContent = meta.name;
    $("#detail-sub").textContent = meta.target;
    $("#detail-figure").innerHTML = meta.svg;

    const tags = [meta.equipment, ...(meta.muscles || []), meta.kneeFriendly ? "Knieschonend" : null].filter(Boolean);
    $("#detail-tags").innerHTML = tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join("");

    const ob = lastBest(ex);
    const scheme = [
      { l: "Sätze", v: ex.metric === "duration" ? `${ex.sets.length} × Halten` : `${ex.sets.length} × ${ex.repsLow}–${ex.repsHigh}` },
      { l: "Pause", v: fmtRest(ex.rest) },
      { l: "Letztes", v: ob ? formatLastBest(ex, ob) : "–" }
    ];
    $("#detail-scheme").innerHTML = scheme.map(s =>
      `<div class="scheme"><span class="ovl">${s.l}</span><b>${escapeHtml(String(s.v))}</b></div>`).join("");

    const segHost = $("#detail-seg");
    segHost.innerHTML = ex.unilateral ? segHTML(ex, state.detailExIdx) : "";
    segHost.querySelectorAll(".seg button").forEach(b => b.addEventListener("click", () => {
      ex.split = b.dataset.split === "1";
      saveActiveSession();
      renderExerciseDetail();
    }));

    $("#detail-note").innerHTML =
      `<span class="ovl note-ovl">${ICONS.info} Ausführung</span><p>${escapeHtml(meta.notes || "")}</p>`;

    const alts = (meta.alternatives || []).filter(id => EXERCISES[id]);
    const altHost = $("#detail-alts");
    altHost.innerHTML = alts.length
      ? `<p class="section-label">Alternativen</p><div class="alt-list">${alts.map(id => `
          <button class="alt" data-alt="${id}">
            <span class="alt-figure">${EXERCISES[id].svg}</span>
            <span class="alt-main"><b>${escapeHtml(EXERCISES[id].name)}</b><span>${escapeHtml(EXERCISES[id].equipment || "")}</span></span>
            <span class="alt-swap">${ICONS.swap}</span>
          </button>`).join("")}</div>`
      : "";
    altHost.querySelectorAll(".alt").forEach(btn => btn.addEventListener("click", () => {
      replaceExercise(state.detailExIdx, btn.dataset.alt);
      showView("workout");
    }));
  }

  // ─── Kalender ────────────────────────────────────────
  const calendarState = { year: null, month: null, selectedDayKey: null };

  function ymdKey(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  // Lesbare Satz-Zusammenfassung für den Kalender — beidseitig oder L/R-getrennt.
  // Werte werden escaped, da sie (über Import) aus fremdem JSON stammen können.
  function formatSetSummary(s) {
    const v = (x) => escapeHtml(x ?? "–");
    if (s.metric === "duration") return `${v(s.duration)} s`;
    if (s.split || s.weightL != null || s.weightR != null || s.repsL != null || s.repsR != null) {
      const side = (w, r) => `${v(w)}×${v(r)}`;
      return `L ${side(s.weightL, s.repsL)} · R ${side(s.weightR, s.repsR)}`;
    }
    return `${v(s.weight)} kg × ${v(s.reps)}`;
  }

  // Warm-up-Zeile für die Session-Detailansicht — zeigt, was gemacht wurde.
  // Alte Sessions ohne Warm-up-Feld liefern "" → es wird nichts angezeigt.
  function formatWarmup(wu) {
    if (!wu || typeof wu !== "object") return "";
    if (wu.mode === "cardio" && wu.cardio) {
      const c = wu.cardio;
      const kind = c.kind === "laufband" ? "Laufband" : "Rudern";
      const unit = c.kind === "laufband" ? "km" : "m";
      const parts = [];
      if (c.distance != null) parts.push(`${numDe(c.distance)} ${unit}`);
      if (c.minutes != null) parts.push(`${numDe(c.minutes)} min`);
      return `Warm-up: ${kind}${parts.length ? " " + parts.join(", ") : ""}`;
    }
    if (wu.mode === "mobility") return "Warm-up: Mobility";
    return "";
  }

  // Marker-Chips für die Session-Detailansicht. Alte Sessions ohne Feld → "".
  function flagsHTML(flags) {
    if (!Array.isArray(flags) || !flags.length) return "";
    return `<div class="calendar-session-flags">${flags
      .map(k => `<span class="calendar-session-flag">${escapeHtml(flagLabel(k))}</span>`)
      .join("")}</div>`;
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
        const dayTitle = escapeHtml(day ? day.title : session.day);
        const t = sessionTonnage(session);
        const warmupLine = formatWarmup(session.warmup);
        const warmupHtml = warmupLine
          ? `<div class="calendar-session-warmup">${escapeHtml(warmupLine)}</div>`
          : "";
        const flagsHtml = flagsHTML(session.flags);
        const exHtml = session.exercises.map(ex => {
          const meta = EXERCISES[ex.id];
          const name = escapeHtml(meta ? meta.name : ex.id);
          const sets = ex.sets
            .filter(s => s.done)
            .map(formatSetSummary)
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
            <div class="calendar-session-head-right">
              <span class="calendar-session-tonnage">${formatKg(t)} kg</span>
              <button class="calendar-session-delete" data-session-date="${escapeHtml(session.date)}" aria-label="Training löschen">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
              </button>
            </div>
          </div>
          ${flagsHtml}
          ${warmupHtml}
          ${exHtml}
        </div>`;
      }).join("");

    host.querySelectorAll(".calendar-session-delete").forEach(btn => {
      btn.addEventListener("click", () => deleteSession(btn.dataset.sessionDate));
    });
  }

  // Löscht genau eine Session anhand ihres ISO-Datums (eindeutig, ms-genau)
  // nach kurzer Bestätigung. Danach Kalender neu rendern — fällt der Tag dabei
  // leer, räumt renderCalendarDetail die Detailansicht selbst auf.
  async function deleteSession(dateISO) {
    const ok = await confirmSheet({
      title: "Training löschen?",
      message: "Dieser Trainingseintrag wird unwiderruflich entfernt.",
      confirmLabel: "Löschen",
      cancelLabel: "Abbrechen",
      danger: true
    });
    if (!ok) return;
    const history = loadHistory().filter(s => s.date !== dateISO);
    saveHistory(history);
    renderCalendar();
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
      $("#export-textarea").value = json;
      openSheet($("#export-dialog"));
    }
  }

  function hideSheetDialog(id) {
    closeSheet($(id));
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
      $("#import-textarea").value = "";
      openSheet($("#import-dialog"));
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
        clearActiveSession(); // abgebrochene Einheit verwerfen
        showView("home");
      }
    });

    $("#add-exercise").addEventListener("click", addExerciseToSession);

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

    // Übungsdetail
    $("#detail-back").addEventListener("click", () => { renderWorkout(); showView("workout"); });
    $("#detail-swap").addEventListener("click", async () => {
      await openSwap(state.detailExIdx);
      showView("workout");
    });
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

    // Aktiven Fortschrittspunkt beim Wischen/Scrollen nachführen (rAF-gedrosselt).
    const deck = $("#workout-deck");
    if (deck) {
      let raf = null;
      deck.addEventListener("scroll", () => {
        if (raf) return;
        raf = requestAnimationFrame(() => { raf = null; updateActiveDot(); });
      }, { passive: true });
    }

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

  // Unterbrochene Einheit wiederherstellen (Reload/Crash mitten im Training).
  // Plan bleibt unberührt — das ist die persistierte Durchführung von vorhin.
  (function restoreActiveSession() {
    const w = loadActiveSession();
    if (!w) return;
    state.workout = w;
    state.currentDay = w.day;
    renderWorkout();
    showView("workout");
  })();
})();
