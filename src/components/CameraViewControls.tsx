import React from "react";
import { CameraViewMode } from "../types";
import { Compass, Box, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, EyeOff, Eye } from "lucide-react";

interface CameraViewControlsProps {
  currentView: CameraViewMode;
  onSetCameraView: (mode: CameraViewMode) => void;
  onResetCamera: () => void;
  selectedInstanceName?: string | null;
  isIsolatedView?: boolean;
  onToggleIsolatedView?: () => void;
  hiddenObstaclesCount?: number;
}

export const CameraViewControls: React.FC<CameraViewControlsProps> = ({
  currentView,
  onSetCameraView,
  onResetCamera,
  selectedInstanceName,
  isIsolatedView = false,
  onToggleIsolatedView,
  hiddenObstaclesCount = 0,
}) => {
  return (
    <div
      className="camera-view-bar flex items-center gap-1.5 px-2 py-1.5 bg-slate-950/90 border border-slate-800/90 rounded-xl backdrop-blur-md shadow-2xl z-20 pointer-events-auto select-none"
      id="camera-view-floating-controls"
      style={{
        position: "absolute",
        top: "16px",
        left: "16px",
        transform: "none",
        bottom: "auto",
      }}
    >
      {/* Perspective / Isometric */}
      <button
        id="btn-cam-perspective"
        className={`cam-btn px-2.5 py-1 rounded-lg text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
          currentView === "perspective"
            ? "bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/40"
            : "text-slate-400 hover:text-white hover:bg-slate-800/60"
        }`}
        onClick={() => onSetCameraView("perspective")}
        title="Perspektiv / Izometrik 3D ko‘rinish"
      >
        <Box size={13} />
        <span>3D</span>
      </button>

      <div className="h-4 w-[1px] bg-slate-800 mx-0.5" />

      {/* Top View */}
      <button
        id="btn-cam-top"
        className={`cam-btn px-2 py-1 rounded-lg text-xs flex items-center gap-1 transition-all cursor-pointer ${
          currentView === "top"
            ? "bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/40"
            : "text-slate-400 hover:text-white hover:bg-slate-800/60"
        }`}
        onClick={() => onSetCameraView("top")}
        title="Tepadan ko‘rinish (Top - XZ tekisligi)"
      >
        <ArrowUp size={13} />
        <span>Tepa</span>
      </button>

      {/* Bottom View */}
      <button
        id="btn-cam-bottom"
        className={`cam-btn px-2 py-1 rounded-lg text-xs flex items-center gap-1 transition-all cursor-pointer ${
          currentView === "bottom"
            ? "bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/40"
            : "text-slate-400 hover:text-white hover:bg-slate-800/60"
        }`}
        onClick={() => onSetCameraView("bottom")}
        title="Pastdan ko‘rinish (Bottom - pastki yuzalar)"
      >
        <ArrowDown size={13} />
        <span>Past</span>
      </button>

      {/* Front View */}
      <button
        id="btn-cam-front"
        className={`cam-btn px-2 py-1 rounded-lg text-xs flex items-center gap-1 transition-all cursor-pointer ${
          currentView === "front"
            ? "bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/40"
            : "text-slate-400 hover:text-white hover:bg-slate-800/60"
        }`}
        onClick={() => onSetCameraView("front")}
        title="Oldindan ko‘rinish (Front - to‘g‘ridan-to‘g‘ri old ko‘rinish)"
      >
        <span>Old</span>
      </button>

      {/* Back View */}
      <button
        id="btn-cam-back"
        className={`cam-btn px-2 py-1 rounded-lg text-xs flex items-center gap-1 transition-all cursor-pointer ${
          currentView === "back"
            ? "bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/40"
            : "text-slate-400 hover:text-white hover:bg-slate-800/60"
        }`}
        onClick={() => onSetCameraView("back")}
        title="Orqadan ko‘rinish (Back)"
      >
        <span>Orqa</span>
      </button>

      {/* Left View */}
      <button
        id="btn-cam-left"
        className={`cam-btn px-2 py-1 rounded-lg text-xs flex items-center gap-1 transition-all cursor-pointer ${
          currentView === "left"
            ? "bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/40"
            : "text-slate-400 hover:text-white hover:bg-slate-800/60"
        }`}
        onClick={() => onSetCameraView("left")}
        title="Chap tomondan ko‘rinish (Left)"
      >
        <ArrowLeft size={13} />
        <span>Chap</span>
      </button>

      {/* Right View */}
      <button
        id="btn-cam-right"
        className={`cam-btn px-2 py-1 rounded-lg text-xs flex items-center gap-1 transition-all cursor-pointer ${
          currentView === "right"
            ? "bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/40"
            : "text-slate-400 hover:text-white hover:bg-slate-800/60"
        }`}
        onClick={() => onSetCameraView("right")}
        title="O‘ng tomondan ko‘rinish (Right)"
      >
        <ArrowRight size={13} />
        <span>O‘ng</span>
      </button>

      {/* Center Reset */}
      <button
        id="btn-cam-center-reset"
        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-lg transition-colors cursor-pointer"
        onClick={onResetCamera}
        title="Kamerani boshlang‘ich holatga qaytarish"
      >
        <Compass size={13} />
      </button>

      {/* If a model is selected, show target chip and Obstacle Hiding toggle */}
      {selectedInstanceName && (
        <>
          <div className="h-4 w-[1px] bg-slate-800 mx-0.5" />

          {/* Selected target info */}
          <div
            className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-900 border border-slate-700/60 rounded text-[11px] text-cyan-300 max-w-[150px] truncate"
            title={`Fokuslangan model: ${selectedInstanceName}`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0 animate-pulse" />
            <span className="truncate">{selectedInstanceName}</span>
          </div>

          {/* Special "Alohida ko'rsatish" (Isolate) Button */}
          {onToggleIsolatedView && (
            <button
              type="button"
              id="btn-toggle-isolated-view"
              onClick={onToggleIsolatedView}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                isIsolatedView
                  ? "bg-amber-500/25 text-amber-300 border border-amber-400/60 hover:bg-amber-500/35 shadow-sm"
                  : "bg-slate-800/60 text-slate-300 border border-slate-700/60 hover:bg-slate-700/60 hover:text-white"
              }`}
              title={
                isIsolatedView
                  ? "Alohida ko‘rsatish faol: Model to‘siqlarsiz alohida ko‘rinmoqda. Barcha elementlarni qaytarish uchun bosing."
                  : "Maxsus tugma: Tanlangan modelni to‘siqlarsiz alohida ko‘rsatish"
              }
            >
              {isIsolatedView ? (
                <EyeOff size={13} className="text-amber-400" />
              ) : (
                <Eye size={13} className="text-cyan-400" />
              )}
              <span>{isIsolatedView ? "Alohida: FAOL" : "Alohida ko‘rsatish"}</span>
              {hiddenObstaclesCount > 0 && isIsolatedView && (
                <span className="ml-0.5 px-1 py-0.2 bg-amber-400/30 text-amber-200 rounded text-[9px] font-bold">
                  {hiddenObstaclesCount} to‘siq
                </span>
              )}
            </button>
          )}
        </>
      )}
    </div>
  );
};

