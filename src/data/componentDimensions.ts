import { modelManager } from "../services/modelManager";

export interface ComponentDimensionMeta {
  componentId: string;
  name: string;
  nominalMm: [number, number, number]; // [X (Width/Eni), Y (Height/Balandlik), Z (Length/Bo'yi)]
  axisDescriptions: {
    x: string;
    y: string;
    z: string;
  };
  datasheetRef: string;
}

export const VERIFIED_COMPONENT_DIMENSIONS: Record<string, ComponentDimensionMeta> = {
  "01": {
    componentId: "01",
    name: "Dron korpusi (Airframe 3800mm)",
    nominalMm: [3800.0, 717.0, 2550.0],
    axisDescriptions: {
      x: "Qanot qulochi (Wingspan)",
      y: "Vertikal balandlik (Kil)",
      z: "Fuzelyaj uzunligi (Burundan dumgacha)",
    },
    datasheetRef: "Twin-Motor UAV 3.8m Approved GLB CAD Specifications",
  },
  "02": {
    componentId: "02",
    name: "Cube Orange ADS-B Parvoz Kontrolleri",
    nominalMm: [94.0, 22.5, 44.0],
    axisDescriptions: {
      x: "Kengligi (Eni)",
      y: "Balandligi (Plata + Kubik)",
      z: "Uzunligi (Bo'yi)",
    },
    datasheetRef: "Cubepilot Cube Orange+ with Standard Carrier Board",
  },
  "03": {
    componentId: "03",
    name: "Here3+ Yuqori Aniq GNSS GPS / Kompas",
    nominalMm: [76.0, 22.0, 76.0],
    axisDescriptions: {
      x: "Gumbaz diametri (X)",
      y: "Vertikal qalinlik (Y)",
      z: "Gumbaz diametri (Z)",
    },
    datasheetRef: "Cubepilot Here3 / Here3+ Precision RTK GPS",
  },
  "04": {
    componentId: "04",
    name: "SIYI HM30 Datalink Havo moduli",
    nominalMm: [72.0, 23.0, 43.5],
    axisDescriptions: {
      x: "Korpus eni (X)",
      y: "Korpus balandligi (Y)",
      z: "Korpus uzunligi (Z)",
    },
    datasheetRef: "SIYI HM30 Full HD Long Range Video/Telemetry",
  },
  "05": {
    componentId: "05",
    name: "SIYI ZR10 2K 30x Gibrid Gimbal Kamera",
    nominalMm: [121.0, 163.0, 105.0],
    axisDescriptions: {
      x: "Gimbal kengligi (X)",
      y: "Umumiy balandlik (Y)",
      z: "Obektiv chuqurligi (Z)",
    },
    datasheetRef: "SIYI ZR10 30x Hybrid Optical Zoom Gimbal",
  },
  "06": {
    componentId: "06",
    name: "Matek Systems BEC 12S Pro",
    nominalMm: [48.0, 12.0, 26.0],
    axisDescriptions: {
      x: "Plata uzunligi (X)",
      y: "Balandlik (drossel/kondensator)",
      z: "Plata eni (Z)",
    },
    datasheetRef: "Matek UBEC 12S 6A-60V Step-Down Module",
  },
  "07": {
    componentId: "07",
    name: "Holybro PM02D / PM07 Quvvat Moduli",
    nominalMm: [68.0, 12.0, 25.0],
    axisDescriptions: {
      x: "Kenglik (X)",
      y: "Qalinlik (Y)",
      z: "Uzunlik (Z)",
    },
    datasheetRef: "Holybro PM02D Digital Power Module",
  },
  "08": {
    componentId: "08",
    name: "Tattu Plus 6S 22000mAh LiPo Batareya",
    nominalMm: [93.0, 68.0, 210.0],
    axisDescriptions: {
      x: "Batareya eni (X)",
      y: "Batareya balandligi (Y)",
      z: "Batareya uzunligi (Z)",
    },
    datasheetRef: "Tattu Plus 1.0 22.2V 25C 6S1P Smart Lipo",
  },
  "09": {
    componentId: "09",
    name: "4S 3000mAh Avionika Zaxira Batareyasi",
    nominalMm: [44.0, 30.0, 138.0],
    axisDescriptions: {
      x: "Batareya eni (X)",
      y: "Batareya balandligi (Y)",
      z: "Batareya uzunligi (Z)",
    },
    datasheetRef: "14.8V 4S 3000mAh 45C LiPo Battery Pack",
  },
  "10": {
    componentId: "10",
    name: "T-Motor U10II / MN6007 Cho‘tkasiz Dvigatel",
    nominalMm: [70.0, 42.0, 70.0],
    axisDescriptions: {
      x: "Rotor tashqi diametri (X)",
      y: "Dvigatel balandligi (val bilan)",
      z: "Rotor tashqi diametri (Z)",
    },
    datasheetRef: "T-Motor Heavy Lift Brushless Motor CAD",
  },
  "11": {
    componentId: "11",
    name: "Flame 80A 12S HV ESC Dvigatel Tezlik Regulyatori",
    nominalMm: [35.0, 21.0, 86.0],
    axisDescriptions: {
      x: "Sovutish qovurg‘asi eni (X)",
      y: "Radiator balandligi (Y)",
      z: "Korpus bo‘yi (Z)",
    },
    datasheetRef: "T-Motor Flame 80A HV Multirotor ESC",
  },
  "12": {
    componentId: "12",
    name: "Savox SV-1260MG Yuqori Kuchlanishli Servo",
    nominalMm: [15.0, 30.7, 35.0],
    axisDescriptions: {
      x: "Servo qalinligi (X)",
      y: "Servo balandligi (val bilan)",
      z: "Servo bo‘yi (montaj quloqlari)",
    },
    datasheetRef: "Savox SV-1260MG High Voltage Mini Digital Servo",
  },
  "13": {
    componentId: "13",
    name: "Pitot Statik Havo Tezligi Trubkasi",
    nominalMm: [20.0, 18.0, 150.0],
    axisDescriptions: {
      x: "Trubka flanetsi eni (X)",
      y: "Montaj qisqichi (Y)",
      z: "Trubka umumiy uzunligi (Z)",
    },
    datasheetRef: "Precision Differential Airspeed Pitot Probe",
  },
  "14": {
    componentId: "14",
    name: "Holybro MS5525DSO Havo Tezligi Datchigi",
    nominalMm: [21.0, 9.0, 14.0],
    axisDescriptions: {
      x: "Plata kengligi (X)",
      y: "Datchik nipel balandligi (Y)",
      z: "Plata uzunligi (Z)",
    },
    datasheetRef: "Holybro MS5525 I2C Airspeed Sensor Module",
  },
  "15": {
    componentId: "15",
    name: "Navigatsion LED Strob Chiroq",
    nominalMm: [38.0, 16.0, 24.0],
    axisDescriptions: {
      x: "Linza kengligi (X)",
      y: "Kupola balandligi (Y)",
      z: "Montaj asosi bo‘yi (Z)",
    },
    datasheetRef: "Aviation Anti-collision Strobe & Nav Light",
  },
  "16": {
    componentId: "16",
    name: "Avariyaviy To‘xtatish (E-Stop) Qo‘ziqorin Tugmasi",
    nominalMm: [40.0, 52.0, 40.0],
    axisDescriptions: {
      x: "Qizil tugma qalpoqchasi diametri (X)",
      y: "Umumiy balandlik (Y)",
      z: "Qalpoqcha diametri (Z)",
    },
    datasheetRef: "Emergency Stop Latching Pushbutton Switch",
  },
  "17": {
    componentId: "17",
    name: "T-Motor 22 dyuym Karbon Parrak (Propeller)",
    nominalMm: [558.8, 20.0, 45.0],
    axisDescriptions: {
      x: "Parrak to‘liq diametri (22 dyuym)",
      y: "Markaziy o‘zak qalinligi (Y)",
      z: "Parrak kuragi eni (Z)",
    },
    datasheetRef: "T-Motor CF 22x6.6 Precision Carbon Fiber Propeller",
  },
  "18": {
    componentId: "18",
    name: "Hobbywing UBEC 10A (2-6S)",
    nominalMm: [45.0, 10.0, 23.0],
    axisDescriptions: {
      x: "Plata eni (X)",
      y: "Qalinlik (Y)",
      z: "Uzunlik (Z)",
    },
    datasheetRef: "Hobbywing High Voltage 10A UBEC Regulator",
  },
  "19": {
    componentId: "19",
    name: "NVIDIA Jetson AGX Xavier P3737 Tashuvchi Plata",
    nominalMm: [105.0, 35.0, 105.0],
    axisDescriptions: {
      x: "Plata kengligi (X)",
      y: "Sovutgich radiatori bilan balandlik",
      z: "Plata uzunligi (Z)",
    },
    datasheetRef: "NVIDIA Jetson P3737 Carrier Board Mechanical Specification",
  },
  "20": {
    componentId: "20",
    name: "SIYI BEC 12V 4A Step-Down Moduli",
    nominalMm: [38.0, 11.0, 22.0],
    axisDescriptions: {
      x: "Kenglik (X)",
      y: "Balandlik (Y)",
      z: "Uzunlik (Z)",
    },
    datasheetRef: "SIYI 12V 4A Synchronous Step-Down BEC Module",
  },
  "21": {
    componentId: "21",
    name: "Foldable omni antenna (2.4/5.8GHz)",
    nominalMm: [14.0, 155.0, 14.0],
    axisDescriptions: {
      x: "Sharnir eni va tayanch (X)",
      y: "Antenna to‘liq balandligi (Y)",
      z: "SMA va korpus qalinligi (Z)",
    },
    datasheetRef: "UAV 2.4/5.8GHz Dual-Band Foldable Omni-Directional Antenna with SMA Male",
  },
};

