/**
 * Import: Bambu Lab, zweite Runde - die Blaetter, die beim Erstimport fehlten.
 *
 * Die OFD-Arbeitsliste (ADR-035) fuehrt fuer Bambu Lab 41 Datenblattlinks; 28 Produkte
 * standen bereits im Bestand. Von den 15 fehlenden liefern 14 eine vollstaendige
 * Kennwerttabelle, `PLA Lite` faellt aus (der Link zeigt auf ein Haendlerdokument eines
 * argentinischen Wiederverkaeufers ohne Kennwerte).
 *
 * SIEBEN DAVON PASSEN AUF BESTEHENDE WERKSTOFFTYPEN - DIESE SIEBEN STEHEN HIER
 * PA6-GF, PETG Translucent, PLA Glow, PLA Silk Dual Color, PLA Translucent, PLA Wood,
 * TPU 85A. Alle sieben tragen Zugfestigkeit in X-Y UND Z aus demselben Pruefdurchgang -
 * die Blattfamilie von Bambu ist darin der Massstab im Bestand.
 *
 * SIEBEN BRAUCHEN EINE ENTSCHEIDUNG UND WARTEN DESHALB
 *   PPA-CF              Polyphthalamid, ein eigener Hochtemperatur-Werkstoff
 *   TPU 90A             zwischen den bestehenden Typen tpu-85a und tpu-95a
 *   PVA                 wasserloesliches Stuetzmaterial, im Bestand gar nicht vertreten
 *   Support for ABS/PLA/PLA-PETG/PA-PET   vier weitere Stuetzmaterialien
 * Einen Werkstofftyp anzulegen heisst, dreissig redaktionelle Bewertungen zu vergeben.
 * Das ist eine fachliche Entscheidung, keine Uebertragung, und sie steht in PLAN.md
 * neben den offenen Fragen zu PEEK, PEI, PCL und BVOH.
 *
 * DREI BEFUNDE IN DEN BLAETTERN
 *  1) PETG Translucent nennt den Z-Modul als "1230 ± 1430 MPa" - die Streuung ist
 *     groesser als der Wert selbst. Der Wert ist uebernommen und traegt `low`.
 *  2) PLA Glow gibt die Schlagzaehigkeit in Z mit 19,8 kJ/m² an, in X-Y aber nur mit
 *     8,8. Quer zur Schicht mehr als laengs ist bei FDM nicht plausibel.
 *  3) PLA Translucent zeigt dasselbe schwaecher (8,5 gegen 6,7).
 * Alle drei sind uebernommen wie gedruckt und am Datensatz benannt - Regel R12 des
 * Plausibilitaetspruefers faengt diesen Fall bisher nur auf der Werkstoffebene.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const RETRIEVED = "2026-08-05";

const t = (de, en) => ({ de, en });

const q = (value, unit, o = {}) => ({
  value, unit,
  ...(o.min != null ? { min: o.min } : {}),
  ...(o.max != null ? { max: o.max } : {}),
  ...(o.tolerance != null ? { tolerance: o.tolerance } : {}),
  ...(o.std ? { testStandard: o.std } : {}),
  ...(o.conditions ? { conditions: o.conditions } : {}),
  ...(o.orientation ? { orientation: o.orientation } : {}),
  source: "src_tds", confidence: o.confidence ?? "medium",
  ...(o.note ? { note: o.note } : {}),
});

/* Bambu nennt beide Normfamilien nebeneinander - ISO und die chinesische Entsprechung. */
const S527 = "ISO 527 / GB/T 1040";
const S178 = "ISO 178 / GB/T 9341";
const S179 = "ISO 179 / GB/T 1043";

