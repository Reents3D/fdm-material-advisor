# DECISIONS.md — Architecture Decision Records

Jede nicht-triviale Entscheidung wird hier festgehalten: Kontext, Entscheidung,
Konsequenzen, verworfene Alternativen. Ein ADR wird nicht gelöscht, sondern durch einen
neuen ADR **abgelöst** (Status `superseded by ADR-xxx`).

| ADR | Titel | Status | Datum |
|---|---|---|---|
| [ADR-001](#adr-001) | Wertobjekte statt nackter Skalare | akzeptiert | 2026-08-01 |
| [ADR-002](#adr-002) | Lizenz-Trennung: Code MIT, Daten CC BY 4.0 | akzeptiert | 2026-08-01 |
| [ADR-003](#adr-003) | Umgang mit unsicheren und fehlenden Daten | akzeptiert | 2026-08-01 |
| [ADR-004](#adr-004) | Portfolio-Status ist kein Scoring-Faktor | akzeptiert | 2026-08-01 |

---

<a id="adr-001"></a>
## ADR-001 — Wertobjekte statt nackter Skalare

**Status:** akzeptiert · **Datum:** 2026-08-01

### Kontext

Der naheliegende Entwurf für eine Materialdatenbank ist flach:

```jsonc
{ "id": "petg-cf", "tensileStrength": 59, "hdt": 70 }
```

Diese Struktur ist einfach zu lesen, einfach zu sortieren — und im FDM-Kontext falsch.
Bei der Auswertung von nur drei Herstellerquellen für ein einziges Material traten alle
folgenden Probleme gleichzeitig auf:

1. **Richtungsabhängigkeit.** Bambu Lab misst für PETG-CF 59 MPa in XY und 38 MPa in Z.
   Ein einzelner Wert „59" verschweigt, dass senkrecht zur Schicht 36 % fehlen.
2. **Prüfbedingungen entscheiden über die Zahl.** Flashforge meldet 40–43 MPa und
   vermerkt ausdrücklich, dass **nicht** getempert wurde. Bambu meldet 59 ± 4 MPa nach
   8 h Vorbehandlung. Beide Zahlen sind korrekt. Ohne `conditions` sind sie unvereinbar.
3. **Unterschiedliche Normen.** Bambu misst Schlagzähigkeit nach ISO 179 (Charpy),
   Flashforge nach ISO 180 (Izod). Die Werte in einer Spalte zu vergleichen ist unzulässig.
4. **Unterschiedliche Rezepturen unter gleichem Namen.** „PETG-CF" umfasst mindestens
   5–20 % Faseranteil. Nur Flashforge deklariert ihn überhaupt.
5. **Fragwürdige Herstellerangaben.** Flashforge nennt 80 °C Dauergebrauchstemperatur —
   über Tg (68 °C) und über HDT-B (70–74 °C). Ein flaches Modell zwingt zur Wahl zwischen
   „ungeprüft übernehmen" und „stillschweigend löschen". Beides ist schlecht.

### Entscheidung

**Jede Sachaussage ist ein Objekt mit Provenienz.** Vier Wrapper-Typen:

| Typ | Für |
|---|---|
| `quantity` | messbare Größen: `value`, `min`/`max`, `tolerance`, `unit`, `testStandard`, `orientation`, `conditions`, `source`, `confidence`, `note` |
| `rating` | 1–5-Skalen mit benannter Skala |
| `flag` | Tri-State-Boolean (`true`/`false`/`null` = ausdrücklich unbekannt) |
| `choice` | Enums |

Ergänzend:

- **`orientation` ist bei allen mechanischen Kennwerten Pflichtfeld** (Schema-Ebene).
- **`source` darf ein Array sein**, um redaktionell aggregierte Werte ehrlich abzubilden.
- **`min`/`max` = Marktspanne, `tolerance` = Streuung einer Quelle.** Getrennte Felder,
  weil die Vermischung Scheinpräzision erzeugt.
- **Abgeleitete Werte tragen `derivedFrom`** und müssen quellenrein sein (siehe R10).

### Konsequenzen

**Positiv**

- Die UI kann Konfidenz, Norm und Prüfbedingung anzeigen — die Voraussetzung dafür, dass
  Ingenieure dem Tool trauen.
- Widersprüche zwischen Herstellern werden abbildbar statt weggemittelt.
- Der Anisotropiefaktor wird berechenbar und belegbar. Er ist das Feld, das kaum ein
  vergleichbares Tool sauber ausweist.
- Maschinelle Plausibilitätsprüfung wird möglich (11 Regeln, siehe DATA_MODEL §8).

**Negativ**

- Datensätze sind etwa 5–8× umfangreicher. `petg-cf.json` hat rund 700 Zeilen.
- Das Befüllen dauert länger. Realistisch: 60–120 Minuten pro Material in guter Qualität.
  Das ist bei ≥ 60 Materialien der Hauptaufwand des Projekts und muss so geplant werden.
- Ohne Tooling ist die Datei per Hand unangenehm zu pflegen → `scripts/` und
  Issue-Templates sind kein Komfort, sondern Voraussetzung für externe Beiträge.

### Verworfene Alternativen

**A) Flaches Schema mit Zusatzspalten** (`tensileStrength`, `tensileStrength_source`, …).
Verworfen: explodiert kombinatorisch und lässt sich nicht typisieren.

**B) Zwei Ebenen — „einfache" Vergleichswerte plus optionales Detailobjekt.**
Verworfen: Die einfache Ebene würde in der UI dominieren und genau die Fehler
reproduzieren, die das Projekt verhindern soll.

**C) Polarität pro Rating speichern** (`higherIsBetter` in jedem Rating-Objekt).
Verworfen: Redundanz über ≥ 60 Dateien lädt zur Drift ein — ein einziger falscher
Eintrag dreht ein Kriterium im Scoring um, ohne dass ein Test anschlägt. Stattdessen
zentrale Polaritätstabelle (DATA_MODEL §5) plus CI-Abgleich gegen das Skalen-Enum.

---

<a id="adr-002"></a>
## ADR-002 — Lizenz-Trennung: Code MIT, Daten CC BY 4.0

**Status:** akzeptiert · **Datum:** 2026-08-01

### Kontext

Das Repository enthält zwei Güter mit unterschiedlichem Charakter:

1. **Code** (App, Engine, Skripte) — Standard-Open-Source.
2. **Daten** (`data/**`) — die kuratierte Materialdatenbank. Sie ist der eigentliche Wert
   und das Ergebnis erheblicher redaktioneller Arbeit.

Softwarelizenzen sind auf Daten schlecht anwendbar: MIT spricht von „Software" und regelt
den Namensnennungsanspruch bei einer eingebetteten Datenbank nicht sauber. Umgekehrt sind
CC-Lizenzen für Quellcode ausdrücklich nicht empfohlen (Creative Commons rät selbst davon ab).

Ein zweiter Punkt: Die Datenbank soll ausdrücklich **auch ohne die App** nutzbar sein —
als offene Materialdatenbank, zitierbar in Studien, Foren, anderen Werkzeugen und von
KI-Assistenten. Verbreitung ist erwünscht; Verbreitung *ohne Herkunftsnennung* ist es nicht.

### Entscheidung

- **Code:** MIT (`LICENSE`)
- **Daten unter `data/**` und `schema/**`:** CC BY 4.0 (`LICENSE-DATA`)
- Beide Lizenzen werden in `README.md` und im Footer der App benannt, mit einem Satz,
  welcher Teil welcher Lizenz unterliegt.
- Jeder Datensatz führt seine Quellen mit; die CC-BY-Namensnennung bezieht sich auf die
  **kuratierte Zusammenstellung**, nicht auf die Messwerte selbst.

### Konsequenzen

**Positiv**

- Maximale Verbreitung bei gesicherter Namensnennung. Jede Nachnutzung der Datenbank
  nennt Reents3D — das ist der Marketing-Rückfluss des Projekts.
- Zitierfähigkeit für Hochschulen und Fachpresse.
- `Dataset`-JSON-LD mit sauberer `license`-Angabe wird möglich (Google Dataset Search).

**Negativ**

- Zwei Lizenzdateien erfordern eine klare Erklärung, sonst entsteht Unsicherheit.
- Bei Code-Snippets, die Daten enthalten (Fixtures in Tests), muss die Zuordnung im
  Zweifel benannt werden. Regel: alles unter `tests/` folgt der Code-Lizenz.

**Ausdrücklich kein Bestandteil der Entscheidung**

Messwerte Dritter sind nicht schutzfähige Fakten und werden mit Quellenangabe geführt.
Datenblatt-**Texte**, -Grafiken und -Tabellenlayouts werden **nicht** übernommen. Die
Lizenzwahl ändert daran nichts — sie regelt nur unsere eigene Zusammenstellung.
Siehe `DISCLAIMER.md`.

### Verworfene Alternativen

**A) Alles MIT.** Verworfen: kein wirksamer Namensnennungsanspruch an der Datenbank.

