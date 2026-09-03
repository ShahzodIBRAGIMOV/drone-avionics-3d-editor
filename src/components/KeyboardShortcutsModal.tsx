import React, { useState, useEffect } from "react";
import {
  Keyboard,
  X,
  Search,
  RotateCcw,
  RotateCw,
  Copy,
  ClipboardPaste,
  Trash2,
  Move,
  Maximize2,
  Eye,
  Lock,
  Focus,
  Save,
  Layers,
  Sparkles,
  Command,
} from "lucide-react";

interface ShortcutItem {
  id: string;
  category: "edit" | "transform" | "camera" | "actions";
  keys: string[];
  title: string;
  description: string;
}

const SHORTCUT_LIST: ShortcutItem[] = [
  // Edit & History
  {
    id: "undo",
    category: "edit",
    keys: ["Ctrl", "Z"],
    title: "Orqaga qaytarish (Undo)",
    description: "Oxirgi bajarilgan amalni (ko‘chirish, aylantirish, o‘chirish va boshqalar) bekor qilish",
  },
  {
    id: "redo",
    category: "edit",
    keys: ["Ctrl", "Y"],
    title: "Oldinga qaytarish (Redo)",
    description: "Bekor qilingan amalni qayta tiklash (Shuningdek: Ctrl + Shift + Z)",
  },
  {
    id: "copy",
    category: "edit",
    keys: ["Ctrl", "C"],
    title: "Nusxa olish (Copy)",
    description: "Tanlangan barcha avionika komponentlarini xotiraga nusxalash",
  },
  {
    id: "paste",
    category: "edit",
    keys: ["Ctrl", "V"],
    title: "Joylashtirish (Paste)",
    description: "Xotiradagi nusxalarni sahnaga yangi unikal ID bilan joylashtirish",
  },
  {
    id: "duplicate",
    category: "edit",
    keys: ["Ctrl", "D"],
    title: "Tezkor dublikat (Duplicate)",
    description: "Tanlangan elementlarni bir bosishda nusxalab, darhol yoniga joylashtirish",
  },
  {
    id: "select-all",
    category: "edit",
    keys: ["Ctrl", "A"],
    title: "Barchasini tanlash (Select All)",
    description: "Sahnada joylashgan barcha 32 ta avionika elementlarini birdaniga tanlash",
  },
  {
    id: "delete",
    category: "edit",
    keys: ["Del"],
    title: "Sahnadan o‘chirish (Delete)",
    description: "Tanlangan elementlarni sahnadan olib tashlash va kabellarini uzish (yoki Backspace)",
  },
  {
    id: "deselect",
    category: "edit",
    keys: ["Esc"],
    title: "Tanlovni bekor qilish (Deselect)",
    description: "Barcha tanlovlarni tozalash yoki ochiq modallarni yopish",
  },

  // Transform
  {
    id: "mode-translate",
    category: "transform",
    keys: ["W"],
    title: "Ko‘chirish rejimi (Translate)",
    description: "3D gizmoni X, Y, Z o‘qlari bo‘yicha ko‘chirish rejimiga o‘tkazish",
  },
  {
    id: "mode-rotate",
    category: "transform",
    keys: ["E"],
    title: "Aylantirish rejimi (Rotate)",
    description: "3D gizmoni Pitch, Yaw, Roll burchaklari bo‘yicha aylantirish rejimiga o‘tkazish",
  },
  {
    id: "mode-scale",
    category: "transform",
    keys: ["R"],
    title: "Masshtablash rejimi (Scale)",
    description: "3D gizmoni o‘lchamlarni masshtablash rejimiga o‘tkazish",
  },
  {
    id: "toggle-space",
    category: "transform",
    keys: ["Q"],
    title: "Koordinata tizimi (World / Local)",
    description: "Dunyo (World) va Lokal (Local) koordinata tizimini tezkor almashtirish",
  },
  {
    id: "flip-h",
    category: "transform",
    keys: ["H"],
    title: "Gorizontal 180° Flip (Yaw)",
    description: "Tanlangan elementni gorizontal 180° ga burish (oldi va orqani almashtirish)",
  },
  {
    id: "flip-v",
    category: "transform",
    keys: ["Shift", "V"],
    title: "Vertikal 180° Flip (Pitch)",
    description: "Tanlangan elementni vertikal 180° ga ag‘darish (usti va ostini to‘nkarish)",
  },

  // Camera & Navigation
  {
    id: "focus",
    category: "camera",
    keys: ["F"],
    title: "Elementga fokuslash (Focus / Frame)",
    description: "Kamerani tanlangan komponent markaziga qaratish va yaqinlashtirish",
  },
  {
    id: "multi-select",
    category: "camera",
    keys: ["Shift", "Click"],
    title: "Ko‘p tanlov (Multi-selection)",
    description: "Bir vaqtning o‘zida bir nechta komponent yoki pinlarni tanlash",
  },
  {
    id: "orbit",
    category: "camera",
    keys: ["LKM"],
    title: "Kamerani aylantirish (Orbit)",
    description: "Sichqonchaning chap tugmasini bosib sahnada kamerani erkin aylantirish",
  },
  {
    id: "pan",
    category: "camera",
    keys: ["PKM"],
    title: "Kamerani surish (Pan)",
    description: "O‘ng tugma yoki g‘ildirakni bosib turib sahna markazini siljitish",
  },
  {
    id: "zoom",
    category: "camera",
    keys: ["G‘ildirak"],
    title: "Masshtab (Zoom)",
    description: "Sichqoncha g‘ildiragini aylantirib yaqinlashtirish yoki uzoqlashtirish",
  },

  // Actions
  {
    id: "lock-toggle",
    category: "actions",
    keys: ["L"],
    title: "Qulflash / Ochish (Lock / Unlock)",
    description: "Tanlangan komponentni tasodifiy surilishdan qulflash yoki ochish",
  },
  {
    id: "vis-toggle",
    category: "actions",
    keys: ["V"],
    title: "Ko‘rsatish / Yashirish (Visibility)",
    description: "Tanlangan komponentning 3D sahnadagi ko‘rinishini yoqish/o‘chirish",
  },
  {
    id: "save-project",
    category: "actions",
    keys: ["Ctrl", "S"],
    title: "Loyihani saqlash (Quick Save)",
    description: "Hozirgi barcha koordinata va ulanishlarni JSON faylga eksport qilish",
  },
  {
    id: "help-toggle",
    category: "actions",
    keys: ["?"],
    title: "Qisqa tugmalar oynasi (Help)",
    description: "Ushbu klaviatura yordam oynasini ochish yoki yopish (shuningdek: F1)",
  },
];

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
      setSelectedCategory("all");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const categories = [
    { id: "all", label: "Barchasi" },
    { id: "edit", label: "Tarix va Tahrir (Undo/Redo)" },
    { id: "transform", label: "3D Transformatsiya" },
    { id: "camera", label: "Kamera va Tanlov" },
    { id: "actions", label: "Tezkor Amallar" },
  ];

  const filteredShortcuts = SHORTCUT_LIST.filter((item) => {
    const matchesCategory =
      selectedCategory === "all" || item.category === selectedCategory;
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      query === "" ||
      item.title.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query) ||
      item.keys.some((k) => k.toLowerCase().includes(query));
    return matchesCategory && matchesSearch;
  });

  return (
    <div
      id="keyboard-shortcuts-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        id="keyboard-shortcuts-modal-card"
        className="bg-slate-900/95 border border-slate-700/90 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-cyan-950/80 border border-cyan-500/40 rounded-xl text-cyan-400">
              <Keyboard size={20} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <span>Klaviatura Tezkor Tugmalari</span>
                <span className="text-[10px] text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded-full border border-cyan-800 font-mono">
                  Shortcuts
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Loyiha bilan tezkor va qulay muhandislik ishlari uchun
              </p>
            </div>
          </div>
          <button
            id="btn-close-shortcuts-modal"
            type="button"
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            onClick={onClose}
            title="Yopish (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search & Category Filter */}
        <div className="p-3 border-b border-slate-800/80 bg-slate-900/60 space-y-2.5">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              id="input-search-shortcuts"
              type="text"
              placeholder="Qidirish (masalan: Ctrl+Z, Flip, O‘chirish, W, F)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950/80 border border-slate-700/80 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                onClick={() => setSearchQuery("")}
              >
                ✕
              </button>
            )}
          </div>

          {/* Categories */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-thin">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`px-2.5 py-1 rounded-md text-[11px] whitespace-nowrap transition-colors font-medium ${
                  selectedCategory === cat.id
                    ? "bg-cyan-600 text-white shadow-sm"
                    : "bg-slate-800/80 text-slate-300 hover:bg-slate-700/80 hover:text-white"
                }`}
                onClick={() => setSelectedCategory(cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Shortcuts List */}
        <div className="p-4 overflow-y-auto space-y-2 max-h-[50vh] scrollbar-thin">
          {filteredShortcuts.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              Qidiruv bo‘yicha hech qanday tugma topilmadi.
            </div>
          ) : (
            filteredShortcuts.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/50 hover:bg-slate-800/60 border border-slate-800/70 transition-colors gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-xs text-slate-200 flex items-center gap-2">
                    <span>{item.title}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                    {item.description}
                  </div>
                </div>

                {/* Key badges */}
                <div className="flex items-center gap-1 shrink-0">
                  {item.keys.map((k, idx) => (
                    <React.Fragment key={idx}>
                      {idx > 0 && <span className="text-slate-600 text-[10px] font-bold">+</span>}
                      <kbd className="min-w-[26px] h-6 px-1.5 flex items-center justify-center bg-slate-800 border border-slate-700 text-slate-200 rounded text-[11px] font-mono font-semibold shadow-inner">
                        {k}
                      </kbd>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5 text-[11px]">
            <Sparkles size={13} className="text-cyan-400" />
            <span>Klaviatura orqali har qanday vaqtda <kbd className="bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded text-[10px] text-slate-200">?</kbd> tugmasini bosing</span>
          </span>
          <button
            id="btn-close-shortcuts-bottom"
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg font-medium transition-colors cursor-pointer text-xs"
          >
            Yopish
          </button>
        </div>
      </div>
    </div>
  );
};