/** Kurzform fuer die immer gleiche Bambu-Tabelle. */
const table = ({ dens, mfp, tg, water, exy, ez, sxy, sz, elxy, elz, bmxy, bmz, bsxy, bsz, ixy, iz, opts = {} }) => ({
  density: q(dens, "g/cm³", { std: "ISO 1183" }),
  ...(mfp != null ? { meltingTemperature: q(mfp, "°C", { std: "DSC", conditions: "10 °C/min" }) } : {}),
  ...(tg != null ? { glassTransition: q(tg, "°C", { std: "DSC", conditions: "10 °C/min" }) } : {}),
  ...(water != null ? { waterAbsorption: q(water, "%", { conditions: "25 °C, 55 % rF, gesättigt" }) } : {}),
  tensileModulusXy: q(exy[0], "MPa", { tolerance: exy[1], std: S527, orientation: "XY" }),
  tensileModulusZ: q(ez[0], "MPa", { tolerance: ez[1], std: S527, orientation: "Z", ...(opts.ezNote ?? {}) }),
  tensileStrengthXy: q(sxy[0], "MPa", { tolerance: sxy[1], std: S527, orientation: "XY" }),
  tensileStrengthZ: q(sz[0], "MPa", { tolerance: sz[1], std: S527, orientation: "Z" }),
  elongationAtBreakXy: q(elxy[0], "%", { tolerance: elxy[1], std: S527, orientation: "XY", ...(opts.elxyNote ?? {}) }),
  elongationAtBreakZ: q(elz[0], "%", { tolerance: elz[1], std: S527, orientation: "Z", ...(opts.elzNote ?? {}) }),
  ...(bmxy ? { flexuralModulusXy: q(bmxy[0], "MPa", { tolerance: bmxy[1], std: S178, orientation: "XY" }) } : {}),
  ...(bmz ? { flexuralModulusZ: q(bmz[0], "MPa", { tolerance: bmz[1], std: S178, orientation: "Z" }) } : {}),
  ...(bsxy ? { flexuralStrengthXy: q(bsxy[0], "MPa", { tolerance: bsxy[1], std: S178, orientation: "XY" }) } : {}),
  ...(bsz ? { flexuralStrengthZ: q(bsz[0], "MPa", { tolerance: bsz[1], std: S178, orientation: "Z" }) } : {}),
  charpyUnnotchedXy: q(ixy[0], "kJ/m²", { ...(ixy[1] != null ? { tolerance: ixy[1] } : {}), std: S179, orientation: "XY" }),
  charpyUnnotchedZ: q(iz[0], "kJ/m²", { ...(iz[1] != null ? { tolerance: iz[1] } : {}), std: S179, orientation: "Z", ...(opts.izNote ?? {}) }),
});

const IMPACT_INVERTED = (z, xy) => ({
  confidence: "low",
  conditions: `Blattangabe ${z} kJ/m² in Z gegen ${xy} kJ/m² in X-Y — quer zur Schicht höher als längs, was bei FDM nicht plausibel ist`,
});

