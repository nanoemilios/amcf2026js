# AMCF2026js

Statische Variante der Portfolio-/CV-Seite von **Alberto M. Costa Ferreiro** –
ohne PHP und ohne Server-Schreibendpunkt.

- **Live-Ziel:** <https://albertocosta.info/> (Root)
- **Sprachen:** Deutsch, Schweizerdeutsch, English, Español, Galego, Português
- **Stack:** HTML5, CSS3, Vanilla JS, jQuery, Superslides/MixItUp/FlexSlider/Owl
- **Editor:** `admin-content.html` (schreibt Dateien nur lokal im Browser)

## Inhalt bearbeiten

1. `admin-content.html` öffnen (lokal oder live).
2. Passwort eingeben (der Hash steht in `js/admin-content.js`).
3. Bereich wählen: `index.html (Deutsch)` oder eine Übersetzung.
4. „Ordner wählen“ und den Projektordner freigeben, dann „Speichern“.
   Ohne File-System-Access-API (z. B. Firefox) stattdessen „Dateien herunterladen“
   und die Dateien manuell ersetzen.

Es gibt bewusst **keinen** PHP-Endpunkt: Die Seite ist rein statisch, und ein
öffentlich erreichbarer Schreib-Endpunkt wäre eine Sicherheitslücke.

**Wichtig:** Die Titel der Lebenslauf-Einträge (`resume.jobN.title`) sind
sprachneutral und stehen nur in `index.html`. Sie werden in keiner Übersetzung
gepflegt und im Editor bei anderen Sprachen schreibgeschützt angezeigt.

## Tests

Alle Tests (Node + headless Chrome) laufen mit einem Aufruf. Der Runner startet
bei Bedarf selbst einen PHP-Server auf Port 8000 und beendet ihn danach wieder.

```bash
AMCF_ADMIN_PASSWORD=… ./tests/run-all.sh
```

Chrome/Chromium wird automatisch gesucht: `CHROME_PATH`, die portable Version
unter `~/.local/opt/chrome-headless-shell/` oder eine Systeminstallation.

## Deploy auf albertocosta.info (Root)

1. **Backup des Live-Stands** (falls noch nicht geschehen):
   `~/Coding/nanoemilios/_backups/albertocosta-root-2022-2026-10-24/`
   enthält einen vollständigen Mirror der alten 2022er-Seite inklusive Assets.
2. **Nicht hochladen:** `.git/`, `tests/`, `README.md`, `_backups/`.
   `old/` wurde entfernt (Archiv:
   `~/Coding/nanoemilios/_backups/amcf2026js-legacy-old-2026-10-24.tar.gz`);
   es enthielt ungeschützte PHP-Schreibendpunkte und darf nie ins Web.
3. **Auf dem Server löschen**, falls noch vorhanden: `save.php`, `data/`,
   `php/`, `admin.html`, `old/`. Sonst bleiben alte Schreibendpunkte erreichbar.
4. Alle Dateien inkl. `css/`, `js/`, `images/`, `.htaccess`, `robots.txt`,
   `sitemap.xml` hochladen. Der Live-Stand war zuletzt inkonsistent
   (neues `index.html`, altes CSS/JS) – deshalb immer den kompletten Satz
   ausliefern.
5. Prüfen: Startseite, alle sechs Sprachen, Portfolio-Lightbox, Lebenslauf,
   CV-Download, Konsole (keine 404/JS-Fehler), `/2026/` leitet auf `/` um.

## Struktur

```
index.html              Hauptseite (deutsche Quelle, AMCF-Marker)
admin-content.html      Inhaltseditor (nur lokale Schreibzugriffe)
js/amcf-content.js      Parser/Writer für index.html + Übersetzungen
js/admin-content.js     Editor-Logik
js/i18n.*.js            Übersetzungen (Titel der CV-Einträge bewusst nicht)
css/style.css           Layout, Dark Mode, responsive Regeln
images/                 optimierte Bilder (JPEG/PNG, lazy loading)
tests/                  Node- und Browser-Tests
.htaccess               HTTPS, Security-Header, Caching
robots.txt / sitemap.xml
```

## Bildgrößen

Die Bilder wurden für das Live-Deploy komprimiert (JPEG q82–85, lange Kante
max. 1600 px). Undurchsichtige Folio-/CV-PNGs wurden zu JPEG konvertiert.
`images/og-cover.jpg` (1200×630) ist das Social-Preview-Bild.
