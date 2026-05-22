# Gym — Persönlicher Trainingsplan als PWA

Kleine Progressive Web App für Elenas 3-Tage-Hypertrophie-Programm. Dark Mode
in Coolors-Tönen (`#22223B` bis `#F2E9E4`), animierte SVG-Übungs-Icons,
Rest-Timer mit Sound und Vibration, Verlauf und Gewichte lokal im Browser
(`localStorage`). Funktioniert offline.

## Auf GitHub Pages hosten

1. **Repository erstellen** auf github.com (z. B. `gym`). Öffentlich oder
   privat ist egal.
2. **Alle Dateien hochladen** — entweder per Web-Upload („Add file" →
   „Upload files" → alles reinziehen) oder per `git push`.
3. **Pages aktivieren:** Repo → **Settings → Pages**
   - Source: `Deploy from a branch`
   - Branch: `main`, Folder: `/ (root)`
4. **1–2 Minuten warten** — URL erscheint oben auf der Pages-Seite, meist
   `https://USERNAME.github.io/REPO/`.
5. **Diese URL am Handy öffnen** (iOS Safari oder Android Chrome).
6. **Zum Home-Bildschirm hinzufügen:**
   - iOS Safari: Teilen → „Zum Home-Bildschirm"
   - Android Chrome: ⋮-Menü → „App installieren" / „Zum Startbildschirm"

Fertig — fühlt sich wie eine echte App an, läuft offline, Spotify
nebenbei.

## Updates pushen

Bei jeder Änderung im Repo wird nach 1–2 Minuten neu deployed. Der Service
Worker zieht die neue Version automatisch nach (network-first für
HTML/JS/CSS, daher kommen Änderungen sofort an, sobald das Handy Empfang
hat). Wenn ein Update mal nicht greift: App komplett schliessen und neu
öffnen.

## Daten exportieren und sichern

Einstellungen → **Daten → Exportieren** legt den kompletten Verlauf samt
Gewichten als JSON in die Zwischenablage. Speichern in Notizen, Mail oder
Datei — fertiges Backup. **Importieren** liest aus der Zwischenablage
wieder ein.

Falls die Zwischenablage nicht zugänglich ist (z. B. Safari ohne Erlaubnis),
erscheint automatisch ein Textfeld zum Kopieren bzw. Einfügen.

## Datenstruktur (lokal)

Versionierte Keys unter `gym.v1.*`:

- `gym.v1.settings` — `{sound, vibration, defaultRest}`
- `gym.v1.history`  — Array von Sessions, max. 100
- `gym.v1.lastWeights` — `{[exerciseId]: kg}`

Wenn der Browser localStorage blockiert (Safari Private Mode),
läuft die App über einen In-Memory-Fallback — Workouts gehen nur für die
Sitzung, aber die App stürzt nicht ab.

## Dateistruktur

```
gym-app/
├ index.html       Grundgerüst der App
├ styles.css       Komplettes Styling (Coolors-Palette)
├ app.js           Hauptlogik (Navigation, State, Timer, Speicherung)
├ plan.js          Trainingsplan-Definition (3 Tage)
├ exercises.js     Übungs-Datenbank mit animierten SVGs
├ sw.js            Service Worker für Offline + Update-Strategie
├ manifest.json    PWA-Manifest
├ icon-192.png     App-Icon klein
├ icon-512.png     App-Icon gross
└ tools/           Lokale Test-Skripte (nicht deployen, in .gitignore)
```

## Plan anpassen

Die Trainingsstruktur steht in `plan.js`. Neue Übungen kannst du in
`exercises.js` ergänzen (oder fragen — die SVGs schreibe ich dir).

## Tests lokal laufen lassen

```bash
# Server starten
python3 -m http.server 8765

# In einem zweiten Terminal:
cd tools
npm install              # einmalig — installiert Playwright
node smoke.js            # Golden-Path-Smoke-Test
node e2e.js              # Per-Set-Hints, Offline, Export
node audit-svgs.js       # rendert alle 16 Icons in einem Raster
```

Screenshots landen in `tools/screenshots/`.

## Datenschutz

Alles bleibt auf deinem Gerät. Kein Backend, kein Tracking, keine Cookies,
keine externen Schriftarten. „Daten zurücksetzen" in den Einstellungen
leert den localStorage für diese URL.
