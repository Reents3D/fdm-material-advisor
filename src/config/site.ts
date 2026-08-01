/**
 * Every brand, contact and URL constant lives here.
 *
 * Going live on materialberater.reents3d.de must be one commit in one file — that was
 * an explicit requirement, and it is why nothing below may be inlined elsewhere.
 */

export const SITE = {
  brand: "Reents3D",
  legalEntity: "Reents Technologies GmbH",
  toolName: { de: "FDM-Materialberater", en: "FDM Material Advisor" },
  claim: { de: "XXL 3D PRINTING FOR BIG IDEAS", en: "XXL 3D PRINTING FOR BIG IDEAS" },

  // Relaunch is running; the preview is noindex and temporary.
  // Canonical links ALWAYS point at the production domain.
  urls: {
    primary: "https://reents3d.de",
    contact: "https://reents3d.de/kontakt/",
    services: "https://reents3d.de/leistungen/",
    fdm: "https://reents3d.de/leistungen/3d-druck-service/fdm-3d-druck-service/",
    xxl: "https://reents3d.de/leistungen/xxl-3d-druck/",
    imprint: "https://reents3d.de/impressum/",
    privacy: "https://reents3d.de/datenschutz/",
    repo: "https://github.com/Reents3D/fdm-material-advisor",
    live: "https://reents3d.github.io/fdm-material-advisor/",
  },

  contact: {
    company: "Reents Technologies GmbH",
    street: "Lehmweg 95-97",
    zip: "25488",
    city: "Holm",
    country: "DE",
    phone: "+49 4103 928272-0",
    email: "info@reents3d.de",
  },

  colors: {
    primary: "#204B63",
    accent: "#95C6E5",
    ink: "#1D1D1B",
  },

  /**
   * Reents3D ist 3D-Druck-DIENSTLEISTER, kein Materialhersteller. Es gibt kein eigenes
   * Filament zu bewerben und keinen Grund, eine Marke zu bevorzugen - alle gaengigen
   * Materialien werden eingekauft und verarbeitet.
   */
  independent: true,

  /** Reale Bauraeume der Grossformatanlagen (mm). */
  buildVolumes: [
    { name: "XXL", x: 1800, y: 2400, z: 1800 },
    { name: "Hochformat", x: 1200, y: 1200, z: 2200 },
  ],
  maxEdgeMm: 2400,

  /** Verifiable facts only. No superlatives — credibility is the marketing. */
  facts: {
    machines: "über 50 Anlagen",
    maxPart: "Bauraum bis 1.800 × 2.400 × 1.800 mm",
    processes: "FDM, SLA, SLS",
    finishing: "Veredelung inhouse",
    location: "Holm bei Hamburg",
    confidentiality: "NDA-fähig, Daten auf lokalem Server",
  },

  utm: "utm_source=github&utm_medium=tool&utm_campaign=materialberater",
} as const;

/** Append UTM parameters so the tool's commercial effect is actually measurable. */
export function trackedUrl(url: string): string {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}${SITE.utm}`;
}
