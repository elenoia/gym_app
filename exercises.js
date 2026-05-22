/**
 * Übungs-Datenbank.
 *
 * Jede Übung hat ein animiertes SVG-Strichmännchen, das die Bewegung in
 * ~2-Sekunden-Schleifen zeigt. Stil:
 *   - viewBox 0 0 100 100, Maßstab am Container (CSS skaliert auf 72px).
 *   - Körper: Strich #F2E9E4, stroke-width 2.5.
 *   - Geräte: Strich #9A8C98 / Füllung #4A4E69.
 *   - Bewegte Last / Hand: Füllung #C9ADA7.
 *   - Kopf: gefüllte Akzentkreise.
 *   - Animationen: SMIL animate / animateTransform — kein JS.
 */

const EXERCISES = {
  // ───── Beinpresse ─────
  beinpresse: {
    name: "Beinpresse",
    target: "Quads, Gesäß",
    notes: "Unterer Rücken bleibt am Polster. Knie nicht nach innen kippen lassen. Nicht zu tief gehen, wenn das Becken kippt.",
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <g fill="none" stroke-linecap="round" stroke-linejoin="round">
        <!-- Rail -->
        <line x1="8" y1="82" x2="92" y2="42" stroke="#9A8C98" stroke-width="1.6"/>
        <!-- Backrest -->
        <line x1="48" y1="60" x2="14" y2="76" stroke="#4A4E69" stroke-width="7"/>
        <!-- Head -->
        <circle cx="14" cy="74" r="5" fill="#C9ADA7"/>
        <!-- Torso on backrest -->
        <line x1="46" y1="58" x2="20" y2="71" stroke="#F2E9E4" stroke-width="2.5"/>
        <!-- Hip joint marker -->
        <circle cx="48" cy="60" r="2" fill="#F2E9E4"/>
        <!-- Thigh -->
        <line x1="48" y1="60" x2="62" y2="40" stroke="#F2E9E4" stroke-width="2.5">
          <animate attributeName="x2" values="62;70;62" dur="2.2s" repeatCount="indefinite"/>
          <animate attributeName="y2" values="40;48;40" dur="2.2s" repeatCount="indefinite"/>
        </line>
        <!-- Shin -->
        <line x1="62" y1="40" x2="80" y2="50" stroke="#F2E9E4" stroke-width="2.5">
          <animate attributeName="x1" values="62;70;62" dur="2.2s" repeatCount="indefinite"/>
          <animate attributeName="y1" values="40;48;40" dur="2.2s" repeatCount="indefinite"/>
          <animate attributeName="x2" values="80;90;80" dur="2.2s" repeatCount="indefinite"/>
          <animate attributeName="y2" values="50;43;50" dur="2.2s" repeatCount="indefinite"/>
        </line>
        <!-- Footplate -->
        <rect x="78" y="42" width="10" height="14" rx="1.5" fill="#C9ADA7">
          <animate attributeName="x" values="78;88;78" dur="2.2s" repeatCount="indefinite"/>
          <animate attributeName="y" values="42;36;42" dur="2.2s" repeatCount="indefinite"/>
        </rect>
      </g>
    </svg>`
  },

  // ───── Bankdrücken (Kurzhantel, leicht schräg) ─────
  bankdruecken: {
    name: "Bankdrücken (Kurzhantel, leicht schräg)",
    target: "Brust, Schultern, Trizeps",
    notes: "Schrägbank 15–30°. Schulterblätter zusammen und nach unten ziehen. Ellbogen ca. 45° zum Körper, nicht 90°.",
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <g fill="none" stroke-linecap="round" stroke-linejoin="round">
        <!-- Bench legs -->
        <line x1="20" y1="80" x2="20" y2="92" stroke="#9A8C98" stroke-width="1.5"/>
        <line x1="70" y1="68" x2="70" y2="92" stroke="#9A8C98" stroke-width="1.5"/>
        <!-- Bench surface, inclined -->
        <line x1="14" y1="78" x2="80" y2="58" stroke="#4A4E69" stroke-width="7"/>
        <!-- Head at upper end -->
        <circle cx="80" cy="55" r="5" fill="#C9ADA7"/>
        <!-- Torso along bench -->
        <line x1="74" y1="58" x2="30" y2="72" stroke="#F2E9E4" stroke-width="2.5"/>
        <!-- Hip mark -->
        <circle cx="30" cy="72" r="2" fill="#F2E9E4"/>
        <!-- Legs hanging off -->
        <line x1="30" y1="72" x2="20" y2="84" stroke="#F2E9E4" stroke-width="2.5"/>
        <line x1="20" y1="84" x2="22" y2="92" stroke="#F2E9E4" stroke-width="2.5"/>
        <!-- Upper arms (shoulder near head) -->
        <line x1="72" y1="55" x2="62" y2="40" stroke="#F2E9E4" stroke-width="2.5">
          <animate attributeName="x2" values="62;58;62" dur="2.2s" repeatCount="indefinite"/>
          <animate attributeName="y2" values="40;52;40" dur="2.2s" repeatCount="indefinite"/>
        </line>
        <line x1="72" y1="60" x2="62" y2="44" stroke="#F2E9E4" stroke-width="2.5">
          <animate attributeName="x2" values="62;58;62" dur="2.2s" repeatCount="indefinite"/>
          <animate attributeName="y2" values="44;56;44" dur="2.2s" repeatCount="indefinite"/>
        </line>
        <!-- Dumbbells (move up = away from chest) -->
        <rect x="55" y="32" width="14" height="6" rx="1.5" fill="#C9ADA7">
          <animate attributeName="y" values="32;48;32" dur="2.2s" repeatCount="indefinite"/>
          <animate attributeName="x" values="55;55;55" dur="2.2s" repeatCount="indefinite"/>
        </rect>
      </g>
    </svg>`
  },

  // ───── Butterfly / Brustpresse (Maschine) ─────
  butterfly: {
    name: "Butterfly (Maschine)",
    target: "Brust",
    notes: "Ellbogen leicht angewinkelt, Bewegung aus den Brustmuskeln. Im Innenpunkt kurze Kontraktion. Schulterblätter bleiben hinten unten.",
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <g fill="none" stroke-linecap="round" stroke-linejoin="round">
        <!-- Seat -->
        <rect x="36" y="76" width="28" height="6" rx="2" fill="#4A4E69" stroke="#9A8C98" stroke-width="1.5"/>
        <!-- Backrest -->
        <line x1="50" y1="40" x2="50" y2="78" stroke="#4A4E69" stroke-width="6"/>
        <!-- Machine arms / pads (pivot at shoulder ~ (38,50) and (62,50)) -->
        <g>
          <animateTransform attributeName="transform" type="rotate"
            values="-40 38 50;0 38 50;-40 38 50" dur="2.4s" repeatCount="indefinite"/>
          <line x1="38" y1="50" x2="14" y2="50" stroke="#9A8C98" stroke-width="2"/>
          <rect x="10" y="44" width="6" height="14" rx="1.5" fill="#C9ADA7"/>
        </g>
        <g>
          <animateTransform attributeName="transform" type="rotate"
            values="40 62 50;0 62 50;40 62 50" dur="2.4s" repeatCount="indefinite"/>
          <line x1="62" y1="50" x2="86" y2="50" stroke="#9A8C98" stroke-width="2"/>
          <rect x="84" y="44" width="6" height="14" rx="1.5" fill="#C9ADA7"/>
        </g>
        <!-- Head -->
        <circle cx="50" cy="34" r="5" fill="#C9ADA7"/>
        <!-- Torso -->
        <line x1="50" y1="39" x2="50" y2="76" stroke="#F2E9E4" stroke-width="2.5"/>
        <!-- Legs forward -->
        <line x1="50" y1="76" x2="40" y2="92" stroke="#F2E9E4" stroke-width="2.5"/>
        <line x1="50" y1="76" x2="60" y2="92" stroke="#F2E9E4" stroke-width="2.5"/>
        <!-- Arms: upper arms out to shoulder, forearms rotate inward with pads -->
        <line x1="46" y1="44" x2="38" y2="50" stroke="#F2E9E4" stroke-width="2.5"/>
        <line x1="54" y1="44" x2="62" y2="50" stroke="#F2E9E4" stroke-width="2.5"/>
        <!-- Forearms — swing inward toward center to mirror the pad motion -->
        <line x1="38" y1="50" x2="20" y2="56" stroke="#F2E9E4" stroke-width="2.5">
          <animate attributeName="x2" values="20;42;20" dur="2.4s" repeatCount="indefinite"/>
          <animate attributeName="y2" values="56;52;56" dur="2.4s" repeatCount="indefinite"/>
        </line>
        <line x1="62" y1="50" x2="80" y2="56" stroke="#F2E9E4" stroke-width="2.5">
          <animate attributeName="x2" values="80;58;80" dur="2.4s" repeatCount="indefinite"/>
          <animate attributeName="y2" values="56;52;56" dur="2.4s" repeatCount="indefinite"/>
        </line>
      </g>
    </svg>`
  },

  // ───── Latzug breit (Obergriff) ─────
  latzug_breit: {
    name: "Latzug (breiter Obergriff)",
    target: "Latissimus, oberer Rücken",
    notes: "Stange Richtung oberes Brustbein ziehen. Schulterblätter aktiv nach unten und zusammen. Oberkörper leicht zurück.",
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <g fill="none" stroke-linecap="round" stroke-linejoin="round">
        <!-- Frame top -->
        <line x1="14" y1="10" x2="86" y2="10" stroke="#9A8C98" stroke-width="2"/>
        <!-- Pulley wheel -->
        <circle cx="50" cy="10" r="3" stroke="#9A8C98" stroke-width="1.5"/>
        <!-- Cable to bar -->
        <line x1="50" y1="13" x2="50" y2="32" stroke="#9A8C98" stroke-width="1.2">
          <animate attributeName="y2" values="32;46;32" dur="2.4s" repeatCount="indefinite"/>
        </line>
        <!-- Pull-down bar (wide) -->
        <rect x="22" y="30" width="56" height="5" rx="2" fill="#C9ADA7">
          <animate attributeName="y" values="30;44;30" dur="2.4s" repeatCount="indefinite"/>
        </rect>
        <!-- Head -->
        <circle cx="50" cy="60" r="5" fill="#C9ADA7"/>
        <!-- Torso -->
        <line x1="50" y1="65" x2="50" y2="82" stroke="#F2E9E4" stroke-width="2.5"/>
        <!-- Legs (seated, knees angled) -->
        <line x1="50" y1="82" x2="40" y2="92" stroke="#F2E9E4" stroke-width="2.5"/>
        <line x1="50" y1="82" x2="60" y2="92" stroke="#F2E9E4" stroke-width="2.5"/>
        <!-- Left arm (shoulder ~(46,62)) up to bar end -->
        <line x1="46" y1="62" x2="26" y2="34" stroke="#F2E9E4" stroke-width="2.5">
          <animate attributeName="y2" values="34;47;34" dur="2.4s" repeatCount="indefinite"/>
        </line>
        <!-- Right arm -->
        <line x1="54" y1="62" x2="74" y2="34" stroke="#F2E9E4" stroke-width="2.5">
          <animate attributeName="y2" values="34;47;34" dur="2.4s" repeatCount="indefinite"/>
        </line>
      </g>
    </svg>`
  },

  // ───── Rückenstrecker (Hyperextension) ─────
  rueckenstrecker: {
    name: "Rückenstrecker / Hyperextension",
    target: "Unterer Rücken, Gesäß",
    notes: "Wirbelsäule lang halten, Bewegung aus der Hüfte. Nicht überstrecken am oberen Ende.",
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <g fill="none" stroke-linecap="round" stroke-linejoin="round">
        <!-- Hip pad (45° wedge) -->
        <rect x="32" y="55" width="26" height="8" rx="2" fill="#4A4E69" stroke="#9A8C98" stroke-width="1.5"/>
        <!-- Vertical post -->
        <line x1="45" y1="63" x2="45" y2="88" stroke="#9A8C98" stroke-width="1.5"/>
        <!-- Foot pads -->
        <rect x="38" y="86" width="14" height="4" rx="1" fill="#4A4E69" stroke="#9A8C98" stroke-width="1.2"/>
        <!-- Legs straight down from hip pad -->
        <line x1="48" y1="62" x2="48" y2="85" stroke="#F2E9E4" stroke-width="2.5"/>
        <line x1="52" y1="62" x2="52" y2="85" stroke="#F2E9E4" stroke-width="2.5"/>
        <!-- Torso pivot around hip (45, 58) -->
        <g>
          <animateTransform attributeName="transform" type="rotate"
            values="40 45 58;-10 45 58;40 45 58" dur="2.6s" repeatCount="indefinite"/>
          <line x1="45" y1="58" x2="14" y2="38" stroke="#F2E9E4" stroke-width="2.5"/>
          <circle cx="12" cy="36" r="5" fill="#C9ADA7"/>
          <!-- Arms folded forward -->
          <line x1="24" y1="46" x2="14" y2="42" stroke="#F2E9E4" stroke-width="2.5"/>
        </g>
      </g>
    </svg>`
  },

  // ───── Bauchmaschine (Crunch) ─────
  bauchmaschine: {
    name: "Bauchmaschine (Ab Crunch)",
    target: "Gerade Bauchmuskeln",
    notes: "Brustbein Richtung Becken bewegen, nicht aus der Hüfte heben. Bewegung kontrolliert, ohne Schwung.",
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <g fill="none" stroke-linecap="round" stroke-linejoin="round">
        <!-- Seat (horizontal) -->
        <rect x="18" y="68" width="48" height="6" rx="2" fill="#4A4E69" stroke="#9A8C98" stroke-width="1.5"/>
        <!-- Backrest stub -->
        <line x1="66" y1="46" x2="66" y2="74" stroke="#4A4E69" stroke-width="6"/>
        <!-- Legs forward -->
        <line x1="32" y1="68" x2="20" y2="84" stroke="#F2E9E4" stroke-width="2.5"/>
        <line x1="42" y1="68" x2="30" y2="84" stroke="#F2E9E4" stroke-width="2.5"/>
        <!-- Chest pad (shoulder bar) -->
        <line x1="48" y1="40" x2="68" y2="36" stroke="#C9ADA7" stroke-width="4" stroke-linecap="round"/>
        <!-- Torso group: crunches around hip (46, 66) -->
        <g>
          <animateTransform attributeName="transform" type="rotate"
            values="0 46 66;-26 46 66;0 46 66" dur="2.4s" repeatCount="indefinite"/>
          <line x1="46" y1="66" x2="46" y2="38" stroke="#F2E9E4" stroke-width="2.5"/>
          <circle cx="46" cy="33" r="5" fill="#C9ADA7"/>
          <!-- Arms forward gripping pad -->
          <line x1="46" y1="44" x2="60" y2="42" stroke="#F2E9E4" stroke-width="2.5"/>
        </g>
      </g>
    </svg>`
  },

  // ───── Beinstrecker (Leg Extension) ─────
  beinstrecker: {
    name: "Beinstrecker (Leg Extension)",
    target: "Quadrizeps",
    notes: "Bewegung kontrolliert, am oberen Ende kurz halten. Rücken bleibt am Polster.",
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <g fill="none" stroke-linecap="round" stroke-linejoin="round">
        <!-- Seat (horizontal) -->
        <rect x="12" y="56" width="40" height="6" rx="2" fill="#4A4E69" stroke="#9A8C98" stroke-width="1.5"/>
        <!-- Backrest -->
        <line x1="14" y1="22" x2="14" y2="62" stroke="#4A4E69" stroke-width="6"/>
        <!-- Head -->
        <circle cx="14" cy="22" r="5" fill="#C9ADA7"/>
        <!-- Torso -->
        <line x1="14" y1="27" x2="14" y2="56" stroke="#F2E9E4" stroke-width="2.5"/>
        <!-- Hip joint -->
        <circle cx="14" cy="56" r="2" fill="#F2E9E4"/>
        <!-- Thigh (horizontal on seat) -->
        <line x1="14" y1="56" x2="50" y2="56" stroke="#F2E9E4" stroke-width="2.5"/>
        <!-- Knee joint -->
        <circle cx="50" cy="56" r="2" fill="#F2E9E4"/>
        <!-- Shin: rotates around knee from down (hanging) to forward (extended) -->
        <g>
          <animateTransform attributeName="transform" type="rotate"
            values="90 50 56;0 50 56;90 50 56" dur="2.3s" repeatCount="indefinite"/>
          <line x1="50" y1="56" x2="80" y2="56" stroke="#F2E9E4" stroke-width="2.5"/>
          <!-- Pad/weight at ankle -->
          <circle cx="82" cy="56" r="5" fill="#C9ADA7"/>
        </g>
      </g>
    </svg>`
  },

  // ───── Beinbeuger (Leg Curl, sitzend) ─────
  beinbeuger: {
    name: "Beinbeuger (Leg Curl)",
    target: "Hamstrings",
    notes: "Bewegung aus dem Kniegelenk. Beim Beugen Spannung halten, langsam zurückführen.",
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <g fill="none" stroke-linecap="round" stroke-linejoin="round">
        <!-- Seat -->
        <rect x="12" y="50" width="40" height="6" rx="2" fill="#4A4E69" stroke="#9A8C98" stroke-width="1.5"/>
        <!-- Backrest -->
        <line x1="14" y1="18" x2="14" y2="56" stroke="#4A4E69" stroke-width="6"/>
        <!-- Head -->
        <circle cx="14" cy="18" r="5" fill="#C9ADA7"/>
        <!-- Torso -->
        <line x1="14" y1="23" x2="14" y2="50" stroke="#F2E9E4" stroke-width="2.5"/>
        <!-- Hip / thigh -->
        <circle cx="14" cy="50" r="2" fill="#F2E9E4"/>
        <line x1="14" y1="50" x2="50" y2="50" stroke="#F2E9E4" stroke-width="2.5"/>
        <!-- Knee joint -->
        <circle cx="50" cy="50" r="2" fill="#F2E9E4"/>
        <!-- Shin: rotates around knee from extended forward (0°) to curled down/back (~135°) -->
        <g>
          <animateTransform attributeName="transform" type="rotate"
            values="0 50 50;135 50 50;0 50 50" dur="2.4s" repeatCount="indefinite"/>
          <line x1="50" y1="50" x2="80" y2="50" stroke="#F2E9E4" stroke-width="2.5"/>
          <circle cx="82" cy="50" r="5" fill="#C9ADA7"/>
        </g>
      </g>
    </svg>`
  },

  // ───── Schulterdrücken (sitzend, Kurzhantel) ─────
  schulterdruecken: {
    name: "Schulterdrücken (sitzend, Kurzhantel)",
    target: "Schultern, Trizeps",
    notes: "Rückenlehne nutzen für Stabilität. Ellbogen leicht vor dem Körper, nicht ganz seitlich. Nicht im unteren Rücken hohlkreuzen.",
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <g fill="none" stroke-linecap="round" stroke-linejoin="round">
        <!-- Backrest -->
        <line x1="32" y1="38" x2="32" y2="80" stroke="#4A4E69" stroke-width="6"/>
        <!-- Seat -->
        <rect x="32" y="76" width="26" height="6" rx="2" fill="#4A4E69" stroke="#9A8C98" stroke-width="1.5"/>
        <!-- Head -->
        <circle cx="42" cy="42" r="5" fill="#C9ADA7"/>
        <!-- Torso -->
        <line x1="42" y1="47" x2="42" y2="76" stroke="#F2E9E4" stroke-width="2.5"/>
        <!-- Legs -->
        <line x1="42" y1="76" x2="60" y2="76" stroke="#F2E9E4" stroke-width="2.5"/>
        <line x1="60" y1="76" x2="62" y2="90" stroke="#F2E9E4" stroke-width="2.5"/>
        <!-- Upper arms (shoulder ~(42,52), stay roughly out to side) -->
        <line x1="40" y1="52" x2="32" y2="62" stroke="#F2E9E4" stroke-width="2.5"/>
        <line x1="44" y1="52" x2="52" y2="62" stroke="#F2E9E4" stroke-width="2.5"/>
        <!-- Forearms - move with dumbbells -->
        <line x1="32" y1="62" x2="28" y2="40" stroke="#F2E9E4" stroke-width="2.5">
          <animate attributeName="y2" values="40;58;40" dur="2.2s" repeatCount="indefinite"/>
          <animate attributeName="x2" values="28;30;28" dur="2.2s" repeatCount="indefinite"/>
        </line>
        <line x1="52" y1="62" x2="56" y2="40" stroke="#F2E9E4" stroke-width="2.5">
          <animate attributeName="y2" values="40;58;40" dur="2.2s" repeatCount="indefinite"/>
          <animate attributeName="x2" values="56;54;56" dur="2.2s" repeatCount="indefinite"/>
        </line>
        <!-- Dumbbells -->
        <rect x="20" y="32" width="14" height="6" rx="1.5" fill="#C9ADA7">
          <animate attributeName="y" values="32;52;32" dur="2.2s" repeatCount="indefinite"/>
        </rect>
        <rect x="50" y="32" width="14" height="6" rx="1.5" fill="#C9ADA7">
          <animate attributeName="y" values="32;52;32" dur="2.2s" repeatCount="indefinite"/>
        </rect>
      </g>
    </svg>`
  },

  // ───── Kabelrudern sitzend ─────
  kabelrudern: {
    name: "Kabelrudern sitzend",
    target: "Oberer Rücken, Rhomboiden",
    notes: "Schulterblätter aktiv zusammenziehen, dann Arme ziehen. Brust raus, nicht mit dem Rücken schwingen.",
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <g fill="none" stroke-linecap="round" stroke-linejoin="round">
        <!-- Floor / bench rail -->
        <line x1="6" y1="68" x2="94" y2="68" stroke="#9A8C98" stroke-width="1.4"/>
        <!-- Cable tower at right -->
        <line x1="90" y1="20" x2="90" y2="68" stroke="#9A8C98" stroke-width="1.6"/>
        <circle cx="90" cy="40" r="3" stroke="#9A8C98" stroke-width="1.4"/>
        <!-- Foot platform -->
        <rect x="68" y="66" width="20" height="6" rx="1.5" fill="#4A4E69" stroke="#9A8C98" stroke-width="1.2"/>
        <!-- Head -->
        <circle cx="22" cy="36" r="5" fill="#C9ADA7"/>
        <!-- Torso -->
        <line x1="22" y1="41" x2="32" y2="66" stroke="#F2E9E4" stroke-width="2.5"/>
        <!-- Legs (extended toward platform) -->
        <line x1="32" y1="66" x2="60" y2="66" stroke="#F2E9E4" stroke-width="2.5"/>
        <line x1="60" y1="66" x2="78" y2="66" stroke="#F2E9E4" stroke-width="2.5"/>
        <!-- Upper arm -->
        <line x1="24" y1="46" x2="38" y2="52" stroke="#F2E9E4" stroke-width="2.5">
          <animate attributeName="x2" values="38;30;38" dur="2.4s" repeatCount="indefinite"/>
          <animate attributeName="y2" values="52;50;52" dur="2.4s" repeatCount="indefinite"/>
        </line>
        <!-- Forearm + cable handle (animated x toward body) -->
        <line x1="38" y1="52" x2="60" y2="50" stroke="#F2E9E4" stroke-width="2.5">
          <animate attributeName="x1" values="38;30;38" dur="2.4s" repeatCount="indefinite"/>
          <animate attributeName="x2" values="60;42;60" dur="2.4s" repeatCount="indefinite"/>
        </line>
        <!-- Handle -->
        <circle cx="60" cy="50" r="3" fill="#C9ADA7">
          <animate attributeName="cx" values="60;42;60" dur="2.4s" repeatCount="indefinite"/>
        </circle>
        <!-- Cable to pulley (dashed) -->
        <line x1="60" y1="50" x2="90" y2="40" stroke="#9A8C98" stroke-width="1.2" stroke-dasharray="2 2">
          <animate attributeName="x1" values="60;42;60" dur="2.4s" repeatCount="indefinite"/>
        </line>
      </g>
    </svg>`
  },

  // ───── Bizeps-Curls (KH, mit Supination) ─────
  bizeps_curls: {
    name: "Bizeps-Curls (KH, mit Supination)",
    target: "Bizeps",
    notes: "Beim Hochbewegen Handfläche nach oben drehen (Supination). Ellbogen am Körper, kein Schwung aus der Hüfte.",
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <g fill="none" stroke-linecap="round" stroke-linejoin="round">
        <!-- Floor -->
        <line x1="20" y1="94" x2="80" y2="94" stroke="#9A8C98" stroke-width="1.2"/>
        <!-- Head -->
        <circle cx="50" cy="20" r="5" fill="#C9ADA7"/>
        <!-- Torso -->
        <line x1="50" y1="25" x2="50" y2="62" stroke="#F2E9E4" stroke-width="2.5"/>
        <!-- Legs -->
        <line x1="50" y1="62" x2="42" y2="92" stroke="#F2E9E4" stroke-width="2.5"/>
        <line x1="50" y1="62" x2="58" y2="92" stroke="#F2E9E4" stroke-width="2.5"/>
        <!-- Upper arms stay at side (shoulder ~32) -->
        <line x1="46" y1="32" x2="40" y2="52" stroke="#F2E9E4" stroke-width="2.5"/>
        <line x1="54" y1="32" x2="60" y2="52" stroke="#F2E9E4" stroke-width="2.5"/>
        <!-- Forearms — curl up -->
        <line x1="40" y1="52" x2="40" y2="74" stroke="#F2E9E4" stroke-width="2.5">
          <animate attributeName="y2" values="74;36;74" dur="2.2s" repeatCount="indefinite"/>
          <animate attributeName="x2" values="40;44;40" dur="2.2s" repeatCount="indefinite"/>
        </line>
        <line x1="60" y1="52" x2="60" y2="74" stroke="#F2E9E4" stroke-width="2.5">
          <animate attributeName="y2" values="74;36;74" dur="2.2s" repeatCount="indefinite"/>
          <animate attributeName="x2" values="60;56;60" dur="2.2s" repeatCount="indefinite"/>
        </line>
        <!-- Dumbbells -->
        <rect x="33" y="71" width="14" height="6" rx="1.5" fill="#C9ADA7">
          <animate attributeName="y" values="71;33;71" dur="2.2s" repeatCount="indefinite"/>
          <animate attributeName="x" values="33;37;33" dur="2.2s" repeatCount="indefinite"/>
        </rect>
        <rect x="53" y="71" width="14" height="6" rx="1.5" fill="#C9ADA7">
          <animate attributeName="y" values="71;33;71" dur="2.2s" repeatCount="indefinite"/>
          <animate attributeName="x" values="53;49;53" dur="2.2s" repeatCount="indefinite"/>
        </rect>
      </g>
    </svg>`
  },

  // ───── Trizepsdrücken am Kabel ─────
  trizeps_kabel: {
    name: "Trizepsdrücken am Kabel",
    target: "Trizeps",
    notes: "Ellbogen am Körper fixieren, nur Unterarm bewegt sich. Am unteren Ende kurz halten.",
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <g fill="none" stroke-linecap="round" stroke-linejoin="round">
        <!-- Cable tower top -->
        <line x1="20" y1="8" x2="80" y2="8" stroke="#9A8C98" stroke-width="2"/>
        <!-- Pulley -->
        <circle cx="50" cy="8" r="3" stroke="#9A8C98" stroke-width="1.5"/>
        <!-- Cable down to handle -->
        <line x1="50" y1="11" x2="50" y2="40" stroke="#9A8C98" stroke-width="1.2">
          <animate attributeName="y2" values="40;58;40" dur="2.2s" repeatCount="indefinite"/>
        </line>
        <!-- Handle (rope bar) -->
        <rect x="42" y="38" width="16" height="5" rx="1.5" fill="#C9ADA7">
          <animate attributeName="y" values="38;56;38" dur="2.2s" repeatCount="indefinite"/>
        </rect>
        <!-- Head -->
        <circle cx="50" cy="52" r="5" fill="#C9ADA7"/>
        <!-- Torso -->
        <line x1="50" y1="57" x2="50" y2="80" stroke="#F2E9E4" stroke-width="2.5"/>
        <!-- Legs -->
        <line x1="50" y1="80" x2="42" y2="92" stroke="#F2E9E4" stroke-width="2.5"/>
        <line x1="50" y1="80" x2="58" y2="92" stroke="#F2E9E4" stroke-width="2.5"/>
        <!-- Upper arms (elbows tucked) -->
        <line x1="46" y1="60" x2="42" y2="72" stroke="#F2E9E4" stroke-width="2.5"/>
        <line x1="54" y1="60" x2="58" y2="72" stroke="#F2E9E4" stroke-width="2.5"/>
        <!-- Forearms going down to handle -->
        <line x1="42" y1="72" x2="44" y2="42" stroke="#F2E9E4" stroke-width="2.5">
          <animate attributeName="y2" values="42;60;42" dur="2.2s" repeatCount="indefinite"/>
        </line>
        <line x1="58" y1="72" x2="56" y2="42" stroke="#F2E9E4" stroke-width="2.5">
          <animate attributeName="y2" values="42;60;42" dur="2.2s" repeatCount="indefinite"/>
        </line>
      </g>
    </svg>`
  },

  // ───── Hip Thrust ─────
  hip_thrust: {
    name: "Hip Thrust",
    target: "Gesäß",
    notes: "Oberer Rücken auf der Bank, Füße schulterbreit. Becken am oberen Ende voll strecken, Gesäß aktiv anspannen. Kein Hohlkreuz.",
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <g fill="none" stroke-linecap="round" stroke-linejoin="round">
        <!-- Floor -->
        <line x1="6" y1="94" x2="94" y2="94" stroke="#9A8C98" stroke-width="1.2"/>
        <!-- Bench: pad on legs -->
        <rect x="6" y="40" width="30" height="6" rx="2" fill="#4A4E69" stroke="#9A8C98" stroke-width="1.5"/>
        <line x1="10" y1="46" x2="10" y2="74" stroke="#9A8C98" stroke-width="1.5"/>
        <line x1="32" y1="46" x2="32" y2="74" stroke="#9A8C98" stroke-width="1.5"/>
        <!-- Barbell across hips -->
        <rect x="44" y="56" width="22" height="6" rx="1.5" fill="#C9ADA7">
          <animate attributeName="y" values="56;42;56" dur="2.4s" repeatCount="indefinite"/>
        </rect>
        <!-- Head (rests on bench) -->
        <circle cx="14" cy="38" r="5" fill="#C9ADA7"/>
        <!-- Body line: shoulder (20,42) → hip (~55, animated y) → knee (~70, 70) -->
        <line x1="20" y1="42" x2="55" y2="62" stroke="#F2E9E4" stroke-width="2.5">
          <animate attributeName="x2" values="55;55;55" dur="2.4s" repeatCount="indefinite"/>
          <animate attributeName="y2" values="62;48;62" dur="2.4s" repeatCount="indefinite"/>
        </line>
        <!-- Thigh: hip → knee -->
        <line x1="55" y1="62" x2="70" y2="74" stroke="#F2E9E4" stroke-width="2.5">
          <animate attributeName="x1" values="55;55;55" dur="2.4s" repeatCount="indefinite"/>
          <animate attributeName="y1" values="62;48;62" dur="2.4s" repeatCount="indefinite"/>
        </line>
        <!-- Shin: knee → foot -->
        <line x1="70" y1="74" x2="70" y2="94" stroke="#F2E9E4" stroke-width="2.5"/>
      </g>
    </svg>`
  },

  // ───── Face Pulls ─────
  face_pulls: {
    name: "Face Pulls",
    target: "Hintere Schulter, mittlerer Trapez",
    notes: "Kabel auf Gesichtshöhe einstellen. Ellbogen HOCH, zur Stirn ziehen, Schulterblätter zusammen. Bewusst langsam.",
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <g fill="none" stroke-linecap="round" stroke-linejoin="round">
        <!-- Cable tower -->
        <line x1="86" y1="14" x2="86" y2="44" stroke="#9A8C98" stroke-width="1.6"/>
        <circle cx="86" cy="30" r="3" stroke="#9A8C98" stroke-width="1.4"/>
        <!-- Floor -->
        <line x1="14" y1="94" x2="80" y2="94" stroke="#9A8C98" stroke-width="1.2"/>
        <!-- Head -->
        <circle cx="34" cy="30" r="5" fill="#C9ADA7"/>
        <!-- Torso -->
        <line x1="34" y1="35" x2="34" y2="70" stroke="#F2E9E4" stroke-width="2.5"/>
        <!-- Legs -->
        <line x1="34" y1="70" x2="26" y2="92" stroke="#F2E9E4" stroke-width="2.5"/>
        <line x1="34" y1="70" x2="42" y2="92" stroke="#F2E9E4" stroke-width="2.5"/>
        <!-- Upper arms — elbows high and out -->
        <line x1="32" y1="40" x2="52" y2="34" stroke="#F2E9E4" stroke-width="2.5">
          <animate attributeName="x2" values="52;46;52" dur="2.4s" repeatCount="indefinite"/>
          <animate attributeName="y2" values="34;30;34" dur="2.4s" repeatCount="indefinite"/>
        </line>
        <line x1="36" y1="42" x2="56" y2="46" stroke="#F2E9E4" stroke-width="2.5">
          <animate attributeName="x2" values="56;48;56" dur="2.4s" repeatCount="indefinite"/>
          <animate attributeName="y2" values="46;38;46" dur="2.4s" repeatCount="indefinite"/>
        </line>
        <!-- Forearms going to rope handles near face -->
        <line x1="52" y1="34" x2="44" y2="28" stroke="#F2E9E4" stroke-width="2.5">
          <animate attributeName="x1" values="52;46;52" dur="2.4s" repeatCount="indefinite"/>
          <animate attributeName="y1" values="34;30;34" dur="2.4s" repeatCount="indefinite"/>
          <animate attributeName="x2" values="44;38;44" dur="2.4s" repeatCount="indefinite"/>
        </line>
        <line x1="56" y1="46" x2="44" y2="34" stroke="#F2E9E4" stroke-width="2.5">
          <animate attributeName="x1" values="56;48;56" dur="2.4s" repeatCount="indefinite"/>
          <animate attributeName="y1" values="46;38;46" dur="2.4s" repeatCount="indefinite"/>
          <animate attributeName="x2" values="44;38;44" dur="2.4s" repeatCount="indefinite"/>
        </line>
        <!-- Cable from pulley to hands -->
        <line x1="86" y1="33" x2="44" y2="30" stroke="#9A8C98" stroke-width="1.2" stroke-dasharray="2 2">
          <animate attributeName="x2" values="44;38;44" dur="2.4s" repeatCount="indefinite"/>
          <animate attributeName="y2" values="30;30;30" dur="2.4s" repeatCount="indefinite"/>
        </line>
      </g>
    </svg>`
  },

  // ───── Liegestütze ─────
  liegestuetze: {
    name: "Liegestütze",
    target: "Brust, Schultern, Trizeps, Core",
    notes: "Körper bildet eine gerade Linie, Po nicht hochstrecken oder durchhängen lassen. Auf Knien okay als Variation.",
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <g fill="none" stroke-linecap="round" stroke-linejoin="round">
        <!-- Floor -->
        <line x1="6" y1="86" x2="94" y2="86" stroke="#9A8C98" stroke-width="1.2"/>
        <!-- Body group moves down/up -->
        <g>
          <animateTransform attributeName="transform" type="translate"
            values="0 0;0 8;0 0" dur="2.2s" repeatCount="indefinite"/>
          <!-- Body line: shoulders to ankles, slight downhill -->
          <circle cx="82" cy="52" r="5" fill="#C9ADA7"/>
          <line x1="78" y1="55" x2="20" y2="64" stroke="#F2E9E4" stroke-width="2.5"/>
          <!-- Arms (vertical from shoulders to floor) -->
          <line x1="74" y1="56" x2="68" y2="84" stroke="#F2E9E4" stroke-width="2.5"/>
          <line x1="68" y1="84" x2="64" y2="86" stroke="#F2E9E4" stroke-width="2.5"/>
          <!-- Legs (toes on floor) -->
          <line x1="20" y1="64" x2="14" y2="84" stroke="#F2E9E4" stroke-width="2.5"/>
          <line x1="14" y1="84" x2="18" y2="86" stroke="#F2E9E4" stroke-width="2.5"/>
        </g>
      </g>
    </svg>`
  },

  // ───── Latzug eng (Untergriff) ─────
  latzug_eng: {
    name: "Latzug eng (Untergriff)",
    target: "Latissimus, Bizeps",
    notes: "Untergriff schulterbreit. Ellbogen nach unten und hinten ziehen, Brust hoch.",
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <g fill="none" stroke-linecap="round" stroke-linejoin="round">
        <!-- Frame top -->
        <line x1="14" y1="10" x2="86" y2="10" stroke="#9A8C98" stroke-width="2"/>
        <circle cx="50" cy="10" r="3" stroke="#9A8C98" stroke-width="1.5"/>
        <!-- Cable -->
        <line x1="50" y1="13" x2="50" y2="34" stroke="#9A8C98" stroke-width="1.2">
          <animate attributeName="y2" values="34;48;34" dur="2.4s" repeatCount="indefinite"/>
        </line>
        <!-- Narrow bar -->
        <rect x="40" y="32" width="20" height="5" rx="2" fill="#C9ADA7">
          <animate attributeName="y" values="32;46;32" dur="2.4s" repeatCount="indefinite"/>
        </rect>
        <!-- Head -->
        <circle cx="50" cy="62" r="5" fill="#C9ADA7"/>
        <!-- Torso (slight backward lean) -->
        <line x1="50" y1="67" x2="50" y2="84" stroke="#F2E9E4" stroke-width="2.5"/>
        <!-- Legs -->
        <line x1="50" y1="84" x2="40" y2="94" stroke="#F2E9E4" stroke-width="2.5"/>
        <line x1="50" y1="84" x2="60" y2="94" stroke="#F2E9E4" stroke-width="2.5"/>
        <!-- Arms (close grip) -->
        <line x1="46" y1="64" x2="42" y2="36" stroke="#F2E9E4" stroke-width="2.5">
          <animate attributeName="y2" values="36;49;36" dur="2.4s" repeatCount="indefinite"/>
        </line>
        <line x1="54" y1="64" x2="58" y2="36" stroke="#F2E9E4" stroke-width="2.5">
          <animate attributeName="y2" values="36;49;36" dur="2.4s" repeatCount="indefinite"/>
        </line>
      </g>
    </svg>`
  },

  // ───── Rudermaschine / T-Bar Row ─────
  rudern_maschine: {
    name: "Rudermaschine / T-Bar",
    target: "Mittlerer Rücken",
    notes: "Brust an Polster (falls Maschine). Ellbogen eng am Körper ziehen, Schulterblätter aktiv zusammen.",
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <g fill="none" stroke-linecap="round" stroke-linejoin="round">
        <!-- Floor -->
        <line x1="6" y1="92" x2="94" y2="92" stroke="#9A8C98" stroke-width="1.2"/>
        <!-- Pivot at floor right -->
        <circle cx="86" cy="92" r="2.5" fill="#9A8C98"/>
        <!-- T-bar lever (pivots at base) -->
        <g>
          <animateTransform attributeName="transform" type="rotate"
            values="-30 86 92;-50 86 92;-30 86 92" dur="2.4s" repeatCount="indefinite"/>
          <line x1="86" y1="92" x2="24" y2="60" stroke="#C9ADA7" stroke-width="3"/>
          <!-- Plate stack -->
          <circle cx="80" cy="88" r="5" stroke="#9A8C98" stroke-width="1.5" fill="#4A4E69"/>
        </g>
        <!-- Person standing over bar, bent forward -->
        <!-- Head -->
        <circle cx="32" cy="40" r="5" fill="#C9ADA7"/>
        <!-- Torso bent forward -->
        <line x1="34" y1="45" x2="50" y2="62" stroke="#F2E9E4" stroke-width="2.5"/>
        <!-- Hip / Legs -->
        <line x1="50" y1="62" x2="48" y2="92" stroke="#F2E9E4" stroke-width="2.5"/>
        <line x1="50" y1="62" x2="56" y2="92" stroke="#F2E9E4" stroke-width="2.5"/>
        <!-- Arms gripping bar (animated y to indicate pull) -->
        <line x1="40" y1="48" x2="36" y2="68" stroke="#F2E9E4" stroke-width="2.5">
          <animate attributeName="y2" values="68;58;68" dur="2.4s" repeatCount="indefinite"/>
        </line>
        <line x1="36" y1="68" x2="30" y2="76" stroke="#F2E9E4" stroke-width="2.5">
          <animate attributeName="y1" values="68;58;68" dur="2.4s" repeatCount="indefinite"/>
          <animate attributeName="y2" values="76;60;76" dur="2.4s" repeatCount="indefinite"/>
        </line>
      </g>
    </svg>`
  }
};
