import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { loadModelAsset, loadModelIndex, ModelAsset } from "./modelAssetLoader";

type AxisView = "+X" | "-X" | "+Y" | "-Y" | "+Z" | "-Z";
type TransformMode = "translate" | "rotate" | "scale";

type ComponentDefinition = {
  id: string;
  component: string;
  quantity: number;
  preferred_web_file: string;
  original_source: string;
  notes: string;
  asset_key?: string;
};

type InspectorTransform = {
  name: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
};

type CableData = {
  id: string;
  name: string;
  color: string;
  diameter: number;
  points: [number, number, number][];
  length: number;
  startAttachment?: CableAttachment;
  endAttachment?: CableAttachment;
};

type CableAttachment = {
  instanceId: string;
  local: [number, number, number];
};

type DraftCable = {
  points: THREE.Vector3[];
  attachments: (CableAttachment | undefined)[];
  markers: THREE.Mesh[];
  mesh?: THREE.Mesh;
};

type EditorRuntime = {
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  transform: TransformControls;
  transformHelper: THREE.Object3D;
  editorRoot: THREE.Group;
  cableRoot: THREE.Group;
  helperRoot: THREE.Group;
  assetIndex: Record<string, ModelAsset>;
  inventoryLimits: Record<string, number>;
  drone?: THREE.Group;
  selected?: THREE.Object3D;
  objects: Map<string, THREE.Object3D>;
  cables: Map<string, { data: CableData; mesh: THREE.Mesh }>;
  draft?: DraftCable;
  view: AxisView;
  bounds: THREE.Box3;
  frame: number;
};

const AXIS_VIEWS: AxisView[] = ["+X", "-X", "+Y", "-Y", "+Z", "-Z"];
const STORAGE_KEY = "uav-avionics-editor-v2";
const DEG = 180 / Math.PI;
const RAD = Math.PI / 180;

const COMPONENT_COLORS: Record<string, number> = {
  "cube-orange": 0xf26a21,
  here3: 0xd8dce0,
  hm30: 0x28343d,
  zr10: 0x25292d,
  "matek-bec": 0x2f7651,
  pm07: 0x1d1f22,
  pm02d: 0x2a2d30,
  tattu: 0x191919,
  "avionics-battery": 0x28537c,
  motor: 0x22262a,
  esc: 0x1e2429,
  servo: 0x17191b,
  pitot: 0xb9c0c4,
  "airspeed-module": 0x365d45,
  led: 0xcfd4d7,
  estop: 0xd92d28,
  propeller: 0x151719,
  "hobbywing-ubec": 0x254d74,
  "jetson-p3737": 0x34383c,
  "siyi-bec": 0x1b2025,
};

function parseCsv(text: string): ComponentDefinition[] {
  const rows = text.trim().split(/\r?\n/).filter(Boolean);
  const headers = rows.shift()?.split(",") ?? [];
  return rows.map((row) => {
    const values = row.split(",");
    const record = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
    return {
      id: record.id,
      component: record.component,
      quantity: Number(record.quantity) || 1,
      preferred_web_file: record.preferred_web_file,
      original_source: record.original_source,
      notes: record.notes,
      asset_key: record.asset_key,
    };
  });
}

function assetKeyFor(definition: ComponentDefinition): string {
  if (definition.asset_key) return definition.asset_key;
  const base = definition.preferred_web_file.replace(/\.(obj|stl|glb)$/i, "");
  if (base === "jetson-p3737") return "jetson-p3737";
  if (/pm02/i.test(base)) return "pm02d";
  return base;
}

function disposeObject(object: THREE.Object3D) {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.geometry?.dispose();
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => material?.dispose());
  });
}

