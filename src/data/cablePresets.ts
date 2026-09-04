export interface CableTypePreset {
  id: string;
  label: string;
  color: string;
  defaultGauge: string;
  isRibbonDefault: boolean;
  minStrands: number;
  maxStrands: number;
  defaultStrands: number;
  defaultColors: string[];
  defaultLabels: string[];
}

export const QUICK_STRAND_COLORS = [
  { name: "Qizil", hex: "#ef4444" },
  { name: "Qora", hex: "#1e293b" },
  { name: "Sariq", hex: "#eab308" },
  { name: "Oq", hex: "#f8fafc" },
  { name: "Yashil", hex: "#10b981" },
  { name: "Moviy", hex: "#38bdf8" },
  { name: "To'q sariq", hex: "#f97316" },
  { name: "Jigarrang", hex: "#854d0e" },
  { name: "Binafsha", hex: "#a855f7" },
  { name: "Ko'k", hex: "#2563eb" },
  { name: "Kulrang", hex: "#64748b" },
];

export const CABLE_TYPES_CONFIG: CableTypePreset[] = [
  {
    id: "PWM",
    label: "PWM / Servo Signal",
    color: "#eab308",
    defaultGauge: "22 AWG",
    isRibbonDefault: true,
    minStrands: 3,
    maxStrands: 4,
    defaultStrands: 3,
    defaultColors: ["#f59e0b", "#ef4444", "#1e293b"], // Sariq (Signal), Qizil (V+), Qora (GND)
    defaultLabels: ["Signal (PWM)", "VCC (+5V/+6V)", "GND (Massa)"],
  },
  {
    id: "UART",
    label: "UART Telemetriya",
    color: "#38bdf8",
    defaultGauge: "26 AWG",
    isRibbonDefault: true,
    minStrands: 3,
    maxStrands: 8,
    defaultStrands: 4,
    defaultColors: [
      "#ef4444", // VCC
      "#10b981", // TX
      "#f8fafc", // RX
      "#1e293b", // GND
      "#38bdf8", // CTS (5-tomir)
      "#eab308", // RTS (6-tomir)
      "#a855f7", // DTR (7-tomir)
      "#f97316", // DSR (8-tomir)
    ],
    defaultLabels: [
      "VCC (+5V / Quvvat)",
      "TXD (Uzatish)",
      "RXD (Qabul)",
      "GND (Massa)",
      "CTS (Oqim nazorati)",
      "RTS (Uzatishga tayyor)",
      "DTR (Ma'lumot terminali)",
      "DSR (Tayyorlik signali)",
    ],
  },
  {
    id: "CAN",
    label: "CAN Shina (Twisted / Flat)",
    color: "#10b981",
    defaultGauge: "24 AWG",
    isRibbonDefault: true,
    minStrands: 2,
    maxStrands: 6,
    defaultStrands: 4,
    defaultColors: ["#ef4444", "#10b981", "#eab308", "#1e293b", "#38bdf8", "#64748b"],
    defaultLabels: ["VCC (+5V)", "CAN_H (High)", "CAN_L (Low)", "GND (Massa)", "Shield / Zamin", "Aux"],
  },
  {
    id: "Power",
    label: "Quvvat (DC Power)",
    color: "#ef4444",
    defaultGauge: "16 AWG",
    isRibbonDefault: true,
    minStrands: 2,
    maxStrands: 4,
    defaultStrands: 2,
    defaultColors: ["#ef4444", "#1e293b", "#eab308", "#38bdf8"],
    defaultLabels: ["V+ (Musbat quvvat)", "GND (Manfiy / Massa)", "Current Sense", "Voltage Sense"],
  },
  {
    id: "Ethernet",
    label: "Ethernet Tarmoq",
    color: "#a855f7",
    defaultGauge: "24 AWG",
    isRibbonDefault: true,
    minStrands: 4,
    maxStrands: 8,
    defaultStrands: 4,
    defaultColors: [
      "#f97316", // TX+ (To'q sariq)
      "#fed7aa", // TX- (Oq-to'q sariq)
      "#10b981", // RX+ (Yashil)
      "#bbf7d0", // RX- (Oq-yashil)
      "#38bdf8", // Blue
      "#bae6fd", // White-Blue
      "#854d0e", // Brown
      "#fef08a", // White-Brown
    ],
    defaultLabels: ["TX+", "TX-", "RX+", "RX-", "Pair 4+", "Pair 4-", "Pair 1+", "Pair 1-"],
  },
  {
    id: "Airspeed",
    label: "Pitot / Pnevmatik",
    color: "#06b6d4",
    defaultGauge: "Pneumatic Tube",
    isRibbonDefault: false,
    minStrands: 1,
    maxStrands: 2,
    defaultStrands: 2,
    defaultColors: ["#06b6d4", "#38bdf8"],
    defaultLabels: ["Dinamik bosim trubkasi", "Statik bosim trubkasi"],
  },
  {
    id: "Other",
    label: "Boshqa Umumiy Sim",
    color: "#94a3b8",
    defaultGauge: "22 AWG",
    isRibbonDefault: false,
    minStrands: 2,
    maxStrands: 12,
    defaultStrands: 3,
    defaultColors: [
      "#ef4444",
      "#38bdf8",
      "#1e293b",
      "#10b981",
      "#eab308",
      "#f97316",
      "#a855f7",
      "#f8fafc",
      "#854d0e",
      "#64748b",
      "#ec4899",
      "#14b8a6",
    ],
    defaultLabels: [
      "1-tomir",
      "2-tomir",
      "3-tomir",
      "4-tomir",
      "5-tomir",
      "6-tomir",
      "7-tomir",
      "8-tomir",
      "9-tomir",
      "10-tomir",
      "11-tomir",
      "12-tomir",
    ],
  },
];

