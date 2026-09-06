import { getCachedBuffer, setCachedBuffer } from "../modelAssetLoader";
import { modelManager } from "./modelManager";

export interface RepoProjectState {
  version: string;
  name: string;
  updatedAt: string;
  timestamp: number;
  instances: any[];
  cables: any[];
  droneFrame?: {
    color?: string;
    opacity?: number;
    wireframe?: boolean;
    visible?: boolean;
  };
  droneColor?: string;
  droneOpacity?: number;
  droneWireframe?: boolean;
  droneVisible?: boolean;
  sceneTheme?: string;
  cameraViewMode?: string;
  customModels?: Record<string, any>;
  customManifest?: any[];
}

export interface RepoCustomModelRecord {
  componentId: string;
  componentName: string;
  assetKey: string;
  sourceType: "file" | "preset" | "url";
  format: "obj" | "stl" | "glb" | "gltf";
  scaleMultiplier: number;
  fileName: string;
  fileUrl: string;
  category: string;
  fileSize?: number;
  updatedAt: number;
}

// Convert ArrayBuffer or Blob to Base64 string
export async function bufferToBase64(buffer: ArrayBuffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([buffer]);
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Save the entire project state into the Git Repository filesystem:
 * public/data/default_project_state.json
 */
export async function saveProjectToRepo(projectData: Partial<RepoProjectState>): Promise<boolean> {
  try {
    const payload: RepoProjectState = {
      version: "1.0",
      name: projectData.name || "3.5M Twin-Motor UAV Avionics",
      updatedAt: new Date().toISOString(),
      timestamp: Date.now(),
      instances: projectData.instances || [],
      cables: projectData.cables || [],
      droneFrame: projectData.droneFrame,
      droneColor: projectData.droneColor || projectData.droneFrame?.color,
      droneOpacity: projectData.droneOpacity ?? projectData.droneFrame?.opacity ?? 0.35,
      droneWireframe: projectData.droneWireframe ?? projectData.droneFrame?.wireframe ?? false,
      droneVisible: projectData.droneVisible ?? projectData.droneFrame?.visible ?? true,
      sceneTheme: projectData.sceneTheme || "hangar-blueprint",
      cameraViewMode: projectData.cameraViewMode || "perspective",
      customModels: projectData.customModels || modelManager.getCustomModelRegistry(),
      customManifest: projectData.customManifest || [],
    };

    const res = await fetch("/api/save-repo-project", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      console.warn("Failed to save project to repo API:", res.status);
      return false;
    }
    const resData = await res.json();
    return !!resData.success;
  } catch (err) {
    console.warn("Could not save project to repo API:", err);
    return false;
  }
}

/**
 * Save an uploaded 3D model file directly to the Git Repository filesystem:
 * public/models/custom/<fileName> and registers it in public/data/custom_models_manifest.json
 */
export async function saveCustomModelToRepo(
  componentId: string,
  fileName: string,
  format: "obj" | "stl" | "glb" | "gltf",
  scaleMultiplier: number,
  arrayBuffer: ArrayBuffer,
  componentName?: string,
  category?: string
): Promise<RepoCustomModelRecord | null> {
  try {
    const fileBase64 = await bufferToBase64(arrayBuffer);
    const res = await fetch("/api/save-custom-model", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        componentId,
        fileName,
        format,
        scaleMultiplier,
        fileBase64,
        componentName: componentName || fileName,
        category: category || "Boshqa",
      }),
    });

    if (!res.ok) {
      console.warn("Failed to save custom model to repo API:", res.status);
      return null;
    }

    const data = await res.json();
    if (data.success && data.modelRecord) {
      // Also register into modelManager
      modelManager.saveCustomModelRecord({
        componentId,
        assetKey: data.modelRecord.assetKey,
        sourceType: "file",
        format,
        scaleMultiplier,
        fileName: data.modelRecord.fileName,
        fileUrl: data.modelRecord.fileUrl,
        updatedAt: Date.now(),
      });
      return data.modelRecord;
    }
    return null;
  } catch (err) {
    console.warn("Could not save custom model to repo API:", err);
    return null;
  }
}

/**
 * Load default project state saved in Git Repository (public/data/default_project_state.json)
 */
export async function loadProjectFromRepo(): Promise<RepoProjectState | null> {
  try {
    const res = await fetch(`/data/default_project_state.json?t=${Date.now()}`);
    if (!res.ok) {
      return null;
    }
    const data = await res.json();
    if (data && Array.isArray(data.instances) && data.instances.length > 0) {
      return data as RepoProjectState;
    }
    return null;
  } catch (err) {
    console.warn("Could not load project from repo default_project_state.json:", err);
    return null;
  }
}

/**
 * Load custom models manifest saved in Git Repository (public/data/custom_models_manifest.json)
 */
export async function loadCustomModelsManifestFromRepo(): Promise<RepoCustomModelRecord[]> {
  try {
    const res = await fetch(`/data/custom_models_manifest.json?t=${Date.now()}`);
    if (!res.ok) {
      return [];
    }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/**
 * Synchronize any custom models stored in browser IndexedDB or localStorage
 * that have not yet been written to the repository disk.
 */
export async function syncBrowserModelsToRepo(): Promise<number> {
  let count = 0;
  try {
    const registry = modelManager.getCustomModelRegistry();
    const repoManifest = await loadCustomModelsManifestFromRepo();
    const existingComponentIds = new Set(repoManifest.map((m) => m.componentId));

    for (const [compId, record] of Object.entries(registry)) {
      if (!existingComponentIds.has(compId) && record.sourceType === "file" && record.format) {
        const buffer = await getCachedBuffer(`custom_model_buffer_${compId}`);
        if (buffer && buffer.byteLength > 0) {
          const fileName = record.fileName || `model_${compId}.${record.format}`;
          const saved = await saveCustomModelToRepo(
            compId,
            fileName,
            record.format,
            record.scaleMultiplier || 1.0,
            buffer,
            fileName
          );
          if (saved) count++;
        }
      }
    }
  } catch (err) {
    console.warn("Error syncing browser models to repo:", err);
  }
  return count;
}

/**
 * Download the current project state as a standalone JSON file for manual export
 */
export function exportProjectAsJson(projectData: Partial<RepoProjectState>, customModelsRegistry?: Record<string, any>) {
  const exportData = {
    app: "Drone Avionics 3D Editor",
    exportedAt: new Date().toISOString(),
    version: "1.0",
    ...projectData,
    customModels: customModelsRegistry || modelManager.getCustomModelRegistry(),
  };

  const jsonStr = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `drone_avionics_project_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
