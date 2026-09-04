import React, { useState } from "react";
import {
  X,
  Link2,
  ArrowRight,
  Cable as CableIcon,
  Layers,
  Palette,
  Check,
  Plus,
  Minus,
  Tag,
} from "lucide-react";
import { PhysicalInstance, CableConnection, PinDefinition } from "../types";
import { COMPONENT_PINS } from "../data/pinDefinitions";
import {
  CABLE_TYPES_CONFIG,
  QUICK_STRAND_COLORS,
  STICKER_BG_COLORS,
  STICKER_STYLES,
  getPresetForCableType,
  getDefaultStrandColors,
  getDefaultStrandLabels,
  generateDefaultStickerLabels,
} from "../data/cablePresets";

interface CableConnectModalProps {
  sourceInstance: PhysicalInstance;
  sourcePin: PinDefinition;
  placedInstances: PhysicalInstance[];
  onConnect: (connection: Omit<CableConnection, "id">) => void;
  onClose: () => void;
}

export const CableConnectModal: React.FC<CableConnectModalProps> = ({
  sourceInstance,
  sourcePin,
  placedInstances,
  onConnect,
  onClose,
}) => {
  const [targetInstanceId, setTargetInstanceId] = useState<string>("");
  const [targetPinFullName, setTargetPinFullName] = useState<string>("");

  // Determine intelligent initial cable type based on source pin
  const initialTypeId = (() => {
    switch (sourcePin.type) {
      case "pwm":
        return "PWM";
      case "uart":
        return "UART";
      case "can":
        return "CAN";
      case "power":
        return "Power";
      case "ethernet":
        return "Ethernet";
      case "pneumatic":
        return "Airspeed";
      default:
        return "PWM";
    }
  })();

  const initialPreset = getPresetForCableType(initialTypeId);

  const [cableType, setCableType] = useState<string>(initialTypeId);
  const [wireGauge, setWireGauge] = useState<string>(initialPreset.defaultGauge);
  const [cableColor, setCableColor] = useState<string>(initialPreset.color);
  const [customName, setCustomName] = useState<string>("");

  // Ribbon / Multi-strand states
  const [isRibbon, setIsRibbon] = useState<boolean>(initialPreset.isRibbonDefault);
  const [strandCount, setStrandCount] = useState<number>(initialPreset.defaultStrands);
  const [strandColors, setStrandColors] = useState<string[]>(
    getDefaultStrandColors(initialTypeId, initialPreset.defaultStrands)
  );
  const [strandLabels, setStrandLabels] = useState<string[]>(
    getDefaultStrandLabels(initialTypeId, initialPreset.defaultStrands)
  );
  const [strandPitchMm, setStrandPitchMm] = useState<number>(2.0);

  // End Stickers / Identification labels states
  const [enableEndStickers, setEnableEndStickers] = useState<boolean>(true);
  const [sourceStickerText, setSourceStickerText] = useState<string>(() => {
    const cleanSrc = (sourceInstance.customLabel || sourceInstance.componentId)
      .replace(/\s+/g, "_")
      .toUpperCase();
    return `${cleanSrc}:${sourcePin.pinId}`;
  });
  const [targetStickerText, setTargetStickerText] = useState<string>("");
  const [stickerBgColor, setStickerBgColor] = useState<string>("#facc15");
  const [stickerTextColor, setStickerTextColor] = useState<string>("#000000");
  const [stickerStyle, setStickerStyle] = useState<"flag" | "heatshrink" | "clip" | "wrap">("flag");
  const [stickerOffsetMm, setStickerOffsetMm] = useState<number>(20);
  const [stickerRotationDeg, setStickerRotationDeg] = useState<number>(0);
  const [stickerSizeMm, setStickerSizeMm] = useState<number>(24);

  const targetInstance = placedInstances.find((i) => i.instanceId === targetInstanceId);
  const targetPins: PinDefinition[] = targetInstance
    ? targetInstance.customPins && targetInstance.customPins.length > 0
      ? targetInstance.customPins
      : COMPONENT_PINS[targetInstance.componentId] || []
    : [];

  const targetPin = targetPins.find((p) => p.fullName === targetPinFullName);

  // Auto-update target sticker when target pin selected
  React.useEffect(() => {
    if (targetInstance && targetPin) {
      const cleanTgt = (targetInstance.customLabel || targetInstance.componentId)
        .replace(/\s+/g, "_")
        .toUpperCase();
      setTargetStickerText(`${cleanTgt}:${targetPin.pinId}`);
    }
  }, [targetInstanceId, targetPinFullName]);

  const currentPreset = getPresetForCableType(cableType);

  const handleTypeSelect = (typeId: string) => {
    setCableType(typeId);
    const preset = getPresetForCableType(typeId);
    setCableColor(preset.color);
    setWireGauge(preset.defaultGauge);
    setIsRibbon(preset.isRibbonDefault);
    setStrandCount(preset.defaultStrands);
    setStrandColors(getDefaultStrandColors(typeId, preset.defaultStrands));
    setStrandLabels(getDefaultStrandLabels(typeId, preset.defaultStrands));
  };

  const handleStrandCountChange = (newCount: number) => {
    const clamped = Math.max(currentPreset.minStrands, Math.min(currentPreset.maxStrands, newCount));
    setStrandCount(clamped);

    const defaultColors = getDefaultStrandColors(cableType, clamped);
    const defaultLabels = getDefaultStrandLabels(cableType, clamped);
    const updatedColors: string[] = [];
    const updatedLabels: string[] = [];

    for (let i = 0; i < clamped; i++) {
      updatedColors.push(strandColors[i] || defaultColors[i]);
      updatedLabels.push(strandLabels[i] || defaultLabels[i]);
    }

    setStrandColors(updatedColors);
    setStrandLabels(updatedLabels);
  };

  const handleUpdateStrandColor = (index: number, newColor: string) => {
    setStrandColors((prev) => {
      const next = [...prev];
      next[index] = newColor;
      return next;
    });
  };

  const handleUpdateStrandLabel = (index: number, newLabel: string) => {
    setStrandLabels((prev) => {
      const next = [...prev];
      next[index] = newLabel;
      return next;
    });
  };

  const handleCreateConnection = () => {
    if (!targetInstanceId || !targetPinFullName) return;

    onConnect({
      name:
        customName.trim() ||
        `${sourceInstance.customLabel} [${sourcePin.pinId}] → ${targetInstance?.customLabel} [${targetPin?.pinId || "port"}]`,
      sourceInstanceId: sourceInstance.instanceId,
      sourcePinName: sourcePin.fullName,
      targetInstanceId,
      targetPinName: targetPinFullName,
      color: isRibbon && strandColors.length > 0 ? strandColors[0] : cableColor,
      cableType,
      wireGauge,
      isRibbon,
      strandCount: isRibbon ? strandCount : 1,
      strandPitchMm: isRibbon ? strandPitchMm : 2.0,
      strandColors: isRibbon ? strandColors.slice(0, strandCount) : [cableColor],
      strandLabels: isRibbon ? strandLabels.slice(0, strandCount) : [sourcePin.label],
      endStickers: enableEndStickers
        ? {
            enabled: true,
            sourceText:
              sourceStickerText.trim() ||
              `${(sourceInstance.customLabel || "SRC").toUpperCase()}:${sourcePin.pinId}`,
            targetText:
              targetStickerText.trim() ||
              `${(targetInstance?.customLabel || "TGT").toUpperCase()}:${targetPin?.pinId || "PORT"}`,
            bgColor: stickerBgColor,
            textColor: stickerTextColor,
            style: stickerStyle,
            offsetFromEndMm: stickerOffsetMm,
            rotationDeg: stickerRotationDeg,
            sizeMm: stickerSizeMm,
          }
        : {
            enabled: false,
          },
    });

    onClose();
  };

  // Generate numbers array for quick strand selection
  const availableCounts: number[] = [];
  for (let c = currentPreset.minStrands; c <= currentPreset.maxStrands; c++) {
    availableCounts.push(c);
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-dialog cable-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "620px", width: "95%", maxHeight: "90vh", display: "flex", flexDirection: "column" }}
      >
        <div className="modal-header">
          <div className="modal-title-row">
            <Link2 className="text-cyan" size={18} />
            <div>
              <h3 style={{ margin: 0 }}>Kabel Ulanishini O‘rnatish</h3>
              <p style={{ margin: 0, fontSize: "11px", color: "#94a3b8" }}>
                Komponentlar o‘rtasida elektr yoki signal marshrutini (jumladan lentali kabelni) o‘tkazish
              </p>
            </div>
          </div>
          <button className="btn-close-modal" onClick={onClose} title="Yopish">
            <X size={16} />
          </button>
        </div>

        <div
          className="modal-body"
          style={{
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
            overflowY: "auto",
            flex: 1,
          }}
        >
          {/* Endpoints preview */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto 1fr",
              alignItems: "center",
              gap: "12px",
              backgroundColor: "#0f172a",
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid #1e293b",
            }}
          >
            {/* Source */}
            <div>
              <span style={{ fontSize: "10px", color: "#94a3b8", textTransform: "uppercase" }}>
                Chiqish Porti (Manba):
              </span>
              <div style={{ fontWeight: 600, color: "#f8fafc", fontSize: "13px" }}>
                {sourceInstance.customLabel || sourceInstance.name}
              </div>
              <div style={{ fontSize: "11px", color: "#38bdf8", marginTop: "2px" }}>
                {sourcePin.label} ({sourcePin.type.toUpperCase()})
              </div>
            </div>

            <ArrowRight size={18} style={{ color: "#64748b" }} />

            {/* Target */}
            <div>
              <span style={{ fontSize: "10px", color: "#94a3b8", textTransform: "uppercase" }}>
                Kirish Porti (Qabul qiluvchi):
              </span>
              <div style={{ fontWeight: 600, color: targetInstance ? "#f8fafc" : "#64748b", fontSize: "13px" }}>
                {targetInstance ? (targetInstance.customLabel || targetInstance.name) : "Tanlanmagan"}
              </div>
              <div style={{ fontSize: "11px", color: targetPin ? "#38bdf8" : "#64748b", marginTop: "2px" }}>
                {targetPin ? `${targetPin.label} (${targetPin.type.toUpperCase()})` : "Port tanlang"}
              </div>
            </div>
          </div>

          {/* Select Target Component */}
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "#cbd5e1", marginBottom: "6px" }}>
              1. Qaysi komponentga ulanadi?
            </label>
            <select
              style={{
                width: "100%",
                padding: "8px 12px",
                backgroundColor: "#1e293b",
                color: "#f8fafc",
                border: "1px solid #334155",
                borderRadius: "6px",
                fontSize: "13px",
              }}
              value={targetInstanceId}
              onChange={(e) => {
                setTargetInstanceId(e.target.value);
                setTargetPinFullName("");
              }}
            >
              <option value="">-- Komponentni tanlang --</option>
              {placedInstances
                .filter((inst) => inst.instanceId !== sourceInstance.instanceId)
                .map((inst) => (
                  <option key={inst.instanceId} value={inst.instanceId}>
                    {inst.customLabel || inst.name} ({inst.instanceId})
                  </option>
                ))}
            </select>
          </div>

          {/* Select Target Pin */}
          {targetInstance && (
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "#cbd5e1", marginBottom: "6px" }}>
                2. Qaysi port / pin ga ulanadi?
              </label>
              <select
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  backgroundColor: "#1e293b",
                  color: "#f8fafc",
                  border: "1px solid #334155",
                  borderRadius: "6px",
                  fontSize: "13px",
                }}
                value={targetPinFullName}
                onChange={(e) => setTargetPinFullName(e.target.value)}
              >
                <option value="">-- Pinni tanlang --</option>
                {targetPins.map((pin) => (
                  <option key={pin.fullName} value={pin.fullName}>
                    {pin.label} [{pin.type.toUpperCase()}]
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Cable Type Grid */}
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "#cbd5e1", marginBottom: "6px" }}>
              3. Kabel turi va signali:
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(135px, 1fr))", gap: "8px" }}>
              {CABLE_TYPES_CONFIG.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => handleTypeSelect(type.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    textAlign: "left",
                    backgroundColor: cableType === type.id ? "#0e7490" : "#1e293b",
                    color: cableType === type.id ? "#ffffff" : "#cbd5e1",
                    border: cableType === type.id ? "1px solid #06b6d4" : "1px solid #334155",
                    cursor: "pointer",
                  }}
                >
                  <span
                    style={{
                      width: "9px",
                      height: "9px",
                      borderRadius: "50%",
                      backgroundColor: type.color,
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: cableType === type.id ? 600 : 500 }} className="truncate">
                      {type.label}
                    </div>
                    {type.isRibbonDefault && (
                      <div style={{ fontSize: "10px", color: "#94a3b8" }}>
                        {type.id === "PWM" ? "3-tomirli shleyf" : type.id === "UART" ? "3-8 tomirli" : "Shleyf"}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* RIBBON / MULTI-STRAND CABLE CONFIGURATION SECTION */}
          <div
            style={{
              backgroundColor: "#0d1b2a",
              border: isRibbon ? "1px solid #0284c7" : "1px solid #1e293b",
              borderRadius: "8px",
              padding: "12px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            {/* Header with Toggle */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1 }}>
                <Layers size={16} className={isRibbon ? "text-cyan-400" : "text-slate-400"} />
                <div>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "#f8fafc" }}>
                    Lentali kabel (Ribbon / Ko‘p tomirli shleyf)
                  </span>
                  <p style={{ fontSize: "10px", color: "#94a3b8", margin: 0 }}>
                    {cableType === "PWM"
                      ? "Servo uchun 3 ta tomir (Signal, VCC, GND). Har bir tomir rangi alohida belgilanadi."
                      : cableType === "UART"
                      ? "UART telemetriya uchun 3 tadan 8 tagacha tomirli yassi kabel konfiguratsiyasi."
                      : "Parallel tomirli yassi shleyf kabeli va ranglar palitrasi."}
                  </p>
                </div>
              </div>

              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  cursor: "pointer",
                  gap: "6px",
                  userSelect: "none",
                }}
              >
                <input
                  type="checkbox"
                  checked={isRibbon}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIsRibbon(checked);
                    if (checked && strandColors.length === 0) {
                      setStrandColors(getDefaultStrandColors(cableType, strandCount));
                      setStrandLabels(getDefaultStrandLabels(cableType, strandCount));
                    }
                  }}
                  style={{ width: "16px", height: "16px", accentColor: "#06b6d4", cursor: "pointer" }}
                />
                <span style={{ fontSize: "11px", fontWeight: 600, color: isRibbon ? "#38bdf8" : "#94a3b8" }}>
                  {isRibbon ? "Yoqilgan" : "Oddiy sim"}
                </span>
              </label>
            </div>

            {isRibbon && (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "4px" }}>
                {/* Strand Count Selection */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
                  <div style={{ fontSize: "11px", color: "#cbd5e1" }}>
                    <span>Tomirlar soni: </span>
                    <strong style={{ color: "#38bdf8", fontSize: "13px" }}>{strandCount} ta tomir</strong>
                    <span style={{ fontSize: "10px", color: "#94a3b8", marginLeft: "6px" }}>
                      ({currentPreset.minStrands} dan {currentPreset.maxStrands} tagacha)
                    </span>
                  </div>

                  {/* Quick Strand Count Buttons */}
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    {availableCounts.map((count) => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => handleStrandCountChange(count)}
                        style={{
                          width: "28px",
                          height: "26px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: "4px",
                          fontSize: "12px",
                          fontWeight: strandCount === count ? 700 : 500,
                          backgroundColor: strandCount === count ? "#0284c7" : "#1e293b",
                          color: strandCount === count ? "#ffffff" : "#cbd5e1",
                          border: strandCount === count ? "1px solid #38bdf8" : "1px solid #334155",
                          cursor: "pointer",
                          transition: "all 0.15s",
                        }}
                      >
                        {count}
                      </button>
                    ))}
                  </div>
                </div>

                {/* VISUAL RIBBON STRIP PREVIEW */}
                <div
                  style={{
                    backgroundColor: "#030712",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid #1f2937",
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                  }}
                >
                  <span style={{ fontSize: "10px", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Lentali Shleyf Ko‘rinishi (3D Prevyu):
                  </span>
                  <div
                    style={{
                      display: "flex",
                      height: "22px",
                      borderRadius: "5px",
                      overflow: "hidden",
                      border: "1px solid rgba(255,255,255,0.15)",
                      boxShadow: "inset 0 2px 4px rgba(0,0,0,0.5)",
                    }}
                  >
                    {Array.from({ length: strandCount }).map((_, idx) => {
                      const color = strandColors[idx] || "#64748b";
                      const label = strandLabels[idx] || `${idx + 1}`;
                      return (
                        <div
                          key={idx}
                          style={{
                            flex: 1,
                            backgroundColor: color,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "9px",
                            fontWeight: 700,
                            color: ["#ffffff", "#f8fafc", "#fef08a", "#bae6fd"].includes(color.toLowerCase())
                              ? "#0f172a"
                              : "#ffffff",
                            borderRight: idx < strandCount - 1 ? "1px solid rgba(0,0,0,0.4)" : "none",
                            textShadow: "0 0 2px rgba(0,0,0,0.6)",
                          }}
                          title={`Tomir #${idx + 1}: ${label} (${color})`}
                        >
                          #{idx + 1}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* INDIVIDUAL STRAND COLOR & LABEL CONFIGURATION LIST */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 600, color: "#cbd5e1", display: "flex", alignItems: "center", gap: "4px" }}>
                      <Palette size={12} className="text-cyan-400" />
                      Har bir tomir rangi va signali (alohida sozlash):
                    </span>
                    <span style={{ fontSize: "10px", color: "#94a3b8" }}>
                      Rang ustiga bosib almashtiring
                    </span>
                  </div>

                  <div
                    style={{
                      maxHeight: "180px",
                      overflowY: "auto",
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                      paddingRight: "4px",
                    }}
                  >
                    {Array.from({ length: strandCount }).map((_, idx) => {
                      const color = strandColors[idx] || "#64748b";
                      const label = strandLabels[idx] || `${idx + 1}-tomir`;

                      return (
                        <div
                          key={idx}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "auto 1fr auto",
                            alignItems: "center",
                            gap: "8px",
                            padding: "6px 8px",
                            backgroundColor: "#111827",
                            border: "1px solid #1f2937",
                            borderRadius: "6px",
                          }}
                        >
                          {/* Strand number badge & color preview */}
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span
                              style={{
                                fontSize: "11px",
                                fontWeight: 700,
                                color: "#f8fafc",
                                width: "22px",
                                textAlign: "center",
                              }}
                            >
                              #{idx + 1}
                            </span>
                            <div
                              style={{
                                width: "20px",
                                height: "20px",
                                borderRadius: "4px",
                                backgroundColor: color,
                                border: "1px solid rgba(255,255,255,0.3)",
                                boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
                                flexShrink: 0,
                              }}
                            />
                          </div>

                          {/* Strand signal label */}
                          <input
                            type="text"
                            value={label}
                            onChange={(e) => handleUpdateStrandLabel(idx, e.target.value)}
                            placeholder={`Tomir #${idx + 1} vazifasi`}
                            style={{
                              width: "100%",
                              padding: "4px 8px",
                              backgroundColor: "#1f2937",
                              color: "#f8fafc",
                              border: "1px solid #374151",
                              borderRadius: "4px",
                              fontSize: "11px",
                            }}
                          />

                          {/* Quick color dots & native color picker */}
                          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            {QUICK_STRAND_COLORS.slice(0, 6).map((c) => (
                              <button
                                key={c.name}
                                type="button"
                                onClick={() => handleUpdateStrandColor(idx, c.hex)}
                                style={{
                                  width: "16px",
                                  height: "16px",
                                  borderRadius: "50%",
                                  backgroundColor: c.hex,
                                  border: color.toLowerCase() === c.hex.toLowerCase() ? "2px solid #ffffff" : "1px solid rgba(0,0,0,0.5)",
                                  cursor: "pointer",
                                  padding: 0,
                                  boxShadow: color.toLowerCase() === c.hex.toLowerCase() ? "0 0 6px #38bdf8" : "none",
                                }}
                                title={`${c.name} (${c.hex})`}
                              />
                            ))}

                            <input
                              type="color"
                              value={color}
                              onChange={(e) => handleUpdateStrandColor(idx, e.target.value)}
                              style={{
                                width: "22px",
                                height: "22px",
                                padding: 0,
                                border: "none",
                                backgroundColor: "transparent",
                                cursor: "pointer",
                                marginLeft: "2px",
                              }}
                              title="Boshqa rangni tanlash"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Pitch / spacing */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", fontSize: "11px" }}>
                  <span style={{ color: "#94a3b8" }}>Tomirlar orasidagi masofa (Pitch):</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <input
                      type="range"
                      min={1.2}
                      max={3.5}
                      step={0.1}
                      value={strandPitchMm}
                      onChange={(e) => setStrandPitchMm(parseFloat(e.target.value) || 2.0)}
                      style={{ width: "90px", accentColor: "#06b6d4" }}
                    />
                    <span style={{ fontFamily: "monospace", color: "#38bdf8", fontWeight: 600 }}>
                      {strandPitchMm.toFixed(1)} mm
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Color & Gauge for non-ribbon fallback */}
          {!isRibbon && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", color: "#94a3b8", marginBottom: "4px" }}>
                  Sim kalibri (Gauge):
                </label>
                <input
                  type="text"
                  style={{
                    width: "100%",
                    padding: "6px 10px",
                    backgroundColor: "#1e293b",
                    color: "#f8fafc",
                    border: "1px solid #334155",
                    borderRadius: "6px",
                    fontSize: "12px",
                  }}
                  value={wireGauge}
                  onChange={(e) => setWireGauge(e.target.value)}
                  placeholder="masalan, 22 AWG"
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "11px", color: "#94a3b8", marginBottom: "4px" }}>
                  Kabel rangi (3D vizual):
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <input
                    type="color"
                    value={cableColor}
                    onChange={(e) => setCableColor(e.target.value)}
                    style={{
                      width: "36px",
                      height: "32px",
                      borderRadius: "4px",
                      cursor: "pointer",
                      border: "none",
                      backgroundColor: "transparent",
                    }}
                  />
                  <span style={{ fontSize: "12px", color: "#cbd5e1" }}>{cableColor}</span>
                </div>
              </div>
            </div>
          )}

          {/* Cable End Identification Stickers (Uchki Shtikerlar / Yorliqlar) */}
          <div
            style={{
              padding: "12px",
              backgroundColor: "rgba(15, 23, 42, 0.7)",
              border: "1px solid rgba(56, 189, 248, 0.3)",
              borderRadius: "8px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Tag size={16} style={{ color: "#38bdf8" }} />
                <span style={{ fontSize: "12px", fontWeight: 600, color: "#f8fafc" }}>
                  Kabel uchlariga shtikerlar (Markirovka / Heatshrink Tags)
                </span>
              </div>
              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  cursor: "pointer",
                  fontSize: "11px",
                }}
              >
                <input
                  type="checkbox"
                  checked={enableEndStickers}
                  onChange={(e) => setEnableEndStickers(e.target.checked)}
                  style={{ width: "16px", height: "16px", accentColor: "#06b6d4", cursor: "pointer" }}
                />
                <span style={{ color: enableEndStickers ? "#38bdf8" : "#94a3b8", fontWeight: 500 }}>
                  {enableEndStickers ? "Shtikerlar yoqilgan" : "Shtikersiz"}
                </span>
              </label>
            </div>

            {enableEndStickers && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  borderTop: "1px solid #1e293b",
                  paddingTop: "8px",
                }}
              >
                {/* Source & Target Labels Inputs with Live Previews */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  {/* Source End Sticker */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <label style={{ fontSize: "10px", color: "#94a3b8" }}>
                        Manba uchi shtikeri (P1):
                      </label>
                      <span
                        style={{
                          backgroundColor: stickerBgColor,
                          color: stickerTextColor,
                          fontSize: "9px",
                          fontWeight: 700,
                          padding: "1px 6px",
                          borderRadius: stickerStyle === "flag" ? "2px 8px 8px 2px" : "3px",
                          border: "1px solid rgba(0,0,0,0.3)",
                          fontFamily: "monospace",
                        }}
                      >
                        {sourceStickerText || "SRC"}
                      </span>
                    </div>
                    <input
                      type="text"
                      value={sourceStickerText}
                      onChange={(e) => setSourceStickerText(e.target.value)}
                      placeholder="masalan: J1:GPS-MAIN"
                      style={{
                        padding: "5px 8px",
                        backgroundColor: "#1e293b",
                        color: "#f8fafc",
                        border: "1px solid #334155",
                        borderRadius: "4px",
                        fontSize: "11px",
                        fontFamily: "monospace",
                      }}
                    />
                  </div>

                  {/* Target End Sticker */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <label style={{ fontSize: "10px", color: "#94a3b8" }}>
                        Qabul uchi shtikeri (P2):
                      </label>
                      <span
                        style={{
                          backgroundColor: stickerBgColor,
                          color: stickerTextColor,
                          fontSize: "9px",
                          fontWeight: 700,
                          padding: "1px 6px",
                          borderRadius: stickerStyle === "flag" ? "2px 8px 8px 2px" : "3px",
                          border: "1px solid rgba(0,0,0,0.3)",
                          fontFamily: "monospace",
                        }}
                      >
                        {targetStickerText ||
                          (targetPin
                            ? `${(targetInstance?.customLabel || "TGT").toUpperCase()}:${targetPin.pinId}`
                            : "TGT")}
                      </span>
                    </div>
                    <input
                      type="text"
                      value={targetStickerText}
                      onChange={(e) => setTargetStickerText(e.target.value)}
                      placeholder="masalan: P1:FC-UART"
                      style={{
                        padding: "5px 8px",
                        backgroundColor: "#1e293b",
                        color: "#f8fafc",
                        border: "1px solid #334155",
                        borderRadius: "4px",
                        fontSize: "11px",
                        fontFamily: "monospace",
                      }}
                    />
                  </div>
                </div>

                {/* Sticker Style & Color Selectors */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.2fr 1fr",
                    gap: "10px",
                    alignItems: "center",
                  }}
                >
                  {/* Style selector */}
                  <div>
                    <label style={{ display: "block", fontSize: "10px", color: "#94a3b8", marginBottom: "4px" }}>
                      Shtiker formati (Uslubi):
                    </label>
                    <div style={{ display: "flex", gap: "4px" }}>
                      {STICKER_STYLES.map((st) => (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => setStickerStyle(st.id as any)}
                          style={{
                            flex: 1,
                            padding: "4px 6px",
                            backgroundColor: stickerStyle === st.id ? "#0284c7" : "#1e293b",
                            color: stickerStyle === st.id ? "#ffffff" : "#94a3b8",
                            border: stickerStyle === st.id ? "1px solid #38bdf8" : "1px solid #334155",
                            borderRadius: "4px",
                            fontSize: "10px",
                            cursor: "pointer",
                            fontWeight: stickerStyle === st.id ? 600 : 400,
                          }}
                          title={st.desc}
                        >
                          {st.label.split(" ")[0]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Background Color & Text color */}
                  <div>
                    <label style={{ display: "block", fontSize: "10px", color: "#94a3b8", marginBottom: "4px" }}>
                      Shtiker foni va matn rangi:
                    </label>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      {STICKER_BG_COLORS.slice(0, 5).map((col) => (
                        <button
                          key={col.hex}
                          type="button"
                          onClick={() => setStickerBgColor(col.hex)}
                          style={{
                            width: "16px",
                            height: "16px",
                            borderRadius: "50%",
                            backgroundColor: col.hex,
                            border:
                              stickerBgColor === col.hex ? "2px solid #ffffff" : "1px solid rgba(0,0,0,0.5)",
                            cursor: "pointer",
                          }}
                          title={col.name}
                        />
                      ))}
                      <input
                        type="color"
                        value={stickerBgColor}
                        onChange={(e) => setStickerBgColor(e.target.value)}
                        style={{ width: "20px", height: "20px", border: "none", cursor: "pointer", background: "none" }}
                        title="Boshqa fon rangi"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setStickerTextColor((prev) => (prev === "#000000" ? "#ffffff" : "#000000"))
                        }
                        style={{
                          fontSize: "9px",
                          padding: "2px 5px",
                          backgroundColor: "#1e293b",
                          border: "1px solid #334155",
                          borderRadius: "3px",
                          color: stickerTextColor === "#000000" ? "#facc15" : "#ffffff",
                          cursor: "pointer",
                        }}
                        title="Matn rangini qora yoki oq qilish"
                      >
                        {stickerTextColor === "#000000" ? "Qora" : "Oq"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Distance offset slider */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: "10px",
                    color: "#94a3b8",
                  }}
                >
                  <span>Ulagich (pin)dan shtikergacha masofa:</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <input
                      type="range"
                      min={10}
                      max={50}
                      step={2}
                      value={stickerOffsetMm}
                      onChange={(e) => setStickerOffsetMm(parseInt(e.target.value) || 20)}
                      style={{ width: "90px", accentColor: "#06b6d4" }}
                    />
                    <span style={{ fontFamily: "monospace", color: "#38bdf8", fontWeight: 600 }}>
                      {stickerOffsetMm} mm
                    </span>
                  </div>
                </div>

                {/* 3D Rotation and 3D Size */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", paddingTop: "4px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "10px", color: "#94a3b8" }}>
                    <span>3D Burchak:</span>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <input
                        type="range"
                        min={0}
                        max={360}
                        step={15}
                        value={stickerRotationDeg}
                        onChange={(e) => setStickerRotationDeg(parseInt(e.target.value) || 0)}
                        style={{ width: "65px", accentColor: "#06b6d4" }}
                      />
                      <span style={{ fontFamily: "monospace", color: "#38bdf8", fontWeight: 600, width: "32px", textAlign: "right" }}>
                        {stickerRotationDeg}°
                      </span>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "10px", color: "#94a3b8" }}>
                    <span>3D O‘lcham:</span>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <input
                        type="range"
                        min={16}
                        max={36}
                        step={2}
                        value={stickerSizeMm}
                        onChange={(e) => setStickerSizeMm(parseInt(e.target.value) || 24)}
                        style={{ width: "65px", accentColor: "#06b6d4" }}
                      />
                      <span style={{ fontFamily: "monospace", color: "#38bdf8", fontWeight: 600, width: "32px", textAlign: "right" }}>
                        {stickerSizeMm}mm
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Custom Name */}
          <div>
            <label style={{ display: "block", fontSize: "11px", color: "#94a3b8", marginBottom: "4px" }}>
              Kabel nomi yoki belgisi (Ixtiyoriy):
            </label>
            <input
              type="text"
              style={{
                width: "100%",
                padding: "6px 10px",
                backgroundColor: "#1e293b",
                color: "#f8fafc",
                border: "1px solid #334155",
                borderRadius: "6px",
                fontSize: "12px",
              }}
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Masalan: Servo shleyf kabeli #1 yoki Asosiy UART"
            />
          </div>
        </div>

        <div
          className="modal-footer"
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "10px",
            padding: "12px 16px",
            borderTop: "1px solid #1e293b",
          }}
        >
          <button
            type="button"
            className="btn-cancel"
            onClick={onClose}
            style={{
              padding: "7px 14px",
              backgroundColor: "#1e293b",
              color: "#cbd5e1",
              borderRadius: "6px",
              border: "1px solid #334155",
              cursor: "pointer",
            }}
          >
            Bekor qilish
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={!targetInstanceId || !targetPinFullName}
            onClick={handleCreateConnection}
            style={{
              padding: "7px 16px",
              backgroundColor: !targetInstanceId || !targetPinFullName ? "#334155" : "#0284c7",
              color: "#ffffff",
              borderRadius: "6px",
              border: "none",
              fontWeight: 500,
              cursor: !targetInstanceId || !targetPinFullName ? "not-allowed" : "pointer",
            }}
          >
            Ulashni o‘rnatish {isRibbon ? `(${strandCount}-tomirli shleyf)` : ""}
          </button>
        </div>
      </div>
    </div>
  );
};
