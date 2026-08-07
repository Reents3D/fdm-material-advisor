# PLAN.md — FDM-Materialberater

**Stand:** 2026-08-07 · **Phasen 0–3 live, Corporate Design umgesetzt** · Phase 4 (Datenausbau) läuft
**Live:** https://reents3d.github.io/fdm-material-advisor/
**Nächster Schritt:** Die **XXL-Grenzen** in [RUECKFRAGEN.md](RUECKFRAGEN.md) — die einzige
offene Entscheidung, die auf Werkstattwissen wartet statt auf Arbeit. Danach die sechs
`oq_spread_*`-Fälle, bei denen ein Werkstofftyp offenbar zwei Rezepturen führt, und die
Marken ganz ohne Blattlink (Polymaker 71, 3DXTech 61, PrimaCreator 59).

**Erledigt seit dem letzten Stand:** Der grösste Einzelbefund des Projekts ist behoben.
**199 von 288 Werkstoffkennwerten trugen die Quelle `src_bambu_tds`** — nicht weil Bambu
besser misst, sondern weil Bambu zuerst importiert wurde. Die 254 Produktdatenblätter waren
auf der Werkstoffebene nie angekommen. PETG stand mit Bambus Bruchdehnung von 9,5 %, während
17 Blätter im selben Repository 5 bis 150 % sagten. Der Abgleich (**ADR-042**) hat 131 Lücken
geschlossen, 108 Werte ersetzt und jedem Kennwert die Spanne über die Hersteller gegeben —
die bei diesen Werkstoffen die eigentliche Auskunft ist. Sechzehn offene Fragen „nur ein
Datenblatt" waren damit beantwortet; zwölf neue kamen dazu, wo ein Typname zwei Rezepturen
deckt. Neun Tests halten das Ergebnis fest, damit es nicht wieder auseinanderläuft.

Nebenbei fielen zwei Zahlen auf der **Startseite** auf, die zu dem Zeitpunkt falsch waren
(„PLA mit 35 MPa", „zwischen 47 % und 90 %"). Sie werden jetzt gerechnet statt geschrieben.

**Offene Entscheidungen stehen gesammelt in [RUECKFRAGEN.md](RUECKFRAGEN.md)**, nach
Wirkung sortiert. Alles andere ist selbst entschieden und am Ort der Wirkung begründet.

---

## 0. Was fertig ist

| Phase | Status |
|---|---|
| **0 — Gerüst und Deployment** | ✅ Vite + React 18 + TS strict + Tailwind 4, CI und Pages-Deploy automatisch aus `main` |
| **1 — Datenfundament** | ⬤ teilweise: Schema, 11 Materialien, 15 CI-Regeln. Offen: Use Cases, Chemikalien-/Normen-Register |
| **2 — Engine** | ✅ Constraints, Perzentil-Scoring, Erklärungen, Trade-offs, Verfahrensweiche, Sensitivität |
| **3 — Oberfläche** | ✅ Wizard (6 Schritte, Schrittleiste, Antwortübersicht, Sackgassen-Auskunft, Schwerpunkte), Ergebnis, Vergleich, Datenblatt, Ashby-Diagramm, Matrix, DE/EN, Print |
| **4 — Datenausbau** | ⬤ weit: 222 Herstellerprodukte aus 15 Marken, 41 Werkstofftypen. Offen: restliche Ultrafuse-Typen (Portal), ColorFabb und Filament PM (keine maschinell erreichbaren Blätter), Preise |
| **CD** | ✅ Design-Tokens von der Unternehmenswebsite abgenommen, echtes Logo, Montserrat + Sora selbst gehostet |
| **5 — Ausbau** | ⬤ teilweise: Ashby, Print, JSON-LD, CSV-Export, PDF-Bericht und Offlinebetrieb stehen. Offen: Radar |
| **6 — Launch** | ⬤ teilweise: README, Lizenzen, Templates, Vorschaubild stehen. Offen: Screenshots, Lighthouse, Domain |

**Verifiziert, nicht behauptet** (`npm run ci`):

| Prüfung | Ergebnis |
|---|---|
| JSON Schema, 285 Dateien | PASS |
| Plausibilität und Provenienz, 15 Regeln | 0 Fehler, 3 dokumentierte Datenblatt-Anomalien |
| Typecheck (strict) | PASS |
| Tests | 144 grün |
| Bundle | Erstaufruf 292 kB (Budget 320 kB) · gesamt 436 kB (Budget 500 kB) — ADR-036 |
| Live-Deployment | HTTP 200, keine Konsolenfehler |

