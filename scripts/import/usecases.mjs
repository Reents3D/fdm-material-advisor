/**
 * Anwendungsfälle mit vorbefülltem Anforderungsprofil.
 *
 * WOZU
 * Der Assistent stellt sechs Fragen. Wer den Werkstoff nicht kennt, kennt oft auch die
 * Antworten nicht — "welche Dauergebrauchstemperatur?" ist keine Frage, die ein Einkäufer
 * beantworten kann. Ein Anwendungsfall dreht das um: Man erkennt seine Situation wieder
 * und bekommt das Profil geschenkt, samt Begründung, warum genau diese Werte gesetzt sind.
 *
 * REGEL FÜR DIESE DATEI
 * Jeder gesetzte Wert braucht einen Grund im Feld `rationale`. Ein vorbefülltes Profil,
 * das seine Annahmen nicht offenlegt, ist eine Blackbox — und damit genau das, wogegen
 * dieses Werkzeug gebaut ist. Die Werte sind Startpunkte, keine Vorschriften; die
 * Oberfläche macht das kenntlich und lässt jeden Wert im Assistenten ändern.
 *
 * Erzeugt schema/usecase.schema.json und data/usecases/*.json.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const t = (de, en) => ({ de, en });

/* ============================================================== SCHEMA ==== */

const schema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://reents3d.github.io/fdm-material-advisor/schema/usecase.schema.json",
  title: "Anwendungsfall mit vorbefuelltem Anforderungsprofil",
  type: "object",
  additionalProperties: false,
  required: ["schemaVersion", "id", "title", "context", "requirements", "rationale", "governance"],
  properties: {
    $schema: { type: "string" },
    schemaVersion: { type: "string" },
    id: { type: "string", pattern: "^[a-z0-9-]+$" },
    group: { enum: ["mechanik", "thermik", "umgebung", "regulatorik", "fertigung", "optik"] },
    title: { $ref: "#/$defs/i18n" },
    context: { $ref: "#/$defs/i18n", description: "Wer hat dieses Problem, und woran erkennt man es." },
    /* Teilmenge von Requirements. Bewusst ohne additionalProperties:false erweiterbar,
       aber jedes Feld hier muss in src/engine/types.ts existieren. */
    requirements: {
      type: "object", minProperties: 1, additionalProperties: false,
      properties: {
        serviceTemperatureC: { type: "number" },
        chamberAvailable: { type: "boolean" },
        hardenedNozzleAvailable: { type: "boolean" },
        annealingOvenAvailable: { type: "boolean" },
        outdoorYears: { type: "number" },
        foodContact: { type: "boolean" },
        flameClass: { enum: ["V-0", "V-1", "V-2", "HB"] },
        esd: { type: "boolean" },
        maxEdgeMm: { type: "number" },
        flexible: { type: "boolean" },
        minTensileStrengthMPa: { type: "number" },
        chemicals: { type: "array", items: { type: "string" } },
        weights: { type: "object", additionalProperties: { type: "number", minimum: 0, maximum: 5 } },
      },
    },
    /* Je gesetztem Feld eine Begruendung. Schluessel = Feldname aus requirements. */
    rationale: {
      type: "object", minProperties: 1,
      additionalProperties: { $ref: "#/$defs/i18n" },
    },
    caveat: { $ref: "#/$defs/i18n", description: "Was dieses Profil NICHT abdeckt." },
    governance: {
      type: "object", required: ["lastReviewed", "reviewedBy"], additionalProperties: false,
      properties: {
        lastReviewed: { type: "string", format: "date" },
        reviewedBy: { type: "string" },
      },
    },
  },
  $defs: {
    i18n: {
      type: "object", required: ["de", "en"], additionalProperties: false,
      properties: { de: { type: "string", minLength: 1 }, en: { type: "string", minLength: 1 } },
    },
  },
};

