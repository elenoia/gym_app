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

// Plan-Badge-Icons im flachen Linienstil (Tabler-Glyphen, MIT, nachgezeichnet
// als Inline-SVG). In currentColor → erben die Akzentfarbe vom Container.
// Positionsbezogen (mascotFor): A=Aufbau, B=Aufrichtung, C=Variation, D=Maschinen.
const MASCOTS = {
  // A — Hantel / Langhantel (ti-barbell)
  A: `<svg viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M2 12h1"/>
    <path d="M6 8h-2a1 1 0 0 0 -1 1v6a1 1 0 0 0 1 1h2"/>
    <path d="M6 7v10a1 1 0 0 0 1 1h1a1 1 0 0 0 1 -1v-10a1 1 0 0 0 -1 -1h-1a1 1 0 0 0 -1 1"/>
    <path d="M9 12h6"/>
    <path d="M15 7v10a1 1 0 0 0 1 1h1a1 1 0 0 0 1 -1v-10a1 1 0 0 0 -1 -1h-1a1 1 0 0 0 -1 1"/>
    <path d="M18 8h2a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-2"/>
    <path d="M22 12h-1"/>
  </g></svg>`,
  // B — Dehnen / Mobility (ti-stretching)
  B: `<svg viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M15 5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"/>
    <path d="M5 20l5 -.5l1 -2"/>
    <path d="M18 20v-5h-5.5l2.5 -6.5l-5.5 1l1.5 2"/>
  </g></svg>`,
  // C — Wechsel / Mischen (ti-arrows-shuffle)
  C: `<svg viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M18 4l3 3l-3 3"/>
    <path d="M18 20l3 -3l-3 -3"/>
    <path d="M3 7h3a5 5 0 0 1 5 5a5 5 0 0 0 5 5h5"/>
    <path d="M21 7h-5a4.978 4.978 0 0 0 -3 1m-4 8a4.984 4.984 0 0 1 -3 1h-3"/>
  </g></svg>`,
  // D — Zahnrad / Gerät (ti-settings-2)
  D: `<svg viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M19.875 6.27a2.225 2.225 0 0 1 1.125 1.948v7.284c0 .809 -.443 1.555 -1.158 1.948l-6.75 4.27a2.269 2.269 0 0 1 -2.184 0l-6.75 -4.27a2.225 2.225 0 0 1 -1.158 -1.948v-7.285c0 -.809 .443 -1.554 1.158 -1.947l6.75 -3.98a2.33 2.33 0 0 1 2.25 0l6.75 3.98h-.033"/>
    <path d="M9 12a3 3 0 1 0 6 0a3 3 0 1 0 -6 0"/>
  </g></svg>`
};
