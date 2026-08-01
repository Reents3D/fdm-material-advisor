# Mitmachen

Korrekturen und Ergänzungen sind willkommen — besonders von Leuten, die die Werkstoffe
täglich fahren. Werkstatterfahrung ist in dieser Datenbank die knappste Ressource.

## Setup

Node 24 (oder mindestens 23.6) — der CSV-Export lädt die TypeScript-Bausteine
ohne Buildschritt, damit veröffentlichte und heruntergeladene Tabelle aus
derselben Quelle stammen.

```bash
git clone https://github.com/Reents3D/fdm-material-advisor.git
cd fdm-material-advisor && npm install
npm run dev        # Entwicklungsserver
npm run ci         # alles, was auch die Pipeline prüft
```

## Die eine Regel

**Kein Wert ohne Beleg.**

Ein Feld mit `confidence: "high"` oder `"medium"` **muss** eine echte Quelle zitieren.
Wer schätzt, setzt `confidence: "estimated"`, `source: "estimate_reasoning"` und schreibt
in die Notiz, worauf die Schätzung beruht. Die CI erzwingt das (Regel R7).

Lieber ein leeres Feld als ein erfundenes. Ein leeres Feld senkt nur die
Datenvollständigkeit; ein erfundenes beschädigt das ganze Projekt.

## Ein Material ergänzen

1. Issue-Template *„Material hinzufügen"* nutzen — oder direkt einen PR öffnen
2. `data/materials/<id>.json` nach dem Muster von `petg-cf.json` anlegen
   (das ist der Referenzdatensatz und definiert den Qualitätsmaßstab)
3. `npm run validate` bis alles grün ist
4. PR mit Quellenangabe im Text

Feldreferenz: [DATA_MODEL.md](DATA_MODEL.md) · Zitierregeln: [SOURCES.md](SOURCES.md)

## Worauf wir beim Review achten

- [ ] Jeder Zahlenwert hat Einheit, Quelle, Konfidenz
- [ ] Mechanische Werte tragen `orientation` (XY oder Z) — ohne sie sind sie wertlos
- [ ] `min`/`max` = Marktspanne, `tolerance` = Streuung einer Quelle. Nicht mischen.
- [ ] Vorbehandlung der Prüfkörper in `conditions` (getempert? getrocknet?)
- [ ] Anisotropiefaktor nur aus Operanden **derselben** Quelle
- [ ] Widersprüche zwischen Quellen als `openQuestion` erfasst, nicht weggemittelt
- [ ] Keine Datenblatt-Texte, -Grafiken oder -Tabellenlayouts übernommen. Nur Messwerte.

## Was wir nicht aufnehmen

- Werte aus dem Gedächtnis oder aus Forenposts ohne Methodenbeschreibung
- Kopierte Datenblatt-Prosa (Urheberrecht — siehe SOURCES.md §1)
- Gemittelte Werte über unvereinbare Prüfbedingungen
- Ein Scoring-Bonus für Materialien, die Reents3D führt (siehe ADR-004)

## Code

- Engine (`src/engine/`) bleibt **framework-frei** — kein React-Import
- Nicht-triviale Entscheidungen als ADR in `DECISIONS.md`
- Deutsch für Inhalte, Englisch für Code, Kommentare und Commit-Messages
- Conventional Commits: `feat(engine):`, `data(materials):`, `fix(ui):`
