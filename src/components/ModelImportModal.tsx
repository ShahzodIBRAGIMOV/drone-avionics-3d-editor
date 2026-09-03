import React, { useState } from "react";
import {
  Upload,
  Globe,
  CheckCircle2,
  AlertCircle,
  X,
  FileCode,
  Radio,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { ComponentManifestItem } from "../types";
import { modelManager } from "../services/modelManager";

interface ModelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  manifest: ComponentManifestItem[];
  defaultComponentId?: string;
  onSuccess: (componentId: string, message: string) => void;
}

export const ModelImportModal: React.FC<ModelImportModalProps> = ({
  isOpen,
  onClose,
  manifest,
  defaultComponentId = "21",
  onSuccess,
}) => {
  const [targetComponentId, setTargetComponentId] = useState<string>(defaultComponentId);
  const [githubUrl, setGithubUrl] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setErrorMsg(null);
    }
  };

  const handleImport = async () => {
    setErrorMsg(null);
    setIsLoading(true);

    try {
      if (githubUrl.trim()) {
        await modelManager.loadCustomModelFromUrl(targetComponentId, githubUrl.trim());
        const comp = manifest.find((m) => m.id === targetComponentId);
        onSuccess(
          targetComponentId,
          `"${comp?.component || targetComponentId}" 3D modeli GitHub/URL manzilidan muvaffaqiyatli yuklandi!`
        );
        onClose();
      } else if (selectedFile) {
        const arrayBuffer = await selectedFile.arrayBuffer();
        const lowerName = selectedFile.name.toLowerCase();
        let format: "obj" | "stl" | "glb" | "gltf" = "obj";
        if (lowerName.endsWith(".stl")) format = "stl";
        else if (lowerName.endsWith(".glb")) format = "glb";
        else if (lowerName.endsWith(".gltf")) format = "gltf";

        await modelManager.loadCustomModel(targetComponentId, arrayBuffer, format);
        const comp = manifest.find((m) => m.id === targetComponentId);
        onSuccess(
          targetComponentId,
          `"${comp?.component || targetComponentId}" 3D modeli fayldan (${selectedFile.name}) muvaffaqiyatli yuklandi!`
        );
        onClose();
      } else {
        setErrorMsg("Iltimos, GitHub havola manzilini kiriting yoki 3D faylni tanlang (.obj, .stl, .glb)");
      }
    } catch (err: any) {
      console.error("Model import error:", err);
      setErrorMsg(err.message || "Modelni yuklashda xatolik yuz berdi");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      id="modal-github-model-import"
    >
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <Globe size={20} className="text-cyan-400" />
            <div>
              <h3 className="text-sm font-bold text-white leading-none">
                GitHub / URL dan 3D Model Yuklash
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">
                GitHub omboridan yoki fayldan to‘g‘ridan-to‘g‘ri model import qilish
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex flex-col gap-4 text-xs">
          {/* Target Component Selector */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Radio size={13} className="text-cyan-400" />
              <span>Model qaysi komponentga biriktirilsin:</span>
            </label>
            <select
              value={targetComponentId}
              onChange={(e) => setTargetComponentId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-cyan-500 transition-colors"
            >
              {manifest.map((item) => (
                <option key={item.id} value={item.id}>
                  #{item.id} — {item.component} ({item.quantity} dona)
                </option>
              ))}
            </select>
          </div>

          {/* GitHub / Web URL input */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3">
            <label className="block text-[11px] font-semibold text-cyan-300 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Globe size={13} />
                <span>1-variant: GitHub yoki to‘g‘ridan-to‘g‘ri URL havola</span>
              </span>
              <span className="text-[10px] text-slate-400">.obj, .stl, .glb</span>
            </label>
            <input
              type="text"
              placeholder="https://github.com/user/repo/blob/main/Foldable_omni_antenna.obj"
              value={githubUrl}
              onChange={(e) => {
                setGithubUrl(e.target.value);
                if (e.target.value) setSelectedFile(null);
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white font-mono text-xs outline-none focus:border-cyan-500 mt-1"
            />
            <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
              GitHub havolalari avtomatik tarzda Raw havolaga aylantiriladi.
            </p>
          </div>

          <div className="flex items-center justify-center gap-3">
            <div className="h-px bg-slate-800 flex-1" />
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">YOKI</span>
            <div className="h-px bg-slate-800 flex-1" />
          </div>

          {/* Local File upload */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3">
            <label className="block text-[11px] font-semibold text-emerald-300 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Upload size={13} />
                <span>2-variant: Kompyuterdan 3D faylni tanlash</span>
              </span>
              <span className="text-[10px] text-slate-400">Drag & drop</span>
            </label>
            <input
              type="file"
              accept=".obj,.stl,.glb,.gltf"
              onChange={handleFileChange}
              className="w-full text-[11px] text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-[11px] file:font-medium file:bg-cyan-950 file:text-cyan-300 hover:file:bg-cyan-900 cursor-pointer mt-1"
            />
            {selectedFile && (
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 mt-2">
                <CheckCircle2 size={13} />
                <span>Tanlandi: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</span>
              </div>
            )}
          </div>

          {/* Error display */}
          {errorMsg && (
            <div className="bg-rose-950/80 border border-rose-800/80 rounded-lg p-3 text-rose-300 text-[11px] flex items-start gap-2">
              <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-slate-800 bg-slate-950/80">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-3.5 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs transition-colors cursor-pointer"
          >
            Bekor qilish
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={isLoading || (!githubUrl.trim() && !selectedFile)}
            className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:pointer-events-none text-white font-medium text-xs flex items-center gap-1.5 shadow-lg shadow-cyan-950 transition-all cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Yuklanmoqda...</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={14} />
                <span>Yuklash va Qo‘llash</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
