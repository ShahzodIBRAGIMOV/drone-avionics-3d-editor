import React, { useState, useMemo } from "react";
import {
  Sliders,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Trash2,
  Zap,
  Cable,
  CheckCircle,
  HelpCircle,
  Maximize,
  RotateCcw,
  RotateCw,
  Unlink,
  Link,
  ShieldCheck,
  Cpu,
  Info,
  Palette,
  Check,
  PlusCircle,
  Crosshair,
  Plus,
  MapPin,
  Sparkles,
  Download,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Copy,
  ClipboardPaste,
  FlipHorizontal,
  FlipVertical,
  Ruler,
  Percent,
  Edit3,
  RefreshCw,
  Box,
  Tag,
  Layers,
  ArrowLeftRight,
  ArrowRight,
  ArrowLeft,
  Activity,
  Droplets,
} from "lucide-react";
import { PhysicalInstance, CableConnection, CableRoutePoint, PinDefinition } from "../types";
import { useLanguage } from "../i18n/LanguageContext";
import { COMPONENT_PINS } from "../data/pinDefinitions";
import {
  VERIFIED_COMPONENT_DIMENSIONS,
  getComponentBaseDimensions,
  calculateDimensionsFromScale,
  calculateScaleFromDimensions,
  calculateProportionalScale,
} from "../data/componentDimensions";
import {
  CABLE_TYPES_CONFIG,
  QUICK_STRAND_COLORS,
  STICKER_BG_COLORS,
  STICKER_STYLES,
  getPresetForCableType,
  getDefaultStrandColors,
  getDefaultStrandLabels,
  generateDefaultStickerLabels,
} from "../data/cablePresets";

interface PlacedInspectorPanelProps {
  selectedInstance: PhysicalInstance | null;
  selectedInstances?: PhysicalInstance[];
  selectedInstanceIds?: string[];
  selectedPinFullName: string | null;
  cables: CableConnection[];
  instances: PhysicalInstance[];
  onUpdatePosition: (instanceId: string, pos: [number, number, number]) => void;
  onUpdateRotation: (instanceId: string, rot: [number, number, number]) => void;
  onUpdateScale: (instanceId: string, scale: [number, number, number]) => void;
  onToggleLock: (instanceId: string) => void;
  onToggleVisibility: (instanceId: string) => void;
  onRemoveFromScene: (instanceId: string) => void;
  onSelectPin: (pinFullName: string | null) => void;
  onStartCableConnection: (sourcePinFullName: string) => void;
  onDeleteCable: (cableId: string) => void;
  onUpdateCableColor: (cableId: string, color: string) => void;
  onSelectInstance: (instanceId: string) => void;
  onUpdateInstanceColor: (instanceId: string, color: string | undefined) => void;
  onApplyColorToAllInstances?: (componentId: string, color: string | undefined) => void;
  onToggleAttachToDrone?: (instanceId: string, attach?: boolean) => void;
  onBatchAttachToDrone?: (instanceIds: string[], attach: boolean) => void;
  onBatchRemoveFromScene?: (instanceIds: string[]) => void;
  onBatchToggleLock?: (instanceIds: string[]) => void;
  onBatchDeltaMove?: (axis: 0 | 1 | 2, delta: number) => void;
  onCopySelected?: () => void;
  onPaste?: () => void;
  hasClipboard?: boolean;
  onDeleteSelected?: () => void;
  onFlipSelected?: (type: "horizontal" | "vertical" | "roll") => void;
  droneColor?: string;
  onUpdateDroneColor?: (color: string) => void;
  isDronePlaced?: boolean;
  onToggleDronePresence?: () => void;
  isPlacingPinMode?: boolean;
  onTogglePinPlacingMode?: (instanceId?: string) => void;
  onAddCustomPin?: (instanceId: string, pin: PinDefinition) => void;
  onUpdateCustomPin?: (instanceId: string, pinFullName: string, updated: Partial<PinDefinition>) => void;
  onDeleteCustomPin?: (instanceId: string, pinFullName: string) => void;
  onLoadPresetPins?: (instanceId: string) => void;
  onBatchUpdateScale?: (instanceIds: string[], scaleFactor: number) => void;
  selectedCableId?: string | null;
  onSelectCable?: (cableId: string | null) => void;
  onUpdateCable?: (cableId: string, updated: Partial<CableConnection>) => void;
  onAddCableRoutePoint?: (cableId: string, customPoint?: Partial<CableRoutePoint>) => void;
  onUpdateCableRoutePoint?: (cableId: string, pointId: string, coords: { x: number; y: number; z: number }) => void;
  onDeleteCableRoutePoint?: (cableId: string, pointId: string) => void;
  onStraightenCable?: (cableId: string) => void;
  onSwapCableEnds?: (cableId: string) => void;
  onCollapse?: () => void;
  onReloadJetson?: () => void;
  isReloadingJetson?: boolean;
  onChangeModel?: (componentId: string) => void;
  isIsolatedView?: boolean;
  onToggleIsolatedView?: () => void;
}

const PRESET_COMPONENT_COLORS = [
  { name: "Qizil", hex: "#ef4444" },
  { name: "Sian", hex: "#00d2eb" },
  { name: "Yashil", hex: "#10b981" },
  { name: "Sariq", hex: "#eab308" },
  { name: "To'q sariq", hex: "#f97316" },
  { name: "Binafsha", hex: "#a855f7" },
  { name: "Oq", hex: "#f8fafc" },
  { name: "Grafit", hex: "#475569" },
  { name: "Qora", hex: "#0f172a" },
];

const PRESET_DRONE_COLORS = [
  { name: "Stealth Qora", hex: "#181c22" },
  { name: "Karbon Kulrang", hex: "#2b323c" },
  { name: "Aviatsiya Oq", hex: "#f8fafc" },
  { name: "Titan Kumush", hex: "#94a3b8" },
  { name: "Harbiy Zaytun", hex: "#4b553e" },
  { name: "Signal To'q sariq", hex: "#f97316" },
  { name: "Harbiy Moviy", hex: "#1e3a5f" },
];

interface CableItemCardProps {
  cable: CableConnection;
  isSelected: boolean;
  onSelectCable?: (cableId: string | null) => void;
  onUpdateCableColor: (cableId: string, color: string) => void;
  onDeleteCable: (cableId: string) => void;
  onUpdateCable?: (cableId: string, updated: Partial<CableConnection>) => void;
  onAddCableRoutePoint?: (cableId: string, customPoint?: Partial<CableRoutePoint>) => void;
  onUpdateCableRoutePoint?: (cableId: string, pointId: string, coords: { x: number; y: number; z: number }) => void;
  onDeleteCableRoutePoint?: (cableId: string, pointId: string) => void;
  onStraightenCable?: (cableId: string) => void;
  onSwapCableEnds?: (cableId: string) => void;
}