/**
 * Returns the baseline unscaled CAD millimeter dimensions [X, Y, Z] for a component.
 * If 3D mesh template is loaded in memory, calculates exact bounding box;
 * otherwise uses verified engineering datasheet specifications.
 */
export function getComponentBaseDimensions(componentId: string): [number, number, number] {
  // 1. Try template cache in modelManager
  try {
    const fromTemplate = modelManager.getTemplateDimensions(componentId);
    if (fromTemplate && fromTemplate[0] > 0 && fromTemplate[1] > 0 && fromTemplate[2] > 0) {
      return fromTemplate;
    }
  } catch {
    // Non-blocking fallback
  }

  // 2. Return verified CAD dimensions
  const meta = VERIFIED_COMPONENT_DIMENSIONS[componentId];
  if (meta) {
    return meta.nominalMm;
  }

  // Default generic fallback if unlisted
  return [50.0, 50.0, 50.0];
}

/**
 * Calculate actual physical millimeter dimensions given the base dimensions and instance scale.
 */
export function calculateDimensionsFromScale(
  baseMm: [number, number, number],
  scale: [number, number, number]
): [number, number, number] {
  return [
    Math.round(baseMm[0] * (scale[0] || 1) * 10) / 10,
    Math.round(baseMm[1] * (scale[1] || 1) * 10) / 10,
    Math.round(baseMm[2] * (scale[2] || 1) * 10) / 10,
  ];
}

