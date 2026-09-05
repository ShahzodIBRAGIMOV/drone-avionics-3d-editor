import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  Move,
  RotateCw,
  Maximize2,
  Eye,
  EyeOff,
  Grid,
  Download,
  Upload,
  Camera,
  FileSpreadsheet,
  RotateCcw,
  RefreshCw,
  Zap,
  Globe,
  Radio,
  Palette,
  Layers,
  Trash2,
  PlusCircle,
  Database,
  Check,
  HardDrive,
  ShieldCheck,
  X,
  FolderDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Cable,
  Sparkles,
  PanelLeft,
  PanelRight,
  Undo2,
  Redo2,
  Keyboard,
  Cloud,
  CloudUpload,
  Box,
  Save,
  Play,
  Pause,
  Video,
  Square,
  GitBranch,
} from "lucide-react";
import { TransformMode, TransformSpace, SceneTheme } from "../types";
import { prefetchAndCacheAllModels, getModelCacheInfo } from "../modelAssetLoader";
import { useLanguage, LanguageSelector } from "../i18n/LanguageContext";

interface HeaderBarProps {
  viewLayoutMode?: "split" | "3d" | "2d";
  setViewLayoutMode?: (mode: "split" | "3d" | "2d") => void;
  placedCount: number;
  totalCount: number;
  transformMode: TransformMode;
  setTransformMode: (mode: TransformMode) => void;
  transformSpace: TransformSpace;
  setTransformSpace: (space: TransformSpace) => void;
  droneOpacity: number;
  setDroneOpacity: (opacity: number) => void;
  droneWireframe: boolean;
  setDroneWireframe: (wf: boolean) => void;
  droneVisible: boolean;
  setDroneVisible: (vis: boolean) => void;
  droneColor: string;
  setDroneColor: (color: string) => void;
  sceneTheme: SceneTheme;
  setSceneTheme: (theme: SceneTheme) => void;
  showPins: boolean;
  setShowPins: (pins: boolean) => void;
  showCables: boolean;
  setShowCables: (cables: boolean) => void;
  showGrid: boolean;
  setShowGrid: (grid: boolean) => void;
  onExportJSON: () => void;
  onImportJSON: (jsonStr: string) => void;
  onExportCSV: () => void;
  onCapturePNG: () => void;
  onResetAll: () => void;
  onReloadModels?: () => void;
  isReloadingModels?: boolean;
  onReloadJetson?: () => void;
  isReloadingJetson?: boolean;
  onOpenModelImport?: (defaultComponentId?: string) => void;
  isDronePlaced?: boolean;
  onToggleDronePresence?: () => void;
  onAutoPlaceAll?: () => void;
  isLeftPanelOpen?: boolean;
  onToggleLeftPanel?: () => void;
  isRightPanelOpen?: boolean;
  onToggleRightPanel?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  undoCount?: number;
  redoCount?: number;
  onOpenShortcutsModal?: () => void;
  onOpenCloudModal?: () => void;
  cloudCode?: string | null;
  isCloudSaving?: boolean;
  autoSaveStatus?: "saved" | "saving" | "idle" | "error";
  lastSavedAtText?: string;
  onForceSave?: () => void;
  isFlowAnimating?: boolean;
  onToggleFlowAnimation?: () => void;
  isVideoRecording?: boolean;
  onToggleVideo?: () => void;
  dimUnselected?: boolean;
  onToggleDimUnselected?: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  viewLayoutMode = "split",
  setViewLayoutMode,
  placedCount,
  totalCount,
  transformMode,
  setTransformMode,
  transformSpace,
  setTransformSpace,
  droneOpacity,
  setDroneOpacity,
  droneWireframe,
  setDroneWireframe,
  droneVisible,
  setDroneVisible,
  droneColor,
  setDroneColor,
  sceneTheme,
  setSceneTheme,
  showPins,
  setShowPins,
  showCables,
  setShowCables,
  showGrid,
  setShowGrid,
  onExportJSON,
  onImportJSON,
  onExportCSV,
  onCapturePNG,
  onResetAll,
  onReloadModels,
  isReloadingModels,
  onReloadJetson,
  isReloadingJetson = false,
  onOpenModelImport,
  isDronePlaced = true,
  onToggleDronePresence,
  onAutoPlaceAll,
  isLeftPanelOpen = true,
  onToggleLeftPanel,
  isRightPanelOpen = true,
  onToggleRightPanel,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  undoCount = 0,
  redoCount = 0,
  onOpenShortcutsModal,
  onOpenCloudModal,
  cloudCode,
  isCloudSaving = false,
  autoSaveStatus = "saved",
  lastSavedAtText,
  onForceSave,
  isFlowAnimating = false,
  onToggleFlowAnimation,
  isVideoRecording = false,
  onToggleVideo,
  dimUnselected = false,
  onToggleDimUnselected,
}) => {
  const { t, language, setLanguage } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const fileMenuDropdownRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isCacheModalOpen, setIsCacheModalOpen] = useState(false);
  const [isFileMenuOpen, setIsFileMenuOpen] = useState(false);
  const [menuCoords, setMenuCoords] = useState<{ top: number; right: number }>({ top: 52, right: 12 });
  const [cacheCount, setCacheCount] = useState<number>(0);
  const [isPrefetching, setIsPrefetching] = useState(false);
  const [prefetchStatus, setPrefetchStatus] = useState<string>("");
  const [isJustSaved, setIsJustSaved] = useState(false);

  const handleManualSaveClick = useCallback(() => {
    if (onForceSave) {
      onForceSave();
      setIsJustSaved(true);
      setTimeout(() => {
        setIsJustSaved(false);
      }, 2500);
    }
  }, [onForceSave]);

  const updateScrollState = useCallback(() => {
    const el = headerRef.current;
    if (el) {
      const { scrollLeft, scrollWidth, clientWidth } = el;
      setCanScrollLeft(scrollLeft > 6);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 6);
    }
  }, []);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;

    updateScrollState();

    const handleScroll = () => {
      updateScrollState();
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", updateScrollState);

    // Natural horizontal scrolling via mouse wheel (converts vertical wheel delta to scrollLeft)
    const handleWheel = (e: WheelEvent) => {
      if (el.scrollWidth > el.clientWidth) {
        if (Math.abs(e.deltaY) > 0) {
          e.preventDefault();
          el.scrollLeft += e.deltaY * 0.9;
        }
      }
    };
    el.addEventListener("wheel", handleWheel, { passive: false });

    const ro = new ResizeObserver(() => {
      updateScrollState();
    });
    ro.observe(el);

    return () => {
      el.removeEventListener("scroll", handleScroll);
      el.removeEventListener("wheel", handleWheel);
      window.removeEventListener("resize", updateScrollState);
      ro.disconnect();
    };
  }, [updateScrollState]);

  const scrollHeader = (direction: "left" | "right") => {
    if (headerRef.current) {
      const amount = direction === "left" ? -280 : 280;
      headerRef.current.scrollBy({ left: amount, behavior: "smooth" });
    }
  };

  useEffect(() => {
    getModelCacheInfo().then((info) => {
      setCacheCount(info.cachedAssetsCount);
    });
  }, []);

  // Close file menu on outside click or escape
  useEffect(() => {
    if (!isFileMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        fileMenuButtonRef.current &&
        !fileMenuButtonRef.current.contains(e.target as Node) &&
        fileMenuDropdownRef.current &&
        !fileMenuDropdownRef.current.contains(e.target as Node)
      ) {
        setIsFileMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFileMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFileMenuOpen]);

  const toggleFileMenu = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuCoords({
      top: rect.bottom + 6,
      right: Math.max(12, window.innerWidth - rect.right),
    });
    setIsFileMenuOpen((prev) => !prev);
  };

  const handleOpenCacheModal = async () => {
    const info = await getModelCacheInfo();
    setCacheCount(info.cachedAssetsCount);
    setIsCacheModalOpen(true);
  };

  const handlePrefetchAll = async () => {
    setIsPrefetching(true);
    setPrefetchStatus("Modellar tekshirilmoqda va yuklanmoqda...");
    try {
      const res = await prefetchAndCacheAllModels((curr, total, key) => {
        setPrefetchStatus(`${key} saqlanmoqda (${curr}/${total})...`);
      });
      const info = await getModelCacheInfo();
      setCacheCount(info.cachedAssetsCount);
      setPrefetchStatus(`Tayyor! ${res.success} ta model muvaffaqiyatli keshlandi.`);
    } catch (e: any) {
      setPrefetchStatus("Keshga yuklashda xatolik yuz berdi.");
    } finally {
      setIsPrefetching(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) onImportJSON(content);
      };
      reader.readAsText(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="header-container-wrapper">
      {/* Left scroll chevron button */}
      {canScrollLeft && (
        <>
          <div className="header-fade-edge left" />
          <button
            type="button"
            className="header-scroll-arrow left"
            onClick={() => scrollHeader("left")}
            title="Panelni chapga surish"
          >
            <ChevronLeft size={16} />
          </button>
        </>
      )}

      <header ref={headerRef} className="header-bar" id="app-header-bar">
        <div className="header-left">
          <div className="header-title-group">
            <div className="telemetry-badge">
              <Radio className="badge-icon-spin" size={11} />
              <span>{t("header.telemetry")}</span>
            </div>
            <h1 className="header-title">{t("header.title")}</h1>
          </div>

          <div
            className="inventory-stat-pill"
            id="inventory-telemetry-pill"
            title={`${t("header.onStage")}: ${placedCount} / ${totalCount} dona (${Math.round((placedCount / totalCount) * 100)}%)`}
          >
            <span className="stat-label">{t("header.onStage")}:</span>
            <span className="stat-value highlight">
              {placedCount}/{totalCount}
            </span>
            <span className="stat-sub hidden sm:inline">({Math.round((placedCount / totalCount) * 100)}%)</span>
          </div>
        </div>

        <div className="header-center">
          {/* Undo & Redo History buttons */}
          <div className="button-group history-tools shrink-0 flex items-center bg-slate-900/80 rounded-lg p-0.5 border border-slate-700/60" id="undo-redo-group">
            <button
              id="btn-header-undo"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-all ${
                canUndo
                  ? "text-slate-200 hover:text-white hover:bg-slate-800 cursor-pointer active:scale-95"
                  : "text-slate-600 cursor-not-allowed opacity-50"
              }`}
              disabled={!canUndo}
              onClick={onUndo}
              title={`Orqaga qaytarish [Ctrl+Z] (Undo)${undoCount > 0 ? ` — ${undoCount} ta amal mavjud` : ""}`}
            >
              <Undo2 size={13} />
              <span className="hidden xl:inline">Undo</span>
              {undoCount > 0 && (
                <span className="text-[10px] text-cyan-400 font-mono font-semibold">({undoCount})</span>
              )}
            </button>
            <button
              id="btn-header-redo"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-all ${
                canRedo
                  ? "text-slate-200 hover:text-white hover:bg-slate-800 cursor-pointer active:scale-95"
                  : "text-slate-600 cursor-not-allowed opacity-50"
              }`}
              disabled={!canRedo}
              onClick={onRedo}
              title={`Oldinga qaytarish [Ctrl+Y / Ctrl+Shift+Z] (Redo)${redoCount > 0 ? ` — ${redoCount} ta amal mavjud` : ""}`}
            >
              <Redo2 size={13} />
              <span className="hidden xl:inline">Redo</span>
              {redoCount > 0 && (
                <span className="text-[10px] text-cyan-400 font-mono font-semibold">({redoCount})</span>
              )}
            </button>
          </div>

          {/* Transform Mode Controls: W, E, R */}
          <div className="button-group transform-tools shrink-0" id="transform-mode-group">
            <button
              id="btn-mode-translate"
              className={`tool-btn ${transformMode === "translate" ? "active" : ""}`}
              onClick={() => setTransformMode("translate")}
              title={`${t("header.modeTranslate")} [W]`}
            >
              <Move size={14} />
              <span className="hidden xl:inline">{t("header.modeTranslate")}</span>
            </button>
            <button
              id="btn-mode-rotate"
              className={`tool-btn ${transformMode === "rotate" ? "active" : ""}`}
              onClick={() => setTransformMode("rotate")}
              title={`${t("header.modeRotate")} [E]`}
            >
              <RotateCw size={14} />
              <span className="hidden xl:inline">{t("header.modeRotate")}</span>
            </button>
            <button
              id="btn-mode-scale"
              className={`tool-btn ${transformMode === "scale" ? "active" : ""}`}
              onClick={() => setTransformMode("scale")}
              title={`${t("header.modeScale")} [R]`}
            >
              <Maximize2 size={14} />
              <span className="hidden xl:inline">{t("header.modeScale")}</span>
            </button>
          </div>

          <button
            id="btn-transform-space"
            className="tool-btn toggle-subtle shrink-0"
            onClick={() => setTransformSpace(transformSpace === "world" ? "local" : "world")}
            title={`${t("header.coordTooltip")}: ${transformSpace === "world" ? t("header.coordWorld") : t("header.coordLocal")}`}
          >
            <Globe size={13} />
            <span>{transformSpace === "world" ? t("header.coordWorld") : t("header.coordLocal")}</span>
          </button>

          {onAutoPlaceAll && (
            <button
              id="btn-header-auto-place-all"
              className="tool-btn-pill flex items-center gap-1.5 px-2.5 py-1 bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 hover:text-cyan-100 border border-cyan-500/40 hover:border-cyan-400 rounded-md text-xs transition-all font-medium shadow-sm shrink-0"
              onClick={onAutoPlaceAll}
              title={t("inventory.autoPlaceSub")}
            >
              <Sparkles size={13} className="text-cyan-400" />
              <span className="hidden md:inline">{t("header.autoPlaceAll")}</span>
              <span className="md:hidden">Auto</span>
            </button>
          )}

          {/* Panel visibility quick toggles */}
          <div className="flex items-center bg-slate-900/60 rounded-md border border-slate-700/60 p-0.5 shrink-0" title="Yon panellarni ko‘rsatish/yashirish">
            {onToggleLeftPanel && (
              <button
                id="btn-header-toggle-left-panel"
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-all ${
                  isLeftPanelOpen
                    ? "bg-slate-700/80 text-cyan-300 font-medium"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                onClick={onToggleLeftPanel}
                title={isLeftPanelOpen ? "Inventar panelini yashirish" : "Inventar panelini ochish"}
              >
                <PanelLeft size={13} />
                <span className="hidden lg:inline">Inventar</span>
              </button>
            )}
            {onToggleRightPanel && (
              <button
                id="btn-header-toggle-right-panel"
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-all ${
                  isRightPanelOpen
                    ? "bg-slate-700/80 text-cyan-300 font-medium"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                onClick={onToggleRightPanel}
                title={isRightPanelOpen ? "Inspektor panelini yashirish" : "Inspektor panelini ochish"}
              >
                <PanelRight size={13} />
                <span className="hidden lg:inline">Inspektor</span>
              </button>
            )}
          </div>

          {/* Drone airframe controls */}
          {!isDronePlaced ? (
            onToggleDronePresence && (
              <button
                id="btn-add-drone-airframe"
                className="tool-btn-pill flex items-center gap-1.5 px-2.5 py-1 bg-slate-800/90 hover:bg-slate-700/90 text-sky-300 hover:text-sky-200 border border-sky-500/30 hover:border-sky-500/60 rounded-md text-xs transition-all font-medium shrink-0"
                onClick={onToggleDronePresence}
                title="Dron korpusini (3800mm) sahnaga qo‘shish"
              >
                <PlusCircle size={13} className="text-sky-400" />
                <span className="hidden sm:inline">+ Dron korpusi</span>
                <span className="sm:hidden">+ Dron</span>
              </button>
            )
          ) : (
            <div className="drone-vis-controls shrink-0" id="drone-airframe-controls">
              <button
                id="btn-toggle-drone-vis"
                className={`tool-btn-icon ${droneVisible ? "active" : "inactive"}`}
                onClick={() => setDroneVisible(!droneVisible)}
                title={droneVisible ? "Dron korpusini yashirish" : "Dron korpusini ko‘rsatish"}
              >
                {droneVisible ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>

              {onToggleDronePresence && (
                <button
                  id="btn-toggle-drone-presence"
                  className="tool-btn-icon text-red-400 hover:text-red-300 hover:bg-red-500/20"
                  onClick={onToggleDronePresence}
                  title="Dron korpusini sahnadan o‘chirish"
                >
                  <Trash2 size={14} />
                </button>
              )}

              <div className="opacity-slider-wrapper" title={`Dron shaffofligi: ${Math.round(droneOpacity * 100)}%`}>
                <span className="slider-label hidden xl:inline">Dron:</span>
                <input
                  id="slider-drone-opacity"
                  type="range"
                  min="0.05"
                  max="1"
                  step="0.05"
                  value={droneOpacity}
                  onChange={(e) => setDroneOpacity(parseFloat(e.target.value))}
                  className="range-slider"
                />
              </div>

              <button
                id="btn-toggle-drone-wf"
                className={`tool-btn-icon ${droneWireframe ? "active" : ""}`}
                onClick={() => setDroneWireframe(!droneWireframe)}
                title="Wireframe karkas rejimi"
              >
                <Grid size={14} />
              </button>

              {/* Drone color selector */}
              <div className="drone-color-picker-wrapper flex items-center gap-1" title={`Dron korpusi rangi: ${droneColor === "original" ? "Asl ranglar (Fuselage/Wings)" : droneColor}`}>
                <label
                  htmlFor="input-drone-color"
                  className="color-picker-label-btn"
                  title="Dron korpusi rangini o‘zgartirish"
                >
                  <span
                    className="color-indicator-circle"
                    style={{
                      background:
                        droneColor === "original"
                          ? "linear-gradient(135deg, #1e293b 0%, #0284c7 50%, #38bdf8 100%)"
                          : droneColor,
                    }}
                  />
                  <span className="color-btn-text hidden 2xl:inline">
                    {droneColor === "original" ? "Asl rang" : "Dron"}
                  </span>
                  <Palette size={12} className="color-swatch-icon" />
                  <input
                    id="input-drone-color"
                    type="color"
                    value={droneColor === "original" ? "#0284c7" : droneColor}
                    onChange={(e) => setDroneColor(e.target.value)}
                    className="hidden-color-input"
                  />
                </label>
                {droneColor !== "original" && (
                  <button
                    type="button"
                    onClick={() => setDroneColor("original")}
                    className="text-[10px] px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded border border-slate-700 hover:border-cyan-500 transition-colors"
                    title="Dron asl ranglariga qaytarish"
                  >
                    Asl rang
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Quick Reload Models with Original Colors Button */}
          {onReloadModels && (
            <button
              id="btn-quick-reload-models"
              type="button"
              className={`toolbar-btn text-xs gap-1.5 px-2.5 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700/80 rounded-lg transition-all shrink-0 ${isReloadingModels ? "opacity-50 pointer-events-none" : ""}`}
              onClick={onReloadModels}
              title="Barcha 3D modellarni asl ranglari va materiallari bilan qayta tekshirib yuklash"
            >
              <RefreshCw size={13} className={`text-cyan-400 ${isReloadingModels ? "animate-spin" : ""}`} />
              <span className="hidden xl:inline font-medium">Asl ranglar</span>
            </button>
          )}

          {/* Quick Reload Jetson Model Button */}
          {onReloadJetson && (
            <button
              id="btn-quick-reload-jetson"
              type="button"
              className={`toolbar-btn text-xs gap-1.5 px-2.5 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700/80 rounded-lg transition-all shrink-0 ${isReloadingJetson ? "opacity-50 pointer-events-none" : ""}`}
              onClick={onReloadJetson}
              title="Jetson P3737 3D modelini keshni tozalab yangidan yuklash"
            >
              <RefreshCw size={13} className={`text-emerald-400 ${isReloadingJetson ? "animate-spin" : ""}`} />
              <span className="hidden xl:inline font-medium text-emerald-300">Jetson yuklash</span>
            </button>
          )}

          {/* 3D Model Picker & Import Button */}
          {onOpenModelImport && (
            <button
              id="btn-header-open-model-import"
              type="button"
              className="toolbar-btn text-xs gap-1.5 px-3 py-1.5 bg-cyan-950/70 hover:bg-cyan-900/80 text-cyan-300 hover:text-white border border-cyan-700/70 rounded-lg transition-all shadow-sm shrink-0 flex items-center font-medium cursor-pointer"
              onClick={() => onOpenModelImport()}
              title={t("models.title")}
            >
              <Box size={14} className="text-cyan-400" />
              <span className="font-semibold text-cyan-200">{t("header.selectModel")}</span>
            </button>
          )}

          {/* Scene Theme Selector */}
          <div className="scene-theme-selector shrink-0" id="scene-theme-selector" title={t("header.sceneTheme")}>
            <Layers size={13} className="theme-selector-icon" />
            <select
              id="select-scene-theme"
              className="theme-dropdown-select"
              value={sceneTheme}
              onChange={(e) => setSceneTheme(e.target.value as SceneTheme)}
            >
              <option value="dark">🌌 Aerospace</option>
              <option value="light">☀️ Light</option>
              <option value="blueprint">📐 CAD</option>
              <option value="tactical">🎯 Tactical</option>
              <option value="hangar">🌅 Hangar</option>
            </select>
          </div>

          {/* Pin & Cable Toggles */}
          <div className="layer-toggles shrink-0">
            <button
              id="btn-toggle-pins"
              className={`tool-btn-pill ${showPins ? "active" : ""}`}
              onClick={() => setShowPins(!showPins)}
              title={t("header.pins")}
            >
              <Zap size={13} />
              <span className="hidden sm:inline">{t("header.pins")}</span>
            </button>
            <button
              id="btn-toggle-cables"
              className={`tool-btn-pill ${showCables ? "active" : ""}`}
              onClick={() => setShowCables(!showCables)}
              title={t("header.cables")}
            >
              <Cable size={13} />
              <span className="hidden sm:inline">{t("header.cables")}</span>
            </button>
            <button
              id="btn-toggle-grid"
              className={`tool-btn-pill ${showGrid ? "active" : ""}`}
              onClick={() => setShowGrid(!showGrid)}
              title={t("header.grid")}
            >
              <Grid size={13} />
              <span className="hidden sm:inline">{t("header.grid")}</span>
            </button>
            {onToggleDimUnselected && (
              <button
                type="button"
                id="btn-toggle-dim-unselected-header"
                className={`tool-btn-pill ${dimUnselected ? "active border-amber-500/50 bg-amber-950/40 text-amber-200 shadow-sm" : ""}`}
                onClick={onToggleDimUnselected}
                title={
                  dimUnselected
                    ? "Fokus faol: Tanlanmagan elementlar kulrang qilinadi [D]. Barchasini ko‘rsatish uchun bosing"
                    : "Oddiy ko‘rinish: Barcha elementlar to‘liq ko‘rinadi [D]. Kulrang qilishni yoqish uchun bosing"
                }
              >
                {dimUnselected ? (
                  <EyeOff size={13} className="text-amber-400" />
                ) : (
                  <Eye size={13} className="text-cyan-300" />
                )}
                <span className="hidden sm:inline">
                  {dimUnselected ? "Kulrang: On" : "Barchasi: On"}
                </span>
              </button>
            )}
          </div>
        </div>

        <div className="header-right" id="header-right-actions">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json"
            style={{ display: "none" }}
          />

          {/* Offline Cache Status Pill */}
          <button
            id="btn-open-cache-settings"
            className="action-btn flex items-center gap-1.5 shrink-0"
            onClick={handleOpenCacheModal}
            title="Brauzer oflayn kesh holati va sozlamalari"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
            <Database size={13} className="text-emerald-400" />
            <span className="hidden lg:inline">Kesh</span>
            <span>({cacheCount})</span>
          </button>

          {/* Snapshot PNG */}
          <button
            id="btn-capture-png"
            className="action-btn flex items-center gap-1.5 shrink-0"
            onClick={onCapturePNG}
            title="Sahnadan yuqori sifatli PNG rasm olish"
          >
            <Camera size={13} className="text-cyan-400" />
            <span className="hidden sm:inline">Rasm</span>
          </button>

          {/* 3D Video Recording Button */}
          {onToggleVideo && (
            <button
              id="btn-header-toggle-video"
              className={`action-btn flex items-center gap-1.5 shrink-0 font-medium transition-all ${
                isVideoRecording
                  ? "bg-rose-500/25 border-rose-500 text-rose-200 animate-pulse"
                  : "text-slate-300 hover:text-rose-300 hover:border-rose-500/50"
              }`}
              onClick={onToggleVideo}
              title={isVideoRecording ? "Videoni to‘xtatish va saqlash" : "3D Video yozishni boshlash"}
            >
              {isVideoRecording ? (
                <>
                  <Square size={13} className="text-rose-400 fill-rose-400" />
                  <span className="text-rose-200 font-semibold">REC</span>
                </>
              ) : (
                <>
                  <Video size={13} className="text-rose-400" />
                  <span className="hidden sm:inline">Video</span>
                </>
              )}
            </button>
          )}

          {/* Cable Flow Animation Toggle */}
          {onToggleFlowAnimation && (
            <button
              id="btn-header-toggle-flow"
              className={`action-btn flex items-center gap-1.5 shrink-0 font-medium transition-all ${
                isFlowAnimating
                  ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-sm shadow-cyan-500/20"
                  : "text-slate-300 hover:text-cyan-300 hover:border-cyan-500/50"
              }`}
              onClick={onToggleFlowAnimation}
              title={isFlowAnimating ? "Animatsiyani to‘xtatish" : "Kabellarda signal/power oqimi animatsiyasini yoqish"}
            >
              {isFlowAnimating ? (
                <Pause size={13} className="text-cyan-400 fill-cyan-400" />
              ) : (
                <Play size={13} className="text-slate-300 fill-slate-300" />
              )}
              <span className="hidden md:inline">
                {isFlowAnimating ? "Oqim faol" : "Animatsiya"}
              </span>
            </button>
          )}

          {/* Keyboard Shortcuts Button */}
          {onOpenShortcutsModal && (
            <button
              id="btn-open-shortcuts-modal"
              className="action-btn flex items-center gap-1.5 shrink-0 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/40"
              onClick={onOpenShortcutsModal}
              title="Klaviatura tezkor tugmalari ro‘yxati [Klaviatura: ? yoki F1]"
            >
              <Keyboard size={13} className="text-cyan-400" />
              <span className="hidden lg:inline">{t("header.shortcuts")}</span>
              <kbd className="hidden sm:inline bg-slate-800 text-[10px] px-1 py-0.2 rounded border border-slate-700 text-slate-400 font-mono">
                ?
              </kbd>
            </button>
          )}

          {/* Dedicated Explicit "Saqlash" (Save) Button */}
          {onForceSave && (
            <button
              id="btn-manual-save"
              className={`action-btn flex items-center gap-1.5 px-3 py-1 font-semibold text-xs rounded transition-all shadow-sm shrink-0 ${
                isJustSaved
                  ? "bg-emerald-600 text-white border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.35)]"
                  : autoSaveStatus === "saving" || isCloudSaving
                  ? "bg-amber-600/90 hover:bg-amber-600 text-white border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)] cursor-wait"
                  : "bg-emerald-600/90 hover:bg-emerald-500 text-white border-emerald-400/80 shadow-[0_0_10px_rgba(16,185,129,0.25)] active:scale-95"
              }`}
              onClick={handleManualSaveClick}
              title={`${t("common.save")} (Ctrl+S)`}
            >
              {isJustSaved ? (
                <Check size={13} className="text-white" />
              ) : autoSaveStatus === "saving" || isCloudSaving ? (
                <RefreshCw size={13} className="animate-spin text-white" />
              ) : (
                <Save size={13} className="text-white" />
              )}
              <span className="font-semibold tracking-wide">
                {isJustSaved
                  ? t("common.saved")
                  : autoSaveStatus === "saving" || isCloudSaving
                  ? t("common.saving")
                  : t("header.saveBtn")}
              </span>
              <kbd className="hidden md:inline-block text-[9px] bg-emerald-950/80 text-emerald-200 px-1 py-0.2 rounded border border-emerald-400/40 font-mono ml-0.5">
                Ctrl+S
              </kbd>
            </button>
          )}

          {/* Auto-Save & Cloud Sync Badge */}
          {onOpenCloudModal && (
            <button
              id="btn-cloud-sync"
              className={`action-btn flex items-center gap-1.5 transition-all ${
                autoSaveStatus === "saving" || isCloudSaving
                  ? "text-amber-300 border-amber-500/50 bg-amber-950/40 shadow-[0_0_8px_rgba(245,158,11,0.2)]"
                  : autoSaveStatus === "saved"
                  ? "text-emerald-300 hover:text-emerald-200 border-emerald-500/40 bg-emerald-950/30 hover:bg-emerald-900/40"
                  : "text-sky-400 hover:text-sky-300 border-sky-500/40 bg-sky-950/40 hover:bg-sky-900/50"
              }`}
              onClick={onOpenCloudModal}
              title={`Cloud: ${cloudCode || "main-project"}`}
            >
              {autoSaveStatus === "saving" || isCloudSaving ? (
                <RefreshCw size={13} className="animate-spin text-amber-400" />
              ) : autoSaveStatus === "saved" ? (
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                  <Check size={12} className="text-emerald-400" />
                </span>
              ) : (
                <Cloud size={13} className="text-sky-400" />
              )}
              <span className="font-medium text-xs">
                {autoSaveStatus === "saving" || isCloudSaving ? (
                  t("common.saving")
                ) : (
                  <>
                    <span>{t("header.autoSaved")}</span>
                    {lastSavedAtText && (
                      <span className="hidden xl:inline text-[10px] text-emerald-400/80 font-mono ml-1">
                        {lastSavedAtText}
                      </span>
                    )}
                  </>
                )}
              </span>
              {cloudCode && (
                <span className="hidden 2xl:inline bg-sky-900/60 text-sky-300 px-1 py-0.2 rounded text-[10px] font-mono border border-sky-700/50">
                  {cloudCode}
                </span>
              )}
            </button>
          )}

          {/* Language Selector (UZ, TR, EN) */}
          <LanguageSelector className="shrink-0" />

          {/* Consolidated File & Export Dropdown Menu */}
          <div className="relative inline-block shrink-0">
            <button
              ref={fileMenuButtonRef}
              id="btn-file-export-menu"
              className={`action-btn flex items-center gap-1.5 ${isFileMenuOpen ? "active" : ""}`}
              onClick={toggleFileMenu}
              title={t("header.fileMenu")}
            >
              <FolderDown size={13} />
              <span>{t("header.fileMenu")}</span>
              <ChevronDown
                size={12}
                className={`transition-transform duration-200 ${isFileMenuOpen ? "rotate-180" : ""}`}
              />
            </button>

          {isFileMenuOpen && (
            <div
              ref={fileMenuDropdownRef}
              className="file-dropdown-menu"
              style={{
                top: `${menuCoords.top}px`,
                right: `${menuCoords.right}px`,
              }}
            >
              {onForceSave && (
                <button
                  id="btn-menu-save-project"
                  className="file-menu-item font-semibold text-emerald-300 hover:bg-emerald-950/50 flex items-center justify-between"
                  onClick={() => {
                    setIsFileMenuOpen(false);
                    handleManualSaveClick();
                  }}
                  title="Loyihani to‘liq saqlash va yangilash (Ctrl+S / Cmd+S)"
                >
                  <span className="flex items-center gap-2">
                    <Save size={14} className="text-emerald-400" />
                    <span>Loyihani saqlash</span>
                  </span>
                  <kbd className="text-[10px] bg-emerald-950/90 border border-emerald-600/50 px-1 py-0.5 rounded font-mono text-emerald-300">
                    Ctrl+S
                  </kbd>
                </button>
              )}

              {onOpenCloudModal && (
                <button
                  id="btn-menu-cloud-sync"
                  className="file-menu-item font-medium text-sky-300"
                  onClick={() => {
                    setIsFileMenuOpen(false);
                    onOpenCloudModal();
                  }}
                  title="Bulutli saqlash va boshqa kompyuterda ochish"
                >
                  <Cloud size={14} className="text-sky-400" />
                  <span>Bulutda saqlash / Ochish {cloudCode ? `(${cloudCode})` : ""}</span>
                </button>
              )}

              <button
                id="btn-export-json"
                className="file-menu-item"
                onClick={() => {
                  setIsFileMenuOpen(false);
                  onExportJSON();
                }}
                title="Joylashuv va kabellarni JSON faylga saqlash"
              >
                <Download size={14} className="text-sky-400" />
                <span>JSON saqlash (Eksport)</span>
              </button>

              <button
                id="btn-import-json"
                className="file-menu-item"
                onClick={() => {
                  setIsFileMenuOpen(false);
                  fileInputRef.current?.click();
                }}
                title="JSON konfiguratsiyani yuklash"
              >
                <Upload size={14} className="text-emerald-400" />
                <span>JSON yuklash (Import)</span>
              </button>

              <button
                id="btn-export-csv"
                className="file-menu-item"
                onClick={() => {
                  setIsFileMenuOpen(false);
                  onExportCSV();
                }}
                title="Komponentlar inventarini CSV jadvalga saqlash"
              >
                <FileSpreadsheet size={14} className="text-amber-400" />
                <span>CSV inventar jadvali</span>
              </button>

              <button
                id="btn-menu-capture-png"
                className="file-menu-item"
                onClick={() => {
                  setIsFileMenuOpen(false);
                  onCapturePNG();
                }}
                title="3D Sahnadan yuqori aniqlikdagi PNG rasm olish"
              >
                <Camera size={14} className="text-cyan-400" />
                <span>PNG Rasm saqlash</span>
              </button>

              {onToggleVideo && (
                <button
                  id="btn-menu-toggle-video"
                  className="file-menu-item font-medium text-rose-300"
                  onClick={() => {
                    setIsFileMenuOpen(false);
                    onToggleVideo();
                  }}
                  title="3D ko‘rinishdan harakatli video yozish (WebM/MP4)"
                >
                  <Video size={14} className="text-rose-400" />
                  <span>{isVideoRecording ? "Videoni to‘xtatish va saqlash" : "3D Video yozish (WebM/MP4)"}</span>
                </button>
              )}

              {onToggleFlowAnimation && (
                <button
                  id="btn-menu-toggle-flow"
                  className="file-menu-item text-cyan-300"
                  onClick={() => {
                    setIsFileMenuOpen(false);
                    onToggleFlowAnimation();
                  }}
                  title="Kabellarda quvvat va signal oqimini vizual ko‘rsatish"
                >
                  {isFlowAnimating ? (
                    <Pause size={14} className="text-cyan-400" />
                  ) : (
                    <Play size={14} className="text-cyan-400" />
                  )}
                  <span>{isFlowAnimating ? "Kabel oqimini to‘xtatish" : "Kabel oqimi animatsiyasi"}</span>
                </button>
              )}

              {onReloadModels && (
                <button
                  id="btn-reload-models"
                  className="file-menu-item"
                  onClick={() => {
                    setIsFileMenuOpen(false);
                    onReloadModels();
                  }}
                  title="3D modellarni serverdan qayta yuklash"
                >
                  <RefreshCw size={14} className={`text-cyan-400 ${isReloadingModels ? "animate-spin" : ""}`} />
                  <span>Modellarni qayta yuklash</span>
                </button>
              )}

              <div className="file-menu-divider" />

              {/* Language Selection Row inside dropdown */}
              <div className="px-3 py-2 flex items-center justify-between text-xs text-slate-300 bg-slate-950/60 rounded-lg mx-1 my-1 border border-slate-800">
                <span className="flex items-center gap-1.5 font-medium text-slate-300">
                  <Globe size={13} className="text-cyan-400" />
                  <span>{t("header.menuLanguage")}:</span>
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setLanguage("uz")}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                      language === "uz"
                        ? "bg-cyan-600 text-white shadow-sm ring-1 ring-cyan-400"
                        : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                    }`}
                  >
                    🇺🇿 UZ
                  </button>
                  <button
                    type="button"
                    onClick={() => setLanguage("tr")}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                      language === "tr"
                        ? "bg-cyan-600 text-white shadow-sm ring-1 ring-cyan-400"
                        : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                    }`}
                  >
                    🇹🇷 TR
                  </button>
                  <button
                    type="button"
                    onClick={() => setLanguage("en")}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                      language === "en"
                        ? "bg-cyan-600 text-white shadow-sm ring-1 ring-cyan-400"
                        : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                    }`}
                  >
                    🇬🇧 EN
                  </button>
                </div>
              </div>

              <div className="file-menu-divider" />

              <button
                id="btn-reset-all"
                className="file-menu-item danger"
                onClick={() => {
                  setIsFileMenuOpen(false);
                  onResetAll();
                }}
                title={t("header.menuResetAll")}
              >
                <RotateCcw size={14} />
                <span>{t("header.menuResetAll")}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Persistent Browser Cache Dialog */}
      {isCacheModalOpen && (
        <div
          id="cache-management-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setIsCacheModalOpen(false)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <HardDrive className="text-emerald-400" size={20} />
                <h3 className="font-semibold text-white text-base">Brauzer Xotirasi va Kesh</h3>
              </div>
              <button
                id="btn-close-cache-modal"
                onClick={() => setIsCacheModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed text-slate-300">
              <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl flex items-start gap-2.5">
                <ShieldCheck className="text-emerald-400 shrink-0 mt-0.5" size={16} />
                <div>
                  <span className="font-medium text-emerald-300">Trafik tejalmoqda (Offline Cache)</span>
                  <p className="mt-1 text-slate-300">
                    Barcha 3D modellar brauzeringizning <strong>CacheStorage</strong> va <strong>IndexedDB</strong> xotirasida saqlanadi. Har safar sahifa yangilanganda modellar internetdan qayta yuklanmaydi va trafik sarflanmaydi.
                  </p>
                </div>
              </div>

              <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Doimiy keshdagi fayllar:</span>
                  <span className="font-mono text-emerald-300 font-semibold">{cacheCount} ta asset</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Xotira turi:</span>
                  <span className="font-mono text-sky-300">CacheStorage API + IndexedDB</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Dastlabki dron ko‘rinishi:</span>
                  <span className="font-medium text-amber-300">O‘chirilgan (Talab bo‘yicha qo‘shiladi)</span>
                </div>
              </div>

              {prefetchStatus && (
                <div className="p-2.5 bg-sky-950/40 border border-sky-500/30 rounded-lg text-sky-200 text-xs">
                  {prefetchStatus}
                </div>
              )}
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                id="btn-prefetch-all-models"
                onClick={handlePrefetchAll}
                disabled={isPrefetching}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white font-medium text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
              >
                <Database size={14} />
                <span>
                  {isPrefetching ? "Yuklanmoqda..." : "Barcha modellarni keshga saqlash (Offline to‘liq tayyorlash)"}
                </span>
              </button>

              <div className="flex gap-2">
                {onReloadModels && (
                  <button
                    id="btn-modal-clear-cache"
                    onClick={() => {
                      setIsCacheModalOpen(false);
                      onReloadModels();
                    }}
                    className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs rounded-xl transition-all text-center"
                  >
                    Keshni tozalash va yangilash
                  </button>
                )}
                <button
                  id="btn-modal-close"
                  onClick={() => setIsCacheModalOpen(false)}
                  className="py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs rounded-xl transition-all"
                >
                  Yopish
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </header>

      {/* Right scroll chevron button */}
      {canScrollRight && (
        <>
          <div className="header-fade-edge right" />
          <button
            type="button"
            className="header-scroll-arrow right"
            onClick={() => scrollHeader("right")}
            title="Panelni o‘ngga surish"
          >
            <ChevronRight size={16} />
          </button>
        </>
      )}
    </div>
  );
};