**Konfidenz über die gesamte Datenbank: 2.824 belegte Aussagen —
45 high · 639 medium · 239 low · 1.901 estimated.**

70 % sind gekennzeichnete Schätzungen. Das ist kein Mangel der Erfassung, sondern der
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
- [x] **Open Filament Database angebunden** (ADR-035): Spulenlogistik für 21 Typen,
      Marktkorridor für Dichte und Verarbeitungstemperaturen, Arbeitsliste mit 148 offenen
      Datenblatt-Fundstellen. **Keine Kennwertquelle** — sie führt weder Mechanik noch
      Thermik; der Datenausbau bleibt Handarbeit am Herstellerblatt
- [x] **FormFutura vollständig ausgewertet** (2026-08-04/05): **37 Produkte aus 46
      Blättern**, darunter erstmals **LUVOCOM 3F von Lehvoss** (PAHT-Linie,
      spritzgegossene Prüfkörper deklariert). PAHT CF 9742 ist mit 15.000 MPa der
      steifste Werkstoff des Bestands; PAHT KK 50056 FR der einzige mit
      EN-45545-Bahndaten
- [x] **13 Rasterblätter ohne Textebene** erschlossen (2026-08-05): mit poppler nach PNG
      gerendert und abgelesen. Sieben davon tragen keine eigene Messung, sondern die
      kopierte Tabelle eines Schwesterprodukts — ABSpro = TitanX = EasyFil ABS = EasyFil
      ABS Glow, und EasyFil ePLA = Galaxy PLA. Aufgenommen als **ein** Beleg, nicht als
      sieben. ABSpro Flame Retardant liefert dafür die sorgfältigsten Normangaben des
      ganzen Herstellers (ISO 527-2/50, ISO 75-2A, ISO 180-4A)
- [x] **Nebula ausgewertet** (2026-08-05): 17 Produkte, neue Marke. 17 Blätter tragen nur 9
      Tabellen; die PLA-Tabelle ist dieselbe wie bei FormFutura und nennt die
      Originaleinheiten — damit sind zwei dort offene Fehler aufgelöst
- [ ] Die übrigen ~85 verlinkten Fundstellen auswerten (Alzament 13, Anycubic 12, Bambu 40)
- [ ] Polymaker, 3DXTech, PrimaCreator: im Marktbestand groß, ohne jeden Blattlink

**Aufwand:** ~40–60 h · **DoD:** ≥ 60 Materialien, ≥ 25 davon `dataCompleteness` ≥ 85 %

---

### Phase 5 — Ausbau

- [x] **Herstellerfilter in der Herstelleransicht** *(erledigt 2026-08-05)*

  Vorher zeigte [src/views/Brands.tsx](src/views/Brands.tsx) nach der Wahl eines
  Werkstofftyps **alle** Produkte als Spalten — bei PLA 46. Die Ansicht heißt „Hersteller
  vergleichen"; ohne Auswahl verglich sie nichts, sie listete.

  Jetzt: ein Knopf je Produkt, nach Marke sortiert, mit Prüfkörper-Angabe am Knopf.
  Höchstens sechs nebeneinander (`Compare.tsx` deckelt bei fünf), Vorbelegung sind die
  ersten sechs — `productsByMaterial()` sortiert gedruckte Prüfkörper nach vorn, die
  Vorbelegung trifft damit automatisch die aussagekräftigsten Belege.

  Werkstofftyp und Auswahl stehen in der URL (`bm`, `bp`, ADR-008), ein Vergleich ist
  also teilbar. Der Werkstoffwechsel löscht die Auswahl, weil die IDs des alten Typs im
  neuen nicht existieren. Die Trennung gedruckt/spritzgegossen bleibt unangetastet.

  Die Auflösung des `bp`-Parameters liegt als reine Funktion in
  [src/lib/brand-selection.ts](src/lib/brand-selection.ts) und wird von neun Tests
  geprüft — dieselbe Fehlerklasse wie `cmp` und `chem`, die schon zweimal ungekappt
  durchgerutscht ist (Vergleichsansicht 2026-08-02, Explorer danach).

