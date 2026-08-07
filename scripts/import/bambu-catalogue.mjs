/**
 * Import: Bambu Lab — vollständiger Filamentkatalog.
 *
 * WARUM DIESE QUELLE DIE WERTVOLLSTE DER DATENBANK IST
 * Bambu Lab veröffentlicht als einziger Hersteller für JEDEN Kennwert beide
 * Orientierungen: X-Y (in der Schichtebene) und Z (quer dazu), gemessen an GEDRUCKTEN
 * Prüfkörpern, in einem Labor, nach einer Methode. Nur daraus lässt sich der
 * Anisotropiefaktor bilden — die Zahl, die kaum ein Vergleichsportal nennt und die
 * darüber entscheidet, ob ein Bauteil richtig orientiert gedruckt wurde.
 * Zusätzlich stehen Streuungen (± MPa) an den Werten, nicht nur Punktschätzungen.
 *
 * QUELLE UND REPRODUZIERBARKEIT
 * Die Datenblätter liegen unter einem festen Shopify-Pfad ohne Hash:
 *   https://cdn.shopify.com/s/files/1/0584/7236/6216/files/Bambu_<Name>_Technical_Data_Sheet.pdf
 * Der Import liest Textauszüge (pdftotext -layout) aus data/_sources/bambu-tds/. Dieses
 * Verzeichnis ist lokaler Arbeitsplatz und NICHT Teil des Repositorys — die Datenblätter
 * sind fremde Werke, die wir nicht weiterverbreiten (ADR-034). Wer den Import laufen
 * lassen will, legt die Auszüge selbst dort ab; die Adressen stehen an jedem Datensatz
 * unter datasheet.url. Siehe data/_sources/README.md.
 *
 * NICHT ÜBERNOMMEN: PVA und die beiden Support-Werkstoffe. Sie sind Hilfsmaterial und
 * keine Kandidaten für die Frage "welcher Werkstoff für mein Bauteil".
 */

import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SRC = path.join(ROOT, "data/_sources/bambu-tds");
const OUT = path.join(ROOT, "data/products");
const RETRIEVED = "2026-08-01";
const CDN = "https://cdn.shopify.com/s/files/1/0584/7236/6216/files";

const t = (de, en) => ({ de, en });

/* Dateiname -> Werkstofftyp. Alles, was hier fehlt, wird uebersprungen. */
const MAP = {
  /* `ABS-GF` zeigte bis 2026-08-07 auf `abs`. Das war richtig, solange es keinen eigenen
     Typ gab - seit `bambu-tds2.mjs` `abs-gf` angelegt hat, ist es falsch, und ein Lauf
     dieses Skripts hat den Produktdatensatz stillschweigend auf `abs` zurueckgezogen.
     Gefangen hat es `type-median.test.ts`: Sechs abgeleitete Werte von `abs-gf` standen
     ploetzlich ohne ein einziges Blatt dahinter. */
  ABS: "abs", "ABS-GF": "abs-gf", ASA: "asa", ASA_Aero: "asa-aero",
  "PA6-CF": "pa6-cf", "PAHT-CF": "paht-cf", PC: "pc", PC_FR: "pc-fr",
  "PETG-CF": "petg-cf", PETG_Basic: "petg", PETG_HF: "petg",
  "PLA-CF": "pla", PLA_Aero: "pla", PLA_Basic: "pla", PLA_Basic_Gradient: "pla",
  PLA_Galaxy: "pla", PLA_Marble: "pla", PLA_Matte: "pla", PLA_Metal: "pla",
  PLA_Silk_: "pla", PLA_Sparkle: "pla", PLA_Tough: "pla-tough",
  "PPS-CF": "pps-cf", TPU_95A: "tpu-95a", TPU_95A_HF: "tpu-95a", TPU_for_AMS: "tpu-95a",
};

/* Produkte, die bereits aus scripts/import/bambu-tds.mjs stammen (Volltranskript,
   inklusive Werten, die dieser Parser nicht liest). Nicht ueberschreiben. */
