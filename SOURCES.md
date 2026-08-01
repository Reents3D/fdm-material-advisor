# SOURCES.md — Quellenverzeichnis und Zitierregeln

**Stand:** 2026-08-01 · **Ausgewertete Quellen:** 3 Primärquellen (1 Material)

---

## 1. Zitierregeln — verbindlich

### 1.1 Was übernommen wird

✅ **Messwerte** (Zahlen, Einheiten, Prüfnormen, Prüfbedingungen).
Physikalische Messwerte sind nicht schutzfähige Fakten. Sie werden mit präziser
Quellenangabe geführt.

### 1.2 Was nicht übernommen wird

❌ Beschreibungstexte, Marketingtexte, Anwendungsbeispiele der Hersteller
❌ Grafiken, Diagramme, Fotos, Icons
❌ Tabellenlayouts und Gliederungen von Datenblättern
❌ Vollständige Datenblätter als Kopie oder Spiegel im Repository

Alle Beschreibungstexte (`abstract`, `positioning`, `note`, `commonDefects`) werden
**selbst formuliert**. Wo eine Herstelleraussage zitiert werden muss, um einen Konflikt
zu belegen, geschieht das als kurzes Zitat in Anführungszeichen mit Quellenangabe.

### 1.3 Pflichtangaben je Quelle

| Feld | Pflicht |
|---|---|
| `id`, `type`, `publisher`, `title`, `confidenceCeiling` | ja |
| `url`, `retrievedAt` | ja bei allen Online-Quellen |
| `documentVersion` | ja, sobald das Dokument eine Version führt |
| `productName` | ja bei Herstellerquellen |

**Abrufdatum ist Pflicht.** Datenblätter werden ohne Ankündigung ersetzt; ein Wert ohne
Abrufdatum lässt sich nicht nachprüfen.

### 1.4 Markenrechte

Handels- und Markennamen Dritter (u. a. Bambu Lab, Prusament®, ULTEM™, Ultrafuse®,
Luvocom®, Filaflex®) sind Marken der jeweiligen Inhaber und werden ausschließlich zur
Quellen- und Produktidentifikation genannt. Zentraler Hinweis in `DISCLAIMER.md`,
datensatzbezogen im Feld `identity.trademarkNotice`.

### 1.5 Prüfnormen

Normtexte (ISO, DIN, EN, UL) sind kostenpflichtig und werden **nicht** wiedergegeben.
`data/standards.json` enthält nur Normnummer, Titel und eine selbst formulierte
Kurzerklärung, wofür die Norm steht.

---

## 2. Quellenhierarchie

Bei widersprüchlichen Angaben gilt diese Reihenfolge — **außer** die höherrangige Quelle
ist physikalisch unplausibel oder unvollständig spezifiziert (dann Konflikt dokumentieren,
nicht auflösen):

| Rang | Typ | `confidenceCeiling` | Bemerkung |
|---|---|---|---|
| 1 | `peer-reviewed` | `high` | Unabhängige Prüfung, meist mit Orientierungsangabe |
| 2 | `manufacturer-tds` | `high` | Datenblatt mit Norm und Prüfbedingung |
| 3 | `standard` | `high` | Norm selbst (Grenzwerte, Klassen) |
| 4 | `manufacturer-sds` | `medium` | Sicherheitsdatenblatt — gut für Chemie, schwach für Mechanik |
| 5 | `textbook` | `medium` | Werkstoffkunde für das Grundpolymer |
| 6 | `field-experience` | `medium` | Belegte eigene Fertigungserfahrung |
| 7 | `manufacturer-website` | `medium` | Produktseite ohne Kennwerttabelle |
| 8 | `community` | `low` | Foren, Tests Dritter — nur mit Methodenbeschreibung |
| 9 | `estimate` | `estimated` | Eigene Ableitung |

> **Ein Datenblatt schlägt keine Physik.** Flashforge nennt für PETG-CF eine
> Dauergebrauchstemperatur von 80 °C — oberhalb der eigenen HDT-Angabe (70 °C) und
> oberhalb von Tg (68 °C). Rang 2 macht diese Angabe nicht richtig. Sie wird mit
> `confidence: low` geführt und begründet eingeordnet.

