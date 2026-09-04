import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  ComponentManifestItem,
  PhysicalInstance,
  CableConnection,
  CableRoutePoint,
  TransformMode,
  TransformSpace,
  CameraViewMode,
  PinDefinition,
  SceneTheme,
  CableFlowType,
} from "./types";
import {
  computeDroneRelativeTransform,
  propagateDroneMovement,
} from "./services/droneAttachment";
import {
  SERVO_INSTANCES_CONFIG,
  MOTOR_INSTANCES_CONFIG,
  ESC_INSTANCES_CONFIG,
  PROPELLER_INSTANCES_CONFIG,
  LED_INSTANCES_CONFIG,
  UBEC_INSTANCES_CONFIG,
} from "./data/servoLabels";
import { COMPONENT_PINS } from "./data/pinDefinitions";
import { HeaderBar } from "./components/HeaderBar";
import { UnplacedInventoryPanel } from "./components/UnplacedInventoryPanel";
import { PlacedInspectorPanel } from "./components/PlacedInspectorPanel";
import { Viewport3D, computePinWorldPosition } from "./components/Viewport3D";
import * as THREE from "three";
import { CameraViewControls } from "./components/CameraViewControls";
import { ViewportQuickTools } from "./components/ViewportQuickTools";
import { CableConnectModal } from "./components/CableConnectModal";
import { KeyboardShortcutsModal } from "./components/KeyboardShortcutsModal";
import { ModelImportModal } from "./components/ModelImportModal";
import { CloudSyncModal } from "./components/CloudSyncModal";
import { CloudProjectData } from "./types";
import {
  saveProjectToCloud,
  loadProjectFromCloud,
  subscribeToMainProject,
} from "./services/cloudProjectService";
import { AlertTriangle, CheckCircle2, PanelLeft, PanelRight, Undo2, Redo2, Keyboard } from "lucide-react";
import { modelManager } from "./services/modelManager";

const STORAGE_KEY = "drone_avionics_state_v1";

interface HistorySnapshot {
  instances: PhysicalInstance[];
  cables: CableConnection[];
  selectedInstanceIds: string[];
  description: string;
}

// Helper to generate default 32 physical instances from manifest
function generateInitialInstances(manifest: ComponentManifestItem[]): PhysicalInstance[] {
  const list: PhysicalInstance[] = [];

  manifest.forEach((item) => {
    const qty = Number(item.quantity) || 1;
    for (let i = 1; i <= qty; i++) {
      const instanceId = `${item.id}-${i}`;
      let customLabel = `${item.component} #${i}`;
      let defaultPos: [number, number, number] = [0, 0, 0];
      let defaultRot: [number, number, number] = [0, 0, 0];

      if (item.id === "01") {
        customLabel = "Dron korpusi (Airframe 3800mm)";
        defaultPos = [0, 0, 0];
      } else if (item.id === "12") {
        const servoCfg = SERVO_INSTANCES_CONFIG.find((s) => s.index === i);
        if (servoCfg) {
          customLabel = servoCfg.label;
          defaultPos = servoCfg.defaultPosMm;
          if (servoCfg.defaultRotRad) {
            defaultRot = servoCfg.defaultRotRad;
          }
        }
      } else if (item.id === "10") {
        const motorCfg = MOTOR_INSTANCES_CONFIG.find((m) => m.index === i);
        if (motorCfg) {
          customLabel = motorCfg.label;
          defaultPos = motorCfg.defaultPosMm;
        }
      } else if (item.id === "11") {
        const escCfg = ESC_INSTANCES_CONFIG.find((e) => e.index === i);
        if (escCfg) {
          customLabel = escCfg.label;
          defaultPos = escCfg.defaultPosMm;
        }
      } else if (item.id === "17") {
        const propCfg = PROPELLER_INSTANCES_CONFIG.find((p) => p.index === i);
        if (propCfg) {
          customLabel = propCfg.label;
          defaultPos = propCfg.defaultPosMm;
        }
      } else if (item.id === "15") {
        const ledCfg = LED_INSTANCES_CONFIG.find((l) => l.index === i);
        if (ledCfg) {
          customLabel = ledCfg.label;
          defaultPos = ledCfg.defaultPosMm;
        }
      } else if (item.id === "18") {
        const ubecCfg = UBEC_INSTANCES_CONFIG.find((u) => u.index === i);
        if (ubecCfg) {
          customLabel = ubecCfg.label;
          defaultPos = ubecCfg.defaultPosMm;
        }
      } else if (item.id === "02") {
        defaultPos = [0, 25, 0]; // Cube Orange on center deck
      } else if (item.id === "03") {
        defaultPos = [0, 95, -120]; // GPS mast
      } else if (item.id === "04") {
        defaultPos = [-60, -10, 150]; // HM30 datalink
      } else if (item.id === "05") {
        defaultPos = [0, -160, 320]; // ZR10 nose gimbal
      } else if (item.id === "06") {
        defaultPos = [80, 15, -40]; // Matek BEC
      } else if (item.id === "07") {
        defaultPos = [-80, 15, -40]; // PM07
      } else if (item.id === "08") {
        defaultPos = [0, -30, -180]; // TATTU battery in main bay
      } else if (item.id === "09") {
        defaultPos = [0, -20, 90]; // 4S avionics battery
      } else if (item.id === "13") {
        defaultPos = [-1200, 20, 220]; // Pitot tube on left wing leading edge
      } else if (item.id === "14") {
        defaultPos = [-1000, 15, 60]; // MS5525DSO module
      } else if (item.id === "16") {
        defaultPos = [0, 65, 260]; // E-Stop button top hatch
      } else if (item.id === "19") {
        defaultPos = [0, 20, -100]; // Jetson carrier assembly center tray
      } else if (item.id === "20") {
        defaultPos = [60, -10, 150]; // SIYI BEC for HM30
      } else if (item.id === "21") {
        customLabel = i === 1 ? "Foldable omni antenna (Chap / Ant 1)" : "Foldable omni antenna (O‘ng / Ant 2)";
        defaultPos = i === 1 ? [-75, 45, 120] : [75, 45, 120];
      }

      list.push({
        instanceId,
        componentId: item.id,
        instanceIndex: i,
        name: item.component,
        customLabel,
        isAirframe: item.id === "01",
        placed: false, // Standart holatda dron chiqmaydi, foydalanuvchi xohlaganda qo'shadi
        locked: false,
        visible: true,
        position: defaultPos,
        rotation: defaultRot,
        scale: [1, 1, 1],
      });
    }
  });

  return list;
}