const CableItemCard: React.FC<CableItemCardProps> = ({
  cable,
  isSelected,
  onSelectCable,
  onUpdateCableColor,
  onDeleteCable,
  onUpdateCable,
  onAddCableRoutePoint,
  onUpdateCableRoutePoint,
  onDeleteCableRoutePoint,
  onStraightenCable,
  onSwapCableEnds,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(isSelected);

  React.useEffect(() => {
    if (isSelected) setIsExpanded(true);
  }, [isSelected]);

  return (
    <div
      id={`cable-card-${cable.id}`}
      className={`cable-card transition-all cursor-pointer ${
        isSelected ? "ring-2 ring-cyan-500 bg-cyan-950/20 border-cyan-500/60" : ""
      }`}
      onClick={() => onSelectCable?.(cable.id)}
    >
      <div className="cable-card-header flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span
            className="cable-color-dot flex-shrink-0"
            style={{ backgroundColor: cable.color }}
          />
          <span className="cable-name truncate font-medium text-slate-200">
            {cable.name}
          </span>
          <span
            className={`cable-type-tag text-[10px] uppercase font-mono px-1.5 py-0.5 rounded border ${
              cable.cableType === "I2C"
                ? "bg-cyan-950/90 text-cyan-300 border-cyan-400/50 shadow-sm"
                : cable.cableType === "Airspeed"
                ? "bg-sky-950/90 text-sky-300 border-sky-400/50 shadow-sm"
                : cable.cableType === "CAN"
                ? "bg-emerald-950/90 text-emerald-300 border-emerald-400/50 shadow-sm"
                : "bg-slate-800 text-slate-300 border-slate-700"
            }`}
          >
            {cable.cableType}
          </span>
          {cable.isRibbon && (
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/40">
              Lentali ({cable.strandCount || 3} ta tomir)
            </span>
          )}
          {cable.isBreakout && (
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-950/90 text-amber-300 border border-amber-500/50 flex items-center gap-1 font-semibold shadow-sm">
              {cable.breakoutMode === "N-to-1"
                ? `${cable.strandCount || cable.multiSourcePinNames?.length || 3}-to-1 Breakout`
                : cable.breakoutMode === "N-to-N"
                ? `${cable.strandCount || 3}-to-${cable.strandCount || 3} Multi-Pin`
                : `1-to-${cable.strandCount || cable.multiTargetPinNames?.length || 3} Y-Breakout`}
            </span>
          )}
          {(cable.isTransparent || cable.cableType === "Airspeed" || cable.isTubing) && (
            <span
              className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-sky-950/90 text-sky-300 border border-sky-400/50 flex items-center gap-1 font-semibold shadow-sm"
              title={`Shaffof silikon shlang (${Math.round((cable.transparencyOpacity ?? 0.45) * 100)}% shaffoflik)`}
            >
              <Droplets size={9} />
              Shaffof Shlang
            </span>
          )}
          {cable.endStickers?.enabled && (
            <span
              className="text-[9px] font-mono px-1.5 py-0.5 rounded border flex items-center gap-0.5"
              style={{
                backgroundColor: cable.endStickers.bgColor || "#facc15",
                color: cable.endStickers.textColor || "#000000",
                borderColor: "rgba(0,0,0,0.3)",
              }}
              title={`Shtikerlar: ${cable.endStickers.sourceText || "P1"} ↔ ${cable.endStickers.targetText || "P2"}`}
            >
              <Tag size={9} />
              Shtikerli
            </span>
          )}
          {cable.flowDirection === "bidirectional" && (
            <span
              className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/90 text-emerald-300 border border-emerald-500/50 flex items-center gap-1 font-semibold shadow-sm"
              title="Ikki tomonlama ma'lumot uzatuvchi kabel (Dual-bus)"
            >
              <ArrowLeftRight size={9} />
              Ikki tomonlama (1⇄2)
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className="text-[11px] font-mono text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
            {cable.calculatedLengthMm || 0} mm
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded((v) => !v);
            }}
            className="p-1 text-slate-400 hover:text-slate-200 rounded"
            title={isExpanded ? "Yig‘ish" : "Tafsilotlar & Burilishlarni boshqarish"}
          >
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      <div className="cable-endpoints my-1.5 text-xs text-slate-300 flex items-center gap-1.5">
        <div className="endpoint-node truncate flex-1">
          <span className="node-tag text-[10px] text-slate-500 block">
            {cable.isBreakout && cable.multiSourcePinNames && cable.multiSourcePinNames.length > 1
              ? `1-tanlangan (${cable.multiSourcePinNames.length} ta Pin):`
              : "1-tanlangan (Manba):"}
          </span>
          <span
            className={`node-pin font-mono truncate block font-medium ${
              cable.isBreakout && cable.multiSourcePinNames && cable.multiSourcePinNames.length > 1
                ? "text-amber-300"
                : "text-cyan-300"
            }`}
            title={
              cable.isBreakout && cable.multiSourcePinNames
                ? cable.multiSourcePinNames.join(" | ")
                : cable.sourcePinName
            }
          >
            {cable.isBreakout && cable.multiSourcePinNames && cable.multiSourcePinNames.length > 1
              ? `${cable.multiSourcePinNames.length} ta Pin (${cable.sourcePinName.split(".").pop() || ""})`
              : cable.sourcePinName}
          </span>
        </div>
        {onSwapCableEnds && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSwapCableEnds(cable.id);
            }}
            className="px-1.5 py-1 bg-slate-800/90 hover:bg-cyan-950 text-cyan-400 hover:text-cyan-200 border border-slate-700 hover:border-cyan-500/60 rounded text-[11px] font-mono flex items-center gap-1 transition-all shadow-sm"
            title="Kabel uchlarini teskarisiga almashtirish (1-va 2-tanlangan uchlar o‘rnini almashtirish)"
          >
            ⇄
          </button>
        )}
        <div className="endpoint-node truncate flex-1 text-right">
          <span className="node-tag text-[10px] text-slate-500 block">
            {cable.isBreakout && cable.multiTargetPinNames && cable.multiTargetPinNames.length > 1
              ? `2-tanlangan (${cable.multiTargetPinNames.length} ta Pin):`
              : "2-tanlangan (Qabul):"}
          </span>
          <span
            className={`node-pin font-mono truncate block font-medium ${
              cable.isBreakout && cable.multiTargetPinNames && cable.multiTargetPinNames.length > 1
                ? "text-amber-300"
                : "text-slate-300"
            }`}
            title={
              cable.isBreakout && cable.multiTargetPinNames
                ? cable.multiTargetPinNames.join(" | ")
                : cable.targetPinName
            }
          >
            {cable.isBreakout && cable.multiTargetPinNames && cable.multiTargetPinNames.length > 1
              ? `${cable.multiTargetPinNames.length} ta Pin (${cable.targetPinName.split(".").pop() || ""})`
              : cable.targetPinName}
          </span>
        </div>
      </div>

      {/* Flow Direction Selector (One-way vs Bidirectional vs Smart Sensor) */}
      <div
        className="my-1.5 p-2 bg-slate-900/90 rounded border border-slate-800/80 flex flex-col gap-1.5 text-[11px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <span className="text-slate-400 text-[10px] flex items-center gap-1 font-medium whitespace-nowrap">
            <Activity size={11} className="text-cyan-400" />
            <span>Oqim yo‘nalishi (Flow Direction):</span>
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            {cable.flowDirection === "smart" || !cable.flowDirection
              ? "Aqlli datchik (Smart)"
              : cable.flowDirection === "bidirectional"
              ? "Ikki tomonlama (1⇄2)"
              : cable.flowDirection === "reverse"
              ? "Teskari (2➔1)"
              : "To‘g‘ri (1➔2)"}
          </span>
        </div>
        <div className="grid grid-cols-4 gap-1">
          <button
            type="button"
            onClick={() => onUpdateCable?.(cable.id, { flowDirection: "smart" })}
            className={`px-1.5 py-1 rounded text-[10px] font-mono transition-all flex items-center justify-center gap-0.5 ${
              cable.flowDirection === "smart" || !cable.flowDirection
                ? "bg-violet-600 text-white font-bold shadow-sm ring-1 ring-violet-400"
                : "bg-slate-800 text-slate-400 hover:text-violet-300"
            }`}
            title="Aqlli Datchik (Smart): Avtomatik fizik yo‘nalishlar (Quvvat FC➔GPS, Ma‘lumot GPS➔FC)"
          >
            ⚡ Aqlli
          </button>
          <button
            type="button"
            onClick={() => onUpdateCable?.(cable.id, { flowDirection: "forward" })}
            className={`px-1.5 py-1 rounded text-[10px] font-mono transition-all flex items-center justify-center gap-0.5 ${
              cable.flowDirection === "forward"
                ? "bg-cyan-600 text-white font-bold shadow-sm"
                : "bg-slate-800 text-slate-400 hover:text-slate-200"
            }`}
            title="Bir tomonlama: 1-dan 2-ga tomon"
          >
            <ArrowRight size={10} /> 1➔2
          </button>
          <button
            type="button"
            onClick={() => onUpdateCable?.(cable.id, { flowDirection: "bidirectional" })}
            className={`px-1.5 py-1 rounded text-[10px] font-mono transition-all flex items-center justify-center gap-0.5 ${
              cable.flowDirection === "bidirectional"
                ? "bg-emerald-600 text-white font-bold shadow-sm ring-1 ring-emerald-400"
                : "bg-slate-800 text-slate-400 hover:text-emerald-300"
            }`}
            title="Ikki tomonlama: CAN, UART TX/RX, Ethernet kabi signallar ikkala tomonga parallel uzatiladi"
          >
            <ArrowLeftRight size={10} /> 1⇄2
          </button>
          <button
            type="button"
            onClick={() => onUpdateCable?.(cable.id, { flowDirection: "reverse" })}
            className={`px-1.5 py-1 rounded text-[10px] font-mono transition-all flex items-center justify-center gap-0.5 ${
              cable.flowDirection === "reverse"
                ? "bg-amber-600 text-white font-bold shadow-sm"
                : "bg-slate-800 text-slate-400 hover:text-slate-200"
            }`}
            title="Teskari: 2-dan 1-ga tomon"
          >
            <ArrowLeft size={10} /> 2➔1
          </button>
        </div>
      </div>

      {/* Expanded Controls: Bending, Stretching (Slack), Curvature, Thickness, and 3D Waypoints */}
      {isExpanded && (
        <div
          className="mt-3 pt-3 border-t border-slate-700/60 space-y-3"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Cable Type / Communication Protocol Selector */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium flex items-center gap-1">
                <Activity size={12} className="text-cyan-400" />
                <span>Aloqa turi / Protokol (Cable Type):</span>
              </span>
              <span className="font-mono text-cyan-300 text-[11px] font-semibold">
                {cable.cableType || "PWM"}
              </span>
            </div>
            <select
              value={cable.cableType || "PWM"}
              onChange={(e) => {
                const newType = e.target.value;
                const p = getPresetForCableType(newType);
                onUpdateCable?.(cable.id, {
                  cableType: newType,
                  wireGauge: p.defaultGauge,
                  color: p.color,
                  isRibbon: p.isRibbonDefault,
                  strandCount: p.defaultStrands,
                  strandColors: getDefaultStrandColors(newType, p.defaultStrands),
                  strandLabels: getDefaultStrandLabels(newType, p.defaultStrands),
                  ...(p.isTransparentDefault !== undefined ? { isTransparent: p.isTransparentDefault } : {}),
                  ...(p.defaultOpacity !== undefined ? { transparencyOpacity: p.defaultOpacity } : {}),
                  ...(p.isTubingDefault !== undefined ? { isTubing: p.isTubingDefault } : {}),
                });
              }}
              className="w-full bg-slate-800/95 text-slate-200 text-xs px-2.5 py-1.5 rounded border border-slate-700 hover:border-cyan-500/60 focus:border-cyan-400 focus:outline-none font-mono cursor-pointer shadow-sm transition-all"
            >
              {CABLE_TYPES_CONFIG.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label} ({t.id})
                </option>
              ))}
            </select>
          </div>

          {/* Cable Stretching / Slack Slider */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium flex items-center gap-1">
                <span>📏 Cho‘zilish / Bo‘shlik (Slack):</span>
              </span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-cyan-300 font-semibold text-[11px]">
                  {cable.slackMm || 0} mm
                </span>
                {(cable.slackMm || 0) !== 0 && (
                  <button
                    type="button"
                    onClick={() => onUpdateCable?.(cable.id, { slackMm: 0 })}
                    className="px-1.5 py-0.5 text-[10px] bg-slate-700 hover:bg-cyan-600 text-slate-200 rounded transition-colors"
                    title="Bo‘shlikni nolga tushirib tarang qilish"
                  >
                    Tarang
                  </button>
                )}
              </div>
            </div>
            <input
              type="range"
              min={-50}
              max={300}
              step={5}
              value={cable.slackMm || 0}
              onChange={(e) =>
                onUpdateCable?.(cable.id, { slackMm: parseFloat(e.target.value) || 0 })
              }
              className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
              title="Kabelni taranglash yoki osilib turishi (sag) uchun cho‘zish"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>Tarang (-50mm)</span>
              <span>To‘g‘ri (0mm)</span>
              <span>Bo‘sh (+300mm)</span>
            </div>
          </div>

          {/* Curvature Tension & Thickness */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[11px]">Egilish egri-chizig‘i:</span>
                <span className="font-mono text-slate-200 text-[10px]">
                  {(cable.curveTension ?? 0.5).toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={cable.curveTension ?? 0.5}
                onChange={(e) =>
                  onUpdateCable?.(cable.id, { curveTension: parseFloat(e.target.value) || 0.5 })
                }
                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
                title="Kabelning egilish radiusi va elastikligi"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[11px]">Qalinlik (mm):</span>
                <span className="font-mono text-slate-200 text-[10px]">
                  {(cable.thicknessMm ?? 2.8).toFixed(1)} mm
                </span>
              </div>
              <input
                type="range"
                min={1.0}
                max={8.0}
                step={0.2}
                value={cable.thicknessMm ?? 2.8}
                onChange={(e) =>
                  onUpdateCable?.(cable.id, { thicknessMm: parseFloat(e.target.value) || 2.8 })
                }
                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
                title="Kabel diametri / qalinligi"
              />
            </div>
          </div>

          {/* Ribbon / Multi-Strand Flat Cable Section */}
          {(() => {
            const preset = getPresetForCableType(cable.cableType || "PWM");
            const isRibbon = Boolean(cable.isRibbon);
            const strandCount = cable.strandCount || (isRibbon ? preset.defaultStrands : 1);
            const strandColors =
              cable.strandColors && cable.strandColors.length >= strandCount
                ? cable.strandColors
                : getDefaultStrandColors(cable.cableType || "PWM", strandCount);
            const strandLabels =
              cable.strandLabels && cable.strandLabels.length >= strandCount
                ? cable.strandLabels
                : getDefaultStrandLabels(cable.cableType || "PWM", strandCount);

            const availableCounts: number[] = [];
            for (let c = preset.minStrands; c <= preset.maxStrands; c++) {
              availableCounts.push(c);
            }

            return (
              <div className="p-2.5 bg-slate-900/90 rounded-lg border border-cyan-500/30 space-y-2.5">
                {/* Ribbon Toggle */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-white flex items-center gap-1">
                      <span>⚡ Lentali kabel (Ribbon / Shleyf):</span>
                    </span>
                  </div>
                  <label className="inline-flex items-center cursor-pointer gap-1.5 text-xs font-medium">
                    <input
                      type="checkbox"
                      checked={isRibbon}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        const count = checked ? Math.max(preset.defaultStrands, 3) : 1;
                        onUpdateCable?.(cable.id, {
                          isRibbon: checked,
                          strandCount: count,
                          strandColors: checked
                            ? getDefaultStrandColors(cable.cableType || "PWM", count)
                            : [cable.color],
                          strandLabels: checked
                            ? getDefaultStrandLabels(cable.cableType || "PWM", count)
                            : ["Signal"],
                          strandPitchMm: cable.strandPitchMm || 2.0,
                        });
                      }}
                      className="w-4 h-4 accent-cyan-400 cursor-pointer"
                    />
                    <span className={isRibbon ? "text-cyan-300 font-semibold" : "text-slate-400"}>
                      {isRibbon ? "Yoqilgan" : "Oddiy sim"}
                    </span>
                  </label>
                </div>

                {isRibbon && (
                  <div className="space-y-2 pt-1 border-t border-slate-800">
                    {/* Strand Count and Quick Selector */}
                    <div className="flex items-center justify-between flex-wrap gap-1 text-xs">
                      <div className="text-slate-300">
                        <span>Tomirlar soni: </span>
                        <span className="font-bold text-cyan-300">{strandCount} ta</span>
                        <span className="text-[10px] text-slate-500 ml-1">
                          ({preset.minStrands}-{preset.maxStrands} ta)
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {availableCounts.map((cnt) => (
                          <button
                            key={cnt}
                            type="button"
                            onClick={() => {
                              const newColors = [...strandColors];
                              const newLabels = [...strandLabels];
                              const defColors = getDefaultStrandColors(cable.cableType || "PWM", cnt);
                              const defLabels = getDefaultStrandLabels(cable.cableType || "PWM", cnt);
                              while (newColors.length < cnt)
                                newColors.push(defColors[newColors.length] || "#38bdf8");
                              while (newLabels.length < cnt)
                                newLabels.push(
                                  defLabels[newLabels.length] || `${newLabels.length + 1}-tomir`
                                );
                              onUpdateCable?.(cable.id, {
                                strandCount: cnt,
                                strandColors: newColors.slice(0, cnt),
                                strandLabels: newLabels.slice(0, cnt),
                              });
                            }}
                            className={`w-6 h-5 flex items-center justify-center rounded text-[10px] font-bold transition-colors ${
                              strandCount === cnt
                                ? "bg-cyan-600 text-white border border-cyan-400"
                                : "bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700"
                            }`}
                          >
                            {cnt}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Ribbon Preview Stripe */}
                    <div className="bg-slate-950 p-1.5 rounded border border-slate-800 space-y-1">
                      <span className="text-[9px] text-slate-400 uppercase tracking-wide block">
                        Lenta ko‘rinishi (Prevyu):
                      </span>
                      <div className="flex h-5 rounded overflow-hidden border border-slate-700 shadow-inner">
                        {Array.from({ length: strandCount }).map((_, idx) => {
                          const col = strandColors[idx] || "#64748b";
                          return (
                            <div
                              key={idx}
                              style={{ backgroundColor: col }}
                              className="flex-1 flex items-center justify-center text-[8px] font-bold border-r border-black/40 last:border-r-0"
                              title={`Tomir #${idx + 1}: ${strandLabels[idx] || ""} (${col})`}
                            >
                              <span className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)] text-white">
                                #{idx + 1}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Individual Strand Colors & Labels */}
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      <span className="text-[10px] font-semibold text-slate-300 block">
                        Har bir tomir rangi va signali:
                      </span>
                      {Array.from({ length: strandCount }).map((_, idx) => {
                        const col = strandColors[idx] || "#64748b";
                        const lab = strandLabels[idx] || `${idx + 1}-tomir`;
                        return (
                          <div
                            key={idx}
                            className="flex items-center gap-2 p-1.5 rounded bg-slate-800/80 border border-slate-700/60 text-xs"
                          >
                            <span className="font-bold text-slate-300 w-5 text-center text-[11px]">
                              #{idx + 1}
                            </span>
                            <div
                              className="w-4 h-4 rounded border border-white/20 flex-shrink-0"
                              style={{ backgroundColor: col }}
                            />
                            <input
                              type="text"
                              value={lab}
                              onChange={(e) => {
                                const nextLabels = [...strandLabels];
                                nextLabels[idx] = e.target.value;
                                onUpdateCable?.(cable.id, { strandLabels: nextLabels });
                              }}
                              className="flex-1 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[11px] text-white"
                              placeholder={`Tomir #${idx + 1}`}
                            />
                            {/* Quick swatches */}
                            <div className="flex items-center gap-1">
                              {QUICK_STRAND_COLORS.slice(0, 5).map((c) => (
                                <button
                                  key={c.hex}
                                  type="button"
                                  onClick={() => {
                                    const nextColors = [...strandColors];
                                    nextColors[idx] = c.hex;
                                    onUpdateCable?.(cable.id, { strandColors: nextColors });
                                  }}
                                  className="w-3.5 h-3.5 rounded-full border border-black/50 cursor-pointer"
                                  style={{ backgroundColor: c.hex }}
                                  title={`${c.name} (${c.hex})`}
                                />
                              ))}
                              <input
                                type="color"
                                value={col}
                                onChange={(e) => {
                                  const nextColors = [...strandColors];
                                  nextColors[idx] = e.target.value;
                                  onUpdateCable?.(cable.id, { strandColors: nextColors });
                                }}
                                className="w-5 h-5 p-0 border-0 bg-transparent cursor-pointer"
                                title="Boshqa rang"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Ribbon Pitch */}
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800">
                      <span className="text-slate-400 text-[10px]">
                        Tomirlar masofasi (Pitch):
                      </span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="range"
                          min={1.2}
                          max={3.5}
                          step={0.1}
                          value={cable.strandPitchMm || 2.0}
                          onChange={(e) =>
                            onUpdateCable?.(cable.id, {
                              strandPitchMm: parseFloat(e.target.value) || 2.0,
                            })
                          }
                          className="w-20 accent-cyan-400 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
                        />
                        <span className="font-mono text-cyan-300 text-[10px] w-12 text-right">
                          {(cable.strandPitchMm || 2.0).toFixed(1)} mm
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Transparent Silicone Tube / Pitot Pneumatic Section */}
          <div className="p-2.5 bg-slate-900/90 rounded-lg border border-sky-500/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Droplets size={13} className="text-sky-400" />
                <span>Shaffof Silikon Shlang (Pitot):</span>
              </span>
              <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={Boolean(cable.isTransparent || cable.cableType === "Airspeed" || cable.isTubing)}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    onUpdateCable?.(cable.id, {
                      isTransparent: checked,
                      isTubing: checked,
                      transparencyOpacity: cable.transparencyOpacity ?? 0.45,
                      color: checked && (cable.color === "#000000" || cable.color === "#1e293b") ? "#e0f2fe" : cable.color,
                    });
                  }}
                  className="accent-sky-500 cursor-pointer"
                />
                <span className="text-[11px] font-medium text-sky-300">
                  {cable.isTransparent ? "Faol (Shaffof)" : "Oddiy sim"}
                </span>
              </label>
            </div>

            {(cable.isTransparent || cable.cableType === "Airspeed" || cable.isTubing) && (
              <div className="space-y-2 pt-1 border-t border-slate-800">
                {/* Opacity slider */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Shaffoflik (Opacity):</span>
                    <span className="font-mono text-sky-300 font-semibold">
                      {Math.round((cable.transparencyOpacity ?? 0.45) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.15}
                    max={0.85}
                    step={0.05}
                    value={cable.transparencyOpacity ?? 0.45}
                    onChange={(e) =>
                      onUpdateCable?.(cable.id, {
                        transparencyOpacity: parseFloat(e.target.value),
                        isTransparent: true,
                        isTubing: true,
                      })
                    }
                    className="w-full accent-sky-400 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
                  />
                  <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                    <span>15% (Muzdek tiniq)</span>
                    <span>45% (Standart)</span>
                    <span>85% (Quyuq)</span>
                  </div>
                </div>

                {/* Quick silicone material swatches */}
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 block">Tezkor silikon turlari:</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { name: "Muzdek Tiniq", color: "#e0f2fe", opacity: 0.40 },
                      { name: "Moviy Shaffof", color: "#bae6fd", opacity: 0.45 },
                      { name: "Sutsimon Oq", color: "#f8fafc", opacity: 0.55 },
                      { name: "Sariq Silikon", color: "#fef08a", opacity: 0.40 },
                    ].map((mat) => (
                      <button
                        key={mat.name}
                        type="button"
                        onClick={() => {
                          onUpdateCableColor(cable.id, mat.color);
                          onUpdateCable?.(cable.id, {
                            isTransparent: true,
                            isTubing: true,
                            transparencyOpacity: mat.opacity,
                          });
                        }}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-750 text-slate-200 text-[10px] rounded border border-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
                        title={mat.name}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full border border-white/30"
                          style={{ backgroundColor: mat.color, opacity: mat.opacity }}
                        />
                        <span>{mat.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Cable End Identification Stickers (Uchki Shtikerlar / Markirovka) */}
          {(() => {
            const hasStickers = !!cable.endStickers?.enabled;
            const stickers = cable.endStickers || {
              enabled: false,
              sourceText: `${cable.sourcePinName || "SRC"}`,
              targetText: `${cable.targetPinName || "TGT"}`,
              bgColor: "#facc15",
              textColor: "#000000",
              style: "heatshrink" as const,
              offsetFromEndMm: 20,
            };

            const updateSticker = (partial: Partial<NonNullable<CableConnection["endStickers"]>>) => {
              if (!onUpdateCable) return;
              onUpdateCable(cable.id, {
                endStickers: {
                  ...stickers,
                  ...partial,
                },
              });
            };

            return (
              <div className="p-2.5 bg-slate-900/90 rounded-lg border border-slate-700/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-200 flex items-center gap-1.5">
                    <Tag size={13} className="text-amber-400" />
                    <span>Uchki Shtikerlar (Markirovka / Tags):</span>
                  </span>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer text-[10px]">
                    <input
                      type="checkbox"
                      checked={hasStickers}
                      onChange={(e) => {
                        updateSticker({
                          enabled: e.target.checked,
                          sourceText: stickers.sourceText || cable.sourcePinName || "SRC",
                          targetText: stickers.targetText || cable.targetPinName || "TGT",
                        });
                      }}
                      className="w-3.5 h-3.5 rounded accent-amber-500 cursor-pointer"
                    />
                    <span className={hasStickers ? "text-amber-300 font-medium" : "text-slate-400"}>
                      {hasStickers ? "Yoqilgan" : "O‘chirilgan"}
                    </span>
                  </label>
                </div>

                {hasStickers && (
                  <div className="space-y-2.5 pt-1 border-t border-slate-800">
                    {/* Source & Target Inputs */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[9px] text-slate-400">Manba (P1) shtikeri:</span>
                          <span
                            className="text-[9px] font-mono font-bold px-1 rounded shadow-xs"
                            style={{
                              backgroundColor: stickers.bgColor || "#facc15",
                              color: stickers.textColor || "#000000",
                            }}
                          >
                            {stickers.sourceText || "SRC"}
                          </span>
                        </div>
                        <input
                          type="text"
                          value={stickers.sourceText || ""}
                          onChange={(e) => updateSticker({ sourceText: e.target.value })}
                          placeholder="masalan: J1:GPS"
                          className="w-full text-[10px] font-mono bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-slate-200 focus:border-amber-400 focus:outline-none"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[9px] text-slate-400">Qabul (P2) shtikeri:</span>
                          <span
                            className="text-[9px] font-mono font-bold px-1 rounded shadow-xs"
                            style={{
                              backgroundColor: stickers.bgColor || "#facc15",
                              color: stickers.textColor || "#000000",
                            }}
                          >
                            {stickers.targetText || "TGT"}
                          </span>
                        </div>
                        <input
                          type="text"
                          value={stickers.targetText || ""}
                          onChange={(e) => updateSticker({ targetText: e.target.value })}
                          placeholder="masalan: P1:FC"
                          className="w-full text-[10px] font-mono bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-slate-200 focus:border-amber-400 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Style & Colors */}
                    <div className="grid grid-cols-2 gap-2 items-center">
                      <div>
                        <span className="text-[9px] text-slate-400 block mb-1">Uslub:</span>
                        <div className="flex gap-1">
                          {STICKER_STYLES.map((st) => (
                            <button
                              key={st.id}
                              type="button"
                              onClick={() => updateSticker({ style: st.id as any })}
                              className={`flex-1 py-0.5 px-1 text-[9px] rounded border transition-colors ${
                                (stickers.style || "heatshrink") === st.id
                                  ? "bg-amber-600 text-white border-amber-400 font-semibold"
                                  : "bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200"
                              }`}
                              title={st.desc}
                            >
                              {st.label.split(" ")[0]}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <span className="text-[9px] text-slate-400 block mb-1">Fon & Shrift:</span>
                        <div className="flex items-center gap-1">
                          {STICKER_BG_COLORS.slice(0, 4).map((c) => (
                            <button
                              key={c.hex}
                              type="button"
                              onClick={() => updateSticker({ bgColor: c.hex })}
                              className="w-3.5 h-3.5 rounded-full border transition-transform hover:scale-110"
                              style={{
                                backgroundColor: c.hex,
                                borderColor: stickers.bgColor === c.hex ? "#ffffff" : "rgba(0,0,0,0.4)",
                              }}
                              title={c.name}
                            />
                          ))}
                          <input
                            type="color"
                            value={stickers.bgColor || "#facc15"}
                            onChange={(e) => updateSticker({ bgColor: e.target.value })}
                            className="w-4 h-4 rounded cursor-pointer border-none bg-transparent"
                            title="Boshqa fon rangi"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              updateSticker({
                                textColor: stickers.textColor === "#000000" ? "#ffffff" : "#000000",
                              })
                            }
                            className="text-[9px] px-1 py-0.5 bg-slate-950 border border-slate-700 rounded text-slate-300 hover:text-white"
                            title="Yozuv rangini almashtirish (Qora/Oq)"
                          >
                            {stickers.textColor === "#000000" ? "Qora" : "Oq"}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Offset, 3D Rotation & Size */}
                    <div className="space-y-1.5 pt-1 border-t border-slate-800/80">
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>Ulagichdan masofa:</span>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="range"
                            min={10}
                            max={50}
                            step={2}
                            value={stickers.offsetFromEndMm || 20}
                            onChange={(e) =>
                              updateSticker({ offsetFromEndMm: parseInt(e.target.value) || 20 })
                            }
                            className="w-16 accent-amber-500 cursor-pointer"
                          />
                          <span className="font-mono text-amber-300 font-semibold w-10 text-right">
                            {stickers.offsetFromEndMm || 20} mm
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>3D Aylanish (Burchak):</span>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="range"
                            min={0}
                            max={360}
                            step={15}
                            value={stickers.rotationDeg || 0}
                            onChange={(e) =>
                              updateSticker({ rotationDeg: parseInt(e.target.value) || 0 })
                            }
                            className="w-16 accent-amber-500 cursor-pointer"
                          />
                          <span className="font-mono text-amber-300 font-semibold w-10 text-right">
                            {stickers.rotationDeg || 0}°
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>3D O‘lcham (Uzunlik):</span>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="range"
                            min={16}
                            max={36}
                            step={2}
                            value={stickers.sizeMm || 24}
                            onChange={(e) =>
                              updateSticker({ sizeMm: parseInt(e.target.value) || 24 })
                            }
                            className="w-16 accent-amber-500 cursor-pointer"
                          />
                          <span className="font-mono text-amber-300 font-semibold w-10 text-right">
                            {stickers.sizeMm || 24} mm
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* 3D Bend Waypoints Management */}
          <div className="p-2 bg-slate-900/80 rounded-lg border border-slate-700/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-200 flex items-center gap-1">
                <span>📍 3D Burilish Nuqtalari:</span>
                <span className="text-cyan-400 font-mono">
                  ({cable.routePoints?.length || 0})
                </span>
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onAddCableRoutePoint?.(cable.id)}
                  className="px-2 py-0.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-[11px] font-medium transition-colors flex items-center gap-1 shadow-sm"
                  title="Kabelga yangi 3D burilish nuqtasi qo‘shish"
                >
                  <Plus size={11} /> Nuqta
                </button>
                {cable.routePoints && cable.routePoints.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onStraightenCable?.(cable.id)}
                    className="px-2 py-0.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-[11px] transition-colors"
                    title="Barcha burilish nuqtalarini o‘chirib to‘g‘rilash"
                  >
                    Tekislash
                  </button>
                )}
              </div>
            </div>

            {cable.routePoints && cable.routePoints.length > 0 ? (
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {cable.routePoints.map((pt, idx) => (
                  <div
                    key={pt.id}
                    className="flex items-center gap-1.5 p-1 rounded bg-slate-800/80 border border-slate-700/70 text-[10px]"
                  >
                    <span className="font-bold text-amber-400 px-1">#{idx + 1}</span>
                    <div className="grid grid-cols-3 gap-1 flex-1">
                      <div className="flex items-center">
                        <span className="text-slate-500 mr-0.5">X:</span>
                        <input
                          type="number"
                          value={Math.round(pt.x)}
                          onChange={(e) =>
                            onUpdateCableRoutePoint?.(cable.id, pt.id, {
                              x: parseFloat(e.target.value) || 0,
                              y: pt.y,
                              z: pt.z,
                            })
                          }
                          className="w-full bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-center text-slate-200"
                        />
                      </div>
                      <div className="flex items-center">
                        <span className="text-slate-500 mr-0.5">Y:</span>
                        <input
                          type="number"
                          value={Math.round(pt.y)}
                          onChange={(e) =>
                            onUpdateCableRoutePoint?.(cable.id, pt.id, {
                              x: pt.x,
                              y: parseFloat(e.target.value) || 0,
                              z: pt.z,
                            })
                          }
                          className="w-full bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-center text-slate-200"
                        />
                      </div>
                      <div className="flex items-center">
                        <span className="text-slate-500 mr-0.5">Z:</span>
                        <input
                          type="number"
                          value={Math.round(pt.z)}
                          onChange={(e) =>
                            onUpdateCableRoutePoint?.(cable.id, pt.id, {
                              x: pt.x,
                              y: pt.y,
                              z: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-center text-slate-200"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDeleteCableRoutePoint?.(cable.id, pt.id)}
                      className="p-1 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                      title="Ushbu burilish nuqtasini o‘chirish"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 italic">
                Burilish nuqtalari yo‘q. Kabel to‘g‘ridan-to‘g‘ri yoki tabiiy osilish shaklida o‘tmoqda. 3D sahnada ustiga bosib yoki yuqoridagi tugma orqali istalgan joyidan burishingiz mumkin.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Footer controls: Color & Disconnect */}
      <div className="cable-controls-row mt-2 pt-2 border-t border-slate-700/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={cable.color}
            onChange={(e) => onUpdateCableColor(cable.id, e.target.value)}
            className="color-picker-input cursor-pointer"
            title="Kabel rangini o‘zgartirish"
            onClick={(e) => e.stopPropagation()}
          />
          <span className="text-[10px] text-slate-400">Rang</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className={`px-2 py-1 text-[11px] rounded border transition-colors ${
              isSelected
                ? "bg-cyan-500 text-slate-950 font-bold border-cyan-400"
                : "bg-slate-800 text-slate-300 border-slate-700 hover:text-white"
            }`}
            onClick={(e) => {
              e.stopPropagation();
              onSelectCable?.(isSelected ? null : cable.id);
            }}
          >
            {isSelected ? "3D da tanlangan" : "3D da ko‘rish"}
          </button>
          <button
            type="button"
            className="btn-cable-disconnect"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteCable(cable.id);
            }}
            title="Kabelni uzish"
          >
            <Unlink size={12} /> Uzish
          </button>
        </div>
      </div>
    </div>
  );
};

export const PlacedInspectorPanel: React.FC<PlacedInspectorPanelProps> = ({
  selectedInstance,
  selectedInstances = [],
  selectedInstanceIds = [],
  selectedPinFullName,
  cables,
  instances,
  onUpdatePosition,
  onUpdateRotation,
  onUpdateScale,
  onToggleLock,
  onToggleVisibility,
  onRemoveFromScene,
  onSelectPin,
  onStartCableConnection,
  onDeleteCable,
  onUpdateCableColor,
  onSelectInstance,
  onUpdateInstanceColor,
  onApplyColorToAllInstances,
  onToggleAttachToDrone,
  onBatchAttachToDrone,
  onBatchRemoveFromScene,
  onBatchToggleLock,
  onBatchDeltaMove,
  onCopySelected,
  onPaste,
  hasClipboard = false,
  onDeleteSelected,
  onFlipSelected,
  droneColor = "#2b323c",
  onUpdateDroneColor,
  isDronePlaced = true,
  onToggleDronePresence,
  isPlacingPinMode = false,
  onTogglePinPlacingMode,
  onAddCustomPin,
  onUpdateCustomPin,
  onDeleteCustomPin,
  onLoadPresetPins,
  onBatchUpdateScale,
  selectedCableId = null,
  onSelectCable,
  onUpdateCable,
  onAddCableRoutePoint,
  onUpdateCableRoutePoint,
  onDeleteCableRoutePoint,
  onStraightenCable,
  onSwapCableEnds,
  onCollapse,
  onReloadJetson,
  isReloadingJetson = false,
  onChangeModel,
  isIsolatedView = false,
  onToggleIsolatedView,
}) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<"inspector" | "pins" | "cables">("inspector");

  // State for inline custom pin name editing
  const [editingPinFullName, setEditingPinFullName] = useState<string | null>(null);
  const [editingPinLabelValue, setEditingPinLabelValue] = useState<string>("");

  // Only render custom pins defined by user! No automatic dummy pins
  const componentPins: PinDefinition[] = selectedInstance
    ? selectedInstance.customPins || []
    : [];

  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [newPinLabel, setNewPinLabel] = useState<string>("");
  const [newPinType, setNewPinType] = useState<PinDefinition["type"]>("signal");
  const [newPinVoltage, setNewPinVoltage] = useState<string>("3.3V");
  const [newPinX, setNewPinX] = useState<number>(0);
  const [newPinY, setNewPinY] = useState<number>(0);
  const [newPinZ, setNewPinZ] = useState<number>(0);

  const handlePosChange = (axis: 0 | 1 | 2, value: number) => {
    if (!selectedInstance) return;
    const newPos: [number, number, number] = [...selectedInstance.position];
    newPos[axis] = isNaN(value) ? 0 : Math.round(value * 10) / 10;
    onUpdatePosition(selectedInstance.instanceId, newPos);
  };

  const handleRotChange = (axis: 0 | 1 | 2, value: number) => {
    if (!selectedInstance) return;
    const newRot: [number, number, number] = [...selectedInstance.rotation];
    newRot[axis] = isNaN(value) ? 0 : Math.round(value * 10) / 10;
    onUpdateRotation(selectedInstance.instanceId, newRot);
  };

  const handleFlipInstance = (type: "horizontal" | "vertical" | "roll") => {
    if (onFlipSelected) {
      onFlipSelected(type);
      return;
    }
    if (!selectedInstance) return;
    const newRot: [number, number, number] = [...selectedInstance.rotation];
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
    onUpdateRotation(selectedInstance.instanceId, newRot);
  };

  const handleScaleChange = (axis: 0 | 1 | 2, value: number) => {
    if (!selectedInstance) return;
    const newScale: [number, number, number] = [...selectedInstance.scale];
    newScale[axis] = Math.max(0.01, isNaN(value) ? 1 : Math.round(value * 100) / 100);
    onUpdateScale(selectedInstance.instanceId, newScale);
  };

  const resetTransforms = () => {
    if (!selectedInstance) return;
    onUpdateRotation(selectedInstance.instanceId, [0, 0, 0]);
    onUpdateScale(selectedInstance.instanceId, [1, 1, 1]);
  };

  // Millimeter Precision Dimension States and Handlers
  const [lockAspectRatio, setLockAspectRatio] = useState<boolean>(true);
  const [showAdvancedScale, setShowAdvancedScale] = useState<boolean>(false);

  // Baseline unscaled CAD dimensions in mm
  const baseDimensions = useMemo<[number, number, number]>(() => {
    if (!selectedInstance) return [50, 50, 50];
    return getComponentBaseDimensions(selectedInstance.componentId);
  }, [selectedInstance?.componentId]);

  // Current physical dimensions in mm: base * scale
  const currentDimensions = useMemo<[number, number, number]>(() => {
    if (!selectedInstance) return [50, 50, 50];
    return calculateDimensionsFromScale(baseDimensions, selectedInstance.scale);
  }, [baseDimensions, selectedInstance?.scale]);

  const componentMeta = useMemo(() => {
    if (!selectedInstance) return null;
    return VERIFIED_COMPONENT_DIMENSIONS[selectedInstance.componentId] || null;
  }, [selectedInstance?.componentId]);

  const handleDimensionChange = (axis: 0 | 1 | 2, valueMm: number) => {
    if (!selectedInstance || selectedInstance.locked) return;
    const safeMm = Math.max(0.1, isNaN(valueMm) ? 1 : Math.round(valueMm * 10) / 10);

    if (lockAspectRatio) {
      const newScale = calculateProportionalScale(
        baseDimensions,
        selectedInstance.scale,
        axis,
        safeMm
      );
      onUpdateScale(selectedInstance.instanceId, newScale);
    } else {
      const targetMm: [number, number, number] = [...currentDimensions];
      targetMm[axis] = safeMm;
      const newScale = calculateScaleFromDimensions(baseDimensions, targetMm);
      onUpdateScale(selectedInstance.instanceId, newScale);
    }
  };

  const handleDimensionDelta = (axis: 0 | 1 | 2, deltaMm: number) => {
    if (!selectedInstance || selectedInstance.locked) return;
    const currentVal = currentDimensions[axis];
    handleDimensionChange(axis, currentVal + deltaMm);
  };

  const handleApplyScaleFactor = (factor: number) => {
    if (!selectedInstance || selectedInstance.locked) return;
    if (factor === 1) {
      onUpdateScale(selectedInstance.instanceId, [1, 1, 1]);
      return;
    }
    const newScale: [number, number, number] = [
      Math.max(0.01, Math.round(selectedInstance.scale[0] * factor * 1000) / 1000),
      Math.max(0.01, Math.round(selectedInstance.scale[1] * factor * 1000) / 1000),
      Math.max(0.01, Math.round(selectedInstance.scale[2] * factor * 1000) / 1000),
    ];
    onUpdateScale(selectedInstance.instanceId, newScale);
  };

  const resetScaleToCAD = () => {
    if (!selectedInstance || selectedInstance.locked) return;
    onUpdateScale(selectedInstance.instanceId, [1, 1, 1]);
  };

  // Find connected cables for selected instance
  const connectedCables = selectedInstance
    ? cables.filter(
        (c) =>
          c.sourceInstanceId === selectedInstance.instanceId ||
          c.targetInstanceId === selectedInstance.instanceId
      )
    : [];

  return (
    <aside className="inspector-panel" id="placed-inspector-sidebar">
      {/* Panel Tab Navigation */}
      <div className="inspector-nav-tabs">
        <button
          id="tab-btn-inspector"
          className={`inspector-tab-btn ${activeTab === "inspector" ? "active" : ""}`}
          onClick={() => setActiveTab("inspector")}
        >
          <Sliders size={14} />
          <span>{t("inspector.tabProperties")}</span>
        </button>
        <button
          id="tab-btn-pins"
          className={`inspector-tab-btn ${activeTab === "pins" ? "active" : ""}`}
          onClick={() => setActiveTab("pins")}
        >
          <Zap size={14} />
          <span>{t("inspector.tabPins")} {selectedInstance ? `(${componentPins.length})` : ""}</span>
        </button>
        <button
          id="tab-btn-cables"
          className={`inspector-tab-btn ${activeTab === "cables" ? "active" : ""}`}
          onClick={() => setActiveTab("cables")}
        >
          <Cable size={14} />
          <span>{t("inspector.tabCables")} ({cables.length})</span>
        </button>
        {onCollapse && (
          <button
            type="button"
            className="inspector-collapse-tab-btn"
            onClick={onCollapse}
            title="Inspektor panelini yig‘ish (yashirish)"
          >
            <ChevronRight size={15} />
          </button>
        )}
      </div>

      <div className="inspector-content-scroll">
        {/* Multi-selection summary card when >1 items selected */}
        {selectedInstances.length > 1 && (
          <div
            id="multi-selection-card"
            className="card-section p-3.5 mb-3.5 bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/40 border border-cyan-500/50 rounded-xl shadow-xl"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Sparkles size={15} className="text-cyan-400 animate-pulse" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Multi-Tanlov ({selectedInstances.length} ta element)
                </span>
              </div>
              <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-500/30 font-medium">
                Sinxron boshqaruv
              </span>
            </div>

            <p className="text-[11px] text-slate-300 mb-3 leading-relaxed">
              Tanlangan barcha elementlar 3D sahnadagi o‘qlar orqali bir vaqtda birga harakatlanadi.
            </p>

            {/* Chips list of selected elements */}
            <div className="flex flex-wrap gap-1.5 mb-3 max-h-24 overflow-y-auto pr-1">
              {selectedInstances.map((inst) => (
                <span
                  key={inst.instanceId}
                  onClick={() => onSelectInstance(inst.instanceId)}
                  className={`text-[10px] px-2 py-0.5 rounded-md border flex items-center gap-1 cursor-pointer transition-colors ${
                    inst.instanceId === selectedInstance?.instanceId
                      ? "bg-cyan-500/30 border-cyan-400 text-white font-medium shadow-sm"
                      : "bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500"
                  }`}
                  title="Faqat ushbu elementni tahrirlash uchun bosing"
                >
                  {inst.attachedToDrone && <span className="text-cyan-400">🔗</span>}
                  {inst.customLabel || inst.name}
                </span>
              ))}
            </div>

            {/* Batch Clipboard & Shortcuts row */}
            <div className="grid grid-cols-2 gap-2 mb-2">
              <button
                id="btn-batch-copy"
                type="button"
                className="px-2.5 py-1.5 bg-emerald-950/50 hover:bg-emerald-900/70 text-emerald-300 border border-emerald-800/60 text-[11px] font-medium rounded-md flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                onClick={onCopySelected}
                title="Tanlangan elementlardan nusxa olish (Klaviatura: Ctrl+C)"
              >
                <Copy size={12} />
                <span>Nusxalash (Ctrl+C)</span>
              </button>

              <button
                id="btn-batch-paste"
                type="button"
                disabled={!hasClipboard}
                className={`px-2.5 py-1.5 text-[11px] font-medium rounded-md flex items-center justify-center gap-1.5 transition-all shadow-sm ${
                  hasClipboard
                    ? "bg-sky-950/60 hover:bg-sky-900/80 text-sky-300 border border-sky-800/60 cursor-pointer"
                    : "bg-slate-900/50 text-slate-500 border border-slate-800 cursor-not-allowed opacity-60"
                }`}
                onClick={onPaste}
                title="Xotiradagi nusxalarni sahnaga qo‘shish (Klaviatura: Ctrl+V)"
              >
                <ClipboardPaste size={12} />
                <span>Joylash (Ctrl+V)</span>
              </button>
            </div>

            {/* Batch Flip 180° (Horizontal & Vertical) */}
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2 mb-2">
              <span className="text-[10px] text-slate-400 font-semibold block mb-1.5 flex items-center justify-between">
                <span>180° Flip (Birgalikda burish):</span>
                <span className="text-[9px] text-cyan-400 font-mono">1 tugma bilan</span>
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  id="btn-batch-flip-horizontal"
                  type="button"
                  className="px-2 py-1.5 bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-300 hover:text-white border border-indigo-800/60 rounded text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
                  onClick={() => onFlipSelected?.("horizontal")}
                  title="Barcha tanlangan elementlarni gorizontal 180° ga burish (Yaw / Y o‘qi)"
                >
                  <FlipHorizontal size={13} />
                  <span>↔ Gorizontal (180°)</span>
                </button>
                <button
                  id="btn-batch-flip-vertical"
                  type="button"
                  className="px-2 py-1.5 bg-violet-950/60 hover:bg-violet-900/80 text-violet-300 hover:text-white border border-violet-800/60 rounded text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
                  onClick={() => onFlipSelected?.("vertical")}
                  title="Barcha tanlangan elementlarni vertikal 180° ga ag‘darish (Pitch / X o‘qi)"
                >
                  <FlipVertical size={13} />
                  <span>↕ Vertikal (180°)</span>
                </button>
              </div>
            </div>

            {/* Batch Actions */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                id="btn-batch-attach-drone"
                type="button"
                className="px-2.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-medium rounded-md flex items-center justify-center gap-1.5 transition-all shadow cursor-pointer"
                onClick={() =>
                  onBatchAttachToDrone?.(
                    selectedInstances.map((i) => i.instanceId),
                    true
                  )
                }
              >
                <Link size={12} />
                <span>Dronga biriktirish</span>
              </button>

              <button
                id="btn-batch-detach-drone"
                type="button"
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium rounded-md border border-slate-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                onClick={() =>
                  onBatchAttachToDrone?.(
                    selectedInstances.map((i) => i.instanceId),
                    false
                  )
                }
              >
                <Unlink size={12} />
                <span>Drondan ajratish</span>
              </button>

              <button
                id="btn-batch-toggle-lock"
                type="button"
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium rounded-md border border-slate-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                onClick={() =>
                  onBatchToggleLock?.(selectedInstances.map((i) => i.instanceId))
                }
              >
                <Lock size={12} />
                <span>Qulflash / Ochish</span>
              </button>

              <button
                id="btn-batch-remove"
                type="button"
                className="px-2.5 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50 text-[11px] font-medium rounded-md flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                onClick={() =>
                  onBatchRemoveFromScene?.(selectedInstances.map((i) => i.instanceId))
                }
              >
                <Trash2 size={12} />
                <span>Sahnadan olish</span>
              </button>
            </div>

            {/* Batch Scale Controls */}
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2 mb-3">
              <span className="text-[10px] text-slate-400 font-semibold block mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Ruler size={11} className="text-cyan-400" />
                  <span>Guruhli o‘lcham (Masshtab):</span>
                </span>
                <span className="text-[9px] text-cyan-400 font-mono">Barchasi uchun</span>
              </span>
              <div className="grid grid-cols-4 gap-1">
                <button
                  type="button"
                  className="py-1 px-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 text-[10px] font-medium rounded border border-slate-800 flex items-center justify-center transition-all cursor-pointer"
                  onClick={() => onBatchUpdateScale?.(selectedInstances.map((i) => i.instanceId), 0.9)}
                  title="Barcha tanlangan elementlarni 10% ga kichraytirish"
                >
                  -10%
                </button>
                <button
                  type="button"
                  className="py-1 px-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 text-[10px] font-medium rounded border border-slate-800 flex items-center justify-center transition-all cursor-pointer"
                  onClick={() => onBatchUpdateScale?.(selectedInstances.map((i) => i.instanceId), 1.1)}
                  title="Barcha tanlangan elementlarni 10% ga kattalashtirish"
                >
                  +10%
                </button>
                <button
                  type="button"
                  className="py-1 px-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 text-[10px] font-medium rounded border border-slate-800 flex items-center justify-center transition-all cursor-pointer"
                  onClick={() => onBatchUpdateScale?.(selectedInstances.map((i) => i.instanceId), 2.0)}
                  title="Barcha tanlangan elementlarni 2 barobar kattalashtirish"
                >
                  2.0×
                </button>
                <button
                  type="button"
                  className="py-1 px-1.5 bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 text-[10px] font-medium rounded border border-cyan-800/60 flex items-center justify-center transition-all cursor-pointer"
                  onClick={() => onBatchUpdateScale?.(selectedInstances.map((i) => i.instanceId), 1.0)}
                  title="Barcha tanlangan elementlarni 1:1 asl CAD o‘lchamiga qaytarish"
                >
                  1:1 Asl
                </button>
              </div>
            </div>

            {/* Batch Delta Nudge Buttons */}
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2">
              <span className="text-[10px] text-slate-400 font-semibold block mb-1.5">
                Birgalikda surish (Delta Nudge):
              </span>
              <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                {(["X", "Y", "Z"] as const).map((axisName, axisIdx) => (
                  <div
                    key={axisName}
                    className="flex flex-col items-center bg-slate-900/80 p-1.5 rounded border border-slate-800"
                  >
                    <span className="font-bold text-slate-300 mb-1">{axisName}</span>
                    <div className="flex gap-1 w-full justify-center">
                      <button
                        type="button"
                        className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-mono text-[9px] cursor-pointer"
                        onClick={() => onBatchDeltaMove?.(axisIdx as (0 | 1 | 2), -10)}
                        title="-10mm surish"
                      >
                        -10
                      </button>
                      <button
                        type="button"
                        className="px-1.5 py-0.5 bg-cyan-950/70 hover:bg-cyan-900/90 text-cyan-300 border border-cyan-800/60 rounded font-mono text-[9px] cursor-pointer"
                        onClick={() => onBatchDeltaMove?.(axisIdx as (0 | 1 | 2), 10)}
                        title="+10mm surish"
                      >
                        +10
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {selectedInstance ? (
          <>
            {/* Active Tab: General Inspector */}
            {activeTab === "inspector" && (
              <div className="tab-pane active" id="inspector-tab-pane">
                <div className="card-section instance-header-card">
                  <div className="instance-tag-row">
                    <span className="inst-badge-id">ID: #{selectedInstance.componentId}</span>
                    <span className="inst-badge-num">Nusxa {selectedInstance.instanceIndex}</span>
                    <span className="cad-verified-badge" title="Datasheet & CAD asosida tasdiqlangan">
                      <ShieldCheck size={12} />
                      <span>Tasdiqlangan CAD</span>
                    </span>
                  </div>

                  <h3 className="inst-title">
                    {selectedInstance.customLabel || selectedInstance.name}
                  </h3>

                  {/* Lock / Hide / Remove Buttons */}
                  <div className="inst-action-toolbar">
                    <button
                      id={`btn-lock-${selectedInstance.instanceId}`}
                      className={`inst-tool-btn ${selectedInstance.locked ? "active-warn" : ""}`}
                      onClick={() => onToggleLock(selectedInstance.instanceId)}
                      title={selectedInstance.locked ? "Qulfni ochish" : "Qulflash (joyini qimirlatmaslik)"}
                    >
                      {selectedInstance.locked ? <Lock size={14} /> : <Unlock size={14} />}
                      <span>{selectedInstance.locked ? "Qulflangan" : "Qulflash"}</span>
                    </button>

                    <button
                      id={`btn-vis-${selectedInstance.instanceId}`}
                      className={`inst-tool-btn ${!selectedInstance.visible ? "active-warn" : ""}`}
                      onClick={() => onToggleVisibility(selectedInstance.instanceId)}
                      title={selectedInstance.visible ? "Yashirish" : "Ko‘rsatish"}
                    >
                      {selectedInstance.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                      <span>{selectedInstance.visible ? "Ko‘rsatilgan" : "Yashirilgan"}</span>
                    </button>

                    {onToggleIsolatedView && (
                      <button
                        id={`btn-isolate-${selectedInstance.instanceId}`}
                        className={`inst-tool-btn ${isIsolatedView ? "active-warn text-amber-300 border-amber-500/50 bg-amber-500/10" : ""}`}
                        onClick={onToggleIsolatedView}
                        title={
                          isIsolatedView
                            ? "Barcha modellarni qayta ko‘rsatish"
                            : "Ushbu modelni alohida ko‘rsatish (xalaqit beruvchi to‘siqlarni yashirish)"
                        }
                      >
                        <Layers size={14} className={isIsolatedView ? "text-amber-400 animate-pulse" : ""} />
                        <span>{isIsolatedView ? "Alohida (Faol)" : "Alohida ko‘rsatish"}</span>
                      </button>
                    )}

                    {!selectedInstance.isAirframe && selectedInstance.componentId !== "01" && onCopySelected && (
                      <button
                        id={`btn-copy-${selectedInstance.instanceId}`}
                        className="inst-tool-btn"
                        onClick={onCopySelected}
                        title="Ushbu elementdan nusxa olish (Klaviatura: Ctrl+C)"
                      >
                        <Copy size={14} />
                        <span>Nusxa (Ctrl+C)</span>
                      </button>
                    )}

                    {hasClipboard && onPaste && (
                      <button
                        id="btn-paste-single"
                        className="inst-tool-btn"
                        onClick={onPaste}
                        title="Xotiradagi nusxani sahnaga qo‘yish (Klaviatura: Ctrl+V)"
                      >
                        <ClipboardPaste size={14} />
                        <span>Joylash (Ctrl+V)</span>
                      </button>
                    )}

                    {selectedInstance.componentId === "19" && onReloadJetson && (
                      <button
                        id={`btn-reload-jetson-${selectedInstance.instanceId}`}
                        className="inst-tool-btn"
                        onClick={onReloadJetson}
                        title="Jetson P3737 3D modelini xotiradan tozalab, yangidan yuklash"
                      >
                        <RefreshCw size={14} className={isReloadingJetson ? "animate-spin text-cyan-400" : "text-cyan-400"} />
                        <span className="text-cyan-300">Jetsonni yangilash</span>
                      </button>
                    )}

                    {onChangeModel && (
                      <button
                        id={`btn-change-model-${selectedInstance.instanceId}`}
                        className="inst-tool-btn"
                        onClick={() => onChangeModel(selectedInstance.componentId)}
                        title="Ushbu komponent uchun 3D modelni o‘zgartirish yoki yangi model yuklash"
                      >
                        <Box size={14} className="text-cyan-400" />
                        <span className="text-cyan-300">Modelni almashtirish</span>
                      </button>
                    )}

                    <button
                      id={`btn-remove-${selectedInstance.instanceId}`}
                      className="inst-tool-btn danger"
                      onClick={() => onRemoveFromScene(selectedInstance.instanceId)}
                      title={
                        selectedInstance.isAirframe || selectedInstance.componentId === "01"
                          ? "Dron korpusini sahnadan o‘chirish"
                          : "Sahnadan olib tashlash va inventarga qaytarish (Klaviatura: Delete)"
                      }
                    >
                      <Trash2 size={14} />
                      <span>
                        {selectedInstance.isAirframe || selectedInstance.componentId === "01"
                          ? "Dronni o‘chirish"
                          : "O‘chirish [Del]"}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Drone Attachment & Rigidity Section */}
                {!selectedInstance.isAirframe && selectedInstance.componentId !== "01" && (
                  <div
                    className={`card-section p-3 rounded-lg border transition-all ${
                      selectedInstance.attachedToDrone
                        ? "bg-cyan-950/30 border-cyan-500/40"
                        : "bg-slate-800/40 border-slate-700/60"
                    }`}
                    id="section-drone-attachment"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold">
                        <Link
                          size={13}
                          className={selectedInstance.attachedToDrone ? "text-cyan-400" : "text-slate-400"}
                        />
                        <span className={selectedInstance.attachedToDrone ? "text-cyan-200" : "text-slate-300"}>
                          Dronga Biriktirish (Fizik Bog‘lanish)
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                          selectedInstance.attachedToDrone
                            ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                            : "bg-slate-700/50 text-slate-400 border-slate-600/40"
                        }`}
                      >
                        {selectedInstance.attachedToDrone ? "Biriktirilgan ✓" : "Erkin"}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 mb-2.5 leading-relaxed">
                      {selectedInstance.attachedToDrone
                        ? "Ushbu komponent dronga qattiq biriktirilgan. Dron ko‘chirilganda yoki burilganda u avtomatik ravishda dron bilan birga harakatlanadi."
                        : "Komponent hozir erkin joylashgan. Dron ko‘chirilganda u bilan birga harakatlanishi uchun dronga biriktirib qo‘ying."}
                    </p>

                    {selectedInstance.attachedToDrone && selectedInstance.droneRelativePos && (
                      <div className="text-[10px] font-mono text-cyan-300/90 bg-cyan-950/50 px-2 py-1.5 rounded mb-2 border border-cyan-900/70 flex justify-between">
                        <span>Dron markazidan masofa:</span>
                        <span>
                          ΔX: {Math.round(selectedInstance.droneRelativePos[0])}mm, ΔY:{" "}
                          {Math.round(selectedInstance.droneRelativePos[1])}mm, ΔZ:{" "}
                          {Math.round(selectedInstance.droneRelativePos[2])}mm
                        </span>
                      </div>
                    )}

                    <button
                      id={`btn-toggle-drone-attach-${selectedInstance.instanceId}`}
                      type="button"
                      className={`w-full py-2 px-3 rounded-md text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        selectedInstance.attachedToDrone
                          ? "bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-200 border border-cyan-500/50"
                          : "bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-950/50"
                      }`}
                      onClick={() => onToggleAttachToDrone?.(selectedInstance.instanceId)}
                    >
                      {selectedInstance.attachedToDrone ? (
                        <>
                          <Unlink size={13} />
                          <span>Drondan Ajratish (Erkin qilish)</span>
                        </>
                      ) : (
                        <>
                          <Link size={13} />
                          <span>Dronga Biriktirish (Dron bilan birga surilsin)</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Position in mm */}
                <div className="card-section">
                  <div className="section-title-row">
                    <span className="section-title">Pozitsiya (X, Y, Z) — millimetr</span>
                    <span className="section-unit">mm</span>
                  </div>
                  <div className="numeric-inputs-grid">
                    {(["X", "Y", "Z"] as const).map((axisName, idx) => (
                      <div key={axisName} className={`coord-field field-${axisName.toLowerCase()}`}>
                        <label>{axisName}:</label>
                        <input
                          id={`input-pos-${axisName.toLowerCase()}`}
                          type="number"
                          step="1"
                          value={Math.round(selectedInstance.position[idx])}
                          onChange={(e) => handlePosChange(idx as 0 | 1 | 2, parseFloat(e.target.value))}
                          disabled={selectedInstance.locked}
                          className="coord-input"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Rotation in Degrees with 180° Flip */}
                <div className="card-section" id="section-rotation-controls">
                  <div className="section-title-row">
                    <span className="section-title">Aylanish (Pitch, Yaw, Roll)</span>
                    <button
                      id="btn-reset-rotation"
                      type="button"
                      className="btn-tiny-reset"
                      onClick={() => onUpdateRotation(selectedInstance.instanceId, [0, 0, 0])}
                      title="Aylanish burchagini 0° ga qaytarish"
                    >
                      <RotateCcw size={11} /> 0° Qaytarish
                    </button>
                  </div>

                  {/* 180° Flip (Horizontal & Vertical) — 1 Tugma Bilan */}
                  <div className="bg-slate-950/80 border border-slate-800/90 rounded-lg p-2.5 mb-2.5 shadow-inner">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-semibold text-slate-200 flex items-center gap-1.5">
                        <Sparkles size={12} className="text-cyan-400" />
                        <span>Tezkor 180° Flip:</span>
                      </span>
                      <span className="text-[9px] text-cyan-400/90 font-mono bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/50">
                        1 tugma bilan
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <button
                        id="btn-flip-horizontal"
                        type="button"
                        disabled={selectedInstance.locked}
                        className={`px-3 py-2 rounded-md text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm ${
                          selectedInstance.locked
                            ? "bg-slate-900/50 text-slate-500 border border-slate-800 cursor-not-allowed opacity-60"
                            : "bg-indigo-950/70 hover:bg-indigo-900 text-indigo-200 hover:text-white border border-indigo-700/60 cursor-pointer active:scale-95"
                        }`}
                        onClick={() => handleFlipInstance("horizontal")}
                        title="Gorizontal 180° ga burish (Yaw / Y o‘qi) — Oldi va orqa tomonni 180 gradusga almashtirish"
                      >
                        <FlipHorizontal size={14} className="text-indigo-300" />
                        <span>↔ Gorizontal (180°)</span>
                      </button>

                      <button
                        id="btn-flip-vertical"
                        type="button"
                        disabled={selectedInstance.locked}
                        className={`px-3 py-2 rounded-md text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm ${
                          selectedInstance.locked
                            ? "bg-slate-900/50 text-slate-500 border border-slate-800 cursor-not-allowed opacity-60"
                            : "bg-violet-950/70 hover:bg-violet-900 text-violet-200 hover:text-white border border-violet-700/60 cursor-pointer active:scale-95"
                        }`}
                        onClick={() => handleFlipInstance("vertical")}
                        title="Vertikal 180° ga ag‘darish (Pitch / X o‘qi) — Ustki va ostki tomonni 180 gradusga ag‘darish"
                      >
                        <FlipVertical size={14} className="text-violet-300" />
                        <span>↕ Vertikal (180°)</span>
                      </button>
                    </div>

                    {/* Secondary Quick Rotate helpers: Yaw ±90° and Roll 180° */}
                    <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                      <button
                        id="btn-rot-minus-90"
                        type="button"
                        disabled={selectedInstance.locked}
                        className="py-1 px-1.5 bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800/80 rounded flex items-center justify-center gap-1 cursor-pointer transition-colors"
                        onClick={() => {
                          const newRot: [number, number, number] = [...selectedInstance.rotation];
                          newRot[1] = Math.round((newRot[1] - 90) % 360);
                          onUpdateRotation(selectedInstance.instanceId, newRot);
                        }}
                        title="Chapga 90° ga burish (-90° Yaw)"
                      >
                        <RotateCcw size={10} />
                        <span>-90° (Yaw)</span>
                      </button>

                      <button
                        id="btn-rot-plus-90"
                        type="button"
                        disabled={selectedInstance.locked}
                        className="py-1 px-1.5 bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800/80 rounded flex items-center justify-center gap-1 cursor-pointer transition-colors"
                        onClick={() => {
                          const newRot: [number, number, number] = [...selectedInstance.rotation];
                          newRot[1] = Math.round((newRot[1] + 90) % 360);
                          onUpdateRotation(selectedInstance.instanceId, newRot);
                        }}
                        title="O‘ngga 90° ga burish (+90° Yaw)"
                      >
                        <RotateCw size={10} />
                        <span>+90° (Yaw)</span>
                      </button>

                      <button
                        id="btn-flip-roll-180"
                        type="button"
                        disabled={selectedInstance.locked}
                        className="py-1 px-1.5 bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800/80 rounded flex items-center justify-center gap-1 cursor-pointer transition-colors"
                        onClick={() => handleFlipInstance("roll")}
                        title="Yon tomonga 180° Roll flip qilish (Z o‘qi)"
                      >
                        <span>🔄 180° Roll</span>
                      </button>
                    </div>
                  </div>

                  <div className="numeric-inputs-grid">
                    {(["Pitch (X)", "Yaw (Y)", "Roll (Z)"] as const).map((axisName, idx) => (
                      <div key={axisName} className="coord-field">
                        <label>{axisName.split(" ")[0]}:</label>
                        <input
                          id={`input-rot-${idx}`}
                          type="number"
                          step="5"
                          value={Math.round(selectedInstance.rotation[idx])}
                          onChange={(e) => handleRotChange(idx as 0 | 1 | 2, parseFloat(e.target.value))}
                          disabled={selectedInstance.locked}
                          className="coord-input"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Millimeter Dimensions & Scale Section */}
                <div className="card-section" id="section-dimensions-mm">
                  <div className="section-title-row mb-1.5">
                    <div className="section-title-flex">
                      <Ruler size={13} className="text-cyan-400" />
                      <span className="section-title">O‘lchamlar — Millimetr (mm)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        id="btn-reset-cad-scale"
                        type="button"
                        className="btn-tiny-reset"
                        onClick={resetScaleToCAD}
                        disabled={selectedInstance.locked}
                        title="1:1 Asl CAD o‘lchamlariga qaytarish"
                      >
                        <RotateCcw size={10} /> 1:1 CAD
                      </button>
                    </div>
                  </div>

                  {/* Aspect Ratio Lock Toggle */}
                  <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded-md p-1.5 mb-2.5">
                    <button
                      type="button"
                      onClick={() => setLockAspectRatio(!lockAspectRatio)}
                      className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1.5 border transition-all cursor-pointer ${
                        lockAspectRatio
                          ? "bg-cyan-950/80 text-cyan-300 border-cyan-800/80 shadow-[0_0_8px_rgba(6,182,212,0.15)]"
                          : "bg-amber-950/60 text-amber-300 border-amber-800/60"
                      }`}
                      title={
                        lockAspectRatio
                          ? "Proportsional masshtab yoqilgan: bir o‘q o‘zgarganda qolganlari mutanosib o‘zgaradi"
                          : "Mustaqil rejim: X, Y, Z o‘lchamlari bir-biridan mustaqil o‘zgaradi"
                      }
                    >
                      {lockAspectRatio ? (
                        <Lock size={12} className="text-cyan-400" />
                      ) : (
                        <Unlock size={12} className="text-amber-400" />
                      )}
                      <span>
                        {lockAspectRatio ? "Proportsional (Bir tekis)" : "Mustaqil (Erkin)"}
                      </span>
                    </button>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {lockAspectRatio ? "1:1:1 bog‘langan" : "X ≠ Y ≠ Z"}
                    </span>
                  </div>

                  {/* Millimeter Inputs for X, Y, Z */}
                  <div className="flex flex-col gap-2 mb-2.5">
                    {[
                      {
                        axis: 0 as const,
                        label: "X",
                        subLabel: "Eni",
                        desc: componentMeta?.axisDescriptions.x || "Kengligi / Eni",
                        borderClass: "border-rose-900/50 focus-within:border-rose-500",
                        badgeBg: "bg-rose-950/60 text-rose-300 border-rose-800/50",
                      },
                      {
                        axis: 1 as const,
                        label: "Y",
                        subLabel: "Balandlik",
                        desc: componentMeta?.axisDescriptions.y || "Balandligi",
                        borderClass: "border-emerald-900/50 focus-within:border-emerald-500",
                        badgeBg: "bg-emerald-950/60 text-emerald-300 border-emerald-800/50",
                      },
                      {
                        axis: 2 as const,
                        label: "Z",
                        subLabel: "Uzunlik",
                        desc: componentMeta?.axisDescriptions.z || "Uzunligi / Bo‘yi",
                        borderClass: "border-sky-900/50 focus-within:border-sky-500",
                        badgeBg: "bg-sky-950/60 text-sky-300 border-sky-800/50",
                      },
                    ].map(({ axis, label, subLabel, desc, borderClass, badgeBg }) => {
                      const isLargeObject = baseDimensions[axis] >= 500;
                      const stepSmall = isLargeObject ? 10 : 1;
                      const stepBig = isLargeObject ? 50 : 10;
                      const diffFromBase = currentDimensions[axis] - baseDimensions[axis];

                      return (
                        <div
                          key={axis}
                          className={`bg-slate-900/60 border rounded-md p-2 transition-all ${borderClass}`}
                        >
                          {/* Header Row */}
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${badgeBg}`}
                              >
                                {label} ({subLabel})
                              </span>
                              <span
                                className="text-[11px] text-slate-300 truncate"
                                title={desc}
                              >
                                {desc}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono text-slate-400 shrink-0 ml-1">
                              Asl: {baseDimensions[axis].toFixed(1)} mm
                            </span>
                          </div>

                          {/* Input & Stepper Row */}
                          <div className="flex items-center gap-1.5">
                            <div className="flex-1 flex items-center bg-slate-950/90 border border-slate-700/80 rounded px-2 py-1 focus-within:border-cyan-500">
                              <input
                                id={`input-dim-${axis}`}
                                type="number"
                                step="0.5"
                                min="0.1"
                                value={currentDimensions[axis]}
                                onChange={(e) =>
                                  handleDimensionChange(axis, parseFloat(e.target.value))
                                }
                                disabled={selectedInstance.locked}
                                className="w-full bg-transparent text-white font-mono text-[13px] font-semibold text-right outline-none"
                              />
                              <span className="text-[11px] font-mono text-cyan-400 ml-1.5 font-bold select-none">
                                mm
                              </span>
                            </div>

                            {/* Precision Steppers */}
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleDimensionDelta(axis, -stepBig)}
                                disabled={selectedInstance.locked}
                                className="px-1.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 text-[10px] font-mono rounded border border-slate-700 active:scale-95 transition-all cursor-pointer"
                                title={`-${stepBig} mm kamaytirish`}
                              >
                                -{stepBig}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDimensionDelta(axis, -stepSmall)}
                                disabled={selectedInstance.locked}
                                className="px-1.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 text-[10px] font-mono rounded border border-slate-700 active:scale-95 transition-all cursor-pointer"
                                title={`-${stepSmall} mm kamaytirish`}
                              >
                                -{stepSmall}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDimensionDelta(axis, stepSmall)}
                                disabled={selectedInstance.locked}
                                className="px-1.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 text-[10px] font-mono rounded border border-slate-700 active:scale-95 transition-all cursor-pointer"
                                title={`+${stepSmall} mm oshirish`}
                              >
                                +{stepSmall}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDimensionDelta(axis, stepBig)}
                                disabled={selectedInstance.locked}
                                className="px-1.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 text-[10px] font-mono rounded border border-slate-700 active:scale-95 transition-all cursor-pointer"
                                title={`+${stepBig} mm oshirish`}
                              >
                                +{stepBig}
                              </button>
                            </div>
                          </div>

                          {/* Delta indicator */}
                          {Math.abs(diffFromBase) > 0.05 && (
                            <div className="flex items-center justify-between text-[9.5px] font-mono mt-1 pt-1 border-t border-slate-800/80">
                              <span className="text-slate-400">Farq (Delta):</span>
                              <span
                                className={diffFromBase > 0 ? "text-cyan-400" : "text-amber-400"}
                              >
                                {diffFromBase > 0 ? `+${diffFromBase.toFixed(1)}` : diffFromBase.toFixed(1)} mm ({((currentDimensions[axis] / baseDimensions[axis]) * 100).toFixed(0)}%)
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Quick Scale Ratio Presets */}
                  <div className="bg-slate-900/40 border border-slate-800/70 rounded-md p-1.5 mb-2">
                    <span className="text-[10px] text-slate-400 font-semibold block mb-1">
                      Tezkor masshtab nisbati:
                    </span>
                    <div className="grid grid-cols-5 gap-1">
                      {[
                        { label: "1:1 Asl", factor: 1.0 },
                        { label: "-10%", factor: 0.9 },
                        { label: "+10%", factor: 1.1 },
                        { label: "0.5×", factor: 0.5 },
                        { label: "2.0×", factor: 2.0 },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => handleApplyScaleFactor(preset.factor)}
                          disabled={selectedInstance.locked}
                          className="py-1 px-1 bg-slate-800/90 hover:bg-slate-700 disabled:opacity-40 text-slate-300 text-[10px] font-medium rounded border border-slate-700/80 transition-all flex items-center justify-center text-center cursor-pointer"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Advanced Multipliers Drawer (Sx, Sy, Sz) */}
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowAdvancedScale(!showAdvancedScale)}
                      className="w-full flex items-center justify-between py-1 px-2 text-[10px] text-slate-400 hover:text-slate-200 bg-slate-950/50 hover:bg-slate-900/50 border border-slate-800/60 rounded transition-all cursor-pointer"
                    >
                      <span className="flex items-center gap-1">
                        <Sliders size={10} />
                        <span>Nisbiy koeffitsiyentlar (Sx, Sy, Sz)</span>
                      </span>
                      <span className="flex items-center gap-1 font-mono text-[9px] text-slate-500">
                        <span>{selectedInstance.scale.map((s) => s.toFixed(2)).join(" × ")}</span>
                        {showAdvancedScale ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                      </span>
                    </button>

                    {showAdvancedScale && (
                      <div className="numeric-inputs-grid mt-1.5 p-1.5 bg-slate-950/70 border border-slate-800 rounded">
                        {(["Sx", "Sy", "Sz"] as const).map((axisName, idx) => (
                          <div key={axisName} className="coord-field">
                            <label>{axisName}:</label>
                            <input
                              id={`input-scale-${idx}`}
                              type="number"
                              step="0.05"
                              min="0.01"
                              max="20"
                              value={selectedInstance.scale[idx]}
                              onChange={(e) =>
                                handleScaleChange(idx as 0 | 1 | 2, parseFloat(e.target.value))
                              }
                              disabled={selectedInstance.locked}
                              className="coord-input"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Component Color Customization */}
                <div className="card-section" id="section-component-color">
                  <div className="section-title-row">
                    <div className="section-title-flex">
                      <Palette size={13} className="text-accent" />
                      <span className="section-title">Komponent Rangi</span>
                    </div>
                    {selectedInstance.customColor && (
                      <button
                        id="btn-reset-comp-color"
                        className="btn-tiny-reset"
                        onClick={() => onUpdateInstanceColor(selectedInstance.instanceId, undefined)}
                        title="Asl CAD material rangiga qaytarish"
                      >
                        <RotateCcw size={11} /> Standart rang
                      </button>
                    )}
                  </div>

                  {/* Current color indicator & Custom color picker */}
                  <div className="comp-color-active-row">
                    <div className="comp-color-indicator-wrap">
                      <span
                        className="comp-color-preview-box"
                        style={{
                          backgroundColor:
                            selectedInstance.customColor ||
                            selectedInstance.colorHint ||
                            "#475569",
                        }}
                      />
                      <span className="comp-color-status-text">
                        {selectedInstance.customColor
                          ? `Maxsus: ${selectedInstance.customColor}`
                          : "Standart CAD modeli rangi"}
                      </span>
                    </div>

                    <label
                      htmlFor={`input-color-${selectedInstance.instanceId}`}
                      className="btn-pick-custom-color"
                      title="Ixtiyoriy rang tanlash"
                    >
                      <Palette size={12} />
                      <span>Tanlash</span>
                      <input
                        id={`input-color-${selectedInstance.instanceId}`}
                        type="color"
                        value={selectedInstance.customColor || "#00d2eb"}
                        onChange={(e) =>
                          onUpdateInstanceColor(selectedInstance.instanceId, e.target.value)
                        }
                        className="hidden-color-input"
                      />
                    </label>
                  </div>

                  {/* Preset Colors Grid */}
                  <div className="comp-color-presets-grid">
                    {PRESET_COMPONENT_COLORS.map((c) => {
                      const isCurrent =
                        selectedInstance.customColor?.toLowerCase() === c.hex.toLowerCase();
                      return (
                        <button
                          key={c.hex}
                          type="button"
                          className={`comp-color-preset-btn ${isCurrent ? "active" : ""}`}
                          style={{ backgroundColor: c.hex }}
                          onClick={() => onUpdateInstanceColor(selectedInstance.instanceId, c.hex)}
                          title={`${c.name} (${c.hex})`}
                        >
                          {isCurrent && <Check size={11} className="color-check-mark" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* Apply to all instances of this component if multiple placed */}
                  {instances.filter((i) => i.componentId === selectedInstance.componentId).length > 1 &&
                    onApplyColorToAllInstances && (
                      <button
                        id="btn-apply-color-all-instances"
                        className="btn-apply-color-all"
                        onClick={() =>
                          onApplyColorToAllInstances(
                            selectedInstance.componentId,
                            selectedInstance.customColor
                          )
                        }
                        title={`Ushbu rangni barcha ${
                          instances.filter((i) => i.componentId === selectedInstance.componentId).length
                        } ta #${selectedInstance.componentId} nusxasiga o‘rnatish`}
                      >
                        Barcha #{selectedInstance.componentId} nusxalariga qo‘llash (
                        {
                          instances.filter((i) => i.componentId === selectedInstance.componentId)
                            .length
                        }{" "}
                        ta)
                      </button>
                    )}
                </div>

                {/* Quick Pin Summary */}
                <div className="card-section">
                  <div className="section-title-row">
                    <span className="section-title">Elektr Portlari & Ulagichlar</span>
                    <button
                      className="btn-link-action"
                      onClick={() => setActiveTab("pins")}
                    >
                      Barchasini ko‘rish →
                    </button>
                  </div>
                  <div className="mini-pins-list">
                    {componentPins.length === 0 ? (
                      <div className="text-xs text-slate-400 italic py-1 flex items-center justify-between">
                        <span>Pin belgilanmagan</span>
                        <button
                          className="px-2 py-0.5 text-[11px] bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 rounded border border-sky-500/30"
                          onClick={() => {
                            setActiveTab("pins");
                            if (onTogglePinPlacingMode && selectedInstance) {
                              onTogglePinPlacingMode(selectedInstance.instanceId);
                            }
                          }}
                        >
                          + Pin belgilash
                        </button>
                      </div>
                    ) : (
                      componentPins.slice(0, 4).map((pin) => (
                        <div
                          key={pin.fullName}
                          className={`mini-pin-row ${
                            selectedPinFullName === pin.fullName ? "selected" : ""
                          }`}
                          onClick={() => onSelectPin(pin.fullName)}
                        >
                          <span className={`pin-type-pill type-${pin.type}`}>{pin.type.toUpperCase()}</span>
                          <span className="pin-name-text">{pin.fullName}</span>
                          {pin.voltage && <span className="pin-volt-text">{pin.voltage}</span>}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Active Tab: Pins List */}
            {activeTab === "pins" && (
              <div className="tab-pane active" id="pins-tab-pane">
                <div className="card-section">
                  <div className="section-title-row flex items-center justify-between">
                    <span className="section-title">
                      {selectedInstance.name} Portlari ({componentPins.length})
                    </span>
                  </div>

                  {/* Manual Pin Adding Toolbar */}
                  <div className="flex flex-col gap-2 my-2.5">
                    <div className="flex items-center gap-2">
                      <button
                        id="btn-toggle-model-pin-placing"
                        type="button"
                        onClick={() => {
                          if (onTogglePinPlacingMode && selectedInstance) {
                            onTogglePinPlacingMode(selectedInstance.instanceId);
                          }
                        }}
                        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                          isPlacingPinMode
                            ? "bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/30 animate-pulse border border-amber-300"
                            : "bg-sky-600 hover:bg-sky-500 text-white shadow-md shadow-sky-900/30 border border-sky-400/30"
                        }`}
                        title="3D model ustiga bosish orqali aniq kontakt joyini belgilang"
                      >
                        <Crosshair size={14} className={isPlacingPinMode ? "animate-spin" : ""} />
                        <span>{isPlacingPinMode ? "📍 Modeldagi nuqtani bosing..." : "3D Modeldan belgilash"}</span>
                      </button>

                      <button
                        id="btn-toggle-manual-add-form"
                        type="button"
                        onClick={() => setShowAddForm((v) => !v)}
                        className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5 ${
                          showAddForm
                            ? "bg-slate-700 border-slate-500 text-white"
                            : "bg-slate-800/80 hover:bg-slate-700/80 border-slate-700 text-slate-300"
                        }`}
                        title="Koordinatalar bilan yangi pin kiritish"
                      >
                        <Plus size={14} />
                        <span>Qo‘lda</span>
                      </button>
                    </div>

                    {/* Quick Load Preset Template if exists */}
                    {COMPONENT_PINS[selectedInstance.componentId]?.length > 0 && onLoadPresetPins && (
                      <button
                        id="btn-load-preset-pins"
                        type="button"
                        onClick={() => onLoadPresetPins(selectedInstance.instanceId)}
                        className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/70 text-slate-400 hover:text-slate-200 transition-colors"
                        title="Standart komponent shablon portlarini yuklash"
                      >
                        <Download size={12} />
                        <span>Standart shablon portlarini yuklash ({COMPONENT_PINS[selectedInstance.componentId].length} ta)</span>
                      </button>
                    )}
                  </div>

                  {/* Manual Coordinate Addition Form */}
                  {showAddForm && (
                    <div className="p-3 mb-3 bg-slate-900/90 border border-slate-700 rounded-xl space-y-2.5 shadow-xl text-xs">
                      <div className="font-semibold text-sky-400 flex items-center justify-between">
                        <span>Yangi Pin Qo‘shish</span>
                        <span className="text-[10px] text-slate-500 font-mono">mm</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">Pin Nomi / Belgisi</label>
                          <input
                            type="text"
                            placeholder="Masalan: VCC, TX, CAN_H"
                            value={newPinLabel}
                            onChange={(e) => setNewPinLabel(e.target.value)}
                            className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded text-slate-100 text-xs focus:border-sky-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">Pin Turi</label>
                          <select
                            value={newPinType}
                            onChange={(e) => setNewPinType(e.target.value as PinDefinition["type"])}
                            className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded text-slate-100 text-xs focus:border-sky-500 outline-none"
                          >
                            <option value="power">POWER (Qizil)</option>
                            <option value="gnd">GND (Qora)</option>
                            <option value="signal">SIGNAL (Moviy)</option>
                            <option value="can">CAN BUS (Yashil)</option>
                            <option value="uart">UART (To‘q sariq)</option>
                            <option value="pwm">PWM (Sariq)</option>
                            <option value="ethernet">ETHERNET (Ko‘k)</option>
                            <option value="usb">USB (Binafsha)</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">Kuchlanish</label>
                          <input
                            type="text"
                            placeholder="3.3V, 5V, 12V, GND"
                            value={newPinVoltage}
                            onChange={(e) => setNewPinVoltage(e.target.value)}
                            className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded text-slate-100 text-xs focus:border-sky-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">X, Y, Z (mm)</label>
                          <div className="grid grid-cols-3 gap-1">
                            <input
                              type="number"
                              title="X mm"
                              value={newPinX}
                              onChange={(e) => setNewPinX(parseFloat(e.target.value) || 0)}
                              className="px-1 py-1 bg-slate-800 border border-slate-700 rounded text-center text-[11px] text-slate-100"
                            />
                            <input
                              type="number"
                              title="Y mm"
                              value={newPinY}
                              onChange={(e) => setNewPinY(parseFloat(e.target.value) || 0)}
                              className="px-1 py-1 bg-slate-800 border border-slate-700 rounded text-center text-[11px] text-slate-100"
                            />
                            <input
                              type="number"
                              title="Z mm"
                              value={newPinZ}
                              onChange={(e) => setNewPinZ(parseFloat(e.target.value) || 0)}
                              className="px-1 py-1 bg-slate-800 border border-slate-700 rounded text-center text-[11px] text-slate-100"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (!selectedInstance || !onAddCustomPin) return;
                            const nextIdx = (selectedInstance.customPins || []).length + 1;
                            const pinId = `p_${nextIdx}`;
                            const createdPin: PinDefinition = {
                              pinId,
                              connectorId: "custom",
                              fullName: `${selectedInstance.instanceId}.${pinId}`,
                              label: newPinLabel.trim() || `Pin #${nextIdx}`,
                              type: newPinType,
                              voltage: newPinVoltage.trim() || undefined,
                              localOffset: [newPinX, newPinY, newPinZ],
                              verified: true,
                            };
                            onAddCustomPin(selectedInstance.instanceId, createdPin);
                            setNewPinLabel("");
                            setShowAddForm(false);
                          }}
                          className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded text-xs transition-colors"
                        >
                          Qo‘shish
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowAddForm(false)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition-colors"
                        >
                          Bekor qilish
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Empty state when no pins defined yet */}
                  {componentPins.length === 0 && !showAddForm && (
                    <div className="my-4 p-4 border border-dashed border-slate-700 rounded-xl bg-slate-900/40 text-center space-y-2">
                      <MapPin size={24} className="text-amber-400/80 mx-auto" />
                      <div className="text-xs font-semibold text-slate-200">
                        Elektron pinlar hali belgilanmagan
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed max-w-xs mx-auto">
                        Pinlar avtomatik yaratilmaydi. 3D modeldagi port yoki oyoqlarga qarab istalgan yeriga pin belgilashingiz mumkin.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          if (onTogglePinPlacingMode && selectedInstance) {
                            onTogglePinPlacingMode(selectedInstance.instanceId);
                          }
                        }}
                        className="mt-1 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-colors shadow-sm"
                      >
                        <Crosshair size={13} />
                        <span>3D Modeldan nuqtani bosing</span>
                      </button>
                    </div>
                  )}

                  {/* Full Pins List */}
                  {componentPins.length > 0 && (
                    <div className="full-pins-list">
                      {componentPins.map((pin) => {
                        const isPinSelected = selectedPinFullName === pin.fullName;
                        return (
                          <div
                            key={pin.fullName}
                            id={`pin-card-${pin.fullName.replace(/\./g, "-")}`}
                            className={`pin-card ${isPinSelected ? "selected" : ""}`}
                            onClick={() => onSelectPin(pin.fullName)}
                          >
                            <div className="pin-card-top">
                              <div className="pin-name-badge">
                                <span className={`pin-type-pill type-${pin.type}`}>
                                  {pin.type.toUpperCase()}
                                </span>
                                <span className="pin-stable-id">{pin.fullName}</span>
                              </div>
                              {pin.voltage && <span className="pin-voltage-badge">{pin.voltage}</span>}
                            </div>

                            <div className="pin-label-desc font-medium text-slate-200 my-1">
                              {editingPinFullName === pin.fullName ? (
                                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="text"
                                    value={editingPinLabelValue}
                                    onChange={(e) => setEditingPinLabelValue(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        if (onUpdateCustomPin && editingPinLabelValue.trim()) {
                                          onUpdateCustomPin(selectedInstance.instanceId, pin.fullName, {
                                            label: editingPinLabelValue.trim(),
                                          });
                                        }
                                        setEditingPinFullName(null);
                                      } else if (e.key === "Escape") {
                                        setEditingPinFullName(null);
                                      }
                                    }}
                                    autoFocus
                                    className="flex-1 px-2 py-0.5 bg-slate-900 border border-cyan-400 rounded text-xs text-white outline-none font-medium"
                                    placeholder="Pin nomini yozing..."
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (onUpdateCustomPin && editingPinLabelValue.trim()) {
                                        onUpdateCustomPin(selectedInstance.instanceId, pin.fullName, {
                                          label: editingPinLabelValue.trim(),
                                        });
                                      }
                                      setEditingPinFullName(null);
                                    }}
                                    className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-medium"
                                    title="Saqlash"
                                  >
                                    <Check size={11} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingPinFullName(null)}
                                    className="px-1.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-[11px]"
                                    title="Bekor qilish"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between group/pinname">
                                  <span className="truncate">{pin.label}</span>
                                  {onUpdateCustomPin && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingPinFullName(pin.fullName);
                                        setEditingPinLabelValue(pin.label);
                                      }}
                                      className="p-1 text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 rounded transition-colors"
                                      title="Pin nomini o‘zingiz yozing"
                                    >
                                      <Edit3 size={12} />
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between mt-1 mb-1.5">
                              <span>
                                X: {pin.localOffset[0].toFixed(1)} | Y: {pin.localOffset[1].toFixed(1)} | Z: {pin.localOffset[2].toFixed(1)} mm
                              </span>
                            </div>

                            <div className="pin-card-actions flex items-center justify-between gap-2">
                              <button
                                id={`btn-connect-cable-${pin.fullName.replace(/\./g, "-")}`}
                                className="btn-wire-connect flex-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onStartCableConnection(pin.fullName);
                                }}
                                title="Ushbu pindan yangi kabel tortish"
                              >
                                <Link size={13} />
                                <span>Kabel ulash</span>
                              </button>

                              {onDeleteCustomPin && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteCustomPin(selectedInstance.instanceId, pin.fullName);
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                  title="Pinni o‘chirish"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Active Tab: Cables */}
            {activeTab === "cables" && (
              <div className="tab-pane active" id="cables-tab-pane">
                <div className="card-section">
                  <div className="section-title-row">
                    <span className="section-title">
                      Ushbu Komponentga Ulangan Kabellar ({connectedCables.length})
                    </span>
                  </div>

                  {connectedCables.length === 0 ? (
                    <div className="empty-cables-hint">
                      <Cable size={24} className="opacity-30" />
                      <p>Hozircha ushbu komponentga hech qanday kabel ulanmagan.</p>
                      <button
                        className="btn-wire-connect center-btn"
                        onClick={() => setActiveTab("pins")}
                      >
                        Pinlar orqali kabel ulash
                      </button>
                    </div>
                  ) : (
                    <div className="cables-list space-y-2">
                      {connectedCables.map((cable) => (
                        <CableItemCard
                          key={cable.id}
                          cable={cable}
                          isSelected={selectedCableId === cable.id}
                          onSelectCable={onSelectCable}
                          onUpdateCableColor={onUpdateCableColor}
                          onDeleteCable={onDeleteCable}
                          onUpdateCable={onUpdateCable}
                          onAddCableRoutePoint={onAddCableRoutePoint}
                          onUpdateCableRoutePoint={onUpdateCableRoutePoint}
                          onDeleteCableRoutePoint={onDeleteCableRoutePoint}
                          onStraightenCable={onStraightenCable}
                          onSwapCableEnds={onSwapCableEnds}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          /* No Component Selected State - Adaptive for all 3 tabs */
          <>
            {/* Active Tab: Cables (All cables in system) */}
            {activeTab === "cables" && (
              <div className="tab-pane active" id="all-cables-tab-pane">
                <div className="card-section">
                  <div className="section-title-row">
                    <span className="section-title">
                      Tizimdagi Barcha Kabellar ({cables.length})
                    </span>
                  </div>

                  {cables.length === 0 ? (
                    <div className="empty-cables-hint">
                      <Cable size={24} className="opacity-30" />
                      <p>Hozircha tizimda hech qanday kabel ulanmagan.</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Komponentni tanlab, uning &quot;Pinlar&quot; bo‘limidan &quot;Kabel ulash&quot; tugmasi orqali yangi kabel tortishingiz mumkin.
                      </p>
                    </div>
                  ) : (
                    <div className="cables-list space-y-2">
                      {cables.map((cable) => (
                        <CableItemCard
                          key={cable.id}
                          cable={cable}
                          isSelected={selectedCableId === cable.id}
                          onSelectCable={onSelectCable}
                          onUpdateCableColor={onUpdateCableColor}
                          onDeleteCable={onDeleteCable}
                          onUpdateCable={onUpdateCable}
                          onAddCableRoutePoint={onAddCableRoutePoint}
                          onUpdateCableRoutePoint={onUpdateCableRoutePoint}
                          onDeleteCableRoutePoint={onDeleteCableRoutePoint}
                          onStraightenCable={onStraightenCable}
                          onSwapCableEnds={onSwapCableEnds}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Active Tab: Pins (Pins overview across placed components) */}
            {activeTab === "pins" && (
              <div className="tab-pane active" id="pins-overview-tab-pane">
                <div className="card-section">
                  <div className="section-title-row">
                    <span className="section-title">Pinlar va Portlar Umumiy Ko‘rinishi</span>
                  </div>
                  <p className="text-xs text-slate-400 mb-3">
                    Avionika komponentlarining pinlarini ko‘rish, sozlash yoki yangi pin qo‘shish uchun sahnadagi yoki quyidagi ro‘yxatdagi istalgan komponent ustiga bosing:
                  </p>
                  <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
                    {instances
                      .filter((i) => i.placed)
                      .map((inst) => {
                        const count = inst.customPins?.length || 0;
                        return (
                          <div
                            key={inst.instanceId}
                            onClick={() => onSelectInstance(inst.instanceId)}
                            className="flex items-center justify-between p-2 rounded bg-slate-800/40 hover:bg-cyan-950/40 border border-slate-700/40 hover:border-cyan-500/50 cursor-pointer transition-all text-xs"
                            title="Pinlarini tahrirlash uchun bosing"
                          >
                            <span className="font-medium text-slate-200">
                              {inst.customLabel || inst.name}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono">
                              {count} ta pin
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            )}

            {/* Active Tab: General Inspector */}
            {activeTab === "inspector" && (
              <div className="no-selection-container" id="inspector-no-selection">
                <div className="telemetry-summary-card">
                  <div className="telemetry-card-header">
                    <Cpu size={18} className="text-cyan" />
                    <h3>3.8 M UAV {t("inspector.title")}</h3>
                  </div>

                  <div className="telemetry-metrics-grid">
                    <div className="metric-box">
                      <span className="metric-value">3800 mm</span>
                      <span className="metric-label">{t("inspector.wingspan")}</span>
                    </div>
                    <div className="metric-box">
                      <span className="metric-value">32</span>
                      <span className="metric-label">{t("inspector.totalInventory")}</span>
                    </div>
                    <div className="metric-box">
                      <span className="metric-value">
                        {instances.filter((i) => i.placed).length}
                      </span>
                      <span className="metric-label">{t("inventory.filterPlaced")}</span>
                    </div>
                    <div className="metric-box">
                      <span className="metric-value">{cables.length}</span>
                      <span className="metric-label">{t("inspector.activeCables")}</span>
                    </div>
                  </div>
                </div>

                {/* Sahnadagi Barcha Komponentlar Tezkor Ro‘yxati */}
                <div className="card-section">
                  <div className="section-title-row">
                    <span className="section-title">
                      {t("inspector.placedComponents")} ({instances.filter((i) => i.placed).length})
                    </span>
                  </div>
                  <div className="space-y-1 max-h-[220px] overflow-y-auto pr-1">
                    {instances.filter((i) => i.placed).length === 0 ? (
                      <p className="text-xs text-slate-400">{t("inspector.noComponentsPlaced")}</p>
                    ) : (
                      instances
                        .filter((i) => i.placed)
                        .map((inst) => (
                          <div
                            key={inst.instanceId}
                            onClick={() => onSelectInstance(inst.instanceId)}
                            className="flex items-center justify-between p-1.5 px-2 rounded bg-slate-800/50 hover:bg-cyan-950/60 border border-slate-700/50 hover:border-cyan-500/50 cursor-pointer transition-all text-xs"
                            title="Xususiyatlarini ochish uchun bosing"
                          >
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/80 px-1 py-0.5 rounded border border-cyan-500/30">
                                #{inst.componentId}
                              </span>
                              <span className="truncate text-slate-200 font-medium">
                                {inst.customLabel || inst.name}
                              </span>
                              {inst.attachedToDrone && (
                                <span
                                  className="text-[9px] text-cyan-400 font-mono px-1 py-0.2 bg-cyan-950/80 border border-cyan-800/60 rounded"
                                  title="Dronga biriktirilgan (Dron bilan birga suriladi)"
                                >
                                  🔗 Dron
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 shrink-0">
                              {inst.locked && (
                                <span title="Qulflangan">
                                  <Lock size={11} className="text-amber-400" />
                                </span>
                              )}
                              {!inst.visible && (
                                <span title="Yashirilgan">
                                  <EyeOff size={11} className="text-slate-500" />
                                </span>
                              )}
                              <span>[{Math.round(inst.position[0])}, {Math.round(inst.position[1])}, {Math.round(inst.position[2])}]</span>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>

                {/* Drone Airframe Color in Inspector */}
                {onUpdateDroneColor && (
                  <div className="airframe-color-card" id="inspector-drone-color-card">
                    <div className="section-title-row">
                      <div className="section-title-flex">
                        <Palette size={14} className="text-accent" />
                        <span className="section-title">Dron Korpusi (3.5m)</span>
                      </div>
                      <label
                        htmlFor="inspector-drone-color-input"
                        className="btn-pick-custom-color"
                        title="Ixtiyoriy rang tanlash"
                      >
                        <Palette size={12} />
                        <span>Rang tanlash</span>
                        <input
                          id="inspector-drone-color-input"
                          type="color"
                          value={droneColor}
                          onChange={(e) => onUpdateDroneColor(e.target.value)}
                          className="hidden-color-input"
                        />
                      </label>
                    </div>

                    {/* Drone Presence in Scene Status & Action Button */}
                    {onToggleDronePresence && (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "6px 0 10px 0", gap: "8px", background: "rgba(0,0,0,0.2)", padding: "6px 10px", borderRadius: "6px" }}>
                        <span style={{ fontSize: "11px", color: isDronePlaced ? "#10b981" : "#f59e0b", display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: isDronePlaced ? "#10b981" : "#f59e0b", display: "inline-block" }} />
                          {isDronePlaced ? "Sahnada joylashgan" : "Sahnadan o‘chirilgan"}
                        </span>
                        <button
                          type="button"
                          className={`inst-tool-btn ${isDronePlaced ? "danger" : "active"}`}
                          style={{ padding: "4px 10px", fontSize: "11px", height: "26px" }}
                          onClick={onToggleDronePresence}
                          title={isDronePlaced ? "Dron korpusini sahnadan olib tashlash" : "Dron korpusini sahnaga qayta joylashtirish"}
                        >
                          {isDronePlaced ? <Trash2 size={12} /> : <PlusCircle size={12} />}
                          <span>{isDronePlaced ? "Dronni o‘chirish" : "+ Sahnaga qo‘yish"}</span>
                        </button>
                      </div>
                    )}

                    <div className="comp-color-active-row">
                      <div className="comp-color-indicator-wrap">
                        <span
                          className="comp-color-preview-box"
                          style={{ backgroundColor: droneColor }}
                        />
                        <span className="comp-color-status-text">
                          Joriy rang: {droneColor}
                        </span>
                      </div>
                    </div>

                    <div className="comp-color-presets-grid">
                      {PRESET_DRONE_COLORS.map((c) => {
                        const isCurrent = droneColor.toLowerCase() === c.hex.toLowerCase();
                        return (
                          <button
                            key={c.hex}
                            type="button"
                            className={`comp-color-preset-btn ${isCurrent ? "active" : ""}`}
                            style={{ backgroundColor: c.hex }}
                            onClick={() => onUpdateDroneColor(c.hex)}
                            title={`${c.name} (${c.hex})`}
                          >
                            {isCurrent && <Check size={11} className="color-check-mark" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Quick Tips & Hotkeys */}
                <div className="hotkey-guide-card">
                  <h4>
                    <Info size={14} /> Boshqaruv Tugmalari
                  </h4>
                  <ul className="hotkeys-list">
                    <li>
                      <kbd>W</kbd> / <kbd>E</kbd> / <kbd>R</kbd> <span>Ko‘chirish / Aylantirish / Masshtab</span>
                    </li>
                    <li>
                      <kbd>H</kbd> <span>Gorizontal 180° Flip (Yaw)</span>
                    </li>
                    <li>
                      <kbd>Shift+V</kbd> <span>Vertikal 180° Flip (Pitch)</span>
                    </li>
                    <li>
                      <kbd>Ctrl+C</kbd> / <kbd>Ctrl+V</kbd> <span>Nusxa olish / Joylashtirish</span>
                    </li>
                    <li>
                      <kbd>Del</kbd> <span>Sahnadan olib tashlash</span>
                    </li>
                    <li>
                      <kbd>Shift+Click</kbd> <span>Ko‘p tanlov (Multi-selection)</span>
                    </li>
                    <li>
                      <kbd>LKM</kbd> <span>Komponent yoki Pin tanlash / Kamerani burish</span>
                    </li>
                    <li>
                      <kbd>RKM</kbd> <span>Kamerani pan surish</span>
                    </li>
                    <li>
                      <kbd>Scroll</kbd> <span>Masshtab (Zoom In / Out)</span>
                    </li>
                  </ul>
                </div>

                <p className="select-instruction-text">
                  Tahrirlash uchun yuqoridagi ro‘yxat yoki 3D sahnadagi istalgan komponent ustiga bosing.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
};
