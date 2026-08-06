/**
 * Neuer Werkstofftyp: PPA-CF (kohlefaserverstaerktes Polyphthalamid).
 *
 * Entschieden in PLAN.md 5a am 2026-08-05. Von elf Typkandidaten war das der einzige, der
 * als neuer Typ uebrig blieb: PVA, BVOH und vier Support-Sorten werden nicht gebraucht,
 * PEEK und PEI liegen ausserhalb des Maschinenrahmens, PCL wartet auf eine zweite Quelle,
 * TPU 90A ist ein Produkt und kein Typ.
 *
 * WAS DIESER TYP MITBRINGT
 * 168 MPa Zugfestigkeit in X-Y - der bisherige Hoechstwert des Bestands liegt bei `paht-cf`
 * mit 120 MPa, also 40 % darunter. Dazu 11.800 MPa Zug-E-Modul, HDT-A von 196 °C und eine
 * Wassersaettigung von nur 1,30 %, was fuer ein Polyamid bemerkenswert wenig ist (PA6-GF
 * liegt bei 2,56 %). Polyphthalamid ist ein teilaromatisches Polyamid; die Ringe in der
 * Kette heben Schmelzpunkt und Formbestaendigkeit und senken die Feuchteaufnahme.
 *
 * UND WAS ER KOSTET: EINE EINZIGE QUELLE
 * Der ganze Typ haengt an einem Blatt - Bambu PPA-CF V1.0. Kein zweiter Hersteller, kein
 * Gegenlesen, keine Streuung ueber Marken. Die Messwerte tragen deshalb `medium` und nicht
 * `high`, und in der Oberflaeche steht dieser Typ mit genau einem Beleg da. Wer ihn
 * auswaehlt, waehlt faktisch dieses eine Produkt.
 *
 * DIE ANISOTROPIE IST DER EIGENTLICHE BEFUND
 * 168 MPa laengs gegen 57 MPa quer - Faktor 0,34. Beim Biegemodul ist es noch deutlicher:
 * 9.860 gegen 3.240 MPa, also 0,33. Der Werkstoff verliert quer zur Schicht zwei Drittel
 * seiner Eigenschaften. Damit ist er in derselben Liga wie PPS-CF (0,28) und PA6-GF (0,36):
 * hervorragend in der Ebene, und in Z ein anderer Werkstoff. Wer ein Bauteil aus PPA-CF
 * auslegt und die Aufbaurichtung nicht kennt, rechnet mit dem Dreifachen dessen, was das
 * Teil traegt.
 *
 * ER LIEGT AM OBEREN RAND DES AUFNAHMEKRITERIUMS
 * PLAN.md 5a nennt als Anhaltspunkt "Duese bis etwa 350 °C, Bett bis etwa 120 °C, keine
 * aktiv beheizte Hochtemperaturkammer". PPA-CF braucht 280-310 °C Duese und 100-120 °C
 * Bett - beides innerhalb -, aber 50-80 °C Kammer. Der bisherige Hoechstwert im Bestand
 * sind 53 °C. Das ist keine Hochtemperaturkammer im Sinne von PEEK (dort 120-160 °C),
 * verschiebt aber die Obergrenze des Bestands nach oben, und das gehoert benannt.
 *
 * DIE 24 BEWERTUNGSSKALEN SIND ABLEITUNGEN, KEINE MESSUNGEN
 * Sie tragen durchgehend `estimated` und stuetzen sich auf die Polymerklasse und die
 * gemessenen Werte desselben Blattes. Wo eine Skala von der naechstliegenden Vergleichstype
 * abweicht, steht der Grund als Notiz daran - nicht als stille Zahl.
 */

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const RETRIEVED = "2026-08-05";
const SHEET = "https://cdn.shopify.com/s/files/1/0584/7236/6216/files/Bambus_PPA-CF_Technical_Data_Sheet.pdf";

const t = (de, en) => ({ de, en });

/** Messwert aus dem Blatt. */
const q = (value, unit, o = {}) => ({
  value, unit,
  ...(o.tolerance != null ? { tolerance: o.tolerance } : {}),
  ...(o.min != null ? { min: o.min } : {}),
  ...(o.max != null ? { max: o.max } : {}),
  ...(o.std ? { testStandard: o.std } : {}),
  ...(o.conditions ? { conditions: o.conditions } : {}),
  ...(o.orientation ? { orientation: o.orientation } : {}),
  source: "src_bambu_tds", confidence: o.confidence ?? "medium",
  ...(o.note ? { note: o.note } : {}),
});

/** Bewertungsskala - immer eine Ableitung, nie eine Messung. */
const r = (value, scale, note) => ({
  value, scale, source: "estimate_reasoning", confidence: "estimated",
  ...(note ? { note } : {}),
});

/** Fachliche Ableitung mit Einheit. */
const e = (value, unit, o = {}) => ({
  value, unit,
  ...(o.derivedFrom ? { derivedFrom: o.derivedFrom } : {}),
  ...(o.conditions ? { conditions: o.conditions } : {}),
  ...(o.orientation ? { orientation: o.orientation } : {}),
  source: "estimate_reasoning", confidence: "estimated",
  ...(o.note ? { note: o.note } : {}),
});

