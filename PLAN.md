# PLAN.md — FDM-Materialberater

**Stand:** 2026-08-01 · **Phase:** Vorbereitung abgeschlossen, Phase 0 noch nicht begonnen
**Nächster Schritt:** Abstimmung mit Riko (Abschnitt 5), danach Phase 0

---

## 0. Was bereits fertig ist

| Artefakt | Status |
|---|---|
| `DATA_MODEL.md` | ✅ vollständige Feldreferenz A–J, Einheiten, Normen, 11 Plausibilitätsregeln |
| `DECISIONS.md` | ✅ ADR-001 bis ADR-004, 6 weitere vorgemerkt |
| `SOURCES.md` | ✅ Zitierregeln, Quellenhierarchie, 3 ausgewertete Quellen, Erschließungsplan |
| `schema/material.schema.json` | ✅ Draft 2020-12, ~150 Felder, strikt (`additionalProperties: false`) |
| `data/materials/petg-cf.json` | ✅ Referenzdatensatz, ~700 Zeilen |
| `scripts/prototype/*.mjs` | ✅ Schema- und Plausibilitätsprüfung, **beide laufen grün** |
| `package.json` | ✅ minimal — nur Datenvalidierung, Toolchain folgt in Phase 0 |

**Verifiziert, nicht behauptet:**

```bash
npm install && npm run validate
```

- Schema-Validierung (ajv, Draft 2020-12): **PASS**
- Plausibilität: **11/11 Regeln grün**, 0 Befunde
- Konfidenzverteilung `petg-cf`: **12 high · 35 medium · 11 low · 42 estimated**

Diese Verteilung ist das ehrliche Ergebnis nach Auswertung von drei Herstellerquellen.
Rund 42 % der Aussagen sind fachliche Ableitung. Das ist kein Mangel des Datensatzes,
sondern der Zustand der öffentlichen Datenlage — und genau der Grund, warum die
Konfidenzkennzeichnung im Datenmodell ganz vorn steht.

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

- [ ] GitHub-Repo anlegen (Org, Name, Topics, Beschreibung) → **Rückfrage 1**
- [ ] Vite + React 18 + TS strict + Tailwind, `base` aus ENV (base-path-agnostisch)
- [ ] Grundgerüst `src/config/site.ts` mit allen Reents-Konstanten
- [ ] Branding-Basis: Farben, selbst gehostete Schrift, Logo in `/public/brand/` → **Rückfrage 4, 6**
- [ ] `.github/workflows/ci.yml` — tsc, ESLint, Prettier, Schema, Plausibilität, Vitest
- [ ] `.github/workflows/deploy.yml` — Build → GitHub Pages
- [ ] `scripts/prototype/*.mjs` → `scripts/validate-data.ts` portieren (in CI verdrahten)
- [ ] Lizenzdateien, `DISCLAIMER.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`
- [ ] Leere App live unter `https://<org>.github.io/fdm-materialberater/`

**Aufwand:** ~1 Arbeitstag · **DoD:** Deployment läuft automatisch aus `main`, CI blockt bei Schemafehler

---

### Phase 1 — Datenfundament

- [ ] `schema/usecase.schema.json`, `manufacturer.schema.json`, `glossary.schema.json`
- [ ] `data/chemicals.json` (≥ 18 Medien), `data/standards.json`, `data/sources.json`
- [ ] **15 Tier-1-Materialien** in `petg-cf`-Qualität:
      PLA, PLA+/Tough, PETG, PETG-CF ✅, ABS, ASA, PC, PA6-CF, PA12, PET-CF, TPU 95A,
      PP, PLA-CF, ASA-CF, PVA (Support)
- [ ] `export-csv.ts` — Datenbank als CSV/XLSX
- [ ] Referenzielle Integritätsprüfungen in CI (chemicalId, sourceId, Skalen-Polarität)

**Aufwand:** ~20–30 h (Daten dominieren) · **DoD:** 15 Datensätze grün, `dataCompleteness` ≥ 85 %

> ⚠️ **PET-CF gehört bewusst in Phase 1**, obwohl es kein Tier-1-Volumenmaterial ist:
> Solange es fehlt, ist die Verwechslungsgefahr mit PETG-CF nicht auflösbar.

---

### Phase 2 — Engine

