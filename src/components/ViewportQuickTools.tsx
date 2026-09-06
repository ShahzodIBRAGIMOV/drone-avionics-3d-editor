import React, { useState } from "react";
import {
  Play,
  Pause,
  RotateCw,
  Camera,
  Video,
  Square,
  Zap,
  Activity,
  Cable,
  Eye,
  EyeOff,
  Palette,
  RotateCcw,
} from "lucide-react";
import { PhysicalInstance } from "../types";

interface ViewportQuickToolsProps {
  isFlowAnimating: boolean;
  onToggleFlowAnimation: () => void;
  flowType: "all" | "power" | "signal";
  onFlowTypeChange: (type: "all" | "power" | "signal") => void;
  flowSpeed: number;
  onCycleFlowSpeed: () => void;
  isAutoRotateActive: boolean;
  onToggleAutoRotate: () => void;
  onCapturePNG: () => void;
  isVideoRecording: boolean;
  onToggleVideo: () => void;
  showCables?: boolean;
  onToggleShowCables?: () => void;
  dimUnselected?: boolean;
  onToggleDimUnselected?: () => void;
  selectedInstance?: PhysicalInstance | null;
  onUpdateInstanceColor?: (instanceId: string, color: string | undefined) => void;
}

const QUICK_COLORS = [
  { name: "Cube Orange", hex: "#ff6600" },
  { name: "Xavfsizlik Qizil", hex: "#ef4444" },
  { name: "Aviatsiya Moviy", hex: "#0284c7" },
  { name: "Zumrad Yashil", hex: "#10b981" },
  { name: "Signal Sariq", hex: "#eab308" },
  { name: "Siyohrang", hex: "#a855f7" },
  { name: "To‘q Grafit", hex: "#1e293b" },
  { name: "Oq / Metall", hex: "#f8fafc" },
];

