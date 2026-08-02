/**
 * Glossar.
 *
 * WOZU
 * Das Werkzeug wirft mit Vicat, HDT-A, Anisotropiefaktor und Kerbschlagzähigkeit um sich
 * und erklärt keinen einzigen dieser Begriffe. Für die Zielgruppe — Entscheider ohne
 * Werkstoffstudium — ist das die grösste verbleibende Hürde.
 *
 * DIE HALTUNG DIESER DATEI
 * Jeder Eintrag hat ein Feld `pitfall`, wo es eines gibt: der verbreitete Irrtum zu diesem
 * Begriff. Genau daran entscheidet sich in der Praxis eine Werkstoffwahl, nicht an der
 * Lehrbuchdefinition. Ein Glossar, das nur definiert, hilft niemandem, der schon eine
 * falsche Vorstellung mitbringt.
 *
 * Erzeugt schema/glossary.schema.json und data/glossary.json.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const t = (de, en) => ({ de, en });

const schema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://reents3d.github.io/fdm-material-advisor/schema/glossary.schema.json",
  title: "Glossar",
  type: "object", additionalProperties: false,
  required: ["schemaVersion", "terms"],
  properties: {
    $schema: { type: "string" }, schemaVersion: { type: "string" },
    terms: {
      type: "array", minItems: 1,
      items: {
        type: "object", additionalProperties: false,
        required: ["id", "term", "category", "short", "detail"],
        properties: {
          id: { type: "string", pattern: "^[a-z0-9-]+$" },
          term: { $ref: "#/$defs/i18n" },
          aliases: { type: "array", items: { type: "string" } },
          category: { enum: ["mechanik", "thermik", "pruefung", "verarbeitung", "regulatorik", "methodik"] },
          unit: { type: "string" },
          short: { $ref: "#/$defs/i18n", description: "Ein Satz. Was ist das." },
          detail: { $ref: "#/$defs/i18n", description: "Warum es fuer die Werkstoffwahl zaehlt." },
          pitfall: { $ref: "#/$defs/i18n", description: "Der verbreitete Irrtum zu diesem Begriff." },
          seeAlso: { type: "array", items: { type: "string" } },
        },
      },
    },
  },
  $defs: {
    i18n: { type: "object", required: ["de", "en"], additionalProperties: false,
      properties: { de: { type: "string", minLength: 1 }, en: { type: "string", minLength: 1 } } },
  },
};

const T = [
  /* ------------------------------------------------------------- Mechanik */
  { id: "zugfestigkeit", cat: "mechanik", unit: "MPa",
    term: t("Zugfestigkeit", "Tensile strength"), aliases: ["Reissfestigkeit", "Tensile"],
    short: t("Die höchste Spannung, die ein Prüfstab aushält, bevor er nachgibt oder reisst.",
             "The highest stress a test bar withstands before it yields or breaks."),
    detail: t("Der meistgenannte Kennwert — und der am häufigsten überschätzte. Er beschreibt einen langsamen Zug an einem genormten Stab bei Raumtemperatur. Ein Bauteil, das schlägt, schwingt, warm wird oder eine Kerbe hat, versagt lange vor diesem Wert.",
              "The most quoted value — and the most overrated. It describes a slow pull on a standard bar at room temperature. A part that takes impacts, vibrates, gets warm or has a notch fails well below it."),
    pitfall: t("Höhere Zugfestigkeit heisst nicht robusteres Bauteil. PLA hat mehr Zugfestigkeit als ABS und zerspringt trotzdem beim ersten Sturz — dafür zählt die Schlagzähigkeit.",
               "Higher tensile strength does not mean a tougher part. PLA beats ABS on tensile strength and still shatters on the first drop — that is what impact strength is for."),
    seeAlso: ["schlagzaehigkeit", "anisotropiefaktor", "e-modul"] },

  { id: "e-modul", cat: "mechanik", unit: "MPa",
    term: t("E-Modul", "Young's modulus"), aliases: ["Elastizitätsmodul", "Zugmodul", "Steifigkeit"],
    short: t("Wie stark sich ein Werkstoff unter Last verformt — je höher, desto steifer.",
             "How much a material deforms under load — the higher, the stiffer."),
    detail: t("Für Halterungen, Lehren und alles, was seine Form halten soll, ist der E-Modul oft wichtiger als die Festigkeit. Ein Bauteil, das sich unter Last durchbiegt, ist unbrauchbar, auch wenn es nicht bricht.",
              "For brackets, gauges and anything that must hold its shape, modulus often matters more than strength. A part that bends under load is useless even if it does not break."),
    pitfall: t("Steif und fest sind zwei verschiedene Dinge. Faserverstärkte Werkstoffe gewinnen fast immer Steifigkeit und verlieren dabei Zähigkeit.",
               "Stiff and strong are two different things. Fibre-reinforced grades almost always gain stiffness and lose toughness."),
    seeAlso: ["zugfestigkeit", "biegemodul", "kriechen"] },

  { id: "bruchdehnung", cat: "mechanik", unit: "%",
    term: t("Bruchdehnung", "Elongation at break"), aliases: ["Reissdehnung", "Dehnung"],
    short: t("Um wie viel Prozent sich der Prüfstab bis zum Bruch dehnen lässt.",
             "By what percentage the test bar stretches before it breaks."),
    detail: t("Das beste Mass dafür, ob ein Werkstoff nachgibt oder splittert. Unter 5 % ist er spröde: Er bricht ohne Vorwarnung. Über 20 % verformt er sich sichtbar, bevor er versagt — für Clips und Schnappverbindungen ist das entscheidend.",
              "The best measure of whether a material yields or shatters. Below 5 % it is brittle: it breaks without warning. Above 20 % it deforms visibly before failing — decisive for clips and snap fits."),
    pitfall: t("Der Kennwert schwankt zwischen gedrucktem und spritzgegossenem Prüfkörper stärker als jeder andere. Ein Rohstoffdatenblatt nennt hier gern das Achtfache des am gedruckten Teil Erreichbaren.",
               "This value differs more between printed and moulded specimens than any other. A raw-material datasheet happily states eight times what a printed part reaches."),
    seeAlso: ["pruefkoerper", "anisotropiefaktor"] },

  { id: "biegemodul", cat: "mechanik", unit: "MPa",
    term: t("Biegefestigkeit und Biegemodul", "Flexural strength and modulus"), aliases: ["Biegeversuch"],
    short: t("Dasselbe wie Festigkeit und Steifigkeit, nur im Dreipunkt-Biegeversuch gemessen.",
             "The same as strength and stiffness, but measured in a three-point bending test."),
    detail: t("Näher an der Wirklichkeit als der Zugversuch, weil die meisten Bauteile auf Biegung belastet werden. Bei gedruckten Teilen besonders aussagekräftig, weil die Randfasern die Last tragen — und die liegen bei liegender Fertigung in der Schichtebene.",
              "Closer to reality than the tensile test, because most parts are loaded in bending. Especially telling for printed parts, since the outer fibres carry the load — and with flat printing those lie in the layer plane."),
    seeAlso: ["e-modul", "anisotropiefaktor"] },

  { id: "schlagzaehigkeit", cat: "mechanik", unit: "kJ/m²",
    term: t("Schlagzähigkeit", "Impact strength"), aliases: ["Charpy", "Izod", "Kerbschlagzähigkeit"],
    short: t("Wie viel Energie ein Bauteil aufnimmt, bevor es beim Schlag bricht.",
             "How much energy a part absorbs before breaking under impact."),
    detail: t("Gemessen mit einem Pendelhammer, entweder nach Charpy (liegend) oder Izod (eingespannt). GEKERBT heisst: Der Prüfstab hat eine eingefräste Kerbe — das simuliert eine scharfe Innenecke im Bauteil und liefert regelmässig nur einen Bruchteil des ungekerbten Wertes.",
              "Measured with a pendulum hammer, either Charpy (supported) or Izod (clamped). NOTCHED means the bar has a machined notch — this simulates a sharp internal corner and regularly yields a fraction of the unnotched value."),
    pitfall: t("Gekerbte und ungekerbte Werte stehen oft in derselben Tabelle und unterscheiden sich um den Faktor zehn. Wer sie verwechselt, verschätzt sich um eine Grössenordnung. Für Bauteile mit Innenecken zählt der gekerbte Wert.",
               "Notched and unnotched values often sit in the same table and differ by a factor of ten. Confusing them is an order-of-magnitude error. For parts with internal corners the notched value is the one that counts."),
    seeAlso: ["kerbempfindlichkeit", "bruchdehnung"] },

  { id: "kerbempfindlichkeit", cat: "mechanik",
    term: t("Kerbempfindlichkeit", "Notch sensitivity"),
    short: t("Wie stark eine scharfe Ecke die Belastbarkeit eines Werkstoffs einbrechen lässt.",
             "How badly a sharp corner reduces a material's load capacity."),
    detail: t("Jede Innenecke ist eine Kerbe. Bei kerbempfindlichen Werkstoffen — PLA, GreenTEC Pro, faserverstärkte Typen — startet dort der Riss. Eine Ausrundung von zwei Millimetern ist oft wirksamer als der Wechsel auf einen festeren Werkstoff.",
              "Every internal corner is a notch. In notch-sensitive materials — PLA, GreenTEC Pro, fibre-filled grades — that is where the crack starts. A two-millimetre fillet is often more effective than switching to a stronger material."),
    seeAlso: ["schlagzaehigkeit"] },

  { id: "anisotropiefaktor", cat: "mechanik",
    term: t("Anisotropiefaktor", "Anisotropy factor"), aliases: ["Z-Festigkeit", "Schichtrichtung"],
    short: t("Wie viel Festigkeit quer zu den Schichten übrig bleibt, verglichen mit der Schichtebene.",
             "How much strength remains across the layers compared with the layer plane."),
    detail: t("Der wichtigste Kennwert im FDM-Druck und der am seltensten veröffentlichte. Ein gedrucktes Teil ist kein Vollmaterial: In der Schichtebene trägt der Kunststoff, quer dazu nur die Verschweissung zwischen den Bahnen. Die Werte reichen in dieser Datenbank von 90 % (PC) bis 28 % (PPS-CF).",
              "The most important value in FDM printing and the least often published. A printed part is not solid stock: in the layer plane the polymer carries the load, across it only the weld between beads. Values here range from 90 % (PC) down to 28 % (PPS-CF)."),
    pitfall: t("Das ist keine Materialschwäche, sondern eine Konstruktionsaufgabe. Wer richtig orientiert, bekommt den vollen Wert. Deshalb rechnet dieses Werkzeug die Anisotropie nicht heraus, sondern zeigt sie — ein pauschaler Abschlag würde genau die Information vernichten, die man zum Handeln braucht.",
               "This is not a material weakness but a design task. Orient correctly and you get the full value. That is why this tool does not average anisotropy away but shows it — a blanket deduction would destroy exactly the information you need to act on."),
    seeAlso: ["schichthaftung", "pruefkoerper"] },

  { id: "schichthaftung", cat: "mechanik",
    term: t("Schichthaftung", "Interlayer adhesion"), aliases: ["Layerhaftung", "Z-Festigkeit"],
    short: t("Wie gut zwei benachbarte Schichten miteinander verschweissen.",
             "How well two adjacent layers weld together."),
    detail: t("Die physikalische Ursache hinter dem Anisotropiefaktor. Sie hängt weniger vom Werkstoff ab als von der Verarbeitung: Düsentemperatur, Kammertemperatur und Kühlung entscheiden mehr als die Marke des Filaments.",
              "The physical cause behind the anisotropy factor. It depends less on the material than on processing: nozzle temperature, chamber temperature and cooling decide more than the brand of filament."),
    seeAlso: ["anisotropiefaktor", "kammer"] },

  { id: "kriechen", cat: "mechanik",
    term: t("Kriechen", "Creep"), aliases: ["Kriechneigung", "Dauerlast"],
    short: t("Die langsame, bleibende Verformung unter gleichbleibender Last.",
             "The slow, permanent deformation under a constant load."),
    detail: t("Der Kennwert, den kein Datenblatt nennt und der die meisten Langzeitausfälle erklärt. Eine verschraubte Halterung, die nach Wochen locker ist, hat nicht versagt — sie ist gekrochen. Wärme beschleunigt das drastisch.",
              "The value no datasheet gives and which explains most long-term failures. A bolted bracket that is loose after weeks has not failed — it has crept. Heat accelerates this drastically."),
    seeAlso: ["hdt", "e-modul"] },

  { id: "spannungsriss", cat: "mechanik",
    term: t("Spannungsrissbildung", "Environmental stress cracking"), aliases: ["ESC"],
    short: t("Risse, die erst im Zusammenspiel aus innerer Spannung und einem Medium entstehen.",
             "Cracks that only appear when internal stress and a medium act together."),
    detail: t("Der heimtückischste Ausfallmechanismus: Weder die Last allein noch das Medium allein richten Schaden an. Polycarbonat reisst nach Wochen an einer Flächendesinfektion, die es beim Wischtest unbeschadet übersteht. Gedruckte Teile sind besonders anfällig, weil die Abkühlung Eigenspannungen einbaut.",
              "The most insidious failure mode: neither the load alone nor the medium alone does damage. Polycarbonate cracks after weeks against a surface disinfectant it survives unharmed in a wipe test. Printed parts are especially prone because cooling builds in residual stress."),
    pitfall: t("Ein bestandener Kurzzeittest sagt hier fast nichts aus. Tempern baut Eigenspannungen ab und ist oft die wirksamste Gegenmassnahme.",
               "A passed short-term test says almost nothing here. Annealing relieves residual stress and is often the most effective countermeasure."),
    seeAlso: ["tempern", "kriechen"] },

  { id: "shore", cat: "mechanik",
    term: t("Shore-Härte", "Shore hardness"), aliases: ["Shore A", "Shore D"],
    short: t("Das Mass für die Härte von Elastomeren — Skala A für weich, Skala D für hart.",
             "The hardness measure for elastomers — scale A for soft, scale D for hard."),
    detail: t("Bei Elastomeren ersetzt die Shore-Härte praktisch jede Festigkeitsangabe: Sie sagt, wie stark das Teil nachgibt. Shore A 85 ist ein weicher Gummi, Shore A 98 lässt sich noch auf Bowden-Systemen drucken, Shore D 58 ist bereits ein halbharter Konstruktionswerkstoff.",
              "For elastomers Shore hardness effectively replaces any strength figure: it says how much the part yields. Shore A 85 is a soft rubber, Shore A 98 can still be printed on Bowden systems, Shore D 58 is already a semi-rigid engineering material."),
    pitfall: t("Die beiden Skalen überlappen im mittleren Bereich, sind aber nicht ineinander umrechenbar. Shore A 98 und Shore D 50 beschreiben ähnliche Werkstoffe, die Zahlen lassen sich trotzdem nicht vergleichen.",
               "The two scales overlap in the middle but do not convert into one another. Shore A 98 and Shore D 50 describe similar materials, yet the numbers are not comparable."),
    seeAlso: [] },

  /* -------------------------------------------------------------- Thermik */
  { id: "hdt", cat: "thermik", unit: "°C",
    term: t("Wärmeformbeständigkeit (HDT)", "Heat deflection temperature (HDT)"), aliases: ["HDT-A", "HDT-B", "Formbeständigkeitstemperatur"],
    short: t("Die Temperatur, bei der sich ein belasteter Prüfstab um ein festgelegtes Mass durchbiegt.",
             "The temperature at which a loaded test bar deflects by a defined amount."),
    detail: t("Es gibt zwei Laststufen, und sie unterscheiden sich erheblich. HDT-A prüft mit 1,8 MPa, HDT-B mit 0,45 MPa — also mit einem Viertel der Last. Bei teilkristallinen Polyamiden liegen zwischen beiden Werten schon mal über 100 Kelvin.",
              "There are two load levels and they differ substantially. HDT-A tests at 1.8 MPa, HDT-B at 0.45 MPa — a quarter of the load. With semi-crystalline polyamides the two can be over 100 kelvin apart."),
    pitfall: t("HDT-B ist die geschmeichelte Zahl, und genau die steht im Marketing. Ein Datenblatt, das HDT-A nennt, macht es sich schwerer und ist deshalb aussagekräftiger. Beides ist ausserdem KEINE Dauergebrauchstemperatur — die liegt deutlich darunter.",
               "HDT-B is the flattering figure, and that is the one in the marketing. A datasheet stating HDT-A makes it harder for itself and is therefore more informative. Neither is a continuous service temperature — that lies well below."),
    seeAlso: ["vicat", "dauergebrauchstemperatur", "glasuebergang"] },

  { id: "vicat", cat: "thermik", unit: "°C",
    term: t("Vicat-Erweichungstemperatur", "Vicat softening temperature"), aliases: ["VST", "Vicat A", "Vicat B"],
    short: t("Die Temperatur, bei der eine genormte Nadel einen Millimeter tief in den Werkstoff eindringt.",
             "The temperature at which a standard needle penetrates one millimetre into the material."),
    detail: t("Ein reiner Erweichungswert ohne Bezug zu einer Bauteillast. Nützlich zum Vergleich verwandter Werkstoffe, ungeeignet als Auslegungsgrösse. Vicat A prüft mit 10 N, Vicat B mit 50 N.",
              "A pure softening figure with no relation to a part load. Useful for comparing related materials, unsuitable as a design value. Vicat A tests at 10 N, Vicat B at 50 N."),
    pitfall: t("Vicat liegt fast immer über HDT und wird deshalb gern zitiert. Ein Bauteil, das bei Vicat noch stabil aussieht, hat unter Last längst nachgegeben.",
               "Vicat almost always sits above HDT and is therefore readily quoted. A part that still looks stable at Vicat has long since yielded under load."),
    seeAlso: ["hdt", "dauergebrauchstemperatur"] },

  { id: "glasuebergang", cat: "thermik", unit: "°C",
    term: t("Glasübergangstemperatur", "Glass transition temperature"), aliases: ["Tg"],
    short: t("Die Temperatur, ab der ein amorpher Kunststoff von hart und spröde zu weich und zäh wechselt.",
             "The temperature above which an amorphous plastic turns from hard and brittle to soft and tough."),
    detail: t("Bei amorphen Werkstoffen — ABS, ASA, PC, PETG, PMMA — ist Tg die eigentliche Einsatzgrenze. Bei teilkristallinen Werkstoffen wie PA und PET hält die kristalline Phase die Form noch weit darüber, weshalb sie oberhalb ihres Tg getrocknet werden dürfen.",
              "For amorphous materials — ABS, ASA, PC, PETG, PMMA — Tg is the real service limit. For semi-crystalline ones such as PA and PET the crystalline phase holds shape far above it, which is why they may be dried above their Tg."),
    pitfall: t("Ein PLA-Bauteil im Sommerauto erreicht 60 bis 70 °C und damit den Tg von PLA. Es verformt sich, ohne dass irgendetwas gebrochen wäre — der häufigste Reklamationsgrund im Hobbybereich.",
               "A PLA part in a car in summer reaches 60 to 70 °C and thus PLA's Tg. It deforms without anything having broken — the most common complaint in the hobby field."),
    seeAlso: ["hdt", "trocknen"] },

  { id: "dauergebrauchstemperatur", cat: "thermik", unit: "°C",
    term: t("Dauergebrauchstemperatur", "Continuous service temperature"), aliases: ["CUT", "Dauereinsatztemperatur"],
    short: t("Die Temperatur, die ein Bauteil über seine Lebensdauer aushält, ohne Eigenschaften zu verlieren.",
             "The temperature a part withstands over its service life without losing properties."),
    detail: t("Die einzige Grösse, die für die Auslegung wirklich taugt — und die fast kein Filamenthersteller angibt. Sie liegt deutlich unter HDT, weil hier nicht nur Erweichung zählt, sondern auch die langsame thermische Alterung.",
              "The only figure genuinely suited to design work — and one almost no filament maker states. It sits well below HDT because it accounts not only for softening but also for slow thermal ageing."),
    pitfall: t("Wo dieses Werkzeug einen Wert ohne Herstellerangabe zeigt, ist er als Schätzung gekennzeichnet und bewusst konservativ aus HDT-A abgeleitet. Zwei Ausnahmen nennen ihn belegt: PAHT und PAHT-CF mit 120 °C über 20.000 Stunden nach IEC 60216.",
               "Where this tool shows a value without a manufacturer statement, it is flagged as an estimate and deliberately derived conservatively from HDT-A. Two exceptions state it with a source: PAHT and PAHT-CF at 120 °C over 20,000 hours to IEC 60216."),
    seeAlso: ["hdt", "vicat"] },

  { id: "tempern", cat: "verarbeitung",
    term: t("Tempern", "Annealing"), aliases: ["Ausheizen", "Nachbehandlung"],
    short: t("Kontrolliertes Erwärmen des fertigen Bauteils, damit der Kunststoff nachkristallisiert.",
             "Controlled heating of the finished part so the polymer crystallises further."),
    detail: t("Bei manchen Werkstoffen verändert Tempern die Kennwerte dramatisch. Extrudr PLA Tough springt von 65 °C Vicat auf über 150 °C, Bambu PET-CF und PA6-CF erreichen ihre Datenblattwerte ÜBERHAUPT NUR getempert. Nebeneffekt: Eigenspannungen werden abgebaut, was Spannungsrisse verhindert.",
              "For some materials annealing changes the values dramatically. Extrudr PLA Tough jumps from 65 °C Vicat to over 150 °C; Bambu PET-CF and PA6-CF reach their datasheet values ONLY when annealed. Side effect: residual stress is relieved, which prevents stress cracking."),
    pitfall: t("Ohne Umluftofen sind diese Werte schlicht nicht erreichbar. Deshalb fragt der Assistent danach — und blendet Werkstoffe aus, deren Zahlen ohne Ofen eine Illusion wären. Tempern kostet ausserdem Massgenauigkeit: Das Bauteil schrumpft.",
               "Without a convection oven these values are simply unattainable. That is why the wizard asks — and hides materials whose figures would be an illusion without one. Annealing also costs dimensional accuracy: the part shrinks."),
    seeAlso: ["hdt", "spannungsriss"] },

  /* --------------------------------------------------------------- Prüfung */
  { id: "pruefkoerper", cat: "pruefung",
    term: t("Prüfkörper: gedruckt oder spritzgegossen", "Specimen: printed or moulded"), aliases: ["Rohstoffkennwert", "specimenType"],
    short: t("Woran der Hersteller gemessen hat — an einem gedruckten Teil oder am Granulat.",
             "What the manufacturer measured on — a printed part or the pellets."),
    detail: t("Der entscheidende Unterschied dieser ganzen Datenbank. Rohstoffkennwerte stammen aus dem Spritzguss und beschreiben Vollmaterial ohne Schichten. Ein gedrucktes Bauteil erreicht sie nie. Ein Rohstoffhersteller beziffert die Lücke selbst: 40,5 gegen 55,3 MPa Zugfestigkeit — und bei der Bruchdehnung 3,2 gegen 25,5 %, also ein Achtel.",
              "The decisive distinction across this whole database. Raw-material values come from injection moulding and describe solid stock without layers. A printed part never reaches them. One raw-material producer quantifies the gap itself: 40.5 against 55.3 MPa tensile strength — and for elongation 3.2 against 25.5 %, an eighth."),
    pitfall: t("Die Angabe allein reicht nicht. AzureFilm deklariert gedruckte Prüfkörper und nennt als einziger die Druckparameter — woran sichtbar wird, dass mit nur 20 % Infill geprüft wurde. Ein Kennwert aus einem halb gefüllten Prüfkörper beschreibt eine Geometrie, keinen Werkstoff.",
               "The declaration alone is not enough. AzureFilm declares printed specimens and is the only one to state the print parameters — revealing that testing was done at just 20 % infill. A value from a half-filled specimen describes a geometry, not a material."),
    seeAlso: ["infill", "anisotropiefaktor", "bruchdehnung"] },

  { id: "infill", cat: "verarbeitung", unit: "%",
    term: t("Infill", "Infill"), aliases: ["Füllgrad", "Füllung"],
    short: t("Wie viel Prozent des Bauteilinneren tatsächlich mit Material gefüllt wird.",
             "What percentage of the part interior is actually filled with material."),
    detail: t("Ein Kennwert ist nur dann ein Werkstoffkennwert, wenn er an 100 % Infill gemessen wurde. Bei 20 % trägt nur etwa die Hälfte des Querschnitts, und die Zahl beschreibt dann die gewählte Geometrie mit.",
              "A value is only a material value if it was measured at 100 % infill. At 20 % only about half the cross-section carries load, and the number then describes the chosen geometry as much as the material."),
    seeAlso: ["pruefkoerper"] },

  { id: "streuung", cat: "pruefung",
    term: t("Streuung (± Angabe)", "Scatter (± figure)"), aliases: ["Toleranz", "Standardabweichung"],
    short: t("Wie stark die Einzelmessungen um den angegebenen Mittelwert schwanken.",
             "How widely the individual measurements vary around the stated mean."),
    detail: t("Ein Datenblatt, das „2450 ± 270 MPa“ schreibt, sagt mehr aus als eines mit „2450 MPa“ — es gibt zu, dass der nächste Prüfstab auch 2180 liefern kann. Bambu Lab ist in dieser Datenbank der einzige Hersteller, der das durchgehend tut: Von den Werten mit Streuungsangabe stammen 145 aus seinen Blättern und genau einer von einer anderen Marke.",
              "A datasheet stating “2450 ± 270 MPa” says more than one stating “2450 MPa” — it admits the next bar may well deliver 2180. Bambu Lab is the only manufacturer here doing this consistently: of the values carrying scatter, 145 come from its sheets and exactly one from another brand."),
    pitfall: t("Eine Zahl mit drei Nachkommastellen ohne Streuungsangabe ist keine Präzision, sondern deren Behauptung.",
               "A number with three decimal places and no scatter figure is not precision but a claim to it."),
    seeAlso: ["konfidenz"] },

  /* ----------------------------------------------------------- Regulatorik */
  { id: "ul94", cat: "regulatorik",
    term: t("UL94", "UL94"), aliases: ["Brandklasse", "V-0", "HB", "Entflammbarkeit"],
    short: t("Die verbreitetste Einstufung für das Brandverhalten von Kunststoffen.",
             "The most common classification for the burning behaviour of plastics."),
    detail: t("Von schwach nach streng: HB (langsames Brennen waagerecht), V-2, V-1, V-0 (senkrecht, selbstverlöschend, kein brennendes Abtropfen), darüber 5VB und 5VA. Geprüft wird an genormten Stäbchen definierter Dicke — die Dickenangabe gehört deshalb zwingend zur Einstufung.",
              "From weak to strict: HB (slow horizontal burning), V-2, V-1, V-0 (vertical, self-extinguishing, no flaming drips), above that 5VB and 5VA. Testing is on standard bars of defined thickness — so the thickness figure is an inseparable part of the classification."),
    pitfall: t("Herstellersätze wie „selbstverlöschend“ oder „flame retardant“ sind KEINE Einstufung. Von 31 Werkstoffen dieser Datenbank tragen fünf eine echte UL94-Einstufung. Und selbst die ersetzt keine Bauteilprüfung — Ihr Bauteil ist kein genormtes Stäbchen.",
               "Manufacturer phrases such as “self-extinguishing” or “flame retardant” are NOT a classification. Of 31 materials here, five carry a genuine UL94 rating. And even that does not replace part testing — your part is not a standard bar."),
    seeAlso: ["en45545"] },

  { id: "en45545", cat: "regulatorik",
    term: t("EN 45545-2", "EN 45545-2"), aliases: ["Bahnnorm", "HL1", "HL2", "HL3"],
    short: t("Die europäische Brandschutznorm für Schienenfahrzeuge, gestuft in Gefährdungsstufen HL1 bis HL3.",
             "The European fire safety standard for rail vehicles, graded in hazard levels HL1 to HL3."),
    detail: t("Deutlich anspruchsvoller als UL94, weil zusätzlich Rauchdichte und Toxizität der Brandgase geprüft werden. HL3 ist die höchste Stufe. In dieser Datenbank erfüllt ein einziger Werkstoff sie: Extrudr DuraPro PC-FR V0.",
              "Considerably more demanding than UL94 because smoke density and gas toxicity are tested as well. HL3 is the highest level. Exactly one material here meets it: Extrudr DuraPro PC-FR V0."),
    seeAlso: ["ul94"] },

  { id: "esd", cat: "regulatorik", unit: "Ω",
    term: t("ESD-Einstufung", "ESD classification"), aliases: ["ableitfähig", "dissipativ", "leitfähig", "antistatisch"],
    short: t("Wie gut ein Werkstoff elektrostatische Ladung abführt, gemessen als Oberflächenwiderstand.",
             "How well a material dissipates electrostatic charge, measured as surface resistance."),
    detail: t("Über 10^12 Ohm ist isolierend, 10^6 bis 10^9 gilt als ableitfähig (dissipativ), darunter als leitfähig. Für die Elektronikfertigung ist der ableitfähige Bereich der richtige: Er baut Ladung ab, ohne sie schlagartig zu entladen.",
              "Above 10^12 ohm is insulating, 10^6 to 10^9 counts as dissipative, below that as conductive. For electronics manufacturing the dissipative range is the right one: it bleeds charge away without discharging it abruptly."),
    pitfall: t("Kohlenstofffaser macht einen Werkstoff NICHT automatisch ableitfähig — die Fasern liegen isoliert in der Matrix. Dieses Werkzeug lässt für eine ESD-Anforderung deshalb nur Werkstoffe mit gemessener Einstufung zu und weist CF-Typen ohne Messwert ab.",
               "Carbon fibre does NOT automatically make a material dissipative — the fibres sit insulated in the matrix. This tool therefore admits only materials with a measured classification for an ESD requirement and rejects CF grades without one."),
    seeAlso: [] },

  { id: "lebensmittelkontakt", cat: "regulatorik",
    term: t("Lebensmittelkonformität", "Food contact compliance"), aliases: ["FDA", "EU 10/2011"],
    short: t("Die Freigabe eines Werkstoffs für den Kontakt mit Lebensmitteln.",
             "The clearance of a material for contact with food."),
    detail: t("Bezieht sich immer auf das MATERIAL, nie auf Ihr Bauteil. Kein einziger Werkstoff dieser Datenbank trägt derzeit eine deklarierte Konformität — das ist keine Erfassungslücke, sondern die Marktlage.",
              "Always refers to the MATERIAL, never to your part. Not a single material in this database currently carries a declared compliance — that is not a gap in the data but the state of the market."),
    pitfall: t("Selbst mit konformem Material ist ein FDM-Bauteil nicht lebensmittelkonform: Die Schichtstruktur bildet Kapillaren, in denen sich Keime halten und die sich nicht reinigen lassen. Für wiederverwendbare Teile mit direktem Kontakt ist FDM ohne Versiegelung das falsche Verfahren.",
               "Even with a compliant material an FDM part is not food safe: the layer structure forms capillaries where bacteria persist and which cannot be cleaned. For reusable parts in direct contact, unsealed FDM is the wrong process."),
    seeAlso: [] },

  /* ------------------------------------------------------------ Verarbeitung */
  { id: "kammer", cat: "verarbeitung",
    term: t("Beheizte Bauraumkammer", "Heated build chamber"), aliases: ["Chamber", "geschlossener Bauraum"],
    short: t("Ein aktiv beheiztes, geschlossenes Druckergehäuse.",
             "An actively heated, enclosed printer housing."),
    detail: t("Sie hält das Bauteil während des Drucks warm, wodurch die Schichten besser verschweissen und weniger Spannungen entstehen. Für ABS, ASA, PC und alle Polyamide ist sie praktisch Pflicht, für PPS-CF mit 60 bis 90 °C zwingend.",
              "It keeps the part warm during printing, so layers weld better and less stress builds up. For ABS, ASA, PC and all polyamides it is practically mandatory, for PPS-CF at 60 to 90 °C unavoidable."),
    pitfall: t("Ein passiv geschlossenes Gehäuse ist keine beheizte Kammer. Der Assistent fragt danach, weil Empfehlungen für Werkstoffe, die eine voraussetzen, sonst wertlos sind.",
               "A passively enclosed housing is not a heated chamber. The wizard asks because recommendations for materials requiring one are otherwise worthless."),
    seeAlso: ["warping", "schichthaftung"] },

  { id: "warping", cat: "verarbeitung",
    term: t("Verzug", "Warping"), aliases: ["Warping", "Schwindung", "Curling"],
    short: t("Das Hochziehen der Bauteilecken, weil der Kunststoff beim Abkühlen schrumpft.",
             "The lifting of part corners because the plastic shrinks as it cools."),
    detail: t("Der begrenzende Faktor bei grossen Bauteilen — nicht die Festigkeit. Je grösser die Grundfläche und je höher die Schwindung, desto stärker. Bei XXL-Teilen entscheidet die Verzugsneigung darüber, was in einem Stück überhaupt fertigbar ist.",
              "The limiting factor for large parts — not strength. The larger the footprint and the higher the shrinkage, the worse. For XXL parts, warping tendency decides what can be produced in one piece at all."),
    seeAlso: ["kammer"] },

  { id: "trocknen", cat: "verarbeitung",
    term: t("Hygroskopie und Trocknen", "Hygroscopy and drying"), aliases: ["Feuchte", "Trocknung"],
    short: t("Wie stark ein Filament Luftfeuchte aufnimmt — und warum es vorher in den Trockner muss.",
             "How much a filament absorbs atmospheric moisture — and why it must be dried first."),
    detail: t("Feuchtes Filament verdampft in der Düse, was Blasen, raue Oberflächen und deutlich schlechtere Schichthaftung erzeugt. Polyamide sind die Sorgenkinder: Sie ziehen binnen Stunden so viel Wasser, dass eine offene Rolle unbrauchbar wird.",
              "Damp filament flashes to steam in the nozzle, causing bubbles, rough surfaces and markedly worse layer adhesion. Polyamides are the problem children: they take up enough water within hours to render an open spool unusable."),
    pitfall: t("Bei Polyamiden ist die Feuchteaufnahme nicht nur ein Druckproblem: Das fertige Bauteil nimmt weiter Wasser auf und verliert dabei messbar Steifigkeit. Ein Kennwert am trockenen Prüfkörper beschreibt dann nicht mehr das Teil im Einsatz.",
               "For polyamides moisture uptake is not just a printing issue: the finished part keeps absorbing water and measurably loses stiffness. A value from a dry specimen then no longer describes the part in service."),
    seeAlso: ["glasuebergang"] },

  { id: "abrasivitaet", cat: "verarbeitung",
    term: t("Abrasivität und gehärtete Düse", "Abrasiveness and hardened nozzle"), aliases: ["Düsenverschleiss", "Hardened nozzle"],
    short: t("Wie stark ein gefülltes Filament die Düse verschleisst.",
             "How badly a filled filament wears the nozzle."),
    detail: t("Carbon-, Glas- und Holzfüllungen schleifen eine Messingdüse binnen weniger hundert Gramm auf. Die Folge ist ein schleichend wachsender Durchmesser — die Teile werden ungenau, lange bevor jemand die Düse verdächtigt.",
              "Carbon, glass and wood fillers grind out a brass nozzle within a few hundred grams. The result is a slowly growing diameter — parts get inaccurate long before anyone suspects the nozzle."),
    pitfall: t("Gehärteter Stahl reicht meist, für stark gefüllte Typen wird zusätzlich 0,6 mm Durchmesser empfohlen. Der Assistent fragt danach, weil eine Empfehlung ohne die passende Düse in eine teure Reparatur führt.",
               "Hardened steel is usually enough; for heavily filled grades 0.6 mm diameter is additionally recommended. The wizard asks because a recommendation without the right nozzle leads to an expensive repair."),
    seeAlso: [] },

  /* ------------------------------------------------------------- Methodik */
  { id: "konfidenz", cat: "methodik",
    term: t("Konfidenz und Quelle", "Confidence and source"), aliases: ["estimated", "Schätzung", "Provenienz"],
    short: t("Jeder Wert in dieser Datenbank trägt mit, woher er stammt und wie belastbar er ist.",
             "Every value in this database carries where it came from and how dependable it is."),
    detail: t("Vier Stufen: `high` (Herstellermessung an gedruckten Prüfkörpern), `medium` (Herstellerangabe ohne deklarierten Prüfkörper), `low` (belegt, aber mit dokumentiertem Vorbehalt), `estimated` (fachlich abgeleitet, ohne Primärquelle). Geschätzte Werte sind in der Oberfläche sichtbar markiert.",
              "Four levels: `high` (manufacturer measurement on printed specimens), `medium` (manufacturer figure without a declared specimen), `low` (sourced but with a documented caveat), `estimated` (professionally derived, no primary source). Estimated values are visibly marked in the interface."),
    pitfall: t("Rund zwei Drittel der Aussagen sind gekennzeichnete Schätzungen. Das klingt nach wenig — ist aber ehrlicher als eine Lücke, die im Filter wie eine Freigabe aussieht. Ein Wert mit Konfidenz `high` oder `medium` ohne echte Quelle bricht die automatische Prüfung.",
               "About two thirds of statements are flagged estimates. That sounds like little — but it is more honest than a gap that looks like a clearance in the filter. A value with confidence `high` or `medium` and no real source breaks the automated check."),
    seeAlso: ["streuung", "pruefkoerper"] },

  { id: "perzentil", cat: "methodik",
    term: t("Perzentil-Normalisierung", "Percentile normalisation"), aliases: ["Scoring", "Bewertung"],
    short: t("Wie dieses Werkzeug Kennwerte mit verschiedenen Einheiten miteinander verrechnet.",
             "How this tool combines values with different units into one score."),
    detail: t("Jeder Kennwert wird nicht auf sein Minimum und Maximum bezogen, sondern auf seinen Rang im gesamten Feld. Sonst würde ein einziger Ausreisser — etwa PPS-CF mit 235 °C — alle übrigen Werkstoffe an den unteren Rand quetschen und die Unterschiede zwischen ihnen unsichtbar machen.",
              "Each value is referenced not to its minimum and maximum but to its rank across the whole field. Otherwise a single outlier — say PPS-CF at 235 °C — would squeeze every other material to the bottom and hide the differences between them."),
    pitfall: t("Fehlende Daten zählen dabei nie als null. Ein Werkstoff, der eine Anforderung nur mangels Daten passiert, wird nie über einem gereiht, der sie belegt erfüllt.",
               "Missing data never counts as zero. A material that passes a requirement only for lack of data is never ranked above one that demonstrably meets it."),
    seeAlso: ["konfidenz"] },
];