const P = [
  {
    id: "bambu-pa6-gf", material: "pa6-gf", name: "Bambu PA6-GF",
    file: "https://cdn.shopify.com/s/files/1/0574/3116/2995/files/Bambu_PA6-GF_Technical_Data_Sheet.pdf",
    nozzle: [260, 290], bed: [80, 100],
    props: table({
      dens: 1.14, mfp: 219, tg: 67, water: 2.56,
      exy: [2850, 260], ez: [1950, 210], sxy: [75, 6], sz: [27, 5],
      elxy: [3.9, 0.8], elz: [2.3, 0.7],
      bmxy: [3670, 140], bmz: [2300, 120], bsxy: [120, 6], bsz: [51, 5],
      ixy: [7.2, 2.3], iz: [4.1, 0.7],
    }),
    features: t(
      "Die stärkste Anisotropie im ganzen Bestand: 75 MPa längs zur Schicht gegen 27 MPa quer — quer bleiben 36 % übrig, gegenüber 89 % bei ungefülltem PLA. Glasfasern richten sich in Extrusionsrichtung aus und tragen quer dazu nichts bei; zwischen den Schichten hält nur die Matrix. Wer ein Bauteil aus diesem Werkstoff auslegt, muss die Aufbaurichtung kennen, sonst rechnet er mit dem Dreifachen dessen, was das Teil trägt. Die Wassersättigung von 2,56 % ist die zweithöchste im Bestand — Trocknen ist bei diesem Werkstoff keine Empfehlung, sondern Voraussetzung.",
      "The strongest anisotropy in the entire dataset: 75 MPa along the layers against 27 MPa across — 36 % remains across, compared with 89 % for unfilled PLA. Glass fibres align in the extrusion direction and contribute nothing across it; between layers only the matrix holds. Anyone designing a part from this material must know the build direction, otherwise they calculate with three times what the part carries. The saturated water absorption of 2.56 % is the second highest in the dataset — drying is not a recommendation for this material but a precondition.",
    ),
  },
  {
    id: "bambu-petg-translucent", material: "petg", name: "Bambu PETG Translucent",
    file: "https://cdn.shopify.com/s/files/1/0574/3116/2995/files/Bambu_PETG_Translucent_Technical_Data_Sheet.pdf",
    nozzle: [230, 270], bed: [65, 75],
    props: table({
      dens: 1.25, mfp: 228, tg: 70, water: 0.30,
      exy: [1420, 160], ez: [1230, 1430], sxy: [33, 4], sz: [29, 3],
      elxy: [8.2, 1.3], elz: [5.2, 0.9],
      bmxy: [1610, 130], bmz: [1520, 110], bsxy: [68, 3], bsz: [55, 4],
      ixy: [8.6, 2.1], iz: [7.2, 1.8],
      opts: {
        ezNote: {
          confidence: "low",
          conditions: "Blattangabe „1230 ± 1430 MPa“ — die Streuung ist größer als der Wert selbst, das Intervall reicht damit ins Negative",
        },
      },
    }),
    anomaly: t(
      "Der Zug-E-Modul in Z steht als „1230 ± 1430 MPa“ im Blatt. Eine Streuung, die größer ist als der Messwert, beschreibt kein Ergebnis — das Intervall reichte bis ins Negative. Vermutlich ist ± 130 oder ± 140 gemeint, wie in den Nachbarzeilen; welches, sagt das Blatt nicht. Der Wert ist übernommen und trägt `low`.",
      "The tensile modulus in Z is stated as “1230 ± 1430 MPa”. A scatter larger than the measured value describes no result — the interval would extend into the negative. Presumably ± 130 or ± 140 is meant, as in the neighbouring rows; which one, the sheet does not say. The value is imported and carries `low`.",
    ),
  },
  {
    id: "bambu-pla-glow", material: "pla", name: "Bambu PLA Glow",
    file: "https://cdn.shopify.com/s/files/1/0573/5320/7868/files/Bambu_PLA_Glow_Technical_Data_Sheet.pdf",
    nozzle: [190, 230], bed: [35, 45],
    props: table({
      dens: 1.26, mfp: 155, tg: 55, water: 0.46,
      exy: [2030, 210], ez: [1750, 180], sxy: [32, 3], sz: [26, 3],
      elxy: [8.6, 1.2], elz: [6.5, 0.8],
      bmxy: [2640, 130], bmz: [2230, 110], bsxy: [76, 4], bsz: [55, 3],
      ixy: [8.8, 1.7], iz: [19.8, 1.8],
      opts: { izNote: IMPACT_INVERTED("19,8", "8,8") },
    }),
    anomaly: t(
      "Die Schlagzähigkeit steht in Z mit 19,8 kJ/m² höher als in X-Y mit 8,8 — mehr als das Doppelte quer zur Schicht. Bei FDM ist die Schichtgrenze die schwächste Ebene; ein Prüfkörper bricht dort leichter, nicht schwerer. Alle anderen Größen dieses Blattes verhalten sich erwartungsgemäß (Zugfestigkeit 32 gegen 26, Biegefestigkeit 76 gegen 55), was einen Zahlendreher in genau dieser Zeile nahelegt. Der Z-Wert trägt `low`.",
      "The impact strength is stated higher in Z at 19.8 kJ/m² than in X-Y at 8.8 — more than double across the layers. In FDM the layer boundary is the weakest plane; a specimen breaks there more easily, not less. Every other quantity on this sheet behaves as expected (tensile 32 against 26, flexural 76 against 55), which suggests a transposition in precisely this row. The Z value carries `low`.",
    ),
  },
  {
    id: "bambu-pla-silk-dual-color", material: "pla", name: "Bambu PLA Silk Dual Color",
    file: "https://cdn.shopify.com/s/files/1/0584/7236/6216/files/Bambu_PLA_Silk_Dual_Color_Technical_Data_Sheet.pdf",
    nozzle: [210, 240], bed: [35, 45],
    props: table({
      dens: 1.32, mfp: 152, tg: 57, water: 0.52,
      exy: [1830, 210], ez: [1250, 140], sxy: [27, 4], sz: [18, 4],
      elxy: [3.5, 0.6], elz: [1.7, 0.2],
      bmxy: [2370, 150], bmz: [1840, 160], bsxy: [66, 4], bsz: [21, 5],
      ixy: [24.5, 1.7], iz: [4.6, 1.1],
    }),
    features: t(
      "Das schwächste PLA der Bambu-Reihe: 27 MPa Zugfestigkeit gegen 39 bei PLA Basic, und quer zur Schicht bleiben nur 18 MPa. Die Biegefestigkeit in Z fällt auf 21 MPa gegen 66 längs — ein Verhältnis von 0,32, das schlechteste der PLA-Familie. Silk-Additive machen die Oberfläche glänzend und die Schichthaftung schlecht. Bemerkenswert dagegen die ungekerbte Schlagzähigkeit von 24,5 kJ/m² in X-Y, dem höchsten Wert unter den Bambu-PLA — zäh in der Fläche, schwach zwischen den Schichten.",
      "The weakest PLA in the Bambu range: 27 MPa tensile strength against 39 for PLA Basic, and only 18 MPa remains across the layers. The flexural strength in Z falls to 21 MPa against 66 along — a ratio of 0.32, the worst in the PLA family. Silk additives make the surface glossy and the layer adhesion poor. Remarkable by contrast is the unnotched impact strength of 24.5 kJ/m² in X-Y, the highest among the Bambu PLAs — tough in plane, weak between layers.",
    ),
  },
  {
    id: "bambu-pla-translucent", material: "pla", name: "Bambu PLA Translucent",
    file: "https://store.bblcdn.com/s7/default/729a8bf233e9474db25c8d5be1e64a00/Bambu_PLA_Translucent_Technical_Data_Sheet.pdf",
    nozzle: [200, 240], bed: [35, 65],
    props: table({
      dens: 1.22, mfp: 156, tg: 54, water: 0.34,
      exy: [2880, 190], ez: [2550, 150], sxy: [55.4, 5], sz: [28.9, 4],
      elxy: [11, 3.1], elz: [9.6, 1.7],
      bmxy: [3000, 120], bmz: [2650, 140], bsxy: [85, 3], bsz: [42, 4],
      ixy: [6.7, 2.2], iz: [8.5, 1.2],
      opts: { izNote: IMPACT_INVERTED("8,5", "6,7") },
    }),
    features: t(
      "Das festeste PLA der Bambu-Reihe: 55,4 MPa gegen 39 bei PLA Basic, bei zugleich 11 % Bruchdehnung. Ein durchscheinender Werkstoff, der mechanisch über dem Standardtyp liegt, ist ungewöhnlich — Transparenz kostet sonst Festigkeit.",
      "The strongest PLA in the Bambu range: 55.4 MPa against 39 for PLA Basic, with 11 % elongation at break at the same time. A translucent material that outperforms the standard grade mechanically is unusual — transparency normally costs strength.",
    ),
    anomaly: t(
      "Wie bei PLA Glow steht die Schlagzähigkeit in Z höher als in X-Y (8,5 gegen 6,7 kJ/m²), hier weniger deutlich. Der Z-Wert trägt `low`.",
      "As with PLA Glow the impact strength is stated higher in Z than in X-Y (8.5 against 6.7 kJ/m²), less markedly here. The Z value carries `low`.",
    ),
  },
  {
    id: "bambu-pla-wood", material: "pla", name: "Bambu PLA Wood",
    file: "https://cdn.shopify.com/s/files/1/0584/7236/6216/files/Bambus_PLA_Wood_Technical_Data_Sheet.pdf",
    nozzle: [190, 240], bed: [35, 45],
    props: table({
      dens: 1.21, mfp: 156, tg: 54, water: 1.25,
      exy: [2360, 190], ez: [1770, 150], sxy: [26, 5], sz: [15, 4],
      elxy: [15.3, 3.1], elz: [4.5, 1.7],
      bmxy: [2780, 120], bmz: [1975, 140], bsxy: [55, 4], bsz: [28, 4],
      ixy: [6.3, 2.2], iz: [5.6, 1.2],
    }),
    features: t(
      "Holzgefülltes PLA, und die Füllung kostet: 26 MPa Zugfestigkeit gegen 39 bei PLA Basic. Auffällig ist die Wassersättigung von 1,25 % — fast das Dreifache des ungefüllten PLA (0,46 %) und der höchste Wert der PLA-Familie. Holzfasern nehmen Feuchtigkeit auf, was Lagerung und Trocknung zu einer laufenden Aufgabe macht. Die Bruchdehnung von 15,3 % in X-Y fällt in Z auf 4,5 %; der Werkstoff ist in der Fläche nachgiebig und zwischen den Schichten spröde.",
      "Wood-filled PLA, and the filler costs: 26 MPa tensile strength against 39 for PLA Basic. Striking is the saturated water absorption of 1.25 % — almost three times that of unfilled PLA (0.46 %) and the highest value in the PLA family. Wood fibres take up moisture, which makes storage and drying an ongoing task. The elongation at break of 15.3 % in X-Y falls to 4.5 % in Z; the material is compliant in plane and brittle between layers.",
    ),
  },
  {
    id: "bambu-tpu-85a", material: "tpu-85a", name: "Bambu TPU 85A",
    file: "https://cdn.shopify.com/s/files/1/0645/5876/0155/files/Bambu_TPU_85A_Technical_Data_Sheet.pdf",
    nozzle: [200, 250], bed: [30, 35],
    props: table({
      dens: 1.18, mfp: 177, water: 0.67,
      exy: [6.8, 0.7], ez: [5.2, 0.6], sxy: [12.0, 0.8], sz: [10.5, 0.6],
      elxy: [700, null], elz: [350, null],
      ixy: [124.3, null], iz: [88.5, null],
      opts: {
        elxyNote: { conditions: "Blattangabe „> 700 %“ — untere Schranke, kein Messwert" },
        elzNote: { conditions: "Blattangabe „> 350 %“ — untere Schranke, kein Messwert" },
      },
    }),
    features: t(
      "Das weichste Elastomer im Bestand mit einem Zug-E-Modul von 6,8 MPa — zum Vergleich: Bambu TPU 95A liegt bei 26 MPa. Bemerkenswert ist die Schichthaftung: 10,5 von 12,0 MPa bleiben quer zur Schicht erhalten, ein Verhältnis von 0,88. Weiche Werkstoffe verschweißen besser, weil die Schmelze länger fließfähig bleibt und die Grenzfläche nicht als Sprödbruchebene wirkt. Die Schlagzähigkeit von 124,3 kJ/m² ist der höchste Wert der Datenbank.",
      "The softest elastomer in the dataset with a tensile modulus of 6.8 MPa — for comparison, Bambu TPU 95A sits at 26 MPa. Remarkable is the layer adhesion: 10.5 of 12.0 MPa remain across the layers, a ratio of 0.88. Soft materials weld better because the melt stays flowable longer and the interface does not act as a brittle fracture plane. The impact strength of 124.3 kJ/m² is the highest in the database.",
    ),
    anomaly: t(
      "Bruchdehnung und Schlagzähigkeit stehen ohne Streuungsangabe im Blatt, die Dehnung zudem nur als untere Schranke („> 700 %“ beziehungsweise „> 350 %“). Übernommen ist die Schranke als Wert; die tatsächliche Dehnung liegt darüber.",
      "Elongation at break and impact strength are stated without scatter, the elongation moreover only as a lower bound (“> 700 %” and “> 350 %”). The bound is imported as the value; the actual elongation lies above it.",
    ),
  },
];

