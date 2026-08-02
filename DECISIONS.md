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

## Vorgemerkte ADRs

| Nr. | Thema | Fällig in |
|---|---|---|
| ADR-008 | URL-State-Format und Abwärtskompatibilität geteilter Links | bei erster Schema-Änderung am State |
| ADR-009 | Schwellenwerte der Verfahrensweiche (aktuell in `processSwitch.ts` als Konstanten dokumentiert) | wenn sie strittig werden |
| ADR-010 | Versionierung der Datenbank und Umgang mit Breaking Changes im Schema | Phase 4 |
| ADR-011 | Default-Gewichtungen je Persona (Messebau, Konstruktion, Einkauf) | mit dem Use-Case-Katalog |
