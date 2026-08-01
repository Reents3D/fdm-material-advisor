# PLAN.md — FDM-Materialberater

**Stand:** 2026-08-01 · **Phasen 0–3 live, Corporate Design umgesetzt** · Phase 4 (Datenausbau) läuft
**Live:** https://reents3d.github.io/fdm-material-advisor/
**Nächster Schritt:** Rückfragen in Abschnitt 5 klären, dann Datenausbau

---

## 0. Was fertig ist

| Phase | Status |
|---|---|
| **0 — Gerüst und Deployment** | ✅ Vite + React 18 + TS strict + Tailwind 4, CI und Pages-Deploy automatisch aus `main` |
| **1 — Datenfundament** | ⬤ teilweise: Schema, 11 Materialien, 15 CI-Regeln. Offen: Use Cases, Chemikalien-/Normen-Register |
| **2 — Engine** | ✅ Constraints, Perzentil-Scoring, Erklärungen, Trade-offs, Verfahrensweiche, Sensitivität |
| **3 — Oberfläche** | ✅ Wizard, Ergebnis, Vergleich, Datenblatt, Ashby-Diagramm, Matrix, DE/EN, Print |
| **4 — Datenausbau** | ⬤ weit: 111 Herstellerprodukte aus 8 Marken, 32 Werkstofftypen. Offen: restliche Ultrafuse-Typen (Portal), Fiberlogy, Fillamentum, Preise |
| **CD** | ✅ Design-Tokens von der Unternehmenswebsite abgenommen, echtes Logo, Montserrat + Sora selbst gehostet |
| **5 — Ausbau** | ⬤ teilweise: Ashby, Print, JSON-LD, CSV-Export, PDF-Bericht und Offlinebetrieb stehen. Offen: Radar |
| **6 — Launch** | ⬤ teilweise: README, Lizenzen, Templates, Vorschaubild stehen. Offen: Screenshots, Lighthouse, Domain |

**Verifiziert, nicht behauptet** (`npm run ci`):

| Prüfung | Ergebnis |
|---|---|
| JSON Schema, 11 Dateien | PASS |
| Plausibilität und Provenienz, 15 Regeln | 0 Fehler, 3 dokumentierte Datenblatt-Anomalien |
| Typecheck (strict) | PASS |
| Tests | 62 grün |
| Bundle | 112 kB gzip JS + 6 kB CSS (Budget 350 kB) |
| Live-Deployment | HTTP 200, keine Konsolenfehler |

**Konfidenz über die gesamte Datenbank: 861 belegte Aussagen —
15 high · 367 medium · 44 low · 435 estimated.**

51 % sind gekennzeichnete Schätzungen. Das ist kein Mangel der Erfassung, sondern der
Zustand der öffentlichen Datenlage — und genau der Grund, warum die Konfidenzkennzeichnung
im Datenmodell ganz vorn steht. Die Zahl wird in der Oberfläche angezeigt, nicht versteckt.

### Was der Live-Test gefunden hat

Zwei Fehler wurden erst im Browser sichtbar und sind behoben:

1. **TPU 95A stand bei einer 90-°C-Anforderung auf Platz 1** — es hat keinerlei
   Temperaturdaten und passierte den Filter nur durch Unwissen. Jetzt ranken unbelegte
   Treffer immer hinter belegten und tragen ein Badge „nicht belegt" (→ ADR-006).
2. **„Knapp erfüllt — nur −100 % Reserve"** — die Reserve wurde auf fehlenden Daten
   gerechnet. `constraintReserve` liefert jetzt `null`, wenn der Wert fehlt.

Beide sind durch Regressionstests abgedeckt.

---

## 1. Der zentrale Befund aus der Recherche

Bei der Auswertung von drei Quellen für **ein einziges Material** traten alle Probleme
auf, die das Datenmodell abbilden muss:

| Befund | Konsequenz im Modell |
|---|---|
| Bambu misst 59 MPa (XY) an **vorbehandelten** Prüfkörpern, Flashforge 40–43 MPa an **ausdrücklich nicht getemperten** | `conditions` + aggregierter Wert mit Spanne statt einer Zahl |
| Nur **eine von drei** Quellen veröffentlicht überhaupt Z-Werte | Anisotropiefaktor wird zum Alleinstellungsmerkmal — er ist belegbar und fehlt anderswo |
| Schlagzähigkeit: Bambu ISO 179 → 15,7 kJ/m², Flashforge ISO 180 → 3–3,5 kJ/m² (**Faktor 5**) | `openQuestion` mit `blocking: true`, kein Mitteln |
| Flashforge nennt 80 °C Dauergebrauch — über Tg (68 °C) und HDT-B (70–74 °C) | Herstellerwert mit `confidence: low` **plus** eigenes konservatives Feld |
| Bambu „temperte" bei 65 °C, also **unter** Tg — bei amorphem Werkstoff nicht möglich | dokumentiert, eingeordnet, `openQuestion` |
| **PET-CF17 ist nicht PETG-CF** (HDT 147 °C vs. 70 °C) — taucht bei der Suche ganz oben auf | `notToBeConfusedWith` als Schemafeld |

**Fachliches Kernergebnis für PETG-CF:** Kohlenstofffaser bringt bei PETG **keinen
Temperaturgewinn** (HDT-B bleibt bei 70–74 °C, zwei unabhängige Quellen, gleiche Norm).
Der Gewinn liegt bei Steifigkeit, Maßhaltigkeit und Optik — erkauft mit Sprödigkeit
(Impact-Anisotropie 0,26!), Trocknungspflicht und gehärteter Düse. Das ist genau die Art
Aussage, die das Tool liefern soll und die im Markt regelmäßig falsch erzählt wird.

---

## 2. Phasenplan

### Phase 0 — Gerüst und Live-Deployment

> **Gate: Erst wenn die Seite live ist, geht es weiter.**

- [x] GitHub-Repo anlegen (Org, Name, Topics, Beschreibung) → **Rückfrage 1**
- [x] Vite + React 18 + TS strict + Tailwind, `base` aus ENV (base-path-agnostisch)
- [x] Grundgerüst `src/config/site.ts` mit allen Reents-Konstanten
- [x] Branding-Basis: Farben, selbst gehostete Schrift, Logo in `/public/brand/` → **Rückfrage 4, 6**
- [x] `.github/workflows/ci.yml` — tsc, ESLint, Prettier, Schema, Plausibilität, Vitest
- [x] `.github/workflows/deploy.yml` — Build → GitHub Pages
- [x] `scripts/prototype/*.mjs` → `scripts/validate-data.ts` portieren (in CI verdrahten)
- [x] Lizenzdateien, `DISCLAIMER.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`
- [x] Leere App live unter `https://<org>.github.io/fdm-materialberater/`

**Aufwand:** ~1 Arbeitstag · **DoD:** Deployment läuft automatisch aus `main`, CI blockt bei Schemafehler

---

### Phase 1 — Datenfundament

- [ ] `schema/usecase.schema.json`, `manufacturer.schema.json`, `glossary.schema.json`
- [ ] `data/chemicals.json` (≥ 18 Medien), `data/standards.json`, `data/sources.json`
- [ ] **15 Tier-1-Materialien** in `petg-cf`-Qualität:
      PLA, PLA+/Tough, PETG, PETG-CF ✅, ABS, ASA, PC, PA6-CF, PA12, PET-CF, TPU 95A,
      PP, PLA-CF, ASA-CF, PVA (Support)
- [x] `scripts/export-csv.mjs` — Datenbank als CSV (Übersicht, Einzelkennwerte, Produkte);
      dieselben Spaltendefinitionen wie der Download in der Anwendung, ADR-013
- [x] Referenzielle Integritätsprüfungen in CI (chemicalId, sourceId, Skalen-Polarität)

**Aufwand:** ~20–30 h (Daten dominieren) · **DoD:** 15 Datensätze grün, `dataCompleteness` ≥ 85 %

> ⚠️ **PET-CF gehört bewusst in Phase 1**, obwohl es kein Tier-1-Volumenmaterial ist:
> Solange es fehlt, ist die Verwechslungsgefahr mit PETG-CF nicht auflösbar.

---

### Phase 2 — Engine

