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

## ADR-014 — Offlinebetrieb mit handgeschriebenem Service Worker

**Status:** entschieden · **Datum:** 2026-08-01

Das Werkzeug wird auf Messen und in Werkstätten benutzt. Genau dort ist das Netz
unzuverlässig. Die Anwendung braucht keinen Server — alle Daten stecken im Bundle — aber
ohne Service Worker fällt sie trotzdem aus, sobald das WLAN wegbricht.

**Handgeschrieben statt Workbox.** Zu cachen sind eine HTML-Datei, ein Bundle, ein
Stylesheet, zwei Schriften und ein paar Symbole. Dafür eine Bibliothek samt Buildkette
einzuziehen, wäre mehr Abhängigkeit als Nutzen. `scripts/build-sw.mjs` liest die Liste aus
dem, was tatsächlich in `dist/` liegt — nicht aus einer gepflegten Aufzählung, die beim
nächsten Umbau veraltet. Der Cache-Name ist ein Hash über Dateinamen **und** Inhalte: nur
über die Namen zu hashen würde `index.html` konservieren, die ihren Namen behält und sich
trotzdem bei jedem Build ändert.

**Kein `skipWaiting`.** Ein Service Worker, der sich sofort aktiviert, tauscht Dateien
unter einer laufenden Seite aus. Diese Fassung übernimmt erst beim nächsten Laden. Der
Preis ist eine Aktualisierung, die einen Seitenaufruf später ankommt — der richtige Preis
für ein Werkzeug, das jemand gerade im Kundengespräch offen hat.

**Die Falle, die beim Bauen auffiel.** Unter derselben Herkunft liegen 81 statische Seiten
für Suchmaschinen (ADR aus dem SEO-Schritt). Der erste Entwurf legte jede aufgerufene Seite
unter dem Schlüssel der Startseite ab — nach einem Besuch auf `/glossar/…` hätte die
Anwendung beim nächsten Start ohne Netz einen Glossareintrag statt sich selbst gezeigt.
Jetzt wird nur die Startseite unter ihrem eigenen Schlüssel aktualisiert, und ein
Seitenaufruf ohne Netz auf einer statischen Adresse leitet zur Anwendung um, statt deren
Inhalt unter fremder Adresse auszuliefern.

**Folge:** `%BASE_URL%` statt relativer Pfade für Manifest und Symbol in der `index.html`.
Relative Pfade brechen, sobald dieselbe HTML unter einer tieferen Adresse ausgeliefert wird
— und genau das passiert im Offlinefall.

---

## ADR-015 — Herstellerangabe und Ableitung bleiben getrennt

**Status:** entschieden · **Datum:** 2026-08-02

Herstellerdatenblätter enthalten Aussagen, für die es am Werkstofftyp längst ein Feld gibt:
Chemikalienbeständigkeit und UL94. Naheliegend wäre gewesen, sie dorthin zu schreiben.
Das Produktschema hat stattdessen **eigene** Felder dafür bekommen.

**Der Grund ist der Unterschied in der Aussage.** Die Beständigkeitsmatrix am Werkstofftyp
ist eine **Ableitung aus der Polymerfamilie** — sie sagt, wie sich PETG üblicherweise gegen
Aceton verhält. Was im Datenblatt von SUNLU PETG steht, ist eine **Aussage über ein
konkretes Produkt**. Beide benutzen dieselbe Skala und meinen Verschiedenes. Sie in dasselbe
Feld zu schreiben, hiesse, die Herkunft zu verlieren — genau das, was ADR-001 verhindern
soll.

**Praktisch heisst das:** Ein Hersteller kann der Ableitung widersprechen, und beides steht
nebeneinander. Wer das eine für das andere hält, sieht es an Quelle und Konfidenz.

**Die Grenze der Herstellerangaben steht am Wert.** Kein Blatt nennt Konzentration,
Temperatur oder Dauer. „Good gegen Alkohol" ist ohne diese drei Angaben keine Freigabe,
sondern eine Vorauswahl. Alle importierten Angaben stehen deshalb auf Konfidenz `low`, und
die Bedingung „Herstellerangabe ohne Konzentration, Temperatur und Dauer" hängt an jedem
einzelnen Eintrag.

**Folge:** Das Medienregister wuchs von 18 auf 21 Einträge (starke Säure, starke Lauge,
Ester), weil Datenblätter diese Medien als eigene Zeile führen und sich ihre Angaben sonst
nirgends hätten ablegen lassen. Eine starke Säure ist chemisch etwas anderes als eine
verdünnte, nicht bloss mehr davon — an zwei Stellen kehrt sich die gewohnte Reihenfolge
sogar um: ABS und Polyamid halten starke Lauge besser aus als die Polyester.

---

## ADR-016 — Eine geschätzte Klassifizierung erfüllt keine regulatorische Anforderung

**Status:** angenommen · **Datum:** 2026-08-02

**Auslöser.** Beim Anlegen des PVC-Werkstofftyps lag es nahe, UL94 V-0 einzutragen: Hart-PVC
gilt wegen seines Chloranteils als von Haus aus schwer entflammbar, jedes Lehrbuch führt es
so. Das Fillamentum-Blatt nennt aber keine Klasse, keine Materialdicke und keine Prüfstelle.
Der Eintrag wäre eine Schlussfolgerung gewesen, keine Übernahme.

Der bestehende Szenariotest „UL94 V-0 erfüllt nur ein ausdrücklich flammgeschützter
Werkstoff" ging daraufhin rot — und deckte damit eine Lücke auf, die vorher niemand sehen
konnte: Der Constraint las den Wert, ohne die Konfidenz zu prüfen. Ein `estimated`-Wert
passierte den Filter genauso wie ein belegter.

**Entscheidung.** Zwei Änderungen, eine an den Daten und eine an der Engine.

1. **PVC trägt keine Brandschutzklasse.** Wo das Blatt schweigt, schweigt die Datenbank.
2. **Der Constraint prüft die Konfidenz mit.** Eine Einstufung mit `confidence: "estimated"`
   fällt durch, auch wenn ihr Wert genügen würde — mit einer eigenen Begründung
   (`constraint.flame.failEstimated`), damit der Unterschied zu „gar keine Klasse" sichtbar
   bleibt.

**Warum das nicht übervorsichtig ist.** Eine Brandschutzklasse ist keine Werkstoffeigenschaft,
sondern eine Aussage über ein **geprüftes Bauteil bestimmter Dicke**. Dieselbe Rezeptur
erreicht bei 1,5 mm V-0 und bei 0,8 mm nur V-2. Aus der Polymerklasse lässt sich das
grundsätzlich nicht ableiten — nicht ungenau, sondern gar nicht.

Die Asymmetrie ist dieselbe wie in ADR-006: Eine falsche Freigabe kostet ein Bauteil im Feld
und im schlimmsten Fall mehr; eine zu vorsichtige Einstufung kostet einen Platz in der
Rangliste.

**Reichweite.** Die Regel gilt vorerst nur für den Brandschutz. Lebensmittelkontakt und ESD
prüfen bereits auf eine ausdrückliche Deklaration und sind damit strukturell dicht. Sobald
ein weiteres regulatorisches Merkmal dazukommt, gehört es nach demselben Muster gebaut.

---

## ADR-017 — Der Assistent führt, statt ein Formular abzufragen

**Status:** angenommen · **Datum:** 2026-08-02

**Auslöser.** Ein Durchgang durch die erste Fassung im Browser förderte fünf Befunde zutage,
die sich im Code allein nicht zeigten:

| Befund | Warum das zählt |
|---|---|
| „Überspringen" rief dieselbe Funktion wie „Weiter" | Eine Schaltfläche, die nichts überspringt, ist eine Falschaussage |
| Schritt 1 hatte zwei Schaltflächen, Schritt 6 dreissig Bedienelemente | Der Fortschrittsbalken log über den verbleibenden Aufwand |
| Kein Rückblick auf die eigenen Angaben | Nach sieben Schritten weiss niemand mehr, was er gesagt hat |
| Null Treffer führten kommentarlos auf die Ergebnisseite | Die häufigste Sackgasse blieb unerklärt |
| Sechzehn Regler mit Begriffen wie „Schichthaftung" als letzter Schritt | Der schwierigste Teil kam, wenn die Aufmerksamkeit am geringsten ist |

Nebenbefund: Die Startseite versprach schon vorher „In sechs Schritten" — es waren sieben.

**Entscheidung.**

- **Sechs gleichmässig gefüllte Schritte** statt sieben ungleicher. Umgebung und Temperatur
  gehören sachlich zusammen; die Werkstattausstattung gehört zum Bauteil, nicht zur
  Regulatorik.
- **Jeder Schritt kennt seine Felder.** Erst dadurch kann „Zurücksetzen" wirklich
  zurücksetzen — und die Schaltfläche erscheint nur, wenn es etwas zurückzusetzen gibt.
- **Eine Leiste mit allen gesetzten Anforderungen**, jede einzeln entfernbar.
- **Die Sackgasse bekommt eine Auskunft.** Bei null Treffern zählt der Assistent die
  Ablehnungsgründe der Engine aus und benennt die Anforderung, an der die meisten Werkstoffe
  scheitern — mit einer Schaltfläche, die genau sie löst. Die Auskunft ist **gezählt, nicht
  geraten**; sie stammt aus denselben `failed`-Objekten, die auch die Ergebnisseite anzeigt.
