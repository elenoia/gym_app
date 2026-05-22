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
      { id: "beinpresse",       sets: 3, repsLow: 10, repsHigh: 12, rest: 150 },
      { id: "bankdruecken",     sets: 3, repsLow: 8,  repsHigh: 10, rest: 120 },
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
      { id: "hip_thrust",       sets: 3, repsLow: 8,  repsHigh: 10, rest: 120 },
      { id: "beinstrecker",     sets: 3, repsLow: 10, repsHigh: 12, rest: 90  },
      { id: "latzug_breit",     sets: 3, repsLow: 10, repsHigh: 12, rest: 90  },
      { id: "schulterdruecken", sets: 3, repsLow: 8,  repsHigh: 10, rest: 120 },
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
      { id: "hip_thrust",       sets: 3, repsLow: 8,  repsHigh: 10, rest: 120 },
      { id: "rudern_maschine",  sets: 3, repsLow: 8,  repsHigh: 10, rest: 120 },
      { id: "rueckenstrecker",  sets: 3, repsLow: 10, repsHigh: 12, rest: 90  },
      { id: "face_pulls",       sets: 3, repsLow: 12, repsHigh: 15, rest: 60  },
      { id: "liegestuetze",     sets: 3, repsLow: 6,  repsHigh: 12, rest: 90  }
    ]
  }
};
