/**
 * Die Datenbank soll zertifizierte Anforderungen tatsaechlich bedienen koennen.
 * Bis Extrudr DuraPro PC-FR und Flex Medium ESD dazukamen, lieferten UL94 V-0 und
 * ESD garantiert null Treffer - das Werkzeug konnte diese Faelle nicht beantworten.
 */
import { describe, expect, it } from "vitest";
import { MATERIALS } from "../../src/data/materials";
import { select } from "../../src/engine";
import { DEFAULT_WEIGHTS as W } from "../../src/engine/criteria";

const ids = (l: { material: { id: string } }[]) => l.map((r) => r.material.id);

describe("Zertifizierte Anforderungen sind erfuellbar", () => {
  it("UL94 V-0 liefert jetzt einen Treffer", () => {
    const r = select(MATERIALS, { flameClass: "V-0", weights: W });
    expect(r.ranked.length).toBeGreaterThan(0);
    expect(ids(r.ranked)).toContain("pc-fr");
  });

  it("UL94 V-2 schliesst V-0 mit ein, nicht umgekehrt", () => {
    expect(ids(select(MATERIALS, { flameClass: "V-2" }).ranked)).toContain("pc-fr");
    const v0 = ids(select(MATERIALS, { flameClass: "V-0" }).ranked);
    expect(v0.length).toBeLessThanOrEqual(ids(select(MATERIALS, { flameClass: "V-2" }).ranked).length);
  });

  it("ESD liefert jetzt einen Treffer, und es ist kein CF-Material", () => {
    const r = select(MATERIALS, { esd: true, weights: W });
    expect(ids(r.ranked)).toContain("tpu-esd");
    for (const id of ["petg-cf", "pa6-cf", "pet-cf", "asa-cf"]) {
      expect(ids(r.ranked), `${id} ist trotz Kohlenstofffaser nicht ESD-tauglich`).not.toContain(id);
    }
  });

  it("PC-FR braucht eine Kammer und faellt ohne sie raus", () => {
    expect(ids(select(MATERIALS, { flameClass: "V-0", chamberAvailable: false }).ranked)).toHaveLength(0);
  });

  it("GreenTEC erreicht ueber 100 °C ohne Kammer - sonst kann das keiner", () => {
    const r = select(MATERIALS, { serviceTemperatureC: 85, chamberAvailable: false, weights: W });
    expect(ids(r.ranked)).toContain("greentec");
  });
});
