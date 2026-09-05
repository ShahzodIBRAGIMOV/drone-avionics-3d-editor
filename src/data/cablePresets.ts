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
  isBidirectionalDefault?: boolean;
  isTransparentDefault?: boolean;
  defaultOpacity?: number;
  isTubingDefault?: boolean;
}

export const QUICK_STRAND_COLORS = [
  { name: "Shaffof Muz (Silikon)", hex: "#e0f2fe" },
  { name: "Shaffof Zangori", hex: "#bae6fd" },
  { name: "Shaffof Oqish", hex: "#f1f5f9" },
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
    isBidirectionalDefault: true,
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
    isBidirectionalDefault: true,
    defaultColors: ["#ef4444", "#10b981", "#eab308", "#1e293b", "#38bdf8", "#64748b"],
    defaultLabels: ["VCC (+5V)", "CAN_H (High)", "CAN_L (Low)", "GND (Massa)", "Shield / Zamin", "Aux"],
  },
  {
    id: "I2C",
    label: "I2C Shina (Datchiklar)",
    color: "#06b6d4",
    defaultGauge: "28 AWG",
    isRibbonDefault: true,
    minStrands: 4,
    maxStrands: 6,
    defaultStrands: 4,
    isBidirectionalDefault: true,
    defaultColors: [
      "#ef4444", // VCC (+5V / +3.3V)
      "#eab308", // SCL (I2C Soat / Master Clock)
      "#38bdf8", // SDA (I2C Ma'lumot / Bidirectional Data)
      "#1e293b", // GND (Massa)
      "#10b981", // INT / DRDY (Tayyorlik signali)
      "#a855f7", // RST / WAKE (Tiklash)
    ],
    defaultLabels: [
      "VCC (+5V / +3.3V)",
      "SCL (I2C Soat signali)",
      "SDA (I2C Ma'lumot signali)",
      "GND (Massa)",
      "INT / DRDY (Tayyorlik signali)",
      "RST / WAKE (Tiklash)",
    ],
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
    isBidirectionalDefault: false,
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
    isBidirectionalDefault: true,
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
    label: "Pitot Shaffof Shlang (Pnevmatik)",
    color: "#e0f2fe",
    defaultGauge: "Silicone Tube 2.5/4.0mm",
    isRibbonDefault: true,
    minStrands: 1,
    maxStrands: 2,
    defaultStrands: 2,
    isTransparentDefault: true,
    defaultOpacity: 0.45,
    isTubingDefault: true,
    defaultColors: ["#e0f2fe", "#bae6fd"],
    defaultLabels: ["Dinamik bosim nayi (Dynamic Pt)", "Statik bosim nayi (Static Ps)"],
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

/**
 * Returns true if a given cable type inherently supports or defaults to bidirectional data transfer
 * (e.g. CAN bus, UART telemetry full-duplex, Ethernet, I2C, SPI, USB).
 */
export function isBidirectionalCableType(type?: string): boolean {
  if (!type) return false;
  const t = type.toUpperCase();
  return (
    t === "UART" ||
    t === "CAN" ||
    t === "ETHERNET" ||
    t === "I2C" ||
    t === "SPI" ||
    t === "USB" ||
    t.includes("TELEM") ||
    t.includes("MAVLINK")
  );
}

/**
 * Returns true if a given pin's electrical type or label indicates bidirectional data bus
 */
export function isBidirectionalPin(pinType?: string, pinLabel?: string): boolean {
  if (!pinType && !pinLabel) return false;
  const t = (pinType || "").toLowerCase();
  const l = (pinLabel || "").toLowerCase();
  return (
    t === "can" ||
    t === "uart" ||
    t === "ethernet" ||
    t === "i2c" ||
    t === "spi" ||
    t === "usb" ||
    l.includes("can") ||
    l.includes("tx") ||
    l.includes("rx") ||
    l.includes("telem") ||
    l.includes("mavlink") ||
    l.includes("sda") ||
    l.includes("scl")
  );
}

/**
 * Datchik / periferiya qurilmasi ekanligini aniqlash (GPS, havo tezligi datchigi, kompas, kamera va h.k.)
 * Bunday qurilmalar avtopilot yoki BECdan quvvat (VCC/GND) OLADI va o'lchov ma'lumotlarini (TX, Data, CAN) UZATADI.
 */
export function isSensorComponent(componentId?: string, label?: string): boolean {
  if (!componentId && !label) return false;
  const id = componentId || "";
  const l = (label || "").toLowerCase();

  // Aniq datchik/periferiya ID lari:
  // 03: Here3 GPS & Compass
  // 13: Pitot Tube
  // 14: MS5525DSO Airspeed Sensor
  // 04: MK32 HM30 Air Unit (Telemetry/Receiver)
  // 05: SIYI ZR10 Gimbal Camera
  // 12: Savox Servolar
  // 16: E-Stop / Xavfsizlik tugmasi
  if (
    id === "03" ||
    id === "13" ||
    id === "14" ||
    id === "04" ||
    id === "05" ||
    id === "12" ||
    id === "16"
  ) {
    return true;
  }

  return (
    l.includes("gps") ||
    l.includes("here3") ||
    l.includes("compass") ||
    l.includes("mag") ||
    l.includes("airspeed") ||
    l.includes("pitot") ||
    l.includes("ms5525") ||
    l.includes("datchik") ||
    l.includes("sensor") ||
    l.includes("camera") ||
    l.includes("kamera") ||
    l.includes("gimbal") ||
    l.includes("sonar") ||
    l.includes("lidar") ||
    l.includes("optical") ||
    l.includes("flow") ||
    l.includes("servo") ||
    l.includes("baro")
  );
}

export function isPitotComponent(componentId?: string, label?: string): boolean {
  if (!componentId && !label) return false;
  const id = componentId || "";
  const l = (label || "").toLowerCase();
  return id === "13" || l.includes("pitot");
}

export function isAirspeedSensorComponent(componentId?: string, label?: string): boolean {
  if (!componentId && !label) return false;
  const id = componentId || "";
  const l = (label || "").toLowerCase();
  return id === "14" || l.includes("airspeed") || l.includes("ms5525");
}

export function isPneumaticOrPitotConnection(
  sourceComponentId?: string,
  sourceLabel?: string,
  sourcePinType?: string,
  targetComponentId?: string,
  targetLabel?: string,
  targetPinType?: string
): boolean {
  if (sourcePinType === "pneumatic" || targetPinType === "pneumatic") return true;
  const srcPitot = isPitotComponent(sourceComponentId, sourceLabel);
  const tgtPitot = isPitotComponent(targetComponentId, targetLabel);
  const srcAir = isAirspeedSensorComponent(sourceComponentId, sourceLabel);
  const tgtAir = isAirspeedSensorComponent(targetComponentId, targetLabel);
  return (srcPitot && tgtAir) || (tgtPitot && srcAir) || srcPitot || tgtPitot;
}

/**
 * Quvvat manbai yoki avtopilot (host) ekanligini aniqlash (Batareya, BEC, PM07, Cube Orange)
 */
export function isPowerProviderComponent(componentId?: string, label?: string): boolean {
  if (!componentId && !label) return false;
  const id = componentId || "";
  const l = (label || "").toLowerCase();

  // 02: Cube Orange (sensors/GPS ga 5V/5.3V beradi)
  // 06: Matek BEC12S Pro
  // 07: PM07 Power Module / PDB
  // 08: TATTU Main Battery
  // 09: 4S Avionics Battery
  // 18: UBEC
  // 20: SIYI BEC
  // 19: Jetson Orin (Companion host)
  if (
    id === "02" ||
    id === "06" ||
    id === "07" ||
    id === "08" ||
    id === "09" ||
    id === "18" ||
    id === "20" ||
    id === "19"
  ) {
    return true;
  }

  return (
    l.includes("cube") ||
    l.includes("autopilot") ||
    l.includes("flight controller") ||
    l.includes("fc") ||
    l.includes("bec") ||
    l.includes("battery") ||
    l.includes("batareya") ||
    l.includes("pm07") ||
    l.includes("power module") ||
    l.includes("pdb") ||
    l.includes("ubec") ||
    l.includes("jetson")
  );
}

/**
 * Sim tomiri quvvat (VCC / GND) ekanligini aniqlash
 */
export function isPowerStrandLabel(label?: string): boolean {
  if (!label) return false;
  const l = label.toLowerCase();
  return (
    l.includes("vcc") ||
    l.includes("+5v") ||
    l.includes("+3.3v") ||
    l.includes("5v") ||
    l.includes("3.3v") ||
    l.includes("12v") ||
    l.includes("24v") ||
    l.includes("bat") ||
    l.includes("vin") ||
    l.includes("vout") ||
    l.includes("pwr") ||
    l.includes("pos") ||
    l.includes("quvvat") ||
    l.includes("+") ||
    l.includes("gnd") ||
    l.includes("massa") ||
    l.includes("ground") ||
    l.includes("-")
  );
}

/**
 * Sim tomiri datchik o'lchov ma'lumoti / uzatish (TX, Data, CAN, Signal) ekanligini aniqlash
 */
export function isSensorDataStrandLabel(label?: string): boolean {
  if (!label) return false;
  const l = label.toLowerCase();
  return (
    l.includes("tx") ||
    l.includes("txd") ||
    l.includes("can_h") ||
    l.includes("can_l") ||
    l.includes("data") ||
    l.includes("signal") ||
    l.includes("sda") ||
    l.includes("scl") ||
    l.includes("out") ||
    l.includes("uzatish") ||
    l.includes("pwm") ||
    l.includes("sens") ||
    l.includes("statik") ||
    l.includes("dinamik") ||
    l.includes("video")
  );
}

/**
 * Sim tomiri qabul qilish / buyruq (RX, Config, RTK, CMD) ekanligini aniqlash
 */
export function isConfigReceiveStrandLabel(label?: string): boolean {
  if (!label) return false;
  const l = label.toLowerCase();
  return (
    l.includes("rx") ||
    l.includes("rxd") ||
    l.includes("in") ||
    l.includes("qabul") ||
    l.includes("cmd") ||
    l.includes("config") ||
    l.includes("rtk")
  );
}

/**
 * Sim tomiri I2C SCL (soat impulsi) ekanligini aniqlash.
 * Master (Autopilot / Host) dan Slave (Datchik) ga qarab tarqaladi.
 */
export function isI2CClockStrandLabel(label?: string): boolean {
  if (!label) return false;
  const l = label.toLowerCase();
  return l.includes("scl") || l.includes("clock") || l.includes("soat") || l.includes("clk");
}

/**
 * Sim tomiri I2C SDA (ikki tomonlama ma'lumot) ekanligini aniqlash.
 */
export function isI2CDataStrandLabel(label?: string): boolean {
  if (!label) return false;
  const l = label.toLowerCase();
  return l.includes("sda") || l.includes("i2c_data") || l.includes("i2c data");
}

export type PhysicalStrandDirection = {
  // 1: Source -> Target (1 -> 2)
  // -1: Target -> Source (2 -> 1)
  dirSign: 1 | -1;
  isPower: boolean;
  flowRole:
    | "power_supply"
    | "sensor_data"
    | "config_command"
    | "bidirectional_bus"
    | "standard"
    | "pneumatic_dynamic"
    | "pneumatic_static"
    | "i2c_clock"
    | "i2c_data";
  description: string;
};

/**
 * Lentali va ko'p tomirli kabellarda har bir simning real fizik oqim yo'nalishini hisoblash:
 * - GPS va boshqa datchiklar: Quvvatni (5V/GND) avtopilot/BEC dan QABUL QILADI (Host -> Datchik).
 * - O'lchov ma'lumotlari (TX, CAN, Signal): Datchikdan avtopilotga UZATILADI (Datchik -> Host).
 * - RTK / Konfiguratsiya buyruqlari (RX): Avtopilotdan datchikka UZATILADI (Host -> Datchik).
 * - I2C SCL (Master Clock): Doimo Avtopilotdan datchikka yuboriladi (Host -> Datchik).
 * - I2C SDA (Ma'lumot): Datchikdan avtopilotga o'lchov telemetriyasi oqadi (Datchik -> Host).
 */
export function resolveStrandPhysicalDirection(params: {
  strandLabel?: string;
  sourceComponentId?: string;
  sourceLabel?: string;
  targetComponentId?: string;
  targetLabel?: string;
  cableFlowDirection?: "forward" | "reverse" | "bidirectional" | "smart";
  strandIndex?: number;
}): PhysicalStrandDirection {
  const {
    strandLabel = "",
    sourceComponentId = "",
    sourceLabel = "",
    targetComponentId = "",
    targetLabel = "",
    cableFlowDirection = "smart",
    strandIndex = 0,
  } = params;

  const isPower = isPowerStrandLabel(strandLabel);
  const isSensorData = isSensorDataStrandLabel(strandLabel);
  const isConfig = isConfigReceiveStrandLabel(strandLabel);
  const isI2CClock = isI2CClockStrandLabel(strandLabel);
  const isI2CData = isI2CDataStrandLabel(strandLabel);

  const srcIsSensor = isSensorComponent(sourceComponentId, sourceLabel);
  const tgtIsSensor = isSensorComponent(targetComponentId, targetLabel);
  const srcIsHost = isPowerProviderComponent(sourceComponentId, sourceLabel);
  const tgtIsHost = isPowerProviderComponent(targetComponentId, targetLabel);

  const isSensorHostConnection = (srcIsSensor && tgtIsHost) || (tgtIsSensor && srcIsHost);

  const srcIsPitot = isPitotComponent(sourceComponentId, sourceLabel);
  const tgtIsPitot = isPitotComponent(targetComponentId, targetLabel);
  const isPitotPneumatic =
    srcIsPitot ||
    tgtIsPitot ||
    strandLabel.toLowerCase().includes("dinamik") ||
    strandLabel.toLowerCase().includes("statik") ||
    strandLabel.toLowerCase().includes("pitot") ||
    strandLabel.toLowerCase().includes("bosim");

  if (isPitotPneumatic) {
    if (srcIsPitot) {
      return {
        dirSign: 1,
        isPower: false,
        flowRole: "sensor_data",
        description: "Pitot nayidan datchikka dinamik/statik havo bosimi (1➔2)",
      };
    } else if (tgtIsPitot) {
      return {
        dirSign: -1,
        isPower: false,
        flowRole: "sensor_data",
        description: "Pitot trubkasidan datchikka havo bosimi oqimi (2➔1)",
      };
    }
  }

  // Agar foydalanuvchi "smart" yoki datchik aloqasini tanlagan bo'lsa (yoki default rejimda datchik bo'lsa):
  if (isSensorHostConnection && (cableFlowDirection === "smart" || cableFlowDirection === "bidirectional")) {
    if (srcIsSensor && tgtIsHost) {
      // 1-element: Datchik (GPS / Airspeed / Compass), 2-element: Host (Cube Orange / PM07 / BEC)
      if (isPower) {
        // Quvvat: Hostdan datchikka kiradi (2 -> 1, ya'ni Target -> Source)
        return {
          dirSign: -1,
          isPower: true,
          flowRole: "power_supply",
          description: "Avtopilotdan datchikka quvvat kirmoqda (2➔1)",
        };
      }
      if (isI2CClock) {
        // I2C SCL Master Clock: Host (Avtopilot) dan datchikka uzatiladi (2 -> 1)
        return {
          dirSign: -1,
          isPower: false,
          flowRole: "i2c_clock",
          description: "Avtopilotdan datchikka I2C SCL soat impulslari (2➔1)",
        };
      }
      if (isI2CData) {
        // I2C SDA Telemetriya: Datchikdan avtopilotga o'lchov ma'lumoti uzatiladi (1 -> 2)
        return {
          dirSign: 1,
          isPower: false,
          flowRole: "i2c_data",
          description: "Datchikdan avtopilotga I2C SDA o'lchov ma'lumoti (1➔2)",
        };
      }
      if (isConfig) {
        // Buyruq / RTK / RX: Hostdan datchikka uzatiladi (2 -> 1)
        return {
          dirSign: -1,
          isPower: false,
          flowRole: "config_command",
          description: "Avtopilotdan datchikka konfiguratsiya buyrug‘i (2➔1)",
        };
      }
      // Sensor Data (TXD, CAN, o'lchov signali): Datchikdan avtopilotga uzatiladi (1 -> 2, Source -> Target)
      return {
        dirSign: 1,
        isPower: false,
        flowRole: "sensor_data",
        description: "Datchikdan avtopilotga navigatsiya ma'lumoti uzatilmoqda (1➔2)",
      };
    } else if (srcIsHost && tgtIsSensor) {
      // 1-element: Host (Cube Orange / PM07 / BEC), 2-element: Datchik (GPS / Airspeed / Compass)
      if (isPower) {
        // Quvvat: Hostdan datchikka kiradi (1 -> 2, ya'ni Source -> Target)
        return {
          dirSign: 1,
          isPower: true,
          flowRole: "power_supply",
          description: "Avtopilotdan datchikka quvvat uzatilmoqda (1➔2)",
        };
      }
      if (isI2CClock) {
        // I2C SCL Master Clock: Host (Avtopilot) dan datchikka boradi (1 -> 2)
        return {
          dirSign: 1,
          isPower: false,
          flowRole: "i2c_clock",
          description: "Avtopilotdan datchikka I2C SCL soat impulslari (1➔2)",
        };
      }
      if (isI2CData) {
        // I2C SDA Telemetriya: Datchikdan avtopilotga keladi (2 -> 1)
        return {
          dirSign: -1,
          isPower: false,
          flowRole: "i2c_data",
          description: "Datchikdan avtopilotga I2C SDA o'lchov ma'lumoti (2➔1)",
        };
      }
      if (isConfig) {
        // Buyruq / RTK / RX: Hostdan datchikka uzatiladi (1 -> 2)
        return {
          dirSign: 1,
          isPower: false,
          flowRole: "config_command",
          description: "Avtopilotdan datchikka buyruq yuborilmoqda (1➔2)",
        };
      }
      // Sensor Data (TXD, CAN, o'lchov signali): Datchikdan avtopilotga oqadi (2 -> 1, Target -> Source)
      return {
        dirSign: -1,
        isPower: false,
        flowRole: "sensor_data",
        description: "Datchikdan avtopilotga ma'lumot oqmoqda (2➔1)",
      };
    }
  }

  // Agar datchik bo'lmasa, lekin kabel ikki tomonlama (bidirectional) bo'lsa:
  if (cableFlowDirection === "bidirectional") {
    if (isI2CClock) {
      return {
        dirSign: 1,
        isPower: false,
        flowRole: "i2c_clock",
        description: "I2C SCL soat impulslari (1➔2)",
      };
    }
    if (isI2CData) {
      return {
        dirSign: -1,
        isPower: false,
        flowRole: "i2c_data",
        description: "I2C SDA ma'lumot oqimi (2➔1)",
      };
    }
    if (isConfig) {
      return {
        dirSign: -1,
        isPower,
        flowRole: "config_command",
        description: "Qabul qilish / teskari yo‘nalish (2➔1)",
      };
    }
    if (isSensorData && !isPower) {
      return {
        dirSign: 1,
        isPower,
        flowRole: "sensor_data",
        description: "Uzatish / to‘g‘ri yo‘nalish (1➔2)",
      };
    }
    // Navbatma-navbat yo'nalish (interleaving)
    const sign: 1 | -1 = strandIndex % 2 === 0 ? 1 : -1;
    return {
      dirSign: sign,
      isPower,
      flowRole: "bidirectional_bus",
      description: sign === 1 ? "To‘g‘ri oqim (1➔2)" : "Qaytish oqimi (2➔1)",
    };
  }

  // Qo'lda ko'rsatilgan bir tomonlama rejimlar:
  if (cableFlowDirection === "reverse") {
    return {
      dirSign: -1,
      isPower,
      flowRole: "standard",
      description: "Teskari oqim (2➔1)",
    };
  }

  // Standart to'g'ri rejim (forward):
  return {
    dirSign: 1,
    isPower,
    flowRole: "standard",
    description: "To‘g‘ri oqim (1➔2)",
  };
}
