import React, { useState } from "react";
import {
  X,
  Link2,
  Zap,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Cable as CableIcon,
} from "lucide-react";
import { PhysicalInstance, CableConnection, PinDefinition } from "../types";
import { COMPONENT_PINS } from "../data/pinDefinitions";

interface CableConnectModalProps {
  sourceInstance: PhysicalInstance;
  sourcePin: PinDefinition;
  placedInstances: PhysicalInstance[];
  onConnect: (connection: Omit<CableConnection, "id">) => void;
  onClose: () => void;
}

const CABLE_TYPES = [
  { id: "CAN", label: "CAN Shina (Twisted)", color: "#10b981", defaultGauge: "24 AWG" },
  { id: "Power", label: "Quvvat (DC Power)", color: "#ef4444", defaultGauge: "16 AWG" },
  { id: "PWM", label: "PWM / Servo Signal", color: "#eab308", defaultGauge: "22 AWG" },
  { id: "UART", label: "UART Telemetriya", color: "#38bdf8", defaultGauge: "26 AWG" },
  { id: "Ethernet", label: "Ethernet Tarmoq", color: "#a855f7", defaultGauge: "24 AWG" },
  { id: "Airspeed", label: "Pitot / Pnevmatik", color: "#06b6d4", defaultGauge: "Pneumatic Tube" },
  { id: "Other", label: "Boshqa Umumiy Sim", color: "#94a3b8", defaultGauge: "22 AWG" },
];

export const CableConnectModal: React.FC<CableConnectModalProps> = ({
  sourceInstance,
  sourcePin,
  placedInstances,
  onConnect,
  onClose,
}) => {
  const [targetInstanceId, setTargetInstanceId] = useState<string>("");
  const [targetPinFullName, setTargetPinFullName] = useState<string>("");
  const [cableType, setCableType] = useState<string>("CAN");
  const [wireGauge, setWireGauge] = useState<string>("24 AWG");
  const [cableColor, setCableColor] = useState<string>("#10b981");
  const [customName, setCustomName] = useState<string>("");

  const targetInstance = placedInstances.find((i) => i.instanceId === targetInstanceId);
  const targetPins: PinDefinition[] = targetInstance
    ? targetInstance.customPins && targetInstance.customPins.length > 0
      ? targetInstance.customPins
      : COMPONENT_PINS[targetInstance.componentId] || []
    : [];

  const targetPin = targetPins.find((p) => p.fullName === targetPinFullName);

  const handleTypeSelect = (typeId: string) => {
    setCableType(typeId);
    const found = CABLE_TYPES.find((t) => t.id === typeId);
    if (found) {
      setCableColor(found.color);
      setWireGauge(found.defaultGauge);
    }
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
      color: cableColor,
      cableType,
      wireGauge,
    });

    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-dialog cable-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "560px", width: "95%" }}
      >
        <div className="modal-header">
          <div className="modal-title-row">
            <Link2 className="text-cyan" size={18} />
            <div>
              <h3 style={{ margin: 0 }}>Kabel Ulanishini O‘rnatish</h3>
              <p style={{ margin: 0, fontSize: "11px", color: "#94a3b8" }}>
                Komponentlar o‘rtasida elektr yoki signal marshrutini o‘tkazish
              </p>
            </div>
          </div>
          <button className="btn-close-modal" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body" style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Endpoints preview */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: "12px", backgroundColor: "#0f172a", padding: "12px", borderRadius: "8px", border: "1px solid #1e293b" }}>
            {/* Source */}
            <div>
              <span style={{ fontSize: "10px", color: "#94a3b8", textTransform: "uppercase" }}>Chiqish Porti (Manba):</span>
              <div style={{ fontWeight: 600, color: "#f8fafc", fontSize: "13px" }}>{sourceInstance.customLabel}</div>
              <div style={{ fontSize: "11px", color: "#38bdf8", marginTop: "2px" }}>
                {sourcePin.label} ({sourcePin.type})
              </div>
            </div>

            <ArrowRight size={18} style={{ color: "#64748b" }} />

            {/* Target */}
            <div>
              <span style={{ fontSize: "10px", color: "#94a3b8", textTransform: "uppercase" }}>Kirish Porti (Qabul qiluvchi):</span>
              <div style={{ fontWeight: 600, color: targetInstance ? "#f8fafc" : "#64748b", fontSize: "13px" }}>
                {targetInstance ? targetInstance.customLabel : "Tanlanmagan"}
              </div>
              <div style={{ fontSize: "11px", color: targetPin ? "#38bdf8" : "#64748b", marginTop: "2px" }}>
                {targetPin ? `${targetPin.label} (${targetPin.type})` : "Port tanlang"}
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
                    {inst.customLabel} ({inst.instanceId})
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
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "8px" }}>
              {CABLE_TYPES.map((type) => (
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
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      backgroundColor: type.color,
                      flexShrink: 0,
                    }}
                  />
                  <span>{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Color & Gauge */}
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
              placeholder="Masalan: Asosiy CAN shina #1"
            />
          </div>
        </div>

        <div className="modal-footer" style={{ display: "flex", justifyContent: "flex-end", gap: "10px", padding: "12px 16px", borderTop: "1px solid #1e293b" }}>
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
            Ulashni o‘rnatish
          </button>
        </div>
      </div>
    </div>
  );
};
