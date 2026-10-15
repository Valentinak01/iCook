# iCook – Digitales Rezeptbuch (Frontend-Prototyp)

React-Umsetzung des App-Konzepts „Digitales Rezeptbuch“. Reines Frontend: **kein Backend, keine Datenbank, keine Anmeldung**.
Alle Daten werden lokal im Browser gespeichert (`localStorage`).

## Sofort ansehen (ohne Installation)

`iCook-Vorschau.html` doppelklicken. React wird dabei aus dem Internet (CDN) geladen.

## Als React-Projekt starten

Voraussetzung: [Node.js](https://nodejs.org) (LTS, ab Version 18).

```bash
npm install
npm run dev      # Entwicklungsserver: http://localhost:5173
npm run build    # Produktions-Build nach dist/
```

Nach Änderungen im Code die Vorschau-Datei neu erzeugen: `python build-standalone.py`

## Funktionen

| Bereich | Umsetzung |
|---|---|
| Startseite | Begrüßung „Was kochen wir heute?“, Suche, Kategorie-Chips, Zuletzt gekocht, Favoriten, Neu hinzugefügt, „Überrasch mich“ |
| Alle Rezepte | Karten- oder Listenansicht, Suche nach Titel/Beschreibung/Kategorie, Zutatensuche („Ich habe …“), Filter nach Kategorien, Zeit, Schwierigkeit, Favoriten, Sortierung |
| Kategorien | Erstellen, umbenennen, Symbol und Farbe wählen, sortieren, löschen; Gruppen (Herkunft, Mahlzeit, …) |
| Rezept anlegen/bearbeiten | Abschnitte 1–6, Pflichtfeld Titel, Foto-Upload (wird verkleinert), Zutaten mit Menge/Einheit, Schritte sortierbar, Text-Import für Zutaten und Schritte, Allergene, Hinweis auf ähnliche Titel, Warnung bei ungespeicherten Änderungen |
| Detailseite | Großes Bild, Favorit, Tags, Kurzinfos, Portionsrechner mit Einheiten-Umrechnung, Zutaten abhaken, Schritte abhaken, Notizen, Bewertung, eigene Erfahrungen, Bearbeiten/Duplizieren/Teilen/Löschen |
| Kochmodus | Großer Text, Schritt für Schritt (auch per Pfeiltasten), Zutaten einblendbar, Bildschirm bleibt aktiv (Wake Lock) |
| Einkaufsliste | Rezepte mit Portionen hinzufügen, gleiche Zutaten werden zusammengeführt, manuelle Einträge, abhaken |
| Einstellungen | Akzentfarbe (Mint, Limette, Oliv, Burgundy), Standardansicht, Einheiten-Umrechnung, JSON-Backup exportieren/importieren, Beispieldaten zurücksetzen |

## Projektstruktur

```
src/
  App.jsx                 Routing (Hash-Router) und Akzentfarbe
  store.jsx               Zentraler Zustand + localStorage
  router.jsx              Minimaler Hash-Router
  utils.js                Mengen, Umrechnung, Bilder, Parser
  data/sampleData.js      Startkategorien und Beispielrezepte
  components/             Layout, Icons, Rezeptkarte, Dialoge
  pages/                  Seiten (Start, Rezepte, Detail, Formular, …)
  styles.css              Dark-Mode-Design
```

## Gemeinsames Rezeptbuch (Online-Datenbank)

Ohne Einrichtung speichert iCook alles nur im jeweiligen Browser. Mit einer kostenlosen
[Supabase](https://supabase.com)-Datenbank sind Rezepte, Kategorien und Fotos für **alle** sichtbar
und von **allen** bearbeitbar (ohne Anmeldung). Favoriten, Einkaufsliste und Einstellungen bleiben persönlich im Browser.

1. Auf supabase.com ein kostenloses Konto und ein Projekt anlegen (Region z. B. *Frankfurt*).
2. Im Dashboard **SQL Editor** öffnen, den Inhalt von `supabase/schema.sql` einfügen und **Run** klicken.
3. Unter **Project Settings → API** die *Project URL* und den *anon public* Key kopieren und in
   `src/config.js` eintragen. **Niemals** den `service_role`-Key verwenden.
4. Committen und pushen – GitHub Pages veröffentlicht die neue Version automatisch.
5. Beim ersten Öffnen legt die App die Beispielrezepte an. Eigene Rezepte aus dem Browser lassen sich unter
   **Einstellungen → Speicherort → Hochladen** übertragen.

Hinweise: Alle, die den Link kennen, können Rezepte ändern und löschen – regelmäßig ein Backup exportieren.
Kostenlose Supabase-Projekte pausieren nach etwa einer Woche ohne Nutzung und lassen sich im Dashboard wieder starten.

## Grenzen des Prototyps

- Ohne Online-Datenbank liegen die Daten nur im jeweiligen Browser (siehe oben).
- Mit Online-Datenbank gilt: Wer zuletzt speichert, gewinnt – gleichzeitiges Bearbeiten desselben Rezepts überschreibt sich.
- Der Speicherplatz im Browser ist begrenzt (ca. 5 MB). Fotos werden deshalb verkleinert.
