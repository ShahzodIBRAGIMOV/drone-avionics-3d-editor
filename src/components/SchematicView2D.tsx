import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  PhysicalInstance,
  CableConnection,
  SceneTheme,
  PinDefinition,
} from "../types";
import { VERIFIED_COMPONENT_DIMENSIONS } from "../data/componentDimensions";
import { COMPONENT_PINS } from "../data/pinDefinitions";
import {
  renderTopDown3DModel,
  getCachedTopDownThumbnail,
  TopDownRenderResult,
} from "../services/topDownRenderer";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Minimize2,
  Download,
  Cpu,
  Zap,
  Eye,
  EyeOff,
  Layers,
  Sparkles,
  Move,
  Activity,
  Split,
  ChevronRight,
  Info,
  Box,
} from "lucide-react";

interface SchematicView2DProps {
  instances: PhysicalInstance[];
  cables: CableConnection[];
  selectedInstanceId: string | null;
  selectedInstanceIds?: string[];
  selectedCableId: string | null;
  onSelectInstance: (id: string | null, isShift?: boolean) => void;
  onSelectCable: (id: string | null) => void;
  droneOpacity?: number;
  sceneTheme?: SceneTheme;
  showCables?: boolean;
  onToggleSplit?: () => void;
  isSplitView?: boolean;
  onToggle3D2D?: () => void;
  dimUnselected?: boolean;
  onToggleDimUnselected?: () => void;
}

interface BlockLayout {
  instanceId: string;
  componentId: string;
  name: string;
  customLabel?: string;
  // Canvas coordinate center (in mm canvas space)
  x: number;
  y: number;
  // Bounding box size (px / canvas mm)
  width: number;
  height: number;
  // Original 3D top-down anchor (X, -Z)
  anchorX: number;
  anchorY: number;
  // Height in 3D (Y position)
  elevationY: number;
  colorHint?: string;
  category: string;
  pins: PinDefinition[];
  yaw: number;
  widthMm: number;
  lengthMm: number;
  heightMm: number;
}

interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  isVertical: boolean;
}

interface RoutedCable {
  cable: CableConnection;
  color: string;
  sourceBlock: BlockLayout;
  targetBlock: BlockLayout;
  segments: Segment[];
  svgPath: string;
  isConnectedToSelection: boolean;
  isDimmed: boolean;
}

interface ComponentTopDownVectorProps {
  componentId: string;
  category: string;
  width: number;
  height: number;
  yaw?: number;
}

const ComponentTopDownVector: React.FC<ComponentTopDownVectorProps> = ({
  componentId,
  category,
  width,
  height,
  yaw = 0,
}) => {
  const halfW = width / 2;
  const halfH = height / 2;
  const minDim = Math.min(width, height);

  return (
    <g transform={yaw ? `rotate(${yaw})` : undefined}>
      {componentId === "02" || category === "fc" ? (
        // Cube Orange Flight Controller
        <g>
          <rect x={-halfW * 0.85} y={-halfH * 0.8} width={width * 0.85} height={height * 0.8} rx={4} fill="#0d1b2a" stroke="#1e3a5f" strokeWidth={1} />
          <rect x={-halfW * 0.8} y={-halfH * 0.75} width={width * 0.8} height={5} fill="#475569" />
          <rect x={-halfW * 0.8} y={halfH * 0.75 - 5} width={width * 0.8} height={5} fill="#475569" />
          <rect x={-minDim * 0.32} y={-minDim * 0.32} width={minDim * 0.64} height={minDim * 0.64} rx={4} fill="#ea580c" stroke="#f97316" strokeWidth={1.5} />
          <polygon points={`0,${-minDim * 0.22} ${-minDim * 0.12},${-minDim * 0.05} ${minDim * 0.12},${-minDim * 0.05}`} fill="#ffffff" />
          <circle cx={0} cy={minDim * 0.1} r={minDim * 0.08} fill="#0f172a" />
          <circle cx={minDim * 0.18} cy={-minDim * 0.18} r={3} fill="#10b981" />
        </g>
      ) : componentId === "03" || category === "gps" ? (
        // Here3 GPS Puck
        <g>
          <circle cx={0} cy={0} r={minDim * 0.42} fill="#0f172a" stroke="#0ea5e9" strokeWidth={1.8} />
          <circle cx={0} cy={0} r={minDim * 0.32} fill="#1e293b" stroke="#38bdf8" strokeWidth={1} strokeDasharray="3 2" />
          <polygon points={`0,${-minDim * 0.28} ${-minDim * 0.12},${-minDim * 0.04} ${minDim * 0.12},${-minDim * 0.04}`} fill="#38bdf8" />
          <polygon points={`0,${minDim * 0.28} ${-minDim * 0.12},${minDim * 0.04} ${minDim * 0.12},${minDim * 0.04}`} fill="#64748b" />
          <circle cx={0} cy={0} r={4} fill="#ffffff" />
        </g>
      ) : componentId === "10" || category === "propulsion" && (componentId.includes("motor") || width <= height * 1.3) ? (
        // Brushless Motor Top View
        <g>
          <path d={`M ${-halfW * 0.85} -4 L ${halfW * 0.85} -4 L ${halfW * 0.85} 4 L ${-halfW * 0.85} 4 Z`} fill="#334155" />
          <path d={`M -4 ${-halfH * 0.85} L 4 ${-halfH * 0.85} L 4 ${halfH * 0.85} L -4 ${halfH * 0.85} Z`} fill="#334155" />
          <circle cx={-halfW * 0.72} cy={0} r={2.5} fill="#0f172a" />
          <circle cx={halfW * 0.72} cy={0} r={2.5} fill="#0f172a" />
          <circle cx={0} cy={-halfH * 0.72} r={2.5} fill="#0f172a" />
          <circle cx={0} cy={halfH * 0.72} r={2.5} fill="#0f172a" />
          <circle cx={0} cy={0} r={minDim * 0.38} fill="#091420" stroke="#f59e0b" strokeWidth={2} />
          <circle cx={0} cy={0} r={minDim * 0.28} fill="none" stroke="#b45309" strokeWidth={3.5} strokeDasharray="4 2" />
          <circle cx={0} cy={0} r={minDim * 0.14} fill="#334155" stroke="#94a3b8" strokeWidth={1} />
          <circle cx={0} cy={0} r={3} fill="#0f172a" />
        </g>
      ) : componentId === "11" || (category === "propulsion" && !componentId.includes("motor")) ? (
        // ESC Electronic Speed Controller
        <g>
          <rect x={-halfW * 0.8} y={-halfH * 0.75} width={width * 0.8} height={height * 0.75} rx={3} fill="#0f172a" stroke="#10b981" strokeWidth={1.5} />
          {[-0.4, -0.2, 0, 0.2, 0.4].map((v, idx) => (
            <line key={idx} x1={-halfW * 0.7} y1={halfH * v} x2={halfW * 0.7} y2={halfH * v} stroke="#334155" strokeWidth={1.5} />
          ))}
          <circle cx={-halfW * 0.5} cy={-halfH * 0.45} r={minDim * 0.12} fill="#0284c7" stroke="#38bdf8" strokeWidth={1} />
          <circle cx={-halfW * 0.2} cy={-halfH * 0.45} r={minDim * 0.12} fill="#0284c7" stroke="#38bdf8" strokeWidth={1} />
          <rect x={halfW * 0.65} y={-4} width={halfW * 0.2} height={8} fill="#ef4444" />
        </g>
      ) : componentId === "12" || category === "servo" ? (
        // Servo Actuator
        <g>
          <rect x={-halfW * 0.85} y={-halfH * 0.65} width={width * 0.85} height={height * 0.65} rx={2} fill="#1e293b" stroke="#64748b" strokeWidth={1.2} />
          <rect x={-halfW * 0.95} y={-halfH * 0.45} width={halfW * 0.2} height={height * 0.45} fill="#0f172a" stroke="#475569" strokeWidth={1} />
          <rect x={halfW * 0.75} y={-halfH * 0.45} width={halfW * 0.2} height={height * 0.45} fill="#0f172a" stroke="#475569" strokeWidth={1} />
          <circle cx={-halfW * 0.25} cy={0} r={minDim * 0.25} fill="#eab308" stroke="#ca8a04" strokeWidth={1.5} />
          <circle cx={-halfW * 0.25} cy={0} r={3} fill="#713f12" />
        </g>
      ) : category === "power" || componentId === "08" || componentId === "09" ? (
        // LiPo Battery / Power Unit
        <g>
          <rect x={-halfW * 0.85} y={-halfH * 0.75} width={width * 0.85} height={height * 0.75} rx={3} fill="#0b1e33" stroke="#0284c7" strokeWidth={1.5} />
          {[-0.45, -0.15, 0.15, 0.45].map((xRatio, i) => (
            <line key={i} x1={halfW * xRatio} y1={-halfH * 0.7} x2={halfW * xRatio} y2={halfH * 0.7} stroke="#1e3a5f" strokeWidth={1.2} strokeDasharray="3 2" />
          ))}
          <rect x={halfW * 0.75} y={-6} width={halfW * 0.22} height={12} rx={2} fill="#eab308" stroke="#ca8a04" strokeWidth={1} />
          <polygon points={`0,-6 -6,3 0,3 -2,8 6,-1 1,-1 4,-6`} fill="#f59e0b" />
        </g>
      ) : componentId === "04" || category === "datalink" ? (
        // Datalink / Telemetry Unit
        <g>
          <rect x={-halfW * 0.8} y={-halfH * 0.7} width={width * 0.8} height={height * 0.7} rx={3} fill="#111c2a" stroke="#f59e0b" strokeWidth={1.2} />
          <rect x={-halfW * 0.5} y={-halfH * 0.85} width={10} height={6} fill="#eab308" stroke="#ca8a04" strokeWidth={1} />
          <rect x={halfW * 0.5 - 10} y={-halfH * 0.85} width={10} height={6} fill="#eab308" stroke="#ca8a04" strokeWidth={1} />
          <path d={`M -12,0 A 12,12 0 0,1 12,0`} fill="none" stroke="#f59e0b" strokeWidth={1.5} />
          <path d={`M -20,-5 A 20,20 0 0,1 20,-5`} fill="none" stroke="#f59e0b" strokeWidth={1.2} opacity={0.6} />
        </g>
      ) : componentId === "05" || componentId === "19" || category === "payload" ? (
        // Camera / Jetson SBC
        <g>
          <rect x={-halfW * 0.85} y={-halfH * 0.75} width={width * 0.85} height={height * 0.75} rx={3} fill="#062e24" stroke="#10b981" strokeWidth={1.2} />
          <circle cx={0} cy={0} r={minDim * 0.28} fill="#0f172a" stroke="#34d399" strokeWidth={1.5} />
          <circle cx={0} cy={0} r={minDim * 0.18} fill="#0284c7" stroke="#38bdf8" strokeWidth={1} />
          <circle cx={minDim * 0.06} cy={-minDim * 0.06} r={minDim * 0.05} fill="#ffffff" opacity={0.7} />
        </g>
      ) : (
        // Generic Precision Avionics Unit
        <g>
          <rect x={-halfW * 0.8} y={-halfH * 0.7} width={width * 0.8} height={height * 0.7} rx={3} fill="#0f172a" stroke="#38bdf8" strokeWidth={1} />
          <rect x={-minDim * 0.2} y={-minDim * 0.2} width={minDim * 0.4} height={minDim * 0.4} fill="#1e293b" stroke="#475569" strokeWidth={1} />
          <circle cx={0} cy={0} r={3} fill="#0ea5e9" />
        </g>
      )}
    </g>
  );
};

