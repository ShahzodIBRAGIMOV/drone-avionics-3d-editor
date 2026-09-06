import JSZip from "jszip";
import { PhysicalInstance, CableConnection } from "../types";
import { CustomModelRecord, COMPONENT_ID_TO_ASSET_KEY } from "./modelManager";
import { getCachedBuffer, setCachedBuffer, getAllCustomCachedBuffers, loadModelAsset, loadModelIndex, ModelAsset } from "../modelAssetLoader";
import { generateViewerHTML } from "../standaloneViewer/viewerTemplate";
import { COMPONENT_PINS } from "../data/pinDefinitions";

// Helper to convert ArrayBuffer to Base64 safely without stack overflow
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  const chunkSize = 0x8000;
  for (let i = 0; i < len; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + chunkSize, len)) as any);
  }
  return btoa(binary);
}

// Helper to convert Base64 to ArrayBuffer
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const cleanB64 = base64.includes(",") ? base64.split(",")[1] : base64;
  const binaryString = atob(cleanB64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export interface ExportZipOptions {
  instances: PhysicalInstance[];
  cables: CableConnection[];
  droneParams?: {
    width?: number;
    length?: number;
    height?: number;
    fuselageWidth?: number;
  };
  customModels?: Record<string, CustomModelRecord>;
  customManifest?: any[];
  droneOpacity?: number;
  droneColor?: string;
  droneWireframe?: boolean;
  onProgress?: (step: string, percent: number) => void;
}

export async function exportProjectZipPackage(options: ExportZipOptions): Promise<void> {
  const {
    instances,
    cables,
    droneParams,
    customModels = {},
    customManifest = [],
    droneOpacity = 0.45,
    droneColor = "original",
    droneWireframe = false,
    onProgress
  } = options;

  onProgress?.("ZIP arxivi tayyorlanmoqda...", 5);
  const zip = new JSZip();

  // 1. Prepare project state JSON
  const projectState = {
    instances,
    cables,
    customModels,
    customManifest,
    metadata: {
      droneName: "Drone Avionics 3D",
      droneWidth: droneParams?.width || 1200,
      droneLength: droneParams?.length || 1000,
      droneHeight: droneParams?.height || 200,
      fuselageWidth: droneParams?.fuselageWidth || 180,
      droneOpacity,
      droneColor,
      droneWireframe,
      exportedAt: new Date().toISOString(),
      version: "2.0-standalone"
    }
  };

  zip.file("project_state.json", JSON.stringify(projectState, null, 2));

  // 2. Load model index for asset lookups & gather custom buffers from IndexedDB
  const modelIndex = await loadModelIndex().catch(() => ({} as Record<string, ModelAsset>));
  const allCustomBuffers = await getAllCustomCachedBuffers().catch(() => ({} as Record<string, ArrayBuffer>));

  // 3. Gather unique components placed (ensuring drone airframe "01" and all custom uploaded models are included)
  const uniqueComponentIds = Array.from(
    new Set([
      "01",
      ...instances.filter((i) => i.placed).map((i) => i.componentId),
      ...Object.keys(customModels),
      ...Object.keys(allCustomBuffers),
    ])
  );

  const modelsFolder = zip.folder("models");
  const embeddedModels: Record<string, string> = {};

  const total = uniqueComponentIds.length;
  for (let i = 0; i < total; i++) {
    const compId = uniqueComponentIds[i];
    const assetKey = COMPONENT_ID_TO_ASSET_KEY[compId] || compId;
    const progressPercent = Math.round(10 + ((i + 1) / total) * 60);
    onProgress?.(`3D modellar to‘planmoqda: #${compId} (${assetKey}) (${i + 1}/${total})`, progressPercent);

    try {
      let buffer: ArrayBuffer | null = null;
      let ext = "glb";
      let fileName = `${compId}_${assetKey}.glb`;

      // 1. Check local custom buffers uploaded from user's computer
      if (allCustomBuffers[compId] && allCustomBuffers[compId].byteLength > 50) {
        buffer = allCustomBuffers[compId];
      } else if (allCustomBuffers[assetKey] && allCustomBuffers[assetKey].byteLength > 50) {
        buffer = allCustomBuffers[assetKey];
      }

      // Check custom models registry
      const customRec = customModels[compId] || customModels[assetKey];
      if (customRec) {
        fileName = customRec.fileName || `custom_${compId}.${customRec.format || "glb"}`;
        ext = customRec.format || "glb";

        if (!buffer || buffer.byteLength < 50) {
          // Try IndexedDB buffer
          const cached = await getCachedBuffer(`custom_model_buffer_${compId}`);
          if (cached && cached.byteLength > 50) {
            buffer = cached;
          } else if (customRec.fileUrl) {
            const res = await fetch(customRec.fileUrl).catch(() => null);
            if (res && res.ok) {
              buffer = await res.arrayBuffer();
            }
          }
        }
      }

      // 2. Check standard assets using assetKey or compId
      if (!buffer || buffer.byteLength < 50) {
        const asset = modelIndex[assetKey] || modelIndex[compId];
        if (asset) {
          ext = asset.format || "glb";
          fileName = `${compId}_${assetKey}.${ext}`;
          buffer = await loadModelAsset(asset).catch(() => null);
        }
      }

      // 3. Fallback direct paths if buffer still empty
      if (!buffer || buffer.byteLength < 50) {
        if (assetKey === "drone" || compId === "01") {
          const res = await fetch("/models/drone/model.glb?v=8334383e79073810").catch(() => null);
          if (res && res.ok) {
            const buf = await res.arrayBuffer();
            if (buf.byteLength > 100) {
              buffer = buf;
              ext = "glb";
              fileName = "01_drone.glb";
            }
          }
        } else {
          const directCandidates = [
            `/models/${assetKey}/model.glb`,
            `/models/custom/${assetKey}.glb`,
            `/models/${assetKey}.obj`
          ];
          for (const cand of directCandidates) {
            const res = await fetch(cand).catch(() => null);
            if (res && res.ok) {
              const testBuf = await res.arrayBuffer();
              if (testBuf.byteLength > 100) {
                buffer = testBuf;
                ext = cand.endsWith(".obj") ? "obj" : "glb";
                fileName = `${compId}_${assetKey}.${ext}`;
                break;
              }
            }
          }
        }
      }

      // If buffer found, add to models folder & embedded base64
      if (buffer && buffer.byteLength > 50) {
        // Add to zip folder
        modelsFolder?.file(fileName, buffer);

        // Add to embedded map for zero-CORS file:/// offline viewing
        const b64 = arrayBufferToBase64(buffer);
        const dataUri = `data:application/octet-stream;base64,${b64}`;
        embeddedModels[compId] = dataUri;
        embeddedModels[assetKey] = dataUri;
        if (compId === "01") {
          embeddedModels["drone"] = dataUri;
        }
      }
    } catch (err) {
      console.warn(`Model yuklanmadi (#${compId}):`, err);
    }
  }

  // 4. Create embedded project data script for offline viewer
  onProgress?.("Oflayn skriptlar yaratilmoqda...", 75);
  const projectDataScript = `// Drone Avionics 3D Standalone Offline Data
window.__DRONE_COMPONENT_PINS__ = ${JSON.stringify(COMPONENT_PINS)};
window.__DRONE_PROJECT_DATA__ = {
  state: ${JSON.stringify(projectState)},
  models: ${JSON.stringify(embeddedModels)}
};
`;
  zip.file("data/project_data.js", projectDataScript);

  // 5. Fetch and add standalone viewer engine
  onProgress?.("Ko‘ruvchi dvigateli biriktirilmoqda...", 85);
  try {
    const engineRes = await fetch("/viewer-engine.min.js");
    if (engineRes.ok) {
      const engineCode = await engineRes.text();
      zip.file("libs/viewer-engine.min.js", engineCode);
    }
  } catch (e) {
    console.warn("Viewer engine fetching error:", e);
  }

  // 6. Generate viewer HTML
  const viewerHtml = generateViewerHTML("Drone Avionics 3D");
  zip.file("viewer.html", viewerHtml);
  zip.file("index.html", viewerHtml);

  // 7. Add Windows 1-click batch launcher
  const batScript = `@echo off
chcp 65001 > nul
echo ========================================================
echo       Drone Avionics 3D - Oflayn 3D Ko'ruvchi
echo ========================================================
echo Sahnadagi barcha 3D modellar va kabellar ochilmoqda...
start "" viewer.html
exit
`;
  zip.file("boshlash_windows.bat", batScript);

  // 8. Add Mac/Linux shell launcher
  const shScript = `#!/bin/bash
echo "Drone Avionics 3D loyihasi ochilmoqda..."
if which xdg-open > /dev/null; then
  xdg-open viewer.html
elif which open > /dev/null; then
  open viewer.html
else
  echo "Iltimos, viewer.html faylini brauzeringizda oching."
fi
`;
  zip.file("start_mac_linux.sh", shScript);

  // 9. Add Uzbek documentation README
  const readmeText = `============================================================
      DRONE AVIONICS 3D - TO'LIQ OFLAYN LOYIHA TO'PLAMI
============================================================

Ushbu to'plam droningizning barcha 3D modellari, elektron komponentlari,
koordinatalari va kabellarini 100% mustaqil holda o'zida saqlaydi.

QANDAY ISHLATISH MUMKIN:

1. ENG TEZ VA ODDIY USUL (Hech qanday o'rnatishlarsiz):
   - "viewer.html" faylini ikki marta bosing (yoki Windows'da "boshlash_windows.bat" ni bosing).
   - Brauzeringizda (Chrome, Edge, Firefox, Safari) 3D model darhol ochiladi.
   - Internet umuman talab qilinmaydi (to'liq oflayn ishlaydi).
   - "file:///" protokoli orqali ham barcha 3D modellar to'liq va rangli chiqadi.

2. ASL 3D MODELLAR:
   - "models/" papkasida har bir komponentning asl .GLB va .STL fayllari alohida saqlangan.
   - Ularni Blender, Fusion 360 yoki boshqa 3D dasturlarda ishlatishingiz mumkin.

3. LOYIHANI ONLAYN ILovaga QAYTA YUKLASH (IMPORT):
   - Drone Avionics 3D veb-ilovasini oching.
   - "Fayl" menyusidan "ZIP arxivdan ochish (Import ZIP)" tugmasini bosing.
   - Ushbu ZIP faylni tanlang.
   - Ilova barcha 3D modellarni, kabellarni va sozlamalarni avtomatik to'liq tiklaydi!

Yaratilgan sana: ${new Date().toLocaleString("uz-UZ")}
`;
  zip.file("README_UZ.txt", readmeText);

  // 10. Generate final ZIP Blob and trigger download
  onProgress?.("ZIP arxiv siqilmoqda va yuklanmoqda...", 95);
  const blob = await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 }
  });

  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const fileName = `drone_avionics_full_bundle_${dateStr}.zip`;

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);

  onProgress?.("Yuklab olish yakunlandi!", 100);
}