export const ViewportQuickTools: React.FC<ViewportQuickToolsProps> = ({
  isFlowAnimating,
  onToggleFlowAnimation,
  flowType,
  onFlowTypeChange,
  flowSpeed,
  onCycleFlowSpeed,
  isAutoRotateActive,
  onToggleAutoRotate,
  onCapturePNG,
  isVideoRecording,
  onToggleVideo,
  showCables = true,
  onToggleShowCables,
  dimUnselected = false,
  onToggleDimUnselected,
  selectedInstance,
  onUpdateInstanceColor,
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);

  const currentColor = selectedInstance?.customColor || selectedInstance?.colorHint || "#0284c7";

  return (
    <div className="viewport-quick-tools relative" id="viewport-quick-tools">
      {/* Quick Color Picker for Selected Component */}
      {selectedInstance && onUpdateInstanceColor && (
        <div className="relative">
          <button
            type="button"
            id="hud-btn-quick-color"
            onClick={() => setShowColorPicker(!showColorPicker)}
            className={`viewport-quick-btn ${showColorPicker ? "active border-sky-400 bg-sky-950/50" : ""}`}
            title={`Komponent rangi: ${selectedInstance.customColor ? selectedInstance.customColor : "Standart"}. Rangni o‘zgartirish uchun bosing`}
          >
            <span
              className="inline-block w-3 h-3 rounded-full border border-white/50 shadow-sm transition-transform hover:scale-110"
              style={{ backgroundColor: currentColor }}
            />
            <Palette size={12} className="text-sky-300" />
            <span className="text-[11px] font-medium hidden sm:inline">
              {selectedInstance.customColor ? "Rang: Faol" : "Rang"}
            </span>
          </button>

          {showColorPicker && (
            <div
              className="absolute top-full right-0 mt-2 p-2.5 bg-slate-900/95 backdrop-blur-md border border-sky-500/40 rounded-xl shadow-2xl z-50 min-w-[200px]"
              id="hud-quick-color-popover"
            >
              <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-750 text-[11px] text-slate-300 font-semibold">
                <span className="truncate max-w-[130px]">{selectedInstance.name}</span>
                <button
                  type="button"
                  onClick={() => setShowColorPicker(false)}
                  className="text-slate-400 hover:text-white text-xs px-1"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-4 gap-1.5 mb-2.5">
                {QUICK_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => {
                      onUpdateInstanceColor(selectedInstance.instanceId, c.hex);
                    }}
                    className={`w-7 h-7 rounded-md border transition-all ${
                      selectedInstance.customColor?.toLowerCase() === c.hex.toLowerCase()
                        ? "border-white scale-110 shadow-md ring-2 ring-sky-400/50"
                        : "border-slate-600 hover:scale-105 hover:border-slate-300"
                    }`}
                    style={{ backgroundColor: c.hex }}
                    title={`${c.name} (${c.hex})`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-1.5 pt-1 border-t border-slate-800">
                <label
                  htmlFor={`quick-input-color-${selectedInstance.instanceId}`}
                  className="flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-200 cursor-pointer border border-slate-700"
                >
                  <Palette size={10} />
                  <span>Palitra</span>
                  <input
                    id={`quick-input-color-${selectedInstance.instanceId}`}
                    type="color"
                    value={selectedInstance.customColor || "#ff6600"}
                    onChange={(e) => onUpdateInstanceColor(selectedInstance.instanceId, e.target.value)}
                    className="sr-only"
                  />
                </label>

                {selectedInstance.customColor && (
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateInstanceColor(selectedInstance.instanceId, undefined);
                    }}
                    className="flex items-center gap-1 py-1 px-2 rounded bg-slate-800 hover:bg-rose-950/40 text-[10px] text-rose-300 border border-slate-700 hover:border-rose-500/40"
                    title="Standart model rangiga qaytarish"
                  >
                    <RotateCcw size={10} />
                    <span>Asl</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {selectedInstance && <div className="viewport-divider" />}
      {/* Dim / Gray Out Unselected Elements Toggle */}
      {onToggleDimUnselected && (
        <button
          type="button"
          id="hud-btn-toggle-dim-unselected"
          onClick={onToggleDimUnselected}
          className={`viewport-quick-btn ${dimUnselected ? "active border-amber-500/50 bg-amber-950/40 text-amber-200" : ""}`}
          title={
            dimUnselected
              ? "Fokus faol: Tanlanmagan elementlar kulrang bo‘ladi [D]. Barchasini ko‘rsatish uchun bosing"
              : "Barcha elementlar to‘liq ko‘rinadi [D]. Kulrang rejimni yoqish uchun bosing"
          }
        >
          {dimUnselected ? (
            <EyeOff size={13} className="text-amber-400" />
          ) : (
            <Eye size={13} className="text-cyan-300" />
          )}
          <span>{dimUnselected ? "Kulrang: On" : "Barchasi: On"}</span>
        </button>
      )}

      {/* Cable Visibility Toggle */}
      {onToggleShowCables && (
        <button
          type="button"
          id="hud-btn-toggle-cables"
          onClick={onToggleShowCables}
          className={`viewport-quick-btn ${showCables ? "active" : "opacity-80"}`}
          title={showCables ? "Kabellarni yashirish [C]" : "Kabellarni ko‘rsatish [C]"}
        >
          <Cable size={13} className={showCables ? "text-cyan-300" : "text-slate-400"} />
          <span>{showCables ? "Kabellar: On" : "Kabellar: Off"}</span>
        </button>
      )}

      {/* Cable Flow Play/Pause */}
      <button
        type="button"
        id="hud-btn-toggle-cable-flow"
        onClick={onToggleFlowAnimation}
        className={`viewport-quick-btn ${isFlowAnimating ? "active" : ""}`}
        title={isFlowAnimating ? "Kabel oqimini to‘xtatish" : "Kabel signal va quvvat oqimini yoqish"}
      >
        {isFlowAnimating ? (
          <Pause size={13} className="text-cyan-300" />
        ) : (
          <Play size={13} className="text-slate-300" />
        )}
        <span>{isFlowAnimating ? "Oqim: Faol" : "Animatsiya"}</span>
        {isFlowAnimating && <span className="viewport-pulse-dot" />}
      </button>

      {/* Cable Flow Filtering & Speed Options (visible when flow animating) */}
      {isFlowAnimating && (
        <div className="viewport-flow-filters">
          <button
            type="button"
            onClick={() => onFlowTypeChange("all")}
            className={`viewport-filter-tag ${flowType === "all" ? "active" : ""}`}
            title="Barcha kabellarda oqim"
          >
            Hammasi
          </button>
          <button
            type="button"
            onClick={() => onFlowTypeChange("power")}
            className={`viewport-filter-tag ${flowType === "power" ? "active-red active-amber" : ""}`}
            title="Faqat quvvat kabellari (Power - Qizil oqim)"
          >
            <Zap size={10} />
            Power (Qizil)
          </button>
          <button
            type="button"
            onClick={() => onFlowTypeChange("signal")}
            className={`viewport-filter-tag ${flowType === "signal" ? "active-blue active-cyan" : ""}`}
            title="Faqat signal kabellari (Signal - Ko‘k oqim)"
          >
            <Activity size={10} />
            Signal (Ko‘k)
          </button>

          <button
            type="button"
            onClick={onCycleFlowSpeed}
            className="viewport-speed-badge"
            title="Oqim tezligini o‘zgartirish (0.5x / 1x / 2x)"
          >
            {flowSpeed}x
          </button>
        </div>
      )}

      {/* 360° Turntable Auto-Rotate */}
      <button
        type="button"
        id="hud-btn-toggle-auto-rotate"
        onClick={onToggleAutoRotate}
        className={`viewport-quick-btn ${isAutoRotateActive ? "active" : ""}`}
        title="360° Avtomatik aylanma ko‘rinish (Turntable)"
      >
        <RotateCw
          size={13}
          className={isAutoRotateActive ? "viewport-spin-anim text-cyan-300" : "text-slate-300"}
        />
        <span className="hidden-mobile">360°</span>
      </button>

      <div className="viewport-divider" />

      {/* PNG Snapshot */}
      <button
        type="button"
        id="hud-btn-export-png-snapshot"
        onClick={onCapturePNG}
        className="viewport-quick-btn"
        title="3D ko‘rinishni yuqori sifatli PNG rasm sifatida yuklab olish"
      >
        <Camera size={13} className="text-cyan-400" />
        <span className="hidden-mobile">PNG</span>
      </button>

      {/* Record 3D Video */}
      <button
        type="button"
        id="hud-btn-toggle-video-record"
        onClick={onToggleVideo}
        className={`viewport-quick-btn ${isVideoRecording ? "recording" : ""}`}
        title={isVideoRecording ? "Videoni to‘xtatish va yuklab olish" : "3D harakatli video yozish"}
      >
        {isVideoRecording ? (
          <>
            <Square size={12} className="fill-white text-white" />
            <span className="font-mono font-bold text-white">REC</span>
          </>
        ) : (
          <>
            <Video size={13} className="text-rose-400" />
            <span className="hidden-mobile">Video</span>
          </>
        )}
      </button>
    </div>
  );
};
