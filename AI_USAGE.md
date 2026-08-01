# Einsatz von KI in diesem Projekt

Dieses Projekt wird mit Unterstützung von KI erstellt und gepflegt. Wir führen das hier
offen auf, weil eine Datenbank nur so viel wert ist wie das Vertrauen in ihre Entstehung.

**Kurzfassung:** KI liest und strukturiert Herstellerdatenblätter und schreibt den Code.
Die Zahlen selbst stammen aus den Datenblättern, nicht aus dem Modell. Die veröffentlichte
Anwendung enthält **keine** KI.

---

## Die wichtigste Unterscheidung

| | |
|---|---|
| **KI in der Entstehung** | ja — Datenerschließung, Strukturierung, Code, Prüflogik |
| **KI im laufenden Werkzeug** | **nein** — kein Modell, kein API-Aufruf, keine Generierung zur Laufzeit |

Wer das Werkzeug im Browser öffnet, bekommt eine rein deterministische Anwendung: dieselbe
Eingabe ergibt immer dieselbe Empfehlung, nachvollziehbar aus den Daten im Repository. Es
läuft kein Sprachmodell mit, es geht keine Anfrage an einen Server, und es wird zur Laufzeit
kein Text erzeugt. Auch die Begründungen sind keine generierten Sätze, sondern strukturierte
Objekte aus der Datenbank.

Das ist eine bewusste Architekturentscheidung und kein Zufall — siehe
[ADR-003](DECISIONS.md).

---

## Was die KI tatsächlich tut

**Datenerschließung.** Herstellerdatenblätter liegen als PDF vor, oft mit mehrspaltigen
Tabellen und Fußnoten. Die KI extrahiert daraus die Kennwerte und überführt sie in das
Schema — inklusive Prüfnorm, Einheit, Prüfbedingung und Quelle.

**Querlesen.** Bei über tausend belegten Einzelwerten fallen einem Menschen Widersprüche
zwischen Datenblättern kaum auf. Die KI vergleicht sie systematisch: gleiche Werkstoffklasse,
unterschiedliche Hersteller, unplausible Ausreißer, in sich widersprüchliche Angaben.

**Code.** Engine, Oberfläche, Validatoren und Tests.

**Prüfregeln.** Die Plausibilitätsregeln, an denen die Daten in der CI scheitern können,
sind ebenfalls so entstanden.

## Was die KI ausdrücklich nicht tut

**Zahlen erfinden.** Jeder Kennwert trägt seine Quelle. Wo kein Datenblatt existiert und
ein Wert fachlich abgeleitet wurde, steht `confidence: "estimated"` und
`source: "estimate_reasoning"` — und die Oberfläche markiert ihn sichtbar als Schätzung.
Erfundene Präzision ist der schwerste Fehler, den dieses Projekt machen kann.

**Datenblattfehler stillschweigend glattziehen.** Wenn ein Hersteller etwas Widersprüchliches
veröffentlicht, wird das dokumentiert und nicht korrigiert. Beispiele aus dem laufenden
Bestand:

- ein PC-Datenblatt mit HDT-A über HDT-B, was physikalisch nicht sein kann
- ein CF-Datenblatt, dessen Kennwerte Zeile für Zeile mit der unverstärkten Variante
  übereinstimmen, einschließlich der Dichte
- ein Elastomer-Datenblatt mit 6,9 % Bruchdehnung und gleichzeitig einer Spannungsangabe
  bei 300 % Dehnung

Solche Funde landen als Befund in den Daten, nicht als stille Reparatur. Wir wissen nicht,
welche der beiden widersprüchlichen Angaben die richtige ist — und tun deshalb nicht so.

**Fachlich freigeben.** `reviewedBy` weist aus, was noch nicht durch einen Menschen
gegengelesen ist.

---

## Warum das trotzdem verlässlich sein kann

Der Einwand liegt nahe: KI-Systeme halluzinieren. Deshalb ist das Projekt so gebaut, dass
eine erfundene Zahl auffällt, statt durchzurutschen.

1. **Quellenzwang im Schema.** Ein Kennwert ohne `source` und `confidence` ist schema-ungültig.
   Die CI bricht ab.
2. **Plausibilitätsregeln.** Sechzehn Regeln prüfen die Daten auf physikalische und interne
   Widersprüche — Konfidenz über dem Quellen-Ceiling, Trocknung über der Glasübergangs-
   temperatur bei amorphen Polymeren, Anisotropiefaktoren, die nicht zu den Einzelwerten passen.
3. **Konfidenz-Ceiling je Quelle.** Ein Wert kann nie vertrauenswürdiger sein als das Dokument,
   aus dem er stammt.
4. **Datenblatt verlinkt.** Jedes Produkt führt die PDF-Quelle mit Abrufdatum. Jede Zahl ist
   am Original nachprüfbar — das ist der eigentliche Schutz.
5. **Alles offen.** Daten, Schema, Prüfregeln und Verlauf liegen im Repository. Ein Fehler
   ist auffindbar, statt in einer Blackbox zu verschwinden.

Diese Prüfungen haben mehrfach eigene Fehler gefunden, unter anderem eine Konfidenz-Angabe
über dem zulässigen Ceiling und eine fest verdrahtete Aussage in der Oberfläche, die durch
neue Daten falsch geworden war.

---

## Verantwortung

Die fachliche Verantwortung für dieses Werkzeug liegt bei der Reents Technologies GmbH,
nicht beim eingesetzten Modell. Richtung, Korrekturen und Freigabe kommen von Menschen;
mehrere Kernentscheidungen des Projekts gehen auf ausdrückliche inhaltliche Korrekturen
zurück.

Fehler bitte als [Issue](https://github.com/Reents3D/fdm-material-advisor/issues) melden —
besonders, wenn eine Zahl nicht zum verlinkten Datenblatt passt. Genau dafür ist die
Quellenangabe da.

---

## Rechtlicher Rahmen

Die EU-KI-Verordnung knüpft Transparenzpflichten nach Artikel 50 an KI-**Systeme**, die
Inhalte für Nutzer erzeugen. Das veröffentlichte Werkzeug erzeugt zur Laufzeit nichts und
ist kein KI-System in diesem Sinne. Diese Seite ist deshalb keine Pflichtkennzeichnung,
sondern eine freiwillige Offenlegung der Arbeitsweise.

---

*Eingesetzt wird Claude (Anthropic) über Claude Code. Diese Angabe ist eine
Werkzeugnennung, keine Empfehlung und keine Partnerschaft.*