- [ ] **Die zwei schwachen Kriterien der Engine** — *gemessen 2026-08-05, ADR-037*

  Die mechanischen und thermischen Kriterien lesen bereits Messwerte, nicht Skalen —
  `strength` 31 von 41 belastbar, `lightweight` 31, `toughness` 29, `stiffness` 23,
  `temperature` 19, `layerAdhesion` 12. Dort ist nichts umzustellen.

  Schwach sind genau zwei:
  - **`price`** erreicht bei **keinem einzigen** Werkstoff `verified` — 33-mal `weak`,
    8-mal geschätzt. Das Kriterium ist gewichtbar und entscheidet mit, stützt sich aber
    auf nichts Nachprüfbares. Abhilfe ist die Preiserhebung über ≥ 5 Händler je Material
    (`oq_price_survey`), die ohnehin in Phase 4 steht.
  - **`layerAdhesion`** fehlte bei 28 von 41 Werkstoffen. `derive:anisotropy` holt zwei
    davon aus Produktblättern (`pc-fr` 0,35 · `pla-tough` 0,89) und erfasst einen
    Widerspruch als offene Frage (`paht-cf`: 0,73 bei Bambu gegen 0,18 bei Ultrafuse).
    Stand jetzt **15 von 41**. Die übrigen 25 haben in keinem einzigen Produktblatt
    Z-Werte — hier hilft nur gezielte Suche nach Blättern, die sie ausweisen.

  Die sieben Skalenkriterien (`printability`, `outdoor`, `lowWarping`, `paintability`,
  `availability`, `surface`, `xxl`) bleiben Einschätzungen. Das ist kein Mangel: Für
  „Druckbarkeit 4 von 5" gibt es keine Norm und kann es keine geben.

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
- ~~Wie löst ihr im Dauerlauf die Spulenlogistik?~~ → **Datenlage seit 2026-08-04 geklärt**, siehe unten
- Bei welchen Materialien segmentiert ihr ab welcher Größe, und womit fügt ihr?
→ *Arbeitsannahme:* `maxSensibleEdgeMm` bleibt `estimated`, gedeckelt auf 2.400 mm.

> **Spulenlogistik — die Annahme in der Frage war falsch.** Der Satz „PETG-CF gibt es fast
> nur auf 1-kg-Spulen" hielt der Prüfung nicht stand: Über 48 Produkte und 147 Angebote im
> Bestand der Open Filament Database reicht PETG-CF bis **8 kg**. Richtig an der Sorge war
> etwas anderes — nur **13,6 %** aller PETG-CF-Angebote erreichen überhaupt 2 kg. Die
> Großspule existiert, sie hängt aber an wenigen Anbietern und meist einer Farbe.
>
> Die eigentliche Falle liegt woanders: **`pa12` kennt am Markt keine einzige Spule über
> 1 kg** (17 Produkte, 45 Angebote). `pla-cf` erreicht 5 kg, aber nur 5,6 % der Angebote
> liegen bei 2 kg oder darüber. Wer ein mehrere Kilogramm schweres Bauteil in einem dieser
> Werkstoffe plant, plant einen Spulenwechsel mitten im Druck ein — mit Chargenwechsel,
> sichtbarer Naht und Abbruchrisiko.
>
> Erfasst als `commercial.xxl.maxSpoolWeightKg` und `largeSpoolShare` für 21 Werkstofftypen
> (`npm run import:ofd-spools`, Quelle `src_ofd`, Ceiling `low` — Marktbeobachtung, keine
> Lieferzusage). Offen bleibt die Werkstattfrage: Wie handhabt ihr den Wechsel heute?

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

## 5a. Elf Werkstofftyp-Kandidaten — Vorlage und Entscheidungen

Aus dem FormFutura- und dem Bambu-Import lagen elf Datenblattgruppen vor, für die es
keinen Werkstofftyp gibt. Ein Typ kostet **rund 92 belegte Aussagen, davon 49 Schätzungen
und 18 Bewertungsskalen** — das ist redaktionelle Arbeit, keine Übertragung, und deshalb
steht sie hier statt in einem Importer.

**Stand 2026-08-05: acht der elf sind entschieden, alle drei Entscheidungen sind
Absagen.** Sechs Stützmaterialien fallen weg, weil sie nicht gebraucht werden; PEEK und
PEI, weil sie eine Maschinenklasse voraussetzen, die dieses Werkzeug nicht adressiert. Die
Begründungen stehen unten bei den Kandidaten, das daraus folgende Aufnahmekriterium am
Ende des Abschnitts.

Offen bleiben `ppa-cf`, PCL und TPU 90A.

### Das Ergebnis kehrt die Erwartung um

Die vier Kandidaten, die seit dem FormFutura-Import warten, klingen am beeindruckendsten
und tragen die schwächsten Daten. Die drei, die gerade erst durch Bambu dazukamen,
klingen unscheinbar und tragen die besten.