export interface ImportZipResult {
  instances: PhysicalInstance[];
  cables: CableConnection[];
  customModels?: Record<string, CustomModelRecord>;
  customManifest?: any[];
  metadata?: any;
}

export async function importProjectFromZipPackage(
  file: File,
  onProgress?: (step: string, percent: number) => void
): Promise<ImportZipResult> {
  onProgress?.("ZIP arxiv ochilmoqda...", 10);
  const zip = await JSZip.loadAsync(file);

  // 1. Find project_state.json
  const stateFile = zip.file("project_state.json");
  if (!stateFile) {
    throw new Error("ZIP ichida 'project_state.json' topilmadi!");
  }

  onProgress?.("Loyiha konfiguratsiyasi o‘qilmoqda...", 30);
  const stateJsonStr = await stateFile.async("text");
  const stateData = JSON.parse(stateJsonStr);

  const instances = stateData.instances || [];
  const cables = stateData.cables || [];
  const customModels = stateData.customModels || {};
  const customManifest = stateData.customManifest || [];

  // 2. Extract and cache all 3D model files from models/ folder
  const modelFiles = zip.folder("models");
  if (modelFiles) {
    const files = Object.keys(modelFiles.files).filter(
      (path) => !modelFiles.files[path].dir && (path.endsWith(".glb") || path.endsWith(".stl") || path.endsWith(".obj"))
    );

    const total = files.length;
    for (let i = 0; i < total; i++) {
      const filePath = files[i];
      const percent = Math.round(40 + ((i + 1) / total) * 50);
      onProgress?.(`3D model xotiraga tiklanmoqda: ${filePath.split("/").pop()}`, percent);

      const fileObj = zip.file(filePath);
      if (fileObj) {
        const buffer = await fileObj.async("arraybuffer");
        const justName = filePath.split("/").pop() || "";

        // Try extracting component ID from file name (e.g., '22_RadioMaster...' or 'comp_22.glb')
        let targetCompId: string | null = null;
        const match = justName.match(/^([0-9]{2})/);
        if (match) {
          targetCompId = match[1];
        } else {
          const compMatch = justName.match(/comp_([0-9]{2})/);
          if (compMatch) targetCompId = compMatch[1];
        }

        if (targetCompId && buffer.byteLength > 50) {
          await setCachedBuffer(`custom_model_buffer_${targetCompId}`, buffer);
        }
      }
    }
  }

  onProgress?.("Loyiha to‘liq tiklandi!", 100);
  return {
    instances,
    cables,
    customModels,
    customManifest,
    metadata: stateData.metadata
  };
}