export default function App() {
  const [manifest, setManifest] = useState<ComponentManifestItem[]>([]);
  const [instances, setInstances] = useState<PhysicalInstance[]>([]);
  const [cables, setCables] = useState<CableConnection[]>([]);
  const [selectedInstanceIds, setSelectedInstanceIds] = useState<string[]>([]);
  const selectedInstanceId = selectedInstanceIds.length > 0 ? selectedInstanceIds[selectedInstanceIds.length - 1] : null;
  const setSelectedInstanceId = useCallback((id: string | null) => {
    setSelectedInstanceIds(id ? [id] : []);
  }, []);
  const [selectedPinFullName, setSelectedPinFullName] = useState<string | null>(null);
  const [selectedCableId, setSelectedCableId] = useState<string | null>(null);

  // Errors and toasts
  const [loadingAssetErrors, setLoadingAssetErrors] = useState<Map<string, string>>(new Map());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4000);
  }, []);

  const [transformMode, setTransformMode] = useState<TransformMode>("translate");
  const [transformSpace, setTransformSpace] = useState<TransformSpace>("world");
  const [cameraViewMode, setCameraViewMode] = useState<CameraViewMode>("perspective");
  const [isIsolatedView, setIsIsolatedView] = useState<boolean>(false);
  const [hiddenObstaclesCount, setHiddenObstaclesCount] = useState<number>(0);
  const [cameraViewTrigger, setCameraViewTrigger] = useState<number>(0);

  const handleSetCameraView = useCallback((mode: CameraViewMode) => {
    setCameraViewMode(mode);
    setCameraViewTrigger(Date.now());
  }, []);

  const handleToggleIsolatedView = useCallback(() => {
    setIsIsolatedView((prev) => {
      const next = !prev;
      if (next) {
        showToast("👁️ Alohida ko‘rsatish: Tanlangan model atrofidagi to‘siqlar yashirildi [I]");
      } else {
        showToast("🌐 Barcha elementlar qayta ko‘rsatilmoqda");
      }
      return next;
    });
  }, [showToast]);

  // Automatically turn off isolate mode when selection is cleared
  useEffect(() => {
    if (selectedInstanceIds.length === 0) {
      setIsIsolatedView(false);
    }
  }, [selectedInstanceIds]);

  // Drone airframe visuals & Scene Theme
  const [droneOpacity, setDroneOpacity] = useState<number>(0.45);
  const [droneWireframe, setDroneWireframe] = useState<boolean>(false);
  const [droneVisible, setDroneVisible] = useState<boolean>(true);
  const [droneColor, setDroneColor] = useState<string>("original");
  const [sceneTheme, setSceneTheme] = useState<SceneTheme>("dark");

  // Layers
  const [showPins, setShowPins] = useState<boolean>(true);
  const [showCables, setShowCables] = useState<boolean>(true);
  const [showGrid, setShowGrid] = useState<boolean>(true);

  // Responsive Panels (Left Inventory, Right Inspector)
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState<boolean>(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState<boolean>(true);

  // Pin placing mode on 3D model
  const [isPlacingPinMode, setIsPlacingPinMode] = useState<boolean>(false);
  const [placingPinTargetInstanceId, setPlacingPinTargetInstanceId] = useState<string | null>(null);

  // Modal for cable connecting
  const [connectingPin, setConnectingPin] = useState<{
    instance: PhysicalInstance;
    pin: PinDefinition;
  } | null>(null);

  // Errors and modals
  const [isModelImportOpen, setIsModelImportOpen] = useState<boolean>(false);
  const [modelImportTargetId, setModelImportTargetId] = useState<string>("01");

  // Clipboard for copy/paste (Ctrl+C, Ctrl+V)
  const [clipboard, setClipboard] = useState<PhysicalInstance[]>([]);
  const pasteOffsetStepRef = React.useRef<number>(1);

  const captureFnRef = React.useRef<(() => string) | null>(null);

  // History Stack for Undo & Redo (Ctrl+Z, Ctrl+Y)
  const pastRef = React.useRef<HistorySnapshot[]>([]);
  const futureRef = React.useRef<HistorySnapshot[]>([]);
  const [canUndo, setCanUndo] = useState<boolean>(false);
  const [canRedo, setCanRedo] = useState<boolean>(false);
  const [undoCount, setUndoCount] = useState<number>(0);
  const [redoCount, setRedoCount] = useState<number>(0);

  // Focus trigger & Shortcuts Modal state
  const [focusTrigger, setFocusTrigger] = useState<number>(0);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState<boolean>(false);

  // Cable flow animation & Video recording states
  const [isFlowAnimating, setIsFlowAnimating] = useState<boolean>(false);
  const [flowSpeed, setFlowSpeed] = useState<number>(1.0);
  const [flowType, setFlowType] = useState<CableFlowType>("all");
  const [isAutoRotateActive, setIsAutoRotateActive] = useState<boolean>(false);
  const [isVideoRecording, setIsVideoRecording] = useState<boolean>(false);
  const videoRecorderRef = React.useRef<{
    start: () => boolean;
    stop: () => void;
    isRecording: () => boolean;
  } | null>(null);

  const handleToggleFlowAnimation = useCallback((explicitState?: boolean) => {
    setIsFlowAnimating((prev) => {
      const next = typeof explicitState === "boolean" ? explicitState : !prev;
      if (next) {
        setShowCables(true);
        showToast("✨ Kabellarda signal va quvvat oqimi faollashtirildi [Space]");
      } else {
        showToast("⏸ Kabellar oqim animatsiyasi to‘xtatildi [Space]");
      }
      return next;
    });
  }, [showToast]);

  const handleToggleVideo = useCallback(() => {
    if (videoRecorderRef.current) {
      if (videoRecorderRef.current.isRecording()) {
        videoRecorderRef.current.stop();
        setIsVideoRecording(false);
      } else {
        const ok = videoRecorderRef.current.start();
        if (ok) setIsVideoRecording(true);
      }
    } else {
      showToast("Video yozish tizimi hozirda tayyorlanmoqda");
    }
  }, [showToast]);

  // Cloud Sync & Auto-Save states (Firebase Firestore & LocalStorage)
  const [isCloudModalOpen, setIsCloudModalOpen] = useState<boolean>(false);
  const [currentCloudProject, setCurrentCloudProject] = useState<CloudProjectData | null>(null);
  const [isCloudSaving, setIsCloudSaving] = useState<boolean>(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"saved" | "saving" | "idle" | "error">("saved");
  const [lastSavedTimeText, setLastSavedTimeText] = useState<string>("");
  const [lastCloudSavedAt, setLastCloudSavedAt] = useState<string | null>(null);
  const [cloudCode, setCloudCode] = useState<string | null>(() => {
    return localStorage.getItem("drone_avionics_cloud_code") || null;
  });

  const isInitializedRef = React.useRef<boolean>(false);
  const [isAppReady, setIsAppReady] = useState<boolean>(false);
  const isApplyingRemoteRef = React.useRef<boolean>(false);
  const lastKnownRemoteUpdateRef = React.useRef<string>("");
  const autoSaveLocalTimerRef = React.useRef<any>(null);
  const autoSaveCloudTimerRef = React.useRef<any>(null);
  const clientIdRef = React.useRef<string>(
    "client_" + Math.random().toString(36).substring(2, 9) + "_" + Date.now()
  );
  const hasLocalModificationsRef = React.useRef<boolean>(false);
  const lastLocalActionTimeRef = React.useRef<number>(0);

  // Load Manifest CSV & Restore previous scene state
  useEffect(() => {
    fetch("/data/component_manifest.csv")
      .then((res) => res.text())
      .then((text) => {
        const rows = text.trim().split(/\r?\n/).slice(1);
        const baseManifest: ComponentManifestItem[] = rows
          .map((row) => {
            const [id, component, quantity, preferred_web_file, original_source, notes] = row.split(",");
            return {
              id: id?.trim(),
              component: component?.trim(),
              quantity: Number(quantity) || 1,
              preferred_web_file: preferred_web_file?.trim(),
              original_source: original_source?.trim(),
              notes: notes?.trim(),
            };
          })
          .filter((item) => item.id && item.component);

        // Retrieve custom manifest items saved in localStorage
        let savedCustomItems: ComponentManifestItem[] = [];
        try {
          const raw = localStorage.getItem("drone_avionics_custom_manifest");
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              savedCustomItems = parsed;
            }
          }
        } catch {}

        const parsedManifest = [...baseManifest];
        for (const item of savedCustomItems) {
          if (!parsedManifest.some((m) => m.id === item.id)) {
            parsedManifest.push(item);
          }
        }

        setManifest(parsedManifest);

        // Generate baseline instances
        const baseInstances = generateInitialInstances(parsedManifest);

        // Check URL for cloudCode parameter (e.g. ?cloudCode=DRN-XXXX)
        const urlParams = new URLSearchParams(window.location.search);
        const urlCloudCode = urlParams.get("cloudCode");

        // Try restoring from LocalStorage or Cloud
        const restoreFromData = (parsed: any) => {
          if (Array.isArray(parsed.customManifest) && parsed.customManifest.length > 0) {
            setManifest((prev) => {
              const existingIds = new Set(prev.map((m) => m.id));
              const additions = parsed.customManifest.filter((m: any) => !existingIds.has(m.id));
              if (additions.length > 0) {
                const merged = [...prev, ...additions];
                try {
                  const toSave = merged.filter((m) => Number(m.id) > 21 || m.id.startsWith("custom"));
                  localStorage.setItem("drone_avionics_custom_manifest", JSON.stringify(toSave));
                } catch {}
                return merged;
              }
              return prev;
            });
          }
          if (Array.isArray(parsed.instances)) {
            const merged = baseInstances.map((base) => {
              const saved = parsed.instances.find(
                (s: any) => s.instanceId === base.instanceId
              );
              if (saved) {
                const isAirframe = base.isAirframe || base.componentId === "01";
                let placed = !!saved.placed;
                let customColor = typeof saved.customColor === "string" ? saved.customColor : base.customColor;
                if (isAirframe) {
                  if (parsed.droneColor && parsed.droneColor !== "#cbd5e1" && parsed.droneColor !== "original") {
                    customColor = parsed.droneColor;
                  } else if (customColor === "#cbd5e1" || customColor === "original") {
                    customColor = undefined;
                  }
                }
                return {
                  ...base,
                  placed,
                  locked: !!saved.locked,
                  visible: saved.visible !== false,
                  position: Array.isArray(saved.position) ? saved.position : base.position,
                  rotation: Array.isArray(saved.rotation) ? saved.rotation : base.rotation,
                  scale: Array.isArray(saved.scale) ? saved.scale : base.scale,
                  customColor,
                  customLabel: typeof saved.customLabel === "string" ? saved.customLabel : base.customLabel,
                  customPins: Array.isArray(saved.customPins) ? saved.customPins : base.customPins,
                  attachedToDrone: typeof saved.attachedToDrone === "boolean" ? saved.attachedToDrone : base.attachedToDrone,
                  droneRelativePos: Array.isArray(saved.droneRelativePos) ? saved.droneRelativePos : base.droneRelativePos,
                  droneRelativeRot: Array.isArray(saved.droneRelativeRot) ? saved.droneRelativeRot : base.droneRelativeRot,
                };
              }
              return base;
            });

            // Keep any custom cloned instances that user created and placed
            const baseIdSet = new Set(baseInstances.map((b) => b.instanceId));
            const extraInstances = (parsed.instances || []).filter(
              (s: any) => s && s.instanceId && !baseIdSet.has(s.instanceId)
            );
            setInstances([...merged, ...extraInstances]);
          } else {
            setInstances(baseInstances);
          }

          if (Array.isArray(parsed.cables)) {
            cablesRef.current = parsed.cables;
            setCables(parsed.cables);
          }
          if (typeof parsed.droneColor === "string") {
            setDroneColor(parsed.droneColor === "#cbd5e1" || parsed.droneColor === "original" ? "original" : parsed.droneColor);
          } else if (parsed.droneFrame && typeof parsed.droneFrame.color === "string") {
            setDroneColor(parsed.droneFrame.color === "#cbd5e1" || parsed.droneFrame.color === "original" ? "original" : parsed.droneFrame.color);
          } else {
            setDroneColor("original");
          }
          if (typeof parsed.droneOpacity === "number") {
            setDroneOpacity(parsed.droneOpacity);
          } else if (parsed.droneFrame && typeof parsed.droneFrame.opacity === "number") {
            setDroneOpacity(parsed.droneFrame.opacity);
          }
          if (typeof parsed.droneWireframe === "boolean") {
            setDroneWireframe(parsed.droneWireframe);
          } else if (parsed.droneFrame && typeof parsed.droneFrame.wireframe === "boolean") {
            setDroneWireframe(parsed.droneFrame.wireframe);
          }
          if (typeof parsed.droneVisible === "boolean") {
            setDroneVisible(parsed.droneVisible);
          } else if (parsed.droneFrame && typeof parsed.droneFrame.visible === "boolean") {
            setDroneVisible(parsed.droneFrame.visible);
          }
          if (typeof parsed.sceneTheme === "string") {
            setSceneTheme(parsed.sceneTheme as SceneTheme);
          }
          if (typeof parsed.cameraViewMode === "string") {
            setCameraViewMode(parsed.cameraViewMode as CameraViewMode);
          }
          if (typeof parsed.transformMode === "string") {
            setTransformMode(parsed.transformMode as TransformMode);
          }
          if (typeof parsed.transformSpace === "string") {
            setTransformSpace(parsed.transformSpace as TransformSpace);
          }
          if (typeof parsed.showPins === "boolean") {
            setShowPins(parsed.showPins);
          }
          if (typeof parsed.showCables === "boolean") {
            setShowCables(parsed.showCables);
          }
          if (typeof parsed.showGrid === "boolean") {
            setShowGrid(parsed.showGrid);
          }
          if (typeof parsed.isLeftPanelOpen === "boolean") {
            setIsLeftPanelOpen(parsed.isLeftPanelOpen);
          }
          if (typeof parsed.isRightPanelOpen === "boolean") {
            setIsRightPanelOpen(parsed.isRightPanelOpen);
          }
          if (Array.isArray(parsed.selectedInstanceIds)) {
            setSelectedInstanceIds(parsed.selectedInstanceIds);
          }

          // Restore custom model associations if present in saved cloud data
          if (parsed.customModels && typeof parsed.customModels === "object") {
            try {
              for (const record of Object.values(parsed.customModels) as any[]) {
                if (record && record.componentId) {
                  modelManager.saveCustomModelRecord(record);
                }
              }
            } catch (err) {
              console.warn("Could not restore custom model records:", err);
            }
          }

          // Restore undo/redo action history stack so previous steps are preserved
          if (Array.isArray(parsed.historyPast) && parsed.historyPast.length > 0) {
            pastRef.current = parsed.historyPast;
            setCanUndo(true);
            setUndoCount(parsed.historyPast.length);
          }
          if (Array.isArray(parsed.historyFuture) && parsed.historyFuture.length > 0) {
            futureRef.current = parsed.historyFuture;
            setCanRedo(true);
            setRedoCount(parsed.historyFuture.length);
          }

          if (parsed.lastSavedFormatted) {
            setLastSavedTimeText(parsed.lastSavedFormatted);
          }
        };

        // Concurrently query Cloud Firestore and LocalStorage
        const cloudIdentifier = urlCloudCode || localStorage.getItem("drone_avionics_cloud_code") || "main-project";
        
        let localParsed: any = null;
        try {
          const savedData = localStorage.getItem(STORAGE_KEY);
          if (savedData) {
            localParsed = JSON.parse(savedData);
          }
        } catch (e) {
          console.warn("Could not read localStorage on startup:", e);
        }

        loadProjectFromCloud(cloudIdentifier)
          .then((cloudProj: CloudProjectData | null) => {
            const cloudHasPlaced = !!(
              cloudProj &&
              Array.isArray(cloudProj.instances) &&
              (cloudProj.instances.some((i: any) => i.placed) || (cloudProj.cables && cloudProj.cables.length > 0))
            );

            const localHasPlaced = !!(
              localParsed &&
              Array.isArray(localParsed.instances) &&
              (localParsed.instances.some((i: any) => i.placed) || (localParsed.cables && localParsed.cables.length > 0))
            );

            // Decision: Which one has the latest user work?
            let chosenSource: "cloud" | "local" | "base" = "base";

            if (cloudHasPlaced && localHasPlaced) {
              const cloudTime = new Date(cloudProj?.updatedAt || 0).getTime();
              const localTime = new Date(localParsed.timestamp || localParsed.updatedAt || 0).getTime();
              if (cloudTime >= localTime) {
                chosenSource = "cloud";
              } else {
                chosenSource = "local";
              }
            } else if (cloudHasPlaced) {
              // Cross-browser case: Another browser already placed components and saved them to Cloud!
              chosenSource = "cloud";
            } else if (localHasPlaced) {
              chosenSource = "local";
            } else if (cloudProj) {
              chosenSource = "cloud";
            } else if (localParsed) {
              chosenSource = "local";
            }

            if (chosenSource === "cloud" && cloudProj) {
              // Safeguard: If cloud document has empty cables but local storage has cables, preserve local cables!
              if (
                (!cloudProj.cables || cloudProj.cables.length === 0) &&
                localParsed &&
                Array.isArray(localParsed.cables) &&
                localParsed.cables.length > 0
              ) {
                cloudProj.cables = localParsed.cables;
              }
              restoreFromData(cloudProj);
              setCurrentCloudProject(cloudProj);
              setCloudCode(cloudProj.cloudCode);
              localStorage.setItem("drone_avionics_cloud_code", cloudProj.cloudCode);
              setLastCloudSavedAt(cloudProj.updatedAt);
              lastKnownRemoteUpdateRef.current = cloudProj.updatedAt || "";
              showToast(`Loyiha bulutdan yuklandi! (Kod: ${cloudProj.cloudCode})`);
              // Synchronize to localStorage so local storage is also fresh
              setTimeout(() => performLocalSave(), 200);
            } else if (chosenSource === "local" && localParsed) {
              if (cloudProj?.updatedAt) {
                lastKnownRemoteUpdateRef.current = cloudProj.updatedAt;
              }
              restoreFromData(localParsed);
              showToast("Loyiha xotiradan yuklandi");
              // Backup local work to Cloud Firestore so other browsers can see it
              setTimeout(() => {
                if (localParsed.instances && localParsed.instances.some((i: any) => i.placed)) {
                  saveProjectToCloud({
                    id: "main-project",
                    name: "3.5M Twin-Motor UAV Avionics",
                    cloudCode: localStorage.getItem("drone_avionics_cloud_code") || undefined,
                    instances: localParsed.instances,
                    cables: (localParsed.cables && localParsed.cables.length > 0) ? localParsed.cables : (cablesRef.current || []),
                    clientId: clientIdRef.current,
                    customModels: modelManager.getCustomModelRegistry(),
                    sceneTheme: localParsed.sceneTheme || sceneTheme,
                    droneFrame: {
                      color: localParsed.droneColor || droneColor,
                      opacity: localParsed.droneOpacity ?? 0.45,
                      wireframe: !!localParsed.droneWireframe,
                      visible: localParsed.droneVisible !== false,
                    },
                  }).then((savedProj: CloudProjectData) => {
                    setCurrentCloudProject(savedProj);
                    setCloudCode(savedProj.cloudCode);
                    localStorage.setItem("drone_avionics_cloud_code", savedProj.cloudCode);
                    setLastCloudSavedAt(savedProj.updatedAt);
                  }).catch((err) => {
                    console.warn("Cloud backup notice:", err);
                  });
                }
              }, 400);
            } else {
              setInstances(baseInstances);
            }
          })
          .catch((err: unknown) => {
            console.warn("Could not load from cloud, fallback to local:", err);
            if (localParsed) {
              restoreFromData(localParsed);
            } else {
              setInstances(baseInstances);
            }
          })
          .finally(() => {
            isInitializedRef.current = true;
            setIsAppReady(true);
            setAutoSaveStatus("saved");
            modelManager
              .restoreCustomModelsFromStorage()
              .then((restoredIds) => {
                if (restoredIds.length > 0) {
                  const now = Date.now();
                  setInstances((prev) =>
                    prev.map((inst) =>
                      restoredIds.includes(inst.componentId)
                        ? { ...inst, modelVersion: now }
                        : inst
                    )
                  );
                }
              })
              .catch((err) => {
                console.warn("Could not restore custom 3D models from storage:", err);
              });
          });
      })
      .catch((err) => {
        console.error("Error reading component manifest:", err);
        isInitializedRef.current = true;
        setIsAppReady(true);
      });
  }, []);

  // Serialize and synchronously save full scene state to LocalStorage
  const performLocalSave = useCallback(() => {
    if (!isInitializedRef.current || instances.length === 0) return;
    try {
      const nowStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      const dataToSave = {
        version: "3.5",
        timestamp: new Date().toISOString(),
        lastSavedFormatted: nowStr,
        droneColor,
        droneOpacity,
        droneWireframe,
        droneVisible,
        sceneTheme,
        cameraViewMode,
        transformMode,
        transformSpace,
        showPins,
        showCables,
        showGrid,
        isLeftPanelOpen,
        isRightPanelOpen,
        selectedInstanceIds,
        historyPast: pastRef.current.slice(-25),
        historyFuture: futureRef.current.slice(0, 10),
        instances: instances.map((inst) => ({
          instanceId: inst.instanceId,
          componentId: inst.componentId,
          instanceIndex: inst.instanceIndex,
          name: inst.name,
          isAirframe: inst.isAirframe,
          placed: inst.placed,
          locked: inst.locked,
          visible: inst.visible,
          position: inst.position,
          rotation: inst.rotation,
          scale: inst.scale,
          colorHint: inst.colorHint,
          customColor: inst.customColor,
          customLabel: inst.customLabel,
          customPins: inst.customPins,
          attachedToDrone: inst.attachedToDrone,
          droneRelativePos: inst.droneRelativePos,
          droneRelativeRot: inst.droneRelativeRot,
        })),
        cables: (cables && cables.length > 0) ? cables : (cablesRef.current || []),
        customManifest: manifest.filter(
          (m) => Number(m.id) > 21 || m.id.startsWith("custom")
        ),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
      setLastSavedTimeText(nowStr);
      setAutoSaveStatus("saved");
    } catch (e) {
      console.warn("Could not save to localStorage:", e);
    }
  }, [
    instances,
    manifest,
    cables,
    droneColor,
    droneOpacity,
    droneWireframe,
    droneVisible,
    sceneTheme,
    cameraViewMode,
    transformMode,
    transformSpace,
    showPins,
    showCables,
    showGrid,
    isLeftPanelOpen,
    isRightPanelOpen,
    selectedInstanceIds,
  ]);

  // Window beforeunload flush save: guarantees zero data loss on browser close / refresh
  useEffect(() => {
    const handleBeforeUnload = () => {
      performLocalSave();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [performLocalSave]);

  // Automatic Immediate Local Persistence (debounced 120ms for smooth 60fps interaction)
  useEffect(() => {
    if (!isInitializedRef.current || instances.length === 0) return;
    if (isApplyingRemoteRef.current) {
      isApplyingRemoteRef.current = false;
      setAutoSaveStatus("saved");
      return;
    }
    hasLocalModificationsRef.current = true;
    lastLocalActionTimeRef.current = Date.now();
    setAutoSaveStatus("saving");
    if (autoSaveLocalTimerRef.current) clearTimeout(autoSaveLocalTimerRef.current);
    autoSaveLocalTimerRef.current = setTimeout(() => {
      performLocalSave();
    }, 120);

    return () => {
      if (autoSaveLocalTimerRef.current) clearTimeout(autoSaveLocalTimerRef.current);
    };
  }, [
    instances,
    cables,
    droneColor,
    droneOpacity,
    droneWireframe,
    droneVisible,
    sceneTheme,
    cameraViewMode,
    transformMode,
    transformSpace,
    showPins,
    showCables,
    showGrid,
    isLeftPanelOpen,
    isRightPanelOpen,
    selectedInstanceIds,
    performLocalSave,
  ]);

  // Automatic Cloud Firestore Persistence (debounced 800ms background sync)
  useEffect(() => {
    if (!isInitializedRef.current || instances.length === 0) return;
    // Guard: Only auto-save to cloud if user made modifications in this session
    if (!hasLocalModificationsRef.current) return;

    if (autoSaveCloudTimerRef.current) clearTimeout(autoSaveCloudTimerRef.current);

    autoSaveCloudTimerRef.current = setTimeout(() => {
      const activeCloudCode = cloudCode || localStorage.getItem("drone_avionics_cloud_code") || undefined;
      setIsCloudSaving(true);
      saveProjectToCloud({
        id: "main-project",
        name: currentCloudProject?.name || "3.5M Twin-Motor UAV Avionics",
        cloudCode: activeCloudCode,
        instances,
        cables: (cables && cables.length > 0) ? cables : (cablesRef.current || []),
        droneFrame: {
          color: droneColor,
          opacity: droneOpacity,
          wireframe: droneWireframe,
          visible: droneVisible,
        },
        customModels: modelManager.getCustomModelRegistry(),
        sceneTheme,
        cameraViewMode,
        clientId: clientIdRef.current,
        customManifest: manifest.filter((m) => Number(m.id) > 21 || m.id.startsWith("custom")),
      })
        .then((savedProj) => {
          setCurrentCloudProject(savedProj);
          setCloudCode(savedProj.cloudCode);
          localStorage.setItem("drone_avionics_cloud_code", savedProj.cloudCode);
          setLastCloudSavedAt(savedProj.updatedAt);
          setAutoSaveStatus("saved");
          const nowStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
          setLastSavedTimeText(nowStr);
        })
        .catch((err) => {
          console.warn("Cloud auto-save status notice:", err);
          setAutoSaveStatus("saved");
        })
        .finally(() => {
          setIsCloudSaving(false);
        });
    }, 800);

    return () => {
      if (autoSaveCloudTimerRef.current) clearTimeout(autoSaveCloudTimerRef.current);
    };
  }, [
    instances,
    cables,
    droneColor,
    droneOpacity,
    droneWireframe,
    droneVisible,
    sceneTheme,
    cameraViewMode,
    manifest,
  ]);

  // Real-time multi-browser live synchronization via Firestore listener
  useEffect(() => {
    if (!isAppReady) return;

    console.log("Subscribing to real-time project updates from Firestore...");
    const unsubscribe = subscribeToMainProject((remoteData, metadata) => {
      if (!remoteData || !isInitializedRef.current) return;

      // 1. Ignore if this is an uncommitted local write by this client
      if (metadata && metadata.hasPendingWrites) {
        return;
      }

      // 2. Ignore writes initiated by this specific client instance
      if (remoteData.lastUpdatedByClientId && remoteData.lastUpdatedByClientId === clientIdRef.current) {
        return;
      }

      // 3. Ignore if this exact update timestamp was already processed
      if (remoteData.updatedAt && remoteData.updatedAt === lastKnownRemoteUpdateRef.current) {
        return;
      }

      // 4. Must have valid instances array
      if (!Array.isArray(remoteData.instances) || remoteData.instances.length === 0) {
        return;
      }

      // 4.5. Guard: If remote cables are empty/missing, but we already have connected cables locally, preserve them
      if (
        (!remoteData.cables || remoteData.cables.length === 0) &&
        cablesRef.current &&
        cablesRef.current.length > 0
      ) {
        remoteData.cables = cablesRef.current;
      }

      console.log("Authoritative project update received from another browser/client:", remoteData.cloudCode, remoteData.updatedAt);
      lastKnownRemoteUpdateRef.current = remoteData.updatedAt || new Date().toISOString();

      // Cancel local auto-save timers so this browser doesn't send back an echo
      if (autoSaveCloudTimerRef.current) {
        clearTimeout(autoSaveCloudTimerRef.current);
        autoSaveCloudTimerRef.current = null;
      }
      if (autoSaveLocalTimerRef.current) {
        clearTimeout(autoSaveLocalTimerRef.current);
        autoSaveLocalTimerRef.current = null;
      }
      hasLocalModificationsRef.current = false;
      lastLocalActionTimeRef.current = 0;
      isApplyingRemoteRef.current = true;

      // Apply remote state directly to 3D scene
      setInstances(remoteData.instances);

      if (Array.isArray(remoteData.cables)) {
        cablesRef.current = remoteData.cables;
        setCables(remoteData.cables);
      }
      if (remoteData.droneFrame) {
        if (typeof remoteData.droneFrame.color === "string") {
          setDroneColor(
            remoteData.droneFrame.color === "#cbd5e1" || remoteData.droneFrame.color === "original"
              ? "original"
              : remoteData.droneFrame.color
          );
        }
        if (typeof remoteData.droneFrame.opacity === "number") setDroneOpacity(remoteData.droneFrame.opacity);
        if (typeof remoteData.droneFrame.wireframe === "boolean") setDroneWireframe(remoteData.droneFrame.wireframe);
        if (typeof remoteData.droneFrame.visible === "boolean") setDroneVisible(remoteData.droneFrame.visible);
      }
      if (remoteData.customModels && typeof remoteData.customModels === "object") {
        for (const record of Object.values(remoteData.customModels) as any[]) {
          if (record && record.componentId) {
            modelManager.saveCustomModelRecord(record);
          }
        }
      }
      if (remoteData.sceneTheme) {
        setSceneTheme(remoteData.sceneTheme as any);
      }

      setCurrentCloudProject(remoteData);
      setCloudCode(remoteData.cloudCode);
      localStorage.setItem("drone_avionics_cloud_code", remoteData.cloudCode);
      setLastCloudSavedAt(remoteData.updatedAt);

      const updateTime = new Date(remoteData.updatedAt || Date.now()).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      setLastSavedTimeText(updateTime);
      setAutoSaveStatus("saved");

      // Update localStorage mirror so offline mirror has fresh authoritative data
      try {
        const localSnapshot = {
          version: "3.5",
          timestamp: remoteData.updatedAt,
          lastSavedFormatted: updateTime,
          droneColor: remoteData.droneFrame?.color || "original",
          droneOpacity: remoteData.droneFrame?.opacity ?? 0.35,
          droneWireframe: remoteData.droneFrame?.wireframe ?? false,
          droneVisible: remoteData.droneFrame?.visible ?? true,
          sceneTheme: remoteData.sceneTheme || sceneTheme,
          instances: remoteData.instances,
          cables: remoteData.cables || [],
          customManifest: remoteData.customManifest || [],
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(localSnapshot));
      } catch (e) {
        console.warn("Could not mirror to localStorage:", e);
      }

      showToast(`Loyiha boshqa brauzerdan saqlandi va barcha ekranlarda yangilandi! (Kod: ${remoteData.cloudCode})`);
    });

    return () => {
      unsubscribe();
    };
  }, [isAppReady, sceneTheme, showToast]);

  // Sync references for history callbacks
  const instancesRef = React.useRef<PhysicalInstance[]>(instances);
  useEffect(() => {
    instancesRef.current = instances;
  }, [instances]);

  const cablesRef = React.useRef<CableConnection[]>(cables);
  useEffect(() => {
    cablesRef.current = cables;
  }, [cables]);

  const selectedInstanceIdsRef = React.useRef<string[]>(selectedInstanceIds);
  useEffect(() => {
    selectedInstanceIdsRef.current = selectedInstanceIds;
  }, [selectedInstanceIds]);

  // Manual Save Trigger: Saves immediately to LocalStorage and Firestore Cloud, updating timestamp and synchronizing
  const handleManualSave = useCallback(async () => {
    setIsCloudSaving(true);
    setAutoSaveStatus("saving");

    // 1. Immediately persist full project snapshot to LocalStorage
    performLocalSave();
    hasLocalModificationsRef.current = true;
    lastLocalActionTimeRef.current = Date.now();

    // 2. Immediately persist and broadcast to Firebase Cloud Firestore
    try {
      const savedProj = await saveProjectToCloud({
        id: "main-project",
        name: currentCloudProject?.name || "3.5M Twin-Motor UAV Avionics",
        cloudCode: cloudCode || undefined,
        instances,
        cables,
        droneFrame: {
          color: droneColor,
          opacity: droneOpacity,
          wireframe: droneWireframe,
          visible: droneVisible,
        },
        customModels: modelManager.getCustomModelRegistry(),
        sceneTheme,
        cameraViewMode,
        clientId: clientIdRef.current,
        isManualSave: true,
        manualSaveTimestamp: Date.now(),
        customManifest: manifest.filter((m) => Number(m.id) > 21 || m.id.startsWith("custom")),
      });

      lastKnownRemoteUpdateRef.current = savedProj.updatedAt;
      setCurrentCloudProject(savedProj);
      setCloudCode(savedProj.cloudCode);
      localStorage.setItem("drone_avionics_cloud_code", savedProj.cloudCode);
      setLastCloudSavedAt(savedProj.updatedAt);

      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      setLastSavedTimeText(timeStr);
      setAutoSaveStatus("saved");

      showToast(`Loyiha barcha brauzerlar uchun saqlandi va yangilandi! (Kod: ${savedProj.cloudCode})`);
    } catch (err) {
      console.warn("Manual save cloud notice:", err);
      setAutoSaveStatus("saved");
      showToast("Loyiha xotirada saqlandi va yangilandi!");
    } finally {
      setIsCloudSaving(false);
    }
  }, [
    performLocalSave,
    currentCloudProject,
    cloudCode,
    instances,
    cables,
    droneColor,
    droneOpacity,
    droneWireframe,
    droneVisible,
    sceneTheme,
    cameraViewMode,
    manifest,
    showToast,
  ]);

  // Record a history snapshot before state mutation
  const recordSnapshot = useCallback((description: string) => {
    const snapshot: HistorySnapshot = {
      instances: JSON.parse(JSON.stringify(instancesRef.current)),
      cables: JSON.parse(JSON.stringify(cablesRef.current)),
      selectedInstanceIds: [...selectedInstanceIdsRef.current],
      description,
    };
    pastRef.current = [...pastRef.current, snapshot];
    if (pastRef.current.length > 50) {
      pastRef.current.shift();
    }
    futureRef.current = [];
    setCanUndo(true);
    setCanRedo(false);
    setUndoCount(pastRef.current.length);
    setRedoCount(0);
  }, []);

  // Undo (Ctrl+Z)
  const handleUndo = useCallback(() => {
    if (pastRef.current.length === 0) {
      showToast("ℹ️ Orqaga qaytarish uchun amal yo‘q (Undo)");
      return;
    }
    const previous = pastRef.current[pastRef.current.length - 1];
    pastRef.current = pastRef.current.slice(0, pastRef.current.length - 1);

    const currentSnapshot: HistorySnapshot = {
      instances: JSON.parse(JSON.stringify(instancesRef.current)),
      cables: JSON.parse(JSON.stringify(cablesRef.current)),
      selectedInstanceIds: [...selectedInstanceIdsRef.current],
      description: previous.description || "Oldingi holat",
    };
    futureRef.current = [currentSnapshot, ...futureRef.current];

    setCanUndo(pastRef.current.length > 0);
    setCanRedo(true);
    setUndoCount(pastRef.current.length);
    setRedoCount(futureRef.current.length);

    setInstances(previous.instances);
    setCables(previous.cables);
    setSelectedInstanceIds(previous.selectedInstanceIds);
    showToast(`↩️ Bekor qilindi [Ctrl+Z]: ${previous.description}`);
  }, [showToast]);

  // Redo (Ctrl+Y / Ctrl+Shift+Z)
  const handleRedo = useCallback(() => {
    if (futureRef.current.length === 0) {
      showToast("ℹ️ Oldinga qaytarish uchun amal yo‘q (Redo)");
      return;
    }
    const next = futureRef.current[0];
    futureRef.current = futureRef.current.slice(1);

    const currentSnapshot: HistorySnapshot = {
      instances: JSON.parse(JSON.stringify(instancesRef.current)),
      cables: JSON.parse(JSON.stringify(cablesRef.current)),
      selectedInstanceIds: [...selectedInstanceIdsRef.current],
      description: next.description || "Qaytarilgan holat",
    };
    pastRef.current = [...pastRef.current, currentSnapshot];

    setCanUndo(true);
    setCanRedo(futureRef.current.length > 0);
    setUndoCount(pastRef.current.length);
    setRedoCount(futureRef.current.length);

    setInstances(next.instances);
    setCables(next.cables);
    setSelectedInstanceIds(next.selectedInstanceIds);
    showToast(`↪️ Qaytarildi [Ctrl+Y]: ${next.description}`);
  }, [showToast]);

  // Transform start callback from 3D gizmo
  const handleTransformStart = useCallback(() => {
    recordSnapshot("3D ko‘chirish / aylantirish");
  }, [recordSnapshot]);

  // Handlers
  const handleSelectInstance = useCallback(
    (instanceId: string | null, isShift: boolean = false) => {
      if (!instanceId) {
        setSelectedInstanceIds([]);
        setSelectedPinFullName(null);
        return;
      }

      if (isShift) {
        setSelectedInstanceIds((prev) =>
          prev.includes(instanceId)
            ? prev.filter((id) => id !== instanceId)
            : [...prev, instanceId]
        );
      } else {
        setSelectedInstanceIds([instanceId]);
      }
      setSelectedPinFullName(null);
    },
    []
  );

  const handlePlaceInstance = (instanceId: string) => {
    setInstances((prev) =>
      prev.map((inst) =>
        inst.instanceId === instanceId ? { ...inst, placed: true } : inst
      )
    );
    setSelectedInstanceIds([instanceId]);
    setSelectedPinFullName(null);
  };

  const handleAutoPlaceAll = () => {
    const baseDefaults = generateInitialInstances(manifest);
    const defaultMap = new Map(baseDefaults.map((d) => [d.instanceId, d]));

    setInstances((prev) => {
      const sourceList = prev.length > 0 ? prev : baseDefaults;
      return sourceList.map((inst) => {
        const def = defaultMap.get(inst.instanceId);
        return {
          ...inst,
          placed: true,
          position: def ? def.position : inst.position,
          rotation: def ? def.rotation : [0, 0, 0],
          scale: [1, 1, 1],
          visible: true,
        };
      });
    });

    setSelectedInstanceIds([]);
    setSelectedPinFullName(null);
    showToast("Barcha 32 ta avionika elementi dron ichiga muvaffaqiyatli avtomatik joylashtirildi!");
  };

  const handleRemoveFromScene = (instanceId: string) => {
    setInstances((prev) =>
      prev.map((inst) =>
        inst.instanceId === instanceId ? { ...inst, placed: false } : inst
      )
    );
    // Remove attached cables
    setCables((prev) =>
      prev.filter(
        (c) => c.sourceInstanceId !== instanceId && c.targetInstanceId !== instanceId
      )
    );
    setSelectedInstanceIds((prev) => prev.filter((id) => id !== instanceId));
    setSelectedPinFullName(null);
  };

  const handleUpdatePosition = (instanceId: string, pos: [number, number, number]) => {
    setInstances((prev) => {
      const isAirframe = prev.some(
        (i) => i.instanceId === instanceId && (i.isAirframe || i.componentId === "01")
      );
      const airframeBefore = prev.find((i) => i.isAirframe || i.componentId === "01");

      let updated = prev.map((inst) => {
        if (inst.instanceId !== instanceId) return inst;
        const newInst = { ...inst, position: pos };
        // If an individual attached component is moved, recalculate its relative offset
        if (!isAirframe && newInst.attachedToDrone && airframeBefore) {
          const rel = computeDroneRelativeTransform(newInst, airframeBefore);
          newInst.droneRelativePos = rel.relativePos;
          newInst.droneRelativeRot = rel.relativeRot;
        }
        return newInst;
      });

      // If drone airframe itself moved, propagate to all attached components!
      if (isAirframe) {
        const airframeAfter = updated.find((i) => i.instanceId === instanceId);
        if (airframeAfter) {
          updated = propagateDroneMovement(airframeAfter, updated);
        }
      }

      return updated;
    });
  };

  const handleUpdateRotation = (instanceId: string, rot: [number, number, number]) => {
    setInstances((prev) => {
      const isAirframe = prev.some(
        (i) => i.instanceId === instanceId && (i.isAirframe || i.componentId === "01")
      );
      const airframeBefore = prev.find((i) => i.isAirframe || i.componentId === "01");

      let updated = prev.map((inst) => {
        if (inst.instanceId !== instanceId) return inst;
        const newInst = { ...inst, rotation: rot };
        if (!isAirframe && newInst.attachedToDrone && airframeBefore) {
          const rel = computeDroneRelativeTransform(newInst, airframeBefore);
          newInst.droneRelativePos = rel.relativePos;
          newInst.droneRelativeRot = rel.relativeRot;
        }
        return newInst;
      });

      if (isAirframe) {
        const airframeAfter = updated.find((i) => i.instanceId === instanceId);
        if (airframeAfter) {
          updated = propagateDroneMovement(airframeAfter, updated);
        }
      }

      return updated;
    });
  };

  const handleUpdateScale = (instanceId: string, scale: [number, number, number]) => {
    recordSnapshot("Element o‘lchami o‘zgartirildi");
    setInstances((prev) =>
      prev.map((inst) => (inst.instanceId === instanceId ? { ...inst, scale: scale } : inst))
    );
  };

  const handleBatchUpdateScale = useCallback(
    (instanceIds: string[], scaleFactor: number) => {
      recordSnapshot("Bir nechta element o‘lchami o‘zgartirildi");
      setInstances((prev) =>
        prev.map((inst) => {
          if (!instanceIds.includes(inst.instanceId) || inst.locked) return inst;
          const newScale: [number, number, number] =
            scaleFactor === 1
              ? [1, 1, 1]
              : [
                  Math.max(0.01, Math.round(inst.scale[0] * scaleFactor * 1000) / 1000),
                  Math.max(0.01, Math.round(inst.scale[1] * scaleFactor * 1000) / 1000),
                  Math.max(0.01, Math.round(inst.scale[2] * scaleFactor * 1000) / 1000),
                ];
          return { ...inst, scale: newScale };
        })
      );
      showToast(`📐 ${instanceIds.length} ta element masshtabi yangilandi`);
    },
    [recordSnapshot, showToast]
  );

  const handleUpdateTransform = (
    instanceId: string,
    pos: [number, number, number],
    rot: [number, number, number],
    scale: [number, number, number]
  ) => {
    setInstances((prev) => {
      const isAirframe = prev.some(
        (i) => i.instanceId === instanceId && (i.isAirframe || i.componentId === "01")
      );
      const airframeBefore = prev.find((i) => i.isAirframe || i.componentId === "01");

      let updated = prev.map((inst) => {
        if (inst.instanceId !== instanceId) return inst;
        const newInst = { ...inst, position: pos, rotation: rot, scale: scale };
        if (!isAirframe && newInst.attachedToDrone && airframeBefore) {
          const rel = computeDroneRelativeTransform(newInst, airframeBefore);
          newInst.droneRelativePos = rel.relativePos;
          newInst.droneRelativeRot = rel.relativeRot;
        }
        return newInst;
      });

      if (isAirframe) {
        const airframeAfter = updated.find((i) => i.instanceId === instanceId);
        if (airframeAfter) {
          updated = propagateDroneMovement(airframeAfter, updated);
        }
      }

      return updated;
    });
  };

  const handleUpdateMultipleTransforms = useCallback(
    (
      updates: Array<{
        instanceId: string;
        position: [number, number, number];
        rotation: [number, number, number];
        scale: [number, number, number];
      }>
    ) => {
      setInstances((prev) => {
        const updateMap = new Map(updates.map((u) => [u.instanceId, u]));
        const airframeBefore = prev.find((i) => i.isAirframe || i.componentId === "01");

        let nextInstances = prev.map((inst) => {
          const u = updateMap.get(inst.instanceId);
          if (!u) return inst;
          const newInst = {
            ...inst,
            position: u.position,
            rotation: u.rotation,
            scale: u.scale,
          };
          const isAirframe = newInst.isAirframe || newInst.componentId === "01";
          if (!isAirframe && newInst.attachedToDrone && airframeBefore) {
            const rel = computeDroneRelativeTransform(newInst, airframeBefore);
            newInst.droneRelativePos = rel.relativePos;
            newInst.droneRelativeRot = rel.relativeRot;
          }
          return newInst;
        });

        const droneWasUpdated = updates.some((u) => {
          const inst = prev.find((i) => i.instanceId === u.instanceId);
          return inst && (inst.isAirframe || inst.componentId === "01");
        });

        if (droneWasUpdated) {
          const airframeAfter = nextInstances.find((i) => i.isAirframe || i.componentId === "01");
          if (airframeAfter) {
            nextInstances = propagateDroneMovement(airframeAfter, nextInstances);
          }
        }

        return nextInstances;
      });
    },
    []
  );

  const handleToggleAttachToDrone = useCallback((instanceId: string, attach?: boolean) => {
    let message = "";
    setInstances((prev) => {
      const airframe = prev.find((i) => i.isAirframe || i.componentId === "01");
      if (!airframe) {
        message = "Sahnada dron korpusi topilmadi. Avval dronni sahnaga joylashtiring.";
        return prev;
      }

      return prev.map((inst) => {
        if (inst.instanceId !== instanceId) return inst;
        const willAttach = attach !== undefined ? attach : !inst.attachedToDrone;
        if (willAttach) {
          const rel = computeDroneRelativeTransform(inst, airframe);
          message = `🔗 "${inst.customLabel || inst.name}" dronga biriktirildi. Dron surilganda birga harakatlanadi!`;
          return {
            ...inst,
            attachedToDrone: true,
            droneRelativePos: rel.relativePos,
            droneRelativeRot: rel.relativeRot,
          };
        } else {
          message = `🔓 "${inst.customLabel || inst.name}" drondan ajratildi (erkin holat).`;
          return {
            ...inst,
            attachedToDrone: false,
            droneRelativePos: undefined,
            droneRelativeRot: undefined,
          };
        }
      });
    });
    if (message) showToast(message);
  }, []);

  const handleBatchAttachToDrone = useCallback((instanceIds: string[], attach: boolean) => {
    let message = "";
    setInstances((prev) => {
      const airframe = prev.find((i) => i.isAirframe || i.componentId === "01");
      if (!airframe && attach) {
        message = "Sahnada dron korpusi topilmadi.";
        return prev;
      }

      message = attach
        ? `🔗 ${instanceIds.length} ta element dronga biriktirildi.`
        : `🔓 ${instanceIds.length} ta element drondan ajratildi.`;

      return prev.map((inst) => {
        if (!instanceIds.includes(inst.instanceId)) return inst;
        if (inst.isAirframe || inst.componentId === "01") return inst;

        if (attach && airframe) {
          const rel = computeDroneRelativeTransform(inst, airframe);
          return {
            ...inst,
            attachedToDrone: true,
            droneRelativePos: rel.relativePos,
            droneRelativeRot: rel.relativeRot,
          };
        } else {
          return {
            ...inst,
            attachedToDrone: false,
            droneRelativePos: undefined,
            droneRelativeRot: undefined,
          };
        }
      });
    });
    if (message) showToast(message);
  }, []);

  const handleBatchRemoveFromScene = useCallback((instanceIds: string[]) => {
    setInstances((prev) =>
      prev.map((inst) =>
        instanceIds.includes(inst.instanceId) ? { ...inst, placed: false } : inst
      )
    );
    setCables((prev) =>
      prev.filter(
        (c) =>
          !instanceIds.includes(c.sourceInstanceId) &&
          !instanceIds.includes(c.targetInstanceId)
      )
    );
    setSelectedInstanceIds((prev) => prev.filter((id) => !instanceIds.includes(id)));
    showToast(`${instanceIds.length} ta element sahnadan olindi.`);
  }, []);

  const handleBatchToggleLock = useCallback((instanceIds: string[]) => {
    setInstances((prev) => {
      const anyUnlocked = prev.some((i) => instanceIds.includes(i.instanceId) && !i.locked);
      return prev.map((inst) =>
        instanceIds.includes(inst.instanceId) ? { ...inst, locked: anyUnlocked } : inst
      );
    });
  }, []);

  const handleBatchDeltaMove = useCallback(
    (axis: 0 | 1 | 2, delta: number) => {
      setInstances((prev) => {
        const droneUpdated = prev.some(
          (i) => selectedInstanceIds.includes(i.instanceId) && (i.isAirframe || i.componentId === "01")
        );

        let updated = prev.map((inst) => {
          if (!selectedInstanceIds.includes(inst.instanceId) || inst.locked) return inst;
          const newPos: [number, number, number] = [...inst.position];
          newPos[axis] += delta;
          return { ...inst, position: newPos };
        });

        if (droneUpdated) {
          const airframe = updated.find((i) => i.isAirframe || i.componentId === "01");
          if (airframe) {
            updated = propagateDroneMovement(airframe, updated);
          }
        }
        return updated;
      });
    },
    [selectedInstanceIds]
  );

  const handleToggleLock = (instanceId: string) => {
    setInstances((prev) =>
      prev.map((inst) =>
        inst.instanceId === instanceId ? { ...inst, locked: !inst.locked } : inst
      )
    );
  };

  const handleCopySelected = useCallback(() => {
    if (selectedInstanceIds.length === 0) return;

    const itemsToCopy = instances.filter(
      (inst) =>
        selectedInstanceIds.includes(inst.instanceId) &&
        !inst.isAirframe &&
        inst.componentId !== "01" &&
        inst.placed
    );

    if (itemsToCopy.length === 0) {
      if (
        selectedInstanceIds.some((id) => {
          const inst = instances.find((i) => i.instanceId === id);
          return inst && (inst.isAirframe || inst.componentId === "01");
        })
      ) {
        showToast("Dron asosiy korpusidan nusxa olinmaydi. Avionika elementlarini tanlang.");
      }
      return;
    }

    setClipboard(itemsToCopy.map((item) => ({ ...item })));
    pasteOffsetStepRef.current = 1;
    showToast(
      itemsToCopy.length === 1
        ? `📋 "${itemsToCopy[0].customLabel || itemsToCopy[0].name}" nusxalandi (Ctrl+C)`
        : `📋 ${itemsToCopy.length} ta element nusxalandi (Ctrl+C)`
    );
  }, [selectedInstanceIds, instances]);

  const handlePaste = useCallback(() => {
    if (clipboard.length === 0) {
      showToast("Xotirada nusxalangan element yo‘q (avval elementni tanlab Ctrl+C bosing)");
      return;
    }

    const airframe = instances.find((i) => i.isAirframe || i.componentId === "01");
    const step = pasteOffsetStepRef.current;
    const offsetDelta = step * 30; // 30mm offset

    const newInstances: PhysicalInstance[] = [];

    clipboard.forEach((clipItem) => {
      const allCurrentIndices = [
        ...instances
          .filter((i) => i.componentId === clipItem.componentId)
          .map((i) => i.instanceIndex),
        ...newInstances
          .filter((i) => i.componentId === clipItem.componentId)
          .map((i) => i.instanceIndex),
      ];
      const maxIndex = allCurrentIndices.length > 0 ? Math.max(...allCurrentIndices) : 0;
      const nextIndex = maxIndex + 1;
      const newInstanceId = `${clipItem.componentId}-${nextIndex}`;

      const newPos: [number, number, number] = [
        clipItem.position[0] + offsetDelta,
        clipItem.position[1],
        clipItem.position[2] + offsetDelta,
      ];

      const newInst: PhysicalInstance = {
        ...clipItem,
        instanceId: newInstanceId,
        instanceIndex: nextIndex,
        customLabel: clipItem.customLabel
          ? `${clipItem.customLabel} (nusxa ${nextIndex})`
          : `${clipItem.name} #${nextIndex}`,
        placed: true,
        locked: false,
        visible: true,
        position: newPos,
        rotation: [...clipItem.rotation],
        scale: [...clipItem.scale],
        customColor: clipItem.customColor,
        customPins: clipItem.customPins?.map((p) => ({
          ...p,
          fullName: `${newInstanceId}.${p.pinId}`,
        })),
        attachedToDrone: clipItem.attachedToDrone,
      };

      if (newInst.attachedToDrone && airframe) {
        const rel = computeDroneRelativeTransform(newInst, airframe);
        newInst.droneRelativePos = rel.relativePos;
        newInst.droneRelativeRot = rel.relativeRot;
      }

      newInstances.push(newInst);
    });

    pasteOffsetStepRef.current += 1;

    setInstances((prev) => [...prev, ...newInstances]);
    setSelectedInstanceIds(newInstances.map((n) => n.instanceId));
    setIsRightPanelOpen(true);
    showToast(
      newInstances.length === 1
        ? `📋 Yangi "${newInstances[0].customLabel || newInstances[0].name}" joylashtirildi (Ctrl+V)`
        : `📋 ${newInstances.length} ta yangi nusxa joylashtirildi (Ctrl+V)`
    );
  }, [clipboard, instances]);

  const handleDeleteSelected = useCallback(() => {
    if (selectedInstanceIds.length === 0) return;

    const selectedItems = instances.filter((i) => selectedInstanceIds.includes(i.instanceId));
    const lockedCount = selectedItems.filter((i) => i.locked).length;

    if (lockedCount === selectedItems.length) {
      showToast("Tanlangan elementlar qulflangan. O‘chirish uchun avval qulfdan chiqaring.");
      return;
    }

    const unlockedIds = selectedItems.filter((i) => !i.locked).map((i) => i.instanceId);

    // Save history snapshot before deletion
    recordSnapshot(`Elementlar sahnadan olindi (${unlockedIds.length} ta)`);

    // Unplace unlocked items
    setInstances((prev) =>
      prev.map((inst) =>
        unlockedIds.includes(inst.instanceId) ? { ...inst, placed: false } : inst
      )
    );

    // Disconnect cables
    setCables((prev) =>
      prev.filter(
        (c) =>
          !unlockedIds.includes(c.sourceInstanceId) &&
          !unlockedIds.includes(c.targetInstanceId)
      )
    );

    setSelectedInstanceIds((prev) => prev.filter((id) => !unlockedIds.includes(id)));
    setSelectedPinFullName(null);

    const extraNotice = lockedCount > 0 ? ` (${lockedCount} ta qulflangan element saqlandi)` : "";
    showToast(`🗑️ ${unlockedIds.length} ta element sahnadan olindi (Delete)${extraNotice}`);
  }, [selectedInstanceIds, instances, recordSnapshot, showToast]);

  // 180° Flip Handler (Horizontal / Vertical / Roll)
  const handleFlipSelected = useCallback(
    (type: "horizontal" | "vertical" | "roll" = "horizontal") => {
      if (selectedInstanceIds.length === 0) return;

      const airframe = instances.find((i) => i.isAirframe || i.componentId === "01");

      const label =
        type === "horizontal"
          ? "↔ Gorizontal 180° ga burildi (Yaw)"
          : type === "vertical"
          ? "↕ Vertikal 180° ga ag‘darildi (Pitch)"
          : "🔄 180° Roll flip qilindi";

      recordSnapshot(label);

      setInstances((prev) => {
        let updated = prev.map((inst) => {
          if (!selectedInstanceIds.includes(inst.instanceId) || inst.locked) return inst;

          const newRot: [number, number, number] = [...inst.rotation];
          if (type === "horizontal") {
            let y = Math.round((newRot[1] + 180) % 360);
            if (y > 180) y -= 360;
            newRot[1] = y;
          } else if (type === "vertical") {
            let x = Math.round((newRot[0] + 180) % 360);
            if (x > 180) x -= 360;
            newRot[0] = x;
          } else if (type === "roll") {
            let z = Math.round((newRot[2] + 180) % 360);
            if (z > 180) z -= 360;
            newRot[2] = z;
          }

          const newInst = { ...inst, rotation: newRot };
          const isAirframe = newInst.isAirframe || newInst.componentId === "01";
          if (!isAirframe && newInst.attachedToDrone && airframe) {
            const rel = computeDroneRelativeTransform(newInst, airframe);
            newInst.droneRelativePos = rel.relativePos;
            newInst.droneRelativeRot = rel.relativeRot;
          }
          return newInst;
        });

        const airframeSelected = selectedInstanceIds.some((id) => {
          const i = prev.find((item) => item.instanceId === id);
          return i && (i.isAirframe || i.componentId === "01");
        });
        if (airframeSelected) {
          const airframeAfter = updated.find((i) => i.isAirframe || i.componentId === "01");
          if (airframeAfter) {
            updated = propagateDroneMovement(airframeAfter, updated);
          }
        }

        return updated;
      });

      showToast(label);
    },
    [selectedInstanceIds, instances, recordSnapshot, showToast]
  );

  // Duplicate Selected Instances (Ctrl+D)
  const handleDuplicateSelected = useCallback(() => {
    const toDuplicate = instances.filter(
      (inst) => selectedInstanceIds.includes(inst.instanceId) && inst.placed
    );
    if (toDuplicate.length === 0) {
      showToast("Dublikat qilish uchun sahnadagi elementni tanlang");
      return;
    }

    recordSnapshot(`Tezkor dublikat (${toDuplicate.length} ta element)`);

    const offset = 40;
    const newInstances: PhysicalInstance[] = [];
    const newSelectedIds: string[] = [];
    const airframe = instances.find((i) => i.isAirframe || i.componentId === "01");

    toDuplicate.forEach((item) => {
      const sameType = instances.filter((i) => i.componentId === item.componentId);
      const nextIndex = sameType.length + 1;
      const newId = `${item.componentId}_inst_${nextIndex}_${Date.now() % 10000}`;

      const duplicated: PhysicalInstance = {
        ...JSON.parse(JSON.stringify(item)),
        instanceId: newId,
        instanceIndex: nextIndex,
        customLabel: item.customLabel ? `${item.customLabel} (nusxa ${nextIndex})` : `${item.name} #${nextIndex}`,
        position: [
          item.position[0] + offset,
          item.position[1],
          item.position[2] + offset,
        ],
        placed: true,
        locked: false,
        attachedToDrone: item.attachedToDrone,
      };

      if (duplicated.attachedToDrone && airframe) {
        const rel = computeDroneRelativeTransform(duplicated, airframe);
        duplicated.droneRelativePos = rel.relativePos;
        duplicated.droneRelativeRot = rel.relativeRot;
      }

      newInstances.push(duplicated);
      newSelectedIds.push(newId);
    });

    setInstances((prev) => [...prev, ...newInstances]);
    setSelectedInstanceIds(newSelectedIds);
    showToast(`📑 ${newInstances.length} ta element dublikat qilindi [Ctrl+D]`);
  }, [instances, selectedInstanceIds, recordSnapshot, showToast]);

  // Select All Placed Elements (Ctrl+A)
  const handleSelectAll = useCallback(() => {
    const placedIds = instances.filter((i) => i.placed).map((i) => i.instanceId);
    if (placedIds.length === 0) {
      showToast("Sahnada joylashtirilgan elementlar yo‘q");
      return;
    }
    setSelectedInstanceIds(placedIds);
    showToast(`🎯 Sahnadagi barcha ${placedIds.length} ta element tanlandi [Ctrl+A]`);
  }, [instances, showToast]);

  // Focus Camera on Selected (F)
  const handleFocusSelected = useCallback(() => {
    if (selectedInstanceIds.length === 0) {
      showToast("Kamerani qaratish uchun elementni tanlang [F]");
      return;
    }
    setFocusTrigger((prev) => prev + 1);
    showToast("🔍 Kamera tanlangan elementga yo‘naltirildi [F]");
  }, [selectedInstanceIds, showToast]);

  // Toggle Lock for Selected (L)
  const handleToggleLockSelected = useCallback(() => {
    if (selectedInstanceIds.length === 0) return;
    recordSnapshot("Qulflash holatini o‘zgartirish [L]");
    setInstances((prev) => {
      const anyUnlocked = prev.some(
        (i) => selectedInstanceIds.includes(i.instanceId) && !i.locked
      );
      return prev.map((inst) =>
        selectedInstanceIds.includes(inst.instanceId)
          ? { ...inst, locked: anyUnlocked }
          : inst
      );
    });
    showToast("🔒 Tanlangan element(lar) qulflash holati o‘zgartirildi [L]");
  }, [selectedInstanceIds, recordSnapshot, showToast]);

  // Toggle Visibility for Selected (V)
  const handleToggleVisibilitySelected = useCallback(() => {
    if (selectedInstanceIds.length === 0) return;
    recordSnapshot("Ko‘rinish holatini o‘zgartirish [V]");
    setInstances((prev) => {
      const anyVisible = prev.some(
        (i) => selectedInstanceIds.includes(i.instanceId) && i.visible
      );
      return prev.map((inst) =>
        selectedInstanceIds.includes(inst.instanceId)
          ? { ...inst, visible: !anyVisible }
          : inst
      );
    });
    showToast("👁️ Tanlangan element(lar) ko‘rinishi o‘zgartirildi [V]");
  }, [selectedInstanceIds, recordSnapshot, showToast]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement ||
        (activeEl as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      // 1. Undo: Ctrl + Z
      if (isCtrlOrCmd && !e.shiftKey && (e.key === "z" || e.key === "Z")) {
        e.preventDefault();
        handleUndo();
        return;
      }

      // 2. Redo: Ctrl + Y or Ctrl + Shift + Z
      if (
        (isCtrlOrCmd && (e.key === "y" || e.key === "Y")) ||
        (isCtrlOrCmd && e.shiftKey && (e.key === "z" || e.key === "Z"))
      ) {
        e.preventDefault();
        handleRedo();
        return;
      }

      // 2.5. Ctrl + S / Cmd + S (Manual Save & Cloud Update)
      if (isCtrlOrCmd && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        handleManualSave();
        return;
      }

      // 3. Delete or Backspace
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedInstanceIds.length > 0) {
          e.preventDefault();
          handleDeleteSelected();
        }
        return;
      }

      // 4. Ctrl + C (Copy)
      if (isCtrlOrCmd && (e.key === "c" || e.key === "C")) {
        if (selectedInstanceIds.length > 0) {
          e.preventDefault();
          handleCopySelected();
        }
        return;
      }

      // 5. Ctrl + V (Paste)
      if (isCtrlOrCmd && (e.key === "v" || e.key === "V")) {
        e.preventDefault();
        handlePaste();
        return;
      }

      // 6. Ctrl + D (Duplicate)
      if (isCtrlOrCmd && (e.key === "d" || e.key === "D")) {
        e.preventDefault();
        handleDuplicateSelected();
        return;
      }

      // 7. Ctrl + A (Select All)
      if (isCtrlOrCmd && (e.key === "a" || e.key === "A")) {
        e.preventDefault();
        handleSelectAll();
        return;
      }

      // 8. F (Focus Camera on Selection)
      if (!isCtrlOrCmd && !e.altKey && (e.key === "f" || e.key === "F")) {
        if (selectedInstanceIds.length > 0) {
          e.preventDefault();
          handleFocusSelected();
        }
        return;
      }

      // 9. 'H' or 'h' (Horizontal Flip 180° Yaw)
      if (!isCtrlOrCmd && !e.altKey && !e.shiftKey && (e.key === "h" || e.key === "H")) {
        if (selectedInstanceIds.length > 0) {
          e.preventDefault();
          handleFlipSelected("horizontal");
        }
        return;
      }

      // 10. Shift + V (Vertical Flip 180° Pitch)
      if (!isCtrlOrCmd && !e.altKey && e.shiftKey && (e.key === "v" || e.key === "V")) {
        if (selectedInstanceIds.length > 0) {
          e.preventDefault();
          handleFlipSelected("vertical");
        }
        return;
      }

      // 11. V (Toggle Visibility)
      if (!isCtrlOrCmd && !e.altKey && !e.shiftKey && (e.key === "v" || e.key === "V")) {
        if (selectedInstanceIds.length > 0) {
          e.preventDefault();
          handleToggleVisibilitySelected();
        }
        return;
      }

      // 12. L (Toggle Lock)
      if (!isCtrlOrCmd && !e.altKey && (e.key === "l" || e.key === "L")) {
        if (selectedInstanceIds.length > 0) {
          e.preventDefault();
          handleToggleLockSelected();
        }
        return;
      }

      // 12.1. I (Toggle Isolate / Alohida ko‘rsatish)
      if (!isCtrlOrCmd && !e.altKey && (e.key === "i" || e.key === "I")) {
        if (selectedInstanceIds.length > 0) {
          e.preventDefault();
          handleToggleIsolatedView();
        }
        return;
      }

      // 12.2. Space (Toggle Cable Flow Animation)
      if (
        !isCtrlOrCmd &&
        !e.altKey &&
        !e.shiftKey &&
        (e.code === "Space" || e.key === " ") &&
        !["INPUT", "TEXTAREA", "SELECT"].includes((document.activeElement as HTMLElement)?.tagName || "")
      ) {
        e.preventDefault();
        handleToggleFlowAnimation();
        return;
      }

      // 12.3. C (Toggle Cable Visibility)
      if (
        !isCtrlOrCmd &&
        !e.altKey &&
        (e.key === "c" || e.key === "C") &&
        !["INPUT", "TEXTAREA", "SELECT"].includes((document.activeElement as HTMLElement)?.tagName || "")
      ) {
        e.preventDefault();
        setShowCables((prev) => {
          const next = !prev;
          showToast(next ? "🔌 Kabellar ko‘rsatildi [C]" : "🙈 Kabellar yashirildi [C]");
          return next;
        });
        return;
      }

      // 13. Transform Modes: W (Translate), E (Rotate), R (Scale)
      if (!isCtrlOrCmd && !e.altKey && (e.key === "w" || e.key === "W")) {
        setTransformMode("translate");
        showToast("🎯 Rejim: Ko‘chirish (Translate) [W]");
        return;
      }
      if (!isCtrlOrCmd && !e.altKey && (e.key === "e" || e.key === "E")) {
        setTransformMode("rotate");
        showToast("🔄 Rejim: Aylantirish (Rotate) [E]");
        return;
      }
      if (!isCtrlOrCmd && !e.altKey && (e.key === "r" || e.key === "R")) {
        setTransformMode("scale");
        showToast("📐 Rejim: Masshtab (Scale) [R]");
        return;
      }

      // 14. Q (Toggle Transform Space: World vs Local)
      if (!isCtrlOrCmd && !e.altKey && (e.key === "q" || e.key === "Q")) {
        setTransformSpace((prev) => {
          const next = prev === "world" ? "local" : "world";
          showToast(next === "world" ? "🌍 Koordinata: Dunyo (World) [Q]" : "🌐 Koordinata: Lokal (Local) [Q]");
          return next;
        });
        return;
      }

      // 15. Help / Shortcuts: '?' or F1
      if (e.key === "?" || e.key === "F1") {
        e.preventDefault();
        setIsShortcutsModalOpen((prev) => !prev);
        return;
      }

      // 16. Escape (Deselect or close modals)
      if (e.key === "Escape") {
        if (isShortcutsModalOpen) {
          e.preventDefault();
          setIsShortcutsModalOpen(false);
          return;
        }
        if (connectingPin) {
          e.preventDefault();
          setConnectingPin(null);
          return;
        }
        if (isPlacingPinMode) {
          e.preventDefault();
          setIsPlacingPinMode(false);
          setPlacingPinTargetInstanceId(null);
          return;
        }
        if (selectedInstanceIds.length > 0) {
          e.preventDefault();
          setSelectedInstanceIds([]);
          setSelectedPinFullName(null);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    selectedInstanceIds,
    clipboard,
    isShortcutsModalOpen,
    connectingPin,
    isPlacingPinMode,
    handleUndo,
    handleRedo,
    handleDeleteSelected,
    handleCopySelected,
    handlePaste,
    handleDuplicateSelected,
    handleSelectAll,
    handleFocusSelected,
    handleFlipSelected,
    handleToggleLockSelected,
    handleToggleVisibilitySelected,
    handleManualSave,
    showToast,
  ]);

  const handleToggleVisibility = (instanceId: string) => {
    setInstances((prev) =>
      prev.map((inst) =>
        inst.instanceId === instanceId ? { ...inst, visible: !inst.visible } : inst
      )
    );
  };

  const handleUpdateDroneColor = useCallback((color: string) => {
    setDroneColor(color);
    setInstances((prev) =>
      prev.map((inst) =>
        inst.isAirframe || inst.componentId === "01"
          ? { ...inst, customColor: color === "original" ? undefined : color }
          : inst
      )
    );
  }, []);

  const handleUpdateInstanceColor = (instanceId: string, color: string | undefined) => {
    setInstances((prev) =>
      prev.map((inst) =>
        inst.instanceId === instanceId ? { ...inst, customColor: color } : inst
      )
    );
    const target = instances.find((i) => i.instanceId === instanceId);
    if (target && (target.isAirframe || target.componentId === "01") && color) {
      setDroneColor(color);
    }
  };

  const isDronePlaced = useMemo(
    () => instances.some((i) => (i.isAirframe || i.componentId === "01") && i.placed),
    [instances]
  );

  const handleToggleDronePresence = useCallback(() => {
    const airframe = instances.find((i) => i.isAirframe || i.componentId === "01");
    if (!airframe) return;
    if (airframe.placed) {
      handleRemoveFromScene(airframe.instanceId);
      showToast("Dron korpusi sahnadan o‘chirildi");
    } else {
      handlePlaceInstance(airframe.instanceId);
      showToast("Dron korpusi sahnaga joylashtirildi");
    }
  }, [instances]);

  const handleApplyColorToAllInstances = (componentId: string, color: string | undefined) => {
    setInstances((prev) =>
      prev.map((inst) =>
        inst.componentId === componentId ? { ...inst, customColor: color } : inst
      )
    );
    showToast(`#${componentId} barcha nusxalariga rang o‘rnatildi`);
  };

  const handlePinPlacedAtPoint = (instanceId: string, localOffset: [number, number, number]) => {
    const targetInst = instances.find((i) => i.instanceId === instanceId);
    const existingPins = targetInst?.customPins || [];
    const nextIndex = existingPins.length + 1;
    const pinId = `pin_${nextIndex}`;
    const fullName = `${instanceId}.${pinId}`;
    const newPin: PinDefinition = {
      pinId,
      connectorId: "port",
      fullName,
      label: `Pin #${nextIndex} [${Math.round(localOffset[0])}, ${Math.round(localOffset[1])}, ${Math.round(localOffset[2])}]`,
      type: "signal",
      voltage: "3.3V",
      localOffset,
      verified: true,
    };

    setInstances((prev) =>
      prev.map((inst) =>
        inst.instanceId === instanceId
          ? { ...inst, customPins: [...(inst.customPins || []), newPin] }
          : inst
      )
    );

    setSelectedInstanceId(instanceId);
    setSelectedPinFullName(fullName);
    showToast(`📍 3D modelda yangi pin belgilandi: ${newPin.label}`);
  };

  const handleAddCustomPin = (instanceId: string, pin: PinDefinition) => {
    setInstances((prev) =>
      prev.map((inst) =>
        inst.instanceId === instanceId
          ? { ...inst, customPins: [...(inst.customPins || []), pin] }
          : inst
      )
    );
    setSelectedInstanceId(instanceId);
    setSelectedPinFullName(pin.fullName);
    showToast(`Pin qo‘shildi: ${pin.label}`);
  };

  const handleUpdateCustomPin = (
    instanceId: string,
    pinFullName: string,
    updated: Partial<PinDefinition>
  ) => {
    setInstances((prev) =>
      prev.map((inst) => {
        if (inst.instanceId !== instanceId) return inst;
        const currentPins: PinDefinition[] = (inst.customPins && inst.customPins.length > 0)
          ? [...inst.customPins]
          : (COMPONENT_PINS[inst.componentId] || []).map((p) => ({
              ...p,
              fullName: `${instanceId}.${p.pinId}`,
            }));

        const existingIdx = currentPins.findIndex((p) => p.fullName === pinFullName);
        if (existingIdx !== -1) {
          currentPins[existingIdx] = { ...currentPins[existingIdx], ...updated };
        } else {
          currentPins.push({
            pinId: updated.pinId || "p_custom",
            connectorId: updated.connectorId || "custom",
            fullName: updated.fullName || `${instanceId}.${updated.pinId || "p_custom"}`,
            label: updated.label || "Pin",
            type: updated.type || "signal",
            voltage: updated.voltage,
            localOffset: updated.localOffset || [0, 0, 0],
            verified: true,
          });
        }
        return { ...inst, customPins: currentPins };
      })
    );

    // If pin's fullName was changed, smoothly update any cables referencing it
    if (updated.fullName && updated.fullName !== pinFullName) {
      setCables((prev) =>
        prev.map((c) => {
          let s = c.sourcePinName;
          let t = c.targetPinName;
          if (c.sourceInstanceId === instanceId && c.sourcePinName === pinFullName) {
            s = updated.fullName!;
          }
          if (c.targetInstanceId === instanceId && c.targetPinName === pinFullName) {
            t = updated.fullName!;
          }
          return { ...c, sourcePinName: s, targetPinName: t };
        })
      );
      if (selectedPinFullName === pinFullName) {
        setSelectedPinFullName(updated.fullName);
      }
    }
    showToast(`Pin nomi saqlandi: "${updated.label || pinFullName}"`);
  };

  const handleDeleteCustomPin = (instanceId: string, pinFullName: string) => {
    setInstances((prev) =>
      prev.map((inst) =>
        inst.instanceId === instanceId
          ? {
              ...inst,
              customPins: (inst.customPins || []).filter((p) => p.fullName !== pinFullName),
            }
          : inst
      )
    );
    // Also remove any cables connected to this pin
    setCables((prev) =>
      prev.filter(
        (c) =>
          !(
            (c.sourceInstanceId === instanceId && c.sourcePinName === pinFullName) ||
            (c.targetInstanceId === instanceId && c.targetPinName === pinFullName)
          )
      )
    );
    if (selectedPinFullName === pinFullName) {
      setSelectedPinFullName(null);
    }
    showToast("Pin o‘chirildi");
  };

  const handleLoadPresetPins = (instanceId: string) => {
    const inst = instances.find((i) => i.instanceId === instanceId);
    if (!inst) return;
    const presets = COMPONENT_PINS[inst.componentId] || [];
    if (presets.length === 0) {
      showToast("Ushbu komponent uchun standart shablon pin mavjud emas");
      return;
    }
    setInstances((prev) =>
      prev.map((item) =>
        item.instanceId === instanceId
          ? {
              ...item,
              customPins: presets.map((p) => ({
                ...p,
                fullName: `${instanceId}.${p.pinId}`,
              })),
            }
          : item
      )
    );
    showToast(`${presets.length} ta shablon pin yuklandi`);
  };

  const handleTogglePinPlacingMode = (targetInstanceId?: string) => {
    setIsPlacingPinMode((prev) => {
      const next = !prev;
      if (next) {
        setPlacingPinTargetInstanceId(targetInstanceId || selectedInstanceId || null);
        showToast("📍 Pin belgilash: 3D modeldagi port yoki oyoqcha ustiga bosing");
      } else {
        setPlacingPinTargetInstanceId(null);
      }
      return next;
    });
  };

  const handleStartCableConnection = (sourcePinFullName: string) => {
    if (!selectedInstanceId) return;
    const inst = instances.find((i) => i.instanceId === selectedInstanceId);
    if (!inst) return;
    const pins = (inst.customPins && inst.customPins.length > 0)
      ? inst.customPins
      : (COMPONENT_PINS[inst.componentId] || []);
    const pin = pins.find((p) => p.fullName === sourcePinFullName);
    if (!pin) return;

    setConnectingPin({ instance: inst, pin });
  };

  const handleAddCable = (newCableData: Omit<CableConnection, "id">) => {
    const newCable: CableConnection = {
      ...newCableData,
      id: `cable_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      slackMm: 0,
      curveTension: 0.5,
      thicknessMm: 3.0,
      routePoints: [],
    };
    setCables((prev) => [...prev, newCable]);
    setSelectedCableId(newCable.id);
    setIsRightPanelOpen(true);
    showToast(`Kabel ulandi: ${newCable.name}`);
  };

  const handleDeleteCable = (cableId: string) => {
    setCables((prev) => prev.filter((c) => c.id !== cableId));
    if (selectedCableId === cableId) {
      setSelectedCableId(null);
    }
    showToast("Kabel uzildi");
  };

  const handleUpdateCableColor = (cableId: string, color: string) => {
    setCables((prev) =>
      prev.map((c) => (c.id === cableId ? { ...c, color } : c))
    );
  };

  const handleSelectCable = (cableId: string | null) => {
    setSelectedCableId(cableId);
    if (cableId) {
      setIsRightPanelOpen(true);
    }
  };

  const handleUpdateCable = (cableId: string, updated: Partial<CableConnection>) => {
    setCables((prev) =>
      prev.map((c) => (c.id === cableId ? { ...c, ...updated } : c))
    );
  };

  const handleSwapCableEnds = (cableId: string) => {
    setCables((prev) =>
      prev.map((c) => {
        if (c.id !== cableId) return c;
        const reversedRoutePoints = c.routePoints
          ? [...c.routePoints].reverse()
          : undefined;
        return {
          ...c,
          sourceInstanceId: c.targetInstanceId,
          sourcePinName: c.targetPinName,
          targetInstanceId: c.sourceInstanceId,
          targetPinName: c.sourcePinName,
          routePoints: reversedRoutePoints,
          endStickers: c.endStickers
            ? {
                ...c.endStickers,
                sourceText: c.endStickers.targetText,
                targetText: c.endStickers.sourceText,
              }
            : undefined,
        };
      })
    );
    recordSnapshot("Kabel oqim yo‘nalishi almashtirildi");
    showToast("Kabel oqim yo‘nalishi va uchlari almashtirildi (A ⇄ B)");
  };

  // Helper function to calculate squared distance from point P to line segment VW
  const getDistanceToSegmentSquared = (
    p: { x: number; y: number; z: number },
    v: { x: number; y: number; z: number },
    w: { x: number; y: number; z: number }
  ): number => {
    const l2 = (w.x - v.x) ** 2 + (w.y - v.y) ** 2 + (w.z - v.z) ** 2;
    if (l2 === 0) return (p.x - v.x) ** 2 + (p.y - v.y) ** 2 + (p.z - v.z) ** 2;
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y) + (p.z - v.z) * (w.z - v.z)) / l2;
    t = Math.max(0, Math.min(1, t));
    const projX = v.x + t * (w.x - v.x);
    const projY = v.y + t * (w.y - v.y);
    const projZ = v.z + t * (w.z - v.z);
    return (p.x - projX) ** 2 + (p.y - projY) ** 2 + (p.z - projZ) ** 2;
  };

  const handleAddCableRoutePoint = (cableId: string, customPoint?: Partial<CableRoutePoint>) => {
    recordSnapshot("Kabelga burilish nuqtasi qo‘shildi");
    setCables((prev) =>
      prev.map((c) => {
        if (c.id !== cableId) return c;
        const pts = c.routePoints ? [...c.routePoints] : [];

        // Determine start and end anchor positions
        const sourceInst = instances.find((i) => i.instanceId === c.sourceInstanceId && i.placed);
        const targetInst = instances.find((i) => i.instanceId === c.targetInstanceId && i.placed);

        const sourcePins = sourceInst
          ? (sourceInst.customPins && sourceInst.customPins.length > 0
              ? sourceInst.customPins
              : COMPONENT_PINS[sourceInst.componentId] || [])
          : [];
        const targetPins = targetInst
          ? (targetInst.customPins && targetInst.customPins.length > 0
              ? targetInst.customPins
              : COMPONENT_PINS[targetInst.componentId] || [])
          : [];

        const sPin = sourcePins.find((p) => p.fullName === c.sourcePinName);
        const tPin = targetPins.find((p) => p.fullName === c.targetPinName);

        const p1Vec = sourceInst
          ? computePinWorldPosition(sourceInst, sPin ? sPin.localOffset : [0, 0, 0])
          : new THREE.Vector3(0, 0, 0);
        const p2Vec = targetInst
          ? computePinWorldPosition(targetInst, tPin ? tPin.localOffset : [0, 0, 0])
          : new THREE.Vector3(0, 0, 0);

        // Complete polyline path: [start, ...waypoints, end]
        const polyline: Array<{ x: number; y: number; z: number }> = [
          { x: p1Vec.x, y: p1Vec.y, z: p1Vec.z },
          ...pts.map((pt) => ({ x: pt.x, y: pt.y, z: pt.z })),
          { x: p2Vec.x, y: p2Vec.y, z: p2Vec.z },
        ];

        let newPoint: CableRoutePoint;
        let insertionIndex = pts.length; // default to appending if no match

        if (
          customPoint &&
          typeof customPoint.x === "number" &&
          typeof customPoint.y === "number" &&
          typeof customPoint.z === "number"
        ) {
          newPoint = {
            id: `pt_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            x: Math.round(customPoint.x * 10) / 10,
            y: Math.round(customPoint.y * 10) / 10,
            z: Math.round(customPoint.z * 10) / 10,
            type: customPoint.type || "waypoint",
          };

          // Find the exact segment that this point is closest to
          let minDistanceSq = Infinity;
          for (let i = 0; i < polyline.length - 1; i++) {
            const dSq = getDistanceToSegmentSquared(newPoint, polyline[i], polyline[i + 1]);
            if (dSq < minDistanceSq) {
              minDistanceSq = dSq;
              insertionIndex = i; // segment i is between polyline[i] and polyline[i+1]
            }
          }
        } else {
          // If added via button without specific coordinates:
          // Find the longest segment and insert at its midpoint
          let maxSegLenSq = -1;
          let longestSegIdx = 0;
          for (let i = 0; i < polyline.length - 1; i++) {
            const dSq =
              (polyline[i + 1].x - polyline[i].x) ** 2 +
              (polyline[i + 1].y - polyline[i].y) ** 2 +
              (polyline[i + 1].z - polyline[i].z) ** 2;
            if (dSq > maxSegLenSq) {
              maxSegLenSq = dSq;
              longestSegIdx = i;
            }
          }
          const segA = polyline[longestSegIdx];
          const segB = polyline[longestSegIdx + 1];
          newPoint = {
            id: `pt_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            x: Math.round(((segA.x + segB.x) / 2) * 10) / 10,
            y: Math.round((((segA.y + segB.y) / 2) + 20) * 10) / 10,
            z: Math.round(((segA.z + segB.z) / 2) * 10) / 10,
            type: "waypoint",
          };
          insertionIndex = longestSegIdx;
        }

        const updatedRoutePoints = [...pts];
        updatedRoutePoints.splice(insertionIndex, 0, newPoint);
        return { ...c, routePoints: updatedRoutePoints };
      })
    );
    showToast("Kabelga burilish nuqtasi qo‘shildi");
  };

  const handleUpdateCableRoutePoint = (
    cableId: string,
    pointId: string,
    coords: { x: number; y: number; z: number }
  ) => {
    setCables((prev) =>
      prev.map((c) => {
        if (c.id !== cableId) return c;
        return {
          ...c,
          routePoints: (c.routePoints || []).map((pt) =>
            pt.id === pointId ? { ...pt, ...coords } : pt
          ),
        };
      })
    );
  };

  const handleDeleteCableRoutePoint = (cableId: string, pointId: string) => {
    setCables((prev) =>
      prev.map((c) => {
        if (c.id !== cableId) return c;
        return {
          ...c,
          routePoints: (c.routePoints || []).filter((pt) => pt.id !== pointId),
        };
      })
    );
    showToast("Burilish nuqtasi o‘chirildi");
  };

  const handleStraightenCable = (cableId: string) => {
    setCables((prev) =>
      prev.map((c) =>
        c.id === cableId ? { ...c, routePoints: [], slackMm: 0, curveTension: 0.5 } : c
      )
    );
    showToast("Kabel tekislandi (burilishlar tozalandi)");
  };

  // Export JSON
  const handleExportJSON = () => {
    const exportData = {
      project: "3.8M Twin-Motor UAV Avionics Layout",
      version: "2.0",
      exportDate: new Date().toISOString(),
      wingspanMm: 3800,
      totalComponents: 32,
      placedCount: instances.filter((i) => i.placed).length,
      instances: instances.map((inst) => ({
        instanceId: inst.instanceId,
        componentId: inst.componentId,
        instanceIndex: inst.instanceIndex,
        label: inst.customLabel,
        placed: inst.placed,
        locked: inst.locked,
        visible: inst.visible,
        position: inst.position,
        rotation: inst.rotation,
        scale: inst.scale,
        customPins: inst.customPins || [],
      })),
      cables,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `uav_avionics_layout_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast("JSON konfiguratsiya muvaffaqiyatli eksport qilindi");
  };

  // Import JSON with strict manifest validation
  const handleImportJSON = (jsonStr: string) => {
    try {
      const data = JSON.parse(jsonStr);
      if (!data || !Array.isArray(data.instances)) {
        showToast("Xato: Noto‘g‘ri JSON formati");
        return;
      }

      // Strictly map onto allowed manifest instances (prevent extra copies)
      setInstances((prev) => {
        return prev.map((base) => {
          const matching = data.instances.find(
            (item: any) =>
              item.componentId === base.componentId &&
              item.instanceIndex === base.instanceIndex
          );
          if (matching) {
            return {
              ...base,
              placed: !!matching.placed,
              locked: !!matching.locked,
              visible: matching.visible !== false,
              position: Array.isArray(matching.position) ? matching.position : base.position,
              rotation: Array.isArray(matching.rotation) ? matching.rotation : base.rotation,
              scale: Array.isArray(matching.scale) ? matching.scale : base.scale,
              customPins: Array.isArray((matching as any).customPins) ? (matching as any).customPins : base.customPins,
            };
          }
          return base;
        });
      });

      if (Array.isArray(data.cables)) {
        setCables(data.cables);
      }

      showToast("Loyiha konfiguratsiyasi yuklandi");
    } catch (err) {
      showToast("Xato: JSON faylini o‘qib bo‘lmadi");
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      "Instance ID",
      "Component ID",
      "Component Name",
      "Instance Label",
      "Status",
      "Pos X (mm)",
      "Pos Y (mm)",
      "Pos Z (mm)",
      "Rot Pitch (deg)",
      "Rot Yaw (deg)",
      "Rot Roll (deg)",
    ];

    const rows = instances.map((inst) => [
      inst.instanceId,
      inst.componentId,
      `"${inst.name}"`,
      `"${inst.customLabel || ""}"`,
      inst.placed ? "Sahnada" : "Joylashtirilmagan",
      Math.round(inst.position[0]),
      Math.round(inst.position[1]),
      Math.round(inst.position[2]),
      Math.round(inst.rotation[0]),
      Math.round(inst.rotation[1]),
      Math.round(inst.rotation[2]),
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `uav_avionics_inventory_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast("CSV hisoboti saqlandi");
  };

  // Capture PNG Snapshot
  const handleCapturePNG = () => {
    if (captureFnRef.current) {
      const dataUrl = captureFnRef.current();
      if (dataUrl) {
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = `uav_avionics_3d_snapshot_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.png`;
        link.click();
        showToast("Yuqori sifatli PNG rasm yuklab olindi");
      }
    }
  };

  // Reset All
  const handleResetAll = () => {
    if (confirm("Barcha komponentlar joylashuvini boshlang‘ich holatga qaytarishni xohlaysizmi?")) {
      const fresh = generateInitialInstances(manifest);
      setInstances(fresh);
      setCables([]);
      setSelectedInstanceId(null);
      setSelectedPinFullName(null);
      localStorage.removeItem(STORAGE_KEY);
      hasLocalModificationsRef.current = true;
      lastLocalActionTimeRef.current = Date.now();
      saveProjectToCloud({
        id: "main-project",
        name: "3.5M Twin-Motor UAV Avionics",
        cloudCode: cloudCode || undefined,
        instances: fresh,
        cables: [],
        clientId: clientIdRef.current,
        isExplicitReset: true,
      }).catch((e) => console.warn("Cloud reset notice:", e));
      showToast("Barcha avionika qayta o‘rnatildi");
    }
  };

  const [reloadTrigger, setReloadTrigger] = useState<number>(0);
  const [isReloadingModels, setIsReloadingModels] = useState<boolean>(false);
  const [isReloadingJetson, setIsReloadingJetson] = useState<boolean>(false);

  const handleReloadModels = useCallback(async () => {
    setIsReloadingModels(true);
    setLoadingAssetErrors(new Map());
    showToast("Barcha 3D modellar asl ranglari bilan qayta tekshirilmoqda va yuklanmoqda...");
    try {
      // 1. Reset drone color to original
      setDroneColor("original");

      // 2. Clear any custom color overrides on all instances so original CAD colors take effect
      setInstances((prev) =>
        prev.map((inst) => ({
          ...inst,
          customColor: undefined,
        }))
      );

      // 3. Clear cache and reload all 21 models with fresh original materials
      await modelManager.reloadAllModelsWithOriginalColors();

      setReloadTrigger(Date.now());
      showToast("Barcha 21 ta 3D modellar asl ranglari va materiallari bilan muvaffaqiyatli yuklandi!");
    } catch (err: any) {
      console.error(err);
      showToast("Modellarni yangilashda xatolik yuz berdi: " + (err?.message || ""));
    } finally {
      setIsReloadingModels(false);
    }
  }, []);

  const handleReloadJetson = useCallback(async () => {
    setIsReloadingJetson(true);
    showToast("Jetson P3737 modeli yangidan yuklanmoqda...");
    try {
      setLoadingAssetErrors((prev) => {
        const next = new Map(prev);
        next.delete("jetson-p3737");
        return next;
      });

      await modelManager.reloadSingleModel("19");

      setReloadTrigger(Date.now());
      showToast("Jetson P3737 modeli muvaffaqiyatli yangidan yuklandi! ✓");
    } catch (err: any) {
      console.error(err);
      setLoadingAssetErrors((prev) => new Map(prev).set("jetson-p3737", err?.message || "Yuklanmadi"));
      showToast("Jetson modelini yuklashda xatolik: " + (err?.message || ""));
    } finally {
      setIsReloadingJetson(false);
    }
  }, []);

  const handleAssetLoadError = useCallback((assetKey: string, message: string) => {
    setLoadingAssetErrors((prev) => new Map(prev).set(assetKey, message));
    if (assetKey === "jetson-p3737") {
      showToast("Jetson P3737 modeli yuklanmadi: " + message);
    }
  }, []);

  const handleSaveToCloud = async (name: string, customCode?: string): Promise<CloudProjectData> => {
    setIsCloudSaving(true);
    try {
      const saved = await saveProjectToCloud({
        id: "main-project",
        name: name || "3.5M Twin-Motor UAV Avionics",
        cloudCode: customCode || cloudCode || undefined,
        instances,
        cables,
        clientId: clientIdRef.current,
        isManualSave: true,
        manualSaveTimestamp: Date.now(),
        customManifest: manifest.filter((m) => Number(m.id) > 21 || m.id.startsWith("custom")),
        droneFrame: {
          color: droneColor,
          opacity: droneOpacity,
          wireframe: droneWireframe,
          visible: droneVisible,
        },
      });
      lastKnownRemoteUpdateRef.current = saved.updatedAt;
      setCurrentCloudProject(saved);
      setCloudCode(saved.cloudCode);
      localStorage.setItem("drone_avionics_cloud_code", saved.cloudCode);
      setLastCloudSavedAt(saved.updatedAt);
      showToast(`Loyiha bulutga saqlandi! Bulut kodi: ${saved.cloudCode}`);
      return saved;
    } catch (err: any) {
      showToast("Bulutga saqlashda xatolik: " + (err.message || String(err)));
      throw err;
    } finally {
      setIsCloudSaving(false);
    }
  };

  const handleApplyCloudProject = (project: CloudProjectData) => {
    if (Array.isArray(project.customManifest) && project.customManifest.length > 0) {
      setManifest((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        const additions = project.customManifest!.filter((m) => !existingIds.has(m.id));
        if (additions.length > 0) {
          const merged = [...prev, ...additions];
          try {
            const toSave = merged.filter((m) => Number(m.id) > 21 || m.id.startsWith("custom"));
            localStorage.setItem("drone_avionics_custom_manifest", JSON.stringify(toSave));
          } catch {}
          return merged;
        }
        return prev;
      });
    }
    if (Array.isArray(project.instances)) {
      setInstances(project.instances);
    }
    if (Array.isArray(project.cables)) {
      setCables(project.cables);
    }
    if (project.droneFrame) {
      if (typeof project.droneFrame.opacity === "number") setDroneOpacity(project.droneFrame.opacity);
      if (typeof project.droneFrame.wireframe === "boolean") setDroneWireframe(project.droneFrame.wireframe);
      if (typeof project.droneFrame.visible === "boolean") setDroneVisible(project.droneFrame.visible);
      if (typeof project.droneFrame.color === "string") setDroneColor(project.droneFrame.color);
    }
    setCurrentCloudProject(project);
    setCloudCode(project.cloudCode);
    localStorage.setItem("drone_avionics_cloud_code", project.cloudCode);
    setLastCloudSavedAt(project.updatedAt);
    showToast(`"${project.name}" bulutdan yuklandi!`);
  };

  const selectedInstance = useMemo(
    () => instances.find((i) => i.instanceId === selectedInstanceId) || null,
    [instances, selectedInstanceId]
  );

  const placedCount = useMemo(() => instances.filter((i) => i.placed).length, [instances]);

  // Open 3D Model Picker & Importer
  const handleOpenModelImport = useCallback(
    (componentId?: string) => {
      if (componentId) {
        setModelImportTargetId(componentId);
      } else if (selectedInstance) {
        setModelImportTargetId(selectedInstance.componentId);
      } else {
        setModelImportTargetId("01");
      }
      setIsModelImportOpen(true);
    },
    [selectedInstance]
  );

  // Create new custom component on-the-fly and place instance on stage
  const handleCreateCustomComponent = useCallback(
    async (name: string, quantity: number, notes?: string): Promise<string> => {
      const newId = String(manifest.length + 1).padStart(2, "0");
      const newManifestItem: ComponentManifestItem = {
        id: newId,
        component: name,
        quantity,
        notes: notes || "Foydalanuvchi maxsus 3D modeli",
      };
      setManifest((prev) => {
        const next = [...prev, newManifestItem];
        try {
          const customOnly = next.filter((m) => Number(m.id) > 21 || m.id.startsWith("custom"));
          localStorage.setItem("drone_avionics_custom_manifest", JSON.stringify(customOnly));
        } catch {}
        return next;
      });

      const now = Date.now();
      const newInstances: PhysicalInstance[] = [];
      for (let i = 1; i <= quantity; i++) {
        newInstances.push({
          instanceId: `${newId}-${i}`,
          componentId: newId,
          instanceIndex: i,
          name: `${name} ${i}`,
          placed: i === 1, // Immediately place on stage so user sees it in 3D scene!
          locked: false,
          visible: true,
          position: [0, 80 + (i - 1) * 30, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          modelVersion: now,
        });
      }

      setInstances((prev) => [...prev, ...newInstances]);
      if (newInstances.length > 0 && newInstances[0].placed) {
        setSelectedInstanceIds([newInstances[0].instanceId]);
      }
      return newId;
    },
    [manifest]
  );

  return (
    <div className="app-container" id="dron-avionics-app">
      {/* Top Header Telemetry & Tools Bar */}
      <HeaderBar
        placedCount={placedCount}
        totalCount={instances.length || 32}
        transformMode={transformMode}
        setTransformMode={setTransformMode}
        transformSpace={transformSpace}
        setTransformSpace={setTransformSpace}
        droneOpacity={droneOpacity}
        setDroneOpacity={setDroneOpacity}
        droneWireframe={droneWireframe}
        setDroneWireframe={setDroneWireframe}
        droneVisible={droneVisible}
        setDroneVisible={setDroneVisible}
        droneColor={droneColor}
        setDroneColor={handleUpdateDroneColor}
        sceneTheme={sceneTheme}
        setSceneTheme={setSceneTheme}
        showPins={showPins}
        setShowPins={setShowPins}
        showCables={showCables}
        setShowCables={setShowCables}
        showGrid={showGrid}
        setShowGrid={setShowGrid}
        onExportJSON={handleExportJSON}
        onImportJSON={handleImportJSON}
        onExportCSV={handleExportCSV}
        onCapturePNG={handleCapturePNG}
        onResetAll={handleResetAll}
        onReloadModels={handleReloadModels}
        isReloadingModels={isReloadingModels}
        onReloadJetson={handleReloadJetson}
        isReloadingJetson={isReloadingJetson}
        onOpenModelImport={handleOpenModelImport}
        isDronePlaced={isDronePlaced}
        onToggleDronePresence={handleToggleDronePresence}
        onAutoPlaceAll={handleAutoPlaceAll}
        isLeftPanelOpen={isLeftPanelOpen}
        onToggleLeftPanel={() => setIsLeftPanelOpen((prev) => !prev)}
        isRightPanelOpen={isRightPanelOpen}
        onToggleRightPanel={() => setIsRightPanelOpen((prev) => !prev)}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
        undoCount={undoCount}
        redoCount={redoCount}
        onOpenShortcutsModal={() => setIsShortcutsModalOpen(true)}
        onOpenCloudModal={() => setIsCloudModalOpen(true)}
        cloudCode={cloudCode}
        isCloudSaving={isCloudSaving}
        autoSaveStatus={autoSaveStatus}
        lastSavedAtText={lastSavedTimeText}
        onForceSave={handleManualSave}
        isFlowAnimating={isFlowAnimating}
        onToggleFlowAnimation={handleToggleFlowAnimation}
        isVideoRecording={isVideoRecording}
        onToggleVideo={handleToggleVideo}
      />

      {/* Main Workspace Body */}
      <div
        className={`workspace-body ${!isLeftPanelOpen ? "left-collapsed" : ""} ${!isRightPanelOpen ? "right-collapsed" : ""}`}
        id="workspace-body-container"
      >
        {/* Left: Unplaced & Full Inventory Sidebar */}
        {isLeftPanelOpen && (
          <UnplacedInventoryPanel
            manifest={manifest}
            instances={instances}
            onPlaceInstance={handlePlaceInstance}
            onSelectInstance={(id, isShift) => {
              handleSelectInstance(id, isShift);
              if (id !== null) {
                setIsRightPanelOpen(true);
              }
            }}
            selectedInstanceId={selectedInstanceId}
            selectedInstanceIds={selectedInstanceIds}
            loadingAssetErrors={loadingAssetErrors}
            onAutoPlaceAll={handleAutoPlaceAll}
            onCollapse={() => setIsLeftPanelOpen(false)}
            onOpenModelImport={handleOpenModelImport}
            onReloadJetson={handleReloadJetson}
            isReloadingJetson={isReloadingJetson}
          />
        )}

        {/* Center: 3D Viewport with Floating Controls */}
        <div className="viewport-wrapper" id="center-viewport-wrapper">
          {/* Floating Expand Buttons when sidebars are collapsed */}
          {!isLeftPanelOpen && (
            <button
              type="button"
              className="floating-expand-btn left-edge"
              onClick={() => setIsLeftPanelOpen(true)}
              title="Inventar panelini ochish"
            >
              <PanelLeft size={14} />
              <span>Inventar</span>
            </button>
          )}

          {!isRightPanelOpen && (
            <button
              type="button"
              className="floating-expand-btn right-edge"
              onClick={() => setIsRightPanelOpen(true)}
              title="Inspektor panelini ochish"
            >
              <span>Inspektor</span>
              <PanelRight size={14} />
            </button>
          )}

          <Viewport3D
            instances={instances}
            cables={cables}
            selectedInstanceId={selectedInstanceId}
            selectedInstanceIds={selectedInstanceIds}
            selectedPinFullName={selectedPinFullName}
            selectedCableId={selectedCableId}
            onSelectCable={handleSelectCable}
            onUpdateCable={handleUpdateCable}
            onAddCableRoutePoint={handleAddCableRoutePoint}
            onUpdateCableRoutePoint={handleUpdateCableRoutePoint}
            onDeleteCableRoutePoint={handleDeleteCableRoutePoint}
            onStraightenCable={handleStraightenCable}
            onSwapCableEnds={handleSwapCableEnds}
            transformMode={transformMode}
            transformSpace={transformSpace}
            droneOpacity={droneOpacity}
            droneWireframe={droneWireframe}
            droneVisible={droneVisible}
            droneColor={droneColor}
            sceneTheme={sceneTheme}
            showPins={showPins}
            showCables={showCables}
            showGrid={showGrid}
            cameraViewMode={cameraViewMode}
            onSelectInstance={(id, isShift) => {
              handleSelectInstance(id, isShift);
              if (id !== null) {
                setIsRightPanelOpen(true);
              }
            }}
            onSelectPin={(pin) => setSelectedPinFullName(pin)}
            onUpdateTransform={handleUpdateTransform}
            onUpdateMultipleTransforms={handleUpdateMultipleTransforms}
            registerCaptureFn={(fn) => {
              captureFnRef.current = fn;
            }}
            onAssetLoadError={handleAssetLoadError}
            reloadTrigger={reloadTrigger}
            isPlacingPinMode={isPlacingPinMode}
            placingPinTargetInstanceId={placingPinTargetInstanceId}
            onAddPinAtPoint={handlePinPlacedAtPoint}
            onCancelPlacingPinMode={() => setIsPlacingPinMode(false)}
            focusOnSelectionTrigger={focusTrigger}
            onTransformStart={handleTransformStart}
            cameraViewTrigger={cameraViewTrigger}
            hideObstacles={isIsolatedView}
            onToggleHideObstacles={handleToggleIsolatedView}
            isIsolatedView={isIsolatedView}
            onToggleIsolatedView={handleToggleIsolatedView}
            onHiddenObstaclesCountChange={setHiddenObstaclesCount}
            isFlowAnimating={isFlowAnimating}
            onToggleFlowAnimation={handleToggleFlowAnimation}
            flowSpeed={flowSpeed}
            onFlowSpeedChange={setFlowSpeed}
            flowType={flowType}
            onFlowTypeChange={setFlowType}
            isAutoRotateActive={isAutoRotateActive}
            onToggleAutoRotate={() => setIsAutoRotateActive((prev) => !prev)}
            onCapturePNG={handleCapturePNG}
            onShowToast={showToast}
            onRegisterVideoRecorder={(rec) => {
              videoRecorderRef.current = rec;
            }}
          />

          {/* Top Floating Viewport HUD (Unified Bar: Camera View Presets on Left, Quick Tools on Right) */}
          <div
            className="viewport-top-hud"
            id="viewport-top-hud"
            style={{
              paddingLeft: isLeftPanelOpen ? "0px" : "88px",
              paddingRight: isRightPanelOpen ? "0px" : "96px",
            }}
          >
            {/* Left: Camera Orientation Controls */}
            <CameraViewControls
              currentView={cameraViewMode}
              onSetCameraView={handleSetCameraView}
              onResetCamera={() => handleSetCameraView("perspective")}
              selectedInstanceName={selectedInstance ? (selectedInstance.customLabel || selectedInstance.name) : null}
              isIsolatedView={isIsolatedView}
              onToggleIsolatedView={handleToggleIsolatedView}
              hiddenObstaclesCount={hiddenObstaclesCount}
            />

            {/* Right: Viewport Quick Action Tools */}
            <ViewportQuickTools
              isFlowAnimating={isFlowAnimating}
              onToggleFlowAnimation={handleToggleFlowAnimation}
              flowType={flowType}
              onFlowTypeChange={setFlowType}
              flowSpeed={flowSpeed}
              onCycleFlowSpeed={() => {
                const speeds: (0.5 | 1 | 2)[] = [0.5, 1, 2];
                const idx = speeds.indexOf(flowSpeed as 0.5 | 1 | 2);
                setFlowSpeed(speeds[(idx + 1) % speeds.length]);
              }}
              isAutoRotateActive={isAutoRotateActive}
              onToggleAutoRotate={() => {
                const next = !isAutoRotateActive;
                setIsAutoRotateActive(next);
                showToast(next ? "🔄 360° Aylanma ko‘rinish yoqildi" : "Aylanma ko‘rinish to‘xtatildi");
              }}
              onCapturePNG={handleCapturePNG}
              isVideoRecording={isVideoRecording}
              onToggleVideo={handleToggleVideo}
              showCables={showCables}
              onToggleShowCables={() => {
                setShowCables((prev) => {
                  const next = !prev;
                  showToast(next ? "🔌 Kabellar ko‘rsatildi [C]" : "🙈 Kabellar yashirildi [C]");
                  return next;
                });
              }}
            />
          </div>
        </div>

        {/* Right: Placed Inspector & Electrical Port / Cable Panel */}
        {isRightPanelOpen && (
          <PlacedInspectorPanel
            selectedInstance={selectedInstance}
            selectedInstances={instances.filter((i) => selectedInstanceIds.includes(i.instanceId))}
            selectedInstanceIds={selectedInstanceIds}
            selectedPinFullName={selectedPinFullName}
            cables={cables}
            instances={instances}
            onUpdatePosition={handleUpdatePosition}
            onUpdateRotation={handleUpdateRotation}
            onUpdateScale={handleUpdateScale}
            onToggleLock={handleToggleLock}
            onToggleVisibility={handleToggleVisibility}
            onRemoveFromScene={handleRemoveFromScene}
            onSelectPin={setSelectedPinFullName}
            onStartCableConnection={handleStartCableConnection}
            onDeleteCable={handleDeleteCable}
            onUpdateCableColor={handleUpdateCableColor}
            onSelectInstance={(id) => {
              handleSelectInstance(id, false);
              if (id !== null) {
                setIsRightPanelOpen(true);
              }
            }}
            onToggleAttachToDrone={handleToggleAttachToDrone}
            onBatchAttachToDrone={handleBatchAttachToDrone}
            onBatchRemoveFromScene={handleBatchRemoveFromScene}
            onBatchToggleLock={handleBatchToggleLock}
            onBatchDeltaMove={handleBatchDeltaMove}
            onCopySelected={handleCopySelected}
            onPaste={handlePaste}
            hasClipboard={clipboard.length > 0}
            onDeleteSelected={handleDeleteSelected}
            onFlipSelected={handleFlipSelected}
            onUpdateInstanceColor={handleUpdateInstanceColor}
            onApplyColorToAllInstances={handleApplyColorToAllInstances}
            droneColor={droneColor}
            onUpdateDroneColor={handleUpdateDroneColor}
            isDronePlaced={isDronePlaced}
            onToggleDronePresence={handleToggleDronePresence}
            isPlacingPinMode={isPlacingPinMode}
            onTogglePinPlacingMode={handleTogglePinPlacingMode}
            onAddCustomPin={handleAddCustomPin}
            onUpdateCustomPin={handleUpdateCustomPin}
            onDeleteCustomPin={handleDeleteCustomPin}
            onLoadPresetPins={handleLoadPresetPins}
            onBatchUpdateScale={handleBatchUpdateScale}
            selectedCableId={selectedCableId}
            onSelectCable={handleSelectCable}
            onUpdateCable={handleUpdateCable}
            onAddCableRoutePoint={handleAddCableRoutePoint}
            onUpdateCableRoutePoint={handleUpdateCableRoutePoint}
            onDeleteCableRoutePoint={handleDeleteCableRoutePoint}
            onStraightenCable={handleStraightenCable}
            onSwapCableEnds={handleSwapCableEnds}
            onCollapse={() => setIsRightPanelOpen(false)}
            onReloadJetson={handleReloadJetson}
            isReloadingJetson={isReloadingJetson}
            onChangeModel={handleOpenModelImport}
            isIsolatedView={isIsolatedView}
            onToggleIsolatedView={handleToggleIsolatedView}
          />
        )}
      </div>

      {/* Cable Connect Modal */}
      {connectingPin && (
        <CableConnectModal
          sourceInstance={connectingPin.instance}
          sourcePin={connectingPin.pin}
          placedInstances={instances.filter((i) => i.placed)}
          onConnect={handleAddCable}
          onClose={() => setConnectingPin(null)}
        />
      )}

      {/* Keyboard Shortcuts Dialog Modal */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />

      {/* 3D Model Picker & Importer Modal */}
      <ModelImportModal
        isOpen={isModelImportOpen}
        onClose={() => setIsModelImportOpen(false)}
        manifest={manifest}
        defaultComponentId={modelImportTargetId}
        onCreateCustomComponent={handleCreateCustomComponent}
        onSuccess={(componentId, message) => {
          showToast(`✅ ${message}`);
          const now = Date.now();
          setInstances((prev) =>
            prev.map((inst) =>
              inst.componentId === componentId
                ? { ...inst, modelVersion: now }
                : inst
            )
          );
        }}
      />

      {/* Cloud Sync & Multi-Device Modal */}
      <CloudSyncModal
        isOpen={isCloudModalOpen}
        onClose={() => setIsCloudModalOpen(false)}
        currentProject={currentCloudProject}
        onSaveToCloud={handleSaveToCloud}
        onLoadProject={handleApplyCloudProject}
        isSaving={isCloudSaving}
        lastSavedAt={lastCloudSavedAt}
      />

      {/* Toast Notification Alert */}
      {toastMessage && (
        <div className="toast-alert-box" id="app-toast-alert">
          {toastMessage.includes("Xato") || toastMessage.includes("yuklanmadi") ? (
            <AlertTriangle size={18} />
          ) : (
            <CheckCircle2 size={18} />
          )}
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
