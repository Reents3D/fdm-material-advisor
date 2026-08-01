import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

/**
 * Offlinebetrieb. Nur im ausgelieferten Build: im Entwicklungsserver wuerde ein
 * Service Worker die Aenderungen wegcachen, die man gerade sehen will.
 *
 * Das Werkzeug wird auf Messen und in Werkstaetten benutzt, wo das Netz wegbricht.
 * Alle Daten stecken ohnehin im Bundle - es fehlt nur der Zwischenspeicher, damit die
 * Anwendung ohne Netz ueberhaupt startet. Scheitert die Registrierung, laeuft alles
 * weiter wie bisher: sie ist eine Zugabe, keine Voraussetzung.
 */
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  addEventListener("load", () => {
    void navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
      .catch(() => {});
  });
}