/**
 * Calculate scale multiplier [Sx, Sy, Sz] to match user-specified millimeter dimensions.
 */
export function calculateScaleFromDimensions(
  baseMm: [number, number, number],
  targetMm: [number, number, number]
): [number, number, number] {
  const safeBaseX = Math.max(baseMm[0], 0.001);
  const safeBaseY = Math.max(baseMm[1], 0.001);
  const safeBaseZ = Math.max(baseMm[2], 0.001);

  return [
    Math.max(0.01, Math.round((targetMm[0] / safeBaseX) * 1000) / 1000),
    Math.max(0.01, Math.round((targetMm[1] / safeBaseY) * 1000) / 1000),
    Math.max(0.01, Math.round((targetMm[2] / safeBaseZ) * 1000) / 1000),
  ];
}

/**
 * Proportional scale calculation when one axis dimension changes in millimeters.
 * Scales all 3 axes uniformly according to the ratio of change.
 */
export function calculateProportionalScale(
  baseMm: [number, number, number],
  currentScale: [number, number, number],
  axisChanged: 0 | 1 | 2,
  newDimensionOnAxisMm: number
): [number, number, number] {
  const safeBase = Math.max(baseMm[axisChanged], 0.001);
  const targetScaleOnAxis = Math.max(0.01, newDimensionOnAxisMm / safeBase);
  const currentScaleOnAxis = Math.max(currentScale[axisChanged] || 1, 0.001);
  const ratio = targetScaleOnAxis / currentScaleOnAxis;

  return [
    Math.max(0.01, Math.round(currentScale[0] * ratio * 1000) / 1000),
    Math.max(0.01, Math.round(currentScale[1] * ratio * 1000) / 1000),
    Math.max(0.01, Math.round(currentScale[2] * ratio * 1000) / 1000),
  ];
}