- **Benannte Schwerpunkte statt sechzehn Regler.** Die Regler bleiben eine Zeile darunter
  erreichbar. Ein Schwerpunkt setzt nur die Kriterien, die er meint; der Rest bleibt auf dem
  Standard, damit keine stillen Nebenwirkungen entstehen.
- **Die zwanzig Anwendungsfälle stehen im ersten Schritt** und auf der Startseite. Wer weiss,
  dass er ein Gleitlager auslegt, ist über den fertigen Fall schneller am Ziel als über sechs
  Schritte.

**Was ausdrücklich unverändert bleibt.** Die URL bleibt die einzige Quelle der Wahrheit
(ADR-002). Ein Schwerpunkt serialisiert sich als die Abweichungen, die er setzt — nicht als
sechzehn Parameter. Geteilte Links aus der Zeit der sieben Schritte funktionieren weiter: Die
Schrittnummer wird in den gültigen Bereich geklemmt, statt eine leere Seite zu zeigen.

**Was das nicht löst.** Der Assistent fragt weiterhin nach Anforderungen, die viele Anfragende
zu Beginn nicht kennen — „Wie warm wird es wirklich?" ist im Zweifel die schwerste Frage des
ganzen Ablaufs. Die Anwendungsfälle sind die Antwort darauf, aber nur für die zwanzig Fälle,
die es gibt.


---

## ADR-018 — Eine Schätzung darf abstufen, nie ausschliessen

**Status:** angenommen · **Datum:** 2026-08-02

**Auslöser.** Der Anwendungsfall „Messebau-Großteil" empfahl **ASA Aero** — ein
schäumendes Leichtbaufilament für RC-Bauteile — für ein zwei Meter großes Messemodell.
Die Werkstatt hielt dagegen: PETG ist dafür klar besser, bei reinem Innenraum sogar PLA,
beide erheblich günstiger, und ASA Aero gibt es nicht auf XXL-Spulen.

Die Nachrechnung zeigte, dass ASA Aero nicht gewonnen, sondern **überlebt** hat:

```
pla        RAUS: Temperatur   50 gefordert, 40 hinterlegt
petg       RAUS: Größe      1800 gefordert, 1500 hinterlegt
asa        RAUS: Größe      1800 gefordert,  600 hinterlegt
petg-cf    RAUS: Größe      1800 gefordert, 1200 hinterlegt
greentec   RAUS: Größe      1800 gefordert,  900 hinterlegt
asa-aero   Platz 1 — als einziger Übriggebliebener, Score 51 von 100
```

Fünf Ausschlüsse, **kein einziger durch eine Messung gedeckt**. Alle 38 Größenwerte trugen
`estimate_reasoning` und `estimated`; die Dauergebrauchstemperatur ebenso.

**Entscheidung.** Ein Constraint darf nur auf einem **belegten** Wert ausschliessen.

- Reisst die konservative Schätzung, der gemessene Datenblattwert trägt aber noch, bleibt
  der Werkstoff **in der Liste und trägt eine Warnung** (`constraint.temperature.tight`).
- Reisst auch der Datenblattwert, gilt weiterhin der Ausschluss.
- Gibt es überhaupt keinen belegten Wert, entscheidet die Schätzung — die Asymmetrie aus
  ADR-006 gilt: Eine falsche Freigabe kostet mehr als eine zu vorsichtige Einstufung.

Damit tun beide Zahlen, wofür sie taugen: **die Schätzung warnt, das Datenblatt
entscheidet.** Das ist dieselbe Regel wie in ADR-016, dort für die Brandschutzklasse —
sie war nur nie verallgemeinert worden.

**Zwei Folgefehler, die dabei aufgefallen sind.**