const KEEP_EXISTING = new Set([
  "ABS", "ASA", "ASA_Aero", "PA6-CF", "PC", "PETG_Basic", "PLA_Basic", "TPU_95A",
  /* `ABS-GF` gehoert seit 2026-08-06 `bambu-tds2.mjs`, das aus demselben Blatt AUCH die
     Z-Werte liest - dieser Parser liest nur X-Y. Ohne den Eintrag hier ueberschrieb ein
     Lauf den reicheren Datensatz mit dem aermeren und nahm acht Kennwerte mit, darunter
     alle vier Z-Groessen. Gefangen hat es `type-median.test.ts`. */
  "ABS-GF",
]);

const NAMES = {
  "ABS-GF": "Bambu ABS-GF", "PAHT-CF": "Bambu PAHT-CF", PC_FR: "Bambu PC FR",
  "PETG-CF": "Bambu PETG-CF", PETG_HF: "Bambu PETG HF", "PLA-CF": "Bambu PLA-CF",
  PLA_Aero: "Bambu PLA Aero", PLA_Basic_Gradient: "Bambu PLA Basic Gradient",
  PLA_Galaxy: "Bambu PLA Galaxy", PLA_Marble: "Bambu PLA Marble", PLA_Matte: "Bambu PLA Matte",
  PLA_Metal: "Bambu PLA Metal", PLA_Silk_: "Bambu PLA Silk", PLA_Sparkle: "Bambu PLA Sparkle",
  PLA_Tough: "Bambu PLA Tough", "PPS-CF": "Bambu PPS-CF",
  TPU_95A_HF: "Bambu TPU 95A HF", TPU_for_AMS: "Bambu TPU for AMS",
};

/* ------------------------------------------------------------------ parsen */

const norm = (s) => s.replace(/ /g, " ").replace(/[ \t]{2,}/g, "|");

/** "3160 ± 170 MPa" -> {v:3160, tol:170};  "240 - 280 °C" -> {v:260, min:240, max:280} */
function num(cell) {
  if (!cell) return null;
  const c = cell.replace(/,/g, "").trim();
  if (/^n\/?a$/i.test(c)) return null;
  const range = c.match(/^(-?[\d.]+)\s*[-–]\s*(-?[\d.]+)/);
  if (range) {
    const min = parseFloat(range[1]), max = parseFloat(range[2]);
    if (Number.isFinite(min) && Number.isFinite(max)) return { v: (min + max) / 2, min, max };
  }
  const tol = c.match(/^(-?[\d.]+)\s*±\s*([\d.]+)/);
  if (tol) return { v: parseFloat(tol[1]), tol: parseFloat(tol[2]) };
  const one = c.match(/^(-?[\d.]+)/);
  return one && Number.isFinite(parseFloat(one[1])) ? { v: parseFloat(one[1]) } : null;
}

/** Findet eine Zeile und liefert die letzte Zelle als Zahl. */
function row(lines, re) {
  for (const l of lines) {
    if (!re.test(l)) continue;
    const cells = l.split("|").map((s) => s.trim()).filter(Boolean);
    const n = num(cells[cells.length - 1]);
    if (n) return { ...n, std: cells.length >= 3 ? cells[1] : undefined };
  }
  return null;
}

const q = (n, unit, o = {}) => n && ({
  value: Math.round(n.v * 1000) / 1000, unit,
  ...(n.tol != null ? { tolerance: n.tol } : {}),
  ...(n.min != null ? { min: n.min } : {}),
  ...(n.max != null ? { max: n.max } : {}),
  ...(o.std ?? n.std ? { testStandard: o.std ?? n.std } : {}),
  ...(o.orientation ? { orientation: o.orientation } : {}),
  source: "src_tds", confidence: "high",
});

