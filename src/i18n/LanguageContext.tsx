import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { AppLanguage, translations } from "./translations";
import { Globe, ChevronDown, Check } from "lucide-react";

export interface LanguageInfo {
  code: AppLanguage;
  label: string;
  nativeLabel: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  { code: "uz", label: "UZ", nativeLabel: "O‘zbekcha", flag: "🇺🇿" },
  { code: "tr", label: "TR", nativeLabel: "Türkçe", flag: "🇹🇷" },
  { code: "en", label: "EN", nativeLabel: "English", flag: "🇬🇧" },
];

interface LanguageContextType {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

const STORAGE_KEY = "drone_avionics_language";

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<AppLanguage>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as AppLanguage | null;
      if (saved && (saved === "uz" || saved === "tr" || saved === "en")) {
        return saved;
      }
    } catch (e) {
      // ignore
    }
    return "uz";
  });

  const setLanguage = (lang: AppLanguage) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (e) {
      // ignore
    }
  };

  const t = (key: string, params?: Record<string, string | number>): string => {
    const langDict = translations[language] || translations.uz;
    let text = langDict[key] || translations.uz[key] || key;

    if (params) {
      Object.entries(params).forEach(([paramKey, paramVal]) => {
        text = text.replace(new RegExp(`\\{${paramKey}\\}`, "g"), String(paramVal));
      });
    }

    return text;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    // Fallback if rendered outside provider
    return {
      language: "uz",
      setLanguage: () => {},
      t: (key: string) => translations.uz[key] || key,
    };
  }
  return context;
};

interface LanguageSelectorProps {
  variant?: "header" | "pill" | "menu";
  className?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  variant = "header",
  className = "",
}) => {
  const { language, setLanguage, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentLang = SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  if (variant === "pill") {
    return (
      <div
        className={`inline-flex items-center bg-slate-900/90 border border-slate-700/80 rounded-lg p-0.5 shadow-sm ${className}`}
        id="language-selector-pill-group"
      >
        {SUPPORTED_LANGUAGES.map((lang) => {
          const isActive = lang.code === language;
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => setLanguage(lang.code)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-semibold transition-all ${
                isActive
                  ? "bg-cyan-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
              title={`${lang.nativeLabel} (${lang.code.toUpperCase()})`}
            >
              <span>{lang.flag}</span>
              <span>{lang.code.toUpperCase()}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative inline-block text-left shrink-0 ${className}`}
      id="language-selector-wrapper"
    >
      <button
        type="button"
        id="btn-language-selector"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`toolbar-btn text-xs gap-1.5 px-2.5 py-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 rounded-lg transition-all flex items-center shadow-sm ${
          isOpen ? "border-cyan-500 ring-1 ring-cyan-500/30 text-white" : ""
        }`}
        title={t("lang.select")}
      >
        <span className="text-sm leading-none">{currentLang.flag}</span>
        <span className="font-bold text-cyan-300">{currentLang.code.toUpperCase()}</span>
        <ChevronDown
          size={12}
          className={`text-slate-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-1 w-44 rounded-xl bg-slate-900/95 backdrop-blur-md border border-slate-700/80 shadow-2xl p-1 z-[9999] animate-in fade-in zoom-in-95 duration-100"
          id="language-dropdown-menu"
        >
          <div className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-400 border-b border-slate-800/80 flex items-center gap-1.5 mb-1">
            <Globe size={12} className="text-cyan-400" />
            <span>{t("lang.select")}</span>
          </div>

          <div className="space-y-0.5">
            {SUPPORTED_LANGUAGES.map((lang) => {
              const isSelected = lang.code === language;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => {
                    setLanguage(lang.code);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-all ${
                    isSelected
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                      : "text-slate-200 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base leading-none">{lang.flag}</span>
                    <div className="flex flex-col text-left">
                      <span className="font-semibold text-xs leading-tight">
                        {lang.nativeLabel}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {lang.code.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  {isSelected && <Check size={14} className="text-cyan-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
