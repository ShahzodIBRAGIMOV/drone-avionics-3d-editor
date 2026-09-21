import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { loadModelIndex, loadModelAsset, clearAllModelCache, clearSingleModelCache, getCachedBuffer, setCachedBuffer, ModelAsset } from "../modelAssetLoader";

export interface CustomModelRecord {
  componentId: string;
  assetKey: string;
  sourceType: "file" | "preset" | "url";
  format?: "obj" | "stl" | "glb" | "gltf";
  scaleMultiplier?: number;
  fileName?: string;
  fileUrl?: string;
  sourceUrl?: string;
  presetKey?: string;
  cloudAsset?: {
    assetId: string;
    chunks: number;
    byteLength: number;
  };
  updatedAt: number;
}

export const COMPONENT_ID_TO_ASSET_KEY: Record<string, string> = {
  "01": "drone",
  "02": "cube-orange",
  "03": "here3",
  "04": "hm30",
  "05": "zr10",
  "06": "matek-bec",
  "07": "pm02d",
  "08": "tattu",
  "09": "avionics-battery",
  "10": "motor",
  "11": "esc",
  "12": "servo",
  "13": "pitot",
  "14": "airspeed-module",
  "15": "led",
  "16": "estop",
  "17": "propeller",
  "18": "hobbywing-ubec",
  "19": "jetson-p3737",
  "20": "siyi-bec",
  "21": "foldable-omni-antenna",
  "22": "radiomaster-dbr4",
  "23": "ls1005g-switch",
  "24": "gigablox-switch",
  "25": "ubec-12v-pro",
  "26": "ubec-12v-aux",
  "27": "ubec-12v-servo",
};

export type LoadingProgressCallback = (loaded: number, total: number, currentItem: string) => void;

export interface Preset3DModel {
  assetKey: string;
  name: string;
  category: "airframe" | "computing" | "power" | "sensors" | "propulsion" | "actuation" | "rf";
  description: string;
  format: "glb" | "stl" | "obj" | "gltf";
  dimensionsMm?: [number, number, number];
}

export const PRESET_3D_MODELS: Preset3DModel[] = [
  {
    assetKey: "drone",
    name: "3800mm VTOL Dron Korpusi",
    category: "airframe",
    description: "3800 mm qanot kengligi, 2550 mm fyuzelyaj, kompozit korpus",
    format: "glb",
    dimensionsMm: [3800, 2550, 480],
  },
  {
    assetKey: "jetson-p3737",
    name: "NVIDIA Jetson P3737 Carrier",
    category: "computing",
    description: "Sun'iy intellekt va kompyuter ko'rishi hisoblash moduli",
    format: "stl",
    dimensionsMm: [105, 105, 35],
  },
  {
    assetKey: "cube-orange",
    name: "Cube Orange ADS-B Avtopilot",
    category: "computing",
    description: "Uch karra zaxiralangan IMU avtopilot tizimi",
    format: "glb",
    dimensionsMm: [38, 38, 22],
  },
  {
    assetKey: "here3",
    name: "Here3 / Here4 Precision GNSS",
    category: "sensors",
    description: "RTK qo'llab-quvvatlovchi yuqori aniqlikdagi GPS moduli",
    format: "glb",
    dimensionsMm: [76, 76, 16],
  },
  {
    assetKey: "hm30",
    name: "MK32 HM30 Air Unit Datalink",
    category: "rf",
    description: "30 km gacha telemetriya va Full HD video uzatuvchi radio",
    format: "glb",
    dimensionsMm: [70, 55, 24],
  },
  {
    assetKey: "zr10",
    name: "SIYI ZR10 Gimbal Zoom Kamera",
    category: "sensors",
    description: "30x gibrid zum, optik stabillashgan 2K/4K kamera",
    format: "glb",
    dimensionsMm: [121, 101, 142],
  },
  {
    assetKey: "pm02d",
    name: "Holybro PM02D / PM07 12S",
    category: "power",
    description: "CAN/I2C quvvat telemetriya moduli va XT60 kabeli",
    format: "glb",
    dimensionsMm: [45, 28, 14],
  },
  {
    assetKey: "matek-bec",
    name: "Matek BEC12S Pro",
    category: "power",
    description: "9-55V kirishli, bort kompyuteri regulyatori",
    format: "glb",
    dimensionsMm: [48, 30, 16],
  },
  {
    assetKey: "tattu",
    name: "TATTU 22000 mAh 6S LiPo",
    category: "power",
    description: "Asosiy tortish tizimi uchun 25C yuqori sig'imli akkumulyator",
    format: "glb",
    dimensionsMm: [206, 91, 68],
  },
  {
    assetKey: "avionics-battery",
    name: "4S Avionika LiPo Akkumulyatori",
    category: "power",
    description: "Bort hisoblash va zaxira ta'minot batareyasi",
    format: "glb",
    dimensionsMm: [140, 45, 35],
  },
  {
    assetKey: "motor",
    name: "SunnySky Cho'tkasiz Dvigatel",
    category: "propulsion",
    description: "Yuqori samaradorlikka ega VTOL/tortuvchi elektrodvigatel",
    format: "glb",
    dimensionsMm: [80, 80, 60],
  },
  {
    assetKey: "esc",
    name: "AT115A Tezlik Regulyatori (ESC)",
    category: "propulsion",
    description: "115A uzluksiz tokka mo'ljallangan telemetriyali ESC",
    format: "glb",
    dimensionsMm: [78, 34, 18],
  },
  {
    assetKey: "servo",
    name: "Savox Raqamli Metall Servoprivod",
    category: "actuation",
    description: "Eleronlar, rullar va flaplar uchun yuqori aniqlikdagi servo",
    format: "glb",
    dimensionsMm: [40, 20, 37],
  },
  {
    assetKey: "pitot",
    name: "Holybro Pito Naychasi (Pitot Tube)",
    category: "sensors",
    description: "Dinamik havo tezligini o'lchovchi aerodinamik pito naychasi",
    format: "glb",
    dimensionsMm: [180, 20, 15],
  },
  {
    assetKey: "airspeed-module",
    name: "MS5525DSO Havo Tezligi Datchigi",
    category: "sensors",
    description: "I2C differensial bosim o'lchovchi yuqori sezgir sensor",
    format: "glb",
    dimensionsMm: [22, 18, 12],
  },
  {
    assetKey: "foldable-omni-antenna",
    name: "Yig'iluvchi Omni Antenna (SMA)",
    category: "rf",
    description: "146.5 mm SMA ulagichli ko'p yo'nalishli radiochastota antennasi",
    format: "glb",
    dimensionsMm: [14, 14, 146],
  },
  {
    assetKey: "propeller",
    name: "20x10 Ikki Parrakli Propeller",
    category: "propulsion",
    description: "Uglerod tolali yuqori tortish quvvatiga ega parrak",
    format: "glb",
    dimensionsMm: [508, 42, 28],
  },
  {
    assetKey: "hobbywing-ubec",
    name: "Hobbywing Yuqori Voltajli UBEC",
    category: "power",
    description: "Servolar va avionika uchun past shovqinli impulsli regulyator",
    format: "glb",
    dimensionsMm: [55, 25, 12],
  },
  {
    assetKey: "siyi-bec",
    name: "SIYI 4-18S BEC HM30",
    category: "power",
    description: "Datalink va havo moduli uchun maxsus kuchlanish regulyatori",
    format: "glb",
    dimensionsMm: [38, 26, 12],
  },
  {
    assetKey: "led",
    name: "Eagle Eye Qanot Navigatsiya Chirog'i",
    category: "actuation",
    description: "Chap va o'ng qanot uchlari uchun yuqori yorug'likli LED",
    format: "glb",
    dimensionsMm: [22, 22, 12],
  },
  {
    assetKey: "estop",
    name: "Avariyaviy To'xtatish Tugmasi (E-Stop)",
    category: "power",
    description: "Yuqori xavfsizlikli mexanik elektr uzgich",
    format: "glb",
    dimensionsMm: [36, 36, 42],
  },
  {
    assetKey: "radiomaster-dbr4",
    name: "RadioMaster DBR4 Qabul qiluvchi",
    category: "rf",
    description: "Ikkita chastotali telemetriya va boshqaruv qabul qilgichi",
    format: "glb",
    dimensionsMm: [32, 21, 9],
  },
  {
    assetKey: "ls1005g-switch",
    name: "LS1005G 5-Port RJ45 Ethernet Switch",
    category: "computing",
    description: "5 ta RJ45 portli gigabit kommutator moduli",
    format: "glb",
    dimensionsMm: [70, 50, 20],
  },
  {
    assetKey: "gigablox-switch",
    name: "GigaBlox RevC Gigabit Switch",
    category: "computing",
    description: "Kichik o'lchamli yuqori tezlikdagi bort kommutatori",
    format: "glb",
    dimensionsMm: [55, 45, 18],
  },
  {
    assetKey: "ubec-12v-pro",
    name: "UBEC 12V 8A PRO",
    category: "power",
    description: "12V 8A maxsus kuchlanish stabilizatori",
    format: "glb",
    dimensionsMm: [48, 26, 12],
  },
  {
    assetKey: "ubec-12v-aux",
    name: "UBEC 12V 8A AUX",
    category: "power",
    description: "Qo'shimcha qurilmalar uchun 12V regulyator",
    format: "glb",
    dimensionsMm: [48, 26, 12],
  },
  {
    assetKey: "ubec-12v-servo",
    name: "UBEC 12V 8A Servo",
    category: "power",
    description: "Servoprivodlar quvvat ta'minoti regulyatori",
    format: "glb",
    dimensionsMm: [48, 26, 12],
  },
];

class ModelManager {
  private indexCache: Record<string, ModelAsset> | null = null;
  private templateCache: Map<string, THREE.Object3D> = new Map();
  private loadingPromises: Map<string, Promise<THREE.Object3D>> = new Map();
  private stlLoader = new STLLoader();
  private objLoader = new OBJLoader();
  private gltfLoader = new GLTFLoader();
  public loadErrors: Map<string, string> = new Map();
  public airframeScale: number = 1.0;
  private cacheBuster: number = Date.now();

  async clearCache(clearPersistent = false): Promise<void> {
    this.indexCache = null;
    this.templateCache.clear();
    this.loadingPromises.clear();
    this.loadErrors.clear();
    this.cacheBuster = Date.now();
    if (clearPersistent) {
      await clearAllModelCache();
    }
  }

  async getIndex(forceReload = false): Promise<Record<string, ModelAsset>> {
    if (!this.indexCache || forceReload) {
      this.indexCache = await loadModelIndex(forceReload ? this.cacheBuster : undefined);
    }
    return this.indexCache;
  }

  // Realistic aerospace engineering materials for component visualization
  private getAviationMaterial(componentId: string, assetKey: string): THREE.Material {
    switch (componentId) {
      case "01": // Drone airframe (Clean aviation composite)
        return new THREE.MeshStandardMaterial({
          color: 0xffffff,
          roughness: 0.35,
          metalness: 0.08,
          transparent: false,
          opacity: 1.0,
          depthWrite: true,
          side: THREE.DoubleSide,
          vertexColors: true,
        });

      case "02": // CUBE Orange (Anodized vibrant orange CNC aluminum + black base)
        return new THREE.MeshStandardMaterial({
          color: 0xff6600,
          roughness: 0.3,
          metalness: 0.7,
        });

      case "03": // Here3 GPS (Matte Dark Charcoal polycarb with dome)
        return new THREE.MeshStandardMaterial({
          color: 0x22262a,
          roughness: 0.4,
          metalness: 0.3,
        });

      case "04": // HM30 Air unit (Anodized Space Gray aluminum)
        return new THREE.MeshStandardMaterial({
          color: 0x474e54,
          roughness: 0.35,
          metalness: 0.8,
        });

      case "05": // ZR10 Gimbal (Matte Black anodized CNC)
        return new THREE.MeshStandardMaterial({
          color: 0x1c1f22,
          roughness: 0.3,
          metalness: 0.6,
        });

      case "06": // Matek BEC (FR4 PCB Blue/Black + inductor coils)
        return new THREE.MeshStandardMaterial({
          color: 0x1d4e78,
          roughness: 0.5,
          metalness: 0.4,
        });

      case "07": // PM02D / PM07 Power Module
        return new THREE.MeshStandardMaterial({
          color: 0x282c30,
          roughness: 0.4,
          metalness: 0.6,
        });

      case "08": // TATTU 22000mAh Battery (Industrial Silver/Black shrink wrap)
        return new THREE.MeshStandardMaterial({
          color: 0xd8dde0,
          roughness: 0.4,
          metalness: 0.4,
        });

      case "09": // 4S Avionics Battery (Blue/Black LiPo wrap)
        return new THREE.MeshStandardMaterial({
          color: 0x2055a5,
          roughness: 0.5,
          metalness: 0.2,
        });

      case "10": // SunnySky Motor (Gunmetal bell + copper wire interior + black mount)
        return new THREE.MeshStandardMaterial({
          color: 0x3d4349,
          roughness: 0.25,
          metalness: 0.85,
        });

      case "11": // AT115A ESC (Black CNC aluminum finned heatsink)
        return new THREE.MeshStandardMaterial({
          color: 0x15181b,
          roughness: 0.35,
          metalness: 0.7,
        });

      case "12": // Savox Servo (Black composite body with Orange/Titanium CNC middle band)
        return new THREE.MeshStandardMaterial({
          color: 0x222426,
          roughness: 0.35,
          metalness: 0.5,
        });

      case "13": // Holybro Pitot Tube (Polished Stainless Steel needle)
        return new THREE.MeshStandardMaterial({
          color: 0xe0e6eb,
          roughness: 0.15,
          metalness: 0.95,
        });

      case "14": // Airspeed Module (Small Blue PCB with metal pressure transducers)
        return new THREE.MeshStandardMaterial({
          color: 0x1e5a8a,
          roughness: 0.4,
          metalness: 0.5,
        });

      case "15": // Eagle Eye LED (Polished Chrome cup with optical lens)
        return new THREE.MeshStandardMaterial({
          color: 0xdde4e8,
          roughness: 0.2,
          metalness: 0.9,
        });

      case "16": // E-Stop (Industrial Red mushroom cap on yellow/black housing)
        return new THREE.MeshStandardMaterial({
          color: 0xdd2222,
          roughness: 0.3,
          metalness: 0.3,
        });

      case "17": // 20x10 Propeller (Glossy Carbon Fiber Weave Black)
        return new THREE.MeshStandardMaterial({
          color: 0x181a1c,
          roughness: 0.2,
          metalness: 0.4,
        });

      case "18": // Hobbywing UBEC (Dark Red/Silver aluminum casing)
        return new THREE.MeshStandardMaterial({
          color: 0x9a2222,
          roughness: 0.3,
          metalness: 0.6,
        });

      case "19": // Jetson Carrier Assembly (P3737 industrial motherboard with silver ports & dark heatsink)
        return new THREE.MeshStandardMaterial({
          color: 0x2e383f,
          roughness: 0.35,
          metalness: 0.65,
        });

      case "20": // SIYI BEC (Black mini enclosure)
        return new THREE.MeshStandardMaterial({
          color: 0x202326,
          roughness: 0.4,
          metalness: 0.5,
        });

      case "21": // Foldable omni antenna (Aerospace matte graphite with SMA accent)
        return new THREE.MeshStandardMaterial({
          color: 0x1e2229,
          roughness: 0.32,
          metalness: 0.3,
        });

      case "22": // RadioMaster DBR4 receiver (Compact dark polycarbonate case)
        return new THREE.MeshStandardMaterial({
          color: 0x181a1d,
          roughness: 0.35,
          metalness: 0.4,
        });

      case "23": // LS1005G Switch (Industrial metal gray/blue housing)
        return new THREE.MeshStandardMaterial({
          color: 0x243242,
          roughness: 0.3,
          metalness: 0.6,
        });

      case "24": // GigaBlox Gigabit Switch (Rugged matte black anodized aluminum)
        return new THREE.MeshStandardMaterial({
          color: 0x141618,
          roughness: 0.25,
          metalness: 0.75,
        });

      case "25": // UBEC 12S PRO (CNC anodized teal/dark cyan aluminum casing)
        return new THREE.MeshStandardMaterial({
          color: 0x124559,
          roughness: 0.3,
          metalness: 0.7,
        });

      case "26": // Auxiliary 12V UBEC (Anodized dark red aluminum)
      case "27": // Servo Power 12V UBEC (Anodized dark red aluminum)
        return new THREE.MeshStandardMaterial({
          color: 0x8a1c1c,
          roughness: 0.3,
          metalness: 0.65,
        });

      default:
        return new THREE.MeshStandardMaterial({
          color: 0x5a6872,
          roughness: 0.4,
          metalness: 0.5,
        });
    }
  }

  // Create a high-detail procedural avionics module enclosure when no 3D asset exists or network fails
  createProceduralFallbackTemplate(componentId: string, assetKey: string): THREE.Group {
    const group = new THREE.Group();
    group.name = `template_${assetKey}`;

    const dimsMap: Record<string, [number, number, number]> = {
      "22": [28, 11, 18],
      "23": [90, 23, 72],
      "24": [50, 15, 50],
      "25": [60, 14, 28],
      "26": [48, 12, 24],
      "27": [48, 12, 24],
    };
    const [dimX, dimY, dimZ] = dimsMap[componentId] || [50, 16, 32];

    const bodyMat = this.getAviationMaterial(componentId, assetKey);
    const bodyGeom = new THREE.BoxGeometry(dimX, dimY, dimZ);
    const bodyMesh = new THREE.Mesh(bodyGeom, bodyMat);
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    group.add(bodyMesh);

    // Beveled / contrast top heatsink or cover plate
    const topPlateGeom = new THREE.BoxGeometry(dimX * 0.92, Math.max(1, dimY * 0.08), dimZ * 0.92);
    const topPlateMat = new THREE.MeshStandardMaterial({
      color: 0x222a33,
      metalness: 0.85,
      roughness: 0.25,
    });
    const topPlate = new THREE.Mesh(topPlateGeom, topPlateMat);
    topPlate.position.y = dimY / 2 + Math.max(0.5, dimY * 0.04);
    group.add(topPlate);

    // Subtle power/status LED dot on corner
    const ledGeom = new THREE.CylinderGeometry(
      Math.min(dimX, dimZ) * 0.035,
      Math.min(dimX, dimZ) * 0.035,
      1,
      12
    );
    const ledMat = new THREE.MeshBasicMaterial({ color: 0x00e676 });
    const led = new THREE.Mesh(ledGeom, ledMat);
    led.position.set(-dimX * 0.38, dimY / 2 + 0.8, -dimZ * 0.38);
    group.add(led);

    return group;
  }

  async loadModelTemplate(componentId: string, forceReload = false): Promise<THREE.Object3D> {
    let assetKey = COMPONENT_ID_TO_ASSET_KEY[componentId] || `comp_${componentId}`;
    this.registerCustomComponent(componentId, assetKey);

    if (!forceReload) {
      const cached =
        this.templateCache.get(assetKey) ||
        this.templateCache.get(componentId) ||
        this.templateCache.get(`custom_${componentId}`);
      if (cached) {
        return cached;
      }
    }

    if (!forceReload && (this.loadingPromises.has(assetKey) || this.loadingPromises.has(componentId))) {
      return (this.loadingPromises.get(assetKey) || this.loadingPromises.get(componentId))!;
    }

    const loadPromise = (async () => {
      try {
        // 1. FIRST: Check if this component has a custom model record (from user upload or repo manifest)
        const customRecord = this.getCustomModelRegistry()[componentId];
        if (customRecord) {
          try {
            let customObject: THREE.Object3D | null = null;
            if (customRecord.sourceType === "preset" && customRecord.presetKey) {
              customObject = await this.assignPresetModel(componentId, customRecord.presetKey, false);
            } else {
              // Helper to detect corrupt HTML responses
              const isBufferCorrupt = (buf: ArrayBuffer | null | undefined): boolean => {
                if (!buf || buf.byteLength < 50) return true;
                const slice = new Uint8Array(buf.slice(0, 16));
                const str = String.fromCharCode(...slice).toLowerCase();
                return str.includes("<!do") || str.includes("<html") || str.includes("<?xml");
              };

              // 1.1 Priority A: Check local indexedDB buffer (holds user's uploaded binary files)
              const bufferKey = `custom_model_buffer_${componentId}`;
              let buffer = await getCachedBuffer(bufferKey);
              if (buffer && isBufferCorrupt(buffer)) {
                buffer = null;
                await setCachedBuffer(bufferKey, new ArrayBuffer(0)).catch(() => {});
              }

              // 1.2 Priority B: If no buffer in local storage, fetch from fileUrl or /models/custom/...
              if (!buffer || buffer.byteLength === 0) {
                const targetPath =
                  customRecord.fileUrl ||
                  (customRecord.fileName ? `/models/custom/${customRecord.fileName}` : undefined);
                if (targetPath) {
                  try {
                    const cacheBusterParam = `t=${customRecord.updatedAt || this.cacheBuster || Date.now()}`;
                    const fullUrl = targetPath.includes("?")
                      ? `${targetPath}&${cacheBusterParam}`
                      : `${targetPath}?${cacheBusterParam}`;
                    const res = await fetch(fullUrl);
                    if (res.ok) {
                      const fetched = await res.arrayBuffer();
                      if (fetched && !isBufferCorrupt(fetched)) {
                        buffer = fetched;
                        await setCachedBuffer(bufferKey, buffer);
                      }
                    }
                  } catch (fetchErr) {
                    console.warn(`Could not fetch custom model for ${componentId}:`, fetchErr);
                  }
                }
              }

              if (buffer && buffer.byteLength > 0) {
                let fmt = customRecord.format;
                if (!fmt) {
                  const fname = (customRecord.fileName || customRecord.fileUrl || "").split("?")[0].toLowerCase();
                  if (fname.endsWith(".stl")) fmt = "stl";
                  else if (fname.endsWith(".glb")) fmt = "glb";
                  else if (fname.endsWith(".gltf")) fmt = "gltf";
                  else fmt = "obj";
                }
                customObject = await this.loadCustomModel(
                  componentId,
                  buffer,
                  fmt,
                  customRecord.scaleMultiplier || 1.0,
                  customRecord.fileName,
                  false
                );
              }
            }
            if (customObject) {
              this.templateCache.set(assetKey, customObject);
              this.templateCache.set(componentId, customObject);
              this.templateCache.set(`custom_${componentId}`, customObject);
              this.loadErrors.delete(assetKey);
              this.loadErrors.delete(componentId);
              return customObject;
            }
          } catch (custErr) {
            console.warn(`Custom model load failed for ${componentId}, falling back to built-in/procedural:`, custErr);
          }
        }

        // 2. Otherwise load built-in asset from index
        const index = await this.getIndex(forceReload);
        let asset = index[assetKey];
        if (!asset && componentId === "07") {
          // Fallback if key is pm07 or pm02d
          assetKey = index["pm02d"] ? "pm02d" : "pm07";
          asset = index[assetKey];
        }
        if (!asset) {
          const fallback = this.createProceduralFallbackTemplate(componentId, assetKey);
          this.templateCache.set(assetKey, fallback);
          this.templateCache.set(componentId, fallback);
          this.templateCache.set(`custom_${componentId}`, fallback);
          this.loadErrors.delete(assetKey);
          this.loadErrors.delete(componentId);
          return fallback;
        }

        const arrayBuffer = await loadModelAsset(
          asset,
          forceReload ? this.cacheBuster : undefined
        );
        let object: THREE.Object3D;

        if (asset.format === "stl") {
          const geometry = this.stlLoader.parse(arrayBuffer);
          geometry.computeVertexNormals();
          const material = this.getAviationMaterial(componentId, assetKey);
          const mesh = new THREE.Mesh(geometry, material);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          object = mesh;
        } else if (asset.format === "glb" || asset.format === "gltf") {
          const gltf = await new Promise<THREE.Group>((resolve, reject) => {
            this.gltfLoader.parse(
              arrayBuffer,
              "",
              (result) => resolve(result.scene),
              (error) => reject(error)
            );
          });
          
          gltf.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const mesh = child as THREE.Mesh;
              mesh.castShadow = true;
              mesh.receiveShadow = true;
              if (mesh.geometry && (!mesh.geometry.attributes.normal || mesh.geometry.attributes.normal.count === 0)) {
                mesh.geometry.computeVertexNormals();
              }
              const hasVertexColor = !!mesh.geometry?.attributes?.color;
              const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
              mats.forEach((m) => {
                if (!m) return;
                const stdMat = m as THREE.MeshStandardMaterial;
                if (hasVertexColor) {
                  stdMat.vertexColors = true;
                  if (stdMat.color) stdMat.color.setHex(0xffffff);
                  stdMat.side = THREE.DoubleSide;
                }
                if (stdMat.color) {
                  stdMat.userData = {
                    ...stdMat.userData,
                    origColor: stdMat.color.getHex(),
                    origRoughness: stdMat.roughness,
                    origMetalness: stdMat.metalness,
                    hasVertexColors: hasVertexColor,
                  };
                }
              });
            }
          });
          object = gltf;
        } else {
          const text = new TextDecoder("utf-8").decode(arrayBuffer);
          const group = this.objLoader.parse(text);
          const material = this.getAviationMaterial(componentId, assetKey);
          group.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const mesh = child as THREE.Mesh;
              mesh.material = material;
              mesh.castShadow = true;
              mesh.receiveShadow = true;
              mesh.geometry.computeVertexNormals();
            }
          });
          object = group;
        }

        // Apply specific dimension scaling & alignment
        if (componentId === "01") {
          // Drone Airframe: Ensure wingspan is exactly 3500 mm and laid flat horizontally
          // Check raw bounds to detect orientation
          const initialBox = new THREE.Box3().setFromObject(object);
          const initialSize = new THREE.Vector3();
          initialBox.getSize(initialSize);

          // If wings are oriented along Y axis (standing on wing / vertical span)
          if (initialSize.y > initialSize.x && initialSize.y > initialSize.z) {
            // Rotate: Wings along X (-1750 to +1750mm), fuselage along Z (nose +Z, tail -Z), fin up (+Y)
            object.rotation.set(-Math.PI / 2, 0, -Math.PI / 2);
            object.updateMatrixWorld(true);
          } else if (initialSize.z > initialSize.x && initialSize.z > initialSize.y) {
            // If wings were along Z, rotate to align along X
            object.rotation.y = Math.PI / 2;
            object.updateMatrixWorld(true);
          }

          const box = new THREE.Box3().setFromObject(object);
          const size = new THREE.Vector3();
          box.getSize(size);
          const center = new THREE.Vector3();
          box.getCenter(center);

          // Target wingspan is 3800 mm (along X axis) as per updated GitHub model & manifest
          const targetWingspan = 3800;
          const spanRaw = size.x > 0 ? size.x : Math.max(size.z, size.y);
          if (spanRaw > 0) {
            this.airframeScale = targetWingspan / spanRaw;
            object.scale.set(this.airframeScale, this.airframeScale, this.airframeScale);
          }
          // Center origin (X=0, Y=0, Z=0)
          object.position.set(-center.x * this.airframeScale, -center.y * this.airframeScale, -center.z * this.airframeScale);
          object.updateMatrixWorld(true);
          
          const wrapper = new THREE.Group();
          wrapper.add(object);
          wrapper.name = "drone_airframe_template";
          this.templateCache.set(assetKey, wrapper);
          return wrapper;
        }

        // Check if model scale is in meters (max dimension < 1.0) and convert to millimeters
        const preBox = new THREE.Box3().setFromObject(object);
        const preSize = new THREE.Vector3();
        preBox.getSize(preSize);
        const maxDim = Math.max(preSize.x, preSize.y, preSize.z);
        if (maxDim > 0 && maxDim < 1.0) {
          // Model was exported in meters (e.g., Holybro PM02D colored GLB is 0.156m) -> scale to mm
          object.scale.multiplyScalar(1000);
          object.updateMatrixWorld(true);
        }

        // Avionics components whose CAD export had Z as UP axis.
        // Rotating by -Math.PI / 2 on X lays them flat horizontally in the X-Z plane,
        // with their tops facing UP (+Y) rather than standing/lying along the Z axis.
        // Servos ('12') are excluded so they orient according to their specific placement.
        const CAD_Z_UP_COMPONENTS = new Set([
          "02", // Cube Orange (orange top faces +Y, base flat in X-Z)
          "03", // Here3 GPS (dome faces +Y, round base flat in X-Z)
          "04", // HM30 datalink (flat in X-Z)
          "11", // ESC (aluminum heatsink flat in X-Z, cooling fins +Y)
          "14", // MS5525DSO Airspeed module (sensor PCB flat in X-Z)
          "16", // E-Stop emergency stop switch (red mushroom button faces +Y)
          "19", // Jetson P3737 carrier board (board flat in X-Z, heatsink +Y)
          "20", // SIYI BEC (flat in X-Z)
        ]);

        if (CAD_Z_UP_COMPONENTS.has(componentId)) {
          object.rotation.x = -Math.PI / 2;
          object.updateMatrixWorld(true);
        }

        // Center other component geometries around their local origin (0, 0, 0)
        const box = new THREE.Box3().setFromObject(object);
        const center = new THREE.Vector3();
        box.getCenter(center);
        
        object.position.sub(center);
        const wrapper = new THREE.Group();
        wrapper.add(object);
        wrapper.name = `template_${assetKey}`;

        this.templateCache.set(assetKey, wrapper);
        this.templateCache.set(componentId, wrapper);
        this.templateCache.set(`custom_${componentId}`, wrapper);
        this.loadErrors.delete(assetKey);
        this.loadErrors.delete(componentId);
        return wrapper;
      } catch (err: any) {
        console.warn(`Model loading error for ${componentId} (${assetKey}):`, err);
        const fallback = this.createProceduralFallbackTemplate(componentId, assetKey);
        this.templateCache.set(assetKey, fallback);
        this.templateCache.set(componentId, fallback);
        this.templateCache.set(`custom_${componentId}`, fallback);
        this.loadErrors.delete(assetKey);
        this.loadErrors.delete(componentId);
        return fallback;
      } finally {
        this.loadingPromises.delete(assetKey);
        this.loadingPromises.delete(componentId);
      }
    })();

    this.loadingPromises.set(assetKey, loadPromise);
    this.loadingPromises.set(componentId, loadPromise);
    return loadPromise;
  }

  async preloadAllModels(
    onProgress?: (current: number, total: number, name: string) => void
  ): Promise<{ loaded: number; failed: number }> {
    const componentIds = Object.keys(COMPONENT_ID_TO_ASSET_KEY);
    let loaded = 0;
    let failed = 0;

    for (let i = 0; i < componentIds.length; i++) {
      const id = componentIds[i];
      const assetKey = COMPONENT_ID_TO_ASSET_KEY[id] || id;
      if (onProgress) {
        onProgress(i + 1, componentIds.length, assetKey);
      }
      try {
        await this.loadModelTemplate(id);
        loaded++;
      } catch (err) {
        console.warn(`Preload error for ${assetKey}:`, err);
        failed++;
      }
    }
    return { loaded, failed };
  }

  createInstanceMesh(componentId: string, instanceId: string, customMaterial?: THREE.Material): THREE.Group {
    let assetKey = COMPONENT_ID_TO_ASSET_KEY[componentId] || componentId;
    let template =
      this.templateCache.get(assetKey) ||
      this.templateCache.get(componentId) ||
      this.templateCache.get(`custom_${componentId}`);
    if (!template && componentId === "07") {
      template = this.templateCache.get("pm02d") || this.templateCache.get("pm07");
    }
    if (!template) {
      template = this.createProceduralFallbackTemplate(componentId, assetKey);
      this.templateCache.set(assetKey, template);
      this.templateCache.set(componentId, template);
      this.templateCache.set(`custom_${componentId}`, template);
    }

    const clone = template.clone(true) as THREE.Group;
    clone.name = `instance_${instanceId}`;
    clone.userData = {
      instanceId,
      componentId,
      assetKey,
    };

    // Deep clone materials so each instance can be independently tinted/colored
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (Array.isArray(mesh.material)) {
          mesh.material = mesh.material.map((m) => {
            const cloned = m.clone();
            const origColor = (m as any).userData?.origColor !== undefined ? (m as any).userData.origColor : ((cloned as any).color ? (cloned as any).color.getHex() : undefined);
            (cloned as any).userData = { ...cloned.userData, ...(m as any).userData, origColor };
            return cloned;
          });
        } else if (mesh.material) {
          const m = mesh.material;
          const cloned = m.clone();
          const origColor = (m as any).userData?.origColor !== undefined ? (m as any).userData.origColor : ((cloned as any).color ? (cloned as any).color.getHex() : undefined);
          (cloned as any).userData = { ...cloned.userData, ...(m as any).userData, origColor };
          mesh.material = cloned;
        }
      }
    });

    if (customMaterial) {
      clone.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          (child as THREE.Mesh).material = customMaterial;
        }
      });
    }

    return clone;
  }

  // Force-reload all 21 models with authentic original colors, bypassing any caches
  async reloadAllModelsWithOriginalColors(
    onProgress?: (current: number, total: number, name: string) => void
  ): Promise<{ loaded: number; failed: number }> {
    await this.clearCache(true);
    return await this.preloadAllModels(onProgress);
  }

  // Reload a single specific model (e.g. Jetson '19'), bypassing any cached buffers
  async reloadSingleModel(componentId: string): Promise<THREE.Object3D> {
    const assetKey = COMPONENT_ID_TO_ASSET_KEY[componentId] || componentId;
    this.cacheBuster = Date.now();
    this.loadErrors.delete(assetKey);
    this.loadErrors.delete(componentId);
    this.templateCache.delete(assetKey);
    this.templateCache.delete(componentId);
    this.templateCache.delete(`custom_${componentId}`);
    this.loadingPromises.delete(assetKey);
    this.loadingPromises.delete(componentId);

    // Only clear built-in caches, NEVER delete custom_model_buffer_
    await clearSingleModelCache(assetKey, false);
    await clearSingleModelCache(componentId, false);

    // Invalidate index cache so latest metadata is fetched
    this.indexCache = null;

    return await this.loadModelTemplate(componentId, true);
  }

  getTemplateDimensions(componentId: string): [number, number, number] | null {
    let assetKey = COMPONENT_ID_TO_ASSET_KEY[componentId] || componentId;
    let template =
      this.templateCache.get(assetKey) ||
      this.templateCache.get(componentId) ||
      this.templateCache.get(`custom_${componentId}`);
    if (!template && componentId === "07") {
      template = this.templateCache.get("pm02d") || this.templateCache.get("pm07");
    }
    if (!template) return null;

    const box = new THREE.Box3().setFromObject(template);
    const size = new THREE.Vector3();
    box.getSize(size);
    if (size.x > 0 && size.y > 0 && size.z > 0) {
      return [
        Math.round(size.x * 10) / 10,
        Math.round(size.y * 10) / 10,
        Math.round(size.z * 10) / 10,
      ];
    }
    return null;
  }

  // Persistent registry storage for custom model associations
  private customRegistryKey = "drone_custom_models_registry";

  getCustomModelRegistry(): Record<string, CustomModelRecord> {
    if (typeof localStorage === "undefined") return {};
    try {
      const raw = localStorage.getItem(this.customRegistryKey);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  saveCustomModelRecord(record: CustomModelRecord) {
    if (typeof localStorage === "undefined") return;
    try {
      const current = this.getCustomModelRegistry();
      current[record.componentId] = record;
      localStorage.setItem(this.customRegistryKey, JSON.stringify(current));
    } catch (e) {
      console.warn("Could not save custom model record:", e);
    }
  }

  removeCustomModelRecord(componentId: string) {
    if (typeof localStorage === "undefined") return;
    try {
      const current = this.getCustomModelRegistry();
      const assetKey = current[componentId]?.assetKey || COMPONENT_ID_TO_ASSET_KEY[componentId] || componentId;
      delete current[componentId];
      localStorage.setItem(this.customRegistryKey, JSON.stringify(current));

      this.templateCache.delete(assetKey);
      this.templateCache.delete(componentId);
      this.templateCache.delete(`custom_${componentId}`);
      this.loadingPromises.delete(assetKey);
      this.loadingPromises.delete(componentId);
    } catch (e) {
      console.warn("Could not remove custom model record:", e);
    }
  }

  // Register custom component mapping
  registerCustomComponent(componentId: string, assetKey: string) {
    COMPONENT_ID_TO_ASSET_KEY[componentId] = assetKey;
  }

  // Assign an existing preset model to any target component
  async assignPresetModel(
    componentId: string,
    sourceAssetKey: string,
    persist = true
  ): Promise<THREE.Object3D> {
    const targetAssetKey = COMPONENT_ID_TO_ASSET_KEY[componentId] || componentId;
    this.registerCustomComponent(componentId, targetAssetKey);

    // Invalidate old template caches
    this.templateCache.delete(targetAssetKey);
    this.templateCache.delete(componentId);
    this.templateCache.delete(`custom_${componentId}`);
    this.loadingPromises.delete(targetAssetKey);
    this.loadingPromises.delete(componentId);

    // Ensure source model template is loaded
    await this.loadModelAssetByKey(sourceAssetKey);
    const sourceTemplate = this.templateCache.get(sourceAssetKey);
    if (!sourceTemplate) {
      throw new Error(`Kutubxonada model topilmadi: ${sourceAssetKey}`);
    }

    const cloned = sourceTemplate.clone(true) as THREE.Group;
    cloned.name = `template_${targetAssetKey}`;
    this.templateCache.set(targetAssetKey, cloned);
    this.templateCache.set(componentId, cloned);
    this.templateCache.set(`custom_${componentId}`, cloned);
    this.loadErrors.delete(targetAssetKey);
    this.loadErrors.delete(componentId);

    if (persist) {
      this.saveCustomModelRecord({
        componentId,
        assetKey: targetAssetKey,
        sourceType: "preset",
        presetKey: sourceAssetKey,
        updatedAt: Date.now(),
      });
    }

    return cloned;
  }

  // Load a preset asset by its key directly
  async loadModelAssetByKey(assetKey: string): Promise<THREE.Object3D> {
    if (this.templateCache.has(assetKey)) {
      return this.templateCache.get(assetKey)!;
    }
    // Find componentId that maps to this assetKey or synthesize
    let foundCompId = Object.keys(COMPONENT_ID_TO_ASSET_KEY).find(
      (id) => COMPONENT_ID_TO_ASSET_KEY[id] === assetKey
    );
    if (foundCompId) {
      return await this.loadModelTemplate(foundCompId);
    }

    const index = await this.getIndex();
    const asset = index[assetKey];
    if (!asset) {
      throw new Error(`Model topilmadi: ${assetKey}`);
    }

    const buffer = await loadModelAsset(asset, this.cacheBuster);
    let object: THREE.Object3D;
    if (asset.format === "stl") {
      const geometry = this.stlLoader.parse(buffer);
      geometry.computeVertexNormals();
      const material = this.getAviationMaterial("00", assetKey);
      object = new THREE.Mesh(geometry, material);
    } else if (asset.format === "glb" || asset.format === "gltf") {
      object = await new Promise<THREE.Group>((resolve, reject) => {
        this.gltfLoader.parse(buffer, "", (res) => resolve(res.scene), reject);
      });
    } else {
      const text = new TextDecoder().decode(buffer);
      object = this.objLoader.parse(text);
    }

    const wrapper = new THREE.Group();
    wrapper.add(object);
    wrapper.name = `template_${assetKey}`;
    this.templateCache.set(assetKey, wrapper);
    return wrapper;
  }

  // Load custom 3D model from raw bytes (OBJ, STL, GLB, GLTF) from file upload or URL
  async loadCustomModel(
    componentId: string,
    arrayBuffer: ArrayBuffer,
    format: "obj" | "stl" | "glb" | "gltf",
    scaleMultiplier = 1.0,
    fileName?: string,
    persist = true
  ): Promise<THREE.Object3D> {
    let assetKey = COMPONENT_ID_TO_ASSET_KEY[componentId] || componentId;
    this.registerCustomComponent(componentId, assetKey);

    if (!arrayBuffer || arrayBuffer.byteLength < 50) {
      throw new Error(`Keltirilgan 3D fayl bo'sh yoki noto'g'ri (hajm: ${arrayBuffer?.byteLength || 0})`);
    }

    // Guard against corrupt HTML responses (e.g. 404/Vite index.html returned instead of binary)
    const magic = new Uint8Array(arrayBuffer.slice(0, 16));
    const magicStr = String.fromCharCode(...magic).toLowerCase();
    if (magicStr.includes("<!do") || magicStr.includes("<html") || magicStr.includes("<?xml")) {
      throw new Error(`Fayl haqiqiy 3D model emas, HTML xato sahifasi yuklandi`);
    }

    // Invalidate old template caches so the new 3D model takes effect immediately
    this.templateCache.delete(assetKey);
    this.templateCache.delete(componentId);
    this.templateCache.delete(`custom_${componentId}`);
    this.loadingPromises.delete(assetKey);
    this.loadingPromises.delete(componentId);
    await clearSingleModelCache(assetKey);
    await clearSingleModelCache(componentId);

    let object: THREE.Object3D;

    if (format === "stl") {
      const geometry = this.stlLoader.parse(arrayBuffer);
      geometry.computeVertexNormals();
      const material = this.getAviationMaterial(componentId, assetKey);
      object = new THREE.Mesh(geometry, material);
    } else if (format === "glb" || format === "gltf") {
      const gltf = await new Promise<THREE.Group>((resolve, reject) => {
        this.gltfLoader.parse(
          arrayBuffer,
          "",
          (result) => resolve(result.scene),
          (error) => reject(error)
        );
      });
      gltf.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          if (mesh.geometry) mesh.geometry.computeVertexNormals();
        }
      });
      object = gltf;
    } else {
      const text = new TextDecoder("utf-8").decode(arrayBuffer);
      const group = this.objLoader.parse(text);
      const material = this.getAviationMaterial(componentId, assetKey);
      group.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.material = material;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          mesh.geometry.computeVertexNormals();
        }
      });
      object = group;
    }

    // Auto-scale to mm if in meters (maxDim < 1.0)
    const preBox = new THREE.Box3().setFromObject(object);
    const preSize = new THREE.Vector3();
    preBox.getSize(preSize);
    const maxDim = Math.max(preSize.x, preSize.y, preSize.z);
    if (maxDim > 0 && maxDim < 1.0) {
      object.scale.multiplyScalar(1000);
      object.updateMatrixWorld(true);
    }

    // Apply user-defined scale multiplier if specified
    if (scaleMultiplier && scaleMultiplier !== 1.0) {
      object.scale.multiplyScalar(scaleMultiplier);
      object.updateMatrixWorld(true);
    }

    // Center geometry around origin
    const box = new THREE.Box3().setFromObject(object);
    const center = new THREE.Vector3();
    box.getCenter(center);
    object.position.sub(center);

    const wrapper = new THREE.Group();
    wrapper.add(object);
    wrapper.name = `template_${assetKey}`;

    this.templateCache.set(assetKey, wrapper);
    this.templateCache.set(componentId, wrapper);
    this.templateCache.set(`custom_${componentId}`, wrapper);
    this.loadErrors.delete(assetKey);
    this.loadErrors.delete(componentId);

    if (persist) {
      try {
        const bufferCacheKey = `custom_model_buffer_${componentId}`;
        await setCachedBuffer(bufferCacheKey, arrayBuffer);
        this.saveCustomModelRecord({
          componentId,
          assetKey,
          sourceType: "file",
          format,
          scaleMultiplier,
          fileName,
          fileUrl: fileName ? `/models/custom/${fileName}` : undefined,
          updatedAt: Date.now(),
        });
      } catch (err) {
        console.warn("Could not cache custom model buffer persistently:", err);
      }
    }

    return wrapper;
  }

  // Load model directly from GitHub or arbitrary URL
  async loadCustomModelFromUrl(
    componentId: string,
    rawUrl: string,
    scaleMultiplier = 1.0,
    persist = true,
    specifiedFormat?: "obj" | "stl" | "glb" | "gltf"
  ): Promise<THREE.Object3D> {
    // Transform standard GitHub blob URLs into raw URLs
    let fetchUrl = rawUrl.trim();
    if (fetchUrl.includes("github.com") && fetchUrl.includes("/blob/")) {
      fetchUrl = fetchUrl
        .replace("github.com", "raw.githubusercontent.com")
        .replace("/blob/", "/");
    }

    const res = await fetch(fetchUrl);
    if (!res.ok) {
      throw new Error(`Model yuklab olinmadi: HTTP ${res.status}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    const cleanUrl = fetchUrl.split("?")[0].split("#")[0].toLowerCase();
    let format: "obj" | "stl" | "glb" | "gltf" = specifiedFormat || "glb";
    if (!specifiedFormat) {
      if (cleanUrl.endsWith(".stl")) format = "stl";
      else if (cleanUrl.endsWith(".glb")) format = "glb";
      else if (cleanUrl.endsWith(".gltf")) format = "gltf";
      else if (cleanUrl.endsWith(".obj")) format = "obj";
    }

    const cleanFileName = fetchUrl.split("?")[0].split("#")[0].split("/").pop();
    const wrapper = await this.loadCustomModel(
      componentId,
      arrayBuffer,
      format,
      scaleMultiplier,
      cleanFileName,
      false
    );

    if (persist) {
      try {
        const bufferCacheKey = `custom_model_buffer_${componentId}`;
        await setCachedBuffer(bufferCacheKey, arrayBuffer);
        this.saveCustomModelRecord({
          componentId,
          assetKey: COMPONENT_ID_TO_ASSET_KEY[componentId] || componentId,
          sourceType: "url",
          format,
          scaleMultiplier,
          sourceUrl: rawUrl,
          fileName: cleanFileName,
          updatedAt: Date.now(),
        });
      } catch (err) {
        console.warn("Could not cache custom model buffer persistently:", err);
      }
    }

    return wrapper;
  }

  // Automatically restore all custom models, assigned presets, and uploaded files from storage or repo manifest
  async restoreCustomModelsFromStorage(): Promise<string[]> {
    const registry = this.getCustomModelRegistry();
    const restoredComponentIds: string[] = [];

    // Also check for repo-persisted custom models from public/data/custom_models_manifest.json
    try {
      const res = await fetch(`/data/custom_models_manifest.json?t=${Date.now()}`);
      if (res.ok) {
        const repoModels = await res.json();
        if (Array.isArray(repoModels)) {
          for (const m of repoModels) {
            if (m && m.componentId) {
              const existing = registry[m.componentId];
              const isUpdated =
                !existing ||
                existing.fileName !== m.fileName ||
                (m.updatedAt && m.updatedAt > (existing.updatedAt || 0));

              if (isUpdated) {
                registry[m.componentId] = {
                  componentId: m.componentId,
                  assetKey: m.assetKey || COMPONENT_ID_TO_ASSET_KEY[m.componentId] || `custom_${m.componentId}`,
                  sourceType: m.sourceType || "file",
                  format: m.format || "glb",
                  scaleMultiplier: m.scaleMultiplier || 1.0,
                  fileName: m.fileName,
                  fileUrl: m.fileUrl || (m.fileName ? `/models/custom/${m.fileName}` : undefined),
                  updatedAt: m.updatedAt || Date.now(),
                };
                this.saveCustomModelRecord(registry[m.componentId]);
                const aKey = registry[m.componentId].assetKey;
                this.templateCache.delete(aKey);
                this.templateCache.delete(m.componentId);
                this.templateCache.delete(`custom_${m.componentId}`);
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn("Could not check repo custom_models_manifest.json:", err);
    }

    const keys = Object.keys(registry);
    if (keys.length === 0) return restoredComponentIds;

    for (const compId of keys) {
      const record = registry[compId];
      try {
        if (record.sourceType === "preset" && record.presetKey) {
          await this.assignPresetModel(compId, record.presetKey, false);
          restoredComponentIds.push(compId);
        } else {
          // Helper to detect corrupt HTML responses
          const isBufferCorrupt = (buf: ArrayBuffer | null | undefined): boolean => {
            if (!buf || buf.byteLength < 50) return true;
            const slice = new Uint8Array(buf.slice(0, 16));
            const str = String.fromCharCode(...slice).toLowerCase();
            return str.includes("<!do") || str.includes("<html") || str.includes("<?xml");
          };

          // 1. Check local buffer in IndexedDB/CacheStorage first
          const bufferKey = `custom_model_buffer_${compId}`;
          let buffer = await getCachedBuffer(bufferKey);
          if (buffer && isBufferCorrupt(buffer)) {
            // Discard corrupt HTML buffer stored in cache
            buffer = null;
            await setCachedBuffer(bufferKey, new ArrayBuffer(0)).catch(() => {});
          }

          // 2. If no local buffer, fetch from fileUrl / repository filesystem
          if (!buffer || buffer.byteLength === 0) {
            const fetchPath =
              record.fileUrl ||
              (record.fileName ? `/models/custom/${record.fileName}` : record.sourceUrl);
            if (fetchPath) {
              try {
                const cacheBusterParam = `t=${record.updatedAt || Date.now()}`;
                const fullUrl = fetchPath.includes("?")
                  ? `${fetchPath}&${cacheBusterParam}`
                  : `${fetchPath}?${cacheBusterParam}`;
                const res = await fetch(fullUrl);
                if (res.ok) {
                  const fetchedBuf = await res.arrayBuffer();
                  if (fetchedBuf && fetchedBuf.byteLength > 50 && !isBufferCorrupt(fetchedBuf)) {
                    buffer = fetchedBuf;
                    await setCachedBuffer(bufferKey, buffer);
                  }
                }
              } catch (fErr) {
                console.warn(`Could not fetch custom model for ${compId} from ${fetchPath}:`, fErr);
              }
            }
          }

          if (buffer && buffer.byteLength > 0) {
            let format = record.format;
            if (!format) {
              const fname = (record.fileName || record.fileUrl || record.sourceUrl || "")
                .split("?")[0]
                .toLowerCase();
              if (fname.endsWith(".stl")) format = "stl";
              else if (fname.endsWith(".glb")) format = "glb";
              else if (fname.endsWith(".gltf")) format = "gltf";
              else format = "obj";
            }
            await this.loadCustomModel(
              compId,
              buffer,
              format,
              record.scaleMultiplier || 1.0,
              record.fileName,
              false
            );
            restoredComponentIds.push(compId);
          }
        }
      } catch (err) {
        console.warn(`Failed to restore custom model for component ${compId}:`, err);
      }
    }
    return restoredComponentIds;
  }
}

export const modelManager = new ModelManager();