**B) Daten unter ODbL.** Verworfen: Share-alike-Wirkung schreckt kommerzielle
Nachnutzer ab — genau die Zielgruppe, die das Tool bekannt machen soll.

**C) Daten CC BY-NC.** Verworfen: schließt die kommerzielle Nutzung durch Ingenieurbüros
und Hersteller aus und macht das Werk unfrei. Widerspricht dem Verbreitungsziel.

---

<a id="adr-003"></a>
## ADR-003 — Umgang mit unsicheren und fehlenden Daten

**Status:** akzeptiert · **Datum:** 2026-08-01

### Kontext

Ein Materialberater lebt von Vertrauen. Die realistische Datenlage ist aber lückenhaft:

- Die meisten Hersteller veröffentlichen **keine Z-Werte** — von drei ausgewerteten
  Quellen tat es genau eine.
- Prüfbedingungen werden unvollständig angegeben (ISO 306 ohne Methode und Last).
- Es existieren physikalisch fragwürdige Angaben (Schmelzpunkt für einen amorphen
  Werkstoff; Dauergebrauchstemperatur oberhalb Tg).
- Für ganze Feldgruppen (Bewitterung, CO₂e, Preise) gibt es schlicht keine belastbare
  öffentliche Quelle.

Der Druck, die Lücken „plausibel" zu füllen, ist hoch — eine vollständig wirkende Tabelle
sieht professioneller aus. Genau das wäre der Projektkiller: Ingenieure erkennen
erfundene Präzision, und mit dem ersten entlarvten Wert ist die gesamte Datenbank
entwertet.