---

## 3. Verzeichnis der ausgewerteten Quellen

### `src_bambu_petgcf_tds_v2`

| | |
|---|---|
| **Typ** | `manufacturer-tds` |
| **Herausgeber** | Bambu Lab |
| **Produkt** | Bambu PETG-CF |
| **Titel** | Bambu Filament Technical Data Sheet — PETG-CF |
| **Version** | V2.0 |
| **URL** | https://www.additive-x.com/shop/media/mageplaza/product_attachments/attachment_file/b/a/bambu_petg-cf-technical_data_sheet.pdf |
| **Abgerufen** | 2026-08-01 |
| **Ceiling** | `high` |
| **Verwendet in** | `petg-cf` |

**Wert für das Projekt:** Die einzige der drei Quellen mit **vollständigen X-Y- und
Z-Kennwerten** (Zug, Biegung, Schlag, E-Modul, Bruchdehnung). Damit überhaupt erst ein
belegbarer Anisotropiefaktor möglich.

**Einschränkungen:**
- Faseranteil wird **nicht** deklariert.
- Prüfkörper wurden 8 h bei 65 °C vorbehandelt („annealed and dried"). Die Werte liegen
  dadurch über dem, was ein normal gedrucktes Bauteil liefert.
- 65 °C liegt **unter** Tg (68 °C) — eine klassische Temperung ist dort bei einem amorphen
  Werkstoff nicht möglich. Siehe `oq_annealing_below_tg`.
- Gibt für den amorphen Werkstoff einen Schmelzpunkt (225 °C) an, die
  Kristallisationstemperatur aber mit „N/A". Siehe `oq_tm_amorphous`.
- Chemische Beständigkeit nur pauschal („not resistant to acid/alkali") ohne Konzentration.
- ⚠️ Abgerufen über einen **Händler-Spiegel**, nicht über die offizielle Bambu-URL.
  Es existiert mindestens eine V3.0. Zu ersetzen — siehe `oq_source_urls`.

---

### `src_flashforge_petgcf10_tds`

| | |
|---|---|
| **Typ** | `manufacturer-tds` |
| **Herausgeber** | Flashforge |
| **Produkt** | PETGCF10 Filament |
| **Titel** | PETGCF10 Filament Technical Data Sheet (EN) |
| **Version** | 2022-01-17 |
| **URL** | https://after-support.flashforge.jp/uploads/datasheet/tds/PETG_CF_TDS_EN.pdf |
| **Abgerufen** | 2026-08-01 |
| **Ceiling** | `high` |
| **Verwendet in** | `petg-cf` |

**Wert für das Projekt:** Die ehrlichste der drei Quellen. Deklariert den Faseranteil
ausdrücklich (10 %) **und** vermerkt, dass die Prüfkörper **nicht** getempert wurden.
Damit wird sie zum notwendigen Gegenpol zu Bambu und macht die Streuung im Markt sichtbar,
statt sie zu verstecken.

**Einschränkungen:**
- Keine Z-Werte.
- Schlagzähigkeit nach ISO 180 (Izod), nicht ISO 179 (Charpy) — nicht direkt mit Bambu
  vergleichbar, und die Differenz ist mit Faktor 5 auffällig groß. Siehe `oq_impact_conflict`.
- Dauergebrauchstemperatur 80 °C ist physikalisch nicht haltbar (s. o.).

---

### `src_prusament_petgcf_product`

| | |
|---|---|
| **Typ** | `manufacturer-website` |
| **Herausgeber** | Prusa Polymers |
| **Produkt** | Prusament PETG Carbon Fiber |
| **URL** | https://prusament.com/materials/prusament-petg-carbon-fiber/ |
| **Abgerufen** | 2026-08-01 |
| **Ceiling** | `medium` |
| **Verwendet in** | `petg-cf` |

**Wert für das Projekt:** Belastbare Aussagen zu Verarbeitung und Verhalten —
Düsentemperatur 265 ± 10 °C, Betttemperatur 90 ± 10 °C, **gehärtete Düse erforderlich**,
geringere Zähigkeit gegenüber unverstärktem PETG, geringeres Stringing, matte Oberfläche.

**Einschränkungen:** Keine vollständige Kennwerttabelle auf der Produktseite; das
verlinkte PDF ist ein Sicherheitsdatenblatt, kein TDS. Deshalb `confidenceCeiling: medium`.

---

### `estimate_reasoning` (Sammel-ID)

| | |
|---|---|
| **Typ** | `estimate` |
| **Ceiling** | `estimated` |

Sammel-ID für alle Werte, die aus Werkstoffkunde und Verfahrenswissen abgeleitet und
**nicht** belegt sind. Jeder so markierte Wert trägt eine `note` mit der Begründung.
In der UI zwingend als Schätzung zu kennzeichnen.

---

## 4. Geprüft und bewusst *nicht* verwendet

### Polymaker Fiberon PET-CF17

Bei der Recherche nach PETG-CF-Datenblättern taucht diese Quelle prominent auf
(Zugfestigkeit 65,9 ± 1,0 MPa, Modul 5481 ± 224 MPa, HDT 0,45 MPa: 147,5 °C).

**Nicht verwendet.** `PET-CF17` ist **nicht** PETG-CF, sondern teilkristallines PET-CF —
ein anderer Werkstoff mit rund doppelter Steifigkeit und mehr als doppelter HDT. Ein
Buchstabe Unterschied im Namen, Faktor 2 in den Kennwerten.

Die Werte wandern später in einen eigenen Datensatz `pet-cf`. Im Datensatz `petg-cf` ist
die Verwechslungsgefahr über `identity.notToBeConfusedWith` explizit dokumentiert — sie
ist der wahrscheinlichste Weg, wie in dieser Datenbank grob falsche Zahlen entstehen könnten.

---

## 5. Erschließungsplan (Phase 4)

| Priorität | Quelle | Erwarteter Nutzen |
|---|---|---|
| hoch | Offizielle Bambu-Lab-Wiki-TDS (aktuelle Version, alle Materialien) | Z-Werte über viele Materialien — im Markt selten |
| hoch | Prusa Polymers TDS-PDFs (Prusament-Linie) | Vollständige Kennwerttabellen, saubere Normangaben |
| hoch | Polymaker (PolyLite/PolyMax/Fiberon), inkl. „Technical Data at a Glance" | Breite Abdeckung in einem Dokument |
| hoch | BASF Forward AM (Ultrafuse) | Industriequalität, Regulatorik, UL94-Einstufungen |
| mittel | Lehvoss Luvocom 3F | Hochtemperatur- und FR-Typen |
| mittel | Fillamentum, Extrudr, Fiberlogy, FormFutura, ColorFabb | Europäische Marktbreite |
| mittel | 3DXTech, Essentium, Kimya, Nanovia | Technische Compounds, ESD-Typen |
| mittel | Recreus, NinjaTek, Taulman | TPU/TPE-Spanne |
| niedrig | Stratasys, Roboze | Hochtemperatur-Referenzwerte (proprietäre Systeme) |

**Zusätzlich erforderlich, weil Herstellerangaben es nicht hergeben:**

- Preiserhebung über ≥ 5 Händler je Material (`oq_price_survey`)
- Bewitterungsdaten (QUV/Xenon) — vermutlich nur über Fachliteratur (`oq_uv_data`)
- Lackhaftung, Verklebbarkeit, XXL-Eignung → eigene Fertigungserfahrung Reents3D
- ESD-Messungen zur Absicherung der `insulating`-Einstufung bei CF-Typen (`oq_esd_measurement`)

---

## 6. Pflegeprozess

1. **Änderung nur per PR**, mit Quellenangabe im PR-Text.
2. `retrievedAt` wird bei jeder Prüfung aktualisiert, auch wenn sich nichts geändert hat.
3. `governance.lastReviewed` je Datensatz, Turnus 12 Monate.
4. Ersetzt ein Hersteller ein Datenblatt, bleibt die alte Quelle mit ihrer
   `documentVersion` erhalten und wird um die neue ergänzt — Werte dürfen nachvollziehbar
   bleiben.
5. Widersprüche werden als `openQuestion` erfasst, **nicht** durch Mittelwertbildung
   aufgelöst.