/* ------------------------------------------------------------------ Ausgabe */

const out = path.join(ROOT, "data/products");
mkdirSync(out, { recursive: true });

const PRINTED = t(
  "Prüfkörper GEDRUCKT: Das Blatt weist alle mechanischen Kennwerte getrennt nach X-Y und Z aus, und eine Z-Richtung gibt es nur an einem additiv gefertigten Prüfkörper.",
  "Specimens PRINTED: the sheet reports every mechanical value separately for X-Y and Z, and a Z direction exists only on an additively manufactured specimen.",
);

let n = 0;
const byMaterial = new Map();

for (const p of P) {
  const parts = [PRINTED];
  if (p.anomaly) parts.push(t(`Befund zu diesem Datenblatt: ${p.anomaly.de}`, `Finding on this datasheet: ${p.anomaly.en}`));

  const rec = {
    $schema: "../../schema/product.schema.json", schemaVersion: "1.0.0",
    id: p.id, materialId: p.material,
    brand: "Bambu Lab", manufacturer: "Bambu Lab",
    productName: p.name, origin: "China",
    specimenType: "printed",
    specimenNote: t(parts.map((x) => x.de).join("\n\n"), parts.map((x) => x.en).join("\n\n")),
    ...(p.features ? { features: p.features } : {}),
    datasheet: { title: `${p.name} — Technical Data Sheet`, url: p.file, retrievedAt: RETRIEVED },
    productUrl: "https://eu.store.bambulab.com/collections/all",
    properties: {
      ...p.props,
      nozzleTemperature: q(Math.round((p.nozzle[0] + p.nozzle[1]) / 2), "°C", { min: p.nozzle[0], max: p.nozzle[1], conditions: "Herstellerempfehlung" }),
      bedTemperature: q(Math.round((p.bed[0] + p.bed[1]) / 2), "°C", { min: p.bed[0], max: p.bed[1], conditions: "Herstellerempfehlung" }),
    },
    governance: {
      lastReviewed: RETRIEVED,
      reviewedBy: "Claude Code (Erstimport aus Herstellerdatenblatt)",
      sources: [{
        id: "src_tds", type: "manufacturer-tds", publisher: "Bambu Lab",
        productName: p.name, title: `${p.name} — Technical Data Sheet`,
        url: p.file, retrievedAt: RETRIEVED, confidenceCeiling: "high",
        note: t("Herstellerdatenblatt mit gedruckten Prüfkörpern, beiden Orientierungen und Streuungsangaben. Nachzuprüfen am verlinkten Originaldokument.",
                "Manufacturer datasheet with printed specimens, both orientations and scatter figures. Verify against the linked original document."),
      }],
    },
  };

  writeFileSync(path.join(out, `${p.id}.json`), `${JSON.stringify(rec, null, 2)}\n`);
  n++;
  byMaterial.set(p.material, (byMaterial.get(p.material) ?? 0) + 1);
}

console.log(`${n} Bambu-Produkte aus der zweiten Runde geschrieben - alle mit Z-Werten aus demselben Pruefdurchgang.\n`);
console.log("  Werkstofftyp   Produkte");
for (const [m, c] of [...byMaterial.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${m.padEnd(14)}${String(c).padStart(4)}`);
}
console.log("\n  Sieben weitere Blaetter warten auf eine Werkstofftyp-Entscheidung:");
console.log("    PPA-CF (Polyphthalamid) · TPU 90A · PVA · 4x Support-Material");
console.log("  Einen Typ anzulegen heisst dreissig redaktionelle Bewertungen zu vergeben -");
console.log("  das ist eine fachliche Entscheidung, keine Uebertragung.\n");
console.log("  Staerkste Anisotropie des Bestands: PA6-GF mit 75 MPa laengs gegen 27 quer.");
console.log("  Quer bleiben 36 % - bei ungefuelltem PLA sind es 89 %.");