function findComponentRoot(object?: THREE.Object3D) {
  let current = object;
  while (current && !current.userData.instanceId) current = current.parent ?? undefined;
  return current?.userData.instanceId ? current : undefined;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function makeCableMesh(points: THREE.Vector3[], color: string, diameter: number) {
  const path = points.length === 2
    ? [points[0], points[0].clone().lerp(points[1], 0.5), points[1]]
    : points;
  const curve = new THREE.CatmullRomCurve3(path, false, "centripetal", 0.25);
  const geometry = new THREE.TubeGeometry(curve, Math.max(18, points.length * 18), diameter / 2, 10, false);
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.58, metalness: 0.02 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData.isCable = true;
  mesh.renderOrder = 4;
  return { mesh, length: curve.getLength() };
}

async function createModelObject(asset: ModelAsset, key: string) {
  const buffer = await loadModelAsset(asset);
  let source: THREE.Object3D;
  if (asset.format === "stl") {
    const geometry = new STLLoader().parse(buffer);
    geometry.computeVertexNormals();
    const material = new THREE.MeshStandardMaterial({
      color: COMPONENT_COLORS[key] ?? 0x7c8b92,
      roughness: 0.52,
      metalness: key === "jetson-p3737" ? 0.38 : 0.1,
    });
    source = new THREE.Mesh(geometry, material);
  } else if (asset.format === "glb") {
    source = (await new GLTFLoader().parseAsync(buffer, "")).scene;
  } else {
    source = new OBJLoader().parse(new TextDecoder().decode(buffer));
  }

  source.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.castShadow = true;
    child.receiveShadow = true;
    if (asset.format !== "glb") {
      const current = Array.isArray(child.material) ? child.material[0] : child.material;
      child.material = new THREE.MeshStandardMaterial({
        color: current?.color ?? new THREE.Color(COMPONENT_COLORS[key] ?? 0x7c8b92),
        roughness: 0.5,
        metalness: key.includes("jetson") || key === "pitot" ? 0.34 : 0.08,
      });
    }
  });
  return source;
}

