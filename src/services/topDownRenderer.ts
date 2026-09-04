import * as THREE from "three";
import { modelManager, COMPONENT_ID_TO_ASSET_KEY } from "./modelManager";

export interface TopDownRenderResult {
  dataUrl: string;
  aspect: number; // width / length (X / Z)
  widthMm: number;
  lengthMm: number;
  heightMm: number;
}

// Memory cache for rendered 3D top-down thumbnails
const thumbnailCache = new Map<string, TopDownRenderResult>();
const pendingPromises = new Map<string, Promise<TopDownRenderResult | null>>();

let sharedRenderer: THREE.WebGLRenderer | null = null;

function getSharedRenderer(): THREE.WebGLRenderer | null {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return null;
  }
  if (!sharedRenderer) {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 512;
      sharedRenderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        preserveDrawingBuffer: true,
        powerPreference: "high-performance",
      });
      sharedRenderer.setSize(512, 512);
      sharedRenderer.setClearColor(0x000000, 0); // Fully transparent background
      sharedRenderer.outputColorSpace = THREE.SRGBColorSpace;
    } catch (err) {
      console.warn("Could not create WebGLRenderer for top-down 3D thumbnail:", err);
      return null;
    }
  }
  return sharedRenderer;
}

/**
 * Renders the top-down (orthographic bird's-eye) view of the authentic 3D model
 * of a given componentId with high-contrast studio aerospace lighting.
 */
export async function renderTopDown3DModel(
  componentId: string,
  customColor?: string
): Promise<TopDownRenderResult | null> {
  const cacheKey = `${componentId}_${customColor || "default"}`;
  if (thumbnailCache.has(cacheKey)) {
    return thumbnailCache.get(cacheKey)!;
  }
  if (pendingPromises.has(cacheKey)) {
    return pendingPromises.get(cacheKey)!;
  }

  const renderPromise = (async () => {
    const renderer = getSharedRenderer();
    if (!renderer) return null;

    try {
      // 1. Load the 3D model template
      const template = await modelManager.loadModelTemplate(componentId);
      if (!template) return null;

      // 2. Clone the model hierarchy
      const clone = template.clone(true);

      // Apply customColor if specified
      if (customColor) {
        clone.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            if (mesh.material) {
              const srcMat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
              if (srcMat && (srcMat as THREE.MeshStandardMaterial).clone) {
                const newMat = (srcMat as THREE.MeshStandardMaterial).clone();
                newMat.color.set(customColor);
                mesh.material = newMat;
              }
            }
          }
        });
      }

      // 3. Compute accurate bounding box and center at origin
      const box = new THREE.Box3().setFromObject(clone);
      const size = new THREE.Vector3();
      box.getSize(size);
      const center = new THREE.Vector3();
      box.getCenter(center);

      // Center model
      clone.position.sub(center);

      // 4. Create specialized studio scene
      const scene = new THREE.Scene();
      scene.add(clone);

      // Ambient fill light for base clarity
      const ambientLight = new THREE.AmbientLight(0xffffff, 2.0);
      scene.add(ambientLight);

      // Main directional top-front key light
      const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
      keyLight.position.set(40, 150, 40);
      scene.add(keyLight);

      // Subtle cyan aerospace edge/fill light
      const fillLight = new THREE.DirectionalLight(0xa5f3fc, 1.4);
      fillLight.position.set(-60, 100, -40);
      scene.add(fillLight);

      // Pure top-down light to illuminate horizontal detail (heatsinks, ports, labels)
      const topLight = new THREE.DirectionalLight(0xffffff, 1.6);
      topLight.position.set(0, 200, 0);
      scene.add(topLight);

      // 5. Orthographic camera looking down +Y
      // X = Left/Right, Z = Front/Back (Nose is -Z, Tail is +Z)
      // up = (0, 0, -1) so that -Z (Forward/Nose) points UP on the 2D canvas
      const widthSpan = Math.max(size.x, 8);
      const lengthSpan = Math.max(size.z, 8);
      const maxSpan = Math.max(widthSpan, lengthSpan) * 1.12; // 12% margin for edges

      const camera = new THREE.OrthographicCamera(
        -maxSpan / 2,
        maxSpan / 2,
        maxSpan / 2,
        -maxSpan / 2,
        0.1,
        2000
      );
      camera.position.set(0, Math.max(size.y * 6, 300), 0);
      camera.up.set(0, 0, -1);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();

      // 6. Render to offscreen canvas
      renderer.render(scene, camera);
      const dataUrl = renderer.domElement.toDataURL("image/png");

      const aspect = (size.z > 0 ? size.x / size.z : 1) || 1;
      const result: TopDownRenderResult = {
        dataUrl,
        aspect,
        widthMm: size.x,
        lengthMm: size.z,
        heightMm: size.y,
      };

      thumbnailCache.set(cacheKey, result);
      return result;
    } catch (err) {
      console.warn(`Could not render 3D top-down for component ${componentId}:`, err);
      return null;
    } finally {
      pendingPromises.delete(cacheKey);
    }
  })();

  pendingPromises.set(cacheKey, renderPromise);
  return renderPromise;
}

/**
 * Returns cached thumbnail immediately if available
 */
export function getCachedTopDownThumbnail(
  componentId: string,
  customColor?: string
): TopDownRenderResult | null {
  const cacheKey = `${componentId}_${customColor || "default"}`;
  return thumbnailCache.get(cacheKey) || null;
}

/**
 * Pre-warms cache for key avionics components in the background
 */
export function prewarmTopDownCache(componentIds: string[]): void {
  const uniqueIds = Array.from(new Set(componentIds));
  uniqueIds.forEach((id, idx) => {
    setTimeout(() => {
      renderTopDown3DModel(id).catch(() => {});
    }, idx * 100);
  });
}