const S527 = "ISO 527 / GB/T 1040";
const S178 = "ISO 178 / GB/T 9341";
const S179 = "ISO 179 / GB/T 1043";

/* ------------------------------------------------------------- Werkstofftyp */

const material = {
  $schema: "../../schema/material.schema.json",
  schemaVersion: "1.0.0",
  id: "ppa-cf",

  identity: {
    name: "PPA-CF",
    family: "PA",
    polymerClass: "semi-crystalline",
    variant: ["CF"],
    filler: { type: "carbon-fibre-chopped" },
    aliases: ["Polyphthalamid CF", "PPA Carbon", "teilaromatisches Polyamid CF", "HTN-CF"],
    trademarkNotice: t(
      "Genannte Handels- und Markennamen sind Marken der jeweiligen Inhaber und dienen ausschließlich der Quellenangabe.",
      "Trade and brand names mentioned are trademarks of their respective owners and serve solely as source attribution.",
    ),
    abstract: t(
      "Polyphthalamid ist ein teilaromatisches Polyamid: In der Kette sitzen Benzolringe, die die Ketten versteifen und ihre Beweglichkeit einschränken. Das hebt Schmelzpunkt und Formbeständigkeit deutlich über die aliphatischen Polyamide und senkt zugleich die Feuchteaufnahme — die Wassersättigung liegt bei 1,30 % gegenüber 2,56 % bei einem glasfaserverstärkten PA6. Mit Kohlefaser gefüllt ergibt das den festesten Werkstoff dieser Datenbank: 168 MPa in der Ebene bei 11.800 MPa Steifigkeit.",
      "Polyphthalamide is a semi-aromatic polyamide: benzene rings sit in the chain, stiffening it and restricting its mobility. That raises melting point and heat deflection markedly above the aliphatic polyamides while lowering moisture uptake — saturated water absorption is 1.30 % against 2.56 % for a glass-fibre reinforced PA6. Filled with carbon fibre this gives the strongest material in this database: 168 MPa in plane at 11,800 MPa stiffness.",
    ),
    positioning: t(
      "Der Werkstoff für Bauteile, die heiß und tragend zugleich sind — Motorraum, Werkzeug, Vorrichtung. Zwei Dinge muss man wissen, bevor man ihn wählt. Erstens verliert er quer zur Schicht zwei Drittel seiner Festigkeit (57 statt 168 MPa); die Aufbaurichtung ist hier keine Feinheit, sondern die Auslegung. Zweitens hängt der gesamte Datensatz an einem einzigen Herstellerdatenblatt — es gibt im Bestand keine zweite Quelle, an der sich die Zahlen prüfen ließen.",
      "The material for parts that are hot and load-bearing at once — engine bay, tooling, fixtures. Two things must be known before choosing it. First, it loses two thirds of its strength across the layers (57 instead of 168 MPa); build direction here is not a detail but the design itself. Second, the entire record rests on a single manufacturer datasheet — there is no second source in the dataset against which the figures could be checked.",
    ),
  },

  mechanics: {
    density: q(1.25, "g/cm³", { std: "ISO 1183" }),
    tensileStrengthXy: q(168, "MPa", { tolerance: 4, std: S527, orientation: "XY" }),
    tensileStrengthZ: q(57, "MPa", { tolerance: 5, std: S527, orientation: "Z" }),
    tensileModulusXy: q(11800, "MPa", { tolerance: 670, std: S527, orientation: "XY" }),
    tensileModulusZ: q(4300, "MPa", { tolerance: 340, std: S527, orientation: "Z" }),
    elongationAtBreakXy: q(3.2, "%", { tolerance: 0.4, std: S527, orientation: "XY" }),
    elongationAtBreakZ: q(0.9, "%", { tolerance: 0.2, std: S527, orientation: "Z" }),
    flexuralStrengthXy: q(208, "MPa", { tolerance: 6, std: S178, orientation: "XY" }),
    flexuralStrengthZ: q(63, "MPa", { tolerance: 4, std: S178, orientation: "Z" }),
    flexuralModulusXy: q(9860, "MPa", { tolerance: 480, std: S178, orientation: "XY" }),
    flexuralModulusZ: q(3240, "MPa", { tolerance: 360, std: S178, orientation: "Z" }),
    charpyUnnotchedXy: q(41.7, "kJ/m²", { tolerance: 2.8, std: S179, orientation: "XY" }),
    charpyUnnotchedZ: q(4.3, "kJ/m²", { tolerance: 0.4, std: S179, orientation: "Z" }),
    charpyNotchedXy: q(6.5, "kJ/m²", { tolerance: 2.3, std: S179, orientation: "XY" }),

    anisotropyFactorTensile: e(0.34, "-", {
      orientation: "Z",
      derivedFrom: ["mechanics.tensileStrengthZ", "mechanics.tensileStrengthXy"],
      conditions: "57 von 168 MPa, beide Operanden aus demselben Blatt und Prüfdurchgang",
      note: t(
        "Quer zur Schicht bleiben 34 % der Zugfestigkeit erhalten. Das Biegemodul bestätigt die Größenordnung unabhängig: 3.240 von 9.860 MPa sind 33 %. Kurzfasern richten sich beim Extrudieren in Bahnrichtung aus und tragen quer dazu nichts bei; zwischen den Schichten hält allein die Polyamid-Matrix. Der Wert liegt damit in derselben Liga wie PPS-CF (0,28) und PA6-GF (0,36) und ist eine Eigenschaft der Faserfüllung, nicht ein Mangel dieses Produkts.",
        "Across the layers 34 % of the tensile strength remains. The flexural modulus confirms the magnitude independently: 3,240 of 9,860 MPa is 33 %. Short fibres align in the extrusion direction and contribute nothing across it; between the layers only the polyamide matrix holds. The value therefore sits in the same league as PPS-CF (0.28) and PA6-GF (0.36) and is a property of the fibre filling, not a defect of this product.",
      ),
    }),
    anisotropyFactorImpact: e(0.10, "-", {
      orientation: "Z",
      derivedFrom: ["mechanics.charpyUnnotchedZ", "mechanics.charpyUnnotchedXy"],
      conditions: "4,3 von 41,7 kJ/m², beide Operanden aus demselben Blatt",
      note: t(
        "Bei der Schlagzähigkeit bricht der Werkstoff quer zur Schicht auf ein Zehntel ein — deutlich drastischer als bei der Zugfestigkeit (0,34). Das ist der Regelfall bei faserverstärkten Typen: Eine Zugprüfung belastet die Schichtgrenze gleichmäßig, ein Schlag trifft sie als Kerbe.",
        "In impact the material collapses across the layers to one tenth — markedly more drastic than in tensile strength (0.34). That is the rule for fibre-reinforced grades: a tensile test loads the layer boundary evenly, an impact hits it as a notch.",
      ),
    }),

    toughness: r(2, "toughness", t(
      "3,2 % Bruchdehnung und 6,5 kJ/m² gekerbte Schlagzähigkeit beschreiben einen spröden Werkstoff. Die ungekerbten 41,7 kJ/m² täuschen darüber hinweg: Sobald eine Kerbe da ist — und eine Schichtgrenze ist eine —, bleibt ein Siebtel. Niedriger als PA6-CF (3), weil dessen Matrix zäher ist; die Aromatenringe im PPA versteifen und verspröden zugleich.",
        "3.2 % elongation at break and 6.5 kJ/m² notched impact describe a brittle material. The unnotched 41.7 kJ/m² are deceptive: once a notch is present — and a layer boundary is one — a seventh remains. Lower than PA6-CF (3) because that matrix is tougher; the aromatic rings in PPA stiffen and embrittle at once.")),
    creepTendency: r(1, "creepTendency", t(
      "Die niedrigste Kriechneigung im Bestand. Teilaromatisches Polyamid mit 196 °C HDT-A und 40 % Faseranteil hält Dauerlast bei erhöhter Temperatur besser als jeder andere hier geführte Werkstoff — genau dafür wird PPA in der Serienfertigung eingesetzt.",
        "The lowest creep tendency in the dataset. Semi-aromatic polyamide with 196 °C HDT-A and a high fibre content holds sustained load at elevated temperature better than any other material listed here — precisely what PPA is used for in series production.")),
    notchSensitivity: r(4, "notchSensitivity", t(
      "6,5 gegen 41,7 kJ/m² — die Kerbe kostet 84 % der Schlagzähigkeit. Scharfe Innenecken, Bohrungen ohne Radius und sichtbare Schichtabsätze sind bei diesem Werkstoff Konstruktionsfehler, keine Schönheitsfragen.",
        "6.5 against 41.7 kJ/m² — the notch costs 84 % of the impact strength. Sharp internal corners, unradiused holes and visible layer steps are design errors with this material, not cosmetic questions.")),
    wearResistance: r(5, "wearResistance"),
    fatigueResistance: r(4, "fatigueResistance", t(
      "Faserverstärkte Polyamide halten schwingende Last gut, solange die Last in der Schichtebene liegt. Quer dazu gilt die Bewertung nicht — dort entscheidet die Schichthaftung.",
        "Fibre-reinforced polyamides withstand cyclic load well as long as the load lies in the layer plane. Across it the rating does not apply — there layer adhesion decides.")),
  },

  thermal: {
    hdtA: q(196, "°C", { std: "ISO 75", conditions: "1,8 MPa (Methode A)" }),
    hdtB: q(227, "°C", { std: "ISO 75", conditions: "0,45 MPa (Methode B)" }),
    glassTransition: q(85, "°C", { std: "DSC", conditions: "10 °C/min" }),
    meltingTemperature: q(258, "°C", { std: "DSC", conditions: "10 °C/min" }),
    recommendedMaxServiceTemperature: e(140, "°C", {
      derivedFrom: ["thermal.hdtA", "thermal.glassTransition"],
      note: t(
        "Keine Blattangabe, sondern eine Ableitung — und bewusst weit unter der HDT-A von 196 °C. Die Wärmeformbeständigkeit misst, wann sich ein Prüfstab unter definierter Last um einen festgelegten Betrag durchbiegt; sie ist kein Dauergebrauchswert. Oberhalb der Glasübergangstemperatur von 85 °C verliert der amorphe Anteil seine Steifigkeit, und unter Dauerlast beginnt Kriechen. 140 °C sind für ein unbelastetes Bauteil vertretbar; unter Last gehört die Zahl deutlich niedriger angesetzt.",
        "Not a sheet figure but a derivation — and deliberately far below the HDT-A of 196 °C. Heat deflection temperature measures when a test bar deflects by a defined amount under a defined load; it is not a continuous service figure. Above the glass transition of 85 °C the amorphous fraction loses its stiffness, and under sustained load creep begins. 140 °C is defensible for an unloaded part; under load the figure belongs markedly lower.",
      ),
    }),
    annealing: {
      possible: { value: true, source: "estimate_reasoning", confidence: "estimated" },
      requiredForDatasheetValues: { value: false, source: "src_bambu_tds", confidence: "medium" },
      note: t(
        "Das Blatt nennt kein Temperprogramm und weist die Prüfkörper auch nicht als getempert aus — die Werte gelten also für den Zustand direkt aus dem Drucker. Bei teilkristallinen Polyamiden hebt Tempern die Kristallinität und damit Formbeständigkeit und Steifigkeit; dass PPA-CF davon profitieren würde, ist naheliegend, aber unbelegt. Ob und wie, sagt der Hersteller nicht.",
        "The sheet names no annealing programme and does not declare the specimens as annealed — the values therefore apply to the as-printed condition. In semi-crystalline polyamides annealing raises crystallinity and with it heat deflection and stiffness; that PPA-CF would benefit is plausible but undocumented. Whether and how, the manufacturer does not say.",
      ),
    },
  },

  processing: {
    nozzleTemperature: q(295, "°C", { min: 280, max: 310, conditions: "Herstellerempfehlung" }),
    bedTemperature: q(110, "°C", { min: 100, max: 120, conditions: "Herstellerempfehlung, glatte oder texturierte PEI-Platte mit Klebestift" }),
    chamberTemperature: q(65, "°C", { min: 50, max: 80, conditions: "Herstellerempfehlung" }),
    chamberRequirement: {
      value: "mandatory", source: "src_bambu_tds", confidence: "medium",
      note: t(
        "Das Blatt nennt 50 bis 80 °C Kammertemperatur — der höchste Wert im gesamten Bestand, bisher lagen 53 °C an der Spitze. Bei 258 °C Schmelzpunkt und teilkristalliner Erstarrung schrumpft der Werkstoff beim Abkühlen stark; ohne temperierte Kammer löst sich das Bauteil von der Platte oder delaminiert zwischen den Schichten. Für kleine Teile mag es notfalls gehen, für die Bauteilgrößen, um die es hier meist geht, nicht.",
        "The sheet states 50 to 80 °C chamber temperature — the highest value in the entire dataset, the previous maximum being 53 °C. At a melting point of 258 °C and semi-crystalline solidification the material shrinks strongly on cooling; without a tempered chamber the part detaches from the plate or delaminates between layers. For small parts it may work at a pinch, for the part sizes usually at issue here it does not.",
      ),
    },
    dryingTemperature: q(120, "°C", { min: 100, max: 140, conditions: "Umluft-Trockenofen, 8 bis 12 h; das Blatt weist ausdrücklich darauf hin, dass ein höherer Wert im Bereich besser trocknet" }),
    dryingTime: q(10, "h", { min: 8, max: 12, conditions: "Umluft-Trockenofen" }),
    printSpeed: q(100, "mm/s", { conditions: "Blattangabe „< 100 mm/s“ — Obergrenze, keine Empfehlung" }),
    maxOverhangAngle: q(70, "°", { conditions: "Blattangabe „~ 70°“" }),
    hardenedNozzleRequired: {
      value: true, source: "src_bambu_tds", confidence: "medium",
      note: t(
        "Kohlefaser schleift Messingdüsen in wenigen Stunden aus. Das Blatt empfiehlt zusätzlich 0,6 mm statt 0,4 mm Düsendurchmesser.",
        "Carbon fibre wears out brass nozzles within hours. The sheet additionally recommends 0.6 mm rather than 0.4 mm nozzle diameter.",
      ),
    },
    minNozzleDiameter: q(0.4, "mm", { conditions: "Blatt nennt 0,4 / 0,6 (empfohlen) / 0,8 mm" }),

    printability: r(1, "printability", t(
      "Die schwierigste Verarbeitung im Bestand. Acht bis zwölf Stunden Trocknung bei 100 bis 140 °C, Lagerung unter 20 % relativer Feuchte, beheizte Kammer, gehärtete Düse, Klebestift auf der Platte — jeder dieser Punkte ist eine eigene Fehlerquelle. Niedriger als PA6-CF (2), das ohne Trockenofen auskommt.",
        "The most difficult processing in the dataset. Eight to twelve hours of drying at 100 to 140 °C, storage below 20 % relative humidity, heated chamber, hardened nozzle, glue stick on the plate — each of these is a failure mode of its own. Lower than PA6-CF (2), which manages without a drying oven.")),
    warpingTendency: r(4, "warpingTendency", t(
      "Teilkristallin mit 258 °C Schmelzpunkt: Der Schrumpf beim Abkühlen ist erheblich. Die Faserfüllung dämpft ihn, die beheizte Kammer fängt den Rest ab — ohne sie ist der Wert praktisch 5.",
        "Semi-crystalline with a 258 °C melting point: shrinkage on cooling is considerable. The fibre filling damps it, the heated chamber catches the rest — without it the value is effectively 5.")),
    hygroscopy: r(3, "hygroscopy", t(
      "1,30 % Wassersättigung ist für ein Polyamid wenig — PA6-GF liegt bei 2,56 %, ungefülltes PA6 höher. Die Aromatenringe im PPA halten weniger Wasser. Trotzdem eine 3 und keine 2: Das Blatt verlangt Trocknung bei 100 bis 140 °C und Lagerung unter 20 % rF, also mehr Aufwand als bei einem PETG, und feuchtes Filament zeigt sich beim Druck sofort als Blasen und Schaum.",
        "1.30 % saturated water absorption is little for a polyamide — PA6-GF sits at 2.56 %, unfilled PA6 higher. The aromatic rings in PPA hold less water. Still a 3 and not a 2: the sheet demands drying at 100 to 140 °C and storage below 20 % RH, so more effort than a PETG, and damp filament shows immediately as bubbles and foaming.")),
    abrasiveness: r(5, "abrasiveness"),
    stringingTendency: r(2, "stringingTendency", t(
      "Das Blatt nennt 0,8 bis 1,4 mm Rückzug bei 20 bis 40 mm/s — kurze Wege, wie sie zu einem faserverstärkten, hochviskosen Werkstoff passen. Fäden sind hier nicht das Hauptproblem.",
        "The sheet states 0.8 to 1.4 mm retraction at 20 to 40 mm/s — short distances, fitting a fibre-reinforced, high-viscosity material. Stringing is not the main problem here.")),
    layerAdhesion: r(1, "layerAdhesion", t(
      "Der schlechteste Wert der Skala, und er folgt direkt aus der Messung: 34 % der Zugfestigkeit und 10 % der Schlagzähigkeit bleiben quer zur Schicht. Das ist keine schlechte Verarbeitung, sondern die Bauart eines kurzfaserverstärkten Werkstoffs.",
        "The worst value on the scale, and it follows directly from the measurement: 34 % of the tensile strength and 10 % of the impact strength remain across the layers. That is not poor processing but the nature of a short-fibre reinforced material.")),
  },

  durability: {
    waterAbsorption: q(1.30, "%", { conditions: "25 °C, 55 % rF, gesättigt" }),
    uvResistance: r(2, "uvResistance", t(
      "Polyamide vergilben und verspröden unter UV. Der schwarze Kohlefaseranteil wirkt als Pigment und bremst das, ersetzt aber keinen UV-Stabilisator; das Blatt nennt keinen.",
        "Polyamides yellow and embrittle under UV. The black carbon fibre content acts as a pigment and slows this, but does not replace a UV stabiliser; the sheet names none.")),
    weatherResistance: r(2, "weatherResistance"),
    hydrolysisResistance: r(3, "hydrolysisResistance", t(
      "Besser als bei aliphatischen Polyamiden: Weniger Amidgruppen je Kettenlänge und geringere Wasseraufnahme bedeuten weniger Angriffsfläche für Hydrolyse. Für Dauerkontakt mit heißem Wasser oder Dampf reicht das trotzdem nicht.",
        "Better than in aliphatic polyamides: fewer amide groups per chain length and lower water uptake mean less surface for hydrolysis. For continuous contact with hot water or steam it is still not enough.")),
    stressCrackingSensitivity: r(2, "stressCrackingSensitivity"),
  },

  compliance: {
    foodContact: {
      status: {
        value: "not-declared", source: "src_bambu_tds", confidence: "medium",
        note: t("Das Datenblatt erklärt keine Lebensmittelkonformität.",
                "The datasheet declares no food contact compliance."),
      },
      partLevelWarning: t(
        "Auch bei einem lebensmittelkonformen Material ist das FDM-BAUTEIL nicht automatisch lebensmittelkonform: die Schichtstruktur bildet Kapillaren und Keimnischen, die sich nicht sicher reinigen lassen.",
        "Even with a food-compliant material the FDM PART is not automatically food safe: the layer structure forms capillaries and bacterial niches that cannot be reliably cleaned.",
      ),
    },
    flameRetardancy: {
      ul94: {
        value: "not-classified", source: "src_bambu_tds", confidence: "medium",
        note: t("Das Blatt führt den Werkstoff unter „Flammability“ schlicht als „Flammable“ und nennt keine UL94-Klasse.",
                "The sheet lists the material under “Flammability” simply as “Flammable” and names no UL 94 class."),
      },
    },
    translucency: {
      value: "opaque", source: "estimate_reasoning", confidence: "estimated",
      note: t("Kohlefaserfüllung macht jeden Werkstoff undurchsichtig schwarz.",
              "Carbon fibre filling renders any material opaque black."),
    },
    esd: {
      classification: {
        value: "insulating", source: "estimate_reasoning", confidence: "estimated",
        note: t(
          "Kurze Kohlefasern in einer isolierenden Matrix bilden keinen durchgehenden Leitpfad, solange der Füllgrad unter der Perkolationsschwelle liegt. Das Blatt nennt keinen Oberflächenwiderstand — die Einstufung ist deshalb eine Ableitung und keine Messung. Wer ESD-Schutz braucht, braucht eine Messung.",
          "Short carbon fibres in an insulating matrix form no continuous conductive path as long as the loading stays below the percolation threshold. The sheet names no surface resistance — the classification is therefore a derivation, not a measurement. Anyone needing ESD protection needs a measurement.",
        ),
      },
    },
  },

  sustainability: {
    bioBasedContent: { value: 0, unit: "%", source: "estimate_reasoning", confidence: "estimated" },
    industriallyCompostable: { value: false, source: "estimate_reasoning", confidence: "estimated" },
    practicalRecyclability: { value: "not-practical-fibre-filled", source: "estimate_reasoning", confidence: "estimated" },
  },

  finishing: {
    surfaceQuality: r(4, "surfaceQuality", t(
      "Kohlefaser ergibt eine matte, gleichmäßige Oberfläche, die Schichtlinien optisch schluckt.",
        "Carbon fibre gives a matte, even surface that optically swallows layer lines.")),
    layerLineVisibility: r(2, "layerLineVisibility"),
    sandability: r(3, "sandability", t(
      "Schleifen legt Fasern frei, die als raue Punkte stehen bleiben. Nassschliff hilft; eine glatte Oberfläche wird es nicht.",
        "Sanding exposes fibres that remain as rough points. Wet sanding helps; a smooth surface it will not become.")),
    fillability: r(3, "fillability"),
    paintAdhesion: r(2, "paintAdhesion", t(
      "Polyamide sind unpolar und schlecht benetzbar; ohne Plasma- oder Primer-Vorbehandlung hält kein Lack dauerhaft.",
        "Polyamides are non-polar and poorly wettable; without plasma or primer pretreatment no paint holds permanently.")),
    bondability: r(2, "bondability"),
    recommendedAdhesives: ["2K-Epoxid (nach Plasma- oder Primer-Vorbehandlung)", "Cyanacrylat mit Aktivator"],
  },

  commercial: {
    priceIndex: r(5, "priceIndex", t(
      "Die teuerste Type des Bestands. Das Blatt weist 0,75 kg je Spule aus statt der üblichen 1 kg — beim Preisvergleich je Kilogramm fällt das leicht unter den Tisch.",
        "The most expensive grade in the dataset. The sheet states 0.75 kg per spool instead of the usual 1 kg — in a per-kilogram price comparison that is easily overlooked.")),
    availability: r(2, "availability", t(
      "Ein Hersteller im Bestand. PPA-Filamente gibt es auch von anderen Anbietern, aber keines davon ist hier mit einem Datenblatt belegt.",
        "One manufacturer in the dataset. PPA filaments exist from other suppliers too, but none of them is documented here with a datasheet.")),
    smallSeriesSuitability: r(2, "smallSeriesSuitability", t(
      "Trockenofen, beheizte Kammer und gehärtete Düse machen jeden Einzelauftrag zu einem Rüstvorgang. Für Kleinserien rechnet sich das erst, wenn die Anforderung den Werkstoff wirklich verlangt.",
        "Drying oven, heated chamber and hardened nozzle make every individual job a setup operation. For small series this pays off only when the requirement genuinely demands the material.")),
    reentsPortfolioStatus: {
      value: "unknown", source: "estimate_reasoning", confidence: "estimated",
      note: t("Noch nicht mit dem Reents3D-Materiallager abgeglichen. Geht per ADR-004 NICHT in das Scoring ein.",
              "Not yet reconciled with the Reents3D material stock. Per ADR-004 this does NOT enter the scoring."),
    },
    spoolSizes: ["0.75 kg"],
  },

  governance: {
    lastReviewed: RETRIEVED,
    reviewedBy: "Claude Code (Erstimport aus Herstellerdatenblatt) - fachliche Freigabe durch Riko Reents ausstehend",
    reviewCycleMonths: 12,
    dataCompleteness: null,
    sources: [{
      id: "src_bambu_tds", type: "manufacturer-tds", publisher: "Bambu Lab",
      productName: "Bambu PPA-CF",
      title: "Bambu Filament Technical Data Sheet — PPA-CF",
      documentVersion: "V1.0",
      url: SHEET, retrievedAt: RETRIEVED, confidenceCeiling: "medium",
      note: t(
        "Prüfkörper GEDRUCKT (290 °C Düse, 110 °C Bett), Kennwerte getrennt nach X-Y und Z, Streuungsangaben durchgehend. Die Obergrenze steht dennoch auf `medium` und nicht auf `high`: Dieser Werkstofftyp hat im ganzen Bestand nur diese eine Quelle, es gibt also keinen zweiten Beleg, an dem sich die Zahlen prüfen ließen.",
        "Specimens PRINTED (290 °C nozzle, 110 °C bed), values separated by X-Y and Z, scatter stated throughout. The ceiling nevertheless stands at `medium` and not `high`: this material type has only this one source in the entire dataset, so there is no second piece of evidence against which the figures could be checked.",
      ),
    }, {
      id: "estimate_reasoning", type: "estimate", publisher: "FDM-Materialberater",
      title: "Fachliche Ableitung ohne Primärquelle", confidenceCeiling: "estimated",
    }],
    openQuestions: [{
      id: "oq_ppa_cf_second_source",
      question: t(
        "Der gesamte Werkstofftyp hängt an einem einzigen Herstellerdatenblatt. Solange keine zweite Quelle vorliegt, ist nicht prüfbar, ob die Werte für PPA-CF allgemein gelten oder nur für diese eine Rezeptur — 168 MPa wären ein außergewöhnlich hoher Wert, und gerade außergewöhnliche Zahlen gehören gegengelesen. Kandidaten wären PPA-CF-Typen anderer Anbieter.",
        "The entire material type rests on a single manufacturer datasheet. As long as no second source exists it cannot be checked whether the values apply to PPA-CF generally or only to this one formulation — 168 MPa would be an exceptionally high figure, and exceptional figures in particular deserve cross-reading. Candidates would be PPA-CF grades from other suppliers.",
      ),
      affectsFields: ["mechanics.tensileStrengthXy", "mechanics.tensileModulusXy", "mechanics.flexuralStrengthXy"],
      blocking: false,
    }, {
      id: "oq_ppa_cf_price",
      question: t(
        "Für diesen Werkstoff liegt kein Preis je Kilogramm vor — er ist der einzige der 42 Typen ohne. Die Preisableitung findet keine Entsprechung im OFD-Marktbestand, weil PPA dort als Werkstoffklasse noch nicht geführt wird. Folge: In der Ansicht „Festigkeit gegen Preis“ fehlt der Werkstoff, und die Kompromissanalyse kann seinen wirtschaftlichen Preis nicht beziffern. Zu erheben über Händlerlistungen, wie in SOURCES.md §5 für alle Typen vorgesehen. Zu beachten ist dabei die Spulengröße von 0,75 kg statt der üblichen 1 kg — wer den Spulenpreis für den Kilopreis hält, rechnet ein Drittel zu günstig.",
        "No price per kilogram is available for this material — it is the only one of the 42 types without. The price derivation finds no counterpart in the OFD market inventory because PPA is not yet carried there as a material class. Consequence: the material is missing from the “strength against price” view, and the trade-off analysis cannot quantify its economic price. To be collected from retailer listings, as foreseen in SOURCES.md §5 for all types. Note the spool size of 0.75 kg rather than the usual 1 kg — anyone taking the spool price for the kilo price calculates a third too cheap.",
      ),
      affectsFields: ["commercial.pricePerKg"],
      blocking: false,
    }],
  },
};

