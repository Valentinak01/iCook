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

## Grenzen des Prototyps

- Daten liegen nur im jeweiligen Browser. Das Teilen mit anderen und gemeinsame Rezeptbücher („für alle sichtbar“) brauchen später ein Backend.
- Der Speicherplatz im Browser ist begrenzt (ca. 5 MB). Fotos werden deshalb verkleinert.
