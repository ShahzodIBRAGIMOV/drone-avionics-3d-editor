import React, { useEffect, useRef, useState, useMemo } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";
import {
  PhysicalInstance,
  CableConnection,
  CableRoutePoint,
  TransformMode,
  TransformSpace,
  CameraViewMode,
  PinDefinition,
  SceneTheme,
  CableFlowType,
} from "../types";
import {
  Activity,
  Zap,
  Radio,
  RotateCw,
  Camera,
  Video,
  Square,
  Play,
  Pause,
} from "lucide-react";
import { modelManager, COMPONENT_ID_TO_ASSET_KEY } from "../services/modelManager";
import { COMPONENT_PINS } from "../data/pinDefinitions";
import { getDefaultStrandColors } from "../data/cablePresets";
import { build3DStickerMesh } from "../utils/cable3DStickers";

export function isCablePower(cable: CableConnection): boolean {
  const type = (cable.cableType || "").toLowerCase();

  // Explicit signal types take precedence
  const signalKeywords = [
    "signal",
    "uart",
    "can",
    "i2c",
    "spi",
    "pwm",
    "telemetry",
    "sbus",
    "ppm",
    "gps",
    "video",
    "camera",
    "ethernet",
    "usb",
    "servo",
  ];
  if (signalKeywords.some((k) => type.includes(k))) {
    return false;
  }

  if (
    type.includes("power") ||
    type.includes("bat") ||
    type.includes("esc") ||
    type.includes("vbat") ||
    type.includes("bec") ||
    type.includes("current") ||
    type.includes("quvvat")
  ) {
    return true;
  }
  const sPin = (cable.sourcePinName || "").toLowerCase();
  const tPin = (cable.targetPinName || "").toLowerCase();
  const pwrKeywords = [
    "vcc",
    "pwr",
    "bat",
    "pos",
    "neg",
    "12v",
    "5v",
    "24v",
    "gnd",
    "vin",
    "vout",
    "in_pos",
    "in_neg",
    "plus",
    "minus",
    "ground",
  ];
  if (pwrKeywords.some((k) => sPin.includes(k) || tPin.includes(k))) {
    return true;
  }
  if (cable.cores && cable.cores.some((c) => c.signalType === "power" || c.signalType === "gnd")) {
    return true;
  }
  if (cable.color) {
    const col = cable.color.toLowerCase();
    if (
      [
        "#ef4444",
        "#dc2626",
        "#b91c1c",
        "#f97316",
        "#ea580c",
        "#c2410c",
        "#ff0000",
        "#ff5500",
      ].includes(col)
    ) {
      return true;
    }
  }
  return false;
}

export const SCENE_THEMES: Record<
  SceneTheme,
  {
    id: SceneTheme;
    name: string;
    description: string;
    bgColor: number;
    fogColor: number;
    fogDensity: number;
    ambientColor: number;
    ambientIntensity: number;
    hemiSkyColor: number;
    hemiGroundColor: number;
    hemiIntensity: number;
    dir1Color: number;
    dir1Intensity: number;
    dir2Color: number;
    dir2Intensity: number;
    gridPrimary: number;
    gridSecondary: number;
  }
> = {
  dark: {
    id: "dark",
    name: "Aerospace Dark",
    description: "Chuqur kosmik qora va aerokosmik sovuq yorug‘lik",
    bgColor: 0x071018,
    fogColor: 0x071018,
    fogDensity: 0.00015,
    ambientColor: 0xd5e6f2,
    ambientIntensity: 1.4,
    hemiSkyColor: 0x7397b3,
    hemiGroundColor: 0x1a2630,
    hemiIntensity: 0.9,
    dir1Color: 0xffffff,
    dir1Intensity: 2.2,
    dir2Color: 0x4299e1,
    dir2Intensity: 0.8,
    gridPrimary: 0x1f475a,
    gridSecondary: 0x0f2430,
  },
  light: {
    id: "light",
    name: "Studio Light",
    description: "Yorug‘ injenerlik laboratoriyasi va aniq muhandislik foni",
    bgColor: 0xeef2f6,
    fogColor: 0xeef2f6,
    fogDensity: 0.00008,
    ambientColor: 0xffffff,
    ambientIntensity: 1.8,
    hemiSkyColor: 0xffffff,
    hemiGroundColor: 0xcfd8dc,
    hemiIntensity: 1.2,
    dir1Color: 0xffffff,
    dir1Intensity: 2.0,
    dir2Color: 0x93c5fd,
    dir2Intensity: 0.8,
    gridPrimary: 0x64748b,
    gridSecondary: 0xcbd5e1,
  },
  blueprint: {
    id: "blueprint",
    name: "CAD Blueprint",
    description: "Klassik chizmachilik to‘q ko‘k va elektr sian chiziqlari",
    bgColor: 0x091428,
    fogColor: 0x091428,
    fogDensity: 0.00012,
    ambientColor: 0x93c5fd,
    ambientIntensity: 1.3,
    hemiSkyColor: 0x3b82f6,
    hemiGroundColor: 0x0a1424,
    hemiIntensity: 0.8,
    dir1Color: 0xe0f2fe,
    dir1Intensity: 2.1,
    dir2Color: 0x2563eb,
    dir2Intensity: 1.0,
    gridPrimary: 0x38bdf8,
    gridSecondary: 0x1e3a8a,
  },
  tactical: {
    id: "tactical",
    name: "Tactical Night",
    description: "Tungi taktik harbiy operatsiya va zumrad setka",
    bgColor: 0x040e0a,
    fogColor: 0x040e0a,
    fogDensity: 0.00014,
    ambientColor: 0x6ee7b7,
    ambientIntensity: 1.2,
    hemiSkyColor: 0x10b981,
    hemiGroundColor: 0x022c22,
    hemiIntensity: 0.9,
    dir1Color: 0xecfdf5,
    dir1Intensity: 2.0,
    dir2Color: 0x059669,
    dir2Intensity: 0.9,
    gridPrimary: 0x10b981,
    gridSecondary: 0x064e3b,
  },
  hangar: {
    id: "hangar",
    name: "Hangar Sunset",
    description: "Angar ichidagi quyosh botishi va iliq industriyal yorug‘lik",
    bgColor: 0x171015,
    fogColor: 0x171015,
    fogDensity: 0.00013,
    ambientColor: 0xfed7aa,
    ambientIntensity: 1.4,
    hemiSkyColor: 0xf97316,
    hemiGroundColor: 0x27171e,
    hemiIntensity: 0.9,
    dir1Color: 0xffedd5,
    dir1Intensity: 2.3,
    dir2Color: 0xe11d48,
    dir2Intensity: 0.8,
    gridPrimary: 0xf97316,
    gridSecondary: 0x451a1a,
  },
};

interface Viewport3DProps {
  instances: PhysicalInstance[];
  cables: CableConnection[];
  selectedInstanceId: string | null;
  selectedInstanceIds?: string[];
  selectedPinFullName: string | null;
  selectedCableId?: string | null;
  onSelectCable?: (cableId: string | null) => void;
  onUpdateCable?: (cableId: string, updated: Partial<CableConnection>) => void;
  onAddCableRoutePoint?: (cableId: string, customPoint?: Partial<CableRoutePoint>) => void;
  onUpdateCableRoutePoint?: (cableId: string, pointId: string, coords: { x: number; y: number; z: number }) => void;
  onDeleteCableRoutePoint?: (cableId: string, pointId: string) => void;
  onStraightenCable?: (cableId: string) => void;
  onSwapCableEnds?: (cableId: string) => void;
  transformMode: TransformMode;
  transformSpace: TransformSpace;
  droneOpacity: number;
  droneWireframe: boolean;
  droneVisible: boolean;
  droneColor?: string;
  sceneTheme?: SceneTheme;
  showPins: boolean;
  showCables: boolean;
  showGrid: boolean;
  cameraViewMode: CameraViewMode;
  onSelectInstance: (instanceId: string | null, isShift?: boolean) => void;
  onSelectPin: (pinFullName: string | null) => void;
  onUpdateTransform: (
    instanceId: string,
    pos: [number, number, number],
    rot: [number, number, number],
    scale: [number, number, number]
  ) => void;
  onUpdateMultipleTransforms?: (
    updates: Array<{
      instanceId: string;
      position: [number, number, number];
      rotation: [number, number, number];
      scale: [number, number, number];
    }>
  ) => void;
  registerCaptureFn: (fn: () => string) => void;
  onAssetLoadError: (assetKey: string, message: string) => void;
  reloadTrigger?: number;
  isPlacingPinMode?: boolean;
  placingPinTargetInstanceId?: string | null;
  onAddPinAtPoint?: (instanceId: string, localOffset: [number, number, number]) => void;
  onCancelPlacingPinMode?: () => void;
  focusOnSelectionTrigger?: number;
  onTransformStart?: () => void;
  cameraViewTrigger?: number;
  isIsolatedView?: boolean;
  onToggleIsolatedView?: () => void;
  hideObstacles?: boolean;
  onToggleHideObstacles?: () => void;
  onHiddenObstaclesCountChange?: (count: number) => void;
  isFlowAnimating?: boolean;
  onToggleFlowAnimation?: (active?: boolean) => void;
  flowType?: CableFlowType;
  onFlowTypeChange?: (type: CableFlowType) => void;
  flowSpeed?: number;
  onFlowSpeedChange?: (speed: number) => void;
  isAutoRotateActive?: boolean;
  onToggleAutoRotate?: (active?: boolean) => void;
  onCapturePNG?: () => void;
  onShowToast?: (msg: string) => void;
  onRegisterVideoRecorder?: (recorder: {
    start: () => boolean;
    stop: () => void;
    isRecording: () => boolean;
  }) => void;
}

/**
 * Computes the exact 3D world position of a component's electrical pin.
 * If the 3D mesh is already loaded, it uses the scene matrixWorld.
 * If the mesh is still loading asynchronously, it computes the exact transform mathematically
 * from the instance's physical position, rotation, and scale so pins and cables render immediately!
 */