/* ----------------------------------------------------------------- Produkt */

const product = {
  $schema: "../../schema/product.schema.json", schemaVersion: "1.0.0",
  id: "bambu-ppa-cf", materialId: "ppa-cf",
  brand: "Bambu Lab", manufacturer: "Bambu Lab",
  productName: "Bambu PPA-CF", origin: "China",
  specimenType: "printed",
  specimenNote: t(
    "Prüfkörper GEDRUCKT, und das Blatt nennt die Bedingungen vollständig: 290 °C Düse, 110 °C Bett. Alle mechanischen Kennwerte sind getrennt nach X-Y und Z ausgewiesen.",
    "Specimens PRINTED, and the sheet states the conditions in full: 290 °C nozzle, 110 °C bed. All mechanical values are reported separately for X-Y and Z.",
  ),
  features: t(
    "Das einzige Produkt dieses Werkstofftyps im Bestand — der Typ und dieses Produkt sind derzeit dasselbe. Spulengröße 0,75 kg auf Karton, Spule bis 145 °C temperaturbeständig, was zum Trocknen im Ofen bei 100 bis 140 °C passt.",
    "The only product of this material type in the dataset — the type and this product are currently the same thing. Spool size 0.75 kg on cardboard, spool temperature-resistant to 145 °C, which fits oven drying at 100 to 140 °C.",
  ),
  datasheet: { title: "Bambu PPA-CF — Technical Data Sheet", url: SHEET, retrievedAt: RETRIEVED },
  productUrl: "https://eu.store.bambulab.com/collections/all",
  properties: {
    density: q(1.25, "g/cm³", { std: "ISO 1183" }),
    meltFlowRate: q(8.4, "g/10min", { tolerance: 0.7, conditions: "280 °C, 2,16 kg" }),
    meltingTemperature: q(258, "°C", { std: "DSC", conditions: "10 °C/min" }),
    glassTransition: q(85, "°C", { std: "DSC", conditions: "10 °C/min" }),
    vicatA: q(232, "°C", { std: "ISO 306 / GB/T 1633", conditions: "Blatt nennt die Methode nicht (A oder B); als A geführt" }),
    hdtA: q(196, "°C", { std: "ISO 75", conditions: "1,8 MPa" }),
    hdtB: q(227, "°C", { std: "ISO 75", conditions: "0,45 MPa" }),
    waterAbsorption: q(1.30, "%", { conditions: "25 °C, 55 % rF, gesättigt" }),
    tensileModulusXy: q(11800, "MPa", { tolerance: 670, std: S527, orientation: "XY" }),
    tensileModulusZ: q(4300, "MPa", { tolerance: 340, std: S527, orientation: "Z" }),
    tensileStrengthXy: q(168, "MPa", { tolerance: 4, std: S527, orientation: "XY" }),
    tensileStrengthZ: q(57, "MPa", { tolerance: 5, std: S527, orientation: "Z" }),
    elongationAtBreakXy: q(3.2, "%", { tolerance: 0.4, std: S527, orientation: "XY" }),
    elongationAtBreakZ: q(0.9, "%", { tolerance: 0.2, std: S527, orientation: "Z" }),
    flexuralModulusXy: q(9860, "MPa", { tolerance: 480, std: S178, orientation: "XY" }),
    flexuralModulusZ: q(3240, "MPa", { tolerance: 360, std: S178, orientation: "Z" }),
    flexuralStrengthXy: q(208, "MPa", { tolerance: 6, std: S178, orientation: "XY" }),
    flexuralStrengthZ: q(63, "MPa", { tolerance: 4, std: S178, orientation: "Z" }),
    charpyUnnotchedXy: q(41.7, "kJ/m²", { tolerance: 2.8, std: S179, orientation: "XY" }),
    charpyNotchedXy: q(6.5, "kJ/m²", { tolerance: 2.3, std: S179, orientation: "XY" }),
    charpyUnnotchedZ: q(4.3, "kJ/m²", { tolerance: 0.4, std: S179, orientation: "Z" }),
    nozzleTemperature: q(295, "°C", { min: 280, max: 310, conditions: "Herstellerempfehlung" }),
    bedTemperature: q(110, "°C", { min: 100, max: 120, conditions: "Herstellerempfehlung" }),
    chamberTemperature: q(65, "°C", { min: 50, max: 80, conditions: "Herstellerempfehlung" }),
    dryingTemperature: q(120, "°C", { min: 100, max: 140, conditions: "Umluft-Trockenofen, 8 bis 12 h" }),
    printSpeed: q(100, "mm/s", { conditions: "Blattangabe „< 100 mm/s“ — Obergrenze" }),
    minNozzleDiameter: q(0.4, "mm", { conditions: "0,4 / 0,6 (empfohlen) / 0,8 mm" }),
  },
  governance: {
    lastReviewed: RETRIEVED,
    reviewedBy: "Claude Code (Erstimport aus Herstellerdatenblatt)",
    sources: [{
      id: "src_tds", type: "manufacturer-tds", publisher: "Bambu Lab",
      productName: "Bambu PPA-CF", title: "Bambu PPA-CF — Technical Data Sheet",
      documentVersion: "V1.0", url: SHEET, retrievedAt: RETRIEVED, confidenceCeiling: "high",
      note: t("Herstellerdatenblatt mit gedruckten Prüfkörpern, beiden Orientierungen und Streuungsangaben. Nachzuprüfen am verlinkten Originaldokument.",
              "Manufacturer datasheet with printed specimens, both orientations and scatter figures. Verify against the linked original document."),
    }],
  },
};

