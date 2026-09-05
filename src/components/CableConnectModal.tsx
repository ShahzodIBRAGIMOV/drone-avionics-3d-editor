import React, { useState } from "react";
import {
  X,
  Link2,
  ArrowRight,
  ArrowLeft,
  ArrowLeftRight,
  Cable as CableIcon,
  Layers,
  Palette,
  Check,
  Plus,
  Minus,
  Tag,
  Activity,
  Droplets,
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
  isBidirectionalCableType,
  isBidirectionalPin,
  isSensorComponent,
  isPowerProviderComponent,
  isPitotComponent,
  isAirspeedSensorComponent,
  isPneumaticOrPitotConnection,
  resolveStrandPhysicalDirection,
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
    const pType = (sourcePin.type || "").toLowerCase();
    const pLabel = (sourcePin.label || "").toLowerCase();
    const pId = (sourcePin.pinId || "").toLowerCase();
    const pConn = (sourcePin.connectorId || "").toLowerCase();

    if (
      pType === "i2c" ||
      pLabel.includes("i2c") ||
      pId.includes("i2c") ||
      pConn.includes("i2c") ||
      pLabel.includes("sda") ||
      pLabel.includes("scl")
    ) {
      return "I2C";
    }
    if (pType === "pneumatic" || pLabel.includes("pitot") || pLabel.includes("airspeed") || pLabel.includes("bosim")) {
      return "Airspeed";
    }

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

  const isSensorDetected =
    isSensorComponent(sourceInstance.componentId, sourceInstance.customLabel) ||
    (targetInstance && isSensorComponent(targetInstance.componentId, targetInstance.customLabel));

  const isInitiallyBidirectional =
    isBidirectionalPin(sourcePin.type, sourcePin.label) ||
    isBidirectionalCableType(initialPreset.id);

  const [flowDirection, setFlowDirection] = useState<"forward" | "reverse" | "bidirectional" | "smart">(
    isSensorDetected ? "smart" : isInitiallyBidirectional ? "bidirectional" : "smart"
  );

  // Source pins retrieval and selection
  const sourcePins: PinDefinition[] = sourceInstance
    ? sourceInstance.customPins && sourceInstance.customPins.length > 0
      ? sourceInstance.customPins
      : COMPONENT_PINS[sourceInstance.componentId] || []
    : [];
  const [selectedSourcePinFullName, setSelectedSourcePinFullName] = useState<string>(sourcePin.fullName);

  // Breakout / Y-Splitter / Multi-Pin cable states (2 tadan 10 tagacha belgilash)
  const [isBreakout, setIsBreakout] = useState<boolean>(false);
  const [breakoutMode, setBreakoutMode] = useState<"1-to-N" | "N-to-1" | "N-to-N">("1-to-N");
  const [breakoutCount, setBreakoutCount] = useState<number>(3); // 2..10 pin
  const [breakoutTargetPins, setBreakoutTargetPins] = useState<string[]>(["", "", ""]);
  const [breakoutSourcePins, setBreakoutSourcePins] = useState<string[]>([
    sourcePin.fullName,
    sourcePin.fullName,
    sourcePin.fullName,
  ]);
  const [breakoutPinLabels, setBreakoutPinLabels] = useState<string[]>([
    "Tomir 1 (TX ➔ RX)",
    "Tomir 2 (RX ◄ TX)",
    "Tomir 3 (GND ══ GND)",
  ]);

  const targetPins: PinDefinition[] = targetInstance
    ? targetInstance.customPins && targetInstance.customPins.length > 0
      ? targetInstance.customPins
      : COMPONENT_PINS[targetInstance.componentId] || []
    : [];

  const targetPin = targetPins.find((p) => p.fullName === targetPinFullName);

  // Dynamic pin count updater (2 tadan 10 tagacha)
  const handleSetBreakoutCount = (newCount: number) => {
    const clamped = Math.max(2, Math.min(10, newCount));
    setBreakoutCount(clamped);
    setStrandCount(clamped);

    setBreakoutTargetPins((prev) => {
      const next = [...prev];
      while (next.length < clamped) {
        const nextIdx = next.length;
        const autoPin = targetPins[nextIdx % Math.max(1, targetPins.length)]?.fullName || "";
        next.push(autoPin);
      }
      return next.slice(0, clamped);
    });

    setBreakoutSourcePins((prev) => {
      const next = [...prev];
      while (next.length < clamped) {
        const nextIdx = next.length;
        const autoPin = sourcePins[nextIdx % Math.max(1, sourcePins.length)]?.fullName || sourcePin.fullName;
        next.push(autoPin);
      }
      return next.slice(0, clamped);
    });

    setBreakoutPinLabels((prev) => {
      const next = [...prev];
      const defLabels = getDefaultStrandLabels(cableType || "UART", clamped);
      while (next.length < clamped) {
        const idx = next.length;
        next.push(defLabels[idx] || `Tomir ${idx + 1}`);
      }
      return next.slice(0, clamped);
    });

    setStrandColors((prev) => {
      const next = [...prev];
      const defColors = getDefaultStrandColors(cableType || "UART", clamped);
      while (next.length < clamped) {
        const idx = next.length;
        next.push(defColors[idx] || "#38bdf8");
      }
      return next.slice(0, clamped);
    });
  };

  // Detect Cube Orange and Jetson pairing
  const isCubeAndJetson = Boolean(
    (sourceInstance.componentId === "02" && targetInstance?.componentId === "19") ||
    (sourceInstance.componentId === "19" && targetInstance?.componentId === "02")
  );

  // Handler to auto-configure UART companion connection between Cube and Jetson
  const handleApplyCubeJetsonPreset = () => {
    setIsBreakout(true);
    setCableType("UART");
    setIsRibbon(true);
    handleSetBreakoutCount(3);
    setCableColor("#0284c7");
    setWireGauge("28 AWG");
    setFlowDirection("bidirectional");

    if (sourceInstance.componentId === "02") {
      // Cube is source, Jetson is target (1-to-N: 1 port to 3 pins)
      setBreakoutMode("1-to-N");
      const telemPort = sourcePins.find((p) => p.connectorId === "telem2")?.fullName || sourcePin.fullName;
      setSelectedSourcePinFullName(telemPort);

      const rxPin = targetPins.find((p) => p.pinId === "rx" || p.fullName.includes(".rx"))?.fullName || targetPins[1]?.fullName || "";
      const txPin = targetPins.find((p) => p.pinId === "tx" || p.fullName.includes(".tx"))?.fullName || targetPins[2]?.fullName || "";
      const gndPin = targetPins.find((p) => p.pinId === "gnd" || p.fullName.includes(".gnd"))?.fullName || targetPins[3]?.fullName || "";

      setBreakoutTargetPins([rxPin, txPin, gndPin]);
      setTargetPinFullName(rxPin);
      setStrandColors(["#f59e0b", "#10b981", "#0f172a"]); // Amber (TX->RX), Green (RX<-TX), Dark (GND)
      setBreakoutPinLabels([
        "Cube TX ➔ Jetson RX (Pin 10)",
        "Cube RX ◄ Jetson TX (Pin 8)",
        "Cube GND ══ Jetson GND (Pin 9)",
      ]);
      setCustomName("Cube Telem2 ➔ Jetson 3-Pin UART (1-to-3 Y-Breakout)");
    } else {
      // Jetson is source, Cube is target (N-to-1: 3 pins to 1 port)
      setBreakoutMode("N-to-1");
      const rxPin = sourcePins.find((p) => p.pinId === "rx" || p.fullName.includes(".rx"))?.fullName || sourcePins[1]?.fullName || "";
      const txPin = sourcePins.find((p) => p.pinId === "tx" || p.fullName.includes(".tx"))?.fullName || sourcePins[2]?.fullName || "";
      const gndPin = sourcePins.find((p) => p.pinId === "gnd" || p.fullName.includes(".gnd"))?.fullName || sourcePins[3]?.fullName || "";

      setBreakoutSourcePins([txPin, rxPin, gndPin]);
      setSelectedSourcePinFullName(txPin);

      const telemPort = targetPins.find((p) => p.connectorId === "telem2")?.fullName || targetPins[0]?.fullName || "";
      setTargetPinFullName(telemPort);
      setStrandColors(["#10b981", "#f59e0b", "#0f172a"]);
      setBreakoutPinLabels([
        "Jetson TX ➔ Cube RX",
        "Jetson RX ◄ Cube TX",
        "Jetson GND ══ Cube GND",
      ]);
      setCustomName("Jetson 3-Pin ➔ Cube Telem2 UART (3-to-1 Companion)");
    }
  };

  const isPneumaticDetected =
    sourcePin.type === "pneumatic" ||
    targetPin?.type === "pneumatic" ||
    isPneumaticOrPitotConnection(
      sourceInstance.componentId,
      sourceInstance.customLabel,
      sourcePin.type,
      targetInstance?.componentId,
      targetInstance?.customLabel,
      targetPin?.type
    ) ||
    cableType === "Airspeed";

  // Transparent Silicone Tube states (Pitot shlang / Pnevmatik naycha)
  const [isTransparent, setIsTransparent] = useState<boolean>(
    initialPreset.isTransparentDefault ?? (initialTypeId === "Airspeed" || sourcePin.type === "pneumatic")
  );
  const [transparencyOpacity, setTransparencyOpacity] = useState<number>(
    initialPreset.defaultOpacity ?? 0.45
  );
  const [isTubing, setIsTubing] = useState<boolean>(
    initialPreset.isTubingDefault ?? (initialTypeId === "Airspeed" || sourcePin.type === "pneumatic")
  );
  const [tubeInnerColor, setTubeInnerColor] = useState<string>("#38bdf8");

  // Auto-detect Pitot / Pneumatic ports or I2C ports when target is selected
  React.useEffect(() => {
    if (
      sourcePin.type === "pneumatic" ||
      targetPin?.type === "pneumatic" ||
      (targetInstance && isPitotComponent(targetInstance.componentId, targetInstance.customLabel)) ||
      isPitotComponent(sourceInstance.componentId, sourceInstance.customLabel)
    ) {
      if (cableType !== "Airspeed") {
        setCableType("Airspeed");
        const airspeedPreset = getPresetForCableType("Airspeed");
        setWireGauge(airspeedPreset.defaultGauge);
        setCableColor(airspeedPreset.color);
        setIsRibbon(airspeedPreset.isRibbonDefault);
        setStrandCount(airspeedPreset.defaultStrands);
        setStrandColors(airspeedPreset.defaultColors);
        setStrandLabels(airspeedPreset.defaultLabels);
      }
      setIsTransparent(true);
      setIsTubing(true);
      return;
    }

    const tgtIsI2C =
      targetPin &&
      (targetPin.type === "i2c" ||
        targetPin.label.toLowerCase().includes("i2c") ||
        targetPin.pinId.toLowerCase().includes("i2c") ||
        targetPin.connectorId.toLowerCase().includes("i2c") ||
        targetPin.label.toLowerCase().includes("sda") ||
        targetPin.label.toLowerCase().includes("scl"));
    const srcIsI2C =
      sourcePin.type === "i2c" ||
      sourcePin.label.toLowerCase().includes("i2c") ||
      sourcePin.pinId.toLowerCase().includes("i2c") ||
      sourcePin.connectorId.toLowerCase().includes("i2c") ||
      sourcePin.label.toLowerCase().includes("sda") ||
      sourcePin.label.toLowerCase().includes("scl");

    if ((tgtIsI2C || srcIsI2C) && cableType !== "I2C" && cableType !== "Airspeed") {
      setCableType("I2C");
      const i2cPreset = getPresetForCableType("I2C");
      setWireGauge(i2cPreset.defaultGauge);
      setCableColor(i2cPreset.color);
      setIsRibbon(i2cPreset.isRibbonDefault);
      setStrandCount(i2cPreset.defaultStrands);
      setStrandColors(i2cPreset.defaultColors);
      setStrandLabels(i2cPreset.defaultLabels);
      setFlowDirection("smart");
    }
  }, [targetInstanceId, targetPinFullName]);

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
    if (preset.isTransparentDefault !== undefined) {
      setIsTransparent(preset.isTransparentDefault);
    }
    if (preset.defaultOpacity !== undefined) {
      setTransparencyOpacity(preset.defaultOpacity);
    }
    if (preset.isTubingDefault !== undefined) {
      setIsTubing(preset.isTubingDefault);
    }
    if (preset.isBidirectionalDefault) {
      setFlowDirection("bidirectional");
    }
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
    if (!targetInstanceId) return;

    const finalTargetPin = isBreakout
      ? (breakoutMode === "N-to-1"
          ? targetPinFullName || targetPins[0]?.fullName || ""
          : breakoutTargetPins[0] || targetPinFullName || targetPins[0]?.fullName || "")
      : targetPinFullName;

    const finalSourcePin = isBreakout
      ? (breakoutMode === "1-to-N"
          ? selectedSourcePinFullName || sourcePin.fullName
          : breakoutSourcePins[0] || selectedSourcePinFullName || sourcePin.fullName)
      : selectedSourcePinFullName || sourcePin.fullName;

    if (!finalTargetPin || !finalSourcePin) return;

    const validTargetPins = isBreakout && (breakoutMode === "1-to-N" || breakoutMode === "N-to-N")
      ? breakoutTargetPins.slice(0, breakoutCount).map((p, idx) => p || targetPins[idx % Math.max(1, targetPins.length)]?.fullName || "")
      : undefined;

    const validSourcePins = isBreakout && (breakoutMode === "N-to-1" || breakoutMode === "N-to-N")
      ? breakoutSourcePins.slice(0, breakoutCount).map((p, idx) => p || sourcePins[idx % Math.max(1, sourcePins.length)]?.fullName || "")
      : undefined;

    const finalStrandColors = isBreakout
      ? strandColors.slice(0, breakoutCount)
      : (isRibbon ? strandColors.slice(0, strandCount) : [cableColor]);

    const finalStrandLabels = isBreakout
      ? breakoutPinLabels.slice(0, breakoutCount)
      : (isRibbon ? strandLabels.slice(0, strandCount) : [sourcePin.label]);

    let defaultBreakoutName = "";
    if (breakoutMode === "1-to-N") {
      defaultBreakoutName = `${sourceInstance.customLabel || sourceInstance.name} [1 Port] ➔ ${targetInstance?.customLabel || targetInstance?.name} [${breakoutCount}-Pin Breakout]`;
    } else if (breakoutMode === "N-to-1") {
      defaultBreakoutName = `${sourceInstance.customLabel || sourceInstance.name} [${breakoutCount}-Pin Breakout] ➔ ${targetInstance?.customLabel || targetInstance?.name} [1 Port]`;
    } else {
      defaultBreakoutName = `${sourceInstance.customLabel || sourceInstance.name} [${breakoutCount} Pins] ➔ ${targetInstance?.customLabel || targetInstance?.name} [${breakoutCount} Pins]`;
    }

    onConnect({
      name:
        customName.trim() ||
        (isBreakout
          ? defaultBreakoutName
          : `${sourceInstance.customLabel || sourceInstance.name} [${sourcePin.pinId}] → ${targetInstance?.customLabel || targetInstance?.name} [${targetPin?.pinId || "port"}]`),
      sourceInstanceId: sourceInstance.instanceId,
      sourcePinName: finalSourcePin,
      targetInstanceId,
      targetPinName: finalTargetPin,
      isBreakout: Boolean(isBreakout),
      breakoutType: breakoutMode,
      breakoutMode,
      multiTargetPinNames: validTargetPins,
      multiSourcePinNames: validSourcePins,
      flowDirection,
      color: isRibbon && finalStrandColors.length > 0 ? finalStrandColors[0] : cableColor,
      cableType,
      wireGauge,
      isRibbon: isBreakout ? true : isRibbon,
      strandCount: isBreakout ? breakoutCount : (isRibbon ? strandCount : 1),
      strandPitchMm: isRibbon ? strandPitchMm : 2.0,
      strandColors: finalStrandColors,
      strandLabels: finalStrandLabels,
      isTransparent,
      transparencyOpacity,
      isTubing,
      tubeInnerColor,
      endStickers: enableEndStickers
        ? {
            enabled: true,
            sourceText:
              sourceStickerText.trim() ||
              (isBreakout && breakoutMode !== "1-to-N"
                ? `${(sourceInstance.customLabel || "SRC").toUpperCase()}:${breakoutCount}PIN`
                : `${(sourceInstance.customLabel || "SRC").toUpperCase()}:${sourcePin.pinId}`),
            targetText:
              targetStickerText.trim() ||
              (isBreakout && breakoutMode !== "N-to-1"
                ? `${(targetInstance?.customLabel || "TGT").toUpperCase()}:${breakoutCount}PIN`
                : `${(targetInstance?.customLabel || "TGT").toUpperCase()}:${targetPin?.pinId || "PORT"}`),
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

            {/* Flow Direction Indicator & Switcher */}
            <button
              type="button"
              onClick={() =>
                setFlowDirection((prev) =>
                  prev === "forward" ? "bidirectional" : prev === "bidirectional" ? "reverse" : "forward"
                )
              }
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                background:
                  flowDirection === "bidirectional"
                    ? "rgba(6, 78, 59, 0.8)"
                    : flowDirection === "reverse"
                    ? "rgba(120, 53, 15, 0.8)"
                    : "rgba(30, 41, 59, 0.8)",
                border:
                  flowDirection === "bidirectional"
                    ? "1px solid #10b981"
                    : flowDirection === "reverse"
                    ? "1px solid #f59e0b"
                    : "1px solid #38bdf8",
                borderRadius: "8px",
                padding: "6px 10px",
                cursor: "pointer",
                gap: "3px",
                transition: "all 0.2s",
                boxShadow:
                  flowDirection === "bidirectional" ? "0 0 10px rgba(16,185,129,0.25)" : "none",
              }}
              title="Oqim rejimini almashtirish: To‘g‘ri (1➔2), Ikki tomonlama (1⇄2) yoki Teskari (2➔1)"
            >
              {flowDirection === "bidirectional" ? (
                <ArrowLeftRight size={18} style={{ color: "#34d399" }} />
              ) : flowDirection === "reverse" ? (
                <ArrowLeft size={18} style={{ color: "#f59e0b" }} />
              ) : (
                <ArrowRight size={18} style={{ color: "#38bdf8" }} />
              )}
              <span
                style={{
                  fontSize: "9px",
                  fontWeight: 700,
                  fontFamily: "monospace",
                  color:
                    flowDirection === "bidirectional"
                      ? "#34d399"
                      : flowDirection === "reverse"
                      ? "#f59e0b"
                      : "#38bdf8",
                  whiteSpace: "nowrap",
                }}
              >
                {flowDirection === "bidirectional"
                  ? "1 ⇄ 2 (Dual)"
                  : flowDirection === "reverse"
                  ? "2 ➔ 1 (Teskari)"
                  : "1 ➔ 2 (To‘g‘ri)"}
              </span>
            </button>

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

          {/* Dedicated 3-Way Flow Direction Selector */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "#0f172a",
              border: "1px solid #334155",
              borderRadius: "6px",
              padding: "5px 8px",
              gap: "6px",
            }}
          >
            <span style={{ color: "#94a3b8", fontSize: "11px", fontWeight: 500, display: "flex", alignItems: "center", gap: "4px" }}>
              Oqim rejimi:
            </span>
            <div style={{ display: "flex", gap: "4px" }}>
              <button
                type="button"
                onClick={() => setFlowDirection("forward")}
                style={{
                  padding: "4px 8px",
                  borderRadius: "4px",
                  fontSize: "10px",
                  fontWeight: flowDirection === "forward" ? 700 : 500,
                  background: flowDirection === "forward" ? "#0284c7" : "#1e293b",
                  color: flowDirection === "forward" ? "#ffffff" : "#94a3b8",
                  border: flowDirection === "forward" ? "1px solid #38bdf8" : "1px solid #334155",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  transition: "all 0.15s",
                }}
                title="Bir tomonlama: 1-manbadan 2-qabul qiluvchiga tomon oqadi"
              >
                <ArrowRight size={11} /> 1 ➔ 2 (Bir tomonlama)
              </button>
              <button
                type="button"
                onClick={() => setFlowDirection("bidirectional")}
                style={{
                  padding: "4px 8px",
                  borderRadius: "4px",
                  fontSize: "10px",
                  fontWeight: flowDirection === "bidirectional" ? 700 : 500,
                  background: flowDirection === "bidirectional" ? "#059669" : "#1e293b",
                  color: flowDirection === "bidirectional" ? "#ffffff" : "#6ee7b7",
                  border: flowDirection === "bidirectional" ? "1px solid #34d399" : "1px solid #334155",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  boxShadow: flowDirection === "bidirectional" ? "0 0 8px rgba(16,185,129,0.3)" : "none",
                  transition: "all 0.15s",
                }}
                title="Ikki tomonlama: CAN, UART TX/RX, Ethernet kabi paketlar ikkala tomonga parallel uzatiladi"
              >
                <ArrowLeftRight size={11} /> 1 ⇄ 2 (Ikki tomonlama ma'lumot)
              </button>
              <button
                type="button"
                onClick={() => setFlowDirection("reverse")}
                style={{
                  padding: "4px 8px",
                  borderRadius: "4px",
                  fontSize: "10px",
                  fontWeight: flowDirection === "reverse" ? 700 : 500,
                  background: flowDirection === "reverse" ? "#d97706" : "#1e293b",
                  color: flowDirection === "reverse" ? "#ffffff" : "#94a3b8",
                  border: flowDirection === "reverse" ? "1px solid #fbbf24" : "1px solid #334155",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  transition: "all 0.15s",
                }}
                title="Teskari: 2-elementdan 1-elementga tomon oqadi"
              >
                <ArrowLeft size={11} /> 2 ➔ 1 (Teskari)
              </button>
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
                const newTgtId = e.target.value;
                setTargetInstanceId(newTgtId);
                setTargetPinFullName("");
                const tgt = placedInstances.find((i) => i.instanceId === newTgtId);
                const isPair = Boolean(
                  (sourceInstance.componentId === "02" && tgt?.componentId === "19") ||
                  (sourceInstance.componentId === "19" && tgt?.componentId === "02")
                );
                if (isPair) {
                  setIsBreakout(true);
                  setCableType("UART");
                  setIsRibbon(true);
                  setStrandCount(3);
                }
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

          {/* Cube Orange and Jetson Intelligent Assistant Banner */}
          {targetInstance && isCubeAndJetson && (
            <div
              style={{
                backgroundColor: "#082f49",
                border: "1px solid #0284c7",
                borderRadius: "8px",
                padding: "10px 12px",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#38bdf8", display: "flex", alignItems: "center", gap: "6px" }}>
                  💡 Cube Orange ⇄ Jetson UART Companion Ulanishi
                </span>
                <span style={{ fontSize: "10px", padding: "2px 6px", background: "#0284c7", color: "#ffffff", borderRadius: "4px", fontWeight: 600 }}>
                  3-Pin UART Y-Breakout
                </span>
              </div>
              <p style={{ fontSize: "11px", color: "#bae6fd", margin: 0, lineHeight: 1.4 }}>
                {sourceInstance.componentId === "02"
                  ? "Cube Orange Telem2 portidan Jetsonning 3 ta piniga (TX, RX, GND) 1-to-3 ajraluvchi kabel orqali ulanadi."
                  : "Jetsonning 3 ta pinidan (TX, RX, GND) Cube Orange Telem2 portiga 3-to-1 ajraluvchi kabel orqali ulanadi."}
              </p>
              <button
                type="button"
                onClick={handleApplyCubeJetsonPreset}
                className="hover:bg-sky-600 transition-colors"
                style={{
                  marginTop: "4px",
                  padding: "6px 12px",
                  backgroundColor: "#0284c7",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                }}
              >
                ⚡ 1-bosishda {sourceInstance.componentId === "02" ? "1-to-3" : "3-to-1"} Breakout Ulanishini Sozlash (TX, RX, GND)
              </button>
            </div>
          )}

          {/* Connection Topology Mode: 1-to-1 Single vs Multi-Pin Breakout */}
          {targetInstance && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                background: "#0f172a",
                border: "1px solid #1e293b",
                borderRadius: "8px",
                padding: "10px 12px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "11px", fontWeight: 600, color: "#cbd5e1" }}>
                  Ulanish arxitekturasi:
                </span>
                <div style={{ display: "flex", gap: "4px" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsBreakout(false);
                      if (targetPins.length > 0 && !targetPinFullName) {
                        setTargetPinFullName(targetPins[0].fullName);
                      }
                    }}
                    style={{
                      padding: "5px 10px",
                      borderRadius: "5px",
                      fontSize: "11px",
                      fontWeight: !isBreakout ? 700 : 500,
                      background: !isBreakout ? "#0284c7" : "#1e293b",
                      color: !isBreakout ? "#ffffff" : "#94a3b8",
                      border: !isBreakout ? "1px solid #38bdf8" : "1px solid #334155",
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    1-ga-1 (Bitta port)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsBreakout(true);
                      setIsRibbon(true);
                      handleSetBreakoutCount(breakoutCount || 3);
                    }}
                    style={{
                      padding: "5px 10px",
                      borderRadius: "5px",
                      fontSize: "11px",
                      fontWeight: isBreakout ? 700 : 500,
                      background: isBreakout ? "#059669" : "#1e293b",
                      color: isBreakout ? "#ffffff" : "#6ee7b7",
                      border: isBreakout ? "1px solid #34d399" : "1px solid #334155",
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    🔀 Ajraluvchi kabel (Breakout Y-Splitter)
                  </button>
                </div>
              </div>

              {/* Breakout Settings Section */}
              {isBreakout && (
                <div
                  style={{
                    backgroundColor: "#0d1b2a",
                    border: "1px solid #059669",
                    borderRadius: "8px",
                    padding: "10px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  {/* Mode Selector (1-to-N, N-to-1, N-to-N) */}
                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#6ee7b7", marginBottom: "6px" }}>
                      Ajralish yo‘nalishi (Ikkala tomonni tanlash):
                    </label>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px" }}>
                      <button
                        type="button"
                        onClick={() => setBreakoutMode("1-to-N")}
                        style={{
                          padding: "6px 8px",
                          borderRadius: "6px",
                          fontSize: "11px",
                          fontWeight: breakoutMode === "1-to-N" ? 700 : 500,
                          backgroundColor: breakoutMode === "1-to-N" ? "#065f46" : "#1e293b",
                          color: breakoutMode === "1-to-N" ? "#ffffff" : "#cbd5e1",
                          border: breakoutMode === "1-to-N" ? "1px solid #10b981" : "1px solid #334155",
                          cursor: "pointer",
                          textAlign: "center",
                        }}
                      >
                        <div>1 ➔ N</div>
                        <div style={{ fontSize: "9px", color: breakoutMode === "1-to-N" ? "#a7f3d0" : "#94a3b8" }}>
                          1 port ➔ {breakoutCount} pin
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setBreakoutMode("N-to-1")}
                        style={{
                          padding: "6px 8px",
                          borderRadius: "6px",
                          fontSize: "11px",
                          fontWeight: breakoutMode === "N-to-1" ? 700 : 500,
                          backgroundColor: breakoutMode === "N-to-1" ? "#065f46" : "#1e293b",
                          color: breakoutMode === "N-to-1" ? "#ffffff" : "#cbd5e1",
                          border: breakoutMode === "N-to-1" ? "1px solid #10b981" : "1px solid #334155",
                          cursor: "pointer",
                          textAlign: "center",
                        }}
                      >
                        <div>N ➔ 1</div>
                        <div style={{ fontSize: "9px", color: breakoutMode === "N-to-1" ? "#a7f3d0" : "#94a3b8" }}>
                          {breakoutCount} pin ➔ 1 port
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setBreakoutMode("N-to-N")}
                        style={{
                          padding: "6px 8px",
                          borderRadius: "6px",
                          fontSize: "11px",
                          fontWeight: breakoutMode === "N-to-N" ? 700 : 500,
                          backgroundColor: breakoutMode === "N-to-N" ? "#065f46" : "#1e293b",
                          color: breakoutMode === "N-to-N" ? "#ffffff" : "#cbd5e1",
                          border: breakoutMode === "N-to-N" ? "1px solid #10b981" : "1px solid #334155",
                          cursor: "pointer",
                          textAlign: "center",
                        }}
                      >
                        <div>N ➔ N</div>
                        <div style={{ fontSize: "9px", color: breakoutMode === "N-to-N" ? "#a7f3d0" : "#94a3b8" }}>
                          Ikkala tomonda {breakoutCount} pin
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Pin Count Selector: 2 tadan 10 tagacha */}
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                      <label style={{ fontSize: "11px", fontWeight: 600, color: "#6ee7b7" }}>
                        Pinlar / tomirlar soni (2 tadan 10 tagacha):
                      </label>
                      <span style={{ fontSize: "11px", fontWeight: 700, color: "#38bdf8", fontFamily: "monospace" }}>
                        {breakoutCount} ta pin
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "4px", flexWrap: "wrap" }}>
                      <button
                        type="button"
                        onClick={() => handleSetBreakoutCount(breakoutCount - 1)}
                        disabled={breakoutCount <= 2}
                        style={{
                          width: "28px",
                          height: "28px",
                          borderRadius: "4px",
                          border: "1px solid #334155",
                          background: "#1e293b",
                          color: breakoutCount <= 2 ? "#475569" : "#f8fafc",
                          fontSize: "14px",
                          fontWeight: 700,
                          cursor: breakoutCount <= 2 ? "not-allowed" : "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        -
                      </button>

                      {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                        <button
                          key={`count_${num}`}
                          type="button"
                          onClick={() => handleSetBreakoutCount(num)}
                          style={{
                            flex: "1 0 auto",
                            minWidth: "26px",
                            height: "28px",
                            padding: "0 6px",
                            borderRadius: "4px",
                            fontSize: "12px",
                            fontWeight: breakoutCount === num ? 700 : 500,
                            backgroundColor: breakoutCount === num ? "#10b981" : "#1e293b",
                            color: breakoutCount === num ? "#ffffff" : "#94a3b8",
                            border: breakoutCount === num ? "1px solid #34d399" : "1px solid #334155",
                            cursor: "pointer",
                            transition: "all 0.15s",
                          }}
                        >
                          {num}
                        </button>
                      ))}

                      <button
                        type="button"
                        onClick={() => handleSetBreakoutCount(breakoutCount + 1)}
                        disabled={breakoutCount >= 10}
                        style={{
                          width: "28px",
                          height: "28px",
                          borderRadius: "4px",
                          border: "1px solid #334155",
                          background: "#1e293b",
                          color: breakoutCount >= 10 ? "#475569" : "#f8fafc",
                          fontSize: "14px",
                          fontWeight: 700,
                          cursor: breakoutCount >= 10 ? "not-allowed" : "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Single-side port picker for 1-to-N or N-to-1 */}
                  {breakoutMode === "1-to-N" && (
                    <div style={{ backgroundColor: "#1e293b", padding: "8px", borderRadius: "6px", border: "1px solid #334155" }}>
                      <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#38bdf8", marginBottom: "4px" }}>
                        1-tomon (Manba: {sourceInstance.customLabel || sourceInstance.name}) portini tanlang:
                      </label>
                      <select
                        style={{
                          width: "100%",
                          padding: "6px 8px",
                          backgroundColor: "#0f172a",
                          color: "#f8fafc",
                          border: "1px solid #334155",
                          borderRadius: "4px",
                          fontSize: "12px",
                        }}
                        value={selectedSourcePinFullName}
                        onChange={(e) => setSelectedSourcePinFullName(e.target.value)}
                      >
                        {sourcePins.map((p) => (
                          <option key={`src_${p.fullName}`} value={p.fullName}>
                            {p.label} [{p.type.toUpperCase()}]
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {breakoutMode === "N-to-1" && (
                    <div style={{ backgroundColor: "#1e293b", padding: "8px", borderRadius: "6px", border: "1px solid #334155" }}>
                      <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#38bdf8", marginBottom: "4px" }}>
                        2-tomon (Maqsad: {targetInstance?.customLabel || targetInstance?.name}) portini tanlang:
                      </label>
                      <select
                        style={{
                          width: "100%",
                          padding: "6px 8px",
                          backgroundColor: "#0f172a",
                          color: "#f8fafc",
                          border: "1px solid #334155",
                          borderRadius: "4px",
                          fontSize: "12px",
                        }}
                        value={targetPinFullName}
                        onChange={(e) => setTargetPinFullName(e.target.value)}
                      >
                        <option value="">-- Port / Pinni tanlang --</option>
                        {targetPins.map((p) => (
                          <option key={`tgt_${p.fullName}`} value={p.fullName}>
                            {p.label} [{p.type.toUpperCase()}]
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Multi-Pin Mapping Rows */}
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                      <span style={{ fontSize: "11px", fontWeight: 600, color: "#cbd5e1" }}>
                        {breakoutMode === "1-to-N"
                          ? `Maqsad tomondagi ${breakoutCount} ta pin:`
                          : breakoutMode === "N-to-1"
                          ? `Manba tomondagi ${breakoutCount} ta pin:`
                          : `Ikkala tomonning ${breakoutCount} ta pin juftligi:`}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (breakoutMode === "1-to-N" || breakoutMode === "N-to-N") {
                            setBreakoutTargetPins((prev) => {
                              const next = [...prev];
                              for (let i = 0; i < breakoutCount; i++) {
                                if (targetPins[i]) next[i] = targetPins[i].fullName;
                              }
                              return next;
                            });
                          }
                          if (breakoutMode === "N-to-1" || breakoutMode === "N-to-N") {
                            setBreakoutSourcePins((prev) => {
                              const next = [...prev];
                              for (let i = 0; i < breakoutCount; i++) {
                                if (sourcePins[i]) next[i] = sourcePins[i].fullName;
                              }
                              return next;
                            });
                          }
                        }}
                        style={{
                          fontSize: "10px",
                          color: "#38bdf8",
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                          textDecoration: "underline",
                        }}
                      >
                        ⚡ Ketma-ket to‘ldirish
                      </button>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {Array.from({ length: breakoutCount }).map((_, idx) => (
                        <div
                          key={`strand_row_${idx}`}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            backgroundColor: "#1e293b",
                            padding: "6px 8px",
                            borderRadius: "6px",
                            border: "1px solid #334155",
                          }}
                        >
                          {/* Color picker circle */}
                          <input
                            type="color"
                            value={strandColors[idx] || "#38bdf8"}
                            onChange={(e) => handleUpdateStrandColor(idx, e.target.value)}
                            style={{
                              width: "20px",
                              height: "20px",
                              border: "none",
                              borderRadius: "50%",
                              cursor: "pointer",
                              padding: 0,
                              background: "none",
                              flexShrink: 0,
                            }}
                            title={`Tomir #${idx + 1} rangini o‘zgartirish`}
                          />

                          <span style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", width: "20px", flexShrink: 0 }}>
                            #{idx + 1}
                          </span>

                          {/* Source side select if N-to-1 or N-to-N */}
                          {(breakoutMode === "N-to-1" || breakoutMode === "N-to-N") && (
                            <select
                              style={{
                                flex: 1,
                                minWidth: 0,
                                padding: "4px 6px",
                                backgroundColor: "#0f172a",
                                color: "#f8fafc",
                                border: "1px solid #334155",
                                borderRadius: "4px",
                                fontSize: "11px",
                              }}
                              value={breakoutSourcePins[idx] || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setBreakoutSourcePins((prev) => {
                                  const next = [...prev];
                                  next[idx] = val;
                                  return next;
                                });
                              }}
                            >
                              <option value="">-- Manba Pin --</option>
                              {sourcePins.map((pin) => (
                                <option key={`sp_${idx}_${pin.fullName}`} value={pin.fullName}>
                                  {pin.label}
                                </option>
                              ))}
                            </select>
                          )}

                          <span style={{ color: "#6ee7b7", fontSize: "12px", flexShrink: 0 }}>➔</span>

                          {/* Target side select if 1-to-N or N-to-N */}
                          {(breakoutMode === "1-to-N" || breakoutMode === "N-to-N") && (
                            <select
                              style={{
                                flex: 1,
                                minWidth: 0,
                                padding: "4px 6px",
                                backgroundColor: "#0f172a",
                                color: "#f8fafc",
                                border: "1px solid #334155",
                                borderRadius: "4px",
                                fontSize: "11px",
                              }}
                              value={breakoutTargetPins[idx] || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setBreakoutTargetPins((prev) => {
                                  const next = [...prev];
                                  next[idx] = val;
                                  return next;
                                });
                                if (idx === 0) setTargetPinFullName(val);
                              }}
                            >
                              <option value="">-- Maqsad Pin --</option>
                              {targetPins.map((pin) => (
                                <option key={`tp_${idx}_${pin.fullName}`} value={pin.fullName}>
                                  {pin.label}
                                </option>
                              ))}
                            </select>
                          )}

                          {/* Label input */}
                          <input
                            type="text"
                            value={breakoutPinLabels[idx] || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setBreakoutPinLabels((prev) => {
                                const next = [...prev];
                                next[idx] = val;
                                return next;
                              });
                            }}
                            placeholder="Signal / Pin nomi"
                            style={{
                              width: "110px",
                              padding: "4px 6px",
                              backgroundColor: "#0f172a",
                              color: "#f8fafc",
                              border: "1px solid #334155",
                              borderRadius: "4px",
                              fontSize: "11px",
                              flexShrink: 0,
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Select Target Pin (Standard 1-to-1 mode only) */}
          {targetInstance && !isBreakout && (
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
                        {type.id === "PWM"
                          ? "3-tomirli shleyf"
                          : type.id === "UART"
                          ? "3-8 tomirli"
                          : type.id === "I2C"
                          ? "4-6 tomirli (SCL/SDA)"
                          : "Shleyf"}
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
                      : cableType === "I2C"
                      ? "I2C datchik shinasi uchun 4 tadan 6 tagacha tomirli kabel (VCC, SCL soat, SDA ma'lumot, GND, INT)."
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

                          {/* Strand signal label & physical direction role indicator */}
                          <div style={{ display: "flex", flexDirection: "column", gap: "2px", width: "100%" }}>
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
                            {(() => {
                              const resolved = resolveStrandPhysicalDirection({
                                strandLabel: label,
                                sourceComponentId: sourceInstance.componentId,
                                sourceLabel: sourceInstance.customLabel,
                                targetComponentId: targetInstance?.componentId,
                                targetLabel: targetInstance?.customLabel,
                                cableFlowDirection: flowDirection,
                                strandIndex: idx,
                              });
                              const isPower = resolved.isPower;
                              const isReverse = resolved.dirSign === -1;
                              return (
                                <span
                                  style={{
                                    fontSize: "9px",
                                    color: isPower
                                      ? isReverse
                                        ? "#fbbf24"
                                        : "#f87171"
                                      : isReverse
                                      ? "#34d399"
                                      : "#38bdf8",
                                    fontFamily: "monospace",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "3px",
                                    lineHeight: 1,
                                  }}
                                >
                                  {isPower ? "⚡" : "📡"} {resolved.description}
                                </span>
                              );
                            })()}
                          </div>

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

          {/* Shaffof Silikon Shlang / Pitot Pnevmatik Naycha (Transparent Tube) */}
          <div
            style={{
              padding: "12px",
              backgroundColor: isTransparent ? "rgba(14, 116, 144, 0.18)" : "rgba(15, 23, 42, 0.7)",
              border: isTransparent ? "1px solid rgba(6, 182, 212, 0.6)" : "1px solid #334155",
              borderRadius: "8px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              boxShadow: isTransparent ? "0 0 14px rgba(6, 182, 212, 0.15)" : "none",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "6px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Droplets size={16} style={{ color: "#38bdf8" }} />
                <span style={{ fontSize: "12px", fontWeight: 600, color: "#f8fafc" }}>
                  Shaffof Silikon Shlang (Pitot Pnevmatik Naycha)
                </span>
                {isPneumaticDetected && (
                  <span
                    style={{
                      fontSize: "9px",
                      padding: "2px 6px",
                      borderRadius: "9999px",
                      backgroundColor: "rgba(14, 116, 144, 0.7)",
                      color: "#e0f2fe",
                      border: "1px solid #06b6d4",
                      fontWeight: 600,
                    }}
                  >
                    Pitot / Pnevmatika
                  </span>
                )}
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={isTransparent}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIsTransparent(checked);
                    if (checked) {
                      setIsTubing(true);
                      if (cableColor === "#000000" || cableColor === "#1e293b") {
                        setCableColor("#e0f2fe");
                      }
                    }
                  }}
                  style={{ accentColor: "#06b6d4", cursor: "pointer", width: "16px", height: "16px" }}
                />
                <span style={{ fontSize: "12px", color: isTransparent ? "#38bdf8" : "#94a3b8", fontWeight: isTransparent ? 600 : 400 }}>
                  Shaffof shlang rejimi
                </span>
              </label>
            </div>

            {isTransparent && (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", paddingTop: "4px" }}>
                {isPneumaticDetected && (
                  <div
                    style={{
                      padding: "8px 10px",
                      backgroundColor: "rgba(6, 182, 212, 0.12)",
                      border: "1px solid rgba(6, 182, 212, 0.3)",
                      borderRadius: "6px",
                      fontSize: "11px",
                      color: "#bae6fd",
                      lineHeight: "1.4",
                    }}
                  >
                    ✈️ <b>Pitot Pnevmatik Tizimi:</b> Pitot nayi (dinamik Pt va statik Ps bosimlari) hamda MS5525 havo tezligi datchigi o‘rtasidagi ulanish uchun shaffof silikon pnevmatik shlang. Shlang ichida havo oqimi zarralari yaqqol ko‘rinadi.
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ fontSize: "11px", color: "#94a3b8" }}>Shaffoflik darajasi (Opacity):</span>
                      <span style={{ fontSize: "11px", color: "#38bdf8", fontWeight: 700, fontFamily: "monospace" }}>
                        {Math.round(transparencyOpacity * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.15}
                      max={0.85}
                      step={0.05}
                      value={transparencyOpacity}
                      onChange={(e) => setTransparencyOpacity(parseFloat(e.target.value))}
                      style={{ width: "100%", accentColor: "#38bdf8", cursor: "pointer" }}
                    />
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", color: "#64748b", marginTop: "2px" }}>
                      <span>Juda tiniq (15%)</span>
                      <span>Standart (45%)</span>
                      <span>Quyuq (85%)</span>
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: "11px", color: "#94a3b8", display: "block", marginBottom: "4px" }}>
                      Tezkor silikon materiallari:
                    </span>
                    <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                      {[
                        { name: "Muzdek Tiniq", color: "#e0f2fe", opacity: 0.40 },
                        { name: "Moviy Shaffof", color: "#bae6fd", opacity: 0.45 },
                        { name: "Sutsimon Oq", color: "#f8fafc", opacity: 0.55 },
                        { name: "Sariq Silikon", color: "#fef08a", opacity: 0.40 },
                      ].map((preset) => (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => {
                            setCableColor(preset.color);
                            setTransparencyOpacity(preset.opacity);
                            if (isRibbon) {
                              setStrandColors(strandColors.map(() => preset.color));
                            }
                          }}
                          style={{
                            padding: "3px 7px",
                            borderRadius: "4px",
                            backgroundColor: "#1e293b",
                            border: cableColor === preset.color ? "1px solid #38bdf8" : "1px solid #334155",
                            color: "#e2e8f0",
                            fontSize: "10px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <span
                            style={{
                              width: "8px",
                              height: "8px",
                              borderRadius: "50%",
                              backgroundColor: preset.color,
                              opacity: preset.opacity,
                              border: "1px solid rgba(255,255,255,0.5)",
                            }}
                          />
                          {preset.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Flow & Signal Direction Selector (Oqim va Ma'lumot uzatish yo'nalishi) */}
          <div
            style={{
              padding: "12px",
              backgroundColor: "rgba(15, 23, 42, 0.7)",
              border: "1px solid rgba(139, 92, 246, 0.3)",
              borderRadius: "8px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Activity size={16} style={{ color: "#a78bfa" }} />
                <span style={{ fontSize: "12px", fontWeight: 600, color: "#f8fafc" }}>
                  Oqim va Ma'lumot uzatish yo‘nalishi (Flow Direction)
                </span>
              </div>
              <span
                style={{
                  fontSize: "10px",
                  padding: "2px 8px",
                  borderRadius: "12px",
                  backgroundColor:
                    flowDirection === "smart"
                      ? "rgba(139, 92, 246, 0.25)"
                      : flowDirection === "bidirectional"
                      ? "rgba(16, 185, 129, 0.25)"
                      : "rgba(56, 189, 248, 0.25)",
                  color:
                    flowDirection === "smart"
                      ? "#c4b5fd"
                      : flowDirection === "bidirectional"
                      ? "#6ee7b7"
                      : "#7dd3fc",
                  fontFamily: "monospace",
                  fontWeight: 600,
                }}
              >
                {flowDirection === "smart"
                  ? "⚡📡 Aqlli Datchik (Smart)"
                  : flowDirection === "bidirectional"
                  ? "⇄ Ikki tomonlama (1⇄2)"
                  : flowDirection === "reverse"
                  ? "⬅ Teskari (2➔1)"
                  : "➔ To‘g‘ri (1➔2)"}
              </span>
            </div>

            {/* Smart Sensor notice when sensor or host detected */}
            {isSensorDetected && (
              <div
                style={{
                  backgroundColor: "rgba(76, 29, 149, 0.3)",
                  border: "1px solid rgba(139, 92, 246, 0.5)",
                  borderRadius: "6px",
                  padding: "8px 10px",
                  fontSize: "11px",
                  color: "#ddd6fe",
                  lineHeight: 1.45,
                }}
              >
                <strong>⚡📡 Datchik (GPS / Sensor) aniqlandi:</strong> Avtopilotdan datchikka quvvat (5V/VCC) kiradi (qizil puls), datchikdan avtopilotga esa navigatsiya telemetriyasi (TXD/CAN) uzatiladi (ko‘k puls). Har bir sim o‘z fizik yo‘nalishida harakatlanadi.
              </div>
            )}

            {/* Direction Selection Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
              <button
                type="button"
                onClick={() => setFlowDirection("smart")}
                style={{
                  padding: "8px 6px",
                  borderRadius: "6px",
                  border: flowDirection === "smart" ? "1px solid #8b5cf6" : "1px solid #334155",
                  backgroundColor: flowDirection === "smart" ? "#6d28d9" : "#1e293b",
                  color: flowDirection === "smart" ? "#ffffff" : "#94a3b8",
                  fontSize: "11px",
                  fontWeight: flowDirection === "smart" ? 700 : 500,
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "3px",
                  textAlign: "center",
                }}
                title="Aqlli Datchik: Quvvat va ma'lumot simlari o'z fizik roliga qarab avtomatik to'g'ri oqadi"
              >
                <span style={{ fontSize: "12px" }}>⚡📡 Aqlli</span>
                <span style={{ fontSize: "9px", opacity: 0.85 }}>(Smart)</span>
              </button>

              <button
                type="button"
                onClick={() => setFlowDirection("forward")}
                style={{
                  padding: "8px 6px",
                  borderRadius: "6px",
                  border: flowDirection === "forward" ? "1px solid #0284c7" : "1px solid #334155",
                  backgroundColor: flowDirection === "forward" ? "#0369a1" : "#1e293b",
                  color: flowDirection === "forward" ? "#ffffff" : "#94a3b8",
                  fontSize: "11px",
                  fontWeight: flowDirection === "forward" ? 700 : 500,
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "3px",
                  textAlign: "center",
                }}
                title="To'g'ri oqim: 1-chi komponentdan 2-chiga qarab"
              >
                <span style={{ fontSize: "12px" }}>➔ To‘g‘ri</span>
                <span style={{ fontSize: "9px", opacity: 0.85 }}>(1➔2)</span>
              </button>

              <button
                type="button"
                onClick={() => setFlowDirection("bidirectional")}
                style={{
                  padding: "8px 6px",
                  borderRadius: "6px",
                  border: flowDirection === "bidirectional" ? "1px solid #10b981" : "1px solid #334155",
                  backgroundColor: flowDirection === "bidirectional" ? "#047857" : "#1e293b",
                  color: flowDirection === "bidirectional" ? "#ffffff" : "#94a3b8",
                  fontSize: "11px",
                  fontWeight: flowDirection === "bidirectional" ? 700 : 500,
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "3px",
                  textAlign: "center",
                }}
                title="Ikki tomonlama: CAN, UART TX/RX kabi signallar ikkala tomonga parallel uzatiladi"
              >
                <span style={{ fontSize: "12px" }}>⇄ Ikki tomonlama</span>
                <span style={{ fontSize: "9px", opacity: 0.85 }}>(1⇄2)</span>
              </button>

              <button
                type="button"
                onClick={() => setFlowDirection("reverse")}
                style={{
                  padding: "8px 6px",
                  borderRadius: "6px",
                  border: flowDirection === "reverse" ? "1px solid #d97706" : "1px solid #334155",
                  backgroundColor: flowDirection === "reverse" ? "#b45309" : "#1e293b",
                  color: flowDirection === "reverse" ? "#ffffff" : "#94a3b8",
                  fontSize: "11px",
                  fontWeight: flowDirection === "reverse" ? 700 : 500,
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "3px",
                  textAlign: "center",
                }}
                title="Teskari: 2-chi komponentdan 1-chi komponentga qarab"
              >
                <span style={{ fontSize: "12px" }}>⬅ Teskari</span>
                <span style={{ fontSize: "9px", opacity: 0.85 }}>(2➔1)</span>
              </button>
            </div>
          </div>

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