export default function App() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<EditorRuntime | null>(null);
  const cableModeRef = useRef(false);
  const cableColorRef = useRef("#e34332");
  const cableDiameterRef = useRef(8);
  const [definitions, setDefinitions] = useState<ComponentDefinition[]>([]);
  const [placedCounts, setPlacedCounts] = useState<Record<string, number>>({});
  const [inspector, setInspector] = useState<InspectorTransform>();
  const [activeView, setActiveView] = useState<AxisView>("+Z");
  const [transformMode, setTransformMode] = useState<TransformMode>("translate");
  const [droneOpacity, setDroneOpacity] = useState(0.2);
  const [droneWireframe, setDroneWireframe] = useState(false);
  const [droneVisible, setDroneVisible] = useState(true);
  const [cableMode, setCableMode] = useState(false);
  const [cableColor, setCableColor] = useState("#e34332");
  const [cableDiameter, setCableDiameter] = useState(8);
  const [draftPointCount, setDraftPointCount] = useState(0);
  const [cables, setCables] = useState<CableData[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("3D sahna tayyorlanmoqda…");
  const importRef = useRef<HTMLInputElement>(null);

  const availableDefinitions = useMemo(() => definitions.filter((item) =>
    item.id !== "01" && assetKeyFor(item) && item.component.toLowerCase().includes(search.toLowerCase())
  ), [definitions, search]);

  const syncPlacedState = () => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    const counts: Record<string, number> = {};
    runtime.objects.forEach((object) => {
      const key = object.userData.assetKey as string;
      counts[key] = (counts[key] ?? 0) + 1;
    });
    setPlacedCounts(counts);
  };

  const syncInspector = (object?: THREE.Object3D) => {
    if (!object) {
      setInspector(undefined);
      return;
    }
    setInspector({
      name: object.name,
      position: [object.position.x, object.position.y, object.position.z],
      rotation: [object.rotation.x * DEG, object.rotation.y * DEG, object.rotation.z * DEG],
      scale: [object.scale.x, object.scale.y, object.scale.z],
    });
  };

  const selectObject = (object?: THREE.Object3D) => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    runtime.selected = object;
    if (object && !cableModeRef.current) runtime.transform.attach(object);
    else runtime.transform.detach();
    syncInspector(object);
  };

  const syncCableState = () => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    setCables(Array.from(runtime.cables.values()).map(({ data }) => data));
  };

  const refreshAttachedCables = (object: THREE.Object3D) => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    let changed = false;
    runtime.cables.forEach((record) => {
      let recordChanged = false;
      const { startAttachment, endAttachment } = record.data;
      if (startAttachment && startAttachment.instanceId === object.userData.instanceId) {
        record.data.points[0] = object.localToWorld(new THREE.Vector3().fromArray(startAttachment.local)).toArray() as [number, number, number];
        recordChanged = true;
      }
      if (endAttachment && endAttachment.instanceId === object.userData.instanceId) {
        record.data.points[record.data.points.length - 1] = object.localToWorld(new THREE.Vector3().fromArray(endAttachment.local)).toArray() as [number, number, number];
        recordChanged = true;
      }
      if (!recordChanged) return;
      changed = true;
      const rebuilt = makeCableMesh(record.data.points.map((point) => new THREE.Vector3().fromArray(point)), record.data.color, record.data.diameter);
      runtime.cableRoot.remove(record.mesh);
      disposeObject(record.mesh);
      rebuilt.mesh.userData.cableId = record.data.id;
      runtime.cableRoot.add(rebuilt.mesh);
      record.mesh = rebuilt.mesh;
      record.data.length = rebuilt.length;
    });
    if (changed) syncCableState();
  };

  const buildProjectData = () => {
    const runtime = runtimeRef.current;
    if (!runtime) return undefined;
    return {
      version: 2,
      units: "millimeter",
      view: runtime.view,
      airframe: { wingspan: 3500, opacity: droneOpacity, wireframe: droneWireframe, visible: droneVisible },
      components: Array.from(runtime.objects.values()).map((object) => ({
        id: object.userData.instanceId,
        assetKey: object.userData.assetKey,
        name: object.name,
        position: object.position.toArray(),
        rotation: [object.rotation.x, object.rotation.y, object.rotation.z],
        scale: object.scale.toArray(),
      })),
      cables: Array.from(runtime.cables.values()).map(({ data }) => ({ ...data })),
      savedAt: new Date().toISOString(),
    };
  };

  const saveLocal = () => {
    const data = buildProjectData();
    if (data) localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  };

  const fitView = (view: AxisView, fit = true) => {
    const runtime = runtimeRef.current;
    const viewport = viewportRef.current;
    if (!runtime || !viewport) return;
    runtime.view = view;
    const box = runtime.drone ? new THREE.Box3().setFromObject(runtime.drone) : runtime.bounds;
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const distance = Math.max(size.x, size.y, size.z) * 2.2;
    const direction = new THREE.Vector3();
    if (view === "+X") direction.set(1, 0, 0);
    if (view === "-X") direction.set(-1, 0, 0);
    if (view === "+Y") direction.set(0, 1, 0);
    if (view === "-Y") direction.set(0, -1, 0);
    if (view === "+Z") direction.set(0, 0, 1);
    if (view === "-Z") direction.set(0, 0, -1);
    runtime.camera.position.copy(center).addScaledVector(direction, distance || 5000);
    runtime.camera.up.set(0, 0, 1);
    if (view === "+Z" || view === "-Z") runtime.camera.up.set(1, 0, 0);
    runtime.camera.lookAt(center);
    runtime.controls.target.copy(center);

    if (fit) {
      const aspect = Math.max(0.5, viewport.clientWidth / Math.max(1, viewport.clientHeight));
      let planeWidth = size.y;
      let planeHeight = size.z;
      if (view === "+Y" || view === "-Y") {
        planeWidth = size.x;
        planeHeight = size.z;
      }
      if (view === "+Z" || view === "-Z") {
        planeWidth = size.y;
        planeHeight = size.x;
      }
      const halfHeight = Math.max(planeHeight / 2, planeWidth / (2 * aspect), 250) * 1.14;
      runtime.camera.left = -halfHeight * aspect;
      runtime.camera.right = halfHeight * aspect;
      runtime.camera.top = halfHeight;
      runtime.camera.bottom = -halfHeight;
      runtime.camera.near = 0.1;
      runtime.camera.far = Math.max(20000, distance * 4);
      runtime.camera.updateProjectionMatrix();
    }
    runtime.controls.update();
    setActiveView(view);
  };

  const loadComponent = async (
    assetKey: string,
    name: string,
    saved?: { id?: string; position?: number[]; rotation?: number[]; scale?: number[] },
  ) => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    const asset = runtime.assetIndex[assetKey];
    if (!asset) {
      setStatus(`${name}: 3D model indeksi topilmadi`);
      return;
    }
    setStatus(`${name} yuklanmoqda…`);
    try {
      const source = await createModelObject(asset, assetKey);
      const wrapper = new THREE.Group();
      const sourceCenter = new THREE.Box3().setFromObject(source).getCenter(new THREE.Vector3());
      source.position.sub(sourceCenter);
      wrapper.add(source);
      wrapper.name = name;
      wrapper.userData.instanceId = saved?.id ?? `${assetKey}-${crypto.randomUUID()}`;
      wrapper.userData.assetKey = assetKey;
      wrapper.userData.isComponent = true;
      if (saved?.position) wrapper.position.fromArray(saved.position);
      else wrapper.position.copy(runtime.controls.target);
      if (saved?.rotation) wrapper.rotation.set(saved.rotation[0], saved.rotation[1], saved.rotation[2], "XYZ");
      if (saved?.scale) wrapper.scale.fromArray(saved.scale);
      runtime.editorRoot.add(wrapper);
      runtime.objects.set(wrapper.userData.instanceId, wrapper);
      syncPlacedState();
      selectObject(wrapper);
      saveLocal();
      setStatus(`${name} sahnaga qo‘shildi`);
      return wrapper;
    } catch (error) {
      setStatus(error instanceof Error ? error.message : `${name} yuklanmadi`);
    }
  };

  const addDefinition = async (definition: ComponentDefinition) => {
    const key = assetKeyFor(definition);
    if ((placedCounts[key] ?? 0) >= definition.quantity) return;
    await loadComponent(key, definition.component);
  };

  const updateDroneMaterial = (changes?: { opacity?: number; wireframe?: boolean; visible?: boolean }) => {
    const runtime = runtimeRef.current;
    if (!runtime?.drone) return;
    const opacity = changes?.opacity ?? droneOpacity;
    const wireframe = changes?.wireframe ?? droneWireframe;
    const visible = changes?.visible ?? droneVisible;
    runtime.drone.visible = visible;
    runtime.drone.traverse((child) => {
      if (!(child instanceof THREE.Mesh) || !child.userData.airframeSurface) return;
      const material = child.material as THREE.MeshPhysicalMaterial;
      material.opacity = opacity;
      material.wireframe = wireframe;
      material.needsUpdate = true;
    });
    saveLocal();
  };

  const updateSelectedTransform = (kind: "position" | "rotation" | "scale", axis: 0 | 1 | 2, value: number) => {
    const runtime = runtimeRef.current;
    const object = runtime?.selected;
    if (!runtime || !object || Number.isNaN(value)) return;
    if (kind === "position") object.position.setComponent(axis, value);
    if (kind === "rotation") {
      if (axis === 0) object.rotation.x = value * RAD;
      if (axis === 1) object.rotation.y = value * RAD;
      if (axis === 2) object.rotation.z = value * RAD;
    }
    if (kind === "scale") object.scale.setComponent(axis, value);
    object.updateMatrixWorld(true);
    refreshAttachedCables(object);
    syncInspector(object);
    saveLocal();
  };

  const removeSelected = () => {
    const runtime = runtimeRef.current;
    const object = runtime?.selected;
    if (!runtime || !object) return;
    runtime.transform.detach();
    const attachedCableIds = Array.from(runtime.cables.values()).filter(({ data }) => data.startAttachment?.instanceId === object.userData.instanceId || data.endAttachment?.instanceId === object.userData.instanceId).map(({ data }) => data.id);
    attachedCableIds.forEach((id) => removeCable(id));
    runtime.objects.delete(object.userData.instanceId);
    runtime.editorRoot.remove(object);
    disposeObject(object);
    runtime.selected = undefined;
    setInspector(undefined);
    syncPlacedState();
    saveLocal();
  };

  const setToolMode = (mode: TransformMode) => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    runtime.transform.setMode(mode);
    setTransformMode(mode);
  };

  const redrawDraft = () => {
    const runtime = runtimeRef.current;
    const draft = runtime?.draft;
    if (!runtime || !draft) return;
    if (draft.mesh) {
      runtime.cableRoot.remove(draft.mesh);
      disposeObject(draft.mesh);
      draft.mesh = undefined;
    }
    if (draft.points.length >= 2) {
      draft.mesh = makeCableMesh(draft.points, cableColorRef.current, cableDiameterRef.current).mesh;
      draft.mesh.userData.isDraft = true;
      runtime.cableRoot.add(draft.mesh);
    }
    setDraftPointCount(draft.points.length);
  };

  const clearDraft = () => {
    const runtime = runtimeRef.current;
    const draft = runtime?.draft;
    if (!runtime || !draft) return;
    if (draft.mesh) {
      runtime.cableRoot.remove(draft.mesh);
      disposeObject(draft.mesh);
    }
    draft.markers.forEach((marker) => {
      runtime.helperRoot.remove(marker);
      disposeObject(marker);
    });
    runtime.draft = undefined;
    setDraftPointCount(0);
  };

  const cancelCable = () => {
    clearDraft();
    cableModeRef.current = false;
    setCableMode(false);
    setStatus("Kabel chizish bekor qilindi");
  };

  const beginCable = () => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    if (runtime.draft) clearDraft();
    selectObject(undefined);
    cableModeRef.current = true;
    runtime.draft = { points: [], attachments: [], markers: [] };
    setCableMode(true);
    setDraftPointCount(0);
    setStatus("Kabel boshlanish nuqtasini port yoki pin ustida bosing");
  };

  const undoCablePoint = () => {
    const runtime = runtimeRef.current;
    const draft = runtime?.draft;
    if (!runtime || !draft || !draft.points.length) return;
    draft.points.pop();
    draft.attachments.pop();
    const marker = draft.markers.pop();
    if (marker) {
      runtime.helperRoot.remove(marker);
      disposeObject(marker);
    }
    redrawDraft();
  };

  const finishCable = () => {
    const runtime = runtimeRef.current;
    const draft = runtime?.draft;
    if (!runtime || !draft || draft.points.length < 2) {
      setStatus("Kabel uchun kamida 2 ta nuqta kerak");
      return;
    }
    if (!draft.attachments[0] || !draft.attachments[draft.attachments.length - 1]) {
      setStatus("Kabelning boshlanish va tugash nuqtasi komponent porti ustida bo‘lishi kerak");
      return;
    }
    const result = makeCableMesh(draft.points, cableColorRef.current, cableDiameterRef.current);
    const id = `cable-${crypto.randomUUID()}`;
    const data: CableData = {
      id,
      name: `Kabel ${runtime.cables.size + 1}`,
      color: cableColorRef.current,
      diameter: cableDiameterRef.current,
      points: draft.points.map((point) => point.toArray() as [number, number, number]),
      length: result.length,
      startAttachment: draft.attachments[0],
      endAttachment: draft.attachments[draft.attachments.length - 1],
    };
    clearDraft();
    result.mesh.userData.cableId = id;
    runtime.cableRoot.add(result.mesh);
    runtime.cables.set(id, { data, mesh: result.mesh });
    cableModeRef.current = false;
    setCableMode(false);
    syncCableState();
    saveLocal();
    setStatus(`${data.name} saqlandi — ${Math.round(data.length)} mm`);
  };

  const removeCable = (id: string) => {
    const runtime = runtimeRef.current;
    const record = runtime?.cables.get(id);
    if (!runtime || !record) return;
    runtime.cableRoot.remove(record.mesh);
    disposeObject(record.mesh);
    runtime.cables.delete(id);
    syncCableState();
    saveLocal();
  };

  const exportJson = () => {
    const data = buildProjectData();
    if (!data) return;
    downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }), "uav-cable-layout.json");
  };

  const exportPng = () => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    runtime.renderer.render(runtime.scene, runtime.camera);
    runtime.renderer.domElement.toBlob((blob) => blob && downloadBlob(blob, `uav-${runtime.view.replace("+", "plus").replace("-", "minus")}.png`));
  };

  const restoreProject = async (data: any) => {
    const runtime = runtimeRef.current;
    if (!runtime || !data) return;
    selectObject(undefined);
    runtime.objects.forEach((object) => {
      runtime.editorRoot.remove(object);
      disposeObject(object);
    });
    runtime.objects.clear();
    runtime.cables.forEach(({ mesh }) => {
      runtime.cableRoot.remove(mesh);
      disposeObject(mesh);
    });
    runtime.cables.clear();
    const restoredCounts: Record<string, number> = {};
    for (const item of data.components ?? []) {
      const limit = runtime.inventoryLimits[item.assetKey];
      if (!limit || (restoredCounts[item.assetKey] ?? 0) >= limit) continue;
      await loadComponent(item.assetKey, item.name, item);
      restoredCounts[item.assetKey] = (restoredCounts[item.assetKey] ?? 0) + 1;
    }
    for (const item of data.cables ?? []) {
      const points = item.points.map((point: number[]) => new THREE.Vector3().fromArray(point));
      const result = makeCableMesh(points, item.color, item.diameter);
      const cableData = { ...item, length: result.length } as CableData;
      result.mesh.userData.cableId = item.id;
      runtime.cableRoot.add(result.mesh);
      runtime.cables.set(item.id, { data: cableData, mesh: result.mesh });
    }
    const airframe = data.airframe ?? {};
    const opacity = airframe.opacity ?? 0.2;
    const wireframe = airframe.wireframe ?? false;
    const visible = airframe.visible ?? true;
    setDroneOpacity(opacity);
    setDroneWireframe(wireframe);
    setDroneVisible(visible);
    updateDroneMaterial({ opacity, wireframe, visible });
    syncPlacedState();
    syncCableState();
    fitView(data.view ?? "+Z");
    saveLocal();
    setStatus("Loyiha tiklandi");
  };

  const importJson = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      await restoreProject(JSON.parse(await file.text()));
    } catch {
      setStatus("JSON faylini o‘qib bo‘lmadi");
    }
    event.target.value = "";
  };

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    let disposed = false;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x07121b);
    scene.fog = new THREE.Fog(0x07121b, 7000, 13000);
    const camera = new THREE.OrthographicCamera(-1000, 1000, 600, -600, 0.1, 20000);
    camera.position.set(0, 0, 5000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(viewport.clientWidth, viewport.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    viewport.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableRotate = false;
    controls.enablePan = true;
    controls.enableZoom = true;
    controls.zoomToCursor = true;
    controls.screenSpacePanning = true;
    const transform = new TransformControls(camera, renderer.domElement);
    transform.setSize(0.72);
    const transformHelper = transform.getHelper();
    scene.add(transformHelper);
    const editorRoot = new THREE.Group();
    editorRoot.name = "Komponentlar";
    scene.add(editorRoot);
    const cableRoot = new THREE.Group();
    cableRoot.name = "Kabellar";
    scene.add(cableRoot);
    const helperRoot = new THREE.Group();
    helperRoot.name = "Yordamchi nuqtalar";
    scene.add(helperRoot);
    scene.add(new THREE.HemisphereLight(0xe5f5ff, 0x24303a, 2.3));
    const keyLight = new THREE.DirectionalLight(0xffffff, 3.4);
    keyLight.position.set(-2500, -1800, 4200);
    keyLight.castShadow = true;
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0x78c9ff, 1.4);
    fillLight.position.set(2500, 1800, 1200);
    scene.add(fillLight);
    const grid = new THREE.GridHelper(6000, 60, 0x2e758a, 0x183442);
    grid.rotation.x = Math.PI / 2;
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.3;
    scene.add(grid);

    const runtime: EditorRuntime = {
      scene, camera, renderer, controls, transform, transformHelper, editorRoot, cableRoot, helperRoot,
      assetIndex: {}, inventoryLimits: {}, objects: new Map(), cables: new Map(), view: "+Z",
      bounds: new THREE.Box3(new THREE.Vector3(-1000, -1750, -300), new THREE.Vector3(1000, 1750, 300)), frame: 0,
    };
    runtimeRef.current = runtime;
    transform.addEventListener("dragging-changed", ((event: { value: boolean }) => { controls.enabled = !event.value; }) as any);
    transform.addEventListener("objectChange", (() => {
      syncInspector(runtime.selected);
      if (runtime.selected) refreshAttachedCables(runtime.selected);
      saveLocal();
    }) as any);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      if (cableModeRef.current && runtime.draft) {
        const componentHit = raycaster.intersectObjects(Array.from(runtime.objects.values()), true)[0];
        const host = findComponentRoot(componentHit?.object);
        const airframeHit = runtime.drone ? raycaster.intersectObject(runtime.drone, true)[0] : undefined;
        let point: THREE.Vector3 | undefined = componentHit?.point.clone() ?? airframeHit?.point.clone();
        if (!runtime.draft.points.length && !host) {
          setStatus("Kabelni boshlash uchun komponentdagi ko‘rinadigan pin yoki portni bosing");
          return;
        }
        if (!point) {
          const reference = runtime.draft.points.at(-1) ?? controls.target;
          const normal = new THREE.Vector3();
          if (runtime.view.endsWith("X")) normal.set(1, 0, 0);
          if (runtime.view.endsWith("Y")) normal.set(0, 1, 0);
          if (runtime.view.endsWith("Z")) normal.set(0, 0, 1);
          const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, reference);
          point = raycaster.ray.intersectPlane(plane, new THREE.Vector3()) ?? undefined;
        }
        if (!point) return;
        host?.updateWorldMatrix(true, false);
        const attachment = host ? {
          instanceId: host.userData.instanceId as string,
          local: host.worldToLocal(point.clone()).toArray() as [number, number, number],
        } : undefined;
        runtime.draft.points.push(point);
        runtime.draft.attachments.push(attachment);
        const marker = new THREE.Mesh(new THREE.SphereGeometry(13, 14, 10), new THREE.MeshBasicMaterial({ color: cableColorRef.current, depthTest: false }));
        marker.position.copy(point);
        marker.renderOrder = 10;
        runtime.helperRoot.add(marker);
        runtime.draft.markers.push(marker);
        redrawDraft();
        setStatus(runtime.draft.points.length === 1 ? "Endi kabel yo‘lining keyingi nuqtalarini belgilang" : `${runtime.draft.points.length} ta kabel nuqtasi`);
        return;
      }
      const hits = raycaster.intersectObjects(Array.from(runtime.objects.values()), true);
      let root: THREE.Object3D | undefined = hits[0]?.object;
      while (root && !root.userData.instanceId) root = root.parent ?? undefined;
      selectObject(root?.userData.instanceId ? root : undefined);
    };
    renderer.domElement.addEventListener("pointerdown", onPointerDown);

    const resize = () => {
      if (!viewportRef.current) return;
      renderer.setSize(viewportRef.current.clientWidth, viewportRef.current.clientHeight);
      fitView(runtime.view, true);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(viewport);
    const animate = () => {
      runtime.frame = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const initialize = async () => {
      try {
        const [index, manifestText] = await Promise.all([loadModelIndex(), fetch("/data/component_manifest.csv").then((response) => response.text())]);
        if (disposed) return;
        runtime.assetIndex = index;
        const parsedDefinitions = parseCsv(manifestText);
        runtime.inventoryLimits = Object.fromEntries(parsedDefinitions.filter((item) => item.id !== "01").map((item) => [assetKeyFor(item), item.quantity]));
        setDefinitions(parsedDefinitions);
        const droneSource = await createModelObject(index.drone, "drone");
        const sourceSize = new THREE.Box3().setFromObject(droneSource).getSize(new THREE.Vector3());
        droneSource.scale.setScalar(3500 / sourceSize.x);
        droneSource.rotation.z = Math.PI / 2;
        droneSource.updateMatrixWorld(true);
        droneSource.position.sub(new THREE.Box3().setFromObject(droneSource).getCenter(new THREE.Vector3()));
        const drone = new THREE.Group();
        drone.name = "3.5 m UAV korpusi";
        drone.add(droneSource);
        drone.traverse((child) => {
          if (!(child instanceof THREE.Mesh)) return;
          child.userData.airframeSurface = true;
          child.material = new THREE.MeshPhysicalMaterial({ color: 0xc8e1e9, transparent: true, opacity: 0.2, roughness: 0.58, metalness: 0.04, transmission: 0.05, side: THREE.DoubleSide, depthWrite: false });
          child.add(new THREE.LineSegments(new THREE.EdgesGeometry(child.geometry, 28), new THREE.LineBasicMaterial({ color: 0x8eb7c4, transparent: true, opacity: 0.38 })));
        });
        scene.add(drone);
        runtime.drone = drone;
        runtime.bounds = new THREE.Box3().setFromObject(drone);
        fitView("+Z");
        setStatus("Dron modeli tayyor — kamera aylanishi qulflangan");
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) await restoreProject(JSON.parse(saved));
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "3D modellar yuklanmadi");
      }
    };
    initialize();

    return () => {
      disposed = true;
      cancelAnimationFrame(runtime.frame);
      observer.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      transform.dispose();
      controls.dispose();
      renderer.dispose();
      viewport.removeChild(renderer.domElement);
      runtimeRef.current = null;
    };
  }, []);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark">UAV</span><div><strong>Avionika 3D montaj muharriri</strong><small>3.5 m twin-motor platforma · millimetr</small></div></div>
        <nav className="view-switcher" aria-label="Ortografik ko‘rinishlar">{AXIS_VIEWS.map((view) => <button key={view} className={activeView === view ? "active" : ""} onClick={() => fitView(view)}>{view}</button>)}</nav>
        <div className="export-actions"><button onClick={exportPng}>PNG</button><button onClick={exportJson}>JSON</button><button onClick={() => importRef.current?.click()}>Import</button><input ref={importRef} type="file" accept="application/json" hidden onChange={importJson} /></div>
      </header>

      <aside className="left-panel panel">
        <div className="panel-heading"><div><span className="eyebrow">KUTUBXONA</span><h2>Komponentlar</h2></div><span className="badge">{availableDefinitions.length}</span></div>
        <input className="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Komponent qidirish…" />
        <div className="component-list">{availableDefinitions.map((definition) => {
          const key = assetKeyFor(definition);
          const count = placedCounts[key] ?? 0;
          const complete = count >= definition.quantity;
          return <article className="component-card" key={definition.id}><div><span className="component-number">{definition.id}</span><h3>{definition.component}</h3><p>{definition.notes}</p></div><div className="component-card__footer"><span>{count}/{definition.quantity}</span><button disabled={complete} onClick={() => addDefinition(definition)}>{complete ? "Joylangan" : "Sahnaga qo‘shish"}</button></div></article>;
        })}</div>
      </aside>

      <main className="workspace">
        <div className="viewport" ref={viewportRef}>
          <div className="viewport-label"><span className="live-dot" />{activeView} ORTOGRAFIK</div>
          <div className="axis-gizmo" aria-hidden="true"><i className="axis-x">X</i><i className="axis-y">Y</i><i className="axis-z">Z</i></div>
          <div className="viewport-help">G‘ildirak — masshtab · O‘rta tugma — siljitish · Kamera aylanishi qulflangan</div>
          {cableMode && <div className="cable-mode-banner">KABEL REJIMI · sahnada ketma-ket nuqtalarni bosing · {draftPointCount} nuqta</div>}
        </div>
        <div className="statusbar"><span>{status}</span><span>{runtimeRef.current?.objects.size ?? 0} komponent · {cables.length} kabel</span></div>
      </main>

      <aside className="right-panel panel">
        <section className="tool-section">
          <span className="eyebrow">KORPUS</span><h2>Dron ko‘rinishi</h2>
          <label className="range-row"><span>Shaffoflik</span><output>{Math.round(droneOpacity * 100)}%</output><input type="range" min="0.05" max="0.75" step="0.01" value={droneOpacity} onChange={(event) => { const value = Number(event.target.value); setDroneOpacity(value); updateDroneMaterial({ opacity: value }); }} /></label>
          <div className="check-row"><label><input type="checkbox" checked={droneWireframe} onChange={(event) => { setDroneWireframe(event.target.checked); updateDroneMaterial({ wireframe: event.target.checked }); }} /> Wireframe</label><label><input type="checkbox" checked={droneVisible} onChange={(event) => { setDroneVisible(event.target.checked); updateDroneMaterial({ visible: event.target.checked }); }} /> Ko‘rsatish</label></div>
        </section>

        <section className="tool-section">
          <span className="eyebrow">TRANSFORM</span><h2>{inspector?.name ?? "Komponent tanlanmagan"}</h2>
          <div className="mode-tabs"><button className={transformMode === "translate" ? "active" : ""} onClick={() => setToolMode("translate")}>Ko‘chirish</button><button className={transformMode === "rotate" ? "active" : ""} onClick={() => setToolMode("rotate")}>Burish</button><button className={transformMode === "scale" ? "active" : ""} onClick={() => setToolMode("scale")}>Masshtab</button></div>
          {inspector ? <><CoordinateFields title="Pozitsiya (mm)" values={inspector.position} onChange={(axis, value) => updateSelectedTransform("position", axis, value)} /><CoordinateFields title="Burilish (°)" values={inspector.rotation} onChange={(axis, value) => updateSelectedTransform("rotation", axis, value)} /><CoordinateFields title="Masshtab" values={inspector.scale} step={0.01} onChange={(axis, value) => updateSelectedTransform("scale", axis, value)} /><button className="danger" onClick={removeSelected}>Inventarga qaytarish</button></> : <p className="empty-copy">Sahnadagi komponentni bosing. O‘qlar orqali aniq joylashtiring.</p>}
        </section>

        <section className="tool-section cable-section">
          <span className="eyebrow">KABEL MONTAJI</span><h2>Yo‘l chizish</h2>
          <div className="cable-options"><label>Rang<input type="color" value={cableColor} onChange={(event) => { setCableColor(event.target.value); cableColorRef.current = event.target.value; redrawDraft(); }} /></label><label>Diametr (mm)<input type="number" min="1" max="40" value={cableDiameter} onChange={(event) => { const value = Number(event.target.value); setCableDiameter(value); cableDiameterRef.current = value; redrawDraft(); }} /></label></div>
          {!cableMode ? <button className="primary wide" onClick={beginCable}>Yangi kabel boshlash</button> : <div className="cable-actions"><button onClick={undoCablePoint}>Oxirgi nuqtani qaytarish</button><button className="primary" onClick={finishCable}>Kabelni yakunlash</button><button onClick={cancelCable}>Bekor qilish</button></div>}
          <p className="hint">Avval ko‘rinib turgan pin yoki port yuzasini bosing. Elektr ulanishi sifatida tasdiqlash uchun port CAD/datasheet’da nomlangan bo‘lishi kerak.</p>
          <div className="cable-list">{cables.map((cable) => <div key={cable.id}><span className="cable-swatch" style={{ background: cable.color }} /><span><strong>{cable.name}</strong><small>{Math.round(cable.length)} mm · Ø {cable.diameter} mm</small></span><button onClick={() => removeCable(cable.id)}>×</button></div>)}</div>
        </section>
      </aside>
    </div>
  );
}

function CoordinateFields({ title, values, step = 1, onChange }: { title: string; values: [number, number, number]; step?: number; onChange: (axis: 0 | 1 | 2, value: number) => void }) {
  return <fieldset className="coordinate-fields"><legend>{title}</legend>{(["X", "Y", "Z"] as const).map((axis, index) => <label key={axis} className={`coord-${axis.toLowerCase()}`}><span>{axis}</span><input type="number" step={step} value={Number(values[index].toFixed(step < 1 ? 3 : 1))} onChange={(event) => onChange(index as 0 | 1 | 2, Number(event.target.value))} /></label>)}</fieldset>;
}
