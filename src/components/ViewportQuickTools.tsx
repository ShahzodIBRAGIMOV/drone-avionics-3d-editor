import React from "react";
import { Play, Pause, RotateCw, Camera, Video, Square, Zap, Activity, Cable } from "lucide-react";

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
}

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
}) => {
  return (
    <div className="viewport-quick-tools" id="viewport-quick-tools">
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
