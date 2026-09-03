import React, { useState, useEffect } from "react";
import {
  Cloud,
  CloudUpload,
  CloudDownload,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  FolderOpen,
  Trash2,
  X,
  Laptop,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { CloudProjectData, CloudProjectSummary } from "../types";
import { listCloudProjects, deleteCloudProject, generateCloudCode } from "../services/cloudProjectService";

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProject: CloudProjectData | null;
  onSaveToCloud: (name: string, customCode?: string) => Promise<CloudProjectData>;
  onLoadProject: (project: CloudProjectData) => void;
  isSaving: boolean;
  lastSavedAt: string | null;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
  isOpen,
  onClose,
  currentProject,
  onSaveToCloud,
  onLoadProject,
  isSaving,
  lastSavedAt,
}) => {
  const [activeTab, setActiveTab] = useState<"save" | "load" | "list">("save");
  const [projectName, setProjectName] = useState(currentProject?.name || "3.5M Twin-Motor UAV Avionics");
  const [cloudCodeInput, setCloudCodeInput] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [loadErrorMsg, setLoadErrorMsg] = useState<string | null>(null);
  const [isLoadingCode, setIsLoadingCode] = useState(false);

  // Projects list
  const [projectsList, setProjectsList] = useState<CloudProjectSummary[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSaveSuccessMsg(null);
      setLoadErrorMsg(null);
      if (activeTab === "list") {
        fetchProjectsList();
      }
    }
  }, [isOpen, activeTab]);

  const fetchProjectsList = async () => {
    setIsLoadingList(true);
    try {
      const items = await listCloudProjects();
      setProjectsList(items);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingList(false);
    }
  };

  if (!isOpen) return null;

  const currentCode = currentProject?.cloudCode || localStorage.getItem("drone_avionics_cloud_code") || "";
  const shareableUrl = currentCode
    ? `${window.location.origin}${window.location.pathname}?cloudCode=${currentCode}`
    : "";

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const saved = await onSaveToCloud(projectName);
      setSaveSuccessMsg(`Muvaffaqiyatli saqlandi! Bulut kodi: ${saved.cloudCode}`);
      setTimeout(() => setSaveSuccessMsg(null), 5000);
    } catch (err: any) {
      // Handled in parent
    }
  };

  const handleCopyCode = () => {
    if (!currentCode) return;
    navigator.clipboard.writeText(currentCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    if (!shareableUrl) return;
    navigator.clipboard.writeText(shareableUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleLoadByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cloudCodeInput.trim()) return;

    setIsLoadingCode(true);
    setLoadErrorMsg(null);
    try {
      const { loadProjectFromCloud } = await import("../services/cloudProjectService");
      const found = await loadProjectFromCloud(cloudCodeInput.trim());
      if (found) {
        onLoadProject(found);
        onClose();
      } else {
        setLoadErrorMsg(`"${cloudCodeInput.toUpperCase()}" kodi bo‘yicha loyiha topilmadi. Kodni tekshiring.`);
      }
    } catch (err: any) {
      setLoadErrorMsg("Loyihani yuklashda xatolik yuz berdi: " + (err.message || String(err)));
    } finally {
      setIsLoadingCode(false);
    }
  };

  const handleLoadProjectFromList = async (summary: CloudProjectSummary) => {
    setIsLoadingList(true);
    try {
      const { loadProjectFromCloud } = await import("../services/cloudProjectService");
      const found = await loadProjectFromCloud(summary.id);
      if (found) {
        onLoadProject(found);
        onClose();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingList(false);
    }
  };

  const handleDeleteFromList = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Haqiqatan ham ushbu loyihani bulutdan o‘chirmoqchimisiz?")) return;
    try {
      await deleteCloudProject(id);
      setProjectsList((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Cloud size={20} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100">
                Bulutli Sinxronizatsiya (Firebase)
              </h2>
              <p className="text-xs text-slate-400">
                Loyihani saqlash va boshqa kompyuter yoki brauzerda davom ettirish
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-6 pt-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("save")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium rounded-t-lg transition-colors border-b-2 ${
              activeTab === "save"
                ? "border-sky-500 text-sky-400 bg-slate-900"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <CloudUpload size={14} />
            <span>Bulutga Saqlash</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("load")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium rounded-t-lg transition-colors border-b-2 ${
              activeTab === "load"
                ? "border-sky-500 text-sky-400 bg-slate-900"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <CloudDownload size={14} />
            <span>Kod orqali ochish</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("list")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium rounded-t-lg transition-colors border-b-2 ${
              activeTab === "list"
                ? "border-sky-500 text-sky-400 bg-slate-900"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <FolderOpen size={14} />
            <span>Saqlangan loyihalar</span>
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* TAB 1: SAVE */}
          {activeTab === "save" && (
            <div className="space-y-4">
              <div className="bg-emerald-950/30 border border-emerald-800/40 rounded-xl p-3 flex items-start gap-2.5">
                <CheckCircle2 className="text-emerald-400 shrink-0 mt-0.5" size={16} />
                <div className="text-xs text-emerald-200/90 leading-relaxed">
                  <strong>Avtomatik saqlash faol:</strong> Sahnadagi har bir o‘zgartirish (harakatlantirish, aylantirish, kabel ulash va amallar tarixi) avtomatik tarzda saqlanadi. Dasturni qayta ochganingizda barcha amallaringiz tiklanadi.
                </div>
              </div>

              <div className="bg-sky-950/30 border border-sky-800/40 rounded-xl p-3.5 flex items-start gap-3">
                <Laptop className="text-sky-400 shrink-0 mt-0.5" size={18} />
                <div className="text-xs text-sky-200/90 leading-relaxed">
                  <strong>Boshqa kompyuter yoki brauzerda ochish:</strong> Loyihani hozir saqlang. Hosil bo‘lgan <strong>Bulut Kodini</strong> boshqa brauzerga kirib "Kod orqali ochish" bo‘limiga yozing yoki to‘g‘ridan-to‘g‘ri havolani oching!
                </div>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Loyiha nomi
                  </label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    required
                    placeholder="Masalan: 3.5M Twin-Motor UAV Avionics"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="text-xs text-slate-400">
                    {lastSavedAt ? (
                      <span>So‘nggi saqlanish: {new Date(lastSavedAt).toLocaleTimeString()}</span>
                    ) : (
                      <span>Hali bulutga saqlanmagan</span>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex items-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-sky-600/20 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isSaving ? <RefreshCw className="animate-spin" size={15} /> : <CloudUpload size={15} />}
                    <span>{isSaving ? "Saqlanmoqda..." : "Bulutga Saqlash"}</span>
                  </button>
                </div>
              </form>

              {saveSuccessMsg && (
                <div className="flex items-center gap-2 p-3 bg-emerald-950/40 border border-emerald-700/50 rounded-xl text-xs text-emerald-300 animate-fade-in">
                  <CheckCircle2 size={16} />
                  <span>{saveSuccessMsg}</span>
                </div>
              )}

              {/* Share Code & Link Box if available */}
              {currentCode && (
                <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
                  <span className="text-xs font-semibold text-slate-300 block">
                    Ulashish va boshqa qurilmada ochish:
                  </span>

                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 flex items-center justify-between">
                      <span className="text-xs text-slate-400">Loyiha Bulut Kodi:</span>
                      <span className="text-sm font-mono font-bold text-sky-400 tracking-wider">
                        {currentCode}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyCode}
                      className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Kodni nusxalash"
                    >
                      {copiedCode ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                      <span>{copiedCode ? "Nusxalandi" : "Nusxalash"}</span>
                    </button>
                  </div>

                  {shareableUrl && (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={shareableUrl}
                        className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300 font-mono truncate"
                      />
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="To‘g‘ridan-to‘g‘ri havolani nusxalash"
                      >
                        {copiedLink ? <Check size={14} className="text-emerald-400" /> : <ExternalLink size={14} />}
                        <span>{copiedLink ? "Nusxalandi" : "Havola"}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: LOAD BY CODE */}
          {activeTab === "load" && (
            <div className="space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed">
                Boshqa kompyuter yoki brauzerda berilgan <strong>Bulut Kodini</strong> (masalan, <code className="text-sky-400 font-mono">DRN-8291</code>) kiriting va loyihani yuklab oling:
              </p>

              <form onSubmit={handleLoadByCode} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Bulut Kodi (Cloud Code)
                  </label>
                  <input
                    type="text"
                    value={cloudCodeInput}
                    onChange={(e) => setCloudCodeInput(e.target.value.toUpperCase())}
                    placeholder="DRN-XXXX"
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-base font-mono tracking-widest text-slate-100 placeholder-slate-600 uppercase focus:outline-none focus:border-sky-500"
                  />
                </div>

                {loadErrorMsg && (
                  <div className="flex items-center gap-2 p-3 bg-rose-950/40 border border-rose-700/50 rounded-xl text-xs text-rose-300 animate-fade-in">
                    <AlertCircle size={16} />
                    <span>{loadErrorMsg}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoadingCode || !cloudCodeInput.trim()}
                  className="w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-sky-600/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isLoadingCode ? <RefreshCw className="animate-spin" size={15} /> : <CloudDownload size={15} />}
                  <span>{isLoadingCode ? "Izlanmoqda va yuklanmoqda..." : "Loyihani Bulutdan Yuklash"}</span>
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: SAVED PROJECTS LIST */}
          {activeTab === "list" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Bulutdagi saqlangan loyihalar:</span>
                <button
                  type="button"
                  onClick={fetchProjectsList}
                  className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw size={12} className={isLoadingList ? "animate-spin" : ""} />
                  <span>Yangilash</span>
                </button>
              </div>

              {isLoadingList ? (
                <div className="py-8 text-center text-xs text-slate-500">Loyihalar yuklanmoqda...</div>
              ) : projectsList.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                  Hozircha saqlangan loyihalar yo‘q. "Bulutga Saqlash" bo‘limidan saqlang.
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {projectsList.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleLoadProjectFromList(item)}
                      className="group flex items-center justify-between p-3 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 rounded-xl transition-colors cursor-pointer"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-200 truncate">
                            {item.name}
                          </span>
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800/50">
                            {item.cloudCode}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-3">
                          <span>{item.placedCount} ta qism</span>
                          <span>•</span>
                          <span>{item.cablesCount} ta kabel</span>
                          <span>•</span>
                          <span>{new Date(item.updatedAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 ml-2">
                        <button
                          type="button"
                          onClick={(e) => handleDeleteFromList(item.id, e)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors"
                          title="O‘chirish"
                        >
                          <Trash2 size={13} />
                        </button>
                        <span className="text-xs text-sky-400 group-hover:translate-x-0.5 transition-transform">
                          →
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
