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

Das Tool wird von der Reents Technologies GmbH betrieben. Entscheidend für die
Bewertung dieser Konstellation: **Reents3D ist 3D-Druck-Dienstleister, kein
Materialhersteller.** Es gibt kein eigenes Filament zu bewerben, keine Vertriebsmarge
auf ein Material und keinen Grund, eine Herstellermarke zu bevorzugen — alle gängigen
Werkstoffe werden eingekauft und auf demselben Maschinenpark verarbeitet.

Der strukturelle Interessenkonflikt, den ein Materialhersteller mit einem solchen Tool
hätte, besteht hier also nicht. Was bleibt, ist ein schwächerer, aber realer Effekt:
Materialien, die im Haus vorrätig sind, ließen sich bequemer fertigen. Ein
„Verfügbarkeitsbonus" wäre begründbar formulierbar und würde technisch unsichtbar in
einer Gewichtungskonstante verschwinden.

Diese Entscheidung wird **vorab** festgehalten, nicht erst wenn die Frage gestellt wird.

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
  Werkzeuge dieser Art gezielt auf Bevorzugung. Ein entdeckter Bias kostet mehr
  Glaubwürdigkeit, als jeder Bequemlichkeitsvorteil einbringt.
- Die Unabhängigkeit lässt sich offen und ohne Abwehrhaltung kommunizieren: Ein
  Dienstleister, der alles verarbeitet, hat schlicht keinen Grund zu lügen.

**Negativ**

- Das Tool empfiehlt gelegentlich Materialien, die gerade nicht vorrätig sind. Das ist
  beabsichtigt; Beschaffung ist ein Bestell-, kein Auswahlproblem.

### Kommunikation

Nach außen wird das **nicht** als Eingeständnis eines Interessenkonflikts formuliert.
Die sachlich richtige Aussage lautet: *herstellerunabhängig — kein Hersteller zahlt für
Platzierung, es gibt keine Affiliate-Links, die Reihenfolge folgt allein aus
Anforderungen und Datenblattwerten.* Eine Formulierung, die einen Konflikt einräumt,
den es strukturell nicht gibt, schadet der Glaubwürdigkeit mehr als sie nützt und stellt
zudem Wettbewerber implizit unter Verdacht. Das ist ausdrücklich nicht gewollt.

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

**Aktueller Stand:** Das Feld wird derzeit **gar nicht angezeigt**. Geplant ist stattdessen
eine eigene Übersichtsseite „Fertigung bei Reents3D" mit der Angabe, welches Material auf
welchem Bauraum gefertigt werden kann (XXL 1.800 × 2.400 × 1.800 mm, Hochformat
1.200 × 1.200 × 2.200 mm) — getrennt von der Materialbewertung.

---

<a id="adr-005"></a>
## ADR-005 — Perzentil-Normalisierung statt Min/Max

**Status:** akzeptiert · **Datum:** 2026-08-01 · Implementiert in `src/engine/scoring.ts`

### Kontext

Kriterien mit völlig verschiedenen Einheiten (MPa, °C, g/cm³, 1–5-Skalen) müssen auf eine
gemeinsame 0–1-Skala, bevor sie gewichtet summiert werden können. Der naheliegende Weg ist
Min/Max-Skalierung: `(v − min) / (max − min)`.

Der bricht, sobald die Datenbank wächst. Heute reicht die HDT-Spanne von 57 °C (PLA) bis
205 °C (PET-CF). Nimmt man morgen PEEK mit rund 300 °C auf, rutscht PC von 0,29 auf 0,19,
ohne dass sich an PC irgendetwas geändert hätte. Ein einzelner Exot verschiebt jede
Bewertung, und geteilte Links liefern plötzlich andere Ergebnisse als am Tag der Beratung.

### Entscheidung

**Perzentilrang statt Min/Max.** Der Score eines Werts ist der Anteil der Datenbasis, den
er übertrifft; gleiche Werte teilen sich den Mittelpunkt.