| Kandidat | Blätter | Prüfkörper | Z-Werte | Datenlage |
|---|---|---|---|---|
| **PPA-CF** | 1 (Bambu) | gedruckt | ja | vollständig, 17 Kennwerte |
| **TPU 90A** | 1 (Bambu) | gedruckt | ja | vollständig, 17 Kennwerte |
| ~~PEEK~~ | 2 (LUVOCOM) | spritzgegossen | nein | *entschieden: außerhalb des Rahmens* |
| ~~PEI~~ | 2 (LUVOCOM/Ultem) | spritzgegossen | nein | *entschieden: außerhalb des Rahmens* |
| PCL | 1 (FormFutura) | nicht deklariert | nein | 9 Kennwerte, eine Quelle |
| ~~PVA · BVOH · 4× Support~~ | 6 | — | — | *entschieden: wird nicht gebraucht* |

### Die Kandidaten im Einzelnen

**PPA-CF — der stärkste Fall.** Zugfestigkeit 168 MPa in X-Y gegen 57 MPa in Z, E-Modul
11.800 MPa, Dauergebrauch über den Schmelzpunkt von 258 °C hinweg angedeutet. Damit wäre
Polyphthalamid-CF **der festeste Werkstoff der Datenbank** — der bisherige Höchstwert
liegt bei `paht-cf` mit 120 MPa, also 40 % darunter. Gedruckte Prüfkörper, beide
Orientierungen, ein Anisotropiefaktor von 0,34 fiele nebenbei ab. Der Preis: ein Typ, für
den genau **eine** Quelle existiert, also durchweg `low` bis `medium`.

**TPU 90A — der schwächste Fall trotz guter Daten.** Das Blatt ist tadellos: gedruckt,
Z-Werte, Streuungsangaben. Nur bringt der Typ nichts. Bambu TPU 85A liegt bei 12,0 MPa,
Bambu TPU 90A bei 12,5 — ein halbes Megapascal auseinander, gemessen vom selben Hersteller
nach derselben Norm. Ein eigener Typ dafür trennt nichts, sondern verlängert die Liste.
*Empfehlung: als Produkt unter `tpu-85a` führen und den Härteunterschied in `features`
benennen.*

**PEEK und PEI — ENTSCHIEDEN: außerhalb des Rahmens.** Beide Blattgruppen nennen ISO-Normen
durchgehend und liefern vollständige Tabellen (PEEK: 97 MPa Zug, 145 MPa Biegung, 3,8 GPa
Modul; PEI: 105 MPa Zug, HDT-A 200 °C, Dauergebrauchstemperatur 170 °C nach IEC 60216).
Sie tragen aber alle den Vermerk **„MPTS ISO 3167 A"** — Vielzweckprobekörper,
spritzgegossen. Genau gegen diese Zahlen ist dieses Werkzeug gebaut: Der Startseitentext
begründet die Existenz des Projekts damit, dass PLA anderswo mit 60 MPa steht und hier mit
35, weil dort gegossen und hier gedruckt wird.

**Riko am 2026-08-05: Es sollen nur Werkstoffe in den Bestand, die auf marktüblichen
Geräten realistisch fertigbar sind — nicht solche, die eine Industriemaschine der obersten
Klasse voraussetzen.** Die Blätter belegen, dass PEEK und PEI genau das tun:

| | Düse laut Blatt | Bett |
|---|---|---|
| LUVOCOM 3F PEEK 9581 | **370–420 °C** | > 120 °C |
| LUVOCOM 3F PEI 50236 | **400–450 °C** | > 120 °C |
| höchster Wert im heutigen Bestand (`pps-cf`) | 340 °C | — |

Der Abstand ist kein Feinheitsunterschied: 400 °C Düse und ein Bett über 120 °C bedeuten
Hochtemperatur-Hotend, aktiv beheizte Kammer und eine Maschinenklasse, die mit dem, was
dieses Werkzeug adressiert, nichts mehr zu tun hat. Ein Werkstoff, den der Leser nicht
drucken kann, ist in einer Empfehlung kein Gewinn, sondern eine Sackgasse — und er stünde
wegen seiner Kennwerte in jeder Rangliste oben.

Beide Gründe zeigen in dieselbe Richtung, und sie verstärken sich: Die Zahlen sind
spritzgegossen **und** die Maschine ist unerreichbar. Die vier Blätter bleiben
unimportiert.

