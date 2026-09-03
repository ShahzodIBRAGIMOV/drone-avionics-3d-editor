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
} from "../types";
import { modelManager, COMPONENT_ID_TO_ASSET_KEY } from "../services/modelManager";
import { COMPONENT_PINS } from "../data/pinDefinitions";

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
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const orbitControlsRef = useRef<OrbitControls | null>(null);
  const transformControlsRef = useRef<TransformControls | null>(null);

  // Mesh registries
  const instanceMeshesRef = useRef<Map<string, THREE.Group>>(new Map());
  const pinMarkersGroupRef = useRef<THREE.Group>(new THREE.Group());
  const cablesGroupRef = useRef<THREE.Group>(new THREE.Group());
  const cableWaypointsGroupRef = useRef<THREE.Group>(new THREE.Group());
  const multiPivotGroupRef = useRef<THREE.Group>(new THREE.Group());
  const gridHelperRef = useRef<THREE.GridHelper | null>(null);

  // Active waypoint selection for 3D Gizmo manipulation
  const [selectedWaypointId, setSelectedWaypointId] = useState<string | null>(null);
  const selectedWaypointIdRef = useRef<string | null>(null);
  selectedWaypointIdRef.current = selectedWaypointId;

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
    const camera = new THREE.PerspectiveCamera(45, width / height, 5, 50000);
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

    // Orbit Controls (enableDamping disabled for immediate stop on mouse release)
    const orbitControls = new OrbitControls(camera, renderer.domElement);
    orbitControls.enableDamping = false;
    orbitControls.maxDistance = 15000;
    orbitControls.minDistance = 30;
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

    // Register PNG snapshot generator
    registerCaptureFn(() => {
      if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return "";
      rendererRef.current.render(sceneRef.current, cameraRef.current);
      return rendererRef.current.domElement.toDataURL("image/png");
    });

    // Raycaster for mouse click selection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerDown = (event: MouseEvent) => {
      // Only handle left click on canvas
      if (event.button !== 0 || !container || !cameraRef.current || !sceneRef.current) return;
      if (transformControls.dragging) return;

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
        const cableId = hit.object.userData?.cableId;
        if (cableId) {
          onSelectCableRef.current?.(cableId);
          // If already selected, clicking on the cable tube creates a new bend waypoint at the hit location!
          if (selectedCableIdRef.current === cableId) {
            onAddCableRoutePointRef.current?.(cableId, {
              x: Math.round(hit.point.x * 10) / 10,
              y: Math.round((hit.point.y + 15) * 10) / 10,
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
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      orbitControls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      container.removeEventListener("pointerdown", handlePointerDown);
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

  // Handle Camera View Switching
  useEffect(() => {
    const camera = cameraRef.current;
    const orbit = orbitControlsRef.current;
    if (!camera || !orbit) return;

    const targetDist = 2800;
    const target = orbit.target.clone();

    switch (cameraViewMode) {
      case "top":
        camera.position.set(target.x, target.y + targetDist, target.z + 0.001);
        break;
      case "front":
        camera.position.set(target.x, target.y, target.z + targetDist);
        break;
      case "back":
        camera.position.set(target.x, target.y, target.z - targetDist);
        break;
      case "left":
        camera.position.set(target.x - targetDist, target.y, target.z);
        break;
      case "right":
        camera.position.set(target.x + targetDist, target.y, target.z);
        break;
      case "perspective":
      default:
        camera.position.set(2200, 1600, 2400);
        break;
    }
    camera.lookAt(target);
    orbit.update();
  }, [cameraViewMode]);

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

    // Add or update placed meshes
    placedInstances.forEach(async (inst) => {
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
          mesh = modelManager.createInstanceMesh(inst.componentId, inst.instanceId);
          mesh.userData.modelVersion = inst.modelVersion;
          scene.add(mesh);
          currentMeshes.set(inst.instanceId, mesh);
        } catch (err) {
          console.warn(`Could not spawn instance ${inst.instanceId}:`, err);
          return;
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

      const isAirframeInst = inst.isAirframe || inst.componentId === "01";
      mesh.visible = isAirframeInst ? (inst.visible && droneVisible) : inst.visible;

      // Highlight selected instances with subtle emissive rim and apply custom/drone color
      const isSelected = effectiveSelectedIds.includes(inst.instanceId);
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
            }

            stdMat.needsUpdate = true;

            if (stdMat.emissive) {
              if (isSelected) {
                stdMat.emissive.setHex(0x0088aa);
                stdMat.emissiveIntensity = 0.45;
              } else {
                stdMat.emissive.setHex(0x000000);
                stdMat.emissiveIntensity = 0;
              }
            }
          });
        }
      });
    });

    // Attach TransformControls to selected instance or multi-selection pivot
    const tc = transformControlsRef.current;
    if (tc) {
      if (selectedCableId && selectedWaypointId) {
        // Active waypoint handle attachment is handled in cable synchronization effect
        return;
      }

      if (effectiveSelectedIds.length === 1) {
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
  }, [instances, effectiveSelectedIds, droneColor, droneOpacity, droneWireframe, droneVisible, selectedCableId, selectedWaypointId]);

  // Synchronize 3D Pin Markers
  useEffect(() => {
    const pinGroup = pinMarkersGroupRef.current;
    pinGroup.clear();

    if (!showPins) return;

    const placedInstances = instances.filter((i) => i.placed && i.visible);

    placedInstances.forEach((inst) => {
      // Only render user-defined pins. No automatic dummy pins!
      const pins: PinDefinition[] = inst.customPins || [];
      const instMesh = instanceMeshesRef.current.get(inst.instanceId);
      if (!instMesh || pins.length === 0) return;

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
        const localOffset = new THREE.Vector3(...pin.localOffset);
        localOffset.applyMatrix4(instMesh.matrixWorld);
        marker.position.copy(localOffset);

        pinGroup.add(marker);
      });
    });
  }, [instances, selectedPinFullName, showPins]);

  // Synchronize 3D Cable Spline Meshes & Interactive Waypoint Handles
  useEffect(() => {
    const cablesGroup = cablesGroupRef.current;
    const waypointsGroup = cableWaypointsGroupRef.current;
    cablesGroup.clear();
    waypointsGroup.clear();

    if (!showCables) return;

    cables.forEach((cable) => {
      const sourceInst = instances.find((i) => i.instanceId === cable.sourceInstanceId && i.placed);
      const targetInst = instances.find((i) => i.instanceId === cable.targetInstanceId && i.placed);
      if (!sourceInst || !targetInst) return;

      const sourceMesh = instanceMeshesRef.current.get(sourceInst.instanceId);
      const targetMesh = instanceMeshesRef.current.get(targetInst.instanceId);
      if (!sourceMesh || !targetMesh) return;

      const sourcePins = (sourceInst.customPins && sourceInst.customPins.length > 0)
        ? sourceInst.customPins
        : (COMPONENT_PINS[sourceInst.componentId] || []);
      const targetPins = (targetInst.customPins && targetInst.customPins.length > 0)
        ? targetInst.customPins
        : (COMPONENT_PINS[targetInst.componentId] || []);

      const sPin = sourcePins.find((p) => p.fullName === cable.sourcePinName);
      const tPin = targetPins.find((p) => p.fullName === cable.targetPinName);

      const p1 = sPin ? new THREE.Vector3(...sPin.localOffset) : new THREE.Vector3(0, 0, 0);
      const p2 = tPin ? new THREE.Vector3(...tPin.localOffset) : new THREE.Vector3(0, 0, 0);

      p1.applyMatrix4(sourceMesh.matrixWorld);
      p2.applyMatrix4(targetMesh.matrixWorld);

      const isSelectedCable = cable.id === selectedCableId;
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

      const tubularSegments = Math.max(32, controlPoints.length * 16);
      const radius = isSelectedCable
        ? ((cable.thicknessMm || 3.0) / 2) * 1.25
        : (cable.thicknessMm || 2.8) / 2;

      const tubeGeometry = new THREE.TubeGeometry(curve, tubularSegments, radius, 8, false);
      const tubeMaterial = new THREE.MeshStandardMaterial({
        color: isSelectedCable ? 0x38bdf8 : (cable.color || 0x00e5ff),
        roughness: 0.35,
        metalness: 0.25,
        emissive: isSelectedCable ? 0x0284c7 : (cable.color || 0x00e5ff),
        emissiveIntensity: isSelectedCable ? 0.45 : 0.15,
      });

      const cableMesh = new THREE.Mesh(tubeGeometry, tubeMaterial);
      cableMesh.name = `cable_${cable.id}`;
      cableMesh.userData = { cableId: cable.id, isCableMesh: true };
      cablesGroup.add(cableMesh);

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
  }, [cables, instances, showCables, selectedCableId, selectedWaypointId]);

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
          className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2.5 px-4 py-2 bg-slate-900/95 border border-cyan-500/50 rounded-xl shadow-2xl backdrop-blur-md text-white text-xs select-none pointer-events-auto max-w-[90vw] overflow-x-auto"
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
          <div className="h-3 w-[1px] bg-slate-700 mx-1 flex-shrink-0" />
          <button
            type="button"
            onClick={() => onAddCableRoutePoint?.(selectedCable.id)}
            className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-medium text-[11px] flex items-center gap-1 transition-colors whitespace-nowrap cursor-pointer"
            title="Kabelga yangi 3D burilish nuqtasi qo‘shish"
          >
            + Burilish nuqtasi
          </button>
          <button
            type="button"
            onClick={() => onStraightenCable?.(selectedCable.id)}
            className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white rounded text-[11px] transition-colors whitespace-nowrap cursor-pointer"
            title="Barcha burilishlarni o‘chirib to‘g‘rilash"
          >
            Tekislash
          </button>
          <button
            type="button"
            onClick={() => onSelectCable?.(null)}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-white/10 text-xs ml-1 flex-shrink-0 cursor-pointer"
            title="Yopish"
          >
            ✕
          </button>
        </div>
      )}

      {isPlacingPinMode && (
        <div
          id="pin-placing-guide-banner"
          className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-4 py-2.5 bg-slate-900/90 border border-amber-400/50 rounded-xl shadow-2xl backdrop-blur-md text-white text-xs select-none pointer-events-auto"
        >
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
          <span className="font-semibold text-amber-200">
            📍 PIN BELGILASH: 3D modeldagi kerakli kontakt yoki port ustiga bosing
          </span>
          {onCancelPlacingPinMode && (
            <button
              id="cancel-pin-placing-mode-btn"
              onClick={onCancelPlacingPinMode}
              className="ml-2 px-2.5 py-1 bg-white/10 hover:bg-white/20 border border-white/20 rounded-md text-slate-200 hover:text-white transition-all text-[11px]"
            >
              Tugatish
            </button>
          )}
        </div>
      )}

      {effectiveSelectedIds.length > 1 && !isPlacingPinMode && (
        <div
          id="multi-selection-indicator-banner"
          className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2.5 px-4 py-2 bg-slate-900/90 border border-cyan-500/40 rounded-xl shadow-2xl backdrop-blur-md text-white text-xs select-none pointer-events-auto"
        >
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="font-semibold text-cyan-200">
            {effectiveSelectedIds.length} ta element tanlandi
          </span>
          <span className="text-slate-400 text-[11px]">
            (Shift + Click: birgalikda tanlash / o‘qlarni surish)
          </span>
          <button
            id="btn-clear-multiselection"
            onClick={() => onSelectInstanceRef.current?.(null, false)}
            className="ml-2 px-2 py-0.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded text-slate-300 hover:text-white transition-all text-[11px]"
          >
            Tozalash
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