- Die Ränge werden über die **gesamte** Datenbank berechnet, nicht über die gefilterte
  Trefferliste. Sonst springen Scores, sobald der Nutzer eine unabhängige Anforderung
  umschaltet.
- Polarität (`higherIsBetter`) wird nach der Normalisierung angewandt.

### Konsequenzen

**Positiv** — Stabil beim Datenbankwachstum. Robust gegen Ausreißer. Beantwortet die
Frage, die der Nutzer tatsächlich hat: „Wie steht das im Vergleich zu dem, was es gibt?"

**Negativ** — Perzentile verbergen die Größe des Abstands: liegen zwei Materialien bei
50 und 52 MPa, trennt sie ein voller Rangplatz. Deshalb zeigt die Oberfläche **immer den
Rohwert neben dem Score**, und die Kompromissanalyse rechnet in absoluten Deltas, nicht
in Rängen.

**Negativ** — Bei sehr kleiner Datenbasis ist der Rang grobkörnig. Bei 11 Materialien
sind das rund 9 Prozentpunkte pro Platz. Das relativiert sich mit jedem Datensatz.

### Verworfene Alternativen

**A) Min/Max** — siehe Kontext.
**B) Z-Score** — setzt Normalverteilung voraus, die bei 11 Materialien niemand belegen kann.
**C) Feste Referenzskalen** (z. B. „100 MPa = 1,0") — willkürlich und müsste je Kriterium
gepflegt werden.

---

<a id="adr-006"></a>
## ADR-006 — Fehlende Daten fallen aus der Gewichtung, statt null zu zählen

**Status:** akzeptiert · **Datum:** 2026-08-01 · Implementiert in `src/engine/scoring.ts`, `src/engine/index.ts`

### Kontext

Wenn ein Material für ein gewichtetes Kriterium keinen Wert hat, muss die Engine sich
entscheiden. Beide naheliegenden Antworten sind falsch:

- **0 einsetzen** bestraft ehrliche Datenerfassung. Ein Datensatz, der eine Lücke offen
  zugibt, verliert gegen einen, der geraten hat.
- **Mittelwert einsetzen** erfindet eine Aussage und versteckt die Lücke.

### Entscheidung

Fehlende Kriterien werden **aus der Gewichtung entfernt und der Rest renormiert**. Der
Score ist der gewichtete Mittelwert über das, was belegt ist. Zusätzlich:

- Die Lücke wird als `dataGaps` ausgewiesen und in der Oberfläche benannt.
- Bei **Hard Constraints** gilt eine bewusste Asymmetrie: technische Eigenschaften sind
  *permissiv* (fehlender Wert heißt „wir wissen es nicht", das Material bleibt drin),
  regulatorische Eigenschaften sind *strikt* (fehlende Deklaration ist ein Durchfall —
  man darf ein Material nicht in Lebensmittelkontakt bringen, nur weil niemand
  aufgeschrieben hat, dass man es nicht darf).
- **Wer eine Anforderung nur mangels Daten passiert, rankt nie über einem Kandidaten, der
  sie belegt erfüllt.** Solche Treffer erscheinen am Ende, als „nicht belegt" markiert.

Der letzte Punkt entstand aus einem Befund im Live-Test: TPU 95A hat keinerlei
Temperaturdaten und stand dadurch bei einer 90-°C-Anforderung auf Platz 1. Unwissenheit
als Empfehlung auszugeben ist genau der Fehler, den dieses Werkzeug nicht machen darf.

### Konsequenzen

Sparsame Datensätze werden weder bestraft noch belohnt. Der Preis: der Score eines
lückenhaften Datensatzes beruht auf weniger Kriterien und ist damit weniger aussagekräftig
— deshalb wird die Zahl der Lücken immer mit angezeigt.

---

<a id="adr-007"></a>
## ADR-007 — Anisotropie ist ein eigenes Kriterium, kein Abschlag

**Status:** akzeptiert · **Datum:** 2026-08-01

### Kontext

FDM-Bauteile sind senkrecht zur Schicht schwächer. Man könnte das im Scoring verstecken,
indem man jede Festigkeit mit ihrem Anisotropiefaktor multipliziert — dann bekäme man
„ehrliche" Festigkeitswerte für den ungünstigsten Fall.

### Entscheidung

**Nicht verrechnen, sondern getrennt ausweisen.** `layerAdhesion` ist ein eigenes,
gewichtbares Kriterium; die Festigkeitskriterien bleiben X-Y-Werte.

Begründung: Die Anisotropie ist keine Materialeigenschaft, die man wegrechnen kann,
sondern eine **Konstruktionsaufgabe**. Wer richtig orientiert, bekommt den X-Y-Wert. Wer
falsch orientiert, bekommt den Z-Wert. Ein pauschaler Abschlag würde beide Fälle mitteln
und dem Konstrukteur genau die Information nehmen, die er zum Handeln braucht.

Stattdessen erzeugt die Engine eine **Warnung**, sobald der Faktor unter 0,6 fällt, und
eine schärfere für den Schlagzähigkeits-Faktor unter 0,5 — dort bricht er regelmäßig
deutlich stärker ein als bei der Zugfestigkeit (PETG-CF: 0,64 gegen 0,26).

---

## ADR-012 — KI in der Entstehung, keine KI im Werkzeug

**Status:** entschieden · **Datum:** 2026-08-01

Der Datenbestand wird mit KI-Unterstützung erschlossen: Herstellerdatenblätter werden
maschinell ins Schema überführt und systematisch gegengelesen. Die **veröffentlichte
Anwendung enthält dagegen kein Modell** — kein API-Aufruf, keine Generierung zur Laufzeit.

Begründung, in dieser Reihenfolge:

**Determinismus.** Ein Beratungswerkzeug, das auf dieselbe Eingabe zwei verschiedene
Empfehlungen geben kann, ist als Entscheidungsgrundlage wertlos. Die Rangfolge muss aus den
Daten im Repository ableitbar sein — prüfbar, reproduzierbar, diskutierbar.

**Nachprüfbarkeit statt Plausibilität.** Ein Modell zur Laufzeit würde flüssige Sätze über
Werkstoffe erzeugen, die richtig klingen und niemand gegenprüfen kann. Deshalb sind auch
die Begründungen strukturierte Objekte aus der Datenbank und kein generierter Text.

**Datenschutz und Offline-Betrieb.** Kein Modellaufruf bedeutet: keine Anfrage verlässt den
Browser. Das Werkzeug läuft ohne Netz und ohne Datenabfluss — was für eine Anwendung, in die
Konstrukteure ihre Anforderungen eingeben, kein Nebeneffekt, sondern ein Merkmal ist.

**Regulatorik.** Die Transparenzpflichten nach Artikel 50 der EU-KI-Verordnung greifen bei
Systemen, die für Nutzer Inhalte erzeugen. Ein Werkzeug ohne Laufzeit-Generierung fällt
nicht darunter. Die Offenlegung in [AI_USAGE.md](AI_USAGE.md) erfolgt deshalb freiwillig.

Die Gegenposition — ein Modell zur Laufzeit könnte freier auf Rückfragen eingehen — wurde
verworfen: Der Gewinn an Gesprächigkeit steht gegen den Verlust an Belegbarkeit, und
Belegbarkeit ist der einzige Grund, warum dieses Werkzeug existiert.

**Folge:** Erfundene Werte müssen in der Entstehung abgefangen werden, nicht im Betrieb.
Dafür sorgen Quellenzwang im Schema, Konfidenz-Ceilings je Quelle, sechzehn
Plausibilitätsregeln in der CI und die verlinkte PDF-Quelle an jedem Produkt.

---

## ADR-013 — Export: CSV im Excel-Dialekt, PDF über den Druckweg

**Status:** entschieden · **Datum:** 2026-08-01

Ergebnisse müssen das Werkzeug verlassen können — als Tabelle zum Weiterrechnen und als
Dokument für die Projektakte. Drei Entscheidungen dazu.

**1 · CSV im Excel-Dialekt, nicht RFC 4180.**
Die Dateien gehen an Semikolon, Dezimalkomma, UTF-8 mit BOM. Das ist nicht der Standard,
aber es ist das, was ein deutscher Konstrukteur beim Doppelklick erwartet: Ohne BOM zeigt
Excel unter Windows aus „Prüfkörper" ein „PrÃ¼fkÃ¶rper", ohne Semikolon steht alles in
einer Spalte, mit Dezimalpunkt rechnet Excel mit Text statt mit Zahlen. Wer die Daten
maschinell verarbeitet, nimmt ohnehin besser das JSON — es liegt offen im Repository und
ist in den strukturierten Daten als Distribution verlinkt. Der Serialisierer beherrscht
beide Dialekte; ausgeliefert wird der, der zum jeweiligen Empfänger passt.

Zellen, die mit `=`, `+`, `-` oder `@` beginnen, werden entschärft. Das ist der klassische
CSV-Injection-Pfad, und diese Dateien werden verteilt. Echte negative Zahlen bleiben
unangetastet — die Regel greift nur, wo hinter dem Zeichen keine Zahl steht.

**2 · Die eigentliche Datenbank ist die lange Form.**
`materialien-kennwerte.csv` führt **eine Zeile je Einzelkennwert** mit Quelle, Prüfnorm,
Prüfbedingung, Orientierung und Konfidenz. Das ist die einzige Form, in der ADR-001
überlebt: In einer breiten Tabelle mit einer Spalte je Kennwert hätte die Herkunft keinen
Platz und fiele weg — und übrig bliebe eine Zahlensammlung ohne Belegkette, also genau das,
wogegen dieses Werkzeug antritt. Die breite Übersicht gibt es zusätzlich, zum Überfliegen.

**3 · PDF über die Druckfunktion des Browsers, nicht über eine PDF-Bibliothek.**
Eine Bibliothek kostet mehrere hundert Kilobyte plus eingebettete Schriften und liefert ein
schlechteres Layout, als CSS für bedruckte Seiten kann. Der Druckweg liefert auswählbaren
Text, die echten Hausschriften, funktionierende Links, und er ändert nichts an der Zusage,
dass keine Anfrage den Browser verlässt.

Der Preis steht offen im Werkzeug: Man geht durch den Druckdialog, und die Kopf- und
Fusszeilen des Browsers muss man dort abschalten, sonst steht die Browser-Adresse über dem
Briefkopf. Seitenzahlen kann CSS in Browsern nicht setzen (`@page`-Randboxen unterstützt
keine Browser-Engine); auch das ist Sache des Dialogs.

**Folge:** Der Bericht ist eine eigene Ansicht (`#/report`), kein Druck-Stylesheet über die
Ergebnisliste. Ein Dokument braucht Anforderungsprofil, Begründung, Datenlage und Quellen
in einem Zug — die Arbeitsansicht ist auf Aufklappen und Umgewichten gebaut. Beide lesen
denselben Zustand aus der URL, der Bericht bleibt also ein teilbarer Link.

**Folge:** Browser-Download und CI-Veröffentlichung teilen sich die Spaltendefinitionen in
`src/lib/exports.ts` (Node lädt die TypeScript-Datei per Type Stripping direkt). Zwei
Implementierungen wären zwei Wahrheiten. Geprüft: Die drei heruntergeladenen Dateien sind
byteweise identisch mit den im Build erzeugten.

---

## Vorgemerkte ADRs

| Nr. | Thema | Fällig in |
|---|---|---|
| ADR-008 | URL-State-Format und Abwärtskompatibilität geteilter Links | bei erster Schema-Änderung am State |
| ADR-009 | Schwellenwerte der Verfahrensweiche (aktuell in `processSwitch.ts` als Konstanten dokumentiert) | wenn sie strittig werden |
| ADR-010 | Versionierung der Datenbank und Umgang mit Breaking Changes im Schema | Phase 4 |
| ADR-011 | Default-Gewichtungen je Persona (Messebau, Konstruktion, Einkauf) | mit dem Use-Case-Katalog |
