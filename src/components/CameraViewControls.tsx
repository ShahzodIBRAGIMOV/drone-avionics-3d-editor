import React from "react";
import { CameraViewMode } from "../types";
import { Compass, Box, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from "lucide-react";

interface CameraViewControlsProps {
  currentView: CameraViewMode;
  onSetCameraView: (mode: CameraViewMode) => void;
  onResetCamera: () => void;
}

export const CameraViewControls: React.FC<CameraViewControlsProps> = ({
  currentView,
  onSetCameraView,
  onResetCamera,
}) => {
  return (
    <div className="camera-view-bar" id="camera-view-floating-controls">
      <button
        id="btn-cam-perspective"
        className={`cam-btn ${currentView === "perspective" ? "active" : ""}`}
        onClick={() => onSetCameraView("perspective")}
        title="Perspektiv / Izometrik ko‘rinish"
      >
        <Box size={14} />
        <span>Perspektiv</span>
      </button>

      <div className="cam-btn-divider" />

      <button
        id="btn-cam-top"
        className={`cam-btn ${currentView === "top" ? "active" : ""}`}
        onClick={() => onSetCameraView("top")}
        title="Yuqoridan ko‘rinish (Top - XZ tekisligi)"
      >
        <ArrowUp size={14} />
        <span>Yuqori</span>
      </button>

      <button
        id="btn-cam-front"
        className={`cam-btn ${currentView === "front" ? "active" : ""}`}
        onClick={() => onSetCameraView("front")}
        title="Oldindan ko‘rinish (Front - XY tekisligi)"
      >
        <span>Old</span>
      </button>

      <button
        id="btn-cam-back"
        className={`cam-btn ${currentView === "back" ? "active" : ""}`}
        onClick={() => onSetCameraView("back")}
        title="Orqadan ko‘rinish (Back)"
      >
        <span>Orqa</span>
      </button>

      <button
        id="btn-cam-left"
        className={`cam-btn ${currentView === "left" ? "active" : ""}`}
        onClick={() => onSetCameraView("left")}
        title="Chap tomondan ko‘rinish (Left - YZ tekisligi)"
      >
        <ArrowLeft size={14} />
        <span>Chap</span>
      </button>

      <button
        id="btn-cam-right"
        className={`cam-btn ${currentView === "right" ? "active" : ""}`}
        onClick={() => onSetCameraView("right")}
        title="O‘ng tomondan ko‘rinish (Right)"
      >
        <ArrowRight size={14} />
        <span>O‘ng</span>
      </button>

      <button
        id="btn-cam-center-reset"
        className="cam-btn subtle"
        onClick={onResetCamera}
        title="Kamerani markazga qaytarish"
      >
        <Compass size={14} />
      </button>
    </div>
  );
};
