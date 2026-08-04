# Quelldokumente — lokaler Arbeitsplatz, nicht Repository-Inhalt

Hier liegen die Herstellerdatenblätter, aus denen die Kennwerte stammen. **Der Inhalt
dieses Verzeichnisses wird nicht versioniert und nicht veröffentlicht** — nur diese
README ist eingecheckt.

## Warum nicht im Repository

Ein Datenblatt ist ein fremdes Werk. Die *Messwerte* darin sind nicht schutzfähige
Fakten und dürfen mit Quellenangabe geführt werden — genau das tut dieses Projekt. Das
*Dokument* dagegen, mit seinen Beschreibungstexten, Grafiken und seinem Satz, gehört dem
Hersteller. Es zu spiegeln wäre eine Verbreitung, für die uns niemand ein Recht
eingeräumt hat.

Dazu kommt ein Lizenzproblem: `data/` steht unter CC BY 4.0. Läge hier ein fremdes PDF,
würden wir es Dritten unter einer Lizenz weiterreichen, die uns nicht zusteht — und sie
zum Weiterkopieren einladen. Siehe `LICENSE-DATA` und `DECISIONS.md`, ADR-034.

Die Nachprüfbarkeit leidet dadurch nicht. Sie hing nie an der Kopie, sondern an der
Fundstelle: jeder Produktdatensatz führt `datasheet.url` und `datasheet.retrievedAt`.
Wer eine Zahl prüfen will, öffnet das Original beim Hersteller — das ist ohnehin die
belastbarere Prüfung, weil Datenblätter ohne Ankündigung ersetzt werden.

## Wer dieses Verzeichnis braucht

Zwei Importer lesen Dateien von hier:

| Importer | erwartet | Inhalt |
|---|---|---|
| `npm run import:bambu-catalogue` | `bambu-tds/*.txt` | Textauszüge der Bambu-Datenblätter |
| `npm run import:sunlu` | `sunlu-tds/*.txt` | Textauszüge der SUNLU-Datenblätter |

Alle übrigen Importer tragen ihre Werte im Skript und laufen ohne dieses Verzeichnis.

Fehlt es, brechen die beiden Importer mit einem Hinweis ab. Das ist kein Defekt: Ein
frischer Klon soll bauen, testen und ausliefern können — die Importer sind Werkzeuge zur
Datenpflege, nicht Teil des Builds. `npm run ci` fasst sie nicht an.

## Befüllen

Die Adressen aller ausgewerteten Dokumente stehen in den Produktdatensätzen unter
`datasheet.url`, sortiert nachschlagbar in `SOURCES.md`. Auszüge werden mit

    pdftotext -layout <datenblatt>.pdf <ziel>.txt

erzeugt — `-layout` ist wichtig, sonst zerfallen die Kennwerttabellen.

Erwartete Ablage:

    data/_sources/
      bambu-tds/Bambu_<Produkt>_Technical_Data_Sheet.txt
      sunlu-tds/<Produkt>.txt

Die SUNLU-Blätter haben keine öffentliche Adresse; sie wurden uns vom Hersteller als PDF
bereitgestellt. Sie werden nicht weitergegeben, sind aber auf Anfrage einsehbar — die
daraus gewonnenen Kennwerte stehen vollständig und mit Quellenangabe in den
Produktdatensätzen.
