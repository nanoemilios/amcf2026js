/* ============================================================
   AMCF Website-Daten (Projekte-Overrides, lokale Projekte &
   Lebenslauf-Überschreibungen)
   ------------------------------------------------------------
   Diese Datei wird von index.html als <script> geladen. Sie wird
   von der Admin-Seite (admin.html) generiert und sorgt dafür,
   dass Projekt- UND Lebenslauf-Änderungen für ALLE Besucher
   sichtbar sind – auf jedem Hosting (Cloudflare, Apache, nginx,
   GitHub Pages …) und auch beim lokalen Öffnen (Doppelklick auf
   index.html).

   So aktualisieren:
   1. admin.html öffnen, einloggen, Projekte und/oder Lebenslauf
      bearbeiten (Fakten, Einträge, verbergen, hinzufügen)
   2. „Datei data/projects.js herunterladen" klicken
   3. Die heruntergeladene Datei in den Ordner 2026/data/ legen
      (diesen bestehenden Inhalt ersetzen) und die Seite neu uploaden.

   Struktur:
   - edits:   Objekt, Index (0-7) -> {name,category,tags,image,desc,client,date,url,hidden}
   - projects:Array neuer Portfolio-Projekte {name,category,tags,image,desc,client,date,url}
   - resume:  {facts:{...}, jobs:{'1':{date,title,text,l1..l7}, ...}}

   Das Format ist rein statisch ("use strict"-sicher, nur Daten),
   damit es auf jedem Host keine Code-Abhängigkeiten erfordert.
   ============================================================ */
window.AMCF_SITE_DATA = {
	"edits": {},
	"projects": [],
	"resume": {
		"facts": {},
		"jobs": {}
	}
};