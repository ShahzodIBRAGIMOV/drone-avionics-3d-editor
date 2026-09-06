import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import JSZip from "jszip";
import { COMPONENT_PINS } from "../data/pinDefinitions";
import { PinDefinition } from "../types";

// Project Data Schema for Standalone Viewer & Editor
export interface ViewerProjectData {
  state: {
    instances: Array<{
      instanceId: string;
      componentId: string;
      name: string;
      placed: boolean;
      position: [number, number, number];
      rotation: [number, number, number];
      scale: [number, number, number];
      color?: string;
      customColor?: string;
      locked?: boolean;
      customPins?: PinDefinition[];
    }>;
    cables: Array<{
      id: string;
      name?: string;
      type?: string;
      sourceInstanceId?: string;
      targetInstanceId?: string;
      fromInstanceId?: string;
      toInstanceId?: string;
      sourcePinName?: string;
      targetPinName?: string;
      fromPin?: string;
      toPin?: string;
      cableType?: string;
      signalType?: string;
      color?: string;
      thickness?: number;
      thicknessMm?: number;
      outerDiameterMm?: number;
      lengthMm?: number;
      isRibbon?: boolean;
      strandCount?: number;
      strandColors?: string[];
      strandPitchMm?: number;
      isTubing?: boolean;
      isBreakout?: boolean;
      breakoutMode?: "1-to-N" | "N-to-1" | "N-to-N";
      breakoutTaper?: number;
      multiSourcePinNames?: string[];
      multiTargetPinNames?: string[];
      routePoints?: Array<{ x: number; y: number; z: number } | [number, number, number]>;
      curveTension?: number;
    }>;
    metadata?: {
      droneName?: string;
      droneWidth?: number;
      droneLength?: number;
      droneHeight?: number;
      fuselageWidth?: number;
      droneOpacity?: number;
      droneColor?: string;
      droneWireframe?: boolean;
      savedAt?: string;
    };
  };
  models?: Record<string, string>; // base64 string or data URL for each componentId/assetKey
}

declare global {
  interface Window {
    __DRONE_PROJECT_DATA__?: ViewerProjectData;
    DroneViewerApp?: StandaloneDroneViewer;
  }
}

// Compute exact 3D world position of a component pin
export function computePinWorldPosition(
  inst: { position: [number, number, number]; rotation: [number, number, number]; scale: [number, number, number] },
  localOffset: [number, number, number],
  mesh?: THREE.Group
): THREE.Vector3 {
  if (mesh) {
    mesh.updateMatrixWorld(true);
    return new THREE.Vector3(localOffset[0], localOffset[1], localOffset[2]).applyMatrix4(mesh.matrixWorld);
  }
  const pos = new THREE.Vector3(inst.position[0], inst.position[1], inst.position[2]);
  const rot = new THREE.Euler(
    THREE.MathUtils.degToRad(inst.rotation[0]),
    THREE.MathUtils.degToRad(inst.rotation[1]),
    THREE.MathUtils.degToRad(inst.rotation[2]),
    "XYZ"
  );
  const q = new THREE.Quaternion().setFromEuler(rot);
  const scale = new THREE.Vector3(inst.scale[0], inst.scale[1], inst.scale[2]);
  const mat = new THREE.Matrix4().compose(pos, q, scale);
  return new THREE.Vector3(localOffset[0], localOffset[1], localOffset[2]).applyMatrix4(mat);
}

// Catalog of standard drone components for in-editor addition
export const STANDARD_CATALOG = [
  { id: "02", name: "Cube Orange ADS-B", desc: "Asosiy avtopilot va parvoz boshqaruvchisi", dims: [94, 22.5, 44] },
  { id: "03", name: "Here3+ RTK GPS / Kompas", desc: "Santimetrli aniqlikdagi DronCAN GNSS", dims: [76, 22, 76] },
  { id: "04", name: "SIYI HM30 Datalink", desc: "30km telemetriya va Full HD video modul", dims: [72, 23, 43.5] },
  { id: "05", name: "SIYI ZR10 Gimbal Kamera", desc: "3-o‘qli 4K optik zumli optik kamera", dims: [120, 110, 150] },
  { id: "06", name: "Matek BEC 12V/5V", desc: "Avionika va servolar quvvat stabilizatori", dims: [48, 32, 18] },
  { id: "07", name: "Holybro PM02D Power Module", desc: "Kuchlanish va tok o‘lchagich quvvat moduli", dims: [65, 25, 14] },
  { id: "08", name: "Tattu 22000mAh 6S LiPo", desc: "Yuqori quvvatli parvoz akkumulyatori", dims: [205, 78, 65] },
  { id: "10", name: "T-Motor U8 II Brushless", desc: "Og‘ir yuk ko‘taruvchi cho‘tkasiz dvigatel", dims: [87, 87, 45] },
  { id: "11", name: "T-Motor Alpha 60A ESC", desc: "FOC tezlik regulyatori (regulyator)", dims: [75, 34, 18] },
  { id: "12", name: "Savox SV-1270TG Servo", desc: "Eleron va rul boshqaruv servo motori", dims: [40, 20, 38] },
  { id: "14", name: "MS5525 Havoda Tezlik Sensori", desc: "Pitot trubkasi va havo tezligi o‘lchagichi", dims: [38, 22, 14] },
  { id: "16", name: "Avariyaviy E-Stop Tugmasi", desc: "Qizil xavfsizlik elektr uzgichi", dims: [36, 36, 42] },
  { id: "19", name: "NVIDIA Jetson Orin NX", desc: "Sun'iy intellekt va kompyuter ko‘rish bort kompyuteri", dims: [110, 110, 70] },
  { id: "20", name: "SIYI BEC 4-18S HM30", desc: "HM30 uchun maxsus barqaror quvvat regulyatori", dims: [38, 26, 12] },
  { id: "22", name: "RadioMaster DBR4 Qabul qiluvchi", desc: "Dual-band telemetriya qabul qilgich", dims: [32, 21, 9] },
  { id: "23", name: "LS1005G Ethernet Switch", desc: "5-portli bort gigabit tarmog‘i", dims: [70, 50, 20] },
];

class StandaloneDroneViewer {
  container: HTMLElement;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  transformControls: TransformControls;

  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  droneGroup = new THREE.Group();
  componentsGroup = new THREE.Group();
  cablesGroup = new THREE.Group();
  pinsGroup = new THREE.Group();
  helpersGroup = new THREE.Group();

  gltfLoader = new GLTFLoader();
  stlLoader = new STLLoader();
  objLoader = new OBJLoader();

  data: ViewerProjectData | null = null;
  componentMeshes = new Map<string, THREE.Group>();
  cablesMap = new Map<string, { curve: THREE.CatmullRomCurve3; meshes: THREE.Mesh[]; pulseObj?: THREE.Mesh }>();

  // State & Mode
  mode: "viewer" | "editor" = "viewer";
  gizmoMode: "translate" | "rotate" = "translate";
  selectedInstanceId: string | null = null;
  selectedCableId: string | null = null;

  droneOpacity = 0.45;
  droneWireframe = false;
  wireframeMode = false;
  droneColor = "original";
  showCables = true;
  showPins = true;
  showGrid = true;
  flowAnimating = true;

  pulseTime = 0;
  clock = new THREE.Clock();
  gridHelper: THREE.GridHelper | null = null;

  constructor(containerId = "canvas-container") {
    const el = document.getElementById(containerId);
    if (!el) {
      throw new Error(`Container #${containerId} topilmadi`);
    }
    this.container = el;

    // 1. Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0f18);
    this.scene.fog = new THREE.FogExp2(0x0a0f18, 0.00035);

    // 2. Camera setup
    const aspect = this.container.clientWidth / (this.container.clientHeight || 1);
    this.camera = new THREE.PerspectiveCamera(45, aspect, 1, 15000);
    this.camera.position.set(750, 600, 950);

    // 3. Renderer setup
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    // 4. Orbit Controls setup
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxDistance = 8000;
    this.controls.minDistance = 20;
    this.controls.target.set(0, 0, 0);

    // 5. Transform Controls (Gizmo) setup
    this.transformControls = new TransformControls(this.camera, this.renderer.domElement);
    this.transformControls.size = 0.85;
    this.transformControls.setMode("translate");
    this.scene.add(this.transformControls.getHelper());

    this.transformControls.addEventListener("dragging-changed", (event) => {
      this.controls.enabled = !event.value;
    });

    this.transformControls.addEventListener("change", () => {
      if (this.selectedInstanceId && this.transformControls.object) {
        const obj = this.transformControls.object;
        const inst = this.data?.state.instances.find(i => i.instanceId === this.selectedInstanceId);
        if (inst) {
          inst.position = [obj.position.x, obj.position.y, obj.position.z];
          inst.rotation = [
            THREE.MathUtils.radToDeg(obj.rotation.x),
            THREE.MathUtils.radToDeg(obj.rotation.y),
            THREE.MathUtils.radToDeg(obj.rotation.z),
          ];

          this.updateInspectorUI();
          this.buildCables();
          this.syncPinMarkers();
        }
      }
    });

    // 6. Lighting
    this.setupLighting();

    // 7. Grid and helpers
    this.setupGrid();

    // 8. Groups
    this.scene.add(this.droneGroup);
    this.scene.add(this.componentsGroup);
    this.scene.add(this.cablesGroup);
    this.scene.add(this.pinsGroup);
    this.scene.add(this.helpersGroup);

    // 9. Event listeners
    window.addEventListener("resize", this.onWindowResize.bind(this));
    this.renderer.domElement.addEventListener("pointerdown", this.onPointerDown.bind(this));
    this.renderer.domElement.addEventListener("pointermove", this.onPointerMove.bind(this));

    window.addEventListener("keydown", (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      if (e.key === "w" || e.key === "W") this.setGizmoMode("translate");
      if (e.key === "e" || e.key === "E") this.setGizmoMode("rotate");
      if (e.key === "Escape") this.clearSelection();
    });

    // 10. Load Data
    this.loadProjectData();

    // 11. Start Animation Loop
    this.animate();
  }