- [x] `src/engine/` als framework-freies TS-Modul mit eigenem `exports`-Feld
- [x] Stufe 1: Hard Constraints + Ausfilterungs-Protokoll („Warum ist PLA nicht dabei?")
- [x] Stufe 2: Perzentil-Normalisierung + gewichtetes Scoring → **ADR-005**
- [x] Stufe 3: strukturierte Begründungsobjekte (keine Laufzeit-Freitexte)
- [x] Stufe 4: Trade-off-Engine + `data/tradeoffs.json` (Downgrade-Pfade)
- [x] „Warum nicht X?" für jedes Material
- [x] Verfahrensweiche (FDM ungeeignet → SLA/SLS/CNC/Guss) → **ADR-009**
- [x] Konfidenz-Rollup + Sensitivitätsanalyse
- [x] **≥ 25 fachliche Szenario-Tests**, Coverage ≥ 80 %
- [x] **Neutralitätstest zu ADR-004:** Ranking ist unabhängig vom Portfolio-Status

**Aufwand:** ~3–4 Tage · **DoD:** Tests grün, Engine ohne React-Import lauffähig

---

### Phase 3 — UI

- [x] Wizard (5–7 Schritte, überspringbar, Live-Trefferzahl)
- [x] Ergebnisansicht (Top 3, Ampeln, Kompromiss-Panel, „Warum nicht?")
- [x] Vergleich bis 5 Materialien, „nur Unterschiede", Sticky-Header
- [x] Materialdetailseite mit Quellen, Konfidenz, Chemikalien-Heatmap
- [x] URL-State als Single Source of Truth → **ADR-008**
- [x] Sichtbare Kennzeichnung geschätzter Werte (gestrichelt + Symbol)
- [x] Branding vollständig, Dark/Light, A11y-Grundlagen

**Aufwand:** ~5–7 Tage · **DoD:** Wizard führt zu begründeter Empfehlung mit ≥ 2 Alternativen

---

### Phase 4 — Datenausbau

**Herstellerebene** (`data/products/`, neu)

- [x] Schema + Import-Generator + Ansicht „Hersteller vergleichen"
- [x] Pflichtfeld `specimenType` — trennt gedruckte Prüfkörper von Rohstoffkennwerten
- [x] Datenblatt-Download je Produkt mit Version und Abrufdatum
- [x] Prusament PLA / PETG / ASA (gedruckt), AzureFilm PLA / PETG (Rohstoff), Extrudr PLA NX2
- [x] **SUNLU** — 9 Produkte; zwei Blattfamilien, die ISO-Reihe (PC-ABS, PA6-CF) deklariert
      gedruckte Prüfkörper mit Orientierung. „Easy PA“ bewusst ausgelassen, siehe Importer
- [ ] Extrudr: PETG, GreenTEC, ASA-Serie
- [ ] AzureFilm: ASA (URL lieferte 403), PCTG, ABS
- [ ] Prusament: PC Blend, PVB, PA11-CF, PLA Blend
- [ ] Bambu-Datensätze als Produkte spiegeln, damit alle Marken gleich behandelt werden

**Werkstoffebene**

- [ ] Tier 1 vervollständigen (~30 Materialien)
- [ ] Tier 2 (~25 technisch/industriell)
- [ ] Tier 3 als Kategorien mit Hinweis (Metall-/Keramik-gefüllt, Endlosfaser)
- [ ] ≥ 20 Anwendungsfälle mit vorbefülltem Profil
- [ ] Hersteller-Mapping (~30 Marken)
- [ ] Glossar
- [ ] Preiserhebung ≥ 5 Händler je Material

**Aufwand:** ~40–60 h · **DoD:** ≥ 60 Materialien, ≥ 25 davon `dataCompleteness` ≥ 85 %

---

### Phase 5 — Ausbau

- [x] Explorer / Ashby-Plot (frei wählbare Achsen)
- [ ] Trade-off-Radar
- [x] Export PDF/CSV, Print-Stylesheet
- [ ] PWA / Offline (Messebetrieb)
- [ ] i18n EN vollständig
- [ ] SEO/AEO: JSON-LD (`SoftwareApplication`, `Organization`, `Dataset`, `FAQPage`,
      `BreadcrumbList`), Sitemap, OG-Bilder, `/matrix`-Fallback

**Aufwand:** ~4–5 Tage

---

### Phase 6 — Launch

- [ ] Lighthouse ≥ 90/95/95, axe ohne kritische Verstöße, Bundle < 350 kB gzip
- [x] README zweisprachig, Screenshots, Scoring-Erklärung
- [x] CONTRIBUTING + Issue-Templates
- [ ] Umstellung auf `materialberater.reents3d.de` → **Rückfrage 5**
- [ ] Sichtbarkeit: LinkedIn, Reddit r/3Dprinting, Hackaday, Printables, Awesome-Listen,
      Verlinkung aus dem Reents-Magazin und `/tools/`

**Aufwand:** ~2–3 Tage

---

## 3. Aufwandsrealität — bitte vor Phase 0 lesen

| Block | Aufwand |
|---|---|
| Technik gesamt (Phasen 0, 2, 3, 5, 6) | **~16–20 Arbeitstage** |
| **Datenpflege (Phasen 1 + 4)** | **~60–90 Stunden** |

**Ein Materialdatensatz in `petg-cf`-Qualität kostet 60–120 Minuten** — Datenblätter
finden, Werte übertragen, Prüfbedingungen erfassen, Widersprüche prüfen, Notizen
formulieren, zweisprachig. Bei 60 Materialien ist die Datenarbeit **der größere Posten
als die gesamte Softwareentwicklung.**

Das ist kein Argument gegen das Modell (siehe ADR-001 — ein flaches Modell wäre schneller
und falsch), sondern eine Planungsgröße. Drei Hebel, falls das zu viel wird:

1. **Zielumfang senken:** 30 sehr gute Datensätze schlagen 60 mittelmäßige. Die Definition
   of Done nennt 60 — das ist der Punkt, an dem eine bewusste Entscheidung ansteht.
2. **Gestaffelte Tiefe:** Tier 1 vollständig, Tier 2 nur mit dem Kernfeldsatz
   (Mechanik, Thermik, Druckparameter, Preis) — `dataCompleteness` macht das transparent.
3. **Community:** CONTRIBUTING + Issue-Templates früher als in Phase 6 ausliefern, damit
   Dritte ab Phase 3 beitragen können. Realistisch aber erst nach etwas Sichtbarkeit.

**Empfehlung:** Hebel 2 fahren und Phase 6 (Contribution-Setup) auf Phase 3 vorziehen.

---

## 4. Risiken

| Risiko | Wirkung | Gegenmaßnahme |
|---|---|---|
| **Datenpflege wird unterschätzt** | Projekt versandet bei 20 Materialien | Aufwand oben offengelegt; gestaffelte Tiefe; `dataCompleteness` macht Lücken sichtbar statt peinlich |
| **Druck, Lücken zu füllen** | Erfundene Präzision zerstört Glaubwürdigkeit | ADR-003 + CI-Regel R7; `estimated` ist ein legitimer, sichtbarer Zustand |
| **Anbieter-Bias schleicht sich ein** | Ingenieure prüfen genau darauf | ADR-004 + Neutralitäts-Unit-Test |
| Herstellerdatenblätter ändern sich | Werte veralten still | `retrievedAt`, `documentVersion`, Review-Turnus 12 Monate |
| Verwechslung ähnlicher Materialien | Grob falsche Zahlen | `notToBeConfusedWith`; PET-CF früh in Phase 1 |
| Haftung bei Fehlentscheidung | Rechtliches Risiko | `DISCLAIMER.md`, einmalige Einblendung beim ersten Ergebnis |
| Bundle-Budget durch Recharts | Lighthouse < 90 | Ashby-Plot notfalls als eigene SVG-Komponente (Phase 5) |
| Scope-Drift Richtung Preisrechner | Verwässert das Tool | Nicht-Ziele stehen im Prompt; bei Bedarf als ADR festhalten |

---

## 5. Rückfragen an Riko

Gebündelt. **Für jede Frage steht eine Arbeitsannahme dabei** — ohne Antwort arbeite ich
damit weiter und markiere die Stelle im Code.

### Blockierend für Phase 0

**1 · GitHub-Repo** — ✅ **erledigt.**
Liegt unter dem Firmenkonto `Reents3D` als `fdm-material-advisor`, öffentlich,
live unter https://reents3d.github.io/fdm-material-advisor/.
Englischer Repo-Name, weil GitHub-Suche, Awesome-Listen und KI-Assistenten englisch
indexieren; die Oberfläche bleibt deutschsprachig.

**4 · Logo** — noch offen.
Aktuell läuft eine Platzhalter-Wortmarke mit Inline-SVG-Signet in Reents-Blau. Für den
öffentlichen Auftritt brauche ich das echte Logo als SVG (horizontal, Farb- **und**
Schwarz-Variante) für `/public/brand/`. Hotlinking auf die Website scheidet aus
(DSGVO, Offline-Fähigkeit).

**6 · Design-System — mögliche Kollision**
Der Prompt gibt `#204B63` / `#95C6E5` / `#1D1D1B` und Inter bzw. Source Sans 3 vor.
Nach meinem Stand existiert daneben bereits ein Reents3D-Design-System (Skill
`reents3d-design`) mit Montserrat/Sora und einer Petrol-Palette aus dem laufenden
Website-Relaunch. Soll der Materialberater dieses System übernehmen, damit Tool und
Website zusammenpassen — oder bewusst eigenständig bleiben?
→ *Arbeitsannahme:* die Prompt-Vorgaben umsetzen (die Blautöne passen zur Petrol-Richtung),
aber alle Design-Token so kapseln, dass ein Wechsel eine Datei kostet.

### Blockierend für die Datenqualität

**2 · Portfolio-Status** — zurückgestellt (Entscheidung Riko).
Wird derzeit **nicht angezeigt**. Geplant ist stattdessen eine eigene Seite
„Fertigung bei Reents3D": welches Material auf welchem Bauraum gefertigt werden kann.
Getrennt von der Materialbewertung, damit die Unabhängigkeit sichtbar bleibt.

**3 · XXL-Realität** — teilweise beantwortet.
Bauräume sind jetzt hinterlegt: **1.800 × 2.400 × 1.800 mm** und **1.200 × 1.200 × 2.200 mm**.
Offen bleibt die materialabhängige Grenze — der Bauraum ist die Maschine, nicht der Werkstoff:
- Welche Materialien wurden bis zu welcher Kantenlänge prozesssicher gefahren?
- Wie löst ihr im Dauerlauf die Spulenlogistik (PETG-CF gibt es fast nur auf 1-kg-Spulen)?
- Bei welchen Materialien segmentiert ihr ab welcher Größe, und womit fügt ihr?
→ *Arbeitsannahme:* `maxSensibleEdgeMm` bleibt `estimated`, gedeckelt auf 2.400 mm.

**7 · Veredelung**
Ähnlich wertvoll und ebenfalls nirgends dokumentiert: Erfahrungswerte zu Lackhaftung,
Primer, Spachtel und Verklebung je Material. Ich habe für PETG-CF `paintAdhesion: 2`
geschätzt (niedrige Oberflächenenergie) — deckt sich das mit eurer Erfahrung?
→ *Arbeitsannahme:* bleibt `estimated`.

### Nicht blockierend

**5 · Domain** — Soll `materialberater.reents3d.de` per CNAME auf GitHub Pages zeigen?
→ *Arbeitsannahme:* ja, Umstellung in Phase 6, `site.ts` ist darauf vorbereitet.

**8 · `reviewedBy`** — Welcher Name soll in `governance.reviewedBy`, sobald du einen
Datensatz fachlich freigibst?
→ *Arbeitsannahme:* „Riko Reents, Reents Technologies GmbH".

**9 · Messmöglichkeiten** — Habt ihr Zugriff auf Zugprüfmaschine oder
Widerstandsmessgerät? Eine ESD-Messung an PETG-CF (`oq_esd_measurement`) wäre mit
einfachem Equipment machbar und würde eine im Markt verbreitete Fehlannahme sauber
widerlegen — gutes Material für einen LinkedIn-Post.
→ *Arbeitsannahme:* nein, bleibt `estimated`.

**10 · Reihenfolge nach PETG-CF** — Mein Vorschlag für die nächsten fünf:
PETG (Referenz für den Vergleich), PLA (XXL-Arbeitspferd), ASA (Outdoor),
PA6-CF (technisch anspruchsvoll), PET-CF (Verwechslungsgefahr auflösen).
→ *Arbeitsannahme:* in dieser Reihenfolge.

---

## 6. Sichtbarkeit (Sammlung für Phase 6)

- LinkedIn-Launch-Post — passt zur founder-led Strategie; der Anisotropie-Befund
  (Impact bricht in Z auf ein Viertel ein) ist ein starker, konkreter Aufhänger
- Reddit: r/3Dprinting, r/FixMyPrint, r/functionalprint
- Hackaday-Tipp, Printables-/MakerWorld-Beschreibung
- Awesome-Listen: awesome-3dprinting, awesome-open-data, awesome-engineering
- Verlinkung aus dem Reents-Magazin und der `/tools/`-Seite
- `Dataset`-JSON-LD → Google Dataset Search
- Fachpresse: 3Druck.com, All3DP, Additive Fertigung (DE)
- Hochschulkontakte — CC BY 4.0 macht die Datenbank zitierfähig

---

## 7. Änderungsprotokoll

| Datum | Änderung |
|---|---|
| 2026-08-01 | PLAN, DECISIONS (ADR-001…004), DATA_MODEL, SOURCES, Schema v1.0.0 und Referenzdatensatz `petg-cf` erstellt; Schema- und Plausibilitätsprüfung prototypisch implementiert und grün |