/* ------------------------------------------------------------------ Ausgabe */

writeFileSync(path.join(ROOT, "data/materials/ppa-cf.json"), `${JSON.stringify(material, null, 2)}\n`);
writeFileSync(path.join(ROOT, "data/products/bambu-ppa-cf.json"), `${JSON.stringify(product, null, 2)}\n`);

/* Wie viele Aussagen sind das, und wie viele davon gemessen? */
let facts = 0, est = 0, scales = 0;
const walk = (n) => {
  if (!n || typeof n !== "object") return;
  if (Array.isArray(n)) return n.forEach(walk);
  if ("source" in n && "confidence" in n) { facts++; if (n.confidence === "estimated") est++; if ("scale" in n) scales++; }
  Object.values(n).forEach(walk);
};
walk(material);

console.log("Werkstofftyp `ppa-cf` und Produkt `bambu-ppa-cf` geschrieben.\n");
console.log(`  ${facts} belegte Aussagen, davon ${est} abgeleitet und ${scales} Bewertungsskalen.`);
console.log("  Alle Messwerte stammen aus EINEM Blatt: Bambu PPA-CF V1.0.\n");
console.log("  Zugfestigkeit  168 MPa in X-Y  -  der hoechste Wert des Bestands (bisher paht-cf mit 120)");
console.log("  Anisotropie    0,34            -  quer bleiben 57 MPa, das Biegemodul bestaetigt mit 0,33");
console.log("  Schlagzaeh.    0,10            -  quer bricht der Werkstoff auf ein Zehntel ein");
console.log("  Kammer         50-80 °C        -  neuer Hoechstwert im Bestand, bisher 53 °C\n");
console.log("  Offene Frage `oq_ppa_cf_second_source`: Der ganze Typ haengt an einer Quelle.");
console.log("  168 MPa sind aussergewoehnlich, und gerade aussergewoehnliche Zahlen gehoeren gegengelesen.");