const outS = path.join(ROOT, "schema"), outD = path.join(ROOT, "data");
mkdirSync(outS, { recursive: true }); mkdirSync(outD, { recursive: true });
writeFileSync(path.join(outS, "glossary.schema.json"), JSON.stringify(schema, null, 2) + "\n");

/* Querverweise pruefen: ein Verweis ins Leere waere in der Oberflaeche ein toter Link. */
const ids = new Set(T.map((x) => x.id));
for (const x of T) for (const s of x.seeAlso ?? []) {
  if (!ids.has(s)) throw new Error(`${x.id}: seeAlso verweist auf unbekannten Begriff "${s}"`);
}

writeFileSync(path.join(outD, "glossary.json"), JSON.stringify({
  $schema: "../schema/glossary.schema.json", schemaVersion: "1.0.0",
  terms: T.map((x) => ({
    id: x.id, term: x.term, ...(x.aliases ? { aliases: x.aliases } : {}),
    category: x.cat, ...(x.unit ? { unit: x.unit } : {}),
    short: x.short, detail: x.detail,
    ...(x.pitfall ? { pitfall: x.pitfall } : {}),
    ...(x.seeAlso?.length ? { seeAlso: x.seeAlso } : {}),
  })),
}, null, 2) + "\n");

console.log(`${T.length} Begriffe + schema/glossary.schema.json geschrieben`);
console.log(`  mit Irrtums-Hinweis: ${T.filter((x) => x.pitfall).length}`);