export function getPresetForCableType(cableType: string): CableTypePreset {
  const found = CABLE_TYPES_CONFIG.find(
    (t) => t.id.toLowerCase() === cableType.toLowerCase()
  );
  if (found) return found;

  return CABLE_TYPES_CONFIG[CABLE_TYPES_CONFIG.length - 1]; // Other
}

export function getDefaultStrandColors(cableType: string, count: number): string[] {
  const preset = getPresetForCableType(cableType);
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    if (i < preset.defaultColors.length) {
      result.push(preset.defaultColors[i]);
    } else {
      const fallback = QUICK_STRAND_COLORS[i % QUICK_STRAND_COLORS.length].hex;
      result.push(fallback);
    }
  }
  return result;
}

export function getDefaultStrandLabels(cableType: string, count: number): string[] {
  const preset = getPresetForCableType(cableType);
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    if (i < preset.defaultLabels.length) {
      result.push(preset.defaultLabels[i]);
    } else {
      result.push(`${i + 1}-tomir`);
    }
  }
  return result;
}

export const STICKER_BG_COLORS = [
  { name: "Aviatsiya Sariq", hex: "#facc15" },
  { name: "Standart Oq", hex: "#ffffff" },
  { name: "Signal To'q sariq", hex: "#f97316" },
  { name: "Sian Moviy", hex: "#38bdf8" },
  { name: "Yashil", hex: "#10b981" },
  { name: "Qizil Xavfsizlik", hex: "#ef4444" },
  { name: "Kulrang / Kumush", hex: "#cbd5e1" },
];

export const STICKER_STYLES = [
  { id: "flag", label: "3D Bayroqcha (Flag Tag)", desc: "Kabeldan chiqib turuvchi 3D yassi shtiker plastinkasi" },
  { id: "heatshrink", label: "3D Termousadka (Sleeve)", desc: "Kabelga o‘ralgan silindrsimon 3D termousadka" },
  { id: "clip", label: "3D Plastik Klipsa (Clip-On)", desc: "Kabelga mahkamlanuvchi 3D klipsali yorliq" },
  { id: "wrap", label: "3D O‘ralgan Lenta (Wrap)", desc: "Kabel atrofiga qatlamli o‘ralgan 3D yorliq" },
] as const;

export function generateDefaultStickerLabels(
  sourceInstanceLabel: string,
  sourcePinId: string,
  targetInstanceLabel?: string,
  targetPinId?: string
) {
  const cleanSrc = (sourceInstanceLabel || "SRC").replace(/\s+/g, "_").toUpperCase();
  const cleanTgt = (targetInstanceLabel || "TGT").replace(/\s+/g, "_").toUpperCase();
  return {
    sourceText: `${cleanSrc}:${sourcePinId || "P1"}`,
    targetText: `${cleanTgt}:${targetPinId || "P2"}`,
  };
}
