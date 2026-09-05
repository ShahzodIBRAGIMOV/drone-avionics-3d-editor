import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { LanguageProvider } from "./i18n/LanguageContext";
import "./styles.css";

const STORAGE_KEY = "drone_avionics_state_v1";
const DEFAULT_LAYOUT_SEEDED_KEY = "drone_avionics_default_layout_2026_09_05_seeded";

async function seedDefaultLayout() {
  try {
    if (localStorage.getItem(DEFAULT_LAYOUT_SEEDED_KEY) === "1") return;

    const base = import.meta.env.BASE_URL || "./";
    const response = await fetch(`${base}data/default-layout.bundle.json`, { cache: "no-cache" });
    if (!response.ok) return;

    const bundle = await response.json();
    if (bundle?.encoding !== "gzip-base64" || typeof bundle?.data !== "string") return;

    const binary = atob(bundle.data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    const ds = new DecompressionStream("gzip");
    const decompressed = await new Response(new Blob([bytes]).stream().pipeThrough(ds)).text();
    const layout = JSON.parse(decompressed);

    if (!layout || !Array.isArray(layout.instances)) return;

    layout.timestamp = new Date().toISOString();
    layout.updatedAt = layout.timestamp;
    layout.cameraViewMode = layout.cameraViewMode || "perspective";
    layout.showPins = layout.showPins ?? true;
    layout.showCables = layout.showCables ?? true;
    layout.showGrid = layout.showGrid ?? true;

    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
    sessionStorage.setItem("drone_avionics_backup_v1", JSON.stringify(layout));
    localStorage.setItem(DEFAULT_LAYOUT_SEEDED_KEY, "1");
  } catch (error) {
    console.warn("Default UAV layout could not be preloaded:", error);
  }
}

async function bootstrap() {
  await seedDefaultLayout();

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </React.StrictMode>
  );
}

bootstrap();
