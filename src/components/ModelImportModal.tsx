import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Upload,
  Globe,
  CheckCircle2,
  AlertCircle,
  X,
  FileCode,
  Radio,
  Loader2,
  Box,
  Layers,
  Search,
  Plus,
  Sparkles,
  Sliders,
  Check,
} from "lucide-react";
import { ComponentManifestItem } from "../types";
import { modelManager, PRESET_3D_MODELS, Preset3DModel } from "../services/modelManager";

interface ModelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  manifest: ComponentManifestItem[];
  defaultComponentId?: string;
  onSuccess: (componentId: string, message: string) => void;
  onCreateCustomComponent?: (name: string, quantity: number, notes?: string) => Promise<string>;
}

export const ModelImportModal: React.FC<ModelImportModalProps> = ({
  isOpen,
  onClose,
  manifest,
  defaultComponentId = "01",
  onSuccess,
  onCreateCustomComponent,
}) => {
  const [activeSourceTab, setActiveSourceTab] = useState<"file" | "preset" | "url">("file");
  const [targetComponentId, setTargetComponentId] = useState<string>(defaultComponentId);
  const [isCreatingNewComponent, setIsCreatingNewComponent] = useState<boolean>(false);
  const [newComponentName, setNewComponentName] = useState<string>("");
  const [newComponentQty, setNewComponentQty] = useState<number>(1);
  const [newComponentNotes, setNewComponentNotes] = useState<string>("");

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preset models state
  const [presetSearch, setPresetSearch] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedPresetKey, setSelectedPresetKey] = useState<string>("jetson-p3737");

  // URL state
  const [modelUrl, setModelUrl] = useState<string>("");

  // Scale & processing options
  const [scaleMultiplier, setScaleMultiplier] = useState<number>(1.0);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState<boolean>(false);

  // Loading & error states
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync default component ID when opened
  useEffect(() => {
    if (isOpen) {
      if (defaultComponentId) {
        setTargetComponentId(defaultComponentId);
        setIsCreatingNewComponent(false);
      }
      setErrorMsg(null);
    }
  }, [isOpen, defaultComponentId]);

  // Filtered preset models
  const filteredPresets = useMemo(() => {
    return PRESET_3D_MODELS.filter((preset) => {
      const matchCat = selectedCategory === "all" || preset.category === selectedCategory;
      const matchSearch =
        !presetSearch.trim() ||
        preset.name.toLowerCase().includes(presetSearch.toLowerCase()) ||
        preset.description.toLowerCase().includes(presetSearch.toLowerCase()) ||
        preset.assetKey.toLowerCase().includes(presetSearch.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [selectedCategory, presetSearch]);

  if (!isOpen) return null;

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const lower = file.name.toLowerCase();
      if (lower.endsWith(".glb") || lower.endsWith(".gltf") || lower.endsWith(".stl") || lower.endsWith(".obj")) {
        setSelectedFile(file);
        setErrorMsg(null);
      } else {
        setErrorMsg("Faqat .glb, .gltf, .stl yoki .obj formatidagi 3D fayllar qo'llab-quvvatlanadi");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setErrorMsg(null);
    }
  };

  const handleApply = async () => {
    setErrorMsg(null);
    setIsLoading(true);

    try {
      let finalComponentId = targetComponentId;
      let finalComponentName = "";

      // 1. If creating new component
      if (isCreatingNewComponent) {
        if (!newComponentName.trim()) {
          throw new Error("Iltimos, yangi komponent nomini kiriting");
        }
        if (onCreateCustomComponent) {
          finalComponentId = await onCreateCustomComponent(
            newComponentName.trim(),
            newComponentQty || 1,
            newComponentNotes.trim() || "Maxsus yuklangan 3D model"
          );
        } else {
          finalComponentId = `custom-${Date.now().toString().slice(-4)}`;
        }
        finalComponentName = newComponentName.trim();
      } else {
        const item = manifest.find((m) => m.id === targetComponentId);
        finalComponentName = item?.component || `#${targetComponentId}`;
      }

      // 2. Load model based on selected tab
      if (activeSourceTab === "file") {
        if (!selectedFile) {
          throw new Error("Iltimos, 3D model faylini tanlang (.glb, .gltf, .stl, .obj)");
        }

        const arrayBuffer = await selectedFile.arrayBuffer();
        const lowerName = selectedFile.name.toLowerCase();
        let format: "obj" | "stl" | "glb" | "gltf" = "glb";
        if (lowerName.endsWith(".stl")) format = "stl";
        else if (lowerName.endsWith(".glb")) format = "glb";
        else if (lowerName.endsWith(".gltf")) format = "gltf";
        else if (lowerName.endsWith(".obj")) format = "obj";

        await modelManager.loadCustomModel(
          finalComponentId,
          arrayBuffer,
          format,
          scaleMultiplier,
          selectedFile.name
        );
        onSuccess(
          finalComponentId,
          `"${finalComponentName}" uchun "${selectedFile.name}" 3D modeli muvaffaqiyatli yuklandi!`
        );
        onClose();
      } else if (activeSourceTab === "preset") {
        if (!selectedPresetKey) {
          throw new Error("Iltimos, kutubxonadan biror modelni tanlang");
        }

        const presetObj = PRESET_3D_MODELS.find((p) => p.assetKey === selectedPresetKey);
        await modelManager.assignPresetModel(finalComponentId, selectedPresetKey);

        onSuccess(
          finalComponentId,
          `"${finalComponentName}" komponentiga "${presetObj?.name || selectedPresetKey}" 3D modeli o'rnatildi!`
        );
        onClose();
      } else if (activeSourceTab === "url") {
        if (!modelUrl.trim()) {
          throw new Error("Iltimos, 3D modelning to'g'ridan-to'g'ri havolasini kiriting");
        }

        await modelManager.loadCustomModelFromUrl(finalComponentId, modelUrl.trim(), scaleMultiplier);
        onSuccess(
          finalComponentId,
          `"${finalComponentName}" uchun URL orqali 3D model muvaffaqiyatli yuklandi!`
        );
        onClose();
      }
    } catch (err: any) {
      console.error("Model load error:", err);
      setErrorMsg(err.message || "Modelni yuklashda xatolik yuz berdi");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-5"
      id="modal-model-picker-import"
    >
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Box size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-tight">
                3D Model Tanlash va Yuklash
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                O‘z faylingizni yuklang, kutubxonadagi modellardan biriktiring yoki URL orqali ulang
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto flex flex-col gap-5 text-xs">
          {/* Target Component Selection */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                <Radio size={14} className="text-cyan-400" />
                <span>Model qaysi komponentga o‘rnatilsin:</span>
              </label>
              <button
                type="button"
                onClick={() => setIsCreatingNewComponent(!isCreatingNewComponent)}
                className="text-[11px] font-medium text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors cursor-pointer"
              >
                {isCreatingNewComponent ? (
                  <span>Mavjud komponentlardan tanlash</span>
                ) : (
                  <>
                    <Plus size={13} />
                    <span>+ Yangi komponent qo'shish</span>
                  </>
                )}
              </button>
            </div>

            {!isCreatingNewComponent ? (
              <select
                id="select-target-component"
                value={targetComponentId}
                onChange={(e) => setTargetComponentId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-cyan-500 transition-colors font-medium"
              >
                {manifest.map((item) => (
                  <option key={item.id} value={item.id}>
                    #{item.id} — {item.component} ({item.quantity} dona) {item.notes ? `— ${item.notes.slice(0, 40)}` : ""}
                  </option>
                ))}
              </select>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-2 bg-slate-900/80 p-3 rounded-lg border border-cyan-900/50">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] uppercase font-bold text-cyan-300 mb-1">
                    Komponent nomi *
                  </label>
                  <input
                    type="text"
                    placeholder="Masalan: Lidar datchigi, 5.8GHz VTX..."
                    value={newComponentName}
                    onChange={(e) => setNewComponentName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-white text-xs outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-cyan-300 mb-1">
                    Miqdori
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={16}
                    value={newComponentQty}
                    onChange={(e) => setNewComponentQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-white text-xs outline-none focus:border-cyan-500"
                  />
                </div>
                <div className="sm:col-span-3">
                  <input
                    type="text"
                    placeholder="Qo'shimcha izoh yoki texnik ma'lumot (ixtiyoriy)..."
                    value={newComponentNotes}
                    onChange={(e) => setNewComponentNotes(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-slate-300 text-[11px] outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Model Source Tabs */}
          <div>
            <div className="flex border-b border-slate-800 gap-2 mb-3">
              <button
                type="button"
                onClick={() => setActiveSourceTab("file")}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                  activeSourceTab === "file"
                    ? "border-cyan-400 text-cyan-300 bg-cyan-950/20"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Upload size={14} />
                <span>1. Kompyuterdan fayl yuklash</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSourceTab("preset")}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                  activeSourceTab === "preset"
                    ? "border-cyan-400 text-cyan-300 bg-cyan-950/20"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Layers size={14} />
                <span>2. Kutubxonadagi modellar (21 ta)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSourceTab("url")}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                  activeSourceTab === "url"
                    ? "border-cyan-400 text-cyan-300 bg-cyan-950/20"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Globe size={14} />
                <span>3. Web / GitHub URL</span>
              </button>
            </div>

            {/* TAB 1: FILE UPLOAD */}
            {activeSourceTab === "file" && (
              <div className="flex flex-col gap-3">
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleFileDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2.5 ${
                    isDragging
                      ? "border-cyan-400 bg-cyan-950/40"
                      : selectedFile
                      ? "border-emerald-500/80 bg-emerald-950/20"
                      : "border-slate-700 hover:border-slate-600 bg-slate-950/40 hover:bg-slate-950/70"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".glb,.gltf,.stl,.obj"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      selectedFile ? "bg-emerald-500/20 text-emerald-400" : "bg-cyan-500/10 text-cyan-400"
                    }`}
                  >
                    {selectedFile ? <CheckCircle2 size={26} /> : <Upload size={24} />}
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-white">
                      {selectedFile ? selectedFile.name : "3D model faylini bu yerga tashlang yoki bosing"}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Qo‘llab-quvvatlanadigan formatlar:{" "}
                      <span className="text-cyan-300 font-mono">.GLB</span>,{" "}
                      <span className="text-cyan-300 font-mono">.GLTF</span>,{" "}
                      <span className="text-cyan-300 font-mono">.STL</span>,{" "}
                      <span className="text-cyan-300 font-mono">.OBJ</span>
                    </p>
                  </div>

                  {selectedFile && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-emerald-900/40 border border-emerald-700/60 rounded-full text-emerald-300 text-[11px] font-medium mt-1">
                      <span>Fayl hajmi: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                      <span>•</span>
                      <span>Format: {selectedFile.name.split(".").pop()?.toUpperCase()}</span>
                    </div>
                  )}
                </div>

                <div className="text-[11px] text-slate-400 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800">
                  💡 <span className="font-semibold text-slate-300">Maslahat:</span> Blender, SolidWorks, Fusion360 yoki CATIA dasturlaridan eksport qilingan har qanday CAD modelni (.glb tavsiya etiladi) yuklashingiz mumkin.
                </div>
              </div>
            )}

            {/* TAB 2: PRESET MODELS LIBRARY */}
            {activeSourceTab === "preset" && (
              <div className="flex flex-col gap-3">
                {/* Search & Category Filter */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Modellardan qidirish (nomi, vazifasi)..."
                      value={presetSearch}
                      onChange={(e) => setPresetSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs outline-none focus:border-cyan-500"
                    />
                  </div>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-cyan-500 font-medium"
                  >
                    <option value="all">Barcha toifalar</option>
                    <option value="airframe">Dron Korpusi</option>
                    <option value="computing">Kompyuter & Avtopilot</option>
                    <option value="power">Quvvat & Batareya</option>
                    <option value="sensors">Datchiklar & Kamera</option>
                    <option value="propulsion">Dvigatel & Propeller</option>
                    <option value="actuation">Servolar & Boshqaruv</option>
                    <option value="rf">Radio & Antenna</option>
                  </select>
                </div>

                {/* Presets Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                  {filteredPresets.map((preset) => {
                    const isSelected = selectedPresetKey === preset.assetKey;
                    return (
                      <div
                        key={preset.assetKey}
                        onClick={() => setSelectedPresetKey(preset.assetKey)}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                          isSelected
                            ? "bg-cyan-950/50 border-cyan-400 shadow-md shadow-cyan-950/40"
                            : "bg-slate-950/50 border-slate-800 hover:border-slate-700 hover:bg-slate-950"
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center ${
                            isSelected ? "bg-cyan-500 text-slate-950" : "bg-slate-800 text-slate-300"
                          }`}
                        >
                          <Box size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-white truncate text-xs">
                              {preset.name}
                            </span>
                            {isSelected && <Check size={14} className="text-cyan-400 shrink-0" />}
                          </div>
                          <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                            {preset.description}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono">
                              .GLB
                            </span>
                            {preset.dimensionsMm && (
                              <span className="text-[9px] text-slate-400">
                                {preset.dimensionsMm[0]}×{preset.dimensionsMm[1]}×{preset.dimensionsMm[2]} mm
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 3: URL / GITHUB */}
            {activeSourceTab === "url" && (
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex flex-col gap-2.5">
                <label className="text-xs font-semibold text-cyan-300 flex items-center gap-2">
                  <Globe size={14} />
                  <span>3D Model faylining to‘g‘ridan-to‘g‘ri havolasi (URL)</span>
                </label>
                <input
                  type="text"
                  placeholder="https://example.com/models/custom_sensor.glb yoki GitHub blob havolasi"
                  value={modelUrl}
                  onChange={(e) => setModelUrl(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs outline-none focus:border-cyan-500"
                />
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  GitHub veb-havolalari (<code className="text-cyan-400">github.com/.../blob/...</code>) avtomatik tarzda yuklab olinadigan Raw formatga o‘giriladi.
                </p>
              </div>
            )}
          </div>

          {/* Advanced Scaling & Multiplier Option */}
          <div className="border-t border-slate-800/80 pt-3">
            <button
              type="button"
              onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
              className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Sliders size={13} className="text-cyan-400" />
              <span>O‘lcham va masshtab sozlamalari (Ixtiyoriy)</span>
              <span className="text-[10px] text-slate-400">({scaleMultiplier}x)</span>
            </button>

            {showAdvancedOptions && (
              <div className="mt-2.5 p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-300">
                    Model masshtab ko‘paytuvchisi:
                  </span>
                  <div className="flex items-center gap-1">
                    {[
                      { label: "1x Asl", val: 1.0 },
                      { label: "0.001x (mm→m)", val: 0.001 },
                      { label: "1000x (m→mm)", val: 1000 },
                      { label: "0.5x", val: 0.5 },
                      { label: "2x", val: 2.0 },
                    ].map((btn) => (
                      <button
                        key={btn.label}
                        type="button"
                        onClick={() => setScaleMultiplier(btn.val)}
                        className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                          scaleMultiplier === btn.val
                            ? "bg-cyan-900 border-cyan-500 text-white font-bold"
                            : "bg-slate-900 border-slate-700 text-slate-400 hover:text-white"
                        }`}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <input
                    type="range"
                    min="0.1"
                    max="5.0"
                    step="0.1"
                    value={scaleMultiplier > 5 ? 5 : scaleMultiplier < 0.1 ? 0.1 : scaleMultiplier}
                    onChange={(e) => setScaleMultiplier(parseFloat(e.target.value))}
                    className="flex-1 accent-cyan-500 cursor-pointer"
                  />
                  <input
                    type="number"
                    step="any"
                    value={scaleMultiplier}
                    onChange={(e) => setScaleMultiplier(parseFloat(e.target.value) || 1.0)}
                    className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-right text-white font-mono text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="bg-rose-950/80 border border-rose-800 rounded-xl p-3 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/90">
          <div className="text-[11px] text-slate-400">
            {activeSourceTab === "file" && selectedFile && (
              <span>Tanlandi: <strong className="text-white">{selectedFile.name}</strong></span>
            )}
            {activeSourceTab === "preset" && (
              <span>Tanlangan model: <strong className="text-cyan-300">{PRESET_3D_MODELS.find(p => p.assetKey === selectedPresetKey)?.name}</strong></span>
            )}
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-medium transition-colors cursor-pointer"
            >
              Bekor qilish
            </button>
            <button
              type="button"
              id="btn-apply-selected-model"
              onClick={handleApply}
              disabled={
                isLoading ||
                (activeSourceTab === "file" && !selectedFile) ||
                (activeSourceTab === "url" && !modelUrl.trim())
              }
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 disabled:pointer-events-none text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-cyan-950/50 transition-all cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Model o‘rnatilmoqda...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={15} />
                  <span>Modelni Qo‘llash va Ko‘rsatish</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