### Entscheidung

**1. Vier Konfidenzstufen, maschinell erzwungen.**
`high` / `medium` / `low` / `estimated`. Ein Wert mit `high` oder `medium` **muss** eine
echte Quelle zitieren; `estimate_reasoning` als einzige Quelle erzwingt `estimated` (CI-Regel R7).

**2. Quellen tragen ein `confidenceCeiling`.**
Eine Produktseite ohne Kennwerttabelle kann keine `high`-Werte tragen, auch wenn die
Aussage stimmt (CI-Regel R9).

**3. Fehlende Felder bleiben leer.**
Das Schema macht fast alles optional. Ein leeres Feld senkt nur `dataCompleteness`.
Ein erfundenes Feld beschädigt das Projekt. `unknown` (Chemikalien) und `null` (Flags)
sind ausdrücklich zulässige, sichtbare Werte für „geprüft, nicht feststellbar".

**4. Widersprüche werden abgebildet, nicht geglättet.**
Divergieren Quellen, wird die Spanne gezeigt, der Konflikt in `note` erklärt und eine
`openQuestion` mit `blocking: true` angelegt. Kein Mitteln über unvereinbare Prüfbedingungen.

**5. Zweifelhafte Herstellerangaben werden dokumentiert *und* eingeordnet.**
Sie werden weder gelöscht noch ungeprüft übernommen: Herstellerwert mit `confidence: low`
plus begründeter Notiz, daneben bei Bedarf ein eigenes konservatives Feld
(`recommendedMaxServiceTemperature` neben `continuousServiceTemperature`).

