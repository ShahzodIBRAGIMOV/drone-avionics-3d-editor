import React, { useState } from "react";
import {
  Search,
  Plus,
  CheckCircle2,
  AlertCircle,
  Package,
  Layers,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Globe,
  RefreshCw,
  Box,
} from "lucide-react";
import { ComponentManifestItem, PhysicalInstance } from "../types";

interface UnplacedInventoryPanelProps {
  manifest: ComponentManifestItem[];
  instances: PhysicalInstance[];
  onPlaceInstance: (instanceId: string) => void;
  onSelectInstance: (instanceId: string, isShift?: boolean) => void;
  selectedInstanceId: string | null;
  selectedInstanceIds?: string[];
  loadingAssetErrors: Map<string, string>;
  onAutoPlaceAll?: () => void;
  onCollapse?: () => void;
  onOpenModelImport?: (defaultComponentId?: string) => void;
  onReloadJetson?: () => void;
  isReloadingJetson?: boolean;
}

export const UnplacedInventoryPanel: React.FC<UnplacedInventoryPanelProps> = ({
  manifest,
  instances,
  onPlaceInstance,
  onSelectInstance,
  selectedInstanceId,
  selectedInstanceIds = [],
  loadingAssetErrors,
  onAutoPlaceAll,
  onCollapse,
  onOpenModelImport,
  onReloadJetson,
  isReloadingJetson,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "unplaced" | "placed">("all");
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (componentId: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [componentId]: !prev[componentId],
    }));
  };

  const filteredManifest = manifest.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.component.toLowerCase().includes(q) ||
      item.id.toLowerCase().includes(q) ||
      (item.notes && item.notes.toLowerCase().includes(q))
    );
  });

  const getInstancesForComponent = (componentId: string) => {
    return instances.filter((inst) => inst.componentId === componentId);
  };

  const unplacedCount = instances.filter((i) => !i.placed).length;
  const placedCount = instances.filter((i) => i.placed).length;

  return (
    <aside className="inventory-panel" id="unplaced-inventory-sidebar">
      <div className="panel-header">
        <div className="panel-title-row">
          <div className="panel-title-with-icon">
            <Package size={17} className="text-cyan" />
            <h2>Komponentlar Inventari</h2>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span className="badge-counter">{instances.length} dona</span>
            {onCollapse && (
              <button
                type="button"
                className="panel-collapse-btn"
                onClick={onCollapse}
                title="Inventar panelini yig‘ish (yashirish)"
              >
                <ChevronLeft size={16} />
              </button>
            )}
          </div>
        </div>
        <p className="panel-subtitle">
          Tasdiqlangan {manifest.length} turdagi komponent va {instances.length} dona fizik obyekt.
        </p>

        {/* 3D Model Picker & Import Button */}
        {onOpenModelImport && (
          <button
            type="button"
            id="btn-open-github-model-import"
            onClick={() => onOpenModelImport()}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 mb-2 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-700/60 text-cyan-300 hover:text-white text-xs font-semibold transition-all shadow-sm cursor-pointer"
            title="Istalgan 3D modelni (.glb, .stl, .obj) tanlash, kompyuterdan yuklash yoki kutubxonadan biriktirish"
          >
            <Box size={14} className="text-cyan-400" />
            <span>3D Model tanlash va yuklash</span>
          </button>
        )}

        {/* Filter / Search */}
        <div className="search-box">
          <Search size={14} className="search-icon" />
          <input
            id="input-inventory-search"
            type="text"
            placeholder="Komponent nomini qidirish..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="tab-pills-row">
          <button
            id="tab-filter-all"
            className={`tab-pill ${filterMode === "all" ? "active" : ""}`}
            onClick={() => setFilterMode("all")}
          >
            Barchasi ({instances.length})
          </button>
          <button
            id="tab-filter-unplaced"
            className={`tab-pill ${filterMode === "unplaced" ? "active" : ""}`}
            onClick={() => setFilterMode("unplaced")}
          >
            Kutilmoqda ({unplacedCount})
          </button>
          <button
            id="tab-filter-placed"
            className={`tab-pill ${filterMode === "placed" ? "active" : ""}`}
            onClick={() => setFilterMode("placed")}
          >
            Sahnada ({placedCount})
          </button>
        </div>

        {onAutoPlaceAll && (
          <button
            id="btn-sidebar-auto-place-all"
            className="auto-place-all-action-btn"
            onClick={onAutoPlaceAll}
            title="Barcha 32 ta avionika elementini dron ichiga muhandislik chizmasi bo‘yicha avtomatik joylashtirish"
          >
            <Sparkles size={15} className="auto-place-btn-icon text-cyan-400 shrink-0" />
            <div className="auto-place-btn-text">
              <span className="auto-place-btn-title">Avtomatik joylashtirish</span>
              <span className="auto-place-btn-sub">Barcha 32 ta elementni sahnaga o‘rnatish</span>
            </div>
            <span className="auto-place-badge">
              {unplacedCount > 0 ? `${unplacedCount} ta qoldi` : "32/32"}
            </span>
          </button>
        )}
      </div>

      <div className="inventory-list-scroll">
        {filteredManifest.map((item) => {
          const compInstances = getInstancesForComponent(item.id);
          const filteredCompInstances = compInstances.filter((inst) => {
            if (filterMode === "unplaced") return !inst.placed;
            if (filterMode === "placed") return inst.placed;
            return true;
          });

          if (filterMode !== "all" && filteredCompInstances.length === 0) {
            return null;
          }

          const isCollapsed = !!collapsedGroups[item.id];
          const placedInGroup = compInstances.filter((i) => i.placed).length;
          const isFullyPlaced = placedInGroup === compInstances.length;
          const hasError = item.id === "19" && loadingAssetErrors.has("jetson-p3737");

          return (
            <div
              key={item.id}
              className={`component-group-card ${isFullyPlaced ? "all-placed" : ""}`}
              id={`inventory-group-${item.id}`}
            >
              <div className="group-header" onClick={() => toggleGroup(item.id)}>
                <button className="collapse-btn">
                  {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                </button>

                <div className="group-info">
                  <div className="group-title-line">
                    <span className="component-id-tag">#{item.id}</span>
                    <span className="component-name">{item.component}</span>
                  </div>
                  {item.notes && <span className="component-notes">{item.notes}</span>}
                </div>

                <div className="group-status-tag flex items-center gap-1.5">
                  {onOpenModelImport && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenModelImport(item.id);
                      }}
                      className="px-2 py-0.5 text-[10px] font-medium rounded bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 border border-slate-700/70 flex items-center gap-1 transition-all cursor-pointer"
                      title={`#${item.id} uchun 3D modelni almashtirish yoki yuklash`}
                    >
                      <Box size={11} className="text-cyan-400" />
                      <span>Model</span>
                    </button>
                  )}
                  {item.id === "19" && onReloadJetson && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onReloadJetson();
                      }}
                      className="px-2 py-0.5 text-[11px] font-medium rounded bg-cyan-950/70 hover:bg-cyan-900/90 text-cyan-300 hover:text-cyan-100 border border-cyan-700/60 flex items-center gap-1 transition-all shadow-sm"
                      title="Jetson 3D modelini xotiradan tozalab, yangidan yuklash"
                    >
                      <RefreshCw size={11} className={isReloadingJetson ? "animate-spin" : ""} />
                      <span>Yangidan yukla</span>
                    </button>
                  )}
                  {hasError ? (
                    <span className="status-badge error" title="Model yuklanmadi">
                      <AlertCircle size={11} /> Xato
                    </span>
                  ) : isFullyPlaced ? (
                    <span className="status-badge success">
                      <CheckCircle2 size={11} /> {placedInGroup}/{compInstances.length}
                    </span>
                  ) : (
                    <span className="status-badge neutral">
                      {placedInGroup}/{compInstances.length}
                    </span>
                  )}
                </div>
              </div>

              {!isCollapsed && (
                <div className="group-instances-list">
                  {filteredCompInstances.map((inst) => {
                    const isSelected =
                      selectedInstanceIds.includes(inst.instanceId) ||
                      selectedInstanceId === inst.instanceId;
                    return (
                      <div
                        key={inst.instanceId}
                        id={`instance-row-${inst.instanceId}`}
                        className={`instance-row ${inst.placed ? "placed" : "unplaced"} ${
                          isSelected ? "selected" : ""
                        }`}
                        onClick={(e) => {
                          if (inst.placed) {
                            onSelectInstance(inst.instanceId, e.shiftKey);
                          }
                        }}
                      >
                        <div className="instance-details">
                          <div className="instance-name-row">
                            {inst.customColor && (
                              <span
                                className="instance-color-dot"
                                style={{ backgroundColor: inst.customColor }}
                                title={`Tanlangan rang: ${inst.customColor}`}
                              />
                            )}
                            <span className="instance-label">
                              {inst.customLabel || `${item.component} #${inst.instanceIndex}`}
                            </span>
                            {inst.attachedToDrone && (
                              <span
                                className="text-[10px] text-cyan-400 font-mono ml-1 px-1 py-0.2 bg-cyan-950/60 border border-cyan-800/60 rounded"
                                title="Dronga biriktirilgan (Dron bilan birga harakatlanadi)"
                              >
                                🔗 Dron
                              </span>
                            )}
                          </div>
                          <span className="instance-coord">
                            {inst.placed ? (
                              `X:${Math.round(inst.position[0])} Y:${Math.round(
                                inst.position[1]
                              )} Z:${Math.round(inst.position[2])} mm`
                            ) : (
                              <span className="unplaced-hint">Joylashtirilmagan</span>
                            )}
                          </span>
                        </div>

                        <div className="instance-actions">
                          {inst.placed ? (
                            <button
                              id={`btn-select-inst-${inst.instanceId}`}
                              className={`btn-row-action ${isSelected ? "active" : ""}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectInstance(inst.instanceId, e.shiftKey);
                              }}
                              title="Sahnada tanlash (Shift bilan ko‘p tanlash)"
                            >
                              {isSelected ? "Tanlangan" : "Tanlash"}
                            </button>
                          ) : (
                            <button
                              id={`btn-place-inst-${inst.instanceId}`}
                              className="btn-place-to-scene"
                              onClick={(e) => {
                                e.stopPropagation();
                                onPlaceInstance(inst.instanceId);
                              }}
                              title="Sahnaga qo‘shish"
                            >
                              <Plus size={13} />
                              <span>Sahnaga</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
};