/* =========================================================== ANWENDUNGEN === */
/* w = Gewichte, r = Begruendungen je Feld. */

const U = [
  { id: "esd-vorrichtung", group: "regulatorik",
    title: t("Vorrichtung für die Elektronikfertigung", "Jig for electronics manufacturing"),
    context: t("Aufnahmen, Ablagen und Handhabungshilfen, die Baugruppen berühren. Elektrostatische Entladung zerstört Bauteile unbemerkt — der Ausfall zeigt sich oft erst beim Kunden.",
               "Fixtures, trays and handling aids that touch assemblies. Electrostatic discharge destroys components unnoticed — the failure often shows up only at the customer."),
    req: { esd: true, serviceTemperatureC: 60, minTensileStrengthMPa: 30,
      weights: { strength: 2, printability: 3, price: 3, availability: 3, stiffness: 3 } },
    r: { esd: t("Der eigentliche Zweck. Kohlenstofffaser allein genügt nicht — es braucht eine gemessene Einstufung im ableitfähigen Bereich.",
                "The actual purpose. Carbon fibre alone is not enough — a measured classification in the dissipative range is required."),
      serviceTemperatureC: t("60 °C deckt Handhabung nahe Lötprozessen und aufgeheizte Hallen ab, ohne gleich alles außer Hochtemperaturwerkstoffen auszuschließen.",
                             "60 °C covers handling near soldering and warm halls without immediately excluding everything but high-temperature materials."),
      minTensileStrengthMPa: t("Eine Vorrichtung muss Handhabungskräfte aushalten; 30 MPa schließt weiche Elastomere aus, die für Aufnahmen ungeeignet sind.",
                               "A fixture must withstand handling forces; 30 MPa rules out soft elastomers unsuitable for fixtures.") },
    caveat: t("Deckt den Werkstoff ab, nicht die Erdung. Ein ableitfähiges Bauteil wirkt nur, wenn es auch angebunden ist.",
              "Covers the material, not the earthing. A dissipative part only works if it is actually bonded.") },

  { id: "aussengehaeuse-5-jahre", group: "umgebung",
    title: t("Außengehäuse, fünf Jahre Bewitterung", "Outdoor enclosure, five years of weathering"),
    context: t("Gehäuse für Sensorik, Beschilderung oder Technik im Freien. Der häufigste Fehler ist PLA: es hält den ersten Sommer und versprödet dann.",
               "Housings for sensors, signage or equipment outdoors. The most common mistake is PLA: it survives the first summer and then embrittles."),
    req: { outdoorYears: 5, serviceTemperatureC: 70,
      weights: { outdoor: 5, strength: 2, price: 2, printability: 2 } },
    r: { outdoorYears: t("Fünf Jahre ist die Schwelle, ab der die Engine nur noch belegt witterungsfeste Werkstoffe zulässt.",
                         "Five years is the threshold above which the engine admits only demonstrably weather-resistant materials."),
      serviceTemperatureC: t("Ein dunkles Gehäuse in der Sonne erreicht deutlich mehr als die Lufttemperatur. 70 °C ist eine realistische Untergrenze.",
                             "A dark enclosure in the sun reaches well above air temperature. 70 °C is a realistic lower bound.") },
    caveat: t("Farbe entscheidet mit: Weiß und Hellgrau altern deutlich langsamer als Schwarz.",
              "Colour matters: white and light grey age markedly slower than black.") },

  { id: "motorraum", group: "thermik",
    title: t("Halterung im Motorraum", "Bracket in an engine bay"),
    context: t("Dauerwarme Umgebung mit Öl-, Kraftstoff- und Vibrationsbelastung. Hier scheitern die meisten Standardwerkstoffe an der Temperatur, nicht an der Festigkeit.",
               "A permanently warm environment with oil, fuel and vibration. Most standard materials fail here on temperature, not on strength."),
    req: { serviceTemperatureC: 120, minTensileStrengthMPa: 50, chemicals: ["chem_mineral_oil"],
      weights: { temperature: 5, strength: 4, stiffness: 4, chemical: 4, price: 1 } },
    r: { serviceTemperatureC: t("120 °C Dauerbetrieb ist im Motorraum die realistische Untergrenze, kurzzeitig deutlich mehr.",
                                "120 °C continuous is the realistic lower bound in an engine bay, with far more short-term."),
      minTensileStrengthMPa: t("Eine tragende Halterung unter Vibration braucht Reserve.", "A load-bearing bracket under vibration needs headroom."),
      chemicals: t("Öl ist im Motorraum unvermeidbar und schließt einen Teil der Werkstoffe aus.",
                   "Oil is unavoidable in an engine bay and rules out part of the field.") } },

  { id: "lebensmittelnah", group: "regulatorik",
    title: t("Lebensmittelnahe Anwendung", "Food-adjacent application"),
    context: t("Ausgussformen, Schablonen, Behälter. Der entscheidende Punkt wird fast immer übersehen: Auch ein lebensmittelkonformes Material ergibt kein lebensmittelkonformes Bauteil.",
               "Moulds, templates, containers. The decisive point is almost always missed: even a food-compliant material does not make a food-compliant part."),
    req: { foodContact: true, serviceTemperatureC: 70,
      weights: { printability: 3, surface: 4, price: 3 } },
    r: { foodContact: t("Filtert auf Werkstoffe mit deklarierter Konformität — eine sehr kurze Liste.",
                        "Filters for materials with declared compliance — a very short list."),
      serviceTemperatureC: t("70 °C deckt Handspülen ab. Für die Spülmaschine ist deutlich mehr nötig.",
                             "70 °C covers hand washing. A dishwasher needs considerably more.") },
    caveat: t("Dieses Profil liefert derzeit KEIN Ergebnis — kein einziger Werkstoff der Datenbank trägt eine deklarierte Lebensmittelkonformität. Das ist keine Lücke der Erfassung, sondern die Lage: Filamenthersteller lassen das fast nie prüfen. Und selbst mit konformem Material gilt: Die Schichtstruktur eines FDM-Bauteils bildet Kapillaren, in denen sich Keime halten. Für wiederverwendbare Teile mit direktem Lebensmittelkontakt ist FDM ohne Versiegelung das falsche Verfahren.",
              "This profile currently returns NO result — not a single material in the database carries a declared food-contact compliance. That is not a gap in our collection but the state of the market: filament makers almost never have it tested. And even with a compliant material: the layer structure of an FDM part forms capillaries where bacteria persist. For reusable parts in direct food contact, unsealed FDM is the wrong process.") },

  { id: "bahn-schaltschrank", group: "regulatorik",
    title: t("Bahn- und Schaltschrankteil", "Rail and switchgear part"),
    context: t("Anwendungen mit gefordertem Brandschutzzeugnis. Herstellerformulierungen wie „selbstverlöschend“ sind hier wertlos — verlangt wird eine Einstufung.",
               "Applications requiring a fire certificate. Manufacturer wording such as “self-extinguishing” is worthless here — a classification is demanded."),
    req: { flameClass: "V-0", serviceTemperatureC: 80,
      weights: { temperature: 3, strength: 3, availability: 2, price: 1 } },
    r: { flameClass: t("V-0 ist die Einstufung, die in Bahn- und Schaltschrankspezifikationen üblicherweise gefordert wird.",
                       "V-0 is the classification usually demanded in rail and switchgear specifications."),
      serviceTemperatureC: t("Schaltschränke erreichen im Betrieb regelmäßig 80 °C.",
                             "Switchgear cabinets regularly reach 80 °C in operation.") },
    caveat: t("Dieses Profil liefert derzeit KEIN Ergebnis, und das ist der Befund: Der einzige V-0-Werkstoff der Datenbank (PC-FR) ist konservativ mit 75 °C Dauergebrauchstemperatur geführt und scheitert damit knapp an den 80 °C. Die Ergebnisseite nennt ihn als Beinahe-Treffer samt Abstand. Zusätzlich gilt: Die Werkstoffeinstufung ersetzt keine Bauteilprüfung — UL94 wird an genormten Stäbchen definierter Dicke geprüft, nicht an Ihrem Bauteil.",
              "This profile currently returns NO result, and that is the finding: the only V-0 material in the database (PC-FR) is conservatively rated at 75 °C continuous and therefore just misses the 80 °C mark. The results page names it as a near miss with the margin. In addition: the material classification does not replace part testing — UL94 is tested on standard bars of defined thickness, not on your part.") },

  { id: "messebau-xxl", group: "fertigung",
    title: t("Messebau-Großteil", "Large-format exhibition part"),
    context: t("Figuren, Buchstaben, Verkleidungen über einen Meter. Der begrenzende Faktor ist fast nie die Festigkeit, sondern Verzug und Bauzeit.",
               "Figures, letters, cladding over a metre. The limiting factor is almost never strength but warping and build time."),
    req: { maxEdgeMm: 1800, serviceTemperatureC: 50,
      weights: { lowWarping: 5, printability: 4, price: 4, surface: 4, strength: 1 } },
    r: { maxEdgeMm: t("1800 mm entspricht der Kante, die in einem Stück gefertigt werden soll. Werkstoffe mit starkem Verzug scheiden in dieser Größe praktisch aus.",
                      "1800 mm is the edge to be produced in one piece. Materials with strong warping are effectively out at this size."),
      serviceTemperatureC: t("Innenraum, aber Scheinwerfer und Sonneneinstrahlung durch Hallenglas mitgedacht.",
                             "Indoors, but allowing for spotlights and sunlight through hall glazing.") } },

  { id: "dichtung-balg", group: "mechanik",
    title: t("Dichtung, Balg oder Dämpfer", "Seal, bellows or damper"),
    context: t("Bauteile, die nachgeben und zurückfedern müssen. Hier zählt Shore-Härte mehr als jede Festigkeitsangabe.",
               "Parts that must yield and spring back. Shore hardness matters more here than any strength figure."),
    req: { flexible: true, serviceTemperatureC: 70,
      weights: { toughness: 5, chemical: 3, printability: 2 } },
    r: { flexible: t("Schränkt auf Elastomere ein — alles andere wäre für diese Aufgabe zu steif.",
                     "Restricts to elastomers — anything else is too rigid for this task."),
      serviceTemperatureC: t("70 °C deckt die meisten Maschinen- und Fahrzeuganwendungen ab.",
                             "70 °C covers most machinery and vehicle applications.") },
    caveat: t("Die Dichtwirkung eines gedruckten Teils hängt an der Schichthaftung. Für druckbeaufschlagte Dichtungen ist eine eigene Prüfung zwingend.",
              "The sealing effect of a printed part depends on layer adhesion. For pressurised seals a dedicated test is mandatory.") },

  { id: "funktionsprototyp", group: "fertigung",
    title: t("Funktionsprototyp, schnell und günstig", "Functional prototype, fast and cheap"),
    context: t("Passt es, greift es, sieht es richtig aus. Der Prototyp muss keine Lasten tragen, sondern morgen fertig sein.",
               "Does it fit, does it grip, does it look right. The prototype need not carry loads, it needs to be ready tomorrow."),
    req: { serviceTemperatureC: 40,
      weights: { printability: 5, price: 5, availability: 5, surface: 3, strength: 1 } },
    r: { serviceTemperatureC: t("Raumtemperatur mit etwas Reserve. Bewusst niedrig, damit die einfach zu druckenden Werkstoffe im Feld bleiben.",
                                "Room temperature with a little headroom. Deliberately low so the easy-printing materials stay in the field.") } },

  { id: "lehre-messmittel", group: "mechanik",
    title: t("Lehre oder Messmittel", "Gauge or measuring aid"),
    context: t("Bauteile, deren Maß über die Zeit stimmen muss. Kriechen und Feuchteaufnahme sind hier gefährlicher als ein niedriger Festigkeitswert.",
               "Parts whose dimensions must hold over time. Creep and moisture uptake are more dangerous here than a low strength figure."),
    req: { serviceTemperatureC: 50, minTensileStrengthMPa: 45,
      weights: { stiffness: 5, chemical: 4, price: 1 } },
    r: { serviceTemperatureC: t("Werkstattklima mit Reserve.", "Workshop climate with headroom."),
      minTensileStrengthMPa: t("Ein Messmittel wird angefasst und abgelegt; es muss den Alltag überstehen.",
                               "A gauge is handled and put down; it must survive daily use.") },
    caveat: t("Ein gedrucktes Messmittel ersetzt keine kalibrierte Lehre. Für rückführbare Messungen ist FDM ungeeignet.",
              "A printed gauge does not replace a calibrated one. For traceable measurement FDM is unsuitable.") },

  { id: "kuehlschmierstoff", group: "umgebung",
    title: t("Vorrichtung mit Kühlschmierstoff-Kontakt", "Fixture in contact with coolant"),
    context: t("Werkstückaufnahmen an der Werkzeugmaschine. PETG ist hier der beliebteste und zugleich riskanteste Griff — Kühlschmierstoff greift es an.",
               "Workpiece fixtures on machine tools. PETG is the most popular and simultaneously riskiest choice here — coolant attacks it."),
    req: { chemicals: ["chem_coolant_mwf"], serviceTemperatureC: 60, minTensileStrengthMPa: 40,
      weights: { chemical: 5, strength: 3, stiffness: 4, price: 2 } },
    r: { chemicals: t("Der entscheidende Filter. Ohne ihn landet man fast zwangsläufig bei PETG.",
                      "The decisive filter. Without it one almost inevitably ends up with PETG."),
      serviceTemperatureC: t("Kühlschmierstoff wird warm, die Halle ebenfalls.", "Coolant gets warm, and so does the hall."),
      minTensileStrengthMPa: t("Spannkräfte wirken dauerhaft.", "Clamping forces act permanently.") } },

  { id: "sichtteil-lackiert", group: "optik",
    title: t("Lackiertes Sichtteil", "Painted visible part"),
    context: t("Modelle, Attrappen, Verkleidungen mit Anspruch an die Oberfläche. Entscheidend ist, ob der Werkstoff Lack annimmt und ob er sich spachteln lässt.",
               "Models, mock-ups and cladding with surface requirements. What matters is whether the material accepts paint and can be filled."),
    req: { serviceTemperatureC: 50,
      weights: { surface: 5, paintability: 5, printability: 4, price: 3, strength: 1 } },
    r: { serviceTemperatureC: t("Innenraum. Bewusst niedrig gehalten, damit die gut zu veredelnden Werkstoffe nicht ausgefiltert werden.",
                                "Indoors. Deliberately low so the materials that finish well are not filtered out.") } },

  { id: "transluzent", group: "optik",
    title: t("Lichtdurchlässiges Bauteil", "Light-transmitting part"),
    context: t("Leuchtenabdeckungen, Lichtleiter, Lithophanien. Wichtig zu wissen: Echte Klarsicht liefert FDM nicht — die Schichtstruktur streut immer.",
               "Luminaire covers, light guides, lithophanes. Important to know: FDM does not deliver true clarity — the layer structure always scatters."),
    req: { serviceTemperatureC: 60,
      weights: { surface: 4, printability: 4, outdoor: 3, price: 2 } },
    r: { serviceTemperatureC: t("Leuchtmittel erwärmen die Abdeckung; 60 °C ist bei LED eine vernünftige Annahme.",
                                "Lamps warm the cover; 60 °C is a sensible assumption with LEDs.") },
    caveat: t("Transluzent heißt lichtdurchlässig, nicht klar. Wer Klarsicht braucht, ist bei SLA oder Fräsen aus Acrylglas richtig.",
              "Translucent means light-transmitting, not clear. Anyone needing clarity is better served by SLA or machined acrylic.") },

  { id: "gleitlager", group: "mechanik",
    title: t("Gleitlager oder Verschleißteil", "Plain bearing or wear part"),
    context: t("Buchsen, Führungen, Zahnräder. Nicht die Festigkeit entscheidet, sondern Verschleißwiderstand und Kriechverhalten unter Dauerlast.",
               "Bushings, guides, gears. Not strength decides but wear resistance and creep under sustained load."),
    req: { serviceTemperatureC: 80, minTensileStrengthMPa: 45,
      weights: { toughness: 5, stiffness: 5, strength: 3, price: 2 } },
    r: { serviceTemperatureC: t("Reibung erzeugt Wärme; die Umgebungstemperatur ist nicht die Bauteiltemperatur.",
                                "Friction generates heat; ambient temperature is not part temperature."),
      minTensileStrengthMPa: t("Ein Lager trägt und muss Flächenpressung aushalten.", "A bearing carries load and must withstand surface pressure.") } },

  { id: "schnappverbindung", group: "mechanik",
    title: t("Schnappverbindung oder Clip", "Snap fit or clip"),
    context: t("Bauteile, die sich beim Fügen verformen und danach halten müssen. Ein steifer, fester Werkstoff ist hier oft die falsche Wahl — er bricht beim ersten Einrasten.",
               "Parts that deform on assembly and must hold afterwards. A stiff, strong material is often the wrong choice here — it breaks on first engagement."),
    req: { serviceTemperatureC: 60,
      weights: { toughness: 5, printability: 3, price: 2 } },
    r: { serviceTemperatureC: t("Innenanwendung mit Reserve.", "Indoor application with headroom.") },
    caveat: t("Die Orientierung entscheidet: Ein Clip, dessen Biegung quer zu den Schichten liegt, bricht deutlich früher. Achten Sie auf den Anisotropiefaktor.",
              "Orientation decides: a clip bending across the layers breaks far sooner. Watch the anisotropy factor.") },

  { id: "leichtbau", group: "mechanik",
    title: t("Leichtbauteil, Drohne oder Bewegtmasse", "Lightweight part, drone or moving mass"),
    context: t("Jedes Gramm zählt. Gesucht ist nicht die höchste Festigkeit, sondern das beste Verhältnis aus Steifigkeit und Dichte.",
               "Every gram counts. What is sought is not the highest strength but the best ratio of stiffness to density."),
    req: { serviceTemperatureC: 60, minTensileStrengthMPa: 40,
      weights: { stiffness: 5, strength: 4, lightweight: 5, toughness: 3, price: 1 } },
    r: { serviceTemperatureC: t("Antriebe und Elektronik erwärmen die Struktur.", "Drives and electronics warm the structure."),
      minTensileStrengthMPa: t("Tragende Struktur — unter 40 MPa wird es dünn.", "Load-bearing structure — below 40 MPa it gets thin.") } },

  { id: "sterilisierbar", group: "thermik",
    title: t("Autoklavierbares Teil", "Autoclavable part"),
    context: t("Halterungen und Hilfsmittel, die im Dampfautoklaven bei 121 °C sterilisiert werden. Die Kombination aus Temperatur, Druck und Feuchte schließt fast alles aus.",
               "Fixtures and aids sterilised in a steam autoclave at 121 °C. The combination of temperature, pressure and moisture rules out almost everything."),
    req: { serviceTemperatureC: 125, chemicals: ["chem_water"],
      weights: { temperature: 5, chemical: 5, stiffness: 4, price: 1 } },
    r: { serviceTemperatureC: t("121 °C Autoklav plus Sicherheitsabstand.", "121 °C autoclave plus a safety margin."),
      chemicals: t("Heißdampf ist die eigentliche Belastung — Hydrolysebeständigkeit entscheidet.",
                   "Steam is the actual load — hydrolysis resistance decides.") },
    caveat: t("Medizinprodukte unterliegen eigenen Zulassungspflichten. Dieses Profil trifft keine Aussage zur Biokompatibilität.",
              "Medical devices are subject to their own approval requirements. This profile makes no statement about biocompatibility.") },

  { id: "kaelte", group: "umgebung",
    title: t("Bauteil im Kalten", "Part in the cold"),
    context: t("Außentechnik im Winter, Kühlhaus, Transport. Viele Werkstoffe verlieren unter null ihre Zähigkeit und brechen spröde, wo sie bei Raumtemperatur nachgeben.",
               "Outdoor equipment in winter, cold stores, transport. Many materials lose their toughness below zero and fracture brittly where they would yield at room temperature."),
    req: { outdoorYears: 2, serviceTemperatureC: 40,
      weights: { toughness: 5, outdoor: 4, price: 2 } },
    r: { outdoorYears: t("Zwei Jahre Außeneinsatz als Mindestanforderung an die Witterungsbeständigkeit.",
                         "Two years outdoors as a minimum requirement on weather resistance."),
      serviceTemperatureC: t("Die obere Grenze bleibt niedrig — die Anforderung liegt am unteren Ende.",
                             "The upper limit stays low — the requirement is at the lower end.") },
    caveat: t("Die Datenbank führt Kennwerte überwiegend bei 23 °C. Wo ein Datenblatt Werte bei −30 °C nennt, steht das am Produkt — achten Sie darauf.",
              "The database holds values mostly at 23 °C. Where a datasheet gives figures at −30 °C it is noted on the product — look for it.") },

  { id: "hochtemperatur-vorrichtung", group: "thermik",
    title: t("Vorrichtung über 200 °C", "Fixture above 200 °C"),
    context: t("Lötrahmen, Ofenhilfsmittel, Prüfaufnahmen. In diesem Bereich bleiben nur wenige Werkstoffe — und die stellen hohe Ansprüche an die Anlage.",
               "Soldering frames, oven aids, test fixtures. Only a few materials remain in this range — and they demand a lot of the machine."),
    req: { serviceTemperatureC: 200, chamberAvailable: true, hardenedNozzleAvailable: true,
      weights: { temperature: 5, stiffness: 4, price: 1, printability: 1 } },
    r: { serviceTemperatureC: t("200 °C Dauerbetrieb ist die Grenze, an der praktisch nur noch Hochtemperatur-Compounds bleiben.",
                                "200 °C continuous is the boundary where practically only high-temperature compounds remain."),
      chamberAvailable: t("Ohne beheizte Kammer ist in diesem Bereich nichts verarbeitbar — die Angabe verhindert unerreichbare Empfehlungen.",
                          "Without a heated chamber nothing in this range is processable — the setting prevents unattainable recommendations."),
      hardenedNozzleAvailable: t("Die Werkstoffe dieser Klasse sind durchweg faserverstärkt und abrasiv.",
                                 "Materials in this class are consistently fibre-reinforced and abrasive.") } },

  { id: "chemiewanne", group: "umgebung",
    title: t("Behälter mit Laugenkontakt", "Container in contact with alkali"),
    context: t("Wannen, Einsätze und Abdeckungen in Reinigungs- und Galvanikanlagen. Polyester und Polycarbonat scheiden hier aus, obwohl sie sonst naheliegen.",
               "Tanks, inserts and covers in cleaning and plating lines. Polyesters and polycarbonate are out here, though they would otherwise be obvious."),
    req: { chemicals: ["chem_dilute_alkali"], serviceTemperatureC: 60,
      weights: { chemical: 5, stiffness: 3, price: 3, printability: 3 } },
    r: { chemicals: t("Verdünnte Lauge greift Polyester an — PETG und PC fallen dadurch aus dem Feld.",
                      "Dilute alkali attacks polyesters — PETG and PC drop out of the field."),
      serviceTemperatureC: t("Reinigungsbäder werden beheizt.", "Cleaning baths are heated.") } },

  { id: "ohne-kammer", group: "fertigung",
    title: t("Serienteil ohne geschlossenen Bauraum", "Production part without an enclosure"),
    context: t("Die häufigste reale Einschränkung: Die vorhandene Anlage hat keine beheizte Kammer. Empfehlungen, die eine voraussetzen, sind dann wertlos.",
               "The most common real-world constraint: the available machine has no heated chamber. Recommendations that assume one are then worthless."),
    req: { chamberAvailable: false, hardenedNozzleAvailable: false, serviceTemperatureC: 80,
      weights: { printability: 5, lowWarping: 5, price: 4, availability: 4, temperature: 3 } },
    r: { chamberAvailable: t("Schließt alle Werkstoffe aus, die eine beheizte Kammer zwingend brauchen.",
                             "Excludes every material that mandatorily requires a heated chamber."),
      hardenedNozzleAvailable: t("Ohne gehärtete Düse fallen die faserverstärkten Typen weg — sonst zerstören sie die Düse binnen Stunden.",
                                 "Without a hardened nozzle the fibre-filled grades drop out — otherwise they destroy the nozzle within hours."),
      serviceTemperatureC: t("80 °C ist die Hürde, an der es ohne Kammer eng wird. Genau das soll das Profil zeigen.",
                             "80 °C is the hurdle where it gets tight without a chamber. That is exactly what this profile should reveal.") } },
];