  setupLighting() {
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x1e293b, 1.2);
    hemiLight.position.set(0, 500, 0);
    this.scene.add(hemiLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.4);
    dirLight1.position.set(600, 1000, 700);
    dirLight1.castShadow = true;
    dirLight1.shadow.mapSize.width = 2048;
    dirLight1.shadow.mapSize.height = 2048;
    dirLight1.shadow.bias = -0.0001;
    this.scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x38bdf8, 0.6);
    dirLight2.position.set(-600, -300, -700);
    this.scene.add(dirLight2);

    const ambLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambLight);
  }

  setupGrid() {
    this.gridHelper = new THREE.GridHelper(3000, 60, 0x0284c7, 0x1e293b);
    this.gridHelper.position.y = -100;
    this.helpersGroup.add(this.gridHelper);

    const axes = new THREE.AxesHelper(150);
    axes.position.set(-1400, -95, 1400);
    this.helpersGroup.add(axes);
  }

  loadProjectData() {
    let localSaved: ViewerProjectData | null = null;
    try {
      const raw = localStorage.getItem("__DRONE_OFFLINE_SAVED_STATE__");
      if (raw) localSaved = JSON.parse(raw);
    } catch {
      // ignore
    }

    if (localSaved && localSaved.state) {
      this.data = localSaved;
      if (window.__DRONE_PROJECT_DATA__?.models) {
        this.data.models = { ...window.__DRONE_PROJECT_DATA__.models, ...this.data.models };
      }
      this.updateStatus("Saqlangan loyiha holati tiklandi!");
    } else if (window.__DRONE_PROJECT_DATA__) {
      this.data = window.__DRONE_PROJECT_DATA__;
    }

    if (!this.data) {
      this.updateStatus("Xatolik: project_data.js topilmadi!");
      return;
    }

    this.initSceneFromData();
  }

  async initSceneFromData() {
    if (!this.data) return;

    this.updateStatus("Dron korpusi yuklanmoqda...");
    await this.buildDroneAirframe();

    this.updateStatus("Avionika 3D modellari joylanmoqda...");
    await this.buildComponents();

    this.updateStatus("Pinlar va elektr portlar o‘rnatilmoqda...");
    this.syncPinMarkers();

    this.updateStatus("Kabellar va ulanishlar chizilmoqda...");
    this.buildCables();

    this.updateHUD();
    this.populateSidebarLists();
    this.populateCableAdderDropdowns();

    this.updateStatus("Loyiha to‘liq tayyor!");
    setTimeout(() => this.hideStatus(), 1000);
  }

  // --- MODE & GIZMO SWITCHER ---
  setMode(newMode: "viewer" | "editor") {
    this.mode = newMode;
    const btnViewer = document.getElementById("btn-mode-viewer");
    const btnEditor = document.getElementById("btn-mode-editor");
    const editorActions = document.getElementById("editor-actions-group");
    const gizmoGroup = document.getElementById("gizmo-controls-group");
    const appBadge = document.getElementById("app-badge");

    if (newMode === "editor") {
      btnViewer?.classList.remove("active");
      btnEditor?.classList.add("active");
      if (editorActions) editorActions.style.display = "flex";
      if (gizmoGroup) gizmoGroup.style.display = "flex";
      if (appBadge) appBadge.textContent = "✏️ Tahrirlash Rejimi";

      if (this.selectedInstanceId) {
        const obj = this.componentMeshes.get(this.selectedInstanceId);
        if (obj) this.transformControls.attach(obj);
      }
      this.updateStatus("Tahrirlash rejimi yoqildi (3D Gizmo, pin-to-pin ulash faol)", 1500);
    } else {
      btnEditor?.classList.remove("active");
      btnViewer?.classList.add("active");
      if (editorActions) editorActions.style.display = "none";
      if (gizmoGroup) gizmoGroup.style.display = "none";
      if (appBadge) appBadge.textContent = "👁️ Ko‘rish Rejimi";
      this.transformControls.detach();
      this.updateStatus("Ko‘rish rejimi yoqildi", 1200);
    }

    this.updateInspectorUI();
  }

  setGizmoMode(mode: "translate" | "rotate") {
    this.gizmoMode = mode;
    this.transformControls.setMode(mode);
    document.getElementById("btn-gizmo-translate")?.classList.toggle("active", mode === "translate");
    document.getElementById("btn-gizmo-rotate")?.classList.toggle("active", mode === "rotate");
  }

  // --- 3D AIRFRAME BUILDER ---
  async buildDroneAirframe() {
    while (this.droneGroup.children.length > 0) {
      this.droneGroup.remove(this.droneGroup.children[0]);
    }

    const airframeInst = this.data?.state.instances.find(i => (i.componentId === "01" || i.name.toLowerCase().includes("fuselage") || i.name.toLowerCase().includes("dron")) && i.placed);

    const droneBuffer = this.getModelBuffer("01") || this.getModelBuffer("drone");
    if (droneBuffer) {
      try {
        const rawObj = await this.parseModelBuffer(droneBuffer, "glb");
        if (rawObj) {
          const preBox = new THREE.Box3().setFromObject(rawObj);
          const initialSize = new THREE.Vector3();
          preBox.getSize(initialSize);
          if (initialSize.z > initialSize.x && initialSize.z > initialSize.y) {
            rawObj.rotation.y = Math.PI / 2;
            rawObj.updateMatrixWorld(true);
          }

          const box = new THREE.Box3().setFromObject(rawObj);
          const size = new THREE.Vector3();
          box.getSize(size);
          const center = new THREE.Vector3();
          box.getCenter(center);

          const targetWingspan = 3800;
          const spanRaw = size.x > 0 ? size.x : Math.max(size.z, size.y);
          const airframeScale = spanRaw > 0 ? targetWingspan / spanRaw : 1.0;
          rawObj.scale.set(airframeScale, airframeScale, airframeScale);
          rawObj.position.set(-center.x * airframeScale, -center.y * airframeScale, -center.z * airframeScale);
          rawObj.updateMatrixWorld(true);

          const wrapper = new THREE.Group();
          wrapper.add(rawObj);

          if (airframeInst) {
            wrapper.position.set(airframeInst.position[0], airframeInst.position[1], airframeInst.position[2]);
            wrapper.rotation.set(
              THREE.MathUtils.degToRad(airframeInst.rotation[0]),
              THREE.MathUtils.degToRad(airframeInst.rotation[1]),
              THREE.MathUtils.degToRad(airframeInst.rotation[2])
            );
            wrapper.scale.set(airframeInst.scale[0], airframeInst.scale[1], airframeInst.scale[2]);
            wrapper.userData = { instanceId: airframeInst.instanceId, isAirframe: true, instData: airframeInst };
            this.componentMeshes.set(airframeInst.instanceId, wrapper);
          }

          this.applyAirframeMaterial(wrapper);
          this.droneGroup.add(wrapper);
          return;
        }
      } catch (err) {
        console.warn("Drone 3D model parsing failed:", err);
      }
    }

    // Procedural Fallback
    this.createProceduralDroneAirframe(airframeInst);
  }

  createProceduralDroneAirframe(airframeInst?: any) {
    const meta = this.data?.state.metadata;
    const w = meta?.droneWidth || 2400;
    const l = meta?.droneLength || 1400;
    const h = meta?.droneHeight || 240;
    const fw = meta?.fuselageWidth || 200;

    const group = new THREE.Group();

    const fuseGeom = new THREE.BoxGeometry(fw, h * 0.7, l * 0.85);
    const fuseMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.35,
      metalness: 0.3,
      transparent: true,
      opacity: this.droneOpacity,
      wireframe: this.droneWireframe,
      side: THREE.DoubleSide
    });
    const fuselage = new THREE.Mesh(fuseGeom, fuseMat);
    group.add(fuselage);

    const wingGeom = new THREE.BoxGeometry(w, h * 0.12, l * 0.28);
    const wingMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.4,
      metalness: 0.2,
      transparent: true,
      opacity: this.droneOpacity,
      wireframe: this.droneWireframe,
      side: THREE.DoubleSide
    });
    const wings = new THREE.Mesh(wingGeom, wingMat);
    wings.position.y = h * 0.12;
    group.add(wings);

    const boomGeom = new THREE.CylinderGeometry(16, 16, l * 0.5, 12);
    boomGeom.rotateX(Math.PI / 2);
    const boomMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.2,
      metalness: 0.8,
      transparent: true,
      opacity: this.droneOpacity,
      wireframe: this.droneWireframe,
    });
    const boom1 = new THREE.Mesh(boomGeom, boomMat);
    boom1.position.set(-w * 0.25, h * 0.1, -l * 0.3);
    const boom2 = boom1.clone();
    boom2.position.x = w * 0.25;
    group.add(boom1);
    group.add(boom2);

    if (airframeInst) {
      group.position.set(airframeInst.position[0], airframeInst.position[1], airframeInst.position[2]);
      group.rotation.set(
        THREE.MathUtils.degToRad(airframeInst.rotation[0]),
        THREE.MathUtils.degToRad(airframeInst.rotation[1]),
        THREE.MathUtils.degToRad(airframeInst.rotation[2])
      );
      group.userData = { instanceId: airframeInst.instanceId, isAirframe: true, instData: airframeInst };
      this.componentMeshes.set(airframeInst.instanceId, group);
    }

    this.droneGroup.add(group);
  }

  applyAirframeMaterial(obj: THREE.Object3D) {
    obj.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((m) => {
          if (m) {
            const std = m as THREE.MeshStandardMaterial;
            std.transparent = true;
            std.opacity = this.droneOpacity;
            std.wireframe = this.droneWireframe;
            std.side = THREE.DoubleSide;
            std.depthWrite = false;
            std.depthTest = true;
            if (this.droneColor !== "original") {
              std.color.set(this.droneColor);
            }
          }
        });
      }
    });
  }

  // --- 3D COMPONENTS BUILDER ---
  async buildComponents() {
    while (this.componentsGroup.children.length > 0) {
      this.componentsGroup.remove(this.componentsGroup.children[0]);
    }
    this.componentMeshes.clear();

    const placedInstances = this.data?.state.instances.filter(i => i.placed && i.componentId !== "01") || [];
    const total = placedInstances.length;

    for (let index = 0; index < total; index++) {
      const inst = placedInstances[index];
      this.updateStatus(`Modellar joylanmoqda: ${inst.name} (${index + 1}/${total})`);

      let rawObj: THREE.Object3D | null = null;
      const buffer = this.getModelBuffer(inst.componentId) || this.getModelBuffer(inst.name);

      if (buffer) {
        try {
          rawObj = await this.parseModelBuffer(buffer, "auto");
        } catch (e) {
          console.warn(`Model yuklanmadi (${inst.name}):`, e);
        }
      }

      if (!rawObj) {
        rawObj = this.createProceduralAvionicsBox(inst);
      }

      // Scale check: If CAD model is in meters (< 1.0), scale to mm
      const preBox = new THREE.Box3().setFromObject(rawObj);
      const preSize = new THREE.Vector3();
      preBox.getSize(preSize);
      const maxDim = Math.max(preSize.x, preSize.y, preSize.z);
      if (maxDim > 0 && maxDim < 1.0) {
        rawObj.scale.multiplyScalar(1000);
        rawObj.updateMatrixWorld(true);
      }

      // CAD Z-UP Orientation Fix
      const CAD_Z_UP = new Set([
        "02", "03", "04", "11", "14", "16", "19", "20",
        "cube-orange", "here3", "hm30", "esc", "airspeed-module", "estop", "jetson-p3737", "siyi-bec"
      ]);
      if (CAD_Z_UP.has(inst.componentId)) {
        rawObj.rotation.x = -Math.PI / 2;
        rawObj.updateMatrixWorld(true);
      }

      // Center geometry around local origin (0, 0, 0)
      const box = new THREE.Box3().setFromObject(rawObj);
      const center = new THREE.Vector3();
      box.getCenter(center);
      rawObj.position.sub(center);

      // Apply custom color if present
      if (inst.customColor) {
        this.applyColorToInstanceObject(rawObj, inst.customColor);
      }

      // Create wrapper group and apply instance transforms in DEGREES
      const wrapper = new THREE.Group();
      wrapper.add(rawObj);

      wrapper.position.set(inst.position[0], inst.position[1], inst.position[2]);
      wrapper.rotation.set(
        THREE.MathUtils.degToRad(inst.rotation[0]),
        THREE.MathUtils.degToRad(inst.rotation[1]),
        THREE.MathUtils.degToRad(inst.rotation[2])
      );
      wrapper.scale.set(inst.scale[0], inst.scale[1], inst.scale[2]);

      wrapper.userData = {
        instanceId: inst.instanceId,
        componentId: inst.componentId,
        name: inst.name,
        instData: inst
      };

      this.componentsGroup.add(wrapper);
      this.componentMeshes.set(inst.instanceId, wrapper);
    }
  }

  createProceduralAvionicsBox(inst: any): THREE.Group {
    const group = new THREE.Group();
    const dimsMap: Record<string, [number, number, number]> = {
      "02": [94, 22.5, 44], // Cube Orange
      "03": [76, 22, 76], // Here3 GPS
      "04": [72, 23, 43.5], // HM30
      "05": [120, 110, 150], // ZR10 Gimbal
      "06": [48, 32, 18], // Matek BEC
      "07": [65, 25, 14], // PM02D
      "08": [205, 78, 65], // Tattu Battery
      "10": [87, 87, 45], // Motor
      "11": [75, 34, 18], // ESC
      "12": [40, 20, 38], // Servo
      "14": [38, 22, 14], // Airspeed
      "16": [36, 36, 42], // E-Stop
      "19": [110, 110, 70], // Jetson Orin
      "22": [32, 21, 9], // RadioMaster
      "23": [70, 50, 20], // Ethernet Switch
      "24": [55, 45, 18], // GigaBlox
    };

    const [dimX, dimY, dimZ] = dimsMap[inst.componentId] || [50, 30, 20];
    const geom = new THREE.BoxGeometry(dimX, dimY, dimZ);
    const mat = new THREE.MeshStandardMaterial({
      color: inst.customColor || inst.color || 0x1e293b,
      roughness: 0.35,
      metalness: 0.45
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    const stripeGeom = new THREE.BoxGeometry(dimX * 0.95, Math.max(1, dimY * 0.08), dimZ * 0.95);
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.2, metalness: 0.8 });
    const stripe = new THREE.Mesh(stripeGeom, stripeMat);
    stripe.position.y = dimY / 2 + 1;
    group.add(stripe);

    return group;
  }

  // --- PIN MARKERS BUILDER (Exact 3D Coordinates) ---
  syncPinMarkers() {
    while (this.pinsGroup.children.length > 0) {
      this.pinsGroup.remove(this.pinsGroup.children[0]);
    }

    const typeColors: Record<string, number> = {
      power: 0xef4444, // Red
      gnd: 0x334155, // Dark slate
      can: 0x0284c7, // Sky blue
      uart: 0xeab308, // Amber
      gps: 0xfacc15, // Yellow
      pwm: 0xf97316, // Orange
      ethernet: 0x10b981, // Emerald
      pneumatic: 0x94a3b8, // Silver
      mount: 0x64748b, // Slate
    };

    let totalPins = 0;
    const placedInstances = this.data?.state.instances.filter(i => i.placed && i.componentId !== "01") || [];

    placedInstances.forEach((inst) => {
      const wrapper = this.componentMeshes.get(inst.instanceId);
      if (!wrapper) return;

      const pins: PinDefinition[] = (inst.customPins && inst.customPins.length > 0)
        ? inst.customPins
        : (COMPONENT_PINS[inst.componentId] || []);

      pins.forEach((pin) => {
        totalPins++;
        const worldPos = computePinWorldPosition(inst, pin.localOffset, wrapper);

        const pinGeom = new THREE.SphereGeometry(1.8, 10, 10);
        const color = typeColors[pin.type] || 0x38bdf8;
        const pinMat = new THREE.MeshStandardMaterial({
          color: color,
          roughness: 0.25,
          metalness: 0.5,
          emissive: color,
          emissiveIntensity: 0.35,
        });

        const pinMesh = new THREE.Mesh(pinGeom, pinMat);
        pinMesh.position.copy(worldPos);
        pinMesh.userData = {
          isPin: true,
          instanceId: inst.instanceId,
          componentName: inst.name,
          pinId: pin.pinId,
          connectorId: pin.connectorId,
          fullName: pin.fullName,
          label: pin.label,
          type: pin.type,
          voltage: pin.voltage,
        };

        this.pinsGroup.add(pinMesh);
      });
    });

    const hudPins = document.getElementById("hud-pins-count");
    if (hudPins) hudPins.textContent = totalPins.toString();
    this.pinsGroup.visible = this.showPins;
  }

  // --- CABLES BUILDER (Pin-to-Pin Accurate Routing) ---
  buildCables() {
    while (this.cablesGroup.children.length > 0) {
      this.cablesGroup.remove(this.cablesGroup.children[0]);
    }
    this.cablesMap.clear();

    const cables = this.data?.state.cables || [];
    cables.forEach((cable: any) => {
      const fromId = cable.sourceInstanceId || cable.fromInstanceId;
      const toId = cable.targetInstanceId || cable.toInstanceId;
      const fromInst = this.data?.state.instances.find(i => i.instanceId === fromId && i.placed);
      const toInst = this.data?.state.instances.find(i => i.instanceId === toId && i.placed);
      if (!fromInst || !toInst) return;

      const fromWrapper = this.componentMeshes.get(fromId);
      const toWrapper = this.componentMeshes.get(toId);
      if (!fromWrapper || !toWrapper) return;

      const sourcePins: PinDefinition[] = [
        ...(COMPONENT_PINS[fromInst.componentId] || []),
        ...(fromInst.customPins || []),
      ];
      const targetPins: PinDefinition[] = [
        ...(COMPONENT_PINS[toInst.componentId] || []),
        ...(toInst.customPins || []),
      ];

      const sPin = sourcePins.find((p) => p.fullName === cable.sourcePinName) || sourcePins[0];
      const tPin = targetPins.find((p) => p.fullName === cable.targetPinName) || targetPins[0];

      const sOffset: [number, number, number] = sPin ? sPin.localOffset : [0, 0, 0];
      const tOffset: [number, number, number] = tPin ? tPin.localOffset : [0, 0, 0];

      // Exact 3D pin world endpoints
      const p1 = computePinWorldPosition(fromInst, sOffset, fromWrapper);
      const p2 = computePinWorldPosition(toInst, tOffset, toWrapper);

      let curve: THREE.CatmullRomCurve3;
      if (cable.routePoints && Array.isArray(cable.routePoints) && cable.routePoints.length > 0) {
        const pts = [
          p1,
          ...cable.routePoints.map((pt: any) => {
            if (Array.isArray(pt)) return new THREE.Vector3(pt[0], pt[1], pt[2]);
            return new THREE.Vector3(pt.x, pt.y, pt.z);
          }),
          p2
        ];
        curve = new THREE.CatmullRomCurve3(pts, false, "centripetal", cable.curveTension || 0.5);
      } else {
        const mid = p1.clone().add(p2).multiplyScalar(0.5);
        const dist = p1.distanceTo(p2);
        mid.y -= Math.min(60, Math.max(15, dist * 0.12));
        curve = new THREE.CatmullRomCurve3([p1, mid, p2]);
      }

      const createdMeshes: THREE.Mesh[] = [];

      // 1. RIBBON & BREAKOUT CABLE: Multiple strands connecting to individual pins or flat ribbon
      const isRibbonOrBreakout = Boolean((cable.isRibbon || cable.isBreakout) && (cable.strandCount || 0) > 1);
      const strandCount = isRibbonOrBreakout
        ? (cable.strandCount || cable.multiTargetPinNames?.length || 3)
        : 1;
      const defaultStrands = ["#ef4444", "#000000", "#facc15", "#ffffff", "#3b82f6", "#10b981", "#8b5cf6", "#ec4899"];
      const strandColors = (cable.strandColors && cable.strandColors.length >= strandCount)
        ? cable.strandColors
        : isRibbonOrBreakout
        ? defaultStrands.slice(0, strandCount)
        : [cable.color || "#0284c7"];

      if (isRibbonOrBreakout && strandCount > 1) {
        const pitch = cable.strandPitchMm || 2.2;
        const strandRadius = Math.max(0.65, (cable.thickness || 2.4) * 0.32);
        const numPoints = 48;
        const points = curve.getPoints(numPoints);
        const totalLength = curve.getLength();

        const isTargetBreakout = Boolean(
          (cable.isBreakout && (cable.breakoutMode === "1-to-N" || cable.breakoutMode === "N-to-N" || !cable.breakoutMode)) ||
          (cable.multiTargetPinNames && cable.multiTargetPinNames.length > 1)
        );

        const isSourceBreakout = Boolean(
          (cable.isBreakout && (cable.breakoutMode === "N-to-1" || cable.breakoutMode === "N-to-N")) ||
          (cable.multiSourcePinNames && cable.multiSourcePinNames.length > 1)
        );

        const targetPinPoints: THREE.Vector3[] = [];
        if (isTargetBreakout) {
          const configuredNames = cable.multiTargetPinNames || [];
          const usedPinNames = new Set<string>();
          for (let sIdx = 0; sIdx < strandCount; sIdx++) {
            let chosenPinDef: PinDefinition | undefined;
            const pName = configuredNames[sIdx];
            if (pName) chosenPinDef = targetPins.find((p) => p.fullName === pName || p.label === pName);
            if (!chosenPinDef || usedPinNames.has(chosenPinDef.fullName)) {
              const alt = targetPins.find((p) => !usedPinNames.has(p.fullName));
              if (alt) chosenPinDef = alt;
            }
            if (!chosenPinDef && targetPins.length > 0) chosenPinDef = targetPins[sIdx % targetPins.length];
            if (chosenPinDef) {
              usedPinNames.add(chosenPinDef.fullName);
              targetPinPoints.push(computePinWorldPosition(toInst, chosenPinDef.localOffset, toWrapper));
            } else {
              const fanOffset: [number, number, number] = [
                (sIdx - (strandCount - 1) / 2) * 5.0,
                0,
                0
              ];
              targetPinPoints.push(computePinWorldPosition(toInst, fanOffset, toWrapper));
            }
          }
        }

        const sourcePinPoints: THREE.Vector3[] = [];
        if (isSourceBreakout) {
          const configuredNames = cable.multiSourcePinNames || [];
          const usedPinNames = new Set<string>();
          for (let sIdx = 0; sIdx < strandCount; sIdx++) {
            let chosenPinDef: PinDefinition | undefined;
            const pName = configuredNames[sIdx];
            if (pName) chosenPinDef = sourcePins.find((p) => p.fullName === pName || p.label === pName);
            if (!chosenPinDef || usedPinNames.has(chosenPinDef.fullName)) {
              const alt = sourcePins.find((p) => !usedPinNames.has(p.fullName));
              if (alt) chosenPinDef = alt;
            }
            if (!chosenPinDef && sourcePins.length > 0) chosenPinDef = sourcePins[sIdx % sourcePins.length];
            if (chosenPinDef) {
              usedPinNames.add(chosenPinDef.fullName);
              sourcePinPoints.push(computePinWorldPosition(fromInst, chosenPinDef.localOffset, fromWrapper));
            } else {
              const fanOffset: [number, number, number] = [
                (sIdx - (strandCount - 1) / 2) * 5.0,
                0,
                0
              ];
              sourcePinPoints.push(computePinWorldPosition(fromInst, fanOffset, fromWrapper));
            }
          }
        }

        const breakoutTaper = Math.min(0.2, 40 / Math.max(1, totalLength));
        const uSourceBreakout = breakoutTaper;
        const uTargetBreakout = 1 - breakoutTaper;

        for (let s = 0; s < strandCount; s++) {
          const rawOffset = (s - (strandCount - 1) / 2) * pitch;
          const strandColor = strandColors[s % strandColors.length];
          const strandPoints: THREE.Vector3[] = [];
          const specificSourcePt = isSourceBreakout && sourcePinPoints[s] ? sourcePinPoints[s] : null;
          const specificTargetPt = isTargetBreakout && targetPinPoints[s] ? targetPinPoints[s] : null;

          for (let p = 0; p < points.length; p++) {
            const u = p / (points.length - 1);
            const pt = points[p];
            const tangent = curve.getTangent(u);
            let normal = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();
            if (normal.lengthSq() < 0.001) normal.set(1, 0, 0);

            if (specificSourcePt && u < uSourceBreakout) {
              const branchBlend = (uSourceBreakout - u) / uSourceBreakout;
              const easedBlend = branchBlend * branchBlend * (3 - 2 * branchBlend);
              strandPoints.push(new THREE.Vector3().lerpVectors(pt, specificSourcePt, easedBlend));
            } else if (specificTargetPt && u > uTargetBreakout) {
              const branchBlend = (u - uTargetBreakout) / breakoutTaper;
              const easedBlend = branchBlend * branchBlend * (3 - 2 * branchBlend);
              strandPoints.push(new THREE.Vector3().lerpVectors(pt, specificTargetPt, easedBlend));
            } else {
              const endTaper = Math.min(1, Math.min(u, 1 - u) * 8);
              const effectiveOffset = rawOffset * (0.4 + 0.6 * endTaper);
              strandPoints.push(pt.clone().addScaledVector(normal, effectiveOffset));
            }
          }

          const strandCurve = new THREE.CatmullRomCurve3(strandPoints);
          const strandGeom = new THREE.TubeGeometry(strandCurve, 36, strandRadius, 6, false);
          const strandMat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(strandColor),
            roughness: 0.35,
            metalness: 0.45,
            emissive: new THREE.Color(strandColor),
            emissiveIntensity: 0.2
          });
          const strandMesh = new THREE.Mesh(strandGeom, strandMat);
          strandMesh.userData = { cableId: cable.id, isCable: true };
          this.cablesGroup.add(strandMesh);
          createdMeshes.push(strandMesh);
        }
      } else {
        // 2. STANDARD CABLE OR AIRSPEED SILICONE TUBING
        const isTubing = Boolean(cable.isTubing || cable.cableType === "Airspeed");
        const radius = cable.thickness || (cable.outerDiameterMm ? cable.outerDiameterMm / 2 : 2.0);
        const geom = new THREE.TubeGeometry(curve, 36, radius, 8, false);
        const colorHex = cable.color || "#0ea5e9";
        const mat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(colorHex),
          roughness: isTubing ? 0.1 : 0.35,
          metalness: isTubing ? 0.05 : 0.45,
          transparent: isTubing,
          opacity: isTubing ? 0.45 : 1.0,
          emissive: new THREE.Color(colorHex),
          emissiveIntensity: isTubing ? 0.05 : 0.25
        });
        const tubeMesh = new THREE.Mesh(geom, mat);
        tubeMesh.userData = { cableId: cable.id, isCable: true };
        this.cablesGroup.add(tubeMesh);
        createdMeshes.push(tubeMesh);
      }

      // Flowing Pulse Spheres
      const pulseGeom = new THREE.SphereGeometry(2.2, 10, 10);
      const pulseMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const pulseObj = new THREE.Mesh(pulseGeom, pulseMat);
      pulseObj.position.copy(p1);
      this.cablesGroup.add(pulseObj);

      // Pin socket indicators at cable ends
      const socketGeom = new THREE.CylinderGeometry(2.4, 2.4, 3, 10);
      socketGeom.rotateX(Math.PI / 2);
      const socketMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.2, metalness: 0.8 });
      const sock1 = new THREE.Mesh(socketGeom, socketMat);
      sock1.position.copy(p1);
      const sock2 = new THREE.Mesh(socketGeom, socketMat);
      sock2.position.copy(p2);
      this.cablesGroup.add(sock1);
      this.cablesGroup.add(sock2);

      this.cablesMap.set(cable.id, { curve, meshes: createdMeshes, pulseObj });
    });
  }

  // --- MODEL BUFFER PARSER & CACHE ---
  getModelBuffer(key: string): ArrayBuffer | null {
    if (!this.data?.models) return null;
    const base64Str = this.data.models[key];
    if (!base64Str) return null;

    try {
      const cleanB64 = base64Str.includes(",") ? base64Str.split(",")[1] : base64Str;
      const binaryStr = atob(cleanB64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      return bytes.buffer;
    } catch (e) {
      console.warn("Base64 decode failed for model:", key, e);
      return null;
    }
  }

  async parseModelBuffer(buffer: ArrayBuffer, formatHint = "auto"): Promise<THREE.Object3D> {
    const magic = new Uint8Array(buffer.slice(0, 4));
    const magicStr = String.fromCharCode(...magic);

    if (magicStr === "glTF" || formatHint === "glb") {
      return new Promise((resolve, reject) => {
        this.gltfLoader.parse(
          buffer,
          "",
          (gltf) => resolve(gltf.scene),
          (err) => {
            try {
              const geom = this.stlLoader.parse(buffer);
              geom.computeVertexNormals();
              const mat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.4, metalness: 0.6 });
              resolve(new THREE.Mesh(geom, mat));
            } catch {
              reject(err);
            }
          }
        );
      });
    }

    if (formatHint === "stl" || buffer.byteLength > 84) {
      try {
        const geom = this.stlLoader.parse(buffer);
        geom.computeVertexNormals();
        const mat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.4, metalness: 0.6 });
        return new THREE.Mesh(geom, mat);
      } catch {
        // Fallback
      }
    }

    return new Promise((resolve, reject) => {
      this.gltfLoader.parse(
        buffer,
        "",
        (gltf) => resolve(gltf.scene),
        () => {
          try {
            const geom = this.stlLoader.parse(buffer);
            geom.computeVertexNormals();
            const mat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.4, metalness: 0.6 });
            resolve(new THREE.Mesh(geom, mat));
          } catch (stlErr) {
            reject(stlErr);
          }
        }
      );
    });
  }

  // --- INTERACTION, SELECTION & PIN TOOLTIP ---
  onPointerMove(event: PointerEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Pin hover detection
    if (this.showPins && this.pinsGroup.children.length > 0) {
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObjects(this.pinsGroup.children, false);
      const tooltip = document.getElementById("pin-hover-tooltip");
      const title = document.getElementById("tooltip-title");
      const sub = document.getElementById("tooltip-sub");

      if (intersects.length > 0 && tooltip && title && sub) {
        const pinData = intersects[0].object.userData;
        title.textContent = `📍 ${pinData.label || pinData.fullName}`;
        sub.textContent = `${pinData.componentName || ''} | Turi: ${pinData.type || ''} ${pinData.voltage ? '(' + pinData.voltage + ')' : ''}`;
        tooltip.style.left = `${event.clientX}px`;
        tooltip.style.top = `${event.clientY - 15}px`;
        tooltip.style.display = "block";
        return;
      }
    }

    const tooltip = document.getElementById("pin-hover-tooltip");
    if (tooltip) tooltip.style.display = "none";
  }

  onPointerDown(event: PointerEvent) {
    if (event.button !== 0) return; // Left click only

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects([
      ...this.pinsGroup.children,
      ...this.componentsGroup.children,
      ...this.droneGroup.children,
      ...this.cablesGroup.children
    ], true);

    if (intersects.length > 0) {
      const firstHit = intersects[0].object;

      // Pin clicked
      if (firstHit.userData?.isPin) {
        const instId = firstHit.userData.instanceId;
        this.selectComponent(instId);
        this.updateStatus(`Tanlangan Pin: ${firstHit.userData.label || firstHit.userData.fullName}`, 2000);
        return;
      }

      let hit = firstHit;
      while (hit && hit.parent && hit.parent !== this.componentsGroup && hit.parent !== this.droneGroup && hit.parent !== this.cablesGroup) {
        hit = hit.parent;
      }

      if (hit.userData?.isCable) {
        this.selectCable(hit.userData.cableId);
        return;
      }

      if (hit.userData?.instanceId) {
        this.selectComponent(hit.userData.instanceId);
        return;
      }
    }
  }

  selectComponent(instanceId: string | null) {
    this.selectedInstanceId = instanceId;
    this.selectedCableId = null;

    if (!instanceId) {
      this.clearSelection();
      return;
    }

    const inst = this.data?.state.instances.find(i => i.instanceId === instanceId);
    if (!inst) return;

    // Attach Transform Gizmo in editor mode
    const obj = this.componentMeshes.get(instanceId);
    if (obj && this.mode === "editor") {
      this.transformControls.attach(obj);
    } else {
      this.transformControls.detach();
    }

    this.updateInspectorUI();

    document.querySelectorAll(".list-item").forEach(el => el.classList.remove("selected"));
    const sidebarItem = document.getElementById(`side-item-${instanceId}`);
    if (sidebarItem) {
      sidebarItem.classList.add("selected");
      sidebarItem.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }

  toggleWireframe() {
    this.wireframeMode = !this.wireframeMode;
    this.droneWireframe = this.wireframeMode;
    const btn = document.getElementById("btn-toggle-wireframe");
    if (btn) {
      if (this.wireframeMode) btn.classList.add("active");
      else btn.classList.remove("active");
    }

    const setWireframe = (obj: THREE.Object3D) => {
      obj.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          mats.forEach((m) => {
            if (m) (m as THREE.MeshStandardMaterial).wireframe = this.wireframeMode;
          });
        }
      });
    };

    if (this.droneGroup) setWireframe(this.droneGroup);
    if (this.componentsGroup) setWireframe(this.componentsGroup);
    this.updateStatus(this.wireframeMode ? "Karkas (Wireframe) yoqildi" : "Oddiy vizualizatsiya rejimi", 1500);
  }

  selectCable(cableId: string | null) {
    this.selectedCableId = cableId;
    this.selectedInstanceId = null;
    this.transformControls.detach();

    if (!cableId) {
      this.clearSelection();
      return;
    }

    this.switchTab("cables");
    document.querySelectorAll(".list-item").forEach(el => el.classList.remove("selected"));
    const cableItem = document.getElementById(`side-cable-${cableId}`);
    if (cableItem) {
      cableItem.classList.add("selected");
      cableItem.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }

    this.updateInspectorUI();
  }

  clearSelection() {
    this.selectedInstanceId = null;
    this.selectedCableId = null;
    this.transformControls.detach();
    const panel = document.getElementById("editor-inspector-panel");
    if (panel) panel.style.display = "none";
    document.querySelectorAll(".list-item").forEach(el => el.classList.remove("selected"));
  }

  updateInspectorUI() {
    const panel = document.getElementById("editor-inspector-panel");
    const compView = document.getElementById("inspector-component-view");
    const cableView = document.getElementById("inspector-cable-view");
    if (!panel) return;

    if (!this.selectedInstanceId && !this.selectedCableId) {
      panel.style.display = "none";
      return;
    }

    // 1. CABLE SELECTED (Matches PlacedInspectorPanel Breakout UI)
    if (this.selectedCableId) {
      const cable = this.data?.state.cables.find(c => c.id === this.selectedCableId);
      if (!cable) {
        panel.style.display = "none";
        return;
      }
      panel.style.display = "block";
      if (compView) compView.style.display = "none";
      if (cableView) cableView.style.display = "block";

      const titleEl = document.getElementById("cable-inspector-title");
      const badgeEl = document.getElementById("cable-inspector-badge");
      const fromNameEl = document.getElementById("cable-from-name");
      const fromPinEl = document.getElementById("cable-from-pin");
      const toNameEl = document.getElementById("cable-to-name");
      const toPinEl = document.getElementById("cable-to-pin");
      const lengthEl = document.getElementById("cable-inspector-length");
      const colorPreview = document.getElementById("cable-color-preview");
      const colorInput = document.getElementById("inp-cable-color") as HTMLInputElement;
      const colorLabel = document.getElementById("cable-color-label");

      const srcInst = this.data?.state.instances.find(i => i.instanceId === (cable.sourceInstanceId || cable.fromInstanceId));
      const tgtInst = this.data?.state.instances.find(i => i.instanceId === (cable.targetInstanceId || cable.toInstanceId));

      if (titleEl) titleEl.textContent = cable.name || `Kabel #${cable.id}`;
      if (badgeEl) {
        badgeEl.textContent = (cable.type || "Kabel").toUpperCase();
        const tagColor = cable.type === "power" ? "#ef4444" : cable.type === "can" ? "#0284c7" : cable.type === "uart" ? "#eab308" : "#38bdf8";
        badgeEl.style.color = tagColor;
        badgeEl.style.borderColor = tagColor;
      }
      if (fromNameEl) fromNameEl.textContent = srcInst?.name || cable.sourceInstanceId || cable.fromInstanceId || "-";
      if (fromPinEl) fromPinEl.textContent = cable.sourcePinName || cable.fromPin || "(Port tanlanmagan)";
      if (toNameEl) toNameEl.textContent = tgtInst?.name || cable.targetInstanceId || cable.toInstanceId || "-";
      if (toPinEl) toPinEl.textContent = cable.targetPinName || cable.toPin || "(Port tanlanmagan)";

      if (lengthEl) {
        let len = cable.lengthMm;
        if (!len) {
          const entry = this.cablesMap.get(cable.id);
          if (entry?.curve) {
            len = Math.round(entry.curve.getLength());
          }
        }
        lengthEl.textContent = len ? `${len} mm` : "N/A";
      }

      const activeColor = cable.color || "#0284c7";
      if (colorPreview) colorPreview.style.backgroundColor = activeColor;
      if (colorInput) colorInput.value = activeColor.startsWith("#") ? activeColor : "#" + activeColor;
      if (colorLabel) colorLabel.textContent = activeColor;

      // Breakout UI controls
      const checkBreakout = document.getElementById("check-cable-breakout") as HTMLInputElement;
      const breakoutDetails = document.getElementById("cable-breakout-details");
      const selectMode = document.getElementById("select-cable-breakout-mode") as HTMLSelectElement;
      const selectStrandCount = document.getElementById("select-cable-strand-count") as HTMLSelectElement;
      const strandsContainer = document.getElementById("cable-strands-list-container");

      const isBreakout = !!cable.isBreakout;
      if (checkBreakout) checkBreakout.checked = isBreakout;
      if (breakoutDetails) breakoutDetails.style.display = isBreakout ? "block" : "none";

      if (selectMode) selectMode.value = cable.breakoutMode || "1-to-N";
      if (selectStrandCount) selectStrandCount.value = (cable.strandCount || 3).toString();

      // Render per-strand pin mapping rows
      if (strandsContainer && isBreakout) {
        const strandCount = cable.strandCount || 3;
        const mode = cable.breakoutMode || "1-to-N";

        const srcPins: PinDefinition[] = srcInst ? ((srcInst.customPins && srcInst.customPins.length > 0) ? srcInst.customPins : (COMPONENT_PINS[srcInst.componentId] || [])) : [];
        const tgtPins: PinDefinition[] = tgtInst ? ((tgtInst.customPins && tgtInst.customPins.length > 0) ? tgtInst.customPins : (COMPONENT_PINS[tgtInst.componentId] || [])) : [];

        let rowsHtml = "";
        for (let s = 0; s < strandCount; s++) {
          const sPin = cable.multiSourcePinNames?.[s] || cable.sourcePinName || "";
          const tPin = cable.multiTargetPinNames?.[s] || cable.targetPinName || "";

          rowsHtml += `
            <div style="background: rgba(30, 41, 59, 0.7); border: 1px solid rgba(71, 85, 105, 0.5); border-radius: 6px; padding: 6px 8px; margin-bottom: 6px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <span style="font-size: 10px; font-weight: 700; color: #38bdf8;">Sim #${s + 1}</span>
                <span style="font-size: 9px; color: #94a3b8;">${mode}</span>
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
                <div>
                  <label style="font-size: 8px; color: #64748b; display: block; margin-bottom: 1px;">Manba Pini</label>
                  <select class="form-select" style="margin-bottom: 0; padding: 3px 5px; font-size: 10px;" onchange="window.DroneViewerApp && window.DroneViewerApp.setStrandPin(${s}, 'source', this.value)">
                    <option value="">-- Pin tanlang --</option>
                    ${srcPins.map(p => `<option value="${p.fullName}" ${p.fullName === sPin ? "selected" : ""}>${p.label || p.fullName}</option>`).join("")}
                  </select>
                </div>
                <div>
                  <label style="font-size: 8px; color: #64748b; display: block; margin-bottom: 1px;">Qabul qiluvchi Pini</label>
                  <select class="form-select" style="margin-bottom: 0; padding: 3px 5px; font-size: 10px;" onchange="window.DroneViewerApp && window.DroneViewerApp.setStrandPin(${s}, 'target', this.value)">
                    <option value="">-- Pin tanlang --</option>
                    ${tgtPins.map(p => `<option value="${p.fullName}" ${p.fullName === tPin ? "selected" : ""}>${p.label || p.fullName}</option>`).join("")}
                  </select>
                </div>
              </div>
            </div>
          `;
        }
        strandsContainer.innerHTML = rowsHtml;
      }
      return;
    }

    // 2. COMPONENT SELECTED
    const inst = this.data?.state.instances.find(i => i.instanceId === this.selectedInstanceId);
    if (!inst) {
      panel.style.display = "none";
      return;
    }

    panel.style.display = "block";
    if (compView) compView.style.display = "block";
    if (cableView) cableView.style.display = "none";

    const nameEl = document.getElementById("inspector-name");
    const idEl = document.getElementById("inspector-id");
    const posX = document.getElementById("inp-pos-x") as HTMLInputElement;
    const posY = document.getElementById("inp-pos-y") as HTMLInputElement;
    const posZ = document.getElementById("inp-pos-z") as HTMLInputElement;
    const rotX = document.getElementById("inp-rot-x") as HTMLInputElement;
    const rotY = document.getElementById("inp-rot-y") as HTMLInputElement;
    const rotZ = document.getElementById("inp-rot-z") as HTMLInputElement;

    if (nameEl) nameEl.textContent = inst.name;
    if (idEl) idEl.textContent = `ID: #${inst.instanceId} (${inst.componentId})`;

    if (posX) posX.value = Math.round(inst.position[0]).toString();
    if (posY) posY.value = Math.round(inst.position[1]).toString();
    if (posZ) posZ.value = Math.round(inst.position[2]).toString();

    if (rotX) rotX.value = Math.round(inst.rotation[0]).toString();
    if (rotY) rotY.value = Math.round(inst.rotation[1]).toString();
    if (rotZ) rotZ.value = Math.round(inst.rotation[2]).toString();

    // Populate Inspector Pins List
    const pinsList = document.getElementById("inspector-pins-list");
    const pinsCount = document.getElementById("inspector-pins-count");
    if (pinsList && pinsCount) {
      const pins: PinDefinition[] = (inst.customPins && inst.customPins.length > 0)
        ? inst.customPins
        : (COMPONENT_PINS[inst.componentId] || []);

      pinsCount.textContent = `${pins.length} ta pin`;

      if (pins.length === 0) {
        pinsList.innerHTML = `<div style="font-size: 10px; color: #64748b; padding: 6px;">Standart portlar mavjud emas</div>`;
      } else {
        const attachedCables = this.data?.state.cables.filter(c =>
          (c.sourceInstanceId === inst.instanceId || c.targetInstanceId === inst.instanceId)
        ) || [];

        pinsList.innerHTML = pins.map(p => {
          const isConnected = attachedCables.some(c =>
            (c.sourceInstanceId === inst.instanceId && c.sourcePinName === p.fullName) ||
            (c.targetInstanceId === inst.instanceId && c.targetPinName === p.fullName)
          );

          const tagColor = p.type === "power" ? "#ef4444" : p.type === "can" ? "#0284c7" : p.type === "uart" ? "#eab308" : "#38bdf8";

          return `
            <div class="pin-row-item">
              <div>
                <span class="pin-type-tag" style="background: ${tagColor}22; color: ${tagColor}; border: 1px solid ${tagColor}44;">${p.type}</span>
                <strong>${p.label || p.fullName}</strong>
                <div style="font-size: 9px; color: #94a3b8; font-family: monospace;">Offset: [${p.localOffset.join(", ")}]</div>
              </div>
              <span style="font-size: 9px; padding: 2px 6px; border-radius: 4px; ${isConnected ? 'background: #10b98122; color: #10b981;' : 'background: #64748b22; color: #94a3b8;'}">
                ${isConnected ? '✓ Ulandi' : 'Bo‘sh'}
              </span>
            </div>
          `;
        }).join("");
      }
    }

    // Update Inspector Color Controls
    const colorPreview = document.getElementById("inspector-color-preview");
    const colorInput = document.getElementById("inp-component-color") as HTMLInputElement;
    const colorLabel = document.getElementById("inspector-color-label");
    const btnApplyAll = document.getElementById("btn-apply-color-all-offline");

    const activeColor = inst.customColor || inst.color;
    if (colorPreview) colorPreview.style.backgroundColor = activeColor || "#ff6600";
    if (colorInput && activeColor) {
      colorInput.value = activeColor.startsWith("#") ? activeColor : "#" + activeColor;
    }
    if (colorLabel) {
      colorLabel.textContent = inst.customColor ? `Maxsus: ${inst.customColor}` : "Standart CAD";
    }

    if (btnApplyAll) {
      const sameComps = this.data?.state.instances.filter(i => i.componentId === inst.componentId) || [];
      if (sameComps.length > 1 && inst.customColor) {
        btnApplyAll.style.display = "block";
        btnApplyAll.textContent = `Barcha #${inst.componentId} modellarga (${sameComps.length} ta) qo‘llash`;
      } else {
        btnApplyAll.style.display = "none";
      }
    }
  }

  // --- COLOR CUSTOMIZATION ACTIONS ---
  onColorInputChange(colorHex: string) {
    if (!this.selectedInstanceId) return;
    this.setSelectedInstanceColor(colorHex);
  }

  setSelectedInstanceColor(colorHex: string) {
    if (!this.selectedInstanceId || !this.data) return;
    this.updateInstanceColor(this.selectedInstanceId, colorHex);
  }

  resetSelectedInstanceColor() {
    if (!this.selectedInstanceId || !this.data) return;
    this.updateInstanceColor(this.selectedInstanceId, undefined);
  }

  applySelectedColorToAll() {
    if (!this.selectedInstanceId || !this.data) return;
    const inst = this.data.state.instances.find(i => i.instanceId === this.selectedInstanceId);
    if (!inst) return;
    this.applyColorToAllInstances(inst.componentId, inst.customColor);
  }

  updateInstanceColor(instanceId: string, colorHex?: string) {
    if (!this.data) return;
    const inst = this.data.state.instances.find(i => i.instanceId === instanceId);
    if (!inst) return;
    inst.customColor = colorHex;

    const wrapper = this.componentMeshes.get(instanceId);
    if (wrapper) {
      this.applyColorToInstanceObject(wrapper, colorHex);
    }
    if ((inst.componentId === "01" || inst.name.toLowerCase().includes("fuselage") || inst.name.toLowerCase().includes("frame")) && this.droneGroup) {
      this.applyColorToInstanceObject(this.droneGroup, colorHex);
    }

    this.saveProjectLocally();
    this.updateInspectorUI();
    this.populateSidebarLists();
    this.updateStatus(`Rang yangilandi: ${colorHex || "Standart CAD"}`, 1800);
  }

  applyColorToAllInstances(componentId: string, colorHex?: string) {
    if (!this.data) return;
    let count = 0;
    this.data.state.instances.forEach(inst => {
      if (inst.componentId === componentId) {
        inst.customColor = colorHex;
        const wrapper = this.componentMeshes.get(inst.instanceId);
        if (wrapper) {
          this.applyColorToInstanceObject(wrapper, colorHex);
        }
        count++;
      }
    });

    this.saveProjectLocally();
    this.updateInspectorUI();
    this.populateSidebarLists();
    this.updateStatus(`#${componentId} barcha (${count} ta) nusxalariga rang saqlandi!`, 2200);
  }

  applyColorToInstanceObject(obj: THREE.Object3D, colorHex?: string) {
    obj.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((m) => {
          if (!m) return;
          const stdMat = m as THREE.MeshStandardMaterial;
          if (!stdMat.userData) stdMat.userData = {};
          if (stdMat.userData.origColor === undefined && stdMat.color) {
            stdMat.userData.origColor = stdMat.color.getHex();
            stdMat.userData.origVertexColors = !!stdMat.vertexColors;
          }

          if (colorHex) {
            stdMat.vertexColors = false;
            stdMat.color.set(colorHex);
          } else if (stdMat.userData.origColor !== undefined) {
            stdMat.vertexColors = !!stdMat.userData.origVertexColors;
            stdMat.color.setHex(stdMat.userData.origColor);
          }
          stdMat.needsUpdate = true;
        });
      }
    });
  }

  // --- EDITOR TRANSFORM ACTIONS ---
  onTransformInput() {
    if (!this.selectedInstanceId || !this.data) return;
    const inst = this.data.state.instances.find(i => i.instanceId === this.selectedInstanceId);
    const obj = this.componentMeshes.get(this.selectedInstanceId);
    if (!inst || !obj) return;

    const posX = parseFloat((document.getElementById("inp-pos-x") as HTMLInputElement).value) || 0;
    const posY = parseFloat((document.getElementById("inp-pos-y") as HTMLInputElement).value) || 0;
    const posZ = parseFloat((document.getElementById("inp-pos-z") as HTMLInputElement).value) || 0;

    const rotX = parseFloat((document.getElementById("inp-rot-x") as HTMLInputElement).value) || 0;
    const rotY = parseFloat((document.getElementById("inp-rot-y") as HTMLInputElement).value) || 0;
    const rotZ = parseFloat((document.getElementById("inp-rot-z") as HTMLInputElement).value) || 0;

    inst.position = [posX, posY, posZ];
    inst.rotation = [rotX, rotY, rotZ];

    obj.position.set(posX, posY, posZ);
    obj.rotation.set(
      THREE.MathUtils.degToRad(rotX),
      THREE.MathUtils.degToRad(rotY),
      THREE.MathUtils.degToRad(rotZ)
    );

    // Rebuild attached cables & update pins
    this.buildCables();
    this.syncPinMarkers();
    this.populateSidebarLists();
  }

  stepPosition(axis: "x" | "y" | "z", delta: number) {
    if (!this.selectedInstanceId || !this.data) return;
    const inst = this.data.state.instances.find(i => i.instanceId === this.selectedInstanceId);
    if (!inst) return;

    const idx = axis === "x" ? 0 : axis === "y" ? 1 : 2;
    inst.position[idx] += delta;

    this.updateInspectorUI();
    this.onTransformInput();
  }

  rotateQuick(axis: "x" | "y" | "z", deltaDeg: number) {
    if (!this.selectedInstanceId || !this.data) return;
    const inst = this.data.state.instances.find(i => i.instanceId === this.selectedInstanceId);
    if (!inst) return;

    const idx = axis === "x" ? 0 : axis === "y" ? 1 : 2;
    inst.rotation[idx] = (inst.rotation[idx] + deltaDeg) % 360;

    this.updateInspectorUI();
    this.onTransformInput();
  }

  focusSelected() {
    if (!this.selectedInstanceId) return;
    const obj = this.componentMeshes.get(this.selectedInstanceId);
    if (!obj) return;

    const targetPos = obj.position.clone();
    this.controls.target.copy(targetPos);
    this.camera.position.set(targetPos.x + 200, targetPos.y + 180, targetPos.z + 280);
    this.controls.update();
  }

  duplicateSelected() {
    if (!this.selectedInstanceId || !this.data) return;
    const inst = this.data.state.instances.find(i => i.instanceId === this.selectedInstanceId);
    if (!inst) return;

    const newInst = JSON.parse(JSON.stringify(inst));
    newInst.instanceId = (Date.now() % 100000).toString();
    newInst.name = `${inst.name} (Nusxa)`;
    newInst.position[0] += 50;
    newInst.position[2] += 50;

    this.data.state.instances.push(newInst);
    this.initSceneFromData();
    this.selectComponent(newInst.instanceId);
    this.updateStatus(`Nusxa yaratildi: ${newInst.name}`);
  }

  deleteSelected() {
    if (!this.selectedInstanceId || !this.data) return;
    const id = this.selectedInstanceId;

    this.data.state.instances = this.data.state.instances.filter(i => i.instanceId !== id);
    this.data.state.cables = this.data.state.cables.filter(c => (c.sourceInstanceId || c.fromInstanceId) !== id && (c.targetInstanceId || c.toInstanceId) !== id);

    this.clearSelection();
    this.initSceneFromData();
    this.updateStatus(`Element o‘chirildi: #${id}`);
  }

  // --- CABLE BREAKOUT & MANIPULATION ACTIONS ---
  toggleCableBreakout(enabled: boolean) {
    if (!this.selectedCableId || !this.data) return;
    const cable = this.data.state.cables.find(c => c.id === this.selectedCableId);
    if (!cable) return;

    cable.isBreakout = enabled;
    if (enabled) {
      cable.strandCount = cable.strandCount || 3;
      cable.breakoutMode = cable.breakoutMode || "1-to-N";
      cable.breakoutTaper = cable.breakoutTaper !== undefined ? cable.breakoutTaper : 0.65;
      if (!cable.multiSourcePinNames || cable.multiSourcePinNames.length === 0) {
        cable.multiSourcePinNames = Array(cable.strandCount).fill(cable.sourcePinName || "");
      }
      if (!cable.multiTargetPinNames || cable.multiTargetPinNames.length === 0) {
        cable.multiTargetPinNames = Array(cable.strandCount).fill(cable.targetPinName || "");
      }
      this.autoDistributeCablePins();
    } else {
      this.saveProjectLocally();
      this.buildCables();
      this.updateInspectorUI();
      this.populateSidebarLists();
    }

    this.updateStatus(enabled ? "Ko‘p tarmoqli (Breakout) kabel rejimi yoqildi" : "Yagona simli kabel rejimi", 1800);
  }

  setCableBreakoutMode(mode: "1-to-N" | "N-to-1" | "N-to-N") {
    if (!this.selectedCableId || !this.data) return;
    const cable = this.data.state.cables.find(c => c.id === this.selectedCableId);
    if (!cable) return;

    cable.breakoutMode = mode;
    this.autoDistributeCablePins();
  }

  setCableStrandCount(count: number) {
    if (!this.selectedCableId || !this.data) return;
    const cable = this.data.state.cables.find(c => c.id === this.selectedCableId);
    if (!cable) return;

    cable.strandCount = Math.max(2, Math.min(16, count));
    this.autoDistributeCablePins();
  }

  autoDistributeCablePins() {
    if (!this.selectedCableId || !this.data) return;
    const cable = this.data.state.cables.find(c => c.id === this.selectedCableId);
    if (!cable) return;

    const count = cable.strandCount || 3;
    const mode = cable.breakoutMode || "1-to-N";

    const srcInst = this.data.state.instances.find(i => i.instanceId === (cable.sourceInstanceId || cable.fromInstanceId));
    const tgtInst = this.data.state.instances.find(i => i.instanceId === (cable.targetInstanceId || cable.toInstanceId));

    const srcPins: PinDefinition[] = srcInst ? ((srcInst.customPins && srcInst.customPins.length > 0) ? srcInst.customPins : (COMPONENT_PINS[srcInst.componentId] || [])) : [];
    const tgtPins: PinDefinition[] = tgtInst ? ((tgtInst.customPins && tgtInst.customPins.length > 0) ? tgtInst.customPins : (COMPONENT_PINS[tgtInst.componentId] || [])) : [];

    const newSourcePins: string[] = [];
    const newTargetPins: string[] = [];
    const usedTarget = new Set<string>();
    const usedSource = new Set<string>();

    for (let s = 0; s < count; s++) {
      if (mode === "1-to-N") {
        newSourcePins.push(cable.sourcePinName || srcPins[0]?.fullName || "");
        const avail = tgtPins.find(p => !usedTarget.has(p.fullName));
        if (avail) {
          newTargetPins.push(avail.fullName);
          usedTarget.add(avail.fullName);
        } else {
          newTargetPins.push(tgtPins[s % Math.max(1, tgtPins.length)]?.fullName || cable.targetPinName || "");
        }
      } else if (mode === "N-to-1") {
        const avail = srcPins.find(p => !usedSource.has(p.fullName));
        if (avail) {
          newSourcePins.push(avail.fullName);
          usedSource.add(avail.fullName);
        } else {
          newSourcePins.push(srcPins[s % Math.max(1, srcPins.length)]?.fullName || cable.sourcePinName || "");
        }
        newTargetPins.push(cable.targetPinName || tgtPins[0]?.fullName || "");
      } else {
        const availS = srcPins.find(p => !usedSource.has(p.fullName));
        if (availS) {
          newSourcePins.push(availS.fullName);
          usedSource.add(availS.fullName);
        } else {
          newSourcePins.push(srcPins[s % Math.max(1, srcPins.length)]?.fullName || cable.sourcePinName || "");
        }
        const availT = tgtPins.find(p => !usedTarget.has(p.fullName));
        if (availT) {
          newTargetPins.push(availT.fullName);
          usedTarget.add(availT.fullName);
        } else {
          newTargetPins.push(tgtPins[s % Math.max(1, tgtPins.length)]?.fullName || cable.targetPinName || "");
        }
      }
    }

    cable.multiSourcePinNames = newSourcePins;
    cable.multiTargetPinNames = newTargetPins;

    this.saveProjectLocally();
    this.buildCables();
    this.updateInspectorUI();
    this.populateSidebarLists();
    this.updateStatus(`Pinlar avtomatik taqsimlandi (${count} ta sim)`, 1800);
  }

  setStrandPin(strandIndex: number, side: "source" | "target", pinName: string) {
    if (!this.selectedCableId || !this.data) return;
    const cable = this.data.state.cables.find(c => c.id === this.selectedCableId);
    if (!cable) return;

    const count = cable.strandCount || 3;
    if (!cable.multiSourcePinNames || cable.multiSourcePinNames.length < count) {
      cable.multiSourcePinNames = Array(count).fill(cable.sourcePinName || "");
    }
    if (!cable.multiTargetPinNames || cable.multiTargetPinNames.length < count) {
      cable.multiTargetPinNames = Array(count).fill(cable.targetPinName || "");
    }

    if (side === "source") {
      cable.multiSourcePinNames[strandIndex] = pinName;
      if (strandIndex === 0) cable.sourcePinName = pinName;
    } else {
      cable.multiTargetPinNames[strandIndex] = pinName;
      if (strandIndex === 0) cable.targetPinName = pinName;
    }

    this.saveProjectLocally();
    this.buildCables();
    this.populateSidebarLists();
    this.updateStatus(`Sim #${strandIndex + 1} pini o‘zgartirildi: ${pinName}`);
  }

  onCableColorChange(colorHex: string) {
    if (!this.selectedCableId || !this.data) return;
    const cable = this.data.state.cables.find(c => c.id === this.selectedCableId);
    if (!cable) return;

    cable.color = colorHex;
    this.saveProjectLocally();
    this.buildCables();
    this.updateInspectorUI();
    this.populateSidebarLists();
    this.updateStatus(`Kabel rangi o‘zgartirildi: ${colorHex}`);
  }

  swapSelectedCableEndpoints() {
    if (!this.selectedCableId || !this.data) return;
    const cable = this.data.state.cables.find(c => c.id === this.selectedCableId);
    if (!cable) return;

    const tempInst = cable.sourceInstanceId;
    const tempPin = cable.sourcePinName;
    cable.sourceInstanceId = cable.targetInstanceId;
    cable.sourcePinName = cable.targetPinName;
    cable.targetInstanceId = tempInst;
    cable.targetPinName = tempPin;

    if (cable.fromInstanceId && cable.toInstanceId) {
      const tFrom = cable.fromInstanceId;
      cable.fromInstanceId = cable.toInstanceId;
      cable.toInstanceId = tFrom;
    }

    if (cable.isBreakout) {
      const tempMultiSrc = cable.multiSourcePinNames;
      cable.multiSourcePinNames = cable.multiTargetPinNames;
      cable.multiTargetPinNames = tempMultiSrc;
      if (cable.breakoutMode === "1-to-N") cable.breakoutMode = "N-to-1";
      else if (cable.breakoutMode === "N-to-1") cable.breakoutMode = "1-to-N";
    }

    this.saveProjectLocally();
    this.buildCables();
    this.updateInspectorUI();
    this.populateSidebarLists();
    this.updateStatus("Kabel uchlari almashtirildi!");
  }

  deleteSelectedCable() {
    if (!this.selectedCableId || !this.data) return;
    const id = this.selectedCableId;

    this.data.state.cables = this.data.state.cables.filter(c => c.id !== id);
    this.clearSelection();
    this.buildCables();
    this.populateSidebarLists();
    this.saveProjectLocally();
    this.updateStatus(`Kabel o‘chirildi: #${id}`);
  }

  // --- COMPONENT CATALOG MODAL ---
  openCatalogModal() {
    const modal = document.getElementById("catalog-modal");
    const grid = document.getElementById("catalog-items-grid");
    if (!modal || !grid) return;

    grid.innerHTML = STANDARD_CATALOG.map(item => `
      <div class="catalog-item" onclick="window.DroneViewerApp.addComponentFromCatalog('${item.id}', '${item.name}')">
        <div class="catalog-item-title">➕ ${item.name}</div>
        <div class="catalog-item-desc">${item.desc}</div>
        <div style="font-size: 9px; color: #38bdf8; margin-top: 4px; font-family: monospace;">O‘lcham: ${item.dims.join(' × ')} mm</div>
      </div>
    `).join("");

    modal.style.display = "flex";
  }

  closeCatalogModal() {
    const modal = document.getElementById("catalog-modal");
    if (modal) modal.style.display = "none";
  }

  addComponentFromCatalog(componentId: string, name: string) {
    if (!this.data) return;
    this.closeCatalogModal();

    const newInstanceId = `${componentId}-${Date.now() % 10000}`;
    const newInst = {
      instanceId: newInstanceId,
      componentId: componentId,
      name: name,
      placed: true,
      position: [0, 60, 0] as [number, number, number],
      rotation: [0, 0, 0] as [number, number, number],
      scale: [1, 1, 1] as [number, number, number],
      color: "#0284c7"
    };

    this.data.state.instances.push(newInst);
    this.initSceneFromData();
    this.selectComponent(newInstanceId);
    this.updateStatus(`Yangi element qo‘shildi: ${name}`, 2000);
  }

  // --- PIN-TO-PIN CABLE WIRING ACTIONS ---
  onCableSourceChanged() {
    const fromSelect = document.getElementById("new-cable-from") as HTMLSelectElement;
    const pinSelect = document.getElementById("new-cable-from-pin") as HTMLSelectElement;
    if (!fromSelect || !pinSelect || !this.data) return;

    const fromId = fromSelect.value;
    const inst = this.data.state.instances.find(i => i.instanceId === fromId);
    if (!inst) return;

    const pins: PinDefinition[] = (inst.customPins && inst.customPins.length > 0)
      ? inst.customPins
      : (COMPONENT_PINS[inst.componentId] || []);

    if (pins.length === 0) {
      pinSelect.innerHTML = `<option value="">Umumiy markaz</option>`;
    } else {
      pinSelect.innerHTML = pins.map(p => `
        <option value="${p.fullName}">${p.label || p.fullName} (${p.type})</option>
      `).join("");
    }
  }

  onCableTargetChanged() {
    const toSelect = document.getElementById("new-cable-to") as HTMLSelectElement;
    const pinSelect = document.getElementById("new-cable-to-pin") as HTMLSelectElement;
    if (!toSelect || !pinSelect || !this.data) return;

    const toId = toSelect.value;
    const inst = this.data.state.instances.find(i => i.instanceId === toId);
    if (!inst) return;

    const pins: PinDefinition[] = (inst.customPins && inst.customPins.length > 0)
      ? inst.customPins
      : (COMPONENT_PINS[inst.componentId] || []);

    if (pins.length === 0) {
      pinSelect.innerHTML = `<option value="">Umumiy markaz</option>`;
    } else {
      pinSelect.innerHTML = pins.map(p => `
        <option value="${p.fullName}">${p.label || p.fullName} (${p.type})</option>
      `).join("");
    }
  }

  createCableFromUI() {
    if (!this.data) return;
    const fromSelect = document.getElementById("new-cable-from") as HTMLSelectElement;
    const fromPinSelect = document.getElementById("new-cable-from-pin") as HTMLSelectElement;
    const toSelect = document.getElementById("new-cable-to") as HTMLSelectElement;
    const toPinSelect = document.getElementById("new-cable-to-pin") as HTMLSelectElement;
    const typeSelect = document.getElementById("new-cable-type") as HTMLSelectElement;
    const isRibbonCheck = document.getElementById("new-cable-is-ribbon") as HTMLInputElement;

    const fromId = fromSelect?.value;
    const toId = toSelect?.value;
    const fromPin = fromPinSelect?.value || "";
    const toPin = toPinSelect?.value || "";
    const cableType = typeSelect?.value || "CAN";
    const isRibbon = Boolean(isRibbonCheck?.checked || cableType === "Ribbon");

    if (!fromId || !toId || fromId === toId) {
      alert("Ikkita turli komponentni tanlang!");
      return;
    }

    const typeColors: Record<string, string> = {
      CAN: "#38bdf8",
      Power: "#ef4444",
      UART: "#facc15",
      PWM: "#f97316",
      Ethernet: "#10b981",
      Airspeed: "#e2e8f0",
      Ribbon: "#a855f7"
    };

    const newCable = {
      id: `cable_${Date.now()}`,
      sourceInstanceId: fromId,
      targetInstanceId: toId,
      sourcePinName: fromPin,
      targetPinName: toPin,
      cableType: cableType,
      color: typeColors[cableType] || "#0284c7",
      thickness: isRibbon ? 2.6 : 2.0,
      isRibbon: isRibbon,
      strandCount: isRibbon ? 4 : 1,
      isTubing: cableType === "Airspeed"
    };

    this.data.state.cables.push(newCable);
    this.buildCables();
    this.populateSidebarLists();
    this.updateHUD();
    this.updateStatus(`Yangi kabel ulandi: ${cableType} (${fromPin} ➔ ${toPin})`, 2500);
  }

  deleteCable(cableId: string) {
    if (!this.data) return;
    this.data.state.cables = this.data.state.cables.filter(c => c.id !== cableId);
    this.buildCables();
    this.populateSidebarLists();
    this.updateHUD();
    this.updateStatus(`Kabel o‘chirildi: #${cableId}`);
  }

  // --- PERSISTENCE & EXPORT ---
  saveProjectLocally() {
    if (!this.data) return;
    try {
      localStorage.setItem("__DRONE_OFFLINE_SAVED_STATE__", JSON.stringify(this.data));
      this.updateStatus("✅ Barcha o‘zgarishlar brauzer xotirasiga muvaffaqiyatli saqlandi!", 2500);
    } catch (e) {
      console.warn("Local save error:", e);
      alert("Saqlashda xatolik yuz berdi!");
    }
  }

  exportProjectJson() {
    if (!this.data) return;
    const blob = new Blob([JSON.stringify(this.data.state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "drone_project_state.json";
    a.click();
    URL.revokeObjectURL(url);
    this.updateStatus("JSON fayl yuklab olindi!");
  }

  async downloadUpdatedZip() {
    if (!this.data) return;
    this.updateStatus("Yangi ZIP to‘plam yaratilmoqda...", 5000);

    try {
      const zip = new JSZip();

      // 1. State
      zip.file("project_state.json", JSON.stringify(this.data.state, null, 2));

      // 2. Data script with models
      const projectDataScript = `// Drone Avionics 3D Standalone Offline Data
window.__DRONE_PROJECT_DATA__ = ${JSON.stringify(this.data, null, 2)};
`;
      zip.file("data/project_data.js", projectDataScript);

      // 3. Engine
      try {
        const engineRes = await fetch("libs/viewer-engine.min.js");
        if (engineRes.ok) {
          zip.file("libs/viewer-engine.min.js", await engineRes.text());
        }
      } catch {
        // ignore
      }

      // 4. HTML
      const htmlContent = document.documentElement.outerHTML;
      zip.file("viewer.html", htmlContent);
      zip.file("index.html", htmlContent);

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "drone_avionics_updated.zip";
      a.click();
      URL.revokeObjectURL(url);
      this.updateStatus("✅ Yangilangan ZIP to‘plam yuklab olindi!", 2500);
    } catch (err) {
      console.error("ZIP creation error:", err);
      alert("ZIP yaratishda xatolik yuz berdi!");
    }
  }

  // --- UI POPULATION ---
  populateSidebarLists() {
    // Components
    const compContainer = document.getElementById("sidebar-components-list");
    if (compContainer && this.data) {
      const instances = this.data.state.instances.filter(i => i.placed);
      compContainer.innerHTML = instances.map(inst => {
        const dotColor = inst.customColor || inst.color || '#0284c7';
        return `
        <div class="list-item" id="side-item-${inst.instanceId}" onclick="window.DroneViewerApp.selectComponent('${inst.instanceId}')">
          <div class="item-title">
            <span style="display: flex; align-items: center; gap: 6px;">
              <span style="display: inline-block; width: 9px; height: 9px; border-radius: 50%; background-color: ${dotColor}; flex-shrink: 0; box-shadow: 0 0 5px ${dotColor}88;"></span>
              ${inst.name}
            </span>
            <span class="item-badge">#${inst.instanceId}</span>
          </div>
          <div class="item-sub">Pos: [${Math.round(inst.position[0])}, ${Math.round(inst.position[1])}, ${Math.round(inst.position[2])}] mm ${inst.customColor ? '• ' + inst.customColor : ''}</div>
        </div>
      `}).join("");
    }

    // Cables
    const cablesContainer = document.getElementById("sidebar-cables-list");
    if (cablesContainer && this.data) {
      const cables = this.data.state.cables;
      cablesContainer.innerHTML = cables.map(c => {
        const fromId = c.sourceInstanceId || c.fromInstanceId;
        const toId = c.targetInstanceId || c.toInstanceId;
        const fromInst = this.data?.state.instances.find(i => i.instanceId === fromId);
        const toInst = this.data?.state.instances.find(i => i.instanceId === toId);
        const fromName = fromInst ? fromInst.name : `#${fromId}`;
        const toName = toInst ? toInst.name : `#${toId}`;
        const fromPin = c.sourcePinName ? ` (${c.sourcePinName.split('.').pop()})` : '';
        const toPin = c.targetPinName ? ` (${c.targetPinName.split('.').pop()})` : '';

        return `
          <div class="list-item" id="side-cable-${c.id}" onclick="window.DroneViewerApp.selectCable('${c.id}')">
            <div class="item-title">
              <span style="color: ${c.color || '#38bdf8'};">${c.cableType || 'Cable'}</span>
              <button class="btn btn-danger" style="padding: 1px 6px; font-size: 9px;" onclick="event.stopPropagation(); window.DroneViewerApp.deleteCable('${c.id}')">🗑</button>
            </div>
            <div class="item-sub">${fromName}${fromPin} ➔ ${toName}${toPin} ${c.isRibbon ? '(Lentali ' + (c.strandCount || 3) + 'x)' : ''}</div>
          </div>
        `;
      }).join("");
    }

    // Pins Summary List
    const pinsContainer = document.getElementById("sidebar-pins-summary-list");
    if (pinsContainer && this.data) {
      const instances = this.data.state.instances.filter(i => i.placed && i.componentId !== "01");
      pinsContainer.innerHTML = instances.map(inst => {
        const pins: PinDefinition[] = (inst.customPins && inst.customPins.length > 0)
          ? inst.customPins
          : (COMPONENT_PINS[inst.componentId] || []);

        return `
          <div style="background: rgba(30, 41, 59, 0.4); border: 1px solid rgba(71, 85, 105, 0.4); border-radius: 8px; padding: 8px; margin-bottom: 8px;">
            <div style="font-size: 11px; font-weight: 700; color: #f8fafc; margin-bottom: 4px;">${inst.name} (#${inst.instanceId})</div>
            <div style="font-size: 10px; color: #94a3b8;">${pins.length} ta elektr pin / port</div>
          </div>
        `;
      }).join("");
    }
  }

  populateCableAdderDropdowns() {
    const fromSelect = document.getElementById("new-cable-from") as HTMLSelectElement;
    const toSelect = document.getElementById("new-cable-to") as HTMLSelectElement;
    if (!fromSelect || !toSelect || !this.data) return;

    const instances = this.data.state.instances.filter(i => i.placed && i.componentId !== "01");
    const options = instances.map(i => `<option value="${i.instanceId}">${i.name} (#${i.instanceId})</option>`).join("");
    fromSelect.innerHTML = options;
    toSelect.innerHTML = options;
    if (instances.length > 1) {
      toSelect.selectedIndex = 1;
    }

    this.onCableSourceChanged();
    this.onCableTargetChanged();
  }

  switchTab(tab: "components" | "cables" | "pins" | "settings") {
    document.querySelectorAll(".sidebar-tab-btn").forEach((btn, idx) => {
      btn.classList.toggle("active", (idx === 0 && tab === "components") || (idx === 1 && tab === "cables") || (idx === 2 && tab === "pins") || (idx === 3 && tab === "settings"));
    });
    document.querySelectorAll(".sidebar-tab-content").forEach(el => el.classList.remove("active"));
    const target = document.getElementById(`tab-${tab}`);
    if (target) target.classList.add("active");
  }

  filterComponents(query: string) {
    const q = query.toLowerCase();
    document.querySelectorAll("#sidebar-components-list .list-item").forEach(item => {
      const match = item.textContent?.toLowerCase().includes(q);
      (item as HTMLElement).style.display = match ? "block" : "none";
    });
  }

  updateHUD() {
    const compCount = this.data?.state.instances.filter(i => i.placed).length || 0;
    const cableCount = this.data?.state.cables.length || 0;
    const hudComp = document.getElementById("hud-components-count");
    const hudCable = document.getElementById("hud-cables-count");
    if (hudComp) hudComp.textContent = compCount.toString();
    if (hudCable) hudCable.textContent = cableCount.toString();
  }

  // --- CAMERA & VIEW TOGGLES ---
  setCameraView(view: "iso" | "top" | "front" | "side") {
    const dist = 1200;
    switch (view) {
      case "iso":
        this.camera.position.set(dist * 0.7, dist * 0.6, dist * 0.8);
        break;
      case "top":
        this.camera.position.set(0, dist * 1.3, 0);
        break;
      case "front":
        this.camera.position.set(0, 50, dist * 1.2);
        break;
      case "side":
        this.camera.position.set(dist * 1.2, 50, 0);
        break;
    }
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  toggleCables() {
    this.showCables = !this.showCables;
    this.cablesGroup.visible = this.showCables;
    document.getElementById("btn-toggle-cables")?.classList.toggle("active", this.showCables);
  }

  togglePins() {
    this.showPins = !this.showPins;
    this.pinsGroup.visible = this.showPins;
    document.getElementById("btn-toggle-pins")?.classList.toggle("active", this.showPins);
    const chk = document.getElementById("check-show-pins") as HTMLInputElement;
    if (chk) chk.checked = this.showPins;
  }

  toggleFlowAnimation() {
    this.flowAnimating = !this.flowAnimating;
    document.getElementById("btn-toggle-flow")?.classList.toggle("active", this.flowAnimating);
  }

  toggleGrid() {
    this.showGrid = !this.showGrid;
    if (this.gridHelper) this.gridHelper.visible = this.showGrid;
  }

  setDroneOpacity(val: number) {
    this.droneOpacity = val;
    this.applyAirframeMaterial(this.droneGroup);
  }

  setDroneColor(col: string) {
    this.droneColor = col;
    this.applyAirframeMaterial(this.droneGroup);
  }

  updateStatus(msg: string, autoHideMs = 0) {
    const el = document.getElementById("viewer-status");
    if (el) {
      el.textContent = msg;
      el.style.display = "block";
      el.style.opacity = "1";
    }
    if (autoHideMs > 0) {
      setTimeout(() => this.hideStatus(), autoHideMs);
    }
  }

  hideStatus() {
    const el = document.getElementById("viewer-status");
    if (el) {
      el.style.opacity = "0";
      setTimeout(() => { el.style.display = "none"; }, 300);
    }
  }

  onWindowResize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / (height || 1);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  // --- ANIMATION LOOP ---
  animate() {
    requestAnimationFrame(this.animate.bind(this));

    const delta = this.clock.getDelta();
    this.controls.update();

    // Pulse animation along cables
    if (this.flowAnimating && this.showCables) {
      this.pulseTime = (this.pulseTime + delta * 0.8) % 1.0;
      this.cablesMap.forEach(({ curve, pulseObj }) => {
        if (pulseObj && curve) {
          const pt = curve.getPoint(this.pulseTime);
          pulseObj.position.copy(pt);
        }
      });
    }

    this.renderer.render(this.scene, this.camera);
  }
}

// Global initialization
window.addEventListener("DOMContentLoaded", () => {
  try {
    window.DroneViewerApp = new StandaloneDroneViewer("canvas-container");
  } catch (err) {
    console.error("Viewer initialization error:", err);
  }
});