/**
 * Die Schlagzaehigkeitszeile der Bambu-Blaetter, beide Werte.
 *
 * DER FEHLER, DEN DAS BEHEBT
 * Im PDF steht die Zeile dreispaltig, und der Textauszug zerlegt sie ueber DREI Zeilen:
 *
 *     41.2 ± 2.6 kJ/m²;                                      <- ungekerbt, ZEILE DAVOR
 *     Impact Strength (X-Y)  ISO 179, GB/T 1043  15.7 ±1.6   <- Label + gekerbt
 *     (notched)                                              <- die Kennzeichnung dazu
 *
 * Die allgemeine `row()`-Lesung nimmt die letzte Zelle der Label-Zeile - also den
 * GEKERBTEN Wert - und legte ihn als `charpyUnnotchedXy` ab. Betroffen waren 22 Blaetter.
 * Aufgefallen ist es an einer blockierenden offenen Frage: Bambus angeblich ungekerbte
 * 15,7 kJ/m² fuer PETG-CF standen gegen 3 bis 3,5 von Flashforge, und der Faktor 5 war
 * "mit Faseranteil und Vorbehandlung allein nicht erklaerbar" - richtig, denn es waren
 * zwei verschiedene Kerbzustaende.
 *
 * DIE LESUNG
 * Betrachtet wird ein Fenster von der Zeile davor bis zwei Zeilen danach. Der Wert, der
 * mit "(notched)" zusammensteht, ist der gekerbte; der andere der ungekerbte. Steht nur
 * einer da, wird er NICHT geraten - dann bleibt das Feld leer, und das ist besser als eine
 * Zahl im falschen Feld.
 */
function impactPair(lines) {
  const i = lines.findIndex((l) => /Impact Strength \(X-?Y\)/i.test(l));
  if (i < 0) return {};
  const win = lines.slice(Math.max(0, i - 2), i + 4);
  const std = (lines[i].split("|").map((s) => s.trim()).filter(Boolean)[1]) || undefined;

  /* Jede Zahl im Fenster mit der Information, ob auf ihrer Zeile "notched" steht.
     Die Kennzeichnung kann auch allein auf der Folgezeile stehen - dann gehoert sie zur
     letzten Zahl davor. */
  const found = [];
  for (const raw of win) {
    /* Normbezeichnungen zuerst wegwerfen - "ISO 179" und "GB/T 1043" sind Zahlen, die
       sonst als Messwerte gelesen wuerden. Ebenso die Richtungsangabe "(X-Y)". */
    const line = raw
      .replace(/[｜|]/g, " ")
      .replace(/ISO\s*\d+[\w-]*/gi, " ")
      .replace(/GB\/T\s*\d+/gi, " ")
      .replace(/\(\s*[XYZ][-\s]*[XYZ]?\s*\)/gi, " ");
    /* Bambu beschriftet nicht einheitlich: meist "(notched)", beim PC FR aber
       "(Notched Impact Strength)" - und das ueber zwei Zeilen umgebrochen. Erkannt wird
       deshalb das Wort in Klammern ODER eine oeffnende Klammer direkt davor. */
    const marked = /[(（]\s*notched\b/i.test(line) || /\bnotched\s*[)）]/i.test(line);
    /* Reine Kennzeichnungszeile: traegt "(notched)", aber keine eigene Zahl - sie gehoert
       zum letzten Wert davor. Kommt vor als "(notched)", als `kJ/m²(notched)` und bei
       PLA Marble mit einem verirrten Anfuehrungszeichen dahinter. */
    const bare = line.replace(/kJ\/m.?/gi, "").replace(/[(（]?\s*notched[\w\s]*[)）]?/gi, "");
    if (marked && !/\d/.test(bare)) {
      if (found.length) found[found.length - 1].marked = true;
      continue;
    }
    /* Fortsetzung einer Kennzeichnung ohne eigene Zahl ("Strength)") - ueberspringen,
       damit sie die Zuordnung nicht verschiebt. */
    if (!/\d/.test(line.replace(/kJ\/m.?/gi, ""))) continue;
    /* NUR Zahlen, die zu dieser Groesse gehoeren. Das Fenster reicht zwei Zeilen nach oben,
       weil der ungekerbte Wert dort stehen kann - dort steht aber auch die Biegefestigkeit
       des vorigen Blocks. Eine Zeile mit einer FREMDEN Einheit wird deshalb verworfen; eine
       Zeile ganz ohne Einheit bleibt drin, weil Bambu den Wert gelegentlich von seiner
       Einheit trennt ("7.6 ± 0.9" auf der einen, "kJ/m²(notched)" auf der naechsten Zeile). */
    /* Die Einheit steht IMMER hinter einer Zahl. Ohne diese Bedingung traf `MPa`
       case-insensitiv das Wort "I-mpa-ct" in der Beschriftung und warf die Zeile weg,
       auf der der gesuchte Wert steht. */
    if (/\d\s*(MPa|GPa|°C|g\/cm³?|g\/10|Shore)/i.test(line)) continue;
    for (const m of line.matchAll(/(-?\d+(?:\.\d+)?)\s*(?:±\s*(\d+(?:\.\d+)?))?/g)) {
      const v = parseFloat(m[1]);
      if (!Number.isFinite(v)) continue;
      found.push({ v, tol: m[2] ? parseFloat(m[2]) : undefined, marked });
    }
  }

  const notched = found.find((f) => f.marked) ?? null;
  const unnotched = found.find((f) => !f.marked) ?? null;

  /* Nennt das Blatt gar keinen gekerbten Wert, ist der eine Wert der ungekerbte - so bei
     den TPU-Blaettern, wo die gekerbte Probe schlicht nicht bricht. Das ist kein Rateschritt:
     Ohne "(notched)" irgendwo im Fenster gibt es nichts zu verwechseln. */
  if (!notched) return unnotched ? { unnotched, std } : { std };

  /* Mit Kennzeichnung MUSS der ungekerbte Wert darueber liegen - sonst ist die Zuordnung
     falsch herum gelesen, und dann lieber nichts als das Falsche. */
  if (!unnotched || unnotched.v <= notched.v) return { std };
  return { unnotched, notched, std };
}