/* Die Gewichtungs-IDs muessen zu src/engine/criteria.ts passen. Ein Tippfehler wuerde
   sonst still ignoriert und das Profil waere wirkungslos. */
const VALID_WEIGHTS = new Set(["strength", "stiffness", "layerAdhesion", "toughness", "temperature",
  "outdoor", "chemical", "printability", "lowWarping", "xxl", "surface", "paintability",
  "lightweight", "price", "availability", "sustainability"]);
for (const u of U) {
  for (const k of Object.keys(u.req.weights ?? {})) {
    if (!VALID_WEIGHTS.has(k)) throw new Error(`${u.id}: unbekanntes Gewichtungskriterium "${k}"`);
  }
  for (const k of Object.keys(u.r)) {
    if (k !== "weights" && !(k in u.req)) throw new Error(`${u.id}: Begruendung fuer nicht gesetztes Feld "${k}"`);
  }
  for (const k of Object.keys(u.req)) {
    if (k !== "weights" && !(k in u.r)) throw new Error(`${u.id}: Feld "${k}" ohne Begruendung`);
  }
}

/* ============================================================== schreiben == */

const outS = path.join(ROOT, "schema");
const outU = path.join(ROOT, "data/usecases");
mkdirSync(outS, { recursive: true });
mkdirSync(outU, { recursive: true });
writeFileSync(path.join(outS, "usecase.schema.json"), JSON.stringify(schema, null, 2) + "\n");

for (const u of U) {
  const rec = {
    $schema: "../../schema/usecase.schema.json", schemaVersion: "1.0.0",
    id: u.id, group: u.group, title: u.title, context: u.context,
    requirements: u.req, rationale: u.r,
    ...(u.caveat ? { caveat: u.caveat } : {}),
    governance: { lastReviewed: "2026-08-01", reviewedBy: "Claude Code - fachliche Freigabe ausstehend" },
  };
  writeFileSync(path.join(outU, `${u.id}.json`), JSON.stringify(rec, null, 2) + "\n");
}
console.log(`${U.length} Anwendungsfaelle + schema/usecase.schema.json geschrieben`);