**PCL — dünn und auffällig.** Neun Kennwerte aus einer Quelle, Prüfkörper nicht
deklariert. Und die Zahlen passen nicht zueinander: 45 MPa Zugfestigkeit bei 350 MPa
E-Modul und Shore D 46 beschreibt einen Werkstoff, der zugleich sehr fest und sehr weich
wäre. Polycaprolacton liegt in der Literatur eher bei 16 MPa. *Vor einer Typentscheidung
gehört das Blatt gegen eine zweite Quelle geprüft.*

**PVA, BVOH und die vier Support-Materialien — ~~eine Kategorie, keine Kennwerte~~
ENTSCHIEDEN: wird nicht gebraucht.** Bei allen sechs steht die gesamte Mechanik auf „N/A"
beziehungsweise „–"; vorhanden sind Dichte, Schmelztemperatur und eine Wassersättigung von
6,25 % bei Bambu PVA. Mein Vorschlag war ein gemeinsamer Typ `pva`, weil der Bestand als
Stützmaterial bislang nur HIPS kennt und HIPS sich in Limonen löst, nicht in Wasser.

**Riko am 2026-08-05: wird nicht benötigt.** Damit bleiben die sechs Blätter unimportiert
und die Kategorie „wasserlösliches Stützmaterial" bewusst leer. Das ist ab jetzt eine
dokumentierte Auslassung und kein Versehen: Wer im Werkzeug sucht, womit er eine
Innengeometrie aus PETG oder PA stützt, findet keine Antwort — und soll sie hier auch
nicht finden. Ein Materialberater für tragende Bauteile ist kein Katalog für
Verbrauchsmaterial, und ein Werkstoff ohne einen einzigen mechanischen Kennwert wäre in
jeder Vergleichsansicht dieses Werkzeugs eine leere Zeile.

Wenn die Entscheidung später kippt, liegen die sieben Blätter in `data/_sources/`
(vier Bambu-Support-Sorten und PVA unter `bambu-tds2/`, BVOH unter `formfutura-tds/`) und
diese Vorlage nennt die Datenlage.

### Was von den elf übrig bleibt

1. ~~`ppa-cf`~~ — **gebaut am 2026-08-05.** 42. Werkstofftyp, 66 belegte Aussagen, davon
   24 Bewertungsskalen. Zwei offene Fragen stehen am Datensatz: die fehlende zweite Quelle
   und der fehlende Preis
2. ~~**PCL**~~ — **entschieden 2026-08-06: bleibt draussen.** Niedrigtemperatur-Werkstoff fuer Modellbau und Medizintechnik, kein Konstruktionsmaterial fuer die Zielgruppe. Das einzige Blatt trug ohnehin unstimmige Zahlen (45 MPa bei 350 MPa Modul; Literatur nennt rund 16 MPa)
3. **TPU 90A** — als Produkt unter `tpu-85a`, kein eigener Typ
4. ~~`pva`, BVOH, 4× Support~~ — entschieden: wird nicht gebraucht (2026-08-05)
5. ~~PEEK, PEI~~ — entschieden: außerhalb des Rahmens (2026-08-05)

Von elf Kandidaten bleibt damit **keiner**:  und  sind gebaut, , PCL, PEEK, PEI, PVA, BVOH und die vier Support-Sorten sind abgelehnt, TPU 90A laeuft als Produkt.

### Die zwei Variantentypen aus dem FormFutura-Import — entschieden am 2026-08-06

Zwei Blätter lagen seit dem 2026-08-04 ausgewertet im Arbeitsplatz, weil es keinen
passenden Typ gab. Beide sind gegen ihr **ungefülltes Schwesterblatt** gehalten worden —
dieselbe Prüfung, die R16 seit dem Alzament-Import automatisch macht. Das Ergebnis fällt
gegensätzlich aus, und genau deshalb war die Prüfung nötig.

| | AthenaX CF10 → `pctg-cf` | Kratos PC CF10 → `pc-cf` |
|---|---|---|
| Dichte | 1,23 → **1,28** | 1,20 → 1,22 |
| Zugfestigkeit | 44 → **70 MPa** (+59 %) | 61,8 → 76 MPa |
| Bruchdehnung | 220 % → **5 %** | > 100 % → **> 100 %** |
| Biege-E-Modul | *nicht auf dem Blatt* | 24.000 → **24.000 kg/cm²** |
| Biegefestigkeit | *nicht auf dem Blatt* | 920 → **920 kg/cm²** |
| Schlagzähigkeit | 93 → **4 kJ/m²** | 70 → **70 kgcm/cm** |
| **Urteil** | **angelegt** | **abgelehnt** |