- [ ] `src/engine/` als framework-freies TS-Modul mit eigenem `exports`-Feld
- [ ] Stufe 1: Hard Constraints + Ausfilterungs-Protokoll („Warum ist PLA nicht dabei?")
- [ ] Stufe 2: Perzentil-Normalisierung + gewichtetes Scoring → **ADR-005**
- [ ] Stufe 3: strukturierte Begründungsobjekte (keine Laufzeit-Freitexte)
- [ ] Stufe 4: Trade-off-Engine + `data/tradeoffs.json` (Downgrade-Pfade)
- [ ] „Warum nicht X?" für jedes Material
- [ ] Verfahrensweiche (FDM ungeeignet → SLA/SLS/CNC/Guss) → **ADR-009**
- [ ] Konfidenz-Rollup + Sensitivitätsanalyse
- [ ] **≥ 25 fachliche Szenario-Tests**, Coverage ≥ 80 %
- [ ] **Neutralitätstest zu ADR-004:** Ranking ist unabhängig vom Portfolio-Status

**Aufwand:** ~3–4 Tage · **DoD:** Tests grün, Engine ohne React-Import lauffähig

---

### Phase 3 — UI

- [ ] Wizard (5–7 Schritte, überspringbar, Live-Trefferzahl)
- [ ] Ergebnisansicht (Top 3, Ampeln, Kompromiss-Panel, „Warum nicht?")
- [ ] Vergleich bis 5 Materialien, „nur Unterschiede", Sticky-Header
- [ ] Materialdetailseite mit Quellen, Konfidenz, Chemikalien-Heatmap
- [ ] URL-State als Single Source of Truth → **ADR-008**
- [ ] Sichtbare Kennzeichnung geschätzter Werte (gestrichelt + Symbol)
- [ ] Branding vollständig, Dark/Light, A11y-Grundlagen

**Aufwand:** ~5–7 Tage · **DoD:** Wizard führt zu begründeter Empfehlung mit ≥ 2 Alternativen

---

### Phase 4 — Datenausbau

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

- [ ] Explorer / Ashby-Plot (frei wählbare Achsen)
- [ ] Trade-off-Radar
- [ ] Export PDF/CSV, Print-Stylesheet
- [ ] PWA / Offline (Messebetrieb)
- [ ] i18n EN vollständig
- [ ] SEO/AEO: JSON-LD (`SoftwareApplication`, `Organization`, `Dataset`, `FAQPage`,
      `BreadcrumbList`), Sitemap, OG-Bilder, `/matrix`-Fallback

**Aufwand:** ~4–5 Tage

---

### Phase 6 — Launch

- [ ] Lighthouse ≥ 90/95/95, axe ohne kritische Verstöße, Bundle < 350 kB gzip
- [ ] README zweisprachig, Screenshots, Scoring-Erklärung
- [ ] CONTRIBUTING + Issue-Templates
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

**1 · GitHub-Repo**
Unter welchem Account/Org soll das Repo liegen, und wie soll es heißen?
Davon hängen die Pages-URL und der Vite-`base`-Pfad ab.
→ *Arbeitsannahme:* neue Org `reents3d`, Repo `fdm-materialberater`,
Live unter `https://reents3d.github.io/fdm-materialberater/`.
*(Ich kann das Repo nicht selbst anlegen — dafür brauche ich von dir entweder das
angelegte Repo oder eine ausdrückliche Freigabe, `gh repo create` auszuführen.)*

**4 · Logo**
Ich brauche das Reents3D-Logo als SVG (horizontal, Farb- **und** Schwarz-Variante) für
`/public/brand/`. Hotlinking auf die Website scheidet aus (DSGVO, Offline-Fähigkeit).
→ *Arbeitsannahme:* Platzhalter-Wortmarke in Reents-Blau, bis die Dateien da sind.

**6 · Design-System — mögliche Kollision**
Der Prompt gibt `#204B63` / `#95C6E5` / `#1D1D1B` und Inter bzw. Source Sans 3 vor.
Nach meinem Stand existiert daneben bereits ein Reents3D-Design-System (Skill
`reents3d-design`) mit Montserrat/Sora und einer Petrol-Palette aus dem laufenden
Website-Relaunch. Soll der Materialberater dieses System übernehmen, damit Tool und
Website zusammenpassen — oder bewusst eigenständig bleiben?
→ *Arbeitsannahme:* die Prompt-Vorgaben umsetzen (die Blautöne passen zur Petrol-Richtung),
aber alle Design-Token so kapseln, dass ein Wechsel eine Datei kostet.

### Blockierend für die Datenqualität

**2 · Portfolio-Status**
Welche Materialien fährt Reents3D tatsächlich — `standard`, `auf Anfrage`,
`Partnerfertigung`, `nicht im Portfolio`? Ideal wäre eine Liste aus dem Materiallager.
Konkret für PETG-CF offen (`oq_reents_portfolio`).
→ *Arbeitsannahme:* alle Felder bleiben `unknown`; das Badge wird erst angezeigt, wenn
gepflegt. Beeinflusst das Ranking ohnehin nicht (ADR-004).

**3 · XXL-Realität**
Das ist der Punkt, an dem eure Werkstatt Daten hat, die es öffentlich nirgends gibt —
und damit der wertvollste Beitrag zum ganzen Tool:
- Welche Materialien wurden bis zu welcher Kantenlänge prozesssicher gefahren?
- PLA bis 2,4 m ist gesetzt. Was ist mit PETG, PETG-CF, ASA, PC?
- Wie löst ihr im Dauerlauf die Spulenlogistik (PETG-CF gibt es fast nur auf 1-kg-Spulen)?
- Bei welchen Materialien segmentiert ihr ab welcher Größe, und womit fügt ihr?
→ *Arbeitsannahme:* `maxSensibleEdgeMm` bleibt `estimated` mit weiter Spanne.

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