export function computePinWorldPosition(
  inst: PhysicalInstance,
  localOffset: [number, number, number],
  mesh?: THREE.Group
): THREE.Vector3 {
  if (mesh) {
    mesh.updateMatrixWorld(true);
    return new THREE.Vector3(...localOffset).applyMatrix4(mesh.matrixWorld);
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
  return new THREE.Vector3(...localOffset).applyMatrix4(mat);
}

export const Viewport3D: React.FC<Viewport3DProps> = ({
  instances,
  cables,
  selectedInstanceId,
  selectedInstanceIds = [],
  selectedPinFullName,
  selectedCableId = null,
  onSelectCable,
  onUpdateCable,
  onAddCableRoutePoint,
  onUpdateCableRoutePoint,
  onDeleteCableRoutePoint,
  onStraightenCable,
  onSwapCableEnds,
  transformMode,
  transformSpace,
  droneOpacity,
  droneWireframe,
  droneVisible,
  droneColor = "#cbd5e1",
  sceneTheme = "dark",
  showPins,
  showCables,
  showGrid,
  cameraViewMode,
  onSelectInstance,
  onSelectPin,
  onUpdateTransform,
  onUpdateMultipleTransforms,
  registerCaptureFn,
  onAssetLoadError,
  reloadTrigger,
  isPlacingPinMode = false,
  placingPinTargetInstanceId = null,
  onAddPinAtPoint,
  onCancelPlacingPinMode,
  focusOnSelectionTrigger,
  onTransformStart,
  cameraViewTrigger = 0,
  isIsolatedView = false,
  onToggleIsolatedView,
  hideObstacles,
  onToggleHideObstacles,
  onHiddenObstaclesCountChange,
  isFlowAnimating = false,
  onToggleFlowAnimation,
  flowType = "all",
  onFlowTypeChange,
  flowSpeed = 1,
  onFlowSpeedChange,
  isAutoRotateActive = false,
  onToggleAutoRotate,
  onCapturePNG,
  onShowToast,
  onRegisterVideoRecorder,
}) => {
  const effectiveIsolate = isIsolatedView || (hideObstacles === true);
  const handleToggleIsolate = onToggleIsolatedView || onToggleHideObstacles;
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const orbitControlsRef = useRef<OrbitControls | null>(null);
  const transformControlsRef = useRef<TransformControls | null>(null);

  // Mesh registries
  const instanceMeshesRef = useRef<Map<string, THREE.Group>>(new Map());
  const hiddenObstructionIdsRef = useRef<Set<string>>(new Set());
  const [hiddenObstaclesCount, setHiddenObstaclesCount] = useState<number>(0);
  const pinMarkersGroupRef = useRef<THREE.Group>(new THREE.Group());
  const cablesGroupRef = useRef<THREE.Group>(new THREE.Group());
  const cableWaypointsGroupRef = useRef<THREE.Group>(new THREE.Group());
  const multiPivotGroupRef = useRef<THREE.Group>(new THREE.Group());
  const gridHelperRef = useRef<THREE.GridHelper | null>(null);

  // Flow animation group & particles registry
  const cableFlowGroupRef = useRef<THREE.Group>(new THREE.Group());
  const flowParticlesRef = useRef<
    Array<{
      mesh: THREE.Mesh;
      auraMesh?: THREE.Mesh;
      curve: THREE.CatmullRomCurve3;
      baseOffset: number;
      speed: number;
      isPower: boolean;
      material: THREE.MeshBasicMaterial | THREE.MeshStandardMaterial;
      auraMaterial?: THREE.MeshBasicMaterial;
      cableId: string;
      sourceInstanceId: string;
      targetInstanceId: string;
      flowDirection?: "forward" | "reverse" | "bidirectional";
    }>
  >([]);
  const cableFlowItemsRef = useRef<
    Array<{
      cableId: string;
      sourceInstanceId: string;
      targetInstanceId: string;
      flowDirection?: "forward" | "reverse" | "bidirectional";
      curve: THREE.CatmullRomCurve3;
      totalLength: number;
      isPower: boolean;
      color: string;
      strandCurves?: THREE.CatmullRomCurve3[];
      cableRadius?: number;
      strandLabels?: string[];
    }>
  >([]);

  // Video recording state & refs
  const [isVideoRecording, setIsVideoRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);

  // Animation sync refs
  const isFlowAnimatingRef = useRef<boolean>(isFlowAnimating);
  isFlowAnimatingRef.current = isFlowAnimating;

  const flowTypeRef = useRef<CableFlowType>(flowType);
  flowTypeRef.current = flowType;

  const flowSpeedRef = useRef<number>(flowSpeed);
  flowSpeedRef.current = flowSpeed;

  const isAutoRotateActiveRef = useRef<boolean>(isAutoRotateActive);
  isAutoRotateActiveRef.current = isAutoRotateActive;

  const showCablesRef = useRef<boolean>(showCables);
  showCablesRef.current = showCables;

  const clockRef = useRef<THREE.Clock>(new THREE.Clock());

  // Active waypoint selection for 3D Gizmo manipulation
  const [selectedWaypointId, setSelectedWaypointId] = useState<string | null>(null);
  const selectedWaypointIdRef = useRef<string | null>(null);
  selectedWaypointIdRef.current = selectedWaypointId;

  const selectedInstanceIdRef = useRef<string | null>(selectedInstanceId);
  selectedInstanceIdRef.current = selectedInstanceId;

  // Synchronization ticker when async 3D meshes are loaded into the scene
  const [meshSyncTicket, setMeshSyncTicket] = useState<number>(0);

  // Selected cable lookup
  const selectedCable = useMemo(() => {
    return cables.find((c) => c.id === selectedCableId) || null;
  }, [cables, selectedCableId]);

  // Cable callbacks refs
  const onSelectCableRef = useRef(onSelectCable);
  onSelectCableRef.current = onSelectCable;
  const onAddCableRoutePointRef = useRef(onAddCableRoutePoint);
  onAddCableRoutePointRef.current = onAddCableRoutePoint;
  const onUpdateCableRoutePointRef = useRef(onUpdateCableRoutePoint);
  onUpdateCableRoutePointRef.current = onUpdateCableRoutePoint;
  const onStraightenCableRef = useRef(onStraightenCable);
  onStraightenCableRef.current = onStraightenCable;
  const selectedCableIdRef = useRef(selectedCableId);
  selectedCableIdRef.current = selectedCableId;

  // Multi-transform dragging tracking
  const initialPivotTransformRef = useRef<{ pos: THREE.Vector3; rot: THREE.Euler } | null>(null);
  const initialMeshesTransformRef = useRef<
    Map<string, { pos: THREE.Vector3; rot: THREE.Euler; scale: THREE.Vector3 }>
  >(new Map());

  // Lighting references for theme synchronization
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const hemiLightRef = useRef<THREE.HemisphereLight | null>(null);
  const dirLight1Ref = useRef<THREE.DirectionalLight | null>(null);
  const dirLight2Ref = useRef<THREE.DirectionalLight | null>(null);

  const [loadingModels, setLoadingModels] = useState<boolean>(true);
  const [modelLoadProgress, setModelLoadProgress] = useState<string>("Avionika 3D modellari yuklanmoqda...");

  // Effective selected IDs list
  const effectiveSelectedIds = useMemo(() => {
    if (selectedInstanceIds && selectedInstanceIds.length > 0) {
      return selectedInstanceIds;
    }
    return selectedInstanceId ? [selectedInstanceId] : [];
  }, [selectedInstanceIds, selectedInstanceId]);

  const effectiveSelectedIdsRef = useRef<string[]>(effectiveSelectedIds);
  const onSelectInstanceRef = useRef(onSelectInstance);
  const rebuildFlowParticlesRef = useRef<(items: any[]) => void>(() => {});
  const onUpdateTransformRef = useRef(onUpdateTransform);
  const onUpdateMultipleTransformsRef = useRef(onUpdateMultipleTransforms);

  useEffect(() => {
    effectiveSelectedIdsRef.current = effectiveSelectedIds;
    onSelectInstanceRef.current = onSelectInstance;
    onUpdateTransformRef.current = onUpdateTransform;
    onUpdateMultipleTransformsRef.current = onUpdateMultipleTransforms;
  }, [effectiveSelectedIds, onSelectInstance, onUpdateTransform, onUpdateMultipleTransforms]);

  // Synchronize pin placement state into refs for pointer handlers
  const isPlacingPinModeRef = useRef<boolean>(isPlacingPinMode);
  const placingPinTargetInstanceIdRef = useRef<string | null>(placingPinTargetInstanceId);
  const onAddPinAtPointRef = useRef(onAddPinAtPoint);
  const onTransformStartRef = useRef(onTransformStart);
  const instancesRef = useRef<PhysicalInstance[]>(instances);

  useEffect(() => {
    isPlacingPinModeRef.current = isPlacingPinMode;
    placingPinTargetInstanceIdRef.current = placingPinTargetInstanceId;
    onAddPinAtPointRef.current = onAddPinAtPoint;
    onTransformStartRef.current = onTransformStart;
  }, [isPlacingPinMode, placingPinTargetInstanceId, onAddPinAtPoint, onTransformStart]);

  useEffect(() => {
    instancesRef.current = instances;
  }, [instances]);

  // Initialize Three.js scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const initialTheme = SCENE_THEMES[sceneTheme] || SCENE_THEMES.dark;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(initialTheme.bgColor);
    scene.fog = new THREE.FogExp2(initialTheme.fogColor, initialTheme.fogDensity);
    sceneRef.current = scene;

    // Camera (Isometric perspective setup)
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 60000);
    camera.position.set(2200, 1600, 2400);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Orbit Controls (Unrestricted scroll zoom, smooth navigation)
    const orbitControls = new OrbitControls(camera, renderer.domElement);
    orbitControls.enableDamping = false;
    orbitControls.maxDistance = 60000;
    orbitControls.minDistance = 0.1; // Allows zooming as close as desired!
    orbitControls.zoomSpeed = 1.2;
    orbitControls.target.set(0, 0, 0);
    orbitControlsRef.current = orbitControls;

    // Multi-selection pivot container
    const multiPivot = multiPivotGroupRef.current;
    multiPivot.name = "multi_selection_pivot";
    scene.add(multiPivot);

    // Transform Controls
    const transformControls = new TransformControls(camera, renderer.domElement);
    transformControls.size = 0.85;
    transformControls.setSpace(transformSpace);
    transformControls.setMode(transformMode);
    scene.add(transformControls.getHelper());
    transformControlsRef.current = transformControls;

    transformControls.addEventListener("dragging-changed", (event) => {
      orbitControls.enabled = !event.value;

      if (event.value) {
        // Dragging started: record snapshot for Undo (Ctrl+Z)
        onTransformStartRef.current?.();

        // Dragging started: record baseline positions for multi-selection
        const pivot = multiPivotGroupRef.current;
        initialPivotTransformRef.current = {
          pos: pivot.position.clone(),
          rot: pivot.rotation.clone(),
        };

        const map = new Map<string, { pos: THREE.Vector3; rot: THREE.Euler; scale: THREE.Vector3 }>();
        effectiveSelectedIdsRef.current.forEach((id) => {
          const m = instanceMeshesRef.current.get(id);
          if (m) {
            map.set(id, {
              pos: m.position.clone(),
              rot: m.rotation.clone(),
              scale: m.scale.clone(),
            });
          }
        });
        initialMeshesTransformRef.current = map;
      } else {
        // Dragging ended: if multi-selection was transformed, commit final positions
        if (effectiveSelectedIdsRef.current.length > 1) {
          const updates: Array<{
            instanceId: string;
            position: [number, number, number];
            rotation: [number, number, number];
            scale: [number, number, number];
          }> = [];

          effectiveSelectedIdsRef.current.forEach((id) => {
            const m = instanceMeshesRef.current.get(id);
            if (m) {
              updates.push({
                instanceId: id,
                position: [
                  Math.round(m.position.x * 10) / 10,
                  Math.round(m.position.y * 10) / 10,
                  Math.round(m.position.z * 10) / 10,
                ],
                rotation: [
                  Math.round(THREE.MathUtils.radToDeg(m.rotation.x) * 10) / 10,
                  Math.round(THREE.MathUtils.radToDeg(m.rotation.y) * 10) / 10,
                  Math.round(THREE.MathUtils.radToDeg(m.rotation.z) * 10) / 10,
                ],
                scale: [
                  Math.round(m.scale.x * 100) / 100,
                  Math.round(m.scale.y * 100) / 100,
                  Math.round(m.scale.z * 100) / 100,
                ],
              });
            }
          });

          if (updates.length > 0) {
            onUpdateMultipleTransformsRef.current?.(updates);
          }
        }
      }
    });

    transformControls.addEventListener("objectChange", () => {
      const obj = transformControls.object;
      if (!obj) return;

      // Case A: Multi-selection pivot group transformed
      if (obj === multiPivotGroupRef.current) {
        const initialPivot = initialPivotTransformRef.current;
        if (!initialPivot) return;

        const deltaP = new THREE.Vector3().subVectors(obj.position, initialPivot.pos);
        const deltaRx = obj.rotation.x - initialPivot.rot.x;
        const deltaRy = obj.rotation.y - initialPivot.rot.y;
        const deltaRz = obj.rotation.z - initialPivot.rot.z;

        const map = initialMeshesTransformRef.current;
        effectiveSelectedIdsRef.current.forEach((id) => {
          const mesh = instanceMeshesRef.current.get(id);
          const init = map.get(id);
          if (mesh && init) {
            mesh.position.copy(init.pos).add(deltaP);
            mesh.rotation.set(init.rot.x + deltaRx, init.rot.y + deltaRy, init.rot.z + deltaRz);
            mesh.updateMatrixWorld(true);
          }
        });
        return;
      }

      // Case B: Single object transformed
      if (obj.userData?.instanceId) {
        const instId = obj.userData.instanceId;
        const pos: [number, number, number] = [
          Math.round(obj.position.x * 10) / 10,
          Math.round(obj.position.y * 10) / 10,
          Math.round(obj.position.z * 10) / 10,
        ];
        const rot: [number, number, number] = [
          Math.round(THREE.MathUtils.radToDeg(obj.rotation.x) * 10) / 10,
          Math.round(THREE.MathUtils.radToDeg(obj.rotation.y) * 10) / 10,
          Math.round(THREE.MathUtils.radToDeg(obj.rotation.z) * 10) / 10,
        ];
        const scale: [number, number, number] = [
          Math.round(obj.scale.x * 100) / 100,
          Math.round(obj.scale.y * 100) / 100,
          Math.round(obj.scale.z * 100) / 100,
        ];

        onUpdateTransformRef.current?.(instId, pos, rot, scale);
        return;
      }

      // Case C: Cable 3D bend waypoint handle transformed!
      if (obj.userData?.isWaypointHandle && obj.userData?.cableId && obj.userData?.waypointId) {
        const cableId = obj.userData.cableId;
        const waypointId = obj.userData.waypointId;
        const coords = {
          x: Math.round(obj.position.x * 10) / 10,
          y: Math.round(obj.position.y * 10) / 10,
          z: Math.round(obj.position.z * 10) / 10,
        };
        onUpdateCableRoutePointRef.current?.(cableId, waypointId, coords);
        return;
      }
    });

    // Lighting (configured from initialTheme)
    const ambientLight = new THREE.AmbientLight(initialTheme.ambientColor, initialTheme.ambientIntensity);
    scene.add(ambientLight);
    ambientLightRef.current = ambientLight;

    const hemiLight = new THREE.HemisphereLight(
      initialTheme.hemiSkyColor,
      initialTheme.hemiGroundColor,
      initialTheme.hemiIntensity
    );
    hemiLight.position.set(0, 500, 0);
    scene.add(hemiLight);
    hemiLightRef.current = hemiLight;

    const dirLight1 = new THREE.DirectionalLight(initialTheme.dir1Color, initialTheme.dir1Intensity);
    dirLight1.position.set(1500, 3000, 1800);
    dirLight1.castShadow = true;
    dirLight1.shadow.mapSize.width = 2048;
    dirLight1.shadow.mapSize.height = 2048;
    dirLight1.shadow.camera.near = 100;
    dirLight1.shadow.camera.far = 10000;
    dirLight1.shadow.camera.left = -2200;
    dirLight1.shadow.camera.right = 2200;
    dirLight1.shadow.camera.top = 2200;
    dirLight1.shadow.camera.bottom = -2200;
    dirLight1.shadow.bias = -0.00005;
    dirLight1.shadow.normalBias = 0.05;
    scene.add(dirLight1);
    dirLight1Ref.current = dirLight1;

    const dirLight2 = new THREE.DirectionalLight(initialTheme.dir2Color, initialTheme.dir2Intensity);
    dirLight2.position.set(-2000, 1000, -2000);
    scene.add(dirLight2);
    dirLight2Ref.current = dirLight2;

    // Millimeter Grid (4000mm x 4000mm with 100mm divisions)
    const grid = new THREE.GridHelper(4000, 40, initialTheme.gridPrimary, initialTheme.gridSecondary);
    grid.position.y = -120;
    grid.visible = showGrid;
    scene.add(grid);
    gridHelperRef.current = grid;

    // Pin markers and Cables containers
    scene.add(pinMarkersGroupRef.current);
    scene.add(cablesGroupRef.current);
    scene.add(cableWaypointsGroupRef.current);
    scene.add(cableFlowGroupRef.current);

    // Register PNG snapshot generator
    registerCaptureFn(() => {
      if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return "";
      rendererRef.current.render(sceneRef.current, cameraRef.current);
      return rendererRef.current.domElement.toDataURL("image/png");
    });

    // Raycaster for mouse click selection (only triggers on true click, NEVER during orbit/rotation drag)
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let pointerDownStart = { x: 0, y: 0, time: 0 };

    const handlePointerDown = (event: MouseEvent) => {
      if (event.button !== 0) return;
      pointerDownStart = { x: event.clientX, y: event.clientY, time: Date.now() };
    };

    const handlePointerUp = (event: MouseEvent) => {
      // Only handle left click on canvas
      if (event.button !== 0 || !container || !cameraRef.current || !sceneRef.current) return;
      if (transformControls.dragging) return;

      // If user moved mouse by more than 5px or held down longer than 500ms, they were orbiting/panning the camera!
      // Do NOT trigger selection or deselect - maintain the camera's zoom and orientation completely undisturbed!
      const dragDist = Math.hypot(event.clientX - pointerDownStart.x, event.clientY - pointerDownStart.y);
      if (dragDist > 5 || Date.now() - pointerDownStart.time > 500) {
        return;
      }

      const isShift = event.shiftKey;

      const rect = container.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, cameraRef.current);

      // If user is in Pin Placing Mode, placing pin directly onto 3D model surface
      if (isPlacingPinModeRef.current) {
        const candidateMeshes: THREE.Object3D[] = [];
        const targetId = placingPinTargetInstanceIdRef.current;
        if (targetId && instanceMeshesRef.current.has(targetId)) {
          candidateMeshes.push(instanceMeshesRef.current.get(targetId)!);
        } else {
          instanceMeshesRef.current.forEach((mesh) => {
            if (mesh.visible) candidateMeshes.push(mesh);
          });
        }

        const hitIntersects = raycaster.intersectObjects(candidateMeshes, true);
        if (hitIntersects.length > 0) {
          const hit = hitIntersects[0];
          let current: THREE.Object3D | null = hit.object;
          while (current && !current.userData?.instanceId && current.parent) {
            current = current.parent;
          }
          const instId = current?.userData?.instanceId || targetId;
          if (instId && instanceMeshesRef.current.has(instId)) {
            const mesh = instanceMeshesRef.current.get(instId)!;
            mesh.updateMatrixWorld(true);
            const localPoint = mesh.worldToLocal(hit.point.clone());
            onAddPinAtPointRef.current?.(instId, [
              Math.round(localPoint.x * 10) / 10,
              Math.round(localPoint.y * 10) / 10,
              Math.round(localPoint.z * 10) / 10,
            ]);
            return;
          }
        }
      }

      // Check if a 3D cable waypoint handle was clicked
      const waypointIntersects = raycaster.intersectObjects(cableWaypointsGroupRef.current.children, true);
      if (waypointIntersects.length > 0) {
        let current: THREE.Object3D | null = waypointIntersects[0].object;
        while (current && !current.userData?.isWaypointHandle && current.parent) {
          current = current.parent;
        }
        if (current?.userData?.isWaypointHandle) {
          onSelectCableRef.current?.(current.userData.cableId);
          setSelectedWaypointId(current.userData.waypointId);
          return;
        }
      }

      // Check if a 3D cable tube was clicked
      const cableIntersects = raycaster.intersectObjects(cablesGroupRef.current.children, true);
      if (cableIntersects.length > 0) {
        const hit = cableIntersects[0];
        let current: THREE.Object3D | null = hit.object;
        while (current && !current.userData?.cableId && current.parent) {
          current = current.parent;
        }
        const cableId = current?.userData?.cableId || hit.object.userData?.cableId;
        const isSticker = Boolean(current?.userData?.isCableSticker || hit.object.userData?.isCableSticker);
        if (cableId) {
          onSelectCableRef.current?.(cableId);
          // If already selected, clicking on the cable tube creates a new bend waypoint at the hit location!
          // (Stickers only select the cable without creating unwanted waypoints)
          if (!isSticker && selectedCableIdRef.current === cableId) {
            onAddCableRoutePointRef.current?.(cableId, {
              x: Math.round(hit.point.x * 10) / 10,
              y: Math.round(hit.point.y * 10) / 10,
              z: Math.round(hit.point.z * 10) / 10,
            });
          }
          return;
        }
      }

      // First check if a pin marker was clicked
      const pinIntersects = raycaster.intersectObjects(pinMarkersGroupRef.current.children, true);
      if (pinIntersects.length > 0) {
        let current: THREE.Object3D | null = pinIntersects[0].object;
        while (current && !current.userData?.pinFullName) {
          current = current.parent;
        }
        if (current?.userData?.pinFullName) {
          onSelectPin(current.userData.pinFullName);
          if (current.userData.instanceId) {
            onSelectInstanceRef.current?.(current.userData.instanceId, isShift);
          }
          onSelectCableRef.current?.(null);
          setSelectedWaypointId(null);
          return;
        }
      }

      // Then check if any component instance was clicked
      const candidateMeshes: THREE.Object3D[] = [];
      instanceMeshesRef.current.forEach((mesh) => {
        if (mesh.visible) candidateMeshes.push(mesh);
      });

      const intersects = raycaster.intersectObjects(candidateMeshes, true);
      if (intersects.length > 0) {
        // Collect all distinct instance hits with raycast distance
        const hitMap = new Map<string, number>();
        for (const hit of intersects) {
          let current: THREE.Object3D | null = hit.object;
          while (current && !current.userData?.instanceId && current.parent) {
            current = current.parent;
          }
          const instId = current?.userData?.instanceId;
          if (instId && !hitMap.has(instId)) {
            hitMap.set(instId, hit.distance);
          }
        }

        if (hitMap.size > 0) {
          const instanceLookup = new Map<string, PhysicalInstance>();
          instancesRef.current.forEach((inst) => instanceLookup.set(inst.instanceId, inst));

          // Selection Priority:
          // 1. Active unlocked equipment inside or on the drone (highest priority)
          // 2. Locked equipment
          // 3. Unlocked drone airframe
          // 4. Locked drone airframe (lowest priority - locked airframe shell never blocks internal items)
          const sortedHits = Array.from(hitMap.entries()).sort(([idA, distA], [idB, distB]) => {
            const instA = instanceLookup.get(idA);
            const instB = instanceLookup.get(idB);
            const isDroneA = instA?.componentId === "01" || instA?.isAirframe;
            const isDroneB = instB?.componentId === "01" || instB?.isAirframe;
            const isLockedA = Boolean(instA?.locked);
            const isLockedB = Boolean(instB?.locked);

            const getPriority = (isDrone: boolean | undefined, isLocked: boolean) => {
              if (!isDrone && !isLocked) return 1;
              if (!isDrone && isLocked) return 2;
              if (isDrone && !isLocked) return 3;
              return 4; // Locked airframe
            };

            const pA = getPriority(isDroneA, isLockedA);
            const pB = getPriority(isDroneB, isLockedB);

            if (pA !== pB) {
              return pA - pB;
            }
            return distA - distB; // If same priority, pick the closest to camera
          });

          const selectedHitId = sortedHits[0][0];
          onSelectInstanceRef.current?.(selectedHitId, isShift);
          onSelectPin(null);
          onSelectCableRef.current?.(null);
          setSelectedWaypointId(null);
          return;
        }
      }

      // Empty space / background clicked
      if (!isShift) {
        onSelectInstanceRef.current?.(null, false);
        onSelectPin(null);
        onSelectCableRef.current?.(null);
        setSelectedWaypointId(null);
      }
    };

    container.addEventListener("pointerdown", handlePointerDown);
    container.addEventListener("pointerup", handlePointerUp);

    // Double-click to center camera orbit pivot onto clicked surface/point for precision zooming,
    // preserving the exact camera zoom distance so it never jumps away!
    const handleDblClick = (event: MouseEvent) => {
      if (!container || !cameraRef.current || !orbitControlsRef.current) return;
      const rect = container.getBoundingClientRect();
      const clickMouse = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
      );
      const clickRay = new THREE.Raycaster();
      clickRay.setFromCamera(clickMouse, cameraRef.current);
      const meshes: THREE.Object3D[] = [];
      instanceMeshesRef.current.forEach((m) => {
        if (m.visible) meshes.push(m);
      });
      const hits = clickRay.intersectObjects(meshes, true);
      if (hits.length > 0) {
        const hitPt = hits[0].point;
        const currentDist = cameraRef.current.position.distanceTo(orbitControlsRef.current.target);
        const dir = cameraRef.current.position.clone().sub(orbitControlsRef.current.target).normalize();
        orbitControlsRef.current.target.copy(hitPt);
        cameraRef.current.position.copy(hitPt).addScaledVector(dir, currentDist);
        orbitControlsRef.current.update();
      }
    };
    container.addEventListener("dblclick", handleDblClick);

    // Resize Observer
    const resizeObserver = new ResizeObserver(() => {
      if (!container || !renderer || !camera) return;
      const newW = container.clientWidth;
      const newH = container.clientHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    });
    resizeObserver.observe(container);

    // Animation Loop
    let animationFrameId: number;
    const vUp = new THREE.Vector3(0, 0, 1);

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (orbitControls) {
        orbitControls.autoRotate = isAutoRotateActiveRef.current;
        orbitControls.autoRotateSpeed = 1.0;
        orbitControls.update();
      }

      // Dynamically scale down near plane when zooming in very close, preventing near-clipping
      if (camera && orbitControls) {
        const dist = camera.position.distanceTo(orbitControls.target);
        if (dist < 25) {
          const adaptiveNear = Math.max(0.01, dist * 0.04);
          if (Math.abs(camera.near - adaptiveNear) > 0.005) {
            camera.near = adaptiveNear;
            camera.updateProjectionMatrix();
          }
        }
      }

      // Dynamic Cable Flow Animation (Energy & Signal Pulses)
      if (
        isFlowAnimatingRef.current &&
        showCablesRef.current
      ) {
        if (flowParticlesRef.current.length === 0 && cableFlowItemsRef.current.length > 0) {
          rebuildFlowParticlesRef.current(cableFlowItemsRef.current);
        }

        if (flowParticlesRef.current.length > 0) {
          cableFlowGroupRef.current.visible = true;
        const time = clockRef.current.getElapsedTime();
        const speedMult = flowSpeedRef.current;
        const particles = flowParticlesRef.current;
        const pLen = particles.length;

        const currentSelIds = effectiveSelectedIdsRef.current || [];
        const hasSelectionPair = currentSelIds.length >= 2;
        const firstSelected = hasSelectionPair ? currentSelIds[0] : null;
        const secondSelected = hasSelectionPair ? currentSelIds[1] : null;

        for (let i = 0; i < pLen; i++) {
          const p = particles[i];

          // Priority rule:
          // "Kabeldagi oqim qaysi element birinchi tanlangan bo'lsa o'sha tomondan ikkinchi tomonga oqsin"
          let isReversed = p.flowDirection === "reverse";

          if (firstSelected && secondSelected) {
            // Agar foydalanuvchi ikkita elementni tanlagan bo'lsa:
            // Birinchi tanlangan elementdan ikkinchi tanlangan elementga qarab oqsin!
            if (
              p.sourceInstanceId === firstSelected &&
              p.targetInstanceId === secondSelected
            ) {
              // 1-tanlangan manba (source), 2-tanlangan manzil (target) -> to'g'ri yo'nalish (source -> target)
              isReversed = false;
            } else if (
              p.sourceInstanceId === secondSelected &&
              p.targetInstanceId === firstSelected
            ) {
              // 1-tanlangan manzil (target), 2-tanlangan manba (source) -> teskari yo'nalish (target -> source)
              // Shu orqali oqim aynan 1-tanlangan elementdan 2-tanlangan elementga qarab oqadi!
              isReversed = true;
            }
          }

          let u: number;
          if (p.flowDirection === "bidirectional") {
            const raw = (time * p.speed * speedMult + p.baseOffset) % 2.0;
            u = raw > 1.0 ? 2.0 - raw : raw;
          } else if (isReversed) {
            // Teskari oqim: target (u=1.0) dan source (u=0.0) ga tomon harakatlanish
            const raw = (p.baseOffset + time * p.speed * speedMult) % 1.0;
            u = 1.0 - raw;
            if (u < 0) u += 1.0;
            if (u > 1.0) u -= 1.0;
          } else {
            // Standart oqim: source (u=0.0) dan target (u=1.0) ga tomon harakatlanish
            u = (p.baseOffset + time * p.speed * speedMult) % 1.0;
          }

          const pt = p.curve.getPointAt(u);
          p.mesh.position.copy(pt);
          if (p.auraMesh) {
            p.auraMesh.position.copy(pt);
          }

          // Align pulse along the curve direction
          const tangent = p.curve.getTangentAt(u);
          if (isReversed) {
            tangent.negate();
          }
          if (Math.abs(vUp.dot(tangent)) > 0.98) {
            p.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
          } else {
            p.mesh.quaternion.setFromUnitVectors(vUp, tangent);
          }
          if (p.auraMesh) {
            p.auraMesh.quaternion.copy(p.mesh.quaternion);
          }

          // Pulsing glow intensity: Power is vivid Red, Signal is vibrant Blue
          if ("emissiveIntensity" in p.material) {
            const pulse = p.isPower
              ? 2.2 + 0.8 * Math.sin(time * 9 + p.baseOffset * 10)
              : 2.5 + 0.7 * Math.sin(time * 14 + p.baseOffset * 15);
            (p.material as THREE.MeshStandardMaterial).emissiveIntensity = pulse;
          }
          if (p.auraMaterial) {
            p.auraMaterial.opacity = p.isPower
              ? 0.36 + 0.14 * Math.sin(time * 9 + p.baseOffset * 10)
              : 0.38 + 0.14 * Math.sin(time * 14 + p.baseOffset * 15);
          }
        }
      }
    } else {
      cableFlowGroupRef.current.visible = false;
    }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      container.removeEventListener("pointerdown", handlePointerDown);
      container.removeEventListener("pointerup", handlePointerUp);
      container.removeEventListener("dblclick", handleDblClick);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Update Transform Controls mode & space
  useEffect(() => {
    if (transformControlsRef.current) {
      transformControlsRef.current.setMode(transformMode);
      transformControlsRef.current.setSpace(transformSpace);
    }
  }, [transformMode, transformSpace]);

  // Update Grid visibility
  useEffect(() => {
    if (gridHelperRef.current) {
      gridHelperRef.current.visible = showGrid;
    }
  }, [showGrid]);

  // Handle Explicit Camera View Switching (Top, Bottom, Front, Back, Left, Right, 3D)
  // This effect ONLY runs when cameraViewMode or cameraViewTrigger changes.
  // It NEVER runs upon selecting, clicking, or dragging an instance!
  useEffect(() => {
    const camera = cameraRef.current;
    const orbit = orbitControlsRef.current;
    if (!camera || !orbit) return;

    // Check if an explicit target is selected at the moment a camera button is pressed
    const targetIds =
      effectiveSelectedIdsRef.current.length > 0
        ? effectiveSelectedIdsRef.current
        : selectedInstanceIdRef.current
        ? [selectedInstanceIdRef.current]
        : [];

    const targetBox = new THREE.Box3();
    let foundTarget = false;
    targetIds.forEach((id) => {
      const mesh = instanceMeshesRef.current.get(id);
      if (mesh) {
        targetBox.expandByObject(mesh);
        foundTarget = true;
      }
    });

    let targetCenter = new THREE.Vector3(0, 0, 0);
    let targetDist = 1200;
    let maxDim = 100;

    if (foundTarget) {
      targetCenter = targetBox.getCenter(new THREE.Vector3());
      const targetSize = targetBox.getSize(new THREE.Vector3());
      maxDim = Math.max(targetSize.x, targetSize.y, targetSize.z, 20);
      targetDist = Math.max(maxDim * 1.8, 80);
    } else {
      // If no component is selected, keep the user's current zoom distance!
      targetCenter = orbit.target.clone();
      const currentDist = camera.position.distanceTo(orbit.target);
      targetDist = Math.max(currentDist, 100);
    }

    switch (cameraViewMode) {
      case "top":
        camera.position.set(targetCenter.x, targetCenter.y + targetDist, targetCenter.z + 0.001);
        camera.up.set(0, 0, -1);
        break;
      case "bottom":
        camera.position.set(targetCenter.x, targetCenter.y - targetDist, targetCenter.z + 0.001);
        camera.up.set(0, 0, 1);
        break;
      case "front":
        camera.position.set(targetCenter.x, targetCenter.y, targetCenter.z + targetDist);
        camera.up.set(0, 1, 0);
        break;
      case "back":
        camera.position.set(targetCenter.x, targetCenter.y, targetCenter.z - targetDist);
        camera.up.set(0, 1, 0);
        break;
      case "left":
        camera.position.set(targetCenter.x - targetDist, targetCenter.y, targetCenter.z);
        camera.up.set(0, 1, 0);
        break;
      case "right":
        camera.position.set(targetCenter.x + targetDist, targetCenter.y, targetCenter.z);
        camera.up.set(0, 1, 0);
        break;
      case "perspective":
      default:
        camera.up.set(0, 1, 0);
        if (foundTarget) {
          camera.position.set(
            targetCenter.x + targetDist * 0.75,
            targetCenter.y + targetDist * 0.6,
            targetCenter.z + targetDist * 0.75
          );
        } else {
          camera.position.set(2200, 1600, 2400);
        }
        break;
    }
    camera.lookAt(targetCenter);
    orbit.target.copy(targetCenter);
    orbit.update();
  }, [cameraViewMode, cameraViewTrigger]);

  // Handle Dedicated Isolated View / Foreground Obstacle Culling
  // Only isolates or hides objects when the user has explicitly turned on the special "Alohida ko'rsatish" button!
  // Simply selecting a model does NOT hide anything - all elements stay visible normally.
  useEffect(() => {
    const camera = cameraRef.current;
    if (!camera) return;

    // 1. If isolated view is NOT active or no target is selected:
    if (!effectiveIsolate || !selectedInstanceId) {
      // Restore any previously hidden instances immediately
      hiddenObstructionIdsRef.current.forEach((instId) => {
        const mesh = instanceMeshesRef.current.get(instId);
        if (mesh) {
          const inst = instances.find((i) => i.instanceId === instId);
          if (inst) {
            const isAirframeInst = inst.isAirframe || inst.componentId === "01";
            mesh.visible = isAirframeInst ? (inst.visible && droneVisible) : inst.visible;
          }
        }
      });
      hiddenObstructionIdsRef.current.clear();
      camera.near = 0.5;
      camera.updateProjectionMatrix();
      setHiddenObstaclesCount(0);
      onHiddenObstaclesCountChange?.(0);
      return;
    }

    // 2. The user pressed the special "Alohida ko'rsatish" button:
    const targetIds =
      effectiveSelectedIdsRef.current.length > 0
        ? effectiveSelectedIdsRef.current
        : [selectedInstanceId];

    const targetBox = new THREE.Box3();
    let foundTarget = false;
    targetIds.forEach((id) => {
      const mesh = instanceMeshesRef.current.get(id);
      if (mesh) {
        targetBox.expandByObject(mesh);
        foundTarget = true;
      }
    });

    if (!foundTarget) return;

    const margin = 20; // lateral tolerance in mm
    const newlyHidden = new Set<string>();

    instances.forEach((inst) => {
      if (!inst.placed) return;
      if (targetIds.includes(inst.instanceId)) return; // Never hide the target itself

      const mesh = instanceMeshesRef.current.get(inst.instanceId);
      if (!mesh) return;

      const isAirframe = inst.isAirframe || inst.componentId === "01";
      const otherBox = new THREE.Box3().setFromObject(mesh);

      let isObstructing = false;

      if (isAirframe) {
        // Airframe always obstructs viewing the internal components in isolated mode
        isObstructing = true;
      } else if (cameraViewMode !== "perspective") {
        // Check if other components stand between camera and target along view direction
        switch (cameraViewMode) {
          case "front": {
            const inFront = otherBox.max.z > targetBox.max.z - 2;
            const overlapX = !(otherBox.max.x < targetBox.min.x - margin || otherBox.min.x > targetBox.max.x + margin);
            const overlapY = !(otherBox.max.y < targetBox.min.y - margin || otherBox.min.y > targetBox.max.y + margin);
            isObstructing = inFront && overlapX && overlapY;
            break;
          }
          case "back": {
            const inFront = otherBox.min.z < targetBox.min.z + 2;
            const overlapX = !(otherBox.max.x < targetBox.min.x - margin || otherBox.min.x > targetBox.max.x + margin);
            const overlapY = !(otherBox.max.y < targetBox.min.y - margin || otherBox.min.y > targetBox.max.y + margin);
            isObstructing = inFront && overlapX && overlapY;
            break;
          }
          case "top": {
            const inFront = otherBox.max.y > targetBox.max.y - 2;
            const overlapX = !(otherBox.max.x < targetBox.min.x - margin || otherBox.min.x > targetBox.max.x + margin);
            const overlapZ = !(otherBox.max.z < targetBox.min.z - margin || otherBox.min.z > targetBox.max.z + margin);
            isObstructing = inFront && overlapX && overlapZ;
            break;
          }
          case "bottom": {
            const inFront = otherBox.min.y < targetBox.min.y + 2;
            const overlapX = !(otherBox.max.x < targetBox.min.x - margin || otherBox.min.x > targetBox.max.x + margin);
            const overlapZ = !(otherBox.max.z < targetBox.min.z - margin || otherBox.min.z > targetBox.max.z + margin);
            isObstructing = inFront && overlapX && overlapZ;
            break;
          }
          case "left": {
            const inFront = otherBox.min.x < targetBox.min.x + 2;
            const overlapY = !(otherBox.max.y < targetBox.min.y - margin || otherBox.min.y > targetBox.max.y + margin);
            const overlapZ = !(otherBox.max.z < targetBox.min.z - margin || otherBox.min.z > targetBox.max.z + margin);
            isObstructing = inFront && overlapY && overlapZ;
            break;
          }
          case "right": {
            const inFront = otherBox.max.x > targetBox.max.x - 2;
            const overlapY = !(otherBox.max.y < targetBox.min.y - margin || otherBox.min.y > targetBox.max.y + margin);
            const overlapZ = !(otherBox.max.z < targetBox.min.z - margin || otherBox.min.z > targetBox.max.z + margin);
            isObstructing = inFront && overlapY && overlapZ;
            break;
          }
        }
      }

      if (isObstructing) {
        mesh.visible = false;
        newlyHidden.add(inst.instanceId);
      }
    });

    hiddenObstructionIdsRef.current = newlyHidden;
    setHiddenObstaclesCount(newlyHidden.size);
    onHiddenObstaclesCountChange?.(newlyHidden.size);
  }, [
    effectiveIsolate,
    selectedInstanceId,
    cameraViewMode,
    instances,
    droneVisible,
  ]);

  // Handle Focus / Frame on Selected Instance(s) [Shortcut: F]
  useEffect(() => {
    if (!focusOnSelectionTrigger) return;
    const camera = cameraRef.current;
    const orbit = orbitControlsRef.current;
    if (!camera || !orbit) return;

    const targetIds =
      effectiveSelectedIdsRef.current.length > 0
        ? effectiveSelectedIdsRef.current
        : selectedInstanceId
        ? [selectedInstanceId]
        : [];

    if (targetIds.length === 0) return;

    const box = new THREE.Box3();
    let found = false;
    targetIds.forEach((id) => {
      const mesh = instanceMeshesRef.current.get(id);
      if (mesh) {
        box.expandByObject(mesh);
        found = true;
      }
    });

    if (!found) return;

    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z, 60);
    const distance = Math.max(maxDim * 2.2, 400);

    orbit.target.copy(center);
    camera.position.set(
      center.x + distance * 0.7,
      center.y + distance * 0.55,
      center.z + distance * 0.7
    );
    camera.lookAt(center);
    orbit.update();
  }, [focusOnSelectionTrigger, selectedInstanceId]);

  // Preload and cache all 20 models on startup for permanent offline readiness
  useEffect(() => {
    let isMounted = true;

    async function initPreload() {
      setLoadingModels(true);
      setModelLoadProgress("3D modellar oflayn xotiraga tayyorlanmoqda...");

      try {
        await modelManager.preloadAllModels((curr, total, name) => {
          if (isMounted) {
            setModelLoadProgress(`Modellar oflayn keshlanmoqda: ${name} (${curr}/${total})`);
          }
        });

        if (isMounted) {
          setModelLoadProgress("Barcha 3D modellar oflayn xotirada tayyor! ✓");
          setTimeout(() => {
            if (isMounted) {
              setLoadingModels(false);
            }
          }, 400);
        }
      } catch (err) {
        console.warn("Preload error:", err);
        if (isMounted) {
          setLoadingModels(false);
        }
      }
    }

    initPreload();

    return () => {
      isMounted = false;
    };
  }, []);

  // Handle explicit reload trigger
  useEffect(() => {
    let isMounted = true;

    async function handleReload() {
      if (!reloadTrigger || reloadTrigger <= 0) return;
      setLoadingModels(true);
      setModelLoadProgress("Kesh tozalanmoqda va modellar yangilanmoqda...");
      try {
        await modelManager.clearCache(true);
        if (sceneRef.current) {
          instanceMeshesRef.current.forEach((mesh) => {
            sceneRef.current?.remove(mesh);
          });
          instanceMeshesRef.current.clear();
        }

        await modelManager.preloadAllModels((curr, total, name) => {
          if (isMounted) {
            setModelLoadProgress(`Model yangilanmoqda: ${name} (${curr}/${total})`);
          }
        });

        if (isMounted) {
          setModelLoadProgress("Barcha 3D modellar yangilandi! ✓");
          setTimeout(() => {
            if (isMounted) setLoadingModels(false);
          }, 350);
        }
      } catch (err: any) {
        console.warn("Reload error:", err);
        if (isMounted) {
          setLoadingModels(false);
        }
      }
    }

    handleReload();

    return () => {
      isMounted = false;
    };
  }, [reloadTrigger]);

  // Synchronize Scene Theme (Background, Fog, Lighting, Grid)
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const theme = SCENE_THEMES[sceneTheme] || SCENE_THEMES.dark;

    if (scene.background instanceof THREE.Color) {
      scene.background.setHex(theme.bgColor);
    }
    if (scene.fog instanceof THREE.FogExp2) {
      scene.fog.color.setHex(theme.fogColor);
      scene.fog.density = theme.fogDensity;
    }

    if (ambientLightRef.current) {
      ambientLightRef.current.color.setHex(theme.ambientColor);
      ambientLightRef.current.intensity = theme.ambientIntensity;
    }
    if (hemiLightRef.current) {
      hemiLightRef.current.color.setHex(theme.hemiSkyColor);
      hemiLightRef.current.groundColor.setHex(theme.hemiGroundColor);
      hemiLightRef.current.intensity = theme.hemiIntensity;
    }
    if (dirLight1Ref.current) {
      dirLight1Ref.current.color.setHex(theme.dir1Color);
      dirLight1Ref.current.intensity = theme.dir1Intensity;
    }
    if (dirLight2Ref.current) {
      dirLight2Ref.current.color.setHex(theme.dir2Color);
      dirLight2Ref.current.intensity = theme.dir2Intensity;
    }

    if (gridHelperRef.current) {
      scene.remove(gridHelperRef.current);
      gridHelperRef.current.dispose();
      const newGrid = new THREE.GridHelper(4000, 40, theme.gridPrimary, theme.gridSecondary);
      newGrid.position.y = -120;
      newGrid.visible = showGrid;
      scene.add(newGrid);
      gridHelperRef.current = newGrid;
    }
  }, [sceneTheme, showGrid]);

  // Synchronize Placed Instance Meshes
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    let isMounted = true;
    const currentMeshes = instanceMeshesRef.current;
    const placedInstances = instances.filter((i) => i.placed);
    const placedIds = new Set(placedInstances.map((i) => i.instanceId));

    // Remove unplaced or deleted meshes
    currentMeshes.forEach((mesh, id) => {
      if (!placedIds.has(id)) {
        scene.remove(mesh);
        currentMeshes.delete(id);
      }
    });

    const syncPlacedMeshes = async () => {
      let newlyLoaded = false;

      // Find instances connected to currently selected instance(s)
      const connectedInstanceIds = new Set<string>();
      if (effectiveSelectedIds.length > 0) {
        cables.forEach((c) => {
          if (effectiveSelectedIds.includes(c.sourceInstanceId)) {
            connectedInstanceIds.add(c.targetInstanceId);
          }
          if (effectiveSelectedIds.includes(c.targetInstanceId)) {
            connectedInstanceIds.add(c.sourceInstanceId);
          }
        });
      }
      const hasActiveSelection = effectiveSelectedIds.length > 0;

      // Add or update placed meshes
      for (const inst of placedInstances) {
        let mesh = currentMeshes.get(inst.instanceId);

        // If model version changed or component changed, remove old 3D mesh and re-instantiate
        if (mesh && (mesh.userData.modelVersion !== inst.modelVersion || mesh.userData.componentId !== inst.componentId)) {
          scene.remove(mesh);
          currentMeshes.delete(inst.instanceId);
          mesh = undefined;
        }

        if (!mesh) {
          try {
            // Ensure template is loaded
            await modelManager.loadModelTemplate(inst.componentId);
            if (!isMounted) return;
            mesh = modelManager.createInstanceMesh(inst.componentId, inst.instanceId);
            mesh.userData.modelVersion = inst.modelVersion;
            scene.add(mesh);
            currentMeshes.set(inst.instanceId, mesh);
            newlyLoaded = true;
          } catch (err) {
            console.warn(`Could not spawn instance ${inst.instanceId}:`, err);
            continue;
          }
        }

        // Update transform
        mesh.position.set(inst.position[0], inst.position[1], inst.position[2]);
        mesh.rotation.set(
          THREE.MathUtils.degToRad(inst.rotation[0]),
          THREE.MathUtils.degToRad(inst.rotation[1]),
          THREE.MathUtils.degToRad(inst.rotation[2])
        );
        mesh.scale.set(inst.scale[0], inst.scale[1], inst.scale[2]);
        mesh.updateMatrixWorld(true);

        const isObstructionHidden = hiddenObstructionIdsRef.current.has(inst.instanceId);
        const isAirframeInst = inst.isAirframe || inst.componentId === "01";
        const isSelected = effectiveSelectedIds.includes(inst.instanceId);
        const isConnected = connectedInstanceIds.has(inst.instanceId);
        const isDimmed = hasActiveSelection && !isAirframeInst && !isSelected && !isConnected;

        mesh.visible = isObstructionHidden ? false : (isAirframeInst ? (inst.visible && droneVisible) : inst.visible);

        mesh.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const meshObj = child as THREE.Mesh;
            if (meshObj.geometry && (!meshObj.geometry.attributes.normal || meshObj.geometry.attributes.normal.count === 0)) {
              meshObj.geometry.computeVertexNormals();
            }
            const mats = Array.isArray(meshObj.material) ? meshObj.material : [meshObj.material];
            mats.forEach((mat) => {
              if (!mat) return;
              const stdMat = mat as THREE.MeshStandardMaterial;
              if (stdMat.color) {
                if (isAirframeInst) {
                  if (inst.customColor) {
                    stdMat.color.set(inst.customColor);
                  } else if (droneColor && droneColor !== "original" && droneColor !== "#cbd5e1") {
                    stdMat.color.set(droneColor);
                  } else {
                    // Authentic original drone colors (fuselage navy, wings blue, tail accents)
                    if (stdMat.vertexColors || stdMat.userData?.hasVertexColors || meshObj.geometry?.attributes?.color) {
                      stdMat.vertexColors = true;
                      stdMat.color.setHex(0xffffff);
                    } else if (stdMat.userData?.origColor !== undefined) {
                      stdMat.color.setHex(stdMat.userData.origColor);
                    }
                  }
                } else if (isDimmed) {
                  // User request: non-connected elements gray and faded into background
                  stdMat.color.setHex(0x334155);
                } else {
                  if (inst.customColor) {
                    stdMat.color.set(inst.customColor);
                  } else if (stdMat.userData?.origColor !== undefined) {
                    stdMat.color.setHex(stdMat.userData.origColor);
                  }
                }
              }

              if (isAirframeInst) {
                stdMat.opacity = droneOpacity;
                stdMat.transparent = droneOpacity < 0.99;
                stdMat.wireframe = droneWireframe;
                stdMat.side = THREE.DoubleSide;
                stdMat.roughness = 0.35;
                stdMat.metalness = 0.08;
                stdMat.depthWrite = true;
              } else if (isDimmed) {
                // Ghosted gray element that visually fades out of view
                stdMat.opacity = 0.07;
                stdMat.transparent = true;
                stdMat.depthWrite = false;
              } else {
                stdMat.opacity = 1.0;
                stdMat.transparent = false;
                stdMat.depthWrite = true;
              }

              stdMat.needsUpdate = true;

              if (stdMat.emissive) {
                if (isSelected) {
                  stdMat.emissive.setHex(0x0088cc);
                  stdMat.emissiveIntensity = 0.55;
                } else if (isConnected) {
                  // Connected companion element: distinct bright emerald glow
                  stdMat.emissive.setHex(0x00d26a);
                  stdMat.emissiveIntensity = 0.45;
                } else {
                  stdMat.emissive.setHex(0x000000);
                  stdMat.emissiveIntensity = 0;
                }
              }
            });
          }
        });
      }

      // Attach TransformControls to selected instance or multi-selection pivot
      const tc = transformControlsRef.current;
      if (tc && isMounted) {
        if (selectedCableId && selectedWaypointId) {
          // Active waypoint handle attachment is handled in cable synchronization effect
        } else if (effectiveSelectedIds.length === 1) {
          const singleId = effectiveSelectedIds[0];
          if (currentMeshes.has(singleId)) {
            const selectedMesh = currentMeshes.get(singleId)!;
            const instData = instances.find((i) => i.instanceId === singleId);
            if (instData?.locked) {
              tc.detach();
            } else {
              tc.attach(selectedMesh);
            }
          } else {
            tc.detach();
          }
        } else if (effectiveSelectedIds.length > 1) {
          // Multi-selection: calculate center of unlocked active meshes
          const activeIds = effectiveSelectedIds.filter((id: string) => {
            const inst = instances.find((i) => i.instanceId === id);
            return inst && !inst.locked && currentMeshes.has(id);
          });

          if (activeIds.length > 0) {
            const center = new THREE.Vector3();
            activeIds.forEach((id: string) => {
              const m = currentMeshes.get(id)!;
              center.add(m.position);
            });
            center.divideScalar(activeIds.length);

            const pivot = multiPivotGroupRef.current;
            pivot.position.copy(center);
            pivot.rotation.set(0, 0, 0);
            pivot.scale.set(1, 1, 1);
            pivot.updateMatrixWorld(true);
            tc.attach(pivot);
          } else {
            tc.detach();
          }
        } else {
          tc.detach();
        }
      }

      if (isMounted && newlyLoaded) {
        setMeshSyncTicket((t) => t + 1);
      }
    };

    syncPlacedMeshes();

    return () => {
      isMounted = false;
    };
  }, [instances, cables, effectiveSelectedIds, droneColor, droneOpacity, droneWireframe, droneVisible, selectedCableId, selectedWaypointId]);

  // Synchronize 3D Pin Markers
  useEffect(() => {
    const pinGroup = pinMarkersGroupRef.current;
    pinGroup.clear();

    if (!showPins) return;

    const placedInstances = instances.filter((i) => i.placed && i.visible);

    placedInstances.forEach((inst) => {
      // Only render user-defined pins. No automatic dummy pins!
      const pins: PinDefinition[] = inst.customPins || [];
      if (pins.length === 0) return;
      const instMesh = instanceMeshesRef.current.get(inst.instanceId);

      pins.forEach((pin) => {
        const isSelected = selectedPinFullName === pin.fullName;

        // Create realistic precision miniature electronics pin header
        const marker = new THREE.Group();
        marker.userData = {
          pinFullName: pin.fullName,
          instanceId: inst.instanceId,
          pin,
        };

        // Pin color according to electrical type
        let pinColor = 0x00e5ff;
        if (pin.type === "power") pinColor = 0xef4444;
        else if (pin.type === "gnd") pinColor = 0x334155;
        else if (pin.type === "can") pinColor = 0x10b981;
        else if (pin.type === "pwm") pinColor = 0xf59e0b;
        else if (pin.type === "uart") pinColor = 0xf97316;
        else if (pin.type === "ethernet") pinColor = 0x06b6d4;
        else if (pin.type === "usb") pinColor = 0xa855f7;

        // 1. Base Solder Pad (radius 0.9mm, height 0.3mm)
        const padGeo = new THREE.CylinderGeometry(0.9, 0.9, 0.3, 12);
        const padMat = new THREE.MeshStandardMaterial({
          color: 0x64748b, // Solder tin pad
          metalness: 0.8,
          roughness: 0.3,
        });
        const padMesh = new THREE.Mesh(padGeo, padMat);
        padMesh.position.y = 0.15;
        marker.add(padMesh);

        // 2. Miniature Gold Pin Post (radius 0.45mm, height 1.6mm)
        const postGeo = new THREE.CylinderGeometry(0.45, 0.45, 1.6, 12);
        const postMat = new THREE.MeshStandardMaterial({
          color: 0xd4af37, // Gold plated connector pin
          metalness: 0.9,
          roughness: 0.15,
        });
        const postMesh = new THREE.Mesh(postGeo, postMat);
        postMesh.position.y = 0.95;
        marker.add(postMesh);

        // 3. Precision functional tip dot (radius 0.65mm)
        const tipGeo = new THREE.SphereGeometry(0.65, 12, 12);
        const tipMat = new THREE.MeshStandardMaterial({
          color: pinColor,
          emissive: pinColor,
          emissiveIntensity: isSelected ? 1.0 : 0.45,
          metalness: 0.4,
          roughness: 0.2,
        });
        const tipMesh = new THREE.Mesh(tipGeo, tipMat);
        tipMesh.position.y = 1.75;
        marker.add(tipMesh);

        // 4. Subtle selection halo (delicate micro-reticle)
        if (isSelected) {
          const selRingGeo = new THREE.RingGeometry(1.4, 1.8, 24);
          const selRingMat = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.9,
          });
          const selRingMesh = new THREE.Mesh(selRingGeo, selRingMat);
          selRingMesh.rotation.x = Math.PI / 2;
          selRingMesh.position.y = 1.8;
          marker.add(selRingMesh);
        }

        // Compute local position of pin in world coordinates
        marker.position.copy(computePinWorldPosition(inst, pin.localOffset, instMesh));

        pinGroup.add(marker);
      });
    });
  }, [instances, selectedPinFullName, showPins, meshSyncTicket]);

  // Synchronize 3D Cable Spline Meshes & Interactive Waypoint Handles
  useEffect(() => {
    const cablesGroup = cablesGroupRef.current;
    const waypointsGroup = cableWaypointsGroupRef.current;
    cablesGroup.clear();
    waypointsGroup.clear();

    if (!showCables) {
      cableFlowGroupRef.current.clear();
      flowParticlesRef.current = [];
      return;
    }

    const gatheredFlowItems: typeof cableFlowItemsRef.current = [];

    cables.forEach((cable) => {
      const sourceInst = instances.find((i) => i.instanceId === cable.sourceInstanceId && i.placed);
      const targetInst = instances.find((i) => i.instanceId === cable.targetInstanceId && i.placed);
      if (!sourceInst || !targetInst) return;

      const sourceMesh = instanceMeshesRef.current.get(sourceInst.instanceId);
      const targetMesh = instanceMeshesRef.current.get(targetInst.instanceId);

      const sourcePins = (sourceInst.customPins && sourceInst.customPins.length > 0)
        ? sourceInst.customPins
        : (COMPONENT_PINS[sourceInst.componentId] || []);
      const targetPins = (targetInst.customPins && targetInst.customPins.length > 0)
        ? targetInst.customPins
        : (COMPONENT_PINS[targetInst.componentId] || []);

      const sPin = sourcePins.find((p) => p.fullName === cable.sourcePinName);
      const tPin = targetPins.find((p) => p.fullName === cable.targetPinName);

      const sOffset: [number, number, number] = sPin ? sPin.localOffset : [0, 0, 0];
      const tOffset: [number, number, number] = tPin ? tPin.localOffset : [0, 0, 0];

      const p1 = computePinWorldPosition(sourceInst, sOffset, sourceMesh);
      const p2 = computePinWorldPosition(targetInst, tOffset, targetMesh);

      const isSelectedCable = cable.id === selectedCableId;
      const isCableConnectedToSelection =
        effectiveSelectedIds.length > 0 &&
        (effectiveSelectedIds.includes(cable.sourceInstanceId) ||
         effectiveSelectedIds.includes(cable.targetInstanceId));
      const isCableDimmed =
        effectiveSelectedIds.length > 0 && !isCableConnectedToSelection;
      const distance = p1.distanceTo(p2);

      // Build spline control points
      const controlPoints: THREE.Vector3[] = [p1];

      if (cable.routePoints && cable.routePoints.length > 0) {
        cable.routePoints.forEach((pt) => {
          controlPoints.push(new THREE.Vector3(pt.x, pt.y, pt.z));
        });
      } else {
        // Natural wire sag proportional to distance + user-defined slack
        const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
        const naturalSag = Math.min(distance * 0.12, 80);
        const extraSlack = cable.slackMm || 0;
        mid.y -= (naturalSag + extraSlack);
        controlPoints.push(mid);
      }

      controlPoints.push(p2);

      const tension = cable.curveTension !== undefined ? cable.curveTension : 0.5;
      const curve = new THREE.CatmullRomCurve3(controlPoints, false, "catmullrom", tension);
      const totalLength = Math.round(curve.getLength());
      cable.calculatedLengthMm = totalLength;

      const isRibbonCable = Boolean(cable.isRibbon && (cable.strandCount || 0) > 1);
      const strandCount = isRibbonCable ? (cable.strandCount || 3) : 1;
      const strandColors =
        cable.strandColors && cable.strandColors.length >= strandCount
          ? cable.strandColors
          : isRibbonCable
          ? getDefaultStrandColors(cable.cableType, strandCount)
          : [cable.color || "#00e5ff"];

      if (isRibbonCable && strandCount > 1) {
        // Render 3D Ribbon / Flat Multi-Strand Cable with distinct strand colors
        const numDivisions = Math.max(48, controlPoints.length * 20);
        const frenetFrames = curve.computeFrenetFrames(numDivisions, false);
        const pitch = cable.strandPitchMm || Math.max(1.4, (cable.thicknessMm || 2.8) * 0.7);
        const strandRadius =
          Math.max(0.65, (cable.thicknessMm || 2.8) * 0.38) * (isSelectedCable ? 1.2 : 1.0);

        const ribbonGroup = new THREE.Group();
        ribbonGroup.name = `cable_ribbon_${cable.id}`;
        ribbonGroup.userData = { cableId: cable.id, isCableMesh: true };

        const strandCurves: THREE.CatmullRomCurve3[] = [];

        for (let sIdx = 0; sIdx < strandCount; sIdx++) {
          const rawOffset = (sIdx - (strandCount - 1) / 2) * pitch;
          const strandPts: THREE.Vector3[] = [];

          for (let step = 0; step <= numDivisions; step++) {
            const u = step / numDivisions;
            const pt = curve.getPointAt(u);
            const binormal = frenetFrames.binormals[step] || new THREE.Vector3(0, 1, 0);
            // Smooth taper at pin connections (so wires meet cleanly at the pin)
            const endTaper = Math.min(1, Math.min(u, 1 - u) * 7);
            const effectiveOffset = rawOffset * (0.35 + 0.65 * endTaper);

            const strandPoint = pt.clone().addScaledVector(binormal, effectiveOffset);
            strandPts.push(strandPoint);
          }

          const strandCurve = new THREE.CatmullRomCurve3(strandPts, false, "catmullrom", tension);
          strandCurves.push(strandCurve);

          const strandGeo = new THREE.TubeGeometry(
            strandCurve,
            Math.floor(numDivisions * 0.8),
            strandRadius,
            6,
            false
          );
          const strandColorHex = strandColors[sIdx] || cable.color || "#00e5ff";

          const strandMat = new THREE.MeshStandardMaterial({
            color: isCableDimmed ? 0x334155 : (isSelectedCable ? 0x38bdf8 : strandColorHex),
            roughness: 0.35,
            metalness: 0.25,
            opacity: isCableDimmed ? 0.12 : 1.0,
            transparent: isCableDimmed,
            depthWrite: !isCableDimmed,
            emissive: isCableDimmed ? 0x000000 : (isSelectedCable ? 0x0284c7 : strandColorHex),
            emissiveIntensity: isCableDimmed ? 0 : (isSelectedCable ? 0.45 : 0.15),
          });

          const strandMesh = new THREE.Mesh(strandGeo, strandMat);
          strandMesh.name = `cable_${cable.id}_strand_${sIdx}`;
          strandMesh.userData = { cableId: cable.id, isCableMesh: true, strandIndex: sIdx };
          ribbonGroup.add(strandMesh);
        }

        cablesGroup.add(ribbonGroup);

        if (!isCableDimmed) {
          gatheredFlowItems.push({
            cableId: cable.id,
            sourceInstanceId: cable.sourceInstanceId,
            targetInstanceId: cable.targetInstanceId,
            flowDirection: cable.flowDirection || "forward",
            curve,
            totalLength,
            isPower: isCablePower(cable),
            color: cable.color || "#00e5ff",
            strandCurves,
            cableRadius: strandRadius,
            strandLabels: cable.strandLabels,
          });
        }
      } else {
        // Standard single round cable
        const tubularSegments = Math.max(32, controlPoints.length * 16);
        const radius = isSelectedCable
          ? ((cable.thicknessMm || 3.0) / 2) * 1.25
          : (cable.thicknessMm || 2.8) / 2;

        const tubeGeometry = new THREE.TubeGeometry(curve, tubularSegments, radius, 8, false);
        const tubeMaterial = new THREE.MeshStandardMaterial({
          color: isCableDimmed ? 0x334155 : (isSelectedCable ? 0x38bdf8 : (cable.color || 0x00e5ff)),
          roughness: 0.35,
          metalness: 0.25,
          opacity: isCableDimmed ? 0.12 : 1.0,
          transparent: isCableDimmed,
          depthWrite: !isCableDimmed,
          emissive: isCableDimmed ? 0x000000 : (isSelectedCable ? 0x0284c7 : (cable.color || 0x00e5ff)),
          emissiveIntensity: isCableDimmed ? 0 : (isSelectedCable ? 0.45 : 0.15),
        });

        const cableMesh = new THREE.Mesh(tubeGeometry, tubeMaterial);
        cableMesh.name = `cable_${cable.id}`;
        cableMesh.userData = { cableId: cable.id, isCableMesh: true };
        cablesGroup.add(cableMesh);

        if (!isCableDimmed) {
          gatheredFlowItems.push({
            cableId: cable.id,
            sourceInstanceId: cable.sourceInstanceId,
            targetInstanceId: cable.targetInstanceId,
            flowDirection: cable.flowDirection || "forward",
            curve,
            totalLength,
            isPower: isCablePower(cable),
            color: cable.color || "#00e5ff",
            cableRadius: radius,
          });
        }
      }

      // Render 3D Cable End Identification Stickers (Uchki Shtikerlar / Markirovka)
      if (!isCableDimmed && cable.endStickers && cable.endStickers.enabled) {
        const stickers = cable.endStickers;
        const totalCurveLength = Math.max(1, totalLength);
        const offsetMm = Math.max(8, Math.min(60, stickers.offsetFromEndMm || 20));

        // Compute normalized u positions along the spline for source (u near 0) and target (u near 1)
        const uSource = Math.min(0.35, offsetMm / totalCurveLength);
        const uTarget = Math.max(0.65, 1 - offsetMm / totalCurveLength);

        const stickerEnds = [
          {
            u: uSource,
            text: stickers.sourceText || cable.sourcePinName || "P1",
            isSource: true,
          },
          {
            u: uTarget,
            text: stickers.targetText || cable.targetPinName || "P2",
            isSource: false,
          },
        ];

        const stickerBg = stickers.bgColor || "#facc15";
        const stickerTextCol = stickers.textColor || "#000000";
        const stickerStyle = stickers.style || "flag";
        const baseCableRadius = (cable.thicknessMm || 2.8) / 2;

        stickerEnds.forEach((end) => {
          if (!end.text) return;

          const point = curve.getPointAt(end.u);
          const tangent = curve.getTangentAt(end.u).normalize();

          const stickerGroup = build3DStickerMesh({
            cableId: cable.id,
            point,
            tangent,
            cableRadius: baseCableRadius,
            text: end.text,
            isSource: end.isSource,
            style: stickerStyle,
            bgColor: stickerBg,
            textColor: stickerTextCol,
            rotationDeg: stickers.rotationDeg !== undefined ? stickers.rotationDeg : (end.isSource ? 0 : 45),
            sizeMm: stickers.sizeMm || 24,
            isSelectedCable,
          });

          cablesGroup.add(stickerGroup);
        });
      }

      // If this cable is selected, render interactive 3D Waypoint Handles
      if (isSelectedCable) {
        if (cable.routePoints && cable.routePoints.length > 0) {
          cable.routePoints.forEach((pt, index) => {
            const isPointSelected = selectedWaypointId === pt.id;
            const handleGroup = new THREE.Group();
            handleGroup.position.set(pt.x, pt.y, pt.z);

            // Glowing Sphere Handle
            const sphereGeo = new THREE.SphereGeometry(isPointSelected ? 7 : 5.5, 16, 16);
            const sphereMat = new THREE.MeshStandardMaterial({
              color: isPointSelected ? 0xfacc15 : 0x38bdf8,
              emissive: isPointSelected ? 0xf59e0b : 0x0284c7,
              emissiveIntensity: isPointSelected ? 0.9 : 0.5,
              metalness: 0.2,
              roughness: 0.2,
            });
            const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
            sphereMesh.userData = {
              isWaypointHandle: true,
              cableId: cable.id,
              waypointId: pt.id,
              waypointIndex: index,
            };
            handleGroup.add(sphereMesh);

            // Ring around handle
            const ringGeo = new THREE.TorusGeometry(isPointSelected ? 11 : 8.5, 1, 8, 24);
            const ringMat = new THREE.MeshBasicMaterial({
              color: isPointSelected ? 0xfef08a : 0x7dd3fc,
              wireframe: true,
            });
            const ringMesh = new THREE.Mesh(ringGeo, ringMat);
            ringMesh.rotation.x = Math.PI / 2;
            handleGroup.add(ringMesh);

            handleGroup.userData = {
              isWaypointHandle: true,
              cableId: cable.id,
              waypointId: pt.id,
              waypointIndex: index,
            };

            waypointsGroup.add(handleGroup);
          });
        }
      }
    });

    // Save flow data and populate particles
    cableFlowItemsRef.current = gatheredFlowItems;
    rebuildFlowParticles(gatheredFlowItems);

    // If an active waypoint handle is selected, attach TransformControls to it!
    const tcInstance = transformControlsRef.current;
    if (tcInstance && selectedCableId && selectedWaypointId) {
      const activeHandle = waypointsGroup.children.find(
        (child) => child.userData?.waypointId === selectedWaypointId
      );
      if (activeHandle) {
        tcInstance.attach(activeHandle);
        tcInstance.setMode("translate");
      }
    }
  }, [cables, instances, showCables, selectedCableId, selectedWaypointId, meshSyncTicket, effectiveSelectedIds]);

  // Rebuild particle meshes based on flowType filter
  const rebuildFlowParticles = (
    items: Array<{
      cableId: string;
      sourceInstanceId: string;
      targetInstanceId: string;
      flowDirection?: "forward" | "reverse" | "bidirectional";
      curve: THREE.CatmullRomCurve3;
      totalLength: number;
      isPower: boolean;
      color: string;
      strandCurves?: THREE.CatmullRomCurve3[];
      cableRadius?: number;
      strandLabels?: string[];
    }>
  ) => {
    const flowGroup = cableFlowGroupRef.current;
    flowGroup.clear();
    flowParticlesRef.current = [];

    if (!items || items.length === 0) return;

    const currentFlowType = flowTypeRef.current;
    // High-polygon smooth sphere for 360-degree roundness and uniform appearance from every camera angle
    const baseSphereGeo = new THREE.SphereGeometry(1, 16, 12);

    items.forEach((item) => {
      const curveLength = Math.max(item.totalLength, 15);
      // Evenly spaced pulse count along length (1 pulse every ~60mm)
      const numPulses = Math.max(1, Math.min(14, Math.round(curveLength / 60)));
      const curvesToAnimate =
        item.strandCurves && item.strandCurves.length > 0
          ? item.strandCurves
          : [item.curve];

      curvesToAnimate.forEach((c, cIdx) => {
        let isStrandPower = item.isPower;
        if (item.strandLabels && item.strandLabels[cIdx]) {
          const lbl = item.strandLabels[cIdx].toLowerCase();
          if (
            lbl.includes("vcc") ||
            lbl.includes("bat") ||
            lbl.includes("5v") ||
            lbl.includes("pwr") ||
            lbl.includes("12v") ||
            lbl.includes("+")
          ) {
            isStrandPower = true;
          } else if (
            lbl.includes("signal") ||
            lbl.includes("tx") ||
            lbl.includes("rx") ||
            lbl.includes("pwm") ||
            lbl.includes("data") ||
            lbl.includes("clk") ||
            lbl.includes("scl") ||
            lbl.includes("sda")
          ) {
            isStrandPower = false;
          }
        }

        // Apply flowType filter
        if (currentFlowType === "power" && !isStrandPower) return;
        if (currentFlowType === "signal" && isStrandPower) return;

        // Radius calculation: must sit visibly outside the cable cylinder on all sides (360°)
        const cableR = item.cableRadius || 1.5;
        const coreRadius = Math.max(cableR * 1.6, cableR + 1.25);
        const auraRadius = Math.max(cableR * 2.3, cableR + 2.35);

        // Core pulse material:
        // Signal: High-intensity electric blue (0x0066ff)
        // Power: High-intensity laser red (0xff0033)
        // depthTest: false guarantees 360-degree visibility from ANY camera angle without occlusion!
        const coreMat = new THREE.MeshBasicMaterial({
          color: isStrandPower ? 0xff0033 : 0x0066ff,
          transparent: true,
          opacity: 0.95,
          depthTest: false, // Fully visible from all sides without being hidden by wire or geometry
          depthWrite: false,
          side: THREE.DoubleSide,
        });

        // Aura glow material:
        // Signal: Luminous cyan-blue aura
        // Power: Luminous bright red aura
        const auraMat = new THREE.MeshBasicMaterial({
          color: isStrandPower ? 0xff2255 : 0x00b4d8,
          transparent: true,
          opacity: 0.48,
          depthTest: false,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
        });

        for (let pIdx = 0; pIdx < numPulses; pIdx++) {
          const coreMesh = new THREE.Mesh(baseSphereGeo, coreMat);
          coreMesh.scale.set(coreRadius, coreRadius, coreRadius * 1.4);
          coreMesh.renderOrder = 999;
          flowGroup.add(coreMesh);

          const auraMesh = new THREE.Mesh(baseSphereGeo, auraMat);
          auraMesh.scale.set(auraRadius, auraRadius, auraRadius * 1.4);
          auraMesh.renderOrder = 998;
          flowGroup.add(auraMesh);

          const baseOffset = pIdx / numPulses + cIdx * 0.07;
          // Constant physical flow speed in mm per second (identical linear speed across short & long cables!)
          const physicalSpeedMmPerSec = isStrandPower ? 95 : 125;
          const speed = physicalSpeedMmPerSec / curveLength;

          flowParticlesRef.current.push({
            mesh: coreMesh,
            auraMesh,
            curve: c,
            baseOffset: baseOffset % 1.0,
            speed,
            isPower: isStrandPower,
            material: coreMat,
            auraMaterial: auraMat,
            cableId: item.cableId,
            sourceInstanceId: item.sourceInstanceId,
            targetInstanceId: item.targetInstanceId,
            flowDirection: item.flowDirection || "forward",
          });
        }
      });
    });

    rebuildFlowParticlesRef.current = rebuildFlowParticles;
  };

  // Keep rebuildFlowParticlesRef up to date
  rebuildFlowParticlesRef.current = rebuildFlowParticles;

  // Re-filter particles when flowType, isFlowAnimating, or showCables changes
  useEffect(() => {
    if (cableFlowItemsRef.current.length > 0) {
      rebuildFlowParticles(cableFlowItemsRef.current);
    }
  }, [flowType, isFlowAnimating, showCables]);

  // Snapshot PNG export
  const handleExportSnapshot = () => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return false;
    try {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
      const dataUrl = rendererRef.current.domElement.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `uav_avionics_3d_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.png`;
      link.click();
      return true;
    } catch (err) {
      console.error("Export PNG snapshot error:", err);
      return false;
    }
  };

  // Video Recording Logic
  const handleStartVideoRecording = () => {
    if (!rendererRef.current) return false;
    const canvas = rendererRef.current.domElement;

    try {
      const stream = (canvas as any).captureStream
        ? (canvas as any).captureStream(30)
        : (canvas as any).mozCaptureStream
        ? (canvas as any).mozCaptureStream(30)
        : null;

      if (!stream) {
        onShowToast?.("Brauzeringiz video yozishni qo‘llab-quvvatlamaydi.");
        return false;
      }

      const mimeCandidates = [
        "video/webm;codecs=vp9",
        "video/webm;codecs=vp8",
        "video/webm",
        "video/mp4",
      ];
      let selectedMime = "";
      for (const cand of mimeCandidates) {
        if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(cand)) {
          selectedMime = cand;
          break;
        }
      }

      recordedChunksRef.current = [];
      const recorder = new MediaRecorder(
        stream,
        selectedMime ? { mimeType: selectedMime, videoBitsPerSecond: 5000000 } : undefined
      );

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        if (recordedChunksRef.current.length === 0) return;
        const mime = selectedMime || "video/webm";
        const blob = new Blob(recordedChunksRef.current, { type: mime });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        const ext = mime.includes("mp4") ? "mp4" : "webm";
        link.download = `uav_avionics_3d_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.${ext}`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        setIsVideoRecording(false);
        setRecordingSeconds(0);
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }
        onShowToast?.("🎥 3D Video muvaffaqiyatli saqlandi va yuklab olindi!");
      };

      recorder.start(250);
      mediaRecorderRef.current = recorder;
      setIsVideoRecording(true);
      setRecordingSeconds(0);

      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 120) {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
              mediaRecorderRef.current.stop();
            }
            return prev;
          }
          return prev + 1;
        });
      }, 1000);

      onShowToast?.("🔴 3D Video yozish boshlandi. Tugatish uchun tugmani qayta bosing.");
      return true;
    } catch (err) {
      console.error("Video recorder start error:", err);
      onShowToast?.("Video yozishni boshlashda xatolik yuz berdi.");
      return false;
    }
  };

  const handleStopVideoRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  };

  const handleToggleVideoRecording = () => {
    if (isVideoRecording) {
      handleStopVideoRecording();
    } else {
      handleStartVideoRecording();
    }
  };

  useEffect(() => {
    onRegisterVideoRecorder?.({
      start: handleStartVideoRecording,
      stop: handleStopVideoRecording,
      isRecording: () => isVideoRecording,
    });
  }, [onRegisterVideoRecorder, isVideoRecording]);

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleCycleSpeed = () => {
    const speeds = [0.5, 1.0, 2.0];
    const currIdx = speeds.indexOf(flowSpeed);
    const nextSpeed = speeds[(currIdx + 1) % speeds.length];
    onFlowSpeedChange?.(nextSpeed);
    onShowToast?.(`⚡ Oqim tezligi: ${nextSpeed}x`);
  };

  return (
    <div
      className={`viewport-3d-container relative ${isPlacingPinMode ? "cursor-crosshair" : ""}`}
      id="main-viewport-container"
      ref={containerRef}
    >
      {/* Floating Selected Cable Bending & Slack HUD */}
      {selectedCable && (
        <div
          id="selected-cable-viewport-hud"
          className="viewport-banner cable-hud"
        >
          <div
            className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm"
            style={{ backgroundColor: selectedCable.color || "#00e5ff" }}
          />
          <span className="font-semibold text-cyan-200 whitespace-nowrap">
            🔌 {selectedCable.name}
          </span>
          <span className="text-slate-400 text-[11px] font-mono whitespace-nowrap">
            Uzunlik: {selectedCable.calculatedLengthMm || 0} mm
            {selectedCable.slackMm ? ` (+${selectedCable.slackMm}mm)` : ""}
          </span>
          <div className="viewport-divider" />
          <button
            type="button"
            onClick={() => onAddCableRoutePoint?.(selectedCable.id)}
            className="viewport-banner-btn primary"
            title="Kabelga yangi 3D burilish nuqtasi qo‘shish"
          >
            + Burilish nuqtasi
          </button>
          <button
            type="button"
            onClick={() => onStraightenCable?.(selectedCable.id)}
            className="viewport-banner-btn"
            title="Barcha burilishlarni o‘chirib to‘g‘rilash"
          >
            Tekislash
          </button>
          {onSwapCableEnds && (
            <button
              type="button"
              onClick={() => onSwapCableEnds(selectedCable.id)}
              className="viewport-banner-btn"
              title="Kabel oqim yo‘nalishini teskarisiga almashtirish (Manba ⇄ Qabul qiluvchi)"
            >
              ⇄ Oqim (A ⇄ B)
            </button>
          )}
          <button
            type="button"
            onClick={() => onSelectCable?.(null)}
            className="viewport-banner-close"
            title="Yopish"
          >
            ✕
          </button>
        </div>
      )}

      {isPlacingPinMode && (
        <div
          id="pin-placing-guide-banner"
          className="viewport-banner pin-guide"
        >
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
          <span className="font-semibold text-amber-200">
            📍 PIN BELGILASH: 3D modeldagi kerakli kontakt yoki port ustiga bosing
          </span>
          {onCancelPlacingPinMode && (
            <button
              type="button"
              id="cancel-pin-placing-mode-btn"
              onClick={onCancelPlacingPinMode}
              className="viewport-banner-btn"
            >
              Tugatish
            </button>
          )}
        </div>
      )}

      {effectiveSelectedIds.length > 1 && !isPlacingPinMode && (
        <div
          id="multi-selection-indicator-banner"
          className="viewport-banner multi-select"
        >
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="font-semibold text-cyan-200">
            {effectiveSelectedIds.length} ta element tanlandi
          </span>
          <span className="text-slate-400 text-[11px]">
            (Shift + Click: birgalikda tanlash / o‘qlarni surish)
          </span>
          <button
            type="button"
            id="btn-clear-multiselection"
            onClick={() => onSelectInstanceRef.current?.(null, false)}
            className="viewport-banner-btn"
          >
            Tozalash
          </button>
        </div>
      )}

      {hiddenObstaclesCount > 0 && effectiveIsolate && (
        <div
          id="obstruction-culling-indicator-banner"
          className="viewport-banner obstruction-banner"
        >
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping flex-shrink-0" />
          <span>
            Model alohida ko‘rsatilmoqda (<strong className="text-amber-300 font-bold">{hiddenObstaclesCount}</strong> ta to‘siq yashirildi)
          </span>
          {handleToggleIsolate && (
            <button
              type="button"
              id="btn-restore-obstructions"
              onClick={handleToggleIsolate}
              className="viewport-banner-btn warning"
              title="Barcha elementlarni qayta ko‘rsatish"
            >
              Barchasini ko‘rsatish
            </button>
          )}
        </div>
      )}

      {/* Floating Video Recording Live Indicator Banner */}
      {isVideoRecording && (
        <div
          id="video-recording-live-pill"
          className="viewport-banner recording-banner"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
          <span className="font-semibold text-rose-100">
            3D Video yozilmoqda: <span className="font-mono">{formatDuration(recordingSeconds)}</span>
          </span>
          <button
            type="button"
            id="btn-stop-recording-pill"
            onClick={handleStopVideoRecording}
            className="viewport-banner-btn danger"
          >
            Saqlash
          </button>
        </div>
      )}

      {loadingModels && (
        <div className="model-loading-overlay" id="viewport-loading-overlay">
          <div className="loading-spinner-ring" />
          <span className="loading-text">{modelLoadProgress}</span>
        </div>
      )}
    </div>
  );
};