Bei AthenaX CF10 bewegt sich jeder Wert in die Richtung, die eine Kohlefaserfüllung
erzwingt. Die Bruchdehnung von 220 auf 5 Prozent ist der Beleg: Das lässt sich nicht
abschreiben. Zusätzlich stimmt die Eigenwerbung des Blattes („59 % higher tensile
strength") auf den Prozentpunkt mit seinen eigenen Zahlen.

Bei Kratos PC CF10 sind **vier von acht** Kennwerten zifferngleich mit dem ungefüllten
Blatt — und zwar genau die vier, die eine Faserfüllung am stärksten verändern müsste. Eine
Bruchdehnung über 100 % ist bei 10 % Kohlefaser physikalisch ausgeschlossen; ein
Biege-E-Modul, das sich durch die Füllung um kein Prozent bewegt, ebenfalls.

**`pc-cf` wird deshalb nicht angelegt** — nicht weil der Werkstoff uninteressant wäre,
sondern weil die einzige Quelle ihn nicht belegt. Ein Typ, dessen Kennwerte aus dem
ungefüllten Nachbarn stammen, wäre schlimmer als keiner: Er sähe aus wie Wissen. Kommt
eine zweite Quelle, ist die Entscheidung in zehn Minuten umgedreht.

**Was `pctg-cf` fehlt und am Datensatz steht:** kein E-Modul (das Blatt nennt keinen —
ausgerechnet die Zahl, die eine Füllung am deutlichsten zeigt), keine zweite Quelle, und
kein Preis, weil ihn nur FormFutura führt und deren robots.txt Anthropics Agenten sperrt.
Drei offene Fragen, eine davon blockierend.

### Das daraus folgende Aufnahmekriterium

Rikos Entscheidung zu PEEK und PEI ist allgemeiner als diese beiden Fälle. Formuliert als
Regel für künftige Kandidaten, und bewusst **ohne Maschinennamen** — dieselbe
Zurückhaltung wie beim Bauraum (siehe Phase 5, „ausdrücklich nicht hinterlegt ist der
Bauraum irgendeiner konkreten Maschine"):

> Ein Werkstoff kommt nur in den Bestand, wenn er auf marktüblichem Gerät realistisch
> fertigbar ist. Als Anhaltspunkte gelten **Düse bis etwa 350 °C, Bett bis etwa 120 °C und
> keine aktiv beheizte Hochtemperaturkammer**. Wer darüber hinausgeht, braucht eine
> Maschinenklasse, die dieses Werkzeug nicht adressiert.

Die Schwellen sind nicht gegriffen, sondern der Rand des heutigen Bestands: Die höchste
Düsentemperatur trägt `pps-cf` mit 340 °C, die höchste Betttemperatur 120 °C (`abs-pc`,
`pps-cf`, `pvdf`), die höchste Kammerangabe 53 °C. Kein einziger vorhandener Werkstoff
fällt durch das Kriterium — es beschreibt also, was ohnehin gilt, und macht es nur
entscheidbar.

**Was das Kriterium NICHT ist:** ein Urteil über den Werkstoff. PEEK ist ein
hervorragendes Material; es ist nur keines für den Leser dieses Werkzeugs. Sollte sich der
Markt ändern — Hochtemperatur-Hotends sind in den letzten Jahren deutlich billiger
geworden —, gehört die Schwelle nachgezogen und nicht die Entscheidung verteidigt.

### ~~Eine harte Grenze, die beim Bau von `ppa-cf` sichtbar wurde~~ — erledigt

Ein Werkstofftyp kostete **rund 10 kB gzip im Erstaufruf-Bündel**. Mit `ppa-cf` als 42.
Typ stand der Erstaufruf bei 305,5 von 320 kB, also bei 95 % — es blieben etwa anderthalb
weitere Typen.

**Aufgeteilt am 2026-08-05 (ADR-039).** Nicht nach Ansicht wie bei den Produkten, sondern
nach *Art der Aussage*: `scripts/build-data-chunks.mjs` trennt Zahlen von Prosa. Die
Notiztexte machen 48 % der Rohdaten aus, und die Engine liest keine davon.

| | vorher | nachher |
|---|---|---|
| Erstaufruf | 305,5 kB (95 %) | **197,6 kB (62 %)** |

Damit ist wieder Platz für gut ein Dutzend Werkstofftypen statt für anderthalb.

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