**6. Die UI kennzeichnet `estimated` sichtbar** (gestrichelter Rahmen + Symbol), und die
Engine weist einen **Konfidenz-Rollup** aus, wenn eine Empfehlung maßgeblich auf
Schätzwerten beruht.

**7. Zwei getrennte Qualitätskennzahlen.** `dataCompleteness` (wie viel ist gefüllt) und
`confidenceScore` (wie gut ist es belegt). Ein Datensatz kann vollständig und trotzdem
überwiegend geschätzt sein — beides gehört nebeneinander.

### Konsequenzen

**Positiv**

- Das Tool bleibt auch dann ehrlich, wenn die Datenlage schlecht ist.
- Lücken werden zu sichtbarem Arbeitsvorrat (`openQuestions`) statt zu stillen Fehlern.
- Externe Beiträge werden prüfbar: Ein PR mit `high`-Werten ohne Quelle bricht die CI.
- Die Konfidenzverteilung ist selbst eine Aussage. Referenzdatensatz `petg-cf`:
  **12 high · 35 medium · 11 low · 42 estimated** — rund 42 % beruhen auf Ableitung.
  Diese Zahl wird nicht versteckt, sondern angezeigt.

**Negativ**

- Das Tool sieht auf den ersten Blick „lückenhafter" aus als Wettbewerber, die alles
  ausfüllen. Das ist der Preis und muss im README offensiv erklärt werden.
- Redaktioneller Mehraufwand: jede Ableitung braucht eine nachvollziehbare Begründung.

### Verworfene Alternativen

**A) Nur belegte Werte aufnehmen, keine Schätzungen.**
Verworfen: Ganze Feldgruppen (Lackhaftung, XXL-Eignung, Verklebbarkeit) haben keine
Herstellerquelle, sind aber für die Zielgruppe entscheidungsrelevant. Eine gekennzeichnete
Schätzung ist nützlicher als eine leere Spalte — solange sie als Schätzung erkennbar ist.

**B) Numerischer Konfidenzwert 0–100.**
Verworfen: suggeriert Genauigkeit, die die Einschätzung nicht hat, und ist zwischen
Bearbeitern nicht reproduzierbar. Vier benannte Stufen sind konsistenter vergebbar.

**C) Schätzwerte in einem separaten Feld führen** (`valueEstimated` neben `value`).
Verworfen: verdoppelt das Schema; die Engine müsste überall beide Pfade behandeln.
Ein Konfidenz-Attribut am selben Feld leistet dasselbe.

---

<a id="adr-004"></a>
## ADR-004 — Portfolio-Status ist kein Scoring-Faktor

**Status:** akzeptiert · **Datum:** 2026-08-01

### Kontext

Das Tool wird von der Reents Technologies GmbH betrieben und ist Teil ihrer
Außendarstellung. Jeder Datensatz führt ein Feld `commercial.reentsPortfolioStatus`
(`standard` / `on-request` / `partner-production` / `not-in-portfolio` / `unknown`).

Damit entsteht eine naheliegende Versuchung: Materialien, die Reents3D ohnehin fährt,
im Ranking leicht zu bevorzugen — als „Verfügbarkeitsbonus" wäre das sogar begründbar
formulierbar. Der Effekt wäre kurzfristig positiv (mehr Anfragen auf Lagermaterial) und
technisch praktisch unsichtbar, weil er in einer Gewichtungskonstante verschwindet.