1. `constraintReserve` rechnete auf einem BESTANDENEN Constraint eine negative Reserve
   („−6 %"), weil der konservative Wert unter der Anforderung lag. Derselbe Widerspruch
   wie seinerzeit die „−100 % Reserve" auf fehlenden Daten. Die Reserve rechnet jetzt
   gegen den belegten Wert und liefert sonst `null`.
2. Die Ergebniskarte schnitt Erklärungen nach vier Einträgen ab — **Stärken verdrängten
   die Warnung**. Ein Werkstoff, der ohne seinen Vorbehalt in der Liste steht, ist
   irreführender als einer, der ganz fehlt. Risiken werden jetzt nie weggeschnitten.

---

## ADR-019 — Die Bauteilgrösse ist keine Werkstoffeigenschaft

**Status:** angenommen · **Datum:** 2026-08-02

**Die Frage, die es ausgelöst hat.** „Auf welcher Basis wird entschieden, dass ein
Material nicht größer als x mm gefertigt werden kann?"

**Die Antwort war: auf keiner.** Alle 38 Werte waren Schätzungen — und sie widersprachen
einander:

| Verzug | Kammer | hinterlegte Werte |
|---|---|---|
| 1 | nicht nötig | PLA 2400 · PLA Tough 900 · TPU 95A 300 |
| 2 | nicht nötig | PETG 1500 · PETG-CF 1200 · PCTG 900 · PEBA 400 |
| 3 | empfohlen | **ASA Aero 2000** · PMMA 900 · HIPS 800 · PVC 300 |

ASA Aero stand mit *schlechterer* Verzugsneigung höher als PETG. Genau diese Unstimmigkeit
hat es an die Spitze der Messebau-Empfehlung gespült.

**Entscheidung.** `maxSensibleEdgeMm` bedeutet nicht mehr „größer geht nicht", sondern
**„ab hier wird es aufwendig"** — Brim, beheizte Kammer, Segmentierung. Der Wert schliesst
niemanden mehr aus; er stuft ab und warnt.

Hergeleitet wird er aus **Verzugsneigung und Kammerbedarf** (`scripts/derive-xxl-effort.mjs`)
statt aus 38 unabhängigen Schätzungen. Ausnahmen sind einzeln begründet: Bei Elastomeren
begrenzt nicht der Verzug, sondern die Druckgeschwindigkeit; bei schäumenden Filamenten
die Schaumstruktur.

**Warum nicht der Bauraum als harte Grenze.** Der naheliegende Vorschlag war, den Bauraum
des Herausgebers (1.800 × 2.400 × 1.800 mm) als Obergrenze zu hinterlegen. Der Inhaber hat
das zurückgewiesen, und zu Recht:

> „Es ist ja ein unabhängiger Materialberater, daher sollten unsere Maschinen nicht der
> Maßstab sein."

Das ist ADR-004 in seiner allgemeinen Form: Was den Herausgeber betrifft, darf die
Bewertung für andere nicht bestimmen. Der Maschinenpark eines Dienstleisters ist für die
Werkstoffwahl eines fremden Konstrukteurs ohne Belang.

**Was die Herleitung nicht abbildet.** Druckzeit, Spulenlogistik und Handhabung. Das steht
so in der Notiz an jedem Wert.

**Belegt durch Werkstattpraxis.** PETG läuft einteilig über zwei Meter, ABS auf 2,4-m-Betten
mit Kammer, und große Messemodelle werden ohnehin segmentiert — deshalb steht
`segmentationRecommended` jetzt bei allen Werkstoffen auf `true`.


---

## ADR-020 — Wissenslücken dürfen den Score nicht heben

**Status:** angenommen · **Datum:** 2026-08-02

**Auslöser.** Ein systematischer Durchlauf aller 20 Anwendungsfälle nach ADR-018 zeigte
einen zweiten Fall derselben Familie — diesmal nicht im Filter, sondern im Scoring.

Bei der Chemiewanne (Chemie 5, Steifigkeit 3) gewann **OBC mit 68 gegen PP mit 61**:

```
obc   [stiffness=FEHLT  chemical=74  printability=72  price=53]
pp    [stiffness=6      chemical=93  printability=39  price=83]
```

PP hat 1400 MPa E-Modul und bekommt dafür 6 von 100 Punkten. OBC hat gar keinen E-Modul
hinterlegt — obwohl es mit 244 MPa Biegemodul noch **weicher** ist. Der gewichtete
Mittelwert lief nur über Kriterien MIT Daten; die fehlende Zahl war ein Freifahrtschein.

Betroffen waren 28 von 38 Werkstoffen. Häufigste Lücke: Schichthaftung bei 25 von 38.

**Entscheidung.** Der Score wird mit der **Abdeckung** multipliziert — dem Anteil der vom
Nutzer gewichteten Entscheidung, zu dem überhaupt Daten vorliegen.

```
coverage = Gewicht der Kriterien mit Daten / Gewicht aller gewichteten Kriterien
score    = gewichteter Mittelwert × coverage
```

Fehlende Werte werden dabei ausdrücklich **nicht als 0 eingesetzt** (ADR-006). Ein
Werkstoff ohne Daten fällt nicht auf null — er verliert genau den Anteil, den er nicht
belegen kann. Und der Verlust wächst mit der Wichtigkeit: Wer bei einem mit 5 gewichteten
Kriterium schweigt, verliert mehr als bei einem mit 1.

Das ist ADR-006 (`unbelegte Treffer ranken hinter belegten`) auf das Scoring angewandt.
Bisher galt es nur für Constraints.

**Was das korrigiert hat.** Neben der Chemiewanne änderten sich zwei weitere Sieger:
**Gleitlager** ging von PPS-CF auf **PA12-CF** — Polyamid ist der klassische
Lagerwerkstoff, PPS-CF hatte über Lücken gewonnen. Nach der Änderung haben alle 20
Anwendungsfälle einen Sieger mit **100 % Abdeckung**.

**Sichtbarkeit.** Die Abwertung steht auf der Ergebniskarte. Ohne den Hinweis wirkte ein
niedriger Score wie ein Werkstoffurteil, obwohl er ein Erfassungsurteil ist.

---

## ADR-021 — Eine Brandschutzklasse am Produkt gibt die Familie nicht frei

**Status:** angenommen · **Datum:** 2026-08-02

**Auslöser.** Der Anwendungsfall „Bahn-Schaltschrank" fordert UL94 V-0 und lieferte genau
**einen** Treffer: PC-FR mit Score 48 — wieder ein Sieg durch Übrigbleiben.

Dabei lagen im Bestand belegte V-0-**Produkte**: add:north PETG Flame Retardant V0
(halogenfrei, ohne roten Phosphor) und Spectrum PC/ABS FR V0 (V-0 bei 1,5 UND 3,0 mm,
Glühdrahtindex 960 °C). Nur trugen ihre Werkstofftypen keine Klasse, und der Filter
arbeitet auf der Typebene. Zwei belegte Optionen waren unauffindbar.

**Warum nicht einfach V-0 an den Typ schreiben.** Weil es gefährlich falsch wäre. PETG ist
**nicht** V-0. Nur die flammgeschützte Type ist es — und die ist ein anderer Werkstoff als
das PETG von der Rolle nebenan: Im add:north-Blatt kostet der Flammschutz vier Fünftel der
Zähigkeit (Bruchdehnung 5 % statt 24 %). Wer „PETG ist V-0" liest und irgendein PETG
bestellt, baut ein Bauteil, das die Anforderung nicht erfüllt.

**Entscheidung.** Ein eigenes Feld `ul94ViaProduct` sagt: „In dieser Familie gibt es eine
Type mit dieser Klasse — und zwar diese hier." Der Constraint lässt den Werkstoff durch,
die Begründung nennt aber Marke und Produktnamen:

> V-0 nur über eine bestimmte Type: add:north PETG Flame Retardant V0. Die
> Werkstofffamilie als solche ist nicht klassifiziert — wer irgendeine Type davon
> bestellt, verfehlt die Anforderung.

Als Quelle steht das Produktdatenblatt in der Quellenliste des Werkstoffs, nicht eine
unbelegte Sonderkennung — die Plausibilitätsregel R8 hat das erzwungen, und zu Recht.

Nicht übernommen werden **HB** (unterste Stufe, bedeutet nur „brennt langsam") und Klassen
mit `confidence: estimated` (ADR-016).

**Ergebnis:** Bahn-Schaltschrank liefert jetzt drei Optionen statt einer, angeführt von
ABS-PC mit 60 statt PC-FR mit 48.

**Der wiederkehrende Fallstrick.** Dies war das dritte Mal an einem Tag, dass die Engine
einen Vorbehalt berechnete, den die Ergebniskarte nicht zeigte. Bei „nur diese eine Type
erfüllt V-0" wäre das die gefährlichste Verkürzung, die dieses Werkzeug produzieren kann.
Ein eigener Regressionstest prüft jetzt, dass der Verweis auf der Karte landet — nicht nur
im Verdict.


---

## ADR-022 — Wirtschaftlichkeit in €/kg, und nicht in der ersten Reihe

**Status:** angenommen · **Datum:** 2026-08-02

**Auslöser.** Aus der Werkstatt: *„Preis sollte nicht primär mit drin sein, da es ja ums
Material geht. Also Wirtschaftlichkeit vielleicht einfach auf Basis von einem einfachen
Scoring basiert auf Preis pro kg vom Material."*

Der Blick in die Daten gab dem recht — doppelt:

1. **Der Preis trug mit Gewicht 3 das höchste Standardgewicht überhaupt**, gleichauf mit
   Festigkeit, Temperatur und Druckbarkeit. In einem *Werkstoff*berater.
2. **Die Verteilung war entartet:** 29 der 38 Werkstoffe standen auf `priceIndex` 4 oder 5,
   genau einer auf 1. Der Index unterschied damit praktisch nur „PLA" von „alles andere"
   und schob PLA in fast jeder Standardabfrage nach oben.

**Entscheidung.**

- Der Preis wird als **€/kg mit Spanne** geführt (`commercial.pricePerKg`), nicht als
  abstrakte Fünferskala.
- Das **Standardgewicht fällt von 3 auf 1**.
- Die Beschriftung heisst **Wirtschaftlichkeit**, nicht „Preis" — die Zahl ist ein
  Materialpreis, kein Bauteilpreis.
- `priceIndex` bleibt für die grobe Anzeige, wird aber aus den €/kg **abgeleitet**
  (Quintile über das Feld). Damit können die beiden Angaben nicht mehr auseinanderlaufen,
  und die Verteilung ist konstruktionsbedingt gleichmäßig (9·9·5·8·7 statt 1·3·5·18·11).

**Warum €/kg besser ist als ein Index, obwohl beide geschätzt sind.**

| | Index 1–5 | €/kg |
|---|---|---|
| nachprüfbar | nein | ja — jeder kann es gegen einen Shop halten |
| korrigierbar | nein | ja — eine falsche Spanne ist benennbar |
| Verhältnis erhalten | nein, Faktor 5 maximal | ja — PLA zu PPS-CF ist Faktor 11 |

Der Einwand „das ist doch auch nur geschätzt" trifft die Konfidenz, nicht den Nutzen. Eine
prüfbare Schätzung ist etwas anderes als eine unprüfbare.

**Die Grenze steht am Wert.** Es sind Marktspannen aus dem europäischen Fachhandel für
1-kg-Spulen mit Erhebungsdatum — keine Einkaufspreise, kein Angebot, und sie altern. Sie
tragen `estimated`. Nicht enthalten sind Bauzeit, Ausschussrate und Nachbearbeitung, die in
der Praxis regelmäßig über das Filament dominieren.

**Wirkung auf die Rangfolge.** Die Standardabfrage lieferte vorher PLA als Sieger; jetzt
stehen ASA-CF (65), GreenTEC (62), PLA (62) und PLA-Tough (62) praktisch gleichauf. Der
Preis entscheidet nicht mehr, welcher Werkstoff technisch passt — nur noch, welchen von den
passenden man nimmt.


---

## ADR-024 — „Warum nicht X?" darf nicht über einem Häkchen stehen

**Status:** angenommen · **Datum:** 2026-08-02

**Auslöser.** Aus der Werkstatt, zu PETG:

> „Bei PETG wird häufig noch *Warum nicht PETG? ✓ Knapp: Unsere konservative
> Dauereinsatzempfehlung liegt bei 55 °C, gefordert sind 60 °C …* aufgeführt und daher
> ausgeschlossen. Für die meisten Projekte reicht ein PETG jedoch komplett aus."

Der zitierte Eintrag trägt ein **Häkchen** — er ist eine *bestandene* Prüfung. PETG war
nicht ausgeschlossen. Aber das Panel überschreibt jede Verdict-Liste mit „Warum nicht X?",
auch wenn darunter ausschließlich Häkchen stehen. Wer es öffnet, liest einen Ausschluss,
den es nicht gibt.

Das ist die Kehrseite von ADR-018: Seit die Engine bei knapper Temperatur abstuft statt
auszuschliessen, gibt es einen dritten Zustand — *bestanden mit Vorbehalt* —, den die
Oberfläche nicht kannte.

**Entscheidung.** Drei Fälle, drei Überschriften:

| Zustand | Überschrift |
|---|---|
| mindestens eine Prüfung gerissen | „Warum nicht {Name}?" |
| bestanden, aber mit Vorbehalt oder fehlenden Daten | „{Name} erfüllt alle Anforderungen — mit Vorbehalt" |
| glatt bestanden | „{Name} erfüllt alle Anforderungen" |

**Was der Befund noch aufgedeckt hat.** Die Nachfrage nach PETG führte zu einem Durchlauf
aller 20 Anwendungsfälle. PETG war aus elf davon ausgeschlossen — die meisten zu Recht
(Lauge, UV, Lebensmittelkontakt, ESD, Flexibilität). Einer nicht:

**„Serienteil ohne geschlossenen Bauraum" forderte 80 °C Dauertemperatur.** Der Fall
fragt, was sich ohne beheizte Kammer fertigen lässt — und schloss mit dieser Vorgabe
ausgerechnet PETG und PLA aus, die kanonischen Antworten. Im Kontext des Falls stand
keine Begründung für die 80 °C. Auf 60 °C korrigiert führt PETG den Fall mit 75 Punkten an.

Wer wirklich 80 °C braucht, hat eine Temperaturanforderung — keine Kammerfrage.

**Was bleibt.** PETG steht in den übrigen Fällen im Mittelfeld, und das ist kein Fehler:
Bei „Sichtteil lackiert" (Lackierbarkeit 5) ist PETG als Polyester tatsächlich schwach,
bei „Lehre und Messmittel" (Steifigkeit 5) tatsächlich mittelmäßig. Die Perzentil-
Bewertung belohnt Spezialisten — ein Allrounder liegt überall in der Mitte. Ob der
Berater zusätzlich sagen sollte „PETG täte es auch, deutlich günstiger", ist eine offene
Frage an die Kompromissansicht.

---

## ADR-025 — Die Dauereinsatztemperatur ist eine Aussage über das Bauteil, nicht über das Polymer

**Datum.** 2026-08-02 · **Status.** angenommen · **Anlass.** Rückfrage aus der Werkstatt

> „Ich verstehe immer noch nicht, warum wir bei PETG eine Dauereinsatzgrenze von 55 Grad
> festlegen. Muss da die Grenze rein, weil wenn es temperaturabhängig wird, würden wir ja
> die Wandstärke / Infill auch nach oben fahren um länger standzuhalten."

**Der Einwand ist physikalisch richtig.** Was einen Thermoplast unterhalb des
Glasübergangs begrenzt, ist Kriechen: bleibende Verformung unter *dauernder* Spannung.
Die Kriechgeschwindigkeit hängt an der Spannung im Querschnitt — und die senkt man mit
Wandstärke, Füllgrad und Querschnitt. Der Glasübergang verschiebt sich dadurch nicht, die
zulässige Einsatztemperatur sehr wohl. Eine Dauergebrauchsgrenze ohne Angabe zur Last ist
deshalb eine halbe Aussage.

**Der Widerspruch in den eigenen Daten.** Der Wert trug
`conditions: "unbelastet, Luft, dauerhaft"` und war zugleich Tg − 12 K. Die Fussnote
daneben sagte, für ein unbelastetes Bauteil liege die Wahrheit *zwischen* dieser Zahl und
dem Datenblattwert. Beides zusammen geht nicht auf: Entweder gilt die Zahl unbelastet,
oder sie liegt darunter. Sie liegt darunter. 33 Datensätze trugen diese falsche Bedingung.

**Entscheidung.** Ein neues Anforderungsfeld `thermalLoad`, gefragt direkt unter dem
Temperaturregler. Die Antwort entscheidet, welche Zahl das Urteil trägt:

| Angabe | massgebliche Zahl | Ergebnis bei PETG / 60 °C |
|---|---|---|
| unbelastet | gemessen (HDT-B 71 °C) | hält, **ohne Vorbehalt** |
| dauerhaft belastet | konservativ (55 °C) | Warnung mit dem konstruktiven Ausweg |
| nichts gesagt | wie bisher: Schätzung warnt, Datenblatt entscheidet | Warnung |

Die Bedingung in den Daten heisst jetzt `"dauerhaft unter mechanischer Last, Luft"`, und
die Fussnote nennt den Hebel: mehr Wand und mehr Füllung senken die Spannung und
verschieben die brauchbare Temperatur nach oben — den Glasübergang verschieben sie nicht.

**Zwei Regeln, die dabei entstanden sind.**

*Eine zusätzliche Angabe darf ein Ergebnis nie verschlechtern.* Die konservative Zahl
unterstellt Last und ist damit eine Untergrenze; wo sie ausnahmsweise über dem belegten
Wert liegt, hätte „unbelastet" strenger gewirkt als gar keine Angabe. PC ist genau dieser
Fall — konservativ 135 °C, belegt nur HDT-B 112 °C, weil sein Datenblatt HDT-A und HDT-B
vertauscht führt. Ein Test prüft die Regel jetzt über alle Werkstoffe und sieben
Temperaturen.

*Wo gar nichts gemessen ist, entscheidet die Schätzung doch.* Der Grundsatz aus ADR-018
(„eine Schätzung darf abstufen, nie ausschliessen") richtet sich gegen Schätzungen, die
einer **Messung** widersprechen. Bei OBC, PA6, PEBA, PP und PVDF gibt es keine Messung —
PP bei 130 °C mit einem Vorbehalt durchzulassen wäre der schlechtere Rat. Der Code hat
schon immer so gerechnet; im Kommentar stand das Gegenteil. Der Kommentar war falsch.

**Was der Test sofort gefunden hat.** Der neue Ausschlusszweig griff zur Meldung mit
`{hdtB}`, ohne zu prüfen, ob es diesen Wert gibt — 28 Begründungen in beiden Sprachen mit
unaufgelöstem Platzhalter. Derselbe Fehler wie seinerzeit „(HDT-B 0 °C)", nur als
Platzhalter statt als erfundene Null. Gefunden vom Test, den dieser Fehler damals
hervorgebracht hat.

---

## ADR-026 — Die Ergebnisseite nennt die Frage, nicht nur die Antwort

**Datum.** 2026-08-02 · **Status.** angenommen · **Anlass.** Werkstattbefund

> „Bei der Übersicht wo dann steht ‚X Materialien erfüllen die Anforderungen', da sollte
> aufgeführt sein, was die Anforderungen sind, damit man das dort nachvollziehbar bleibt."

**Befund.** Die Aufstellung der gesetzten Anforderungen gab es — aber nur im Assistenten.
Die Ergebnisseite nannte eine Zahl und keine Frage. Wer den Link geteilt bekam oder eine
Stunde später zurückkam, sah eine Rangliste ohne ihre Voraussetzungen. Nachvollziehbarkeit
ist der einzige Grund, warum dieses Werkzeug existiert.

**Entscheidung.** `activeRequirements()` und die benannten Schwerpunkte liegen jetzt
gemeinsam in `lib/requirements.ts`; Assistent und Ergebnisseite schöpfen daraus. Zwei
Fassungen wären zwei Wahrheiten, und beim nächsten neuen Anforderungsfeld wäre eine davon
stillschweigend unvollständig geworden.

Die Leiste nennt **beide Hälften der Entscheidung**: die harten Anforderungen sagen, *wer*
in der Liste steht, der Schwerpunkt der Gewichtung sagt, in welcher *Reihenfolge*. Ohne
den zweiten Teil erklärt die Liste nur die Hälfte von sich. Der Bericht führt die
Lastannahme jetzt ebenfalls mit — ein Dokument, das die Temperatur nennt und die Last
verschweigt, hält die halbe Vorgabe fest.

---

## ADR-027 — Ein haftender Tabellenkopf braucht einen Bereich, in dem gescrollt wird

**Datum.** 2026-08-02 · **Status.** angenommen · **Anlass.** Anzeigefehler im Vergleich

**Befund.** Im Vergleich lag die Beschriftung „Material" hinter der ersten Datenzeile, und
die Werte der Zeile „Dichte" waren gar nicht sichtbar.

**Ursache.** `sticky top-16` haftet nicht am Fenster, sondern am nächsten Vorfahren mit
Überlauf — und das war der Behälter mit `overflow-x-auto`. Der scrollt nur waagerecht,
senkrecht also nie; aus „bleib 64 px unter der Oberkante" wurde damit eine **feste
Verschiebung um 64 px nach unten**. Gemessen: Kopf bei y = 2243, erste Datenzeile bei
y = 2268 — 28 px Überdeckung. Die Werte der Zeile lagen unter der deckenden Kopffläche,
weil nicht positionierte Zellen immer unter positionierten liegen; die Beschriftung
„Material" verlor gegen die Zeilenbeschriftung, weil beide auf `z-10` standen und bei
Gleichstand das spätere Element gewinnt. (Nebenbei: `overflow-x: auto` macht auch die
senkrechte Achse zum Scrollbereich — deshalb griff die Haftung überhaupt dort.)

Der Kopf hat also **nie** gehaftet. Der Fehler war von Anfang an im Code.

**Entscheidung.** Der Behälter scrollt in beiden Richtungen und ist in der Höhe begrenzt.
Damit haftet der Kopf an genau dem Bereich, in dem gescrollt wird, und tut endlich, wofür
er gedacht war: Bei fünfzig Kennwertzeilen bleibt sichtbar, welche Spalte zu welchem
Werkstoff gehört.

Zwei Nebenbedingungen, beide aus dem Nachmessen:

- **Die Haftung sitzt an den Zellen, nicht an `<thead>`.** Safari beherrscht `sticky` auf
  Zeilengruppen bis heute nicht zuverlässig.
- **Die Höhe steht als feste Zahl da, nicht als `calc(100dvh - 9rem)`.** Der erste Versuch
  fällt in sich zusammen, sobald eine Umgebung die Fensterhöhe mit 0 meldet: `dvh` wird 0,
  der Kasten 2 px hoch, die Tabelle unsichtbar. Genau das ist beim Nachmessen passiert.

Auf Papier wird die Begrenzung aufgehoben — sonst schnitte sie die Tabelle nach etwa
zwanzig Zeilen ab, stillschweigend.

---

## ADR-028 — Die URL ist die Angriffsfläche, also wird dort begrenzt

**Datum.** 2026-08-02 · **Status.** angenommen · **Anlass.** Sicherheitsdurchsicht

Eine Durchsicht des gesamten Bestands (Quelltext, Skripte, Schemata, Workflows, Historie,
`npm audit`) fand **keine kritischen und keine hohen Befunde**. Ausgeschlossen wurden
unter anderem: XSS (kein `dangerouslySetInnerHTML`, kein `innerHTML`, kein `eval`, kein
`new Function` im ganzen Quelltext), CSV-Formelinjektion (in `lib/csv.ts` nach
OWASP-Muster entschärft), Cache-Poisoning über den Service Worker (bricht bei fremdem
Origin ab), Pfad-Traversal in den Build-Skripten (alle `id`-Felder sind per Schema auf
`^[a-z0-9-]+$` begrenzt), Secrets in der Historie (keine), und Prototype Pollution über
`w.__proto__` (der Setter ist bei einem primitiven Wert ein No-op). `npm audit --omit=dev`
meldet 0 Schwachstellen; die fünf gemeldeten CVEs liegen sämtlich in
Entwicklungswerkzeugen, die die ausgelieferte Seite nicht enthält.

**Was blieb, war eine Klasse: unbegrenzte Eingaben aus der URL.**

Das Werkzeug wirbt mit teilbaren Links — der komplette Zustand steckt in der Adresse.
Damit ist ein **bösartiger geteilter Link** der realistische Angriffsweg. Es gibt nichts
zu stehlen (kein Backend, keine Anmeldung, kein `localStorage`), aber es gibt einen
Browser-Tab, den man zum Stehen bringen kann.

Die Schaltflächen kappten längst — die Vergleichsauswahl bei fünf. Der Parser tat es
nicht. `?cmp=pla,pla,pla,…` mit zweitausend Wiederholungen erzeugte zweitausend Spalten
mal rund sechzig Kennwertzeilen. Nachgemessen nach der Korrektur: **6 Spalten, 1.126
Knoten.**

**Entscheidung.** Begrenzt wird im Parser, nicht in der Ansicht — dort ist die Grenze,
und eine Grenze gehört an den Rand, nicht in jede einzelne Oberfläche:

| Parameter | Regel |
|---|---|
| `cmp` | erst deduplizieren, dann auf 5 kappen (Reihenfolge zählt, sonst kappt man Duplikate) |
| `chem` | auf die Zahl der bekannten Medien kappen, aus den Daten abgeleitet |
| `w.*` | nur bekannte Kriterien; Wert auf 0…5 geklemmt |

Das Klemmen erledigt nebenbei einen alten Anzeigefehler: `Number("Infinity")` ist
gültiges JavaScript, im Scoring wurde daraus `Infinity/Infinity = NaN`, und auf der
Ergebniskarte, im Bericht und in der CSV stand danach „NaN %".

`stateFromParams` ist dafür exportiert worden. Zehn Tests in
`tests/lib/url-input.test.ts` prüfen die Grenze selbst — eine Grenze ohne Test ist eine
Grenze auf Zuruf.

---

## ADR-029 — Datenbeiträge dürfen keine URL mitbringen, die kein http(s) ist

**Datum.** 2026-08-02 · **Status.** angenommen · **Anlass.** Sicherheitsdurchsicht

Die Felder `sources[].url`, `datasheet.url` und `productUrl` waren im Schema nur
`"type": "string"`. Das Projekt nimmt Datenbeiträge ausdrücklich per Pull Request an
(CONTRIBUTING.md) — eine Quellenangabe wie `javascript:…` oder eine `data:text/html`-URL
hätte die Prüfung anstandslos passiert und wäre in der Detail- und Herstelleransicht als
anklickbarer Link erschienen. Wer Werkstoffwerte fachlich gegenliest, sieht ein Schema in
einer Quellenangabe nicht.

**Entscheidung.** `"format": "uri"` plus `"pattern": "^https?://"` an allen drei Stellen.
Gegengeprobt: Eine eingeschleuste `javascript:`-URL lässt `npm run validate:schema`
scheitern („must match pattern ^https?://"), alle 228 echten Dateien bleiben gültig.

Das ist dieselbe Haltung wie überall in diesem Projekt: Die CI ist die Stelle, an der
Datenqualität durchgesetzt wird, nicht der gute Wille des Prüfenden.

---

## ADR-030 — Die Inhaltssicherheitsrichtlinie gehört an den Build, nicht in die Quelle

**Datum.** 2026-08-02 · **Status.** angenommen · **Anlass.** Sicherheitsdurchsicht

GitHub Pages lässt keine eigenen Antwortkopfzeilen zu, eine echte CSP ist dort also nicht
setzbar. Ein Meta-Tag geht — und der erste Versuch stand direkt in `index.html`.

**Ergebnis: eine vollständig leere Seite unter `npm run dev`.** `#root` hatte null Kinder.
Vite spielt im Entwicklungsbetrieb ein Inline-Modul für React Refresh ein, und
`script-src 'self'` erlaubt kein Inline-Skript. Der Build liefert dagegen eine einzige
externe Moduldatei aus.

**Entscheidung.** Ein `transformIndexHtml`-Plugin mit `apply: "build"` in
`vite.config.ts`. Eine Sicherheitsmaßnahme, die den Entwicklungsserver lahmlegt, wird beim
ersten Verdruss wieder ausgebaut — sie sitzt jetzt da, wo sie hingehört: am ausgelieferten
Artefakt.

Nachgemessen an beiden Ständen: Entwicklungsserver ohne CSP, rendert (39 Elemente mit
Inline-Stil im Kennwerte-Diagramm). Gebauter Stand mit CSP, rendert identisch, keine
Konsolenmeldung.

Zwei Dinge, die dabei festzuhalten sind:

- **`style-src` braucht `'unsafe-inline'`.** React setzt Stilattribute direkt am Element
  (Balken der Eignungszahl, Punkte im Kennwerte-Diagramm). Ohne die Freigabe bleiben sie
  leer. Das ist der Preis dieser Bauweise, nicht Nachlässigkeit.
- **`frame-ancestors` fehlt bewusst.** Die Richtung wirkt laut Spezifikation nur als echte
  Kopfzeile und ist im Meta-Tag wirkungslos. Klickjacking-Schutz gibt es deshalb erst nach
  dem Umzug auf materialberater.reents3d.de mit vorgelagertem CDN. Dann gehört die ganze
  Richtlinie dorthin, zusammen mit `Strict-Transport-Security` und
  `X-Content-Type-Options`.

Die Richtlinie schützt heute gegen nichts Konkretes — sie ist Vorsorge gegen den Rückfall
und gegen eine kompromittierte Abhängigkeit. Genau deshalb steht sie hier begründet und
nicht bloß da.

---

## ADR-031 — Preise werden erhoben, nicht eingeschätzt

**Datum.** 2026-08-02 · **Status.** angenommen · **Anlass.** zehn blockierende offene Fragen

Zehn der zwölf blockierenden offenen Fragen in der Datenbank lauteten wortgleich
„Preiserhebung über mindestens fünf Anbieter durchführen". Von 38 Werkstoffen war genau
**einer** an einem echten Angebot belegt — PPS-CF, und den nur, weil ein Werkstattbefund
einen Ausreißer aufgedeckt hatte.

**Erhoben.** 94 Händlerangebote zu 27 Werkstoffen, aus dem europäischen Fachhandel,
inklusive Mehrwertsteuer, ohne Versand und ohne Rabattaktionen. Jedes Angebot mit Marke,
Produkt, **Spulengewicht**, Preis, Fundstelle und Abrufdatum in `data/prices.json`.

Die Spulengröße ist dabei die eigentliche Falle: Dieselbe Marke liefert Spezialfilamente
auf 0,5- und 0,75-kg-Spulen. Ein Preisschild von 49,99 € bedeutet dann 100 €/kg, nicht 50.
Ohne Normierung wäre die ganze Erhebung wertlos.

**Der Befund ist unangenehm: die Schätzungen lagen einseitig zu hoch.**

| Werkstoff | geschätzt | erhoben | Abweichung |
|---|---:|---:|---:|
| TPU 95A | 40 €/kg | 22,99 €/kg | **+74 %** |
| PC-FR | 95 €/kg | 56,99 €/kg | **+67 %** |
| ASA-CF | 57,50 €/kg | 39,98 €/kg | **+44 %** |
| PC/ABS | 57,50 €/kg | 39,99 €/kg | **+44 %** |
| PC | 57,50 €/kg | 41,49 €/kg | **+39 %** |

**14 von 16 prüfbaren Werten zu hoch**, nur zwei zu niedrig. Das ist keine Streuung,
das ist eine Schlagseite — und ihre Ursache ist dieselbe wie beim PPS-CF-Ausrutscher:
geschätzt wurde nach **Werkstoffklasse**, also nach dem Preispunkt, den ein technischer
Werkstoff „haben sollte", statt nach dem, was Filament dieser Klasse im Handel
tatsächlich kostet. Der Unterschied ist der zwischen Industrieware und Consumer-Filament,
und er beträgt bis zu Faktor zwei.

**Entscheidung.** Der geführte Wert ist der **Median** der Angebote, nicht der Mittelwert —
ein einzelner Industriepreis darf die Einordnung nicht kippen. `min` und `max` sind das
günstigste und teuerste tatsächlich gefundene Angebot, keine geschätzte Bandbreite.

Wie viel eine Zahl wert ist, hängt daran, wie viele Angebote sie tragen:

| Angebote | Konfidenz | Spanne |
|---|---|---|
| ab 5 | `medium` | aus den Angeboten |
| 2 bis 4 | `low` | aus den Angeboten |
| genau 1 | `low` | **keine** — aus einem Angebot lässt sich keine ableiten |
| keins | `estimated` | Schätzung, ausdrücklich als solche markiert |

Die erste Fassung verlangte drei Angebote und ließ sonst die Schätzung stehen. Das war
herum falsch: PPS-CF hat zwei Angebote, darunter den Listenpreis im Herstellershop, und
wäre auf die geschätzten 180 €/kg zurückgefallen, obwohl der Median der beiden echten
Preise bei 157 liegt. **Eine Schätzung, die nachweislich systematisch zu hoch liegt, darf
nicht über zwei nachprüfbare Preise gestellt werden.**

**Was die Erhebung NICHT ist.** Die Adresse an jedem Angebot ist die Übersichtsseite, auf
der es gesehen wurde, nicht die Produktseite. Produktseiten wurden nicht einzeln
aufgerufen; sie zu zitieren würde eine Genauigkeit vortäuschen, die die Erhebung nicht
hat. Das steht so in `data/prices.json` unter `limitation`.

**Nebenbefund zur Verfügbarkeit.** Zwei Marken aus dieser Datenbank — Fillamentum und
add:north — führt der größte deutsche Fachhändler gar nicht mehr. Das gehört mittelfristig
in die Verfügbarkeitsbewertung, nicht nur in die Preisspalte.

**Neue Quellenart.** `retailer-listing` ist im Schema ergänzt worden. Ein Händlerpreis ist
weder ein Herstellerdatenblatt noch eine Herstellerseite; ihn als eines von beiden zu
führen wäre eine Provenienzlüge.

**Was offen bleibt.** Elf Werkstoffe ohne ein einziges Angebot: ASA Aero, PLA Tough, HIPS,
PP, OBC, PA6, PAHT, PMMA, PVC, PVDF, PEBA. Bei ihnen steht weiter eine Schätzung — und
die Fußnote sagt jetzt ausdrücklich, dass sie im Zweifel eher zu hoch als zu niedrig ist.

---

## ADR-032 — Preise aus strukturierten Daten holen, nicht abschreiben

**Datum.** 2026-08-02 · **Status.** angenommen · **Anlass.** Rückfrage aus der Werkstatt

> „Können wir die Preise aus den Webshops nicht irgendwie scrapen um die zu erhalten?"

**Ja — und der erste Anlauf war schlicht falsch diagnostiziert.** Die 402/404 der
Herstellershops kamen nicht von Bot-Schutz, sondern daher, dass `WebFetch` eine schlichte
HTTP-Anfrage ohne Browser stellt — und bei Extrudr zusätzlich von einer geratenen Adresse.
Mit korrekter URL und ehrlichem User-Agent antwortet Extrudr mit HTTP 200.

**Erst die Erlaubnis, dann die Technik.** Aufgenommen wird nur, wer das Lesen in seiner
`robots.txt` gestattet:

| Shop | robots.txt | Konsequenz |
|---|---|---|
| Extrudr | `Allow: /`, gesperrt nur `/api/*` | Produktseiten ja, Schnittstelle nein |
| Fiberlogy | erlaubt, `Crawl-delay: 1` | ja, mit einem Aufruf pro Sekunde |
| Bambu Lab EU | Cloudflare beantwortet schon die robots.txt nur mit einer Weiterleitung | **nein** |

Wer so deutlich sagt, dass er keine Automaten will, bekommt keine. Der eine Bambu-Preis
bleibt von Hand im Browser abgelesen.

**Gelesen werden JSON-LD-Blöcke nach schema.org** — dieselben, aus denen Google seine
Produktkarten baut. Strukturierte Daten, die ausdrücklich für Maschinen veröffentlicht
werden. Daraus kommen Produktname **mit Spulengewicht** und Preis ohne Raterei heraus.
Der User-Agent nennt Projekt und Repository-Adresse: Ein Erhebungsskript, das sich als
Mensch tarnt, wäre in einem Werkzeug, dessen ganzer Zweck Nachvollziehbarkeit ist, ein
Widerspruch in sich.

**Der eigentliche Gewinn ist die Wiederholbarkeit, nicht die größere Zahl.** Eine
Preisliste altert, und niemand merkt es, weil nichts nachrechnet. `npm run survey:prices`
und das Abrufdatum stimmt wieder. 94 → 154 Angebote, 27 → 34 Werkstoffe.

**Verschärfung, die dabei sichtbar wurde.** Nach dem ersten Einlesen stand PC auf acht
Angeboten — alle aus demselben Shop. Das ist die Preisliste eines Anbieters, nicht der
Markt. `medium` verlangt seither fünf Angebote von **mindestens zwei** Anbietern. Das
Ergebnis ist dadurch ehrlicher statt schmeichelhafter: PC fiel von `medium` auf `low`
zurück, obwohl es mehr Angebote hat als vorher.

---

## ADR-033 — Drei Werkstofftypen, aufgelesen statt gesucht — und einer bewusst verworfen

**Datum.** 2026-08-02 · **Status.** angenommen · **Anlass.** Nebenprodukt der Preiserhebung

Beim Anbinden von Fiberlogy fiel auf, dass der Katalog Kategorien führt, die diese
Datenbank nicht kannte. Vier davon tragen ein vollständiges technisches Datenblatt mit
Prüfnorm und Zahlenwert. Drei sind aufgenommen:

| Typ | Was er beiträgt |
|---|---|
| **ABS-GF** | 3.500 MPa gegen 2.200 beim ungefüllten ABS, bei praktisch gleicher Verarbeitung |
| **PLA-CF** | 8.500 MPa E-Modul — nach PAHT-CF der zweitsteifste im Bestand |
| **PCTG-GF** | glasgefüllt und trotzdem 8 % Bruchdehnung — ungewöhnlich für einen gefüllten Werkstoff |

**Ein Datenblatt reicht nicht — der Werkstoff muss auch vorkommen.**
PEI 9085 lag fertig ausgewertet vor und wäre der thermisch fähigste Eintrag im ganzen
Bestand gewesen: HDT-A 152 °C, Vicat 173 °C, Brandprüfung nach FAR 25.853. Aufgenommen
wurde er trotzdem nicht. Der Einwand kam aus der Werkstatt und lautete schlicht: kein
gängiges Material. Er ist richtig, und die Begründung steht im Blatt selbst — 350 bis
380 °C Düse und 160 °C Bett kann praktisch keine Maschine, die bei einem Leser dieses
Werkzeugs steht.

Damit ist die Aufnahmeregel geschärft. Bisher hieß sie „ein Werkstofftyp entsteht, weil
ein Blatt ihn trägt". Sie heißt jetzt: **ein Blatt ist die notwendige, nicht die
hinreichende Bedingung.** Ein Berater, der Werkstoffe empfiehlt, die niemand verarbeiten
kann, hilft nicht — er beeindruckt nur, und das ist in einem Auswahlwerkzeug die
schlechtere Eigenschaft. Die Auswertung des Blattes bleibt lokal erhalten, falls sich die
Maschinenlage ändert; das Dokument selbst wird nicht mitgeliefert (ADR-034).

**Zwei Datenblattbefunde, dokumentiert statt geglättet:**

1. **PLA-CF: Charpy ungekerbt 100 kJ/m² gegen gekerbt 3,1.** Faktor 32. Ungefülltes PLA
   liegt ungekerbt bei 15 bis 25; ein carbongefülltes ist spröder, nicht viermal zäher.
   Der gekerbte Wert passt, der ungekerbte nicht.
2. **PLA-CF: HDT und Vicat gelten laut Fußnote nur nach Temperung.** Steht als
   `annealing.requiredForDatasheetValues: true` im Datensatz — wer keinen Umluftofen hat,
   bekommt nicht 137 °C, sondern das thermische Verhalten von normalem PLA.

**Kein Blatt nennt eine Bauorientierung.** Die Zugwerte stehen deshalb ohne
Richtungsangabe, nicht als X-Y — das wäre eine Annahme, die die Quelle nicht deckt.

**Was ein Szenariotest dabei gelernt hat.** „Reicht auch etwas Einfacheres?" prüfte auf
*Sieger pps-cf, pragmatisch petg, Preisverhältnis unter 0,3*. Alle drei Zahlen stammten
aus der Zeit geschätzter Preise. Mit der Erhebung und drei neuen Typen wanderte der Sieger
zu PAHT-CF, der Ausweg zu PLA-Tough — der Test ging rot, **obwohl die Engine besser
geworden war**. Ein Test, der bei besseren Daten bricht, prüft die Daten und nicht das
Verhalten. Er prüft jetzt die Regel: Es gibt einen Ausweg, er ist deutlich günstiger, er
liegt deutlich unter dem Sieger, und er ist nicht selbst der Sieger.

---

## ADR-034 — Die Fundstelle ist der Beleg, nicht die Kopie

**Status:** akzeptiert · **Datum:** 2026-08-04

### Kontext

Unter `data/_sources/` lagen 99 Dateien: die per `pdftotext -layout` gewonnenen
Volltexte der ausgewerteten Herstellerdatenblätter von Bambu Lab, Fillamentum, add:north,
Spectrum, SUNLU und Ultrafuse — dazu vier Fiberlogy-Datenblätter als Original-PDF. Der
Gedanke dahinter war richtig: Wer eine Zahl anzweifelt, soll das Blatt danebenlegen
können, ohne auf eine Adresse angewiesen zu sein, die morgen ins Leere zeigt.

Die Umsetzung war es nicht, aus drei Gründen.

**Erstens widersprach sie der eigenen Regel.** `SOURCES.md` 1.2 schließt „Vollständige
Datenblätter als Kopie oder Spiegel im Repository" ausdrücklich aus. Genau das lag dort.

**Zweitens sind es nicht nur Fakten.** Messwerte in Tabellen sind nicht schutzfähig — das
trägt die ganze Datenbank. Die Volltexte enthielten aber auch die Fließtexte der
Hersteller, bei Bambu etwa den vollständigen Absatz „Basic Info" samt Werbeaussagen. Das
ist Sprachwerk. Die vier PDFs waren vollständige Kopien einschließlich Satz und Grafik.

**Drittens, und das wiegt am schwersten:** `LICENSE-DATA` stellt alles unter `data/` unter
CC BY 4.0. Damit reichten wir Dokumente von BASF, Bambu Lab und Fiberlogy unter einer
Lizenz an Dritte weiter, die uns nicht zusteht — und luden sie ausdrücklich zum
Weiterkopieren ein. Aus einem Hostingproblem wird so eine Rechtsanmaßung.

Die Schranke für Text und Data Mining (§ 44b UrhG) deckt das Anfertigen solcher Kopien
zur Auswertung. Sie deckt nicht das öffentliche Zugänglichmachen nach § 19a.

### Entscheidung

`data/_sources/` wird lokaler Arbeitsplatz statt Repository-Inhalt. Der Inhalt ist
ignoriert, eingecheckt ist nur eine README, die erklärt, was hineingehört und woher man
es bekommt. Die Historie wird bereinigt, damit die PDFs nicht in alten Commits
weiterleben.

Der Beleg ist ab jetzt die Fundstelle: `datasheet.url` und `datasheet.retrievedAt` an
jedem Datensatz, `source` an jedem Kennwert. Sämtliche Datensatz-Notizen, die auf eine
Kopie im Repository verwiesen, sind umgeschrieben — ebenso die Importer, die diese
Notizen erzeugen, sonst kehrt der Satz beim nächsten Lauf zurück.

Für die SUNLU-Blätter, die keine öffentliche Adresse haben, tritt an die Stelle der
Fundstelle der Hinweis, dass das Dokument nicht weiterverbreitet wird und auf Anfrage
einsehbar ist.

### Konsequenzen

**Positiv**

- Die Aussagen in `LICENSE-DATA` und `SOURCES.md` stimmen wieder. Für ein Projekt, dessen
  Wert an Nachprüfbarkeit hängt, ist der dokumentierte Selbstwiderspruch der teurere
  Schaden gewesen — teurer als das Rechtsrisiko, das realistisch bei einer Aufforderung
  zur Entfernung gelegen hätte.
- Die CC-BY-Lizenz deckt nur noch, was uns gehört.
- Das Repository wird um rund 1,4 MB leichter.

**Negativ**

- `npm run import:bambu-catalogue` und `npm run import:sunlu` laufen in einem frischen
  Klon nicht mehr durch, weil ihnen die Eingabedateien fehlen. Beide brechen jetzt mit
  einem Hinweis ab statt mit einem Stacktrace. `npm run ci` ist nicht betroffen — die
  Importer sind Werkzeuge der Datenpflege, nicht Teil des Builds.
- Die Nachprüfung braucht einen Netzzugriff und trifft auf ein Dokument, das der
  Hersteller inzwischen ersetzt haben kann. Dagegen hilft `retrievedAt`, nicht ein
  Spiegel, der dieselbe Alterung nur unsichtbar macht.

### Was daraus als Regel bleibt

Für jede fremde Quelle gilt künftig: **auswerten, verlinken, datieren — nicht spiegeln.**
Was wir veröffentlichen, muss uns gehören oder gemeinfrei sein.

---

## ADR-035 — Die Marktdatenbank sagt, was es gibt, nicht wie es sich verhält

**Status:** akzeptiert · **Datum:** 2026-08-04

### Kontext

Die [Open Filament Database](https://github.com/OpenFilamentCollective/open-filament-database)
des Open Filament Collective ist das größte offene Vorhaben in diesem Feld: Stand
`2026.07.31` 155 Marken, 2.020 Filamente, 14.389 Farbvarianten, 22.397 Spulengrößen,
5.918 Händlerlinks. MIT-lizenziert für Code **und** Daten, täglich neu gebaut, als
statische API abrufbar. Die naheliegende Erwartung: eine Abkürzung für unseren
Datenausbau.

Die Prüfung des Schemas hat diese Erwartung widerlegt. `filament_schema.json` führt
Dichte, Shore-Härte, Düsen-, Bett-, Kammer- und Trocknungstemperatur, Mindest­düsen­durch­
messer, Zertifikate, Slicer-Profile — und einen Zeiger auf das Herstellerblatt. Es führt
**keine Zugfestigkeit, keinen E-Modul, keine HDT, keinen Glasübergang, keine
Schlagzähigkeit, keine Bruchdehnung, keine Orientierung und keine Prüfnorm.** Also genau
die Felder, aus denen dieses Werkzeug seine Empfehlung rechnet.

Datenblatt-Links tragen 164 von 2.020 Filamenten — 8 %, nicht die erhoffte Breite. 16
davon waren bereits ausgewertet.

### Entscheidung

Die Open Filament Database wird eingebunden, aber **ausschließlich als Marktbeobachtung**,
nie als Kennwertquelle. Drei Importer, drei klar getrennte Rollen:

| Importer | Rolle |
|---|---|
| `ofd-spools.mjs` | Spulenlogistik je Werkstofftyp — beantwortet Rückfrage 3 aus PLAN.md |
| `ofd-processing.mjs` | Marktkorridor für Dichte und Verarbeitungstemperaturen als `min`/`max` |
| `ofd-datasheets.mjs` | Arbeitsliste offener Datenblatt-Fundstellen; schreibt keinen Datensatz |

Vier Festlegungen dazu:

**1 · Quellentyp `community`, Ceiling `low`.** Die Sammlung ist gemeinschaftlich
gepflegt, führt keine Provenienz je Eintrag und kein Abrufdatum. Nach der
Quellenhierarchie in `SOURCES.md` ist das Rang 8. Regel R9 erzwingt die Grenze
maschinell.

**2 · Der vorhandene Wert wird nicht angetastet.** 29 von 41 Düsen- und Betttemperaturen
sind herstellerbelegt. Sie durch eine Gemeinschaftssammlung zu ersetzen wäre eine
Verschlechterung. Ergänzt wird nur die Spanne, und `src_ofd` tritt als **zusätzliche**
Quelle daneben. R9 nimmt das höchste Ceiling über alle Quellen — die Konfidenz des
Wertes bleibt damit erhalten, der Beleg für die Spanne steht trotzdem dabei. Das ist
genau die Trennung aus DATA_MODEL 1.1: `tolerance` gehört einer Quelle, `min`/`max`
gehören dem Markt.

**3 · Mindeststichproben, sonst kein Feld.** Fünf Produkte und zehn Spulen für die
Spulenlogistik, acht Produkte für einen Temperaturkorridor. Zwei Zählungen, weil zwei
Produkte mit je zwölf Farbvarianten sonst wie ein Markt aussehen. 20 von 41
Werkstofftypen bleiben deshalb ohne Spulenangabe — ein fehlendes Feld senkt die
`dataCompleteness`, ein erfundenes die Glaubwürdigkeit.

**4 · Abweichungen werden gemeldet, nicht geglättet.** Liegt unser Wert außerhalb des
Marktkorridors, wird die Spanne **nicht** geschrieben. Drei Fälle beim ersten Lauf:
`asa` 1,05 g/cm³ gegen Markt 1,07–1,13 · `asa-cf` 1,02 gegen 1,05–1,11 · `pla-tough`
1,20 gegen 1,23–1,25. Jeder ist ein Prüfauftrag.

Der Bestand selbst wird **nicht** mitgeliefert, obwohl die MIT-Lizenz es erlaubte. Er
wird täglich neu gebaut und wäre als Kopie binnen Tagen ein falscher Stand — dieselbe
Überlegung wie in ADR-034, nur aus dem anderen Grund. Ablage unter `data/_sources/ofd/`,
Abruf über `npm run fetch:ofd`, Provenienz über `documentVersion` und `retrievedAt`.

### Konsequenzen

**Positiv.** Die Spulenfrage aus PLAN.md ist für 21 Werkstofftypen mit Zahlen beantwortet
statt mit einer Vermutung. 16 Kennwerte haben erstmals eine belegte Marktspanne, drei
Felder sind von `estimated` auf `low` gestiegen. Die Datenblattsuche ist für 148
Fundstellen erledigt. Und der Bestand liefert nebenbei die Rangliste, wo Handarbeit am
meisten bringt: Polymaker (71 Produkte), 3DXTech (61), Fiberlogy (59) stehen dort **ohne
einen einzigen** Blattlink.

**Negativ.** Eine Zuordnung von 38 fremden Werkstoffbezeichnungen auf 41 eigene Typen ist
Auslegung und bleibt fehleranfällig. Der erste Lauf hat das sofort bewiesen: Das Muster
`\bcf\b` fand „CF10", „CF15" und „PA6-CF20" nicht, weil zwischen Kürzel und Ziffer keine
Wortgrenze liegt. 35 gefaserte Produkte zählten dadurch als unverstärkte Basistypen —
`asa-cf` stand mit 1 kg statt 8 kg Maximalspule da, `pa12` umgekehrt mit 5 kg statt 1 kg.
Der Fehler ist behoben, die Lehre bleibt: **Jede Zuordnungstabelle gegen die
Rohbezeichnungen gegenlesen, nicht gegen die eigene Erwartung.**

**Offen.** Preise liefert der Bestand nicht — `purchase_link` führt Händler und URL, aber
keinen Betrag. Die 5.918 Links sind eine Zielliste für `survey-prices.mjs`, mehr nicht.

---

## ADR-036 — Der Erstaufruf ist das Budget, nicht die Summe

**Status:** akzeptiert · **Datum:** 2026-08-04

### Kontext

Das Bundle-Budget lag bei 400 kB gzip über die **Summe aller** Dateien in `dist/assets`.
Das war richtig, solange alles in einem Brocken lag: Summe und Erstaufruf waren dasselbe.

An einem Tag ist diese Grenze zweimal gerissen. Zuerst beim OFD-Import — dort waren nicht
die Zahlen das Problem, sondern die Notiztexte: ein zweisprachiger Absatz, der in 24
Datensätzen wiederholt wird, wiegt mehr als die Werte, die er erklärt. Nach dem Kürzen
lagen wir bei 390 kB. Dann kamen 24 FormFutura-Produkte mit ihren Befunden dazu, und es
waren 412 kB.

Beide Male fiel es erst nach dem Push auf, denn die Prüfung stand **nur** in der
GitHub-Action und nicht in `npm run ci`. Eine Grenze, die man lokal nicht sieht, ist keine
Grenze, sondern eine Überraschung.

### Entscheidung

**Erstens: Herstelleransicht und Matrix werden nachgeladen.** Sie sind die einzigen
Ansichten, die `data/products` lesen — inzwischen gut 2.000 Kennwertzeilen aus 192
Produkten, 114 kB gzip. Der Weg durch das Werkzeug (Start → Assistent → Ergebnis →
Datenblatt) kommt ohne sie aus. Zwei `React.lazy`-Aufrufe genügen; Rollup zieht
`data/products` dann von selbst in einen eigenen Brocken, weil sonst niemand darauf zeigt.

Erstaufruf vorher 412 kB, nachher **292 kB**.

**Zweitens: zwei Budgets statt einem.**

| Budget | Grenze | Was es schützt |
|---|---|---|
| Erstaufruf | 320 kB gzip | Ladezeit und Lighthouse — was ein Besucher laden muss, bevor er etwas sieht |
| Gesamt | 500 kB gzip | verhindert, dass nachgeladene Brocken zur Abstellkammer werden |

Der Erstaufruf wird aus `dist/index.html` gelesen, nicht geraten: genau die Dateien, die
dort als `<script>` und `<stylesheet>` stehen. Wird eine Ansicht wieder statisch
importiert, wächst die Zahl automatisch mit — die Prüfung lässt sich nicht dadurch
umgehen, dass man vergisst, sie anzupassen.

**Drittens: die Prüfung zieht in `npm run ci`.** Sie liegt als `scripts/check-bundle.mjs`
im Repository, die Action ruft nur noch `npm run check:bundle` auf. Damit sehen lokaler
Lauf und CI dieselbe Zahl.

### Konsequenzen

**Positiv.** Der Erstaufruf ist um 29 % kleiner als vor der Aufteilung und liegt jetzt
unter dem Stand von vor beiden Importen. Wer nur beraten werden will, lädt die
Herstellerdaten nie. Die Grenze ist vor dem Commit sichtbar.

**Negativ.** Beim ersten Öffnen der Herstelleransicht entsteht eine kurze Wartezeit mit
Platzhalter. Für eine Ansicht, die man gezielt ansteuert, ist das der richtige Tausch —
für die Startseite wäre es der falsche.

**Nächster Schritt, wenn es wieder reißt:** nicht die Grenze anheben, sondern die nächste
Ansicht aufteilen. Glossar und Anwendungsfälle hängen ebenfalls im Erstaufruf, obwohl der
Weg durch das Werkzeug ohne sie auskommt. Der Hinweis steht im Kopf von
`scripts/check-bundle.mjs`, wo ihn findet, wer die Fehlermeldung liest.

---

## ADR-037 — Belastbarkeit ist eine eigene Frage, und `confidence` beantwortet sie nicht

**Status:** akzeptiert · **Datum:** 2026-08-05

### Kontext

`confidence` beantwortet eine Frage: Wie gut ist die **Quelle**? Sie beantwortet nicht,
ob überhaupt eine Prüfnorm dabeisteht. Ein Wert mit `medium` und ohne Norm sah in der
Oberfläche aus wie einer mit Norm — obwohl niemand weiß, wonach gemessen wurde.

Die Messung des Bestands machte den Umfang sichtbar:

| | |
|---|---|
| Messwerte auf der Produktebene | 1.775 |
| davon mit Prüfnorm **und** Konfidenz ≥ `medium` | 1.387 (78 %) |
| davon ohne deklarierten Prüfkörper | 1.221 (69 %) |
| Fünferskalen auf der Werkstoffebene | 41 von 41 `estimated` bei `uvResistance` und `printability` |

Der letzte Punkt ist der wichtigste: **Die Fünferskalen sind konstruktionsbedingt keine
Messungen.** Für „Druckbarkeit 4 von 5" gibt es keine Norm und kann es keine geben. Sie
aus den Daten zu entfernen hieße, die Bewertungsdimension der Engine zu entfernen — dann
rankt das Werkzeug nichts mehr.

### Entscheidung

Eine zweite, abgeleitete Einstufung neben `confidence`, berechnet in
[`src/lib/evidence.ts`](src/lib/evidence.ts):

| Stufe | Bedingung | Folge |
|---|---|---|
| `verified` | Prüfnorm **und** Konfidenz ≥ `medium` | geht in die Empfehlung ein |
| `weak` | Konfidenz `low` **oder** keine Prüfnorm | wird angezeigt und sichtbar abgewertet |
| `editorial` | Konfidenz `estimated` | fachliche Ableitung, keine Messung — bleibt |

**Der Prüfkörper geht bewusst NICHT ein.** Ihn zur Ausschlussbedingung zu machen, würde
zwei Drittel aller Messwerte und sechs von fünfzehn Marken entfernen — 3DJAKE, add:north,
Extrudr, Fiberlogy, FormFutura und Nebula deklarieren ihn auf keinem einzigen Blatt.
Ein undeklarierter Prüfkörper macht den Wert aber nicht falsch, sondern nur nicht quer
vergleichbar, und genau diese Trennung leistet die Herstelleransicht bereits über
`specimenType`.

**Nichts wird gelöscht.** Ein `weak`-Wert bleibt im Datensatz, wird angezeigt und trägt
sein Zeichen. Löschen würde die Befunde vernichten, die ihn überhaupt erst als schwach
erkennbar machen — und die Datenbank ist auch ein Verzeichnis dessen, was die Hersteller
veröffentlichen.

**Der Anteil rechnet über die Messwerte, nicht über alles.** `verified / (verified +
weak)`; die Schätzungen stehen daneben. Rechnete man sie mit, käme jeder Werkstoff auf
10 bis 20 %, und die Zahl unterschiede nichts mehr.

### Konsequenzen

**Positiv.** Die Datengrundlage steht als Satz auf jedem Datenblatt: „gemischt — 17 von
49 Messwerten mit Prüfnorm und belegter Quelle (35 %)". Werte ohne Norm tragen ein
eigenes Zeichen. Und `tests/data/evidence-floor.test.ts` hält den Anteil fest: Wer
Blätter ohne Normen importiert, sieht es vor dem Merge — dreißig Zahlen sehen nach
Fortschritt aus und sind keiner, wenn der Anteil dabei fällt.

**Negativ.** Die Einstufung ist grob. Eine genannte Norm heißt nicht, dass sie eingehalten
wurde; `ISO 527` ohne Methode und Prüfgeschwindigkeit ist wenig wert, zählt hier aber als
Norm. Feiner wäre besser und ist ohne Handarbeit an 1.775 Werten nicht zu haben.

**Ein Fehler, der erst am fertigen Datenblatt auffiel.** Die erste Fassung rechnete den
Anteil über alle Werte einschließlich der Schätzungen. Im Browser stand dann „7 von 14
Messwerten (12 %)" — zwei Nenner in einem Satz, und jeder Werkstoff hieß „dünn". Der Test
dazu hatte die falsche Formel mit abgesegnet, weil er sie aus der Implementierung
übernommen hatte statt aus der Absicht. Beides ist korrigiert; der Fall steht als
Kommentar im Test.

---

## Vorgemerkte ADRs

| Nr. | Thema | Fällig in |
|---|---|---|
| ADR-008 | URL-State-Format und Abwärtskompatibilität geteilter Links | bei erster Schema-Änderung am State |
| ADR-009 | Schwellenwerte der Verfahrensweiche (aktuell in `processSwitch.ts` als Konstanten dokumentiert) | wenn sie strittig werden |
| ADR-010 | Versionierung der Datenbank und Umgang mit Breaking Changes im Schema | Phase 4 |
| ADR-011 | Default-Gewichtungen je Persona (Messebau, Konstruktion, Einkauf) | mit dem Use-Case-Katalog |
| ADR-023 | Kaeltezaehigkeit als eigenes Kriterium: `toughness` liest die Bruchdehnung, und TPU gewinnt den Anwendungsfall Kaelte deshalb, weil es sich dehnt — nicht weil es Kaelte aushaelt. Massgeblich waere die Kerbschlagzaehigkeit bei −30 °C, die seit dem Fillamentum-Import fuer mehrere Werkstoffe vorliegt. | bei der fachlichen Freigabe der Anwendungsfaelle |