function parse(txt) {
  const lines = norm(txt).split("\n");
  const p = {};
  const put = (k, v) => { if (v) p[k] = v; };

  put("density", q(row(lines, /^\|?Density\|/i), "g/cm³"));
  put("tensileStrengthXy", q(row(lines, /Tensile Strength \(X-?Y\)/i), "MPa", { orientation: "XY" }));
  put("tensileStrengthZ", q(row(lines, /Tensile Strength \(Z\)/i), "MPa", { orientation: "Z" }));
  put("tensileModulusXy", q(row(lines, /Young'?s Modulus \(X-?Y\)/i), "MPa", { orientation: "XY" }));
  put("flexuralModulusXy", q(row(lines, /Bending Modulus \(X-?Y\)/i), "MPa", { orientation: "XY" }));
  put("flexuralStrengthXy", q(row(lines, /Bending Strength \(X-?Y\)/i), "MPa", { orientation: "XY" }));
  /* SCHLAGZAEHIGKEIT BRAUCHT EINE EIGENE LESUNG - siehe impactPair().
     Bis 2026-08-07 stand hier dieselbe `row()`-Lesung wie ueberall, und sie hat ueber
     22 Blaetter hinweg den GEKERBTEN Wert ins UNGEKERBTE Feld geschrieben. */
  const imp = impactPair(lines);
  put("charpyUnnotchedXy", q(imp.unnotched, "kJ/m²", { orientation: "XY", std: imp.std }));
  put("charpyNotchedXy", q(imp.notched, "kJ/m²", { orientation: "XY", std: imp.std }));
  put("elongationAtBreakXy", q(row(lines, /Elongation at Break \(X-?Y\)/i), "%", { orientation: "XY" }));
  put("hdtA", q(row(lines, /Heat Deflection Temperature\|.*1\.8 ?MPa/i), "°C", { std: "ISO 75, 1.8 MPa" }));
  put("hdtB", q(row(lines, /Heat Deflection Temperature\|.*0\.45 ?MPa/i), "°C", { std: "ISO 75, 0.45 MPa" }));
  put("vicatA", q(row(lines, /Vicat Softening Temperature/i), "°C", { std: "ISO 306" }));
  put("glassTransition", q(row(lines, /Glass Transition Temperature/i), "°C", { std: "DSC, 10 °C/min" }));
  put("nozzleTemperature", q(row(lines, /^\|?Nozzle Temperature\|/i), "°C", { std: "" }));
  put("bedTemperature", q(row(lines, /^\|?Bed Temperature\|/i), "°C", { std: "" }));
  put("chamberTemperature", q(row(lines, /^\|?Chamber Temperature\|/i), "°C", { std: "" }));
  return p;
}

/* --------------------------------------------------------------- schreiben */

/**
 * Zahlen, die ihrem eigenen Umfeld so deutlich widersprechen, dass sie in keine
 * Zusammenfassung eingehen duerfen (ADR-042). Sie bleiben im Datensatz und in der
 * Oberflaeche - durchgestrichen und mit ihrem Befund daneben.
 */
const DISPUTED = {
  TPU_for_AMS: {
    field: "tensileModulusXy",
    note: {
      de: "1.190 MPa Zug-E-Modul steht neben 22,4 MPa Zugfestigkeit auf demselben Blatt. Ein "
        + "linear gerechnetes Bauteil risse damit bei 1,9 % Dehnung — ein Elastomer mit Shore 95A "
        + "dehnt sich um mehrere hundert Prozent. Bambus eigenes TPU-95A-Blatt nennt 9,2 MPa, das "
        + "HF-Blatt 9,8. Der Wert bleibt als Blattangabe stehen, wird aber nicht mitgerechnet.",
      en: "1,190 MPa tensile modulus sits next to 22.4 MPa tensile strength on the same sheet. A part "
        + "computed linearly would break at 1.9 % strain — a Shore 95A elastomer stretches several "
        + "hundred percent. Bambu's own TPU 95A sheet states 9.2 MPa, the HF sheet 9.8. The value "
        + "stays on record but is not aggregated.",
    },
  },
};

mkdirSync(OUT, { recursive: true });
const SPECIMEN_NOTE = t(
  "Bambu Lab misst an GEDRUCKTEN Prüfkörpern und veröffentlicht für jeden Kennwert beide Orientierungen — X-Y in der Schichtebene und Z quer dazu — samt Streuung. Nur daraus lässt sich ablesen, wie viel Festigkeit eine falsche Bauteilorientierung kostet. Von 13 Werkstofftypen mit Z-Kennwert stützen sich 12 auf diese Blätter; ausserhalb nennt bislang nur Fillamentum (OBC 905) beide Richtungen.",
  "Bambu Lab measures on PRINTED specimens and publishes both orientations for every value — X-Y in the layer plane and Z across it — including scatter. Only from that can one read how much strength a wrong part orientation costs. Of 13 material types carrying a Z value, 12 rest on these sheets; outside them only Fillamentum (OBC 905) states both directions so far.");

let sheets;
try {
  sheets = readdirSync(SRC).filter((f) => f.endsWith(".txt")).sort();
} catch (err) {
  if (err.code !== "ENOENT") throw err;
  console.error(
    `\nQuellverzeichnis fehlt: ${path.relative(ROOT, SRC)}\n\n` +
    `data/_sources/ ist lokaler Arbeitsplatz und nicht Teil des Repositorys —\n` +
    `Herstellerdatenblaetter werden nicht weiterverbreitet (ADR-034).\n` +
    `Zum Befuellen siehe data/_sources/README.md.\n\n` +
    `Der Build braucht diesen Importer nicht: "npm run ci" laeuft ohne ihn.\n`
  );
  process.exit(1);
}

let n = 0, skipped = [];
for (const file of sheets) {
  const key = file.replace(/^Bambu_/, "").replace(/_Technical_Data_Sheet\.txt$/, "");
  const material = MAP[key];
  if (!material) { skipped.push(key); continue; }
  if (KEEP_EXISTING.has(key)) { skipped.push(`${key} (bereits erfasst)`); continue; }

  const props = parse(readFileSync(path.join(SRC, file), "utf8"));
  if (!Object.keys(props).length) { skipped.push(`${key} (nichts gelesen)`); continue; }

  /* BESTRITTENE ZAHLEN, siehe ADR-042. Sie stehen im Blatt und werden nicht
     mitgerechnet. Die Kennzeichnung gehoert hierher und nicht nur in die Datendatei -
     sonst holt der naechste Lauf die Zahl ungekennzeichnet zurueck. */
  const disputed = DISPUTED[key];
  if (disputed && props[disputed.field]) {
    props[disputed.field] = { ...props[disputed.field], disputed: true, confidence: "low", note: disputed.note };
  }

  const url = `${CDN}/Bambu_${key}_Technical_Data_Sheet.pdf`;
  const name = NAMES[key] ?? `Bambu ${key.replace(/_/g, " ").trim()}`;
  const rec = {
    $schema: "../../schema/product.schema.json", schemaVersion: "1.0.0",
    id: `bambu-${key.toLowerCase().replace(/_+$/, "").replace(/_/g, "-")}`,
    materialId: material,
    brand: "Bambu Lab", manufacturer: "Bambu Lab", productName: name, origin: "China",
    specimenType: "printed",
    specimenNote: SPECIMEN_NOTE,
    datasheet: { title: `${name} — Technical Data Sheet`, url, retrievedAt: RETRIEVED },
    productUrl: "https://eu.store.bambulab.com/collections/all",
    properties: props,
    governance: {
      lastReviewed: RETRIEVED,
      reviewedBy: "Claude Code (maschineller Import aus dem Herstellerdatenblatt)",
      sources: [{
        id: "src_tds", type: "manufacturer-tds", publisher: "Bambu Lab",
        productName: name, title: `${name} — Technical Data Sheet`,
        url, retrievedAt: RETRIEVED, confidenceCeiling: "high",
        note: t("Herstellerdatenblatt mit gedruckten Prüfkörpern, beiden Orientierungen und Streuungsangaben. Nachzuprüfen am verlinkten Originaldokument.",
                "Manufacturer datasheet with printed specimens, both orientations and scatter figures. Verify against the linked original document."),
      }],
    },
  };
  writeFileSync(path.join(OUT, `${rec.id}.json`), JSON.stringify(rec, null, 2) + "\n");
  n++;
}
console.log(`${n} Bambu-Produkte geschrieben`);
if (skipped.length) console.log(`übersprungen: ${skipped.join(", ")}`);

/* ======================================================= neuer Werkstofftyp ==
   PPS-CF gab es hier noch nicht — und es ist mit HDT-A 235 °C und Vicat 268 °C der mit
   Abstand waermefesteste Werkstoff der Datenbank. Gleichzeitig der anisotropste:
   87 MPa in X-Y gegen 24 MPa in Z. Wer falsch orientiert, verliert drei Viertel. */

const rt = (value, scale) => ({ value, scale, source: "estimate_reasoning", confidence: "estimated" });
const fl = (value) => ({ value, source: "estimate_reasoning", confidence: "estimated" });
const ch = (value, o = {}) => ({ value, source: o.source ?? "estimate_reasoning", confidence: o.confidence ?? "estimated", ...(o.note ? { note: o.note } : {}) });
const mq = (value, unit, o = {}) => ({
  value, unit, ...(o.tol != null ? { tolerance: o.tol } : {}), ...(o.min != null ? { min: o.min } : {}),
  ...(o.max != null ? { max: o.max } : {}), ...(o.std ? { testStandard: o.std } : {}),
  ...(o.orientation ? { orientation: o.orientation } : {}), ...(o.conditions ? { conditions: o.conditions } : {}),
  ...(o.derivedFrom ? { derivedFrom: o.derivedFrom } : {}),
  source: o.source ?? "src_bambu_tds", confidence: o.confidence ?? "high", ...(o.note ? { note: o.note } : {}),
});
const SPEC = "gedruckter Prüfkörper, X1E, 100 % Infill, Kammer 60 °C, Düse 320 °C, 60 mm/s";
const PART = t("Auch bei einem lebensmittelkonformen Material ist das FDM-BAUTEIL nicht automatisch lebensmittelkonform: die Schichtstruktur bildet Kapillaren und Keimnischen.",
               "Even with a food-compliant material the FDM PART is not automatically food safe: the layer structure forms capillaries and bacterial niches.");

writeFileSync(path.join(ROOT, "data/materials/pps-cf.json"), JSON.stringify({
  $schema: "../../schema/material.schema.json", schemaVersion: "1.0.0", id: "pps-cf",
  identity: {
    name: "PPS-CF", family: "PPS", polymerClass: "semi-crystalline", variant: ["high-temp", "CF"],
    aliases: ["Polyphenylensulfid carbonfaserverstärkt", "PPS Carbon", "Polyphenylene Sulfide CF"],
    abstract: t("PPS-CF ist der wärmefesteste Werkstoff dieser Datenbank: 235 °C Formbeständigkeit unter 1,8 MPa Last, Vicat 268 °C, dazu 8230 MPa Steifigkeit. Für Bauteile in Motornähe, Sterilisation und Chemieanlagen. Grenzen: extrem anisotrop — quer zur Schicht bleiben 28 % der Festigkeit —, braucht 310–340 °C Düse und eine auf 60–90 °C beheizte Kammer, was nur wenige Anlagen können.",
                "PPS-CF is the most heat-resistant material in this database: 235 °C deflection under 1.8 MPa load, Vicat 268 °C, plus 8230 MPa stiffness. For parts near engines, in sterilisation and chemical plant. Limits: extremely anisotropic — 28 % of strength remains across the layers — and it needs a 310–340 °C nozzle and a chamber at 60–90 °C, which few machines can do."),
    positioning: t("Wenn 200 °C nicht reichen — und die Anlage mitspielt.", "When 200 °C is not enough — and the machine can keep up."),
  },
  mechanics: {
    density: mq(1.26, "g/cm³", { std: "ISO 1183" }),
    tensileStrengthXy: mq(87, "MPa", { tol: 5, std: "ISO 527", orientation: "XY", conditions: SPEC }),
    tensileStrengthZ: mq(24, "MPa", { tol: 3, std: "ISO 527", orientation: "Z", conditions: SPEC }),
    tensileModulusXy: mq(8230, "MPa", { tol: 270, std: "ISO 527", orientation: "XY", conditions: SPEC }),
    flexuralStrengthXy: mq(142, "MPa", { tol: 5, std: "ISO 178", orientation: "XY", conditions: SPEC }),
    flexuralModulusXy: mq(7160, "MPa", { tol: 280, std: "ISO 178", orientation: "XY", conditions: SPEC }),
    charpyUnnotchedXy: mq(6.2, "kJ/m²", { tol: 1.6, std: "ISO 179", orientation: "XY", conditions: SPEC }),
    charpyUnnotchedZ: mq(2.8, "kJ/m²", { tol: 0.4, std: "ISO 179", orientation: "Z", conditions: SPEC }),
    anisotropyFactorTensile: mq(0.28, "-", { derivedFrom: ["mechanics.tensileStrengthZ", "mechanics.tensileStrengthXy"],
      note: t("24 MPa in Z geteilt durch 87 MPa in X-Y desselben Datenblatts — der schlechteste Wert der Datenbank.",
              "24 MPa in Z divided by 87 MPa in X-Y of the same datasheet — the worst value in the database.") }),
    toughness: rt(2, "toughness"), notchSensitivity: rt(4, "notchSensitivity"),
    creepTendency: rt(1, "creepTendency"), wearResistance: rt(5, "wearResistance"),
  },
  thermal: {
    hdtA: mq(235, "°C", { std: "ISO 75, 1.8 MPa" }), hdtB: mq(264, "°C", { std: "ISO 75, 0.45 MPa" }),
    vicatB50: mq(268, "°C", { std: "ISO 306" }), glassTransition: mq(100, "°C", { std: "DSC, 10 °C/min" }),
    recommendedMaxServiceTemperature: mq(200, "°C", { conditions: "dauerhaft unter mechanischer Last, Luft",
      source: "estimate_reasoning", confidence: "estimated",
      note: t("Eigene konservative Empfehlung mit Abstand zu HDT-A.", "Our own conservative recommendation with margin to HDT-A.") }),
  },
  processing: {
    nozzleTemperature: mq(325, "°C", { min: 310, max: 340 }), bedTemperature: mq(110, "°C", { min: 100, max: 120 }),
    chamberRequirement: ch("mandatory", { source: "src_bambu_tds", confidence: "high",
      note: t("Kammer 60–90 °C laut Datenblatt.", "Chamber 60–90 °C per the datasheet.") }),
    dryingTemperature: mq(120, "°C", { source: "estimate_reasoning", confidence: "estimated" }),
    dryingTime: mq(12, "h", { source: "estimate_reasoning", confidence: "estimated" }),
    printability: rt(1, "printability"), warpingTendency: rt(5, "warpingTendency"),
    hygroscopy: rt(4, "hygroscopy"), abrasiveness: rt(5, "abrasiveness"),
  },
  durability: {
    uvResistance: rt(3, "uvResistance"), weatherResistance: rt(3, "weatherResistance"),
    hydrolysisResistance: rt(5, "hydrolysisResistance"),
    chemicalResistance: [
      { chemicalId: "chem_water", rating: "resistant", source: "estimate_reasoning", confidence: "estimated" },
      { chemicalId: "chem_mineral_oil", rating: "resistant", source: "estimate_reasoning", confidence: "estimated" },
    ],
  },
  compliance: {
    foodContact: { status: ch("not-declared"), partLevelWarning: PART },
    flameRetardancy: { ul94: ch("not-classified") },
    printEmissions: { concernLevel: ch("moderate"), extractionRecommended: fl(true) },
    translucency: ch("opaque", { source: "src_bambu_tds", confidence: "high" }),
  },
  finishing: {
    surfaceQuality: rt(2, "surfaceQuality"), paintAdhesion: rt(1, "paintAdhesion"),
    bondability: rt(1, "bondability"), chemicalSmoothing: { suitable: fl(false) },
  },
  commercial: {
    priceIndex: rt(5, "priceIndex"), availability: rt(1, "availability"), smallSeriesSuitability: rt(1, "smallSeriesSuitability"),
    xxl: { maxSensibleEdgeMm: mq(250, "mm", { min: 100, max: 400, source: "estimate_reasoning", confidence: "estimated",
        note: t("Kammerbedarf und extreme Verzugsneigung begrenzen die Bauteilgrösse stark.",
                "Chamber requirement and extreme warping tendency limit part size severely.") }),
      },
    reentsPortfolioStatus: ch("unknown"),
  },
  governance: {
    lastReviewed: RETRIEVED, reviewedBy: "Claude Code (Erstimport aus Herstellerdatenblatt) - fachliche Freigabe ausstehend",
    reviewCycleMonths: 12, dataCompleteness: null,
    sources: [
      { id: "src_bambu_tds", type: "manufacturer-tds", publisher: "Bambu Lab", productName: "Bambu PPS-CF",
        title: "Bambu PPS-CF — Technical Data Sheet", url: `${CDN}/Bambu_PPS-CF_Technical_Data_Sheet.pdf`,
        retrievedAt: RETRIEVED, confidenceCeiling: "high",
        note: t("Datenblatt mit gedruckten Prüfkörpern, beiden Orientierungen, Streuungen UND vollständig offengelegten Druckparametern der Prüfkörper.",
                "Datasheet with printed specimens, both orientations, scatter figures AND fully disclosed specimen print parameters.") },
      { id: "estimate_reasoning", type: "estimate", publisher: "FDM-Materialberater",
        title: "Fachliche Ableitung ohne Primärquelle", confidenceCeiling: "estimated" },
    ],
    openQuestions: [{ id: "oq_second_source",
      question: t("Zweite unabhängige Herstellerquelle für PPS-CF ergänzen.", "Add a second independent manufacturer source for PPS-CF."),
      blocking: false, affectsFields: ["mechanics", "thermal"] }],
  },
}, null, 2) + "\n");
console.log("  Werkstofftyp pps-cf");