Diese Entscheidung wird **vorab** festgehalten, nicht erst wenn die Frage gestellt wird.
Genau dann ist der Druck nämlich am größten und der Widerstand am kleinsten.

### Entscheidung

**`reentsPortfolioStatus` geht unter keinen Umständen in Stufe 1 (Hard Constraints) oder
Stufe 2 (Scoring) der Engine ein.**

- Das Feld wird ausschließlich als **neutrales Info-Badge** in der UI dargestellt
  („bei Reents3D verfügbar" / „auf Anfrage" / „Partnerfertigung").
- Die Engine erhält das Feld nicht als Eingabe. Es liegt außerhalb der Scoring-Struktur,
  damit es nicht versehentlich in eine Gewichtung gerät.
- Ein Unit-Test stellt sicher, dass ein identisches Anforderungsprofil dasselbe Ranking
  liefert, unabhängig vom Portfolio-Status aller Materialien.
- Materialien, die Reents3D **nicht** führt, werden vollwertig geführt und dürfen die
  Empfehlung anführen. Wo sinnvoll, wird auf Partnerfertigung oder ein anderes Verfahren
  verwiesen.

### Konsequenzen

**Positiv**

- Die Empfehlung bleibt fachlich verteidigbar. Das ist die einzige Eigenschaft, die das
  Tool überhaupt wertvoll macht.
- Die Zielgruppe mit dem höchsten Auftragswert — Ingenieure und Konstrukteure — prüft
  Werkzeuge dieser Art gezielt auf Anbieter-Bias. Ein entdeckter Bias kostet mehr
  Glaubwürdigkeit, als jeder Lagerbestandsvorteil einbringt.
- Der Verzicht ist selbst ein Verkaufsargument und kann offen kommuniziert werden.

**Negativ**

- Das Tool empfiehlt gelegentlich Materialien, die Reents3D nicht fährt. Das ist
  beabsichtigt und wird über den Portfolio-Badge und die Verfahrensweiche aufgefangen.

**Abgrenzung**

`commercial.availability` (allgemeine Marktverfügbarkeit) **ist** ein zulässiges
Scoring-Kriterium — es beschreibt den Markt, nicht das Reents-Lager. Die beiden Felder
dürfen nicht vermengt werden.

### Verworfene Alternativen

**A) Kleiner Bonus (z. B. +5 %) für Lagermaterial.**
Verworfen: Es gibt keine Schwelle, ab der eine verdeckte Anbieterbevorzugung akzeptabel
wird. Entweder das Ranking ist neutral oder es ist Werbung.

**B) Portfolio-Status als optionaler, vom Nutzer aktivierbarer Filter.**
Zurückgestellt, nicht verworfen. Ein ausdrücklich vom Nutzer gesetzter Filter
(„nur bei Reents3D verfügbare Materialien zeigen") ist transparent und damit unbedenklich.
Er wird erst umgesetzt, wenn der Portfolio-Status gepflegt ist, und niemals als Default.

---

## Vorgemerkte ADRs

Werden geschrieben, sobald die Entscheidung ansteht:

| Nr. | Thema | Fällig in |
|---|---|---|
| ADR-005 | Normalisierungsfunktion des Scorings (Perzentile statt Min/Max) | Phase 2 |
| ADR-006 | Default-Gewichtungen je Persona | Phase 2 |
| ADR-007 | Behandlung der Anisotropie im Scoring (eigenes Kriterium oder Abschlag?) | Phase 2 |
| ADR-008 | URL-State-Format und Abwärtskompatibilität geteilter Links | Phase 3 |
| ADR-009 | Schwellenwerte der Verfahrensweiche (wann ist FDM das falsche Verfahren?) | Phase 2 |
| ADR-010 | Versionierung der Datenbank und Umgang mit Breaking Changes im Schema | Phase 4 |