export const SchematicView2D: React.FC<SchematicView2DProps> = ({
  instances,
  cables,
  selectedInstanceId,
  selectedInstanceIds = [],
  selectedCableId,
  onSelectInstance,
  onSelectCable,
  droneOpacity = 1,
  sceneTheme = "dark",
  showCables = true,
  onToggleSplit,
  isSplitView = true,
  onToggle3D2D,
  dimUnselected = false,
  onToggleDimUnselected,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Top-down rendered thumbnails of real 3D models
  const [topDownImages, setTopDownImages] = useState<Record<string, TopDownRenderResult>>({});

  // Schematic view transform (Pan & Zoom)
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(0.32);
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [startPan, setStartPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Feature toggles
  const [showAirframe, setShowAirframe] = useState<boolean>(true);
  const [showWireBridges, setShowWireBridges] = useState<boolean>(true);
  const [showPinLabels, setShowPinLabels] = useState<boolean>(true);
  const [hoveredCableId, setHoveredCableId] = useState<string | null>(null);
  const [hoveredInstanceId, setHoveredInstanceId] = useState<string | null>(null);

  // Pre-render and cache real 3D models for top-down display
  useEffect(() => {
    let isMounted = true;
    const placed = instances.filter((i) => i.componentId !== "01");
    const idsToRender = Array.from(new Set(placed.map((i) => i.componentId)));
    if (showAirframe) {
      idsToRender.push("01"); // Drone Airframe model
    }

    idsToRender.forEach(async (id) => {
      const cached = getCachedTopDownThumbnail(id);
      if (cached) {
        if (isMounted) {
          setTopDownImages((prev) => (prev[id] ? prev : { ...prev, [id]: cached }));
        }
        return;
      }
      try {
        const res = await renderTopDown3DModel(id);
        if (res && isMounted) {
          setTopDownImages((prev) => ({ ...prev, [id]: res }));
        }
      } catch (err) {
        console.warn(`Failed to render top-down 3D model for component ${id}:`, err);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [instances, showAirframe]);

  // Manual layout offsets: user can drag individual blocks in 2D if desired
  const [manualOffsets, setManualOffsets] = useState<Record<string, { x: number; y: number }>>({});
  const [draggingBlockId, setDraggingBlockId] = useState<string | null>(null);
  const [dragStartPos, setDragStartPos] = useState<{ mouseX: number; mouseY: number; initialX: number; initialY: number } | null>(null);
  const [layoutTicket, setLayoutTicket] = useState<number>(0);

  // Effective selected instances
  const effectiveSelectedIds = useMemo(() => {
    if (selectedInstanceIds.length > 0) return selectedInstanceIds;
    if (selectedInstanceId) return [selectedInstanceId];
    return [];
  }, [selectedInstanceId, selectedInstanceIds]);

  // Connected instances map
  const connectedInstanceIds = useMemo(() => {
    if (effectiveSelectedIds.length === 0) return new Set<string>();
    const set = new Set<string>();
    cables.forEach((c) => {
      if (effectiveSelectedIds.includes(c.sourceInstanceId)) {
        set.add(c.targetInstanceId);
      }
      if (effectiveSelectedIds.includes(c.targetInstanceId)) {
        set.add(c.sourceInstanceId);
      }
    });
    return set;
  }, [effectiveSelectedIds, cables]);

  // Filter placed components (exclude drone airframe '01')
  const placedInstances = useMemo(() => {
    return instances.filter(
      (inst) => inst.placed && !inst.isAirframe && inst.componentId !== "01"
    );
  }, [instances]);

  // --------------------------------------------------------------------------
  // ANTI-OVERLAP RELAXATION ALGORITHM
  // Ensures components never overlap in 2D even when stacked in 3D along Y
  // --------------------------------------------------------------------------
  const computedBlocks = useMemo(() => {
    if (placedInstances.length === 0) return [];

    // Step 1: Initialize block metadata
    const blocks: BlockLayout[] = placedInstances.map((inst) => {
      const dim = VERIFIED_COMPONENT_DIMENSIONS[inst.componentId];
      // Physical dimensions: X=Width, Y=Height, Z=Length
      const dimX = dim ? dim.nominalMm[0] : 80;
      const dimY = dim ? dim.nominalMm[1] : 30;
      const dimZ = dim ? dim.nominalMm[2] : 60;

      // Base card width & height (in mm canvas units)
      // Generous footprint accommodates realistic top-down 3D model render + header + pins
      const width = Math.max(128, Math.min(230, dimX * 1.15));
      const height = Math.max(88, Math.min(170, dimZ * 1.15));

      // 3D coordinates: X is lateral (Left/Right), Z is longitudinal (Nose/Tail)
      // In top-down 2D canvas:
      // X maps from 3D X
      // Y maps from 3D -Z (so +Z Nose points UP towards -Y screen)
      const anchorX = inst.position[0];
      const anchorY = -inst.position[2];
      const yaw = inst.rotation ? inst.rotation[1] : 0;

      // Pins definition
      const pins = inst.customPins || COMPONENT_PINS[inst.componentId] || [];

      // Categorize for coloring
      let category = "avionics";
      const nameLower = (inst.name + " " + (inst.customLabel || "")).toLowerCase();
      if (inst.componentId === "02" || nameLower.includes("cube") || nameLower.includes("flight controller")) {
        category = "fc";
      } else if (inst.componentId === "03" || nameLower.includes("gps") || nameLower.includes("here3")) {
        category = "gps";
      } else if (inst.componentId === "04" || nameLower.includes("siyi") || nameLower.includes("datalink") || nameLower.includes("telemetry")) {
        category = "datalink";
      } else if (nameLower.includes("esc") || nameLower.includes("motor") || nameLower.includes("dvigatel")) {
        category = "propulsion";
      } else if (nameLower.includes("battery") || nameLower.includes("lipo") || nameLower.includes("ubec") || nameLower.includes("mauch") || nameLower.includes("quvvat")) {
        category = "power";
      } else if (nameLower.includes("servo") || nameLower.includes("eleron") || nameLower.includes("ruder") || nameLower.includes("flap")) {
        category = "servo";
      } else if (nameLower.includes("jetson") || nameLower.includes("kamera") || nameLower.includes("camera") || nameLower.includes("lidar")) {
        category = "payload";
      }

      return {
        instanceId: inst.instanceId,
        componentId: inst.componentId,
        name: inst.name,
        customLabel: inst.customLabel,
        x: anchorX,
        y: anchorY,
        width,
        height,
        anchorX,
        anchorY,
        elevationY: inst.position[1],
        colorHint: inst.customColor || inst.colorHint,
        category,
        pins,
        yaw,
        widthMm: dimX,
        lengthMm: dimZ,
        heightMm: dimY,
      };
    });

    // Step 2: Detect vertically stacked components in 3D (very close X & Z)
    // and apply an initial smart dispersal before relaxation
    const stackGroups: BlockLayout[][] = [];
    const visited = new Set<string>();

    for (let i = 0; i < blocks.length; i++) {
      if (visited.has(blocks[i].instanceId)) continue;
      const group: BlockLayout[] = [blocks[i]];
      visited.add(blocks[i].instanceId);

      for (let j = i + 1; j < blocks.length; j++) {
        if (visited.has(blocks[j].instanceId)) continue;
        const dx = blocks[i].anchorX - blocks[j].anchorX;
        const dy = blocks[i].anchorY - blocks[j].anchorY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 45) {
          group.push(blocks[j]);
          visited.add(blocks[j].instanceId);
        }
      }

      if (group.length > 1) {
        stackGroups.push(group);
      }
    }

    // Spread stacked groups neatly
    stackGroups.forEach((group) => {
      // Sort by 3D elevation Y (higher items on top/right)
      group.sort((a, b) => b.elevationY - a.elevationY);
      const count = group.length;
      group.forEach((block, idx) => {
        // Vertical or radial step
        const offsetStep = (idx - (count - 1) / 2) * (block.height + 22);
        block.y += offsetStep;
      });
    });

    // Step 3: Iterative Bounding Box Separation Relaxation
    const ITERATIONS = 28;
    const MIN_GAP = 24; // mm margin between module cards

    for (let iter = 0; iter < ITERATIONS; iter++) {
      for (let i = 0; i < blocks.length; i++) {
        for (let j = i + 1; j < blocks.length; j++) {
          const b1 = blocks[i];
          const b2 = blocks[j];

          const dx = b2.x - b1.x;
          const dy = b2.y - b1.y;

          const requiredDistX = (b1.width + b2.width) / 2 + MIN_GAP;
          const requiredDistY = (b1.height + b2.height) / 2 + MIN_GAP;

          const overlapX = requiredDistX - Math.abs(dx);
          const overlapY = requiredDistY - Math.abs(dy);

          // If overlapping in both dimensions
          if (overlapX > 0 && overlapY > 0) {
            // Push along axis of minimum penetration
            if (overlapX < overlapY) {
              const sign = dx >= 0 ? 1 : -1;
              const push = (overlapX / 2) * 0.75;
              b1.x -= sign * push;
              b2.x += sign * push;
            } else {
              const sign = dy >= 0 ? 1 : -1;
              const push = (overlapY / 2) * 0.75;
              b1.y -= sign * push;
              b2.y += sign * push;
            }
          }
        }
      }

      // Anchor attraction: pull gently back towards original 3D anchor position
      // so components don't stray far from their actual drone section
      const ANCHOR_PULL = 0.12;
      for (let i = 0; i < blocks.length; i++) {
        const b = blocks[i];
        b.x += (b.anchorX - b.x) * ANCHOR_PULL;
        b.y += (b.anchorY - b.y) * ANCHOR_PULL;
      }
    }

    // Step 4: Apply user manual drags if any
    blocks.forEach((b) => {
      const manual = manualOffsets[b.instanceId];
      if (manual) {
        b.x += manual.x;
        b.y += manual.y;
      }
    });

    return blocks;
  }, [placedInstances, manualOffsets, layoutTicket]);

  // Fast lookup map of block by instanceId
  const blockMap = useMemo(() => {
    const map = new Map<string, BlockLayout>();
    computedBlocks.forEach((b) => map.set(b.instanceId, b));
    return map;
  }, [computedBlocks]);

  // --------------------------------------------------------------------------
  // CABLE MANHATTAN ROUTING & SEMICIRCULAR JUMP-OVER ARCS
  // --------------------------------------------------------------------------
  const routedCables = useMemo(() => {
    if (!showCables || cables.length === 0) return [];

    // Phase 1: Compute orthogonal Manhattan segments for each cable
    interface TempCableRoute {
      cable: CableConnection;
      color: string;
      sourceBlock: BlockLayout;
      targetBlock: BlockLayout;
      segments: Segment[];
      isConnectedToSelection: boolean;
      isDimmed: boolean;
    }

    const tempRoutes: TempCableRoute[] = [];

    cables.forEach((c, cIdx) => {
      const srcBlock = blockMap.get(c.sourceInstanceId);
      const tgtBlock = blockMap.get(c.targetInstanceId);
      if (!srcBlock || !tgtBlock) return;

      const isConnectedToSelection =
        effectiveSelectedIds.length > 0 &&
        (effectiveSelectedIds.includes(c.sourceInstanceId) ||
          effectiveSelectedIds.includes(c.targetInstanceId));
      const isDimmed = dimUnselected && effectiveSelectedIds.length > 0 && !isConnectedToSelection;

      // Determine wire anchor ports on component edges
      const dx = tgtBlock.x - srcBlock.x;
      const dy = tgtBlock.y - srcBlock.y;

      let p1x: number;
      let p1y: number;
      let norm1x = 0;
      let norm1y = 0;

      let p2x: number;
      let p2y: number;
      let norm2x = 0;
      let norm2y = 0;

      // Exit from srcBlock edge facing towards target
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 0) {
          p1x = srcBlock.x + srcBlock.width / 2;
          p1y = srcBlock.y;
          norm1x = 1;
        } else {
          p1x = srcBlock.x - srcBlock.width / 2;
          p1y = srcBlock.y;
          norm1x = -1;
        }
      } else {
        if (dy > 0) {
          p1x = srcBlock.x;
          p1y = srcBlock.y + srcBlock.height / 2;
          norm1y = 1;
        } else {
          p1x = srcBlock.x;
          p1y = srcBlock.y - srcBlock.height / 2;
          norm1y = -1;
        }
      }

      // Enter into tgtBlock edge facing source
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 0) {
          p2x = tgtBlock.x - tgtBlock.width / 2;
          p2y = tgtBlock.y;
          norm2x = -1;
        } else {
          p2x = tgtBlock.x + tgtBlock.width / 2;
          p2y = tgtBlock.y;
          norm2x = 1;
        }
      } else {
        if (dy > 0) {
          p2x = tgtBlock.x;
          p2y = tgtBlock.y - tgtBlock.height / 2;
          norm2y = -1;
        } else {
          p2x = tgtBlock.x;
          p2y = tgtBlock.y + tgtBlock.height / 2;
          norm2y = 1;
        }
      }

      // Stubs extending perpendicular from box edge
      const STUB = 18;
      const s1x = p1x + norm1x * STUB;
      const s1y = p1y + norm1y * STUB;
      const s2x = p2x + norm2x * STUB;
      const s2y = p2y + norm2y * STUB;

      // Lane offset to prevent parallel wires from overlapping on the exact same coordinate
      const laneOffset = ((cIdx * 9) % 27) - 13;

      const segments: Segment[] = [];
      const addSeg = (x1: number, y1: number, x2: number, y2: number) => {
        const isVert = Math.abs(x1 - x2) < 0.001;
        segments.push({ x1, y1, x2, y2, isVertical: isVert });
      };

      // 1. Initial stub
      addSeg(p1x, p1y, s1x, s1y);

      // 2. Manhattan orthogonal path between stubs
      if (norm1x !== 0 && norm2x !== 0) {
        // Both horizontal exits
        const midX = (s1x + s2x) / 2 + laneOffset;
        addSeg(s1x, s1y, midX, s1y);
        addSeg(midX, s1y, midX, s2y);
        addSeg(midX, s2y, s2x, s2y);
      } else if (norm1y !== 0 && norm2y !== 0) {
        // Both vertical exits
        const midY = (s1y + s2y) / 2 + laneOffset;
        addSeg(s1x, s1y, s1x, midY);
        addSeg(s1x, midY, s2x, midY);
        addSeg(s2x, midY, s2x, s2y);
      } else if (norm1x !== 0) {
        // Exits horizontally, enters vertically
        addSeg(s1x, s1y, s2x, s1y);
        addSeg(s2x, s1y, s2x, s2y);
      } else {
        // Exits vertically, enters horizontally
        addSeg(s1x, s1y, s1x, s2y);
        addSeg(s1x, s2y, s2x, s2y);
      }

      // 3. Final entry stub
      addSeg(s2x, s2y, p2x, p2y);

      tempRoutes.push({
        cable: c,
        color: c.color || "#00e5ff",
        sourceBlock: srcBlock,
        targetBlock: tgtBlock,
        segments,
        isConnectedToSelection,
        isDimmed,
      });
    });

    // Phase 2: Calculate wire crossings and insert Semicircular Jump-Over Arcs
    // An arc jumps over crossing wires: 'A R R 0 0 0 (x2, y2)'
    const ARC_RADIUS = 7; // radius of jump-over arc in canvas mm

    const finalRoutes: RoutedCable[] = tempRoutes.map((route, rIdx) => {
      // Build SVG path with bridge arcs
      let pathCommands = "";

      route.segments.forEach((seg, sIdx) => {
        const { x1, y1, x2, y2, isVertical } = seg;

        if (sIdx === 0) {
          pathCommands += `M ${x1.toFixed(1)} ${y1.toFixed(1)} `;
        }

        if (!showWireBridges) {
          // If bridges are toggled off, draw straight line
          pathCommands += `L ${x2.toFixed(1)} ${y2.toFixed(1)} `;
          return;
        }

        // We jump over when this segment is horizontal (crossing vertical wires of OTHER cables)
        if (!isVertical) {
          const y = y1;
          const minX = Math.min(x1, x2);
          const maxX = Math.max(x1, x2);
          const isForward = x2 >= x1;

          // Find intersections with all vertical segments from other routes (or lower indexed)
          const intersections: number[] = [];

          tempRoutes.forEach((otherRoute, oIdx) => {
            if (oIdx === rIdx) return; // ignore self segments
            otherRoute.segments.forEach((otherSeg) => {
              if (otherSeg.isVertical) {
                const vx = otherSeg.x1;
                const vMinY = Math.min(otherSeg.y1, otherSeg.y2);
                const vMaxY = Math.max(otherSeg.y1, otherSeg.y2);

                // Check if they intersect inside the segment interior
                if (vx > minX + ARC_RADIUS && vx < maxX - ARC_RADIUS) {
                  if (y > vMinY + 4 && y < vMaxY - 4) {
                    intersections.push(vx);
                  }
                }
              }
            });
          });

          // Sort intersections along the direction of traversal
          if (isForward) {
            intersections.sort((a, b) => a - b);
          } else {
            intersections.sort((a, b) => b - a);
          }

          if (intersections.length === 0) {
            pathCommands += `L ${x2.toFixed(1)} ${y2.toFixed(1)} `;
          } else {
            // Draw segment with semicircular arches jumping over the vertical wires
            let currentX = x1;
            intersections.forEach((ix) => {
              const beforeX = isForward ? ix - ARC_RADIUS : ix + ARC_RADIUS;
              const afterX = isForward ? ix + ARC_RADIUS : ix - ARC_RADIUS;

              pathCommands += `L ${beforeX.toFixed(1)} ${y.toFixed(1)} `;
              // Semicircular arc jumping up (sweep-flag 0 or 1 depending on direction)
              // Radius ARC_RADIUS x ARC_RADIUS
              const sweep = isForward ? 0 : 1;
              pathCommands += `A ${ARC_RADIUS} ${ARC_RADIUS} 0 0 ${sweep} ${afterX.toFixed(1)} ${y.toFixed(1)} `;
              currentX = afterX;
            });
            pathCommands += `L ${x2.toFixed(1)} ${y2.toFixed(1)} `;
          }
        } else {
          // Vertical segments stay straight (the horizontal segments jump over them!)
          pathCommands += `L ${x2.toFixed(1)} ${y2.toFixed(1)} `;
        }
      });

      return {
        ...route,
        svgPath: pathCommands,
      };
    });

    return finalRoutes;
  }, [cables, blockMap, showCables, showWireBridges, effectiveSelectedIds]);

  // --------------------------------------------------------------------------
  // INTERACTION: PAN & ZOOM
  // --------------------------------------------------------------------------
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    setZoom((prev) => Math.max(0.12, Math.min(2.5, prev * zoomFactor)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // If clicking on background, begin canvas panning
    if ((e.target as HTMLElement).tagName === "svg" || (e.target as HTMLElement).id === "schematic-bg-rect") {
      setIsPanning(true);
      setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      onSelectInstance(null);
      onSelectCable(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - startPan.x,
        y: e.clientY - startPan.y,
      });
    } else if (draggingBlockId && dragStartPos) {
      const deltaX = (e.clientX - dragStartPos.mouseX) / zoom;
      const deltaY = (e.clientY - dragStartPos.mouseY) / zoom;
      setManualOffsets((prev) => ({
        ...prev,
        [draggingBlockId]: {
          x: dragStartPos.initialX + deltaX,
          y: dragStartPos.initialY + deltaY,
        },
      }));
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggingBlockId(null);
    setDragStartPos(null);
  };

  const handleResetView = () => {
    setPan({ x: 0, y: 0 });
    setZoom(0.35);
  };

  const handleReRunRelaxation = () => {
    setManualOffsets({});
    setLayoutTicket((prev) => prev + 1);
  };

  // Export 2D Schematic as SVG or PNG
  const handleExportSVG = () => {
    if (!svgRef.current) return;
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svgRef.current);
    const blob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `drone_avionics_2d_schematic_${Date.now()}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      ref={containerRef}
      className="schematic-view-2d-root relative w-full h-full flex flex-col bg-[#070e17] text-slate-200 select-none overflow-hidden border-l border-slate-800"
      id="schematic-view-2d-container"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Top 2D Header & Controls Bar */}
      <div className="schematic-top-bar flex items-center justify-between px-3 py-1.5 bg-slate-900/95 border-b border-slate-800/90 z-20 shrink-0 text-xs">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-medium">
            <Cpu size={13} className="text-cyan-400" />
            <span>2D Sxema (Top-Down)</span>
          </div>

          <span className="text-[11px] text-slate-400 hidden sm:inline">
            {computedBlocks.length} modul • {routedCables.length} kabel
          </span>
        </div>

        {/* Feature Toggles & Action Buttons */}
        <div className="flex items-center gap-1.5">
          {/* Bitta tugma orqali 3D Sahnaga o‘tish */}
          {onToggle3D2D && (
            <button
              type="button"
              id="btn-schematic-toggle-3d"
              onClick={onToggle3D2D}
              className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-xs shadow-md shadow-cyan-500/25 border border-cyan-400/80 transition-all active:scale-95 cursor-pointer mr-1"
              title="3D Sahnaga o‘tish (Bitta bosish / Klaviatura: [2])"
            >
              <Box size={13} className="text-cyan-200" />
              <span>🧊 3D Sahnaga o‘tish</span>
              <kbd className="text-[10px] px-1 py-0.2 rounded bg-black/40 text-cyan-200 font-mono">
                2
              </kbd>
            </button>
          )}

          {/* Dim Unselected / Full View Mode Toggle */}
          {onToggleDimUnselected && (
            <button
              type="button"
              id="btn-schematic-toggle-dim-unselected"
              onClick={onToggleDimUnselected}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] transition-all border ${
                dimUnselected
                  ? "bg-amber-950/70 border-amber-500/50 text-amber-200 shadow-sm"
                  : "bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200"
              }`}
              title={
                dimUnselected
                  ? "Fokus faol: Tanlanmagan elementlar kulrang qilinadi [D]. Barchasini ko‘rsatish uchun bosing"
                  : "Barcha elementlar to‘liq ko‘rinadi [D]. Kulrang rejimni yoqish uchun bosing"
              }
            >
              {dimUnselected ? (
                <EyeOff size={12} className="text-amber-400" />
              ) : (
                <Eye size={12} className="text-cyan-400" />
              )}
              <span className="hidden md:inline">Kulrang rejim:</span>
              <span>{dimUnselected ? "On" : "Off"}</span>
            </button>
          )}

          {/* Wire Bridge / Jump-over Toggle */}
          <button
            type="button"
            onClick={() => setShowWireBridges((prev) => !prev)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] transition-all border ${
              showWireBridges
                ? "bg-cyan-900/60 border-cyan-500/50 text-cyan-200 shadow-sm"
                : "bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200"
            }`}
            title={
              showWireBridges
                ? "Yarim dumaloq ko‘priklar (Wire Bridges) faol. O‘chirish uchun bosing"
                : "Oddiy to‘g‘ri kesishuvlar. Yarim dumaloq ko‘priklarni yoqish uchun bosing"
            }
          >
            <Activity size={12} className={showWireBridges ? "text-cyan-400" : ""} />
            <span className="hidden md:inline">Ko‘priklar:</span>
            <span>{showWireBridges ? "On" : "Off"}</span>
          </button>

          {/* Drone Airframe Silhouette Toggle */}
          <button
            type="button"
            onClick={() => setShowAirframe((prev) => !prev)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] transition-all border ${
              showAirframe
                ? "bg-blue-950/70 border-blue-500/40 text-blue-200"
                : "bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200"
            }`}
            title="Dron korpusi va qanotlar konturi"
          >
            <Eye size={12} />
            <span className="hidden lg:inline">Dron frame</span>
          </button>

          {/* Auto-Disperse / Relaxation Button */}
          <button
            type="button"
            onClick={handleReRunRelaxation}
            className="flex items-center gap-1 px-2 py-1 rounded text-[11px] bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white transition-all active:scale-95"
            title="Elementlarni ustma-ust tushmasligi uchun qayta tartiblash va ajratish"
          >
            <Sparkles size={12} className="text-amber-400" />
            <span className="hidden lg:inline">Avto-ajratish</span>
          </button>

          {/* Zoom controls */}
          <div className="flex items-center bg-slate-800/80 rounded border border-slate-700/80 p-0.5">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(2.5, z * 1.2))}
              className="p-1 hover:bg-slate-700 rounded text-slate-300 hover:text-white"
              title="Kattalashtirish (Zoom In)"
            >
              <ZoomIn size={12} />
            </button>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.12, z / 1.2))}
              className="p-1 hover:bg-slate-700 rounded text-slate-300 hover:text-white"
              title="Kichiklashtirish (Zoom Out)"
            >
              <ZoomOut size={12} />
            </button>
            <button
              type="button"
              onClick={handleResetView}
              className="p-1 hover:bg-slate-700 rounded text-slate-300 hover:text-white"
              title="Markazga qaytarish (Reset View)"
            >
              <RotateCcw size={12} />
            </button>
          </div>

          {/* Export SVG */}
          <button
            type="button"
            onClick={handleExportSVG}
            className="flex items-center gap-1 px-2 py-1 rounded text-[11px] bg-emerald-950/70 hover:bg-emerald-900/90 border border-emerald-500/40 text-emerald-300 transition-all active:scale-95"
            title="2D Sxemani vektor SVG sifatida yuklab olish"
          >
            <Download size={12} />
            <span className="hidden xl:inline">SVG</span>
          </button>

          {/* Split / Maximize toggle */}
          {onToggleSplit && (
            <button
              type="button"
              onClick={onToggleSplit}
              className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white border border-slate-700/60 transition-all"
              title={isSplitView ? "To‘liq ekranga kengaytirish" : "3D bilan yonma-yon bo‘lish (Split)"}
            >
              {isSplitView ? <Maximize2 size={13} /> : <Split size={13} />}
            </button>
          )}
        </div>
      </div>

      {/* Main SVG Schematic Canvas */}
      <div className="relative flex-1 w-full h-full overflow-hidden cursor-crosshair">
        <svg
          ref={svgRef}
          className="w-full h-full absolute inset-0"
          id="drone-schematic-svg"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Fine Grid Pattern */}
            <pattern id="schematic-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#172635" strokeWidth="0.8" />
              <circle cx="0" cy="0" r="1.2" fill="#203a4c" />
            </pattern>

            {/* Minor Dot Grid */}
            <pattern id="schematic-dots" width="10" height="10" patternUnits="userSpaceOnUse">
              <circle cx="5" cy="5" r="0.5" fill="#132332" />
            </pattern>

            {/* Glowing filter for selected elements */}
            <filter id="cyan-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            <filter id="emerald-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background capture rectangle */}
          <rect
            id="schematic-bg-rect"
            width="100%"
            height="100%"
            fill="#060e16"
            stroke="none"
          />

          {/* Transformable Canvas Group */}
          <g
            transform={`translate(${containerRef.current ? containerRef.current.clientWidth / 2 + pan.x : pan.x}, ${
              containerRef.current ? containerRef.current.clientHeight / 2 + pan.y : pan.y
            }) scale(${zoom})`}
          >
            {/* Infinite Coordinate Grid */}
            <rect
              x="-4000"
              y="-3000"
              width="8000"
              height="6000"
              fill="url(#schematic-grid)"
              opacity="0.85"
            />

            {/* Center Axes (X and Y) */}
            <line x1="-3500" y1="0" x2="3500" y2="0" stroke="#1a354a" strokeWidth="1.5" strokeDasharray="8 6" />
            <line x1="0" y1="-2500" x2="0" y2="2500" stroke="#1a354a" strokeWidth="1.5" strokeDasharray="8 6" />

            {/* Center of Gravity (CoG) Symbol */}
            <g transform="translate(0, 0)">
              <circle cx="0" cy="0" r="14" fill="none" stroke="#00e5ff" strokeWidth="1.5" opacity="0.6" />
              <path d="M 0 -14 A 14 14 0 0 1 14 0 L 0 0 Z" fill="#00e5ff" opacity="0.25" />
              <path d="M 0 14 A 14 14 0 0 1 -14 0 L 0 0 Z" fill="#00e5ff" opacity="0.25" />
              <text x="18" y="4" fill="#38bdf8" fontSize="10" fontFamily="monospace" opacity="0.7">
                CG (0,0)
              </text>
            </g>

            {/* Forward (Nose) Direction Pointer */}
            <g transform="translate(0, -1350)">
              <polygon points="0,-35 15,0 0,-10 -15,0" fill="#00e5ff" opacity="0.8" />
              <text x="0" y="-45" fill="#38bdf8" fontSize="13" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                ▲ OLD TOMON (BURUN / NOSE)
              </text>
            </g>

            {/* ========================================================== */}
            {/* 1. DRONE FRAME SILHOUETTE & REAL 3D MODEL (UAV 3800mm)     */}
            {/* ========================================================== */}
            {showAirframe && (
              <g className="drone-airframe-group">
                {/* Real 3D Drone Model Top-Down Render if loaded */}
                {topDownImages["01"] && topDownImages["01"].dataUrl && (
                  <image
                    href={topDownImages["01"].dataUrl}
                    x={-1900}
                    y={-1275}
                    width={3800}
                    height={2550}
                    preserveAspectRatio="xMidYMid meet"
                    opacity={droneOpacity * 0.88}
                    className="pointer-events-none"
                  />
                )}

                <g className="drone-airframe-silhouette" opacity={droneOpacity * (topDownImages["01"] ? 0.35 : 0.75)}>
                  {/* Central Fuselage (Avionics bay) */}
                <path
                  d="
                    M -110 -950
                    Q 0 -1250 110 -950
                    L 125 450
                    Q 85 980 0 1100
                    Q -85 980 -125 450
                    Z
                  "
                  fill="#0b1c2b"
                  stroke="#1c4564"
                  strokeWidth="2.5"
                />

                {/* Cockpit / Canopy Glass Hatch */}
                <path
                  d="M -70 -750 Q 0 -920 70 -750 L 60 -450 Q 0 -480 -60 -450 Z"
                  fill="#0e283d"
                  stroke="#265a80"
                  strokeWidth="1.5"
                  strokeDasharray="4 3"
                />

                {/* Main Wings (Wingspan 3800mm: X = -1900 to +1900) */}
                {/* Left Wing */}
                <path
                  d="
                    M -120 -280
                    L -1880 -160
                    L -1900 80
                    L -115 190
                    Z
                  "
                  fill="#081622"
                  stroke="#193f5c"
                  strokeWidth="2"
                />
                {/* Left Aileron & Flap zones */}
                <line x1="-1850" y1="40" x2="-1200" y2="60" stroke="#255173" strokeWidth="1.2" strokeDasharray="5 3" />
                <line x1="-1150" y1="65" x2="-650" y2="90" stroke="#255173" strokeWidth="1.2" strokeDasharray="5 3" />

                {/* Right Wing */}
                <path
                  d="
                    M 120 -280
                    L 1880 -160
                    L 1900 80
                    L 115 190
                    Z
                  "
                  fill="#081622"
                  stroke="#193f5c"
                  strokeWidth="2"
                />
                {/* Right Aileron & Flap zones */}
                <line x1="1850" y1="40" x2="1200" y2="60" stroke="#255173" strokeWidth="1.2" strokeDasharray="5 3" />
                <line x1="1150" y1="65" x2="650" y2="90" stroke="#255173" strokeWidth="1.2" strokeDasharray="5 3" />

                {/* Twin Motor Nacelles & Propeller Rotation Discs */}
                {/* Left Motor Nacelle at X = -520 */}
                <rect x="-560" y="-120" width="80" height="240" rx="14" fill="#0d2436" stroke="#235478" strokeWidth="1.8" />
                <circle cx="-520" cy="-180" r="140" fill="none" stroke="#00e5ff" strokeWidth="1" strokeDasharray="6 6" opacity="0.35" />
                <text x="-520" y="-210" fill="#00e5ff" fontSize="10" textAnchor="middle" opacity="0.6">
                  Chap Propeller (20")
                </text>

                {/* Right Motor Nacelle at X = +520 */}
                <rect x="480" y="-120" width="80" height="240" rx="14" fill="#0d2436" stroke="#235478" strokeWidth="1.8" />
                <circle cx="520" cy="-180" r="140" fill="none" stroke="#00e5ff" strokeWidth="1" strokeDasharray="6 6" opacity="0.35" />
                <text x="520" y="-210" fill="#00e5ff" fontSize="10" textAnchor="middle" opacity="0.6">
                  O‘ng Propeller (20")
                </text>

                {/* Twin Tail Booms & Horizontal Stabilizer (Aft at Y = +900 to +1100) */}
                <line x1="-520" y1="120" x2="-450" y2="980" stroke="#1c4564" strokeWidth="6" />
                <line x1="520" y1="120" x2="450" y2="980" stroke="#1c4564" strokeWidth="6" />
                {/* Tail Wing */}
                <path
                  d="M -540 940 L 540 940 L 520 1060 L -520 1060 Z"
                  fill="#0b1b28"
                  stroke="#1c4564"
                  strokeWidth="2"
                />

                {/* Frame Dimension Annotations */}
                <text x="-1850" y="-180" fill="#2c5a7d" fontSize="11" fontFamily="monospace">
                  ◄ QANOT ENI: 3800 mm ►
                </text>
                <text x="180" y="850" fill="#2c5a7d" fontSize="11" fontFamily="monospace">
                  ▲ BO‘YI: 2550 mm
                </text>
              </g>
            </g>
            )}

            {/* ========================================================== */}
            {/* 2. CABLES (Orthogonal Manhattan + Semicircular Wire Bridges) */}
            {/* ========================================================== */}
            <g className="schematic-cables-layer">
              {routedCables.map((rc) => {
                const isSelected = rc.cable.id === selectedCableId;
                const isHovered = rc.cable.id === hoveredCableId;
                const isHighlit = isSelected || isHovered || rc.isConnectedToSelection;

                // Color calculation
                let strokeColor = rc.color;
                if (isSelected) strokeColor = "#38bdf8";
                else if (rc.isConnectedToSelection) strokeColor = "#10b981";
                else if (rc.isDimmed) strokeColor = "#273b4d";

                const strokeWidth = isSelected ? 3.5 : isHighlit ? 2.8 : 2.0;
                const opacity = rc.isDimmed ? 0.22 : 1.0;

                return (
                  <g
                    key={`cable_${rc.cable.id}`}
                    className="schematic-cable-group cursor-pointer transition-opacity"
                    opacity={opacity}
                    onMouseEnter={() => setHoveredCableId(rc.cable.id)}
                    onMouseLeave={() => setHoveredCableId(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectCable(rc.cable.id);
                    }}
                  >
                    {/* Shadow / Glow track for selection */}
                    {isHighlit && !rc.isDimmed && (
                      <path
                        d={rc.svgPath}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth={strokeWidth + 5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity="0.3"
                        filter="url(#cyan-glow)"
                      />
                    )}

                    {/* Thick hit area for easy clicking */}
                    <path
                      d={rc.svgPath}
                      fill="none"
                      stroke="transparent"
                      strokeWidth={14}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* Main Cable Wire Path (with Semicircular Jump-Over Arcs) */}
                    <path
                      d={rc.svgPath}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* Animated Flow Dots when selected / highlighted */}
                    {isHighlit && !rc.isDimmed && (
                      <path
                        d={rc.svgPath}
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth={strokeWidth * 0.7}
                        strokeDasharray="6 14"
                        strokeLinecap="round"
                        className="animate-pulse"
                      />
                    )}
                  </g>
                );
              })}
            </g>

            {/* ========================================================== */}
            {/* 3. COMPONENT MODULE BLOCKS (Boxes with Pins & Headers)     */}
            {/* ========================================================== */}
            <g className="schematic-blocks-layer">
              {computedBlocks.map((block) => {
                const isSelected = effectiveSelectedIds.includes(block.instanceId);
                const isConnected = connectedInstanceIds.has(block.instanceId);
                const isHovered = hoveredInstanceId === block.instanceId;
                const isDimmed = dimUnselected && effectiveSelectedIds.length > 0 && !isSelected && !isConnected;

                // Color accent matching component category
                let headerColor = "#38bdf8";
                let borderColor = "#1e3a5f";
                let bgFill = "#0c1b29";

                if (block.category === "fc") {
                  headerColor = "#00e5ff";
                  borderColor = "#0284c7";
                  bgFill = "#071c2e";
                } else if (block.category === "gps") {
                  headerColor = "#f59e0b";
                  borderColor = "#b45309";
                  bgFill = "#1e1607";
                } else if (block.category === "datalink") {
                  headerColor = "#818cf8";
                  borderColor = "#4f46e5";
                  bgFill = "#111430";
                } else if (block.category === "power") {
                  headerColor = "#ef4444";
                  borderColor = "#b91c1c";
                  bgFill = "#220c0c";
                } else if (block.category === "propulsion") {
                  headerColor = "#c084fc";
                  borderColor = "#7e22ce";
                  bgFill = "#1a0f28";
                } else if (block.category === "servo") {
                  headerColor = "#2dd4bf";
                  borderColor = "#0f766e";
                  bgFill = "#081c1a";
                } else if (block.category === "payload") {
                  headerColor = "#34d399";
                  borderColor = "#059669";
                  bgFill = "#081f17";
                }

                if (isSelected) {
                  borderColor = "#00e5ff";
                  bgFill = "#0c283d";
                } else if (isConnected) {
                  borderColor = "#10b981";
                  bgFill = "#08291c";
                }

                const opacity = isDimmed ? 0.28 : 1.0;
                const x = block.x - block.width / 2;
                const y = block.y - block.height / 2;

                return (
                  <g
                    key={`block_${block.instanceId}`}
                    transform={`translate(${block.x}, ${block.y})`}
                    className="schematic-block-node cursor-pointer select-none"
                    opacity={opacity}
                    onMouseEnter={() => setHoveredInstanceId(block.instanceId)}
                    onMouseLeave={() => setHoveredInstanceId(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectInstance(block.instanceId, e.shiftKey);
                    }}
                  >
                    {/* Glowing border if selected or connected */}
                    {(isSelected || isConnected) && (
                      <rect
                        x={-block.width / 2 - 4}
                        y={-block.height / 2 - 4}
                        width={block.width + 8}
                        height={block.height + 8}
                        rx={8}
                        fill="none"
                        stroke={isSelected ? "#00e5ff" : "#10b981"}
                        strokeWidth={2}
                        opacity="0.5"
                        filter={isSelected ? "url(#cyan-glow)" : "url(#emerald-glow)"}
                      />
                    )}

                    {/* Aerospace CAD Base Mount Plate */}
                    <rect
                      x={-block.width / 2}
                      y={-block.height / 2}
                      width={block.width}
                      height={block.height}
                      rx={6}
                      fill="#07131f"
                      fillOpacity={0.88}
                      stroke={borderColor}
                      strokeWidth={isSelected ? 2.5 : isConnected ? 2.0 : 1.2}
                      className="transition-colors"
                    />

                    {/* Precision CAD Corner Registration Brackets */}
                    <path
                      d={`
                        M ${-block.width / 2} ${-block.height / 2 + 8} L ${-block.width / 2} ${-block.height / 2} L ${-block.width / 2 + 8} ${-block.height / 2}
                        M ${block.width / 2 - 8} ${-block.height / 2} L ${block.width / 2} ${-block.height / 2} L ${block.width / 2} ${-block.height / 2 + 8}
                        M ${-block.width / 2} ${block.height / 2 - 8} L ${-block.width / 2} ${block.height / 2} L ${-block.width / 2 + 8} ${block.height / 2}
                        M ${block.width / 2 - 8} ${block.height / 2} L ${block.width / 2} ${block.height / 2} L ${block.width / 2} ${block.height / 2 - 8}
                      `}
                      fill="none"
                      stroke={isSelected ? "#00e5ff" : headerColor}
                      strokeWidth={1.5}
                      opacity={0.85}
                    />

                    {/* Real 3D Model Top-Down View Render (Or SVG Silhouette Fallback) */}
                    {(() => {
                      const imgRes = topDownImages[block.componentId];
                      const availW = Math.max(36, block.width - 16);
                      const availH = Math.max(32, block.height - 34);

                      if (imgRes && imgRes.dataUrl) {
                        const aspect = imgRes.aspect || 1;
                        let drawW = availW;
                        let drawH = drawW / aspect;
                        if (drawH > availH) {
                          drawH = availH;
                          drawW = drawH * aspect;
                        }
                        const drawX = -drawW / 2;
                        const drawY = -drawH / 2 + 6;

                        return (
                          <g transform={block.yaw ? `rotate(${block.yaw})` : undefined}>
                            {/* Backdrop shadow plate for clear 3D model contrast */}
                            <rect
                              x={drawX - 2}
                              y={drawY - 2}
                              width={drawW + 4}
                              height={drawH + 4}
                              rx={3}
                              fill="#03080e"
                              fillOpacity={0.7}
                            />
                            <image
                              href={imgRes.dataUrl}
                              x={drawX}
                              y={drawY}
                              width={drawW}
                              height={drawH}
                              preserveAspectRatio="xMidYMid meet"
                              className="pointer-events-none"
                            />
                          </g>
                        );
                      }

                      return (
                        <ComponentTopDownVector
                          componentId={block.componentId}
                          category={block.category}
                          width={availW}
                          height={availH}
                          yaw={block.yaw}
                        />
                      );
                    })()}

                    {/* Compact Top Header Bar */}
                    <rect
                      x={-block.width / 2 + 4}
                      y={-block.height / 2 + 4}
                      width={block.width - 8}
                      height={17}
                      rx={3}
                      fill="#040c16"
                      fillOpacity={0.92}
                      stroke={borderColor}
                      strokeWidth={0.75}
                    />

                    {/* Component Index Badge */}
                    <text
                      x={-block.width / 2 + 8}
                      y={-block.height / 2 + 16}
                      fill="#38bdf8"
                      fontSize="9"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      #{block.instanceId}
                    </text>

                    {/* Component Title */}
                    <text
                      x={0}
                      y={-block.height / 2 + 16}
                      fill="#f8fafc"
                      fontSize="9"
                      fontWeight="600"
                      fontFamily="sans-serif"
                      textAnchor="middle"
                    >
                      {(block.customLabel || block.name).length > 20
                        ? (block.customLabel || block.name).slice(0, 19) + "…"
                        : block.customLabel || block.name}
                    </text>

                    {/* Category / Type Badge on Top-Right */}
                    <text
                      x={block.width / 2 - 8}
                      y={-block.height / 2 + 16}
                      fill={headerColor}
                      fontSize="8"
                      fontWeight="bold"
                      fontFamily="sans-serif"
                      textAnchor="end"
                    >
                      {block.category.toUpperCase()}
                    </text>

                    {/* Subtitle / Nominal Dimensions & 3D Coordinates */}
                    <text
                      x={0}
                      y={block.height / 2 - 6}
                      fill="#94a3b8"
                      fontSize="8"
                      fontFamily="monospace"
                      textAnchor="middle"
                      opacity={0.9}
                    >
                      {Math.round(block.widthMm)}×{Math.round(block.lengthMm)}mm • Z:{Math.round(block.elevationY)}
                    </text>

                    {/* Connected Status Indicator */}
                    {isConnected && (
                      <circle
                        cx={block.width / 2 - 10}
                        cy={block.height / 2 - 10}
                        r={4}
                        fill="#10b981"
                        className="animate-ping"
                      />
                    )}

                    {/* Peripheral Pin Terminals */}
                    {block.pins.slice(0, 6).map((pin, pIdx) => {
                      const pinCount = Math.min(block.pins.length, 6);
                      const pinSpacing = block.width / (pinCount + 1);
                      const px = -block.width / 2 + pinSpacing * (pIdx + 1);
                      const py = block.height / 2;

                      let pinColor = "#38bdf8";
                      if (pin.type === "power") pinColor = "#ef4444";
                      else if (pin.type === "gnd") pinColor = "#475569";
                      else if (pin.type === "signal" || pin.type === "uart") pinColor = "#f59e0b";
                      else if (pin.type === "pwm") pinColor = "#10b981";

                      return (
                        <g key={`pin_${pin.fullName || pIdx}`} transform={`translate(${px}, ${py})`}>
                          <circle cx={0} cy={0} r={3.2} fill={pinColor} stroke="#071018" strokeWidth={1} />
                          {showPinLabels && (
                            <text
                              x={0}
                              y={10}
                              fill="#94a3b8"
                              fontSize="7"
                              fontFamily="monospace"
                              textAnchor="middle"
                            >
                              {pin.pinId || pin.label.slice(0, 3)}
                            </text>
                          )}
                        </g>
                      );
                    })}
                  </g>
                );
              })}
            </g>
          </g>
        </svg>

        {/* Floating Quick Legend & Hover Info Overlay */}
        <div className="absolute bottom-3 left-3 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-md p-2.5 shadow-lg text-[11px] max-w-xs pointer-events-none z-10">
          <div className="flex items-center gap-2 mb-1.5 font-semibold text-slate-200">
            <Info size={12} className="text-cyan-400" />
            <span>Sxema Qo‘llanmasi:</span>
          </div>
          <div className="space-y-1 text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-1 bg-cyan-400 rounded-sm"></span>
              <span>Ko‘k/Tsian: Tanlangan modul</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-1 bg-emerald-400 rounded-sm"></span>
              <span>Yashil: Unga ulangan modullar</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-cyan-300 font-mono font-bold">⌒</span>
              <span>Yarim dumaloq: Boshqa kabel ustidan oshib o‘tish (Ko‘prik)</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1 border-t border-slate-800 pt-1">
              Sichqoncha bilan siljitish (Pan) va g‘ildirak bilan kattalashtirish (Zoom).
            </div>
          </div>
        </div>

        {/* Hovered Cable Tooltip */}
        {hoveredCableId && (
          <div className="absolute top-3 right-3 bg-slate-900/95 backdrop-blur-md border border-cyan-500/50 rounded-lg p-3 shadow-xl text-xs z-30 max-w-sm pointer-events-none animate-in fade-in">
            {(() => {
              const c = cables.find((item) => item.id === hoveredCableId);
              if (!c) return null;
              const sBlock = blockMap.get(c.sourceInstanceId);
              const tBlock = blockMap.get(c.targetInstanceId);
              return (
                <div>
                  <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5 mb-1.5">
                    <span className="font-bold text-cyan-300 font-mono">{c.name || c.id}</span>
                    <span className="px-1.5 py-0.5 rounded bg-cyan-950 text-[10px] text-cyan-400 border border-cyan-800">
                      {c.cableType || "Kabel"}
                    </span>
                  </div>
                  <div className="space-y-1 text-[11px] text-slate-300">
                    <div>
                      <span className="text-slate-400">Chiqish:</span>{" "}
                      <span className="font-semibold">{sBlock?.name || c.sourceInstanceId}</span>{" "}
                      <span className="text-cyan-400 font-mono">({c.sourcePinName})</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Kirish:</span>{" "}
                      <span className="font-semibold">{tBlock?.name || c.targetInstanceId}</span>{" "}
                      <span className="text-cyan-400 font-mono">({c.targetPinName})</span>
                    </div>
                    {c.calculatedLengthMm && (
                      <div className="text-[10px] text-slate-400">
                        Uzunlik: {c.calculatedLengthMm} mm {c.wireGauge ? `• AWG ${c.wireGauge}` : ""}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
};
