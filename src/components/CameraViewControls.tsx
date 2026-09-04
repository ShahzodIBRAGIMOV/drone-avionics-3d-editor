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
      className="camera-view-bar"
      id="camera-view-floating-controls"
    >
      {/* Perspective / Isometric */}
      <button
        type="button"
        id="btn-cam-perspective"
        className={`cam-btn ${currentView === "perspective" ? "active" : ""}`}
        onClick={() => onSetCameraView("perspective")}
        title="Perspektiv / Izometrik 3D ko‘rinish"
      >
        <Box size={13} />
        <span>3D</span>
      </button>

      <div className="cam-divider" />

      {/* Top View */}
      <button
        type="button"
        id="btn-cam-top"
        className={`cam-btn ${currentView === "top" ? "active" : ""}`}
        onClick={() => onSetCameraView("top")}
        title="Tepadan ko‘rinish (Top - XZ tekisligi)"
      >
        <ArrowUp size={13} />
        <span>Tepa</span>
      </button>

      {/* Bottom View */}
      <button
        type="button"
        id="btn-cam-bottom"
        className={`cam-btn ${currentView === "bottom" ? "active" : ""}`}
        onClick={() => onSetCameraView("bottom")}
        title="Pastdan ko‘rinish (Bottom - pastki yuzalar)"
      >
        <ArrowDown size={13} />
        <span>Past</span>
      </button>

      {/* Front View */}
      <button
        type="button"
        id="btn-cam-front"
        className={`cam-btn ${currentView === "front" ? "active" : ""}`}
        onClick={() => onSetCameraView("front")}
        title="Oldindan ko‘rinish (Front)"
      >
        <span>Old</span>
      </button>

      {/* Back View */}
      <button
        type="button"
        id="btn-cam-back"
        className={`cam-btn ${currentView === "back" ? "active" : ""}`}
        onClick={() => onSetCameraView("back")}
        title="Orqadan ko‘rinish (Back)"
      >
        <span>Orqa</span>
      </button>

      {/* Left View */}
      <button
        type="button"
        id="btn-cam-left"
        className={`cam-btn ${currentView === "left" ? "active" : ""}`}
        onClick={() => onSetCameraView("left")}
        title="Chap tomondan ko‘rinish (Left)"
      >
        <ArrowLeft size={13} />
        <span>Chap</span>
      </button>

      {/* Right View */}
      <button
        type="button"
        id="btn-cam-right"
        className={`cam-btn ${currentView === "right" ? "active" : ""}`}
        onClick={() => onSetCameraView("right")}
        title="O‘ng tomondan ko‘rinish (Right)"
      >
        <ArrowRight size={13} />
        <span>O‘ng</span>
      </button>

      {/* Center Reset */}
      <button
        type="button"
        id="btn-cam-center-reset"
        className="cam-icon-btn"
        onClick={onResetCamera}
        title="Kamerani boshlang‘ich holatga qaytarish"
      >
        <Compass size={13} />
      </button>

      {/* If a model is selected, show target chip and Obstacle Hiding toggle */}
      {selectedInstanceName && (
        <>
          <div className="cam-divider" />

          {/* Selected target info */}
          <div
            className="cam-target-chip"
            title={`Fokuslangan model: ${selectedInstanceName}`}
          >
            <span className="cam-pulse-dot" />
            <span className="cam-target-name">{selectedInstanceName}</span>
          </div>

          {/* Special "Alohida ko'rsatish" (Isolate) Button */}
          {onToggleIsolatedView && (
            <button
              type="button"
              id="btn-toggle-isolated-view"
              onClick={onToggleIsolatedView}
              className={`cam-isolate-btn ${isIsolatedView ? "active" : ""}`}
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
              <span>{isIsolatedView ? "Alohida: FAOL" : "Alohida"}</span>
              {hiddenObstaclesCount > 0 && isIsolatedView && (
                <span className="cam-badge-warning">
                  {hiddenObstaclesCount}
                </span>
              )}
            </button>
          )}
        </>
      )}
    </div>
  );
};

