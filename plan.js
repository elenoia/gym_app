/**
 * Trainingsplan-Definition
 * Drei Tage (A, B, C) — jeder mit Übungs-IDs, Satzzahl, Wiederholungsbereich.
 * Die Übungs-IDs verweisen auf EXERCISES in exercises.js.
 */

const WARMUP_ITEMS = [
  "Cat-Cow (Vierfüßlerstand, Rücken rund/hohl) — 10 Wdh.",
  "Thoracic Rotation (Hand zum Himmel drehen) — 8 pro Seite",
  "Hüftbeuger-Dehnung (Ausfallschritt) — 30 s pro Seite",
  "Glute Bridge (Becken heben) — 15 Wdh.",
  "Band Pull-Apart (mit Theraband) — 15 Wdh."
];

const PLAN = {
  A: {
    title: "Aufbau",
    subtitle: "Beine, Brust, Rücken",
    exercises: [
      { id: "beinpresse",       sets: 3, repsLow: 10, repsHigh: 12, rest: 90 },
      { id: "bankdruecken",     sets: 3, repsLow: 8,  repsHigh: 10, rest: 90 },
      { id: "kabelrudern",      sets: 3, repsLow: 10, repsHigh: 12, rest: 90  },
      { id: "rueckenstrecker",  sets: 3, repsLow: 10, repsHigh: 12, rest: 90  },
      { id: "face_pulls",       sets: 3, repsLow: 12, repsHigh: 15, rest: 60  },
      { id: "bauchmaschine",    sets: 3, repsLow: 10, repsHigh: 12, rest: 60  }
    ]
  },
  B: {
    title: "Aufrichtung",
    subtitle: "Gesäß, Schulter, Arme",
    exercises: [
      { id: "hip_thrust",       sets: 3, repsLow: 8,  repsHigh: 10, rest: 90 },
      { id: "beinstrecker",     sets: 3, repsLow: 10, repsHigh: 12, rest: 90  },
      { id: "latzug_breit",     sets: 3, repsLow: 10, repsHigh: 12, rest: 90  },
      { id: "schulterdruecken", sets: 3, repsLow: 8,  repsHigh: 10, rest: 90 },
      { id: "butterfly",        sets: 3, repsLow: 10, repsHigh: 12, rest: 90  },
      { id: "bizeps_curls",     sets: 2, repsLow: 10, repsHigh: 12, rest: 60  },
      { id: "trizeps_kabel",    sets: 2, repsLow: 10, repsHigh: 12, rest: 60  }
    ]
  },
  C: {
    title: "Variation",
    subtitle: "Backup-Tag",
    exercises: [
      { id: "beinbeuger",       sets: 3, repsLow: 10, repsHigh: 12, rest: 90  },
      { id: "hip_thrust",       sets: 3, repsLow: 8,  repsHigh: 10, rest: 90 },
      { id: "rudern_maschine",  sets: 3, repsLow: 8,  repsHigh: 10, rest: 90 },
      { id: "rueckenstrecker",  sets: 3, repsLow: 10, repsHigh: 12, rest: 90  },
      { id: "face_pulls",       sets: 3, repsLow: 12, repsHigh: 15, rest: 60  },
      { id: "liegestuetze",     sets: 3, repsLow: 6,  repsHigh: 12, rest: 90  }
    ]
  },
  // Punkt 5: zweiter, paralleler Plan nur mit Maschinen-Übungen — für Tage
  // ohne Lust auf freie Gewichte. Elenas Variante (Ganzkörper), alle Übungen
  // haben equipment === "Maschine".
  M: {
    title: "Maschinen",
    subtitle: "Nur Geräte",
    exercises: [
      { id: "beinpresse",      sets: 3, repsLow: 10, repsHigh: 12, rest: 90 },
      { id: "abduktoren",      sets: 3, repsLow: 12, repsHigh: 15, rest: 60 },
      { id: "brustpresse",     sets: 3, repsLow: 10, repsHigh: 12, rest: 90 },
      { id: "rudern_maschine", sets: 3, repsLow: 10, repsHigh: 12, rest: 90 },
      { id: "schulterpresse",  sets: 3, repsLow: 10, repsHigh: 12, rest: 90 },
      { id: "reverse_fly",     sets: 3, repsLow: 12, repsHigh: 15, rest: 60 },
      { id: "bauchmaschine",   sets: 3, repsLow: 12, repsHigh: 15, rest: 60 }
    ]
  }
};

// Verspielte Strichfiguren-Mascots für die Plan-Badges (Redesign „Atelier").
// In currentColor gezeichnet → erben die Akzentfarbe vom Container.
const MASCOTS = {
  // A — Doppel-Bizeps-Pose
  A: `<svg viewBox="0 0 40 40"><g stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="20" cy="9" r="4" fill="currentColor" stroke="none"/>
    <line x1="20" y1="13" x2="20" y2="26"/>
    <path d="M20 17 L13 16 L11 11"/><path d="M20 17 L27 16 L29 11"/>
    <line x1="20" y1="26" x2="14" y2="34"/><line x1="20" y1="26" x2="26" y2="34"/>
  </g></svg>`,
  // B — Kniebeuge unter der Hantel
  B: `<svg viewBox="0 0 40 40"><g stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <line x1="9" y1="9" x2="31" y2="9"/><circle cx="9" cy="9" r="2.2" fill="currentColor" stroke="none"/><circle cx="31" cy="9" r="2.2" fill="currentColor" stroke="none"/>
    <circle cx="20" cy="15" r="3.4" fill="currentColor" stroke="none"/>
    <line x1="20" y1="18" x2="20" y2="25"/>
    <line x1="14" y1="11" x2="20" y2="20"/><line x1="26" y1="11" x2="20" y2="20"/>
    <path d="M20 25 L14 28 L17 34"/><path d="M20 25 L26 28 L23 34"/>
  </g></svg>`,
  // C — Hampelmann
  C: `<svg viewBox="0 0 40 40"><g stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="20" cy="10" r="4" fill="currentColor" stroke="none"/>
    <line x1="20" y1="14" x2="20" y2="24"/>
    <line x1="20" y1="17" x2="10" y2="11"/><line x1="20" y1="17" x2="30" y2="11"/>
    <line x1="20" y1="24" x2="12" y2="33"/><line x1="20" y1="24" x2="28" y2="33"/>
  </g></svg>`,
  // D — Streck-/Siegerpose
  D: `<svg viewBox="0 0 40 40"><g stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="20" cy="10" r="4" fill="currentColor" stroke="none"/>
    <line x1="20" y1="14" x2="20" y2="27"/>
    <path d="M20 18 L14 13 L15 8"/><path d="M20 18 L26 16 L31 18"/>
    <line x1="20" y1="27" x2="14" y2="34"/><line x1="20" y1="27" x2="26" y2="34"/>
  </g></svg>`
};
