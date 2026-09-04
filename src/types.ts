export type ComponentManifestItem = {
  id: string;
  component: string;
  quantity: number;
  preferred_web_file?: string;
  original_source?: string;
  notes?: string;
};

export type PinType =
  | "power"
  | "gnd"
  | "signal"
  | "pwm"
  | "can"
  | "uart"
  | "usb"
  | "ethernet"
  | "hdmi"
  | "antenna"
  | "rf"
  | "pneumatic"
  | "mount";

export type PinDefinition = {
  pinId: string; // e.g. "port", "h", "l", "pos", "neg", "signal"
  connectorId: string; // e.g. "can1", "power1", "usb-c", "telem1"
  fullName: string; // e.g. "02.can1.h"
  label: string; // Human readable in Uzbek (e.g. "CAN 1 High (Signal)")
  type: PinType;
  voltage?: string;
  localOffset: [number, number, number]; // in mm relative to model center
  direction?: [number, number, number]; // normal vector pointing out
  verified: boolean; // CAD / Datasheet verified
};

export type PhysicalInstance = {
  instanceId: string; // e.g. "02-1", "10-1", "10-2", "12-1"
  componentId: string; // "01" ... "20"
  instanceIndex: number; // 1-based (e.g. 1 of 8)
  name: string;
  customLabel?: string; // e.g. "Chap qanot eleron 1" for Savox servo
  isAirframe?: boolean;
  placed: boolean; // whether currently on 3D stage
  locked: boolean;
  visible: boolean;
  position: [number, number, number]; // mm [X, Y, Z]
  rotation: [number, number, number]; // degrees [Pitch(X), Yaw(Y), Roll(Z)]
  scale: [number, number, number]; // multiplier [1, 1, 1]
  colorHint?: string;
  customColor?: string; // Hex color override for this instance
  customPins?: PinDefinition[]; // User-defined or customized electrical pins for this instance
  attachedToDrone?: boolean; // Whether mechanically attached / mounted to drone airframe
  droneRelativePos?: [number, number, number]; // Local offset [X, Y, Z] relative to drone center in mm
  droneRelativeRot?: [number, number, number]; // Local rotation [Pitch, Yaw, Roll] relative to drone in degrees
  modelVersion?: number; // Monotonically increasing or timestamp version for 3D model hot-reload
  customModelName?: string; // Display name of custom loaded 3D model
};

export type CableConstruction =
  | "flat"
  | "parallel"
  | "twistedPair"
  | "multicore"
  | "coaxial";

export type ShieldType = "none" | "foil" | "braid" | "foilAndBraid";

export type ApprovalStatus = "reference" | "userApproved" | "verified";

export type CableProfile = {
  id: string;
  name: string;
  category: string;
  conductorCount: number;
  construction: CableConstruction;
  awg: number | string;
  crossSectionMm2: number;
  conductorDiameterMm: number;
  outerDiameterMm: number;
  widthMm?: number;
  heightMm?: number;
  impedanceOhm?: number;
  shieldType: ShieldType;
  drainWire: boolean;
  twistedPairs: number;
  minimumBendRadiusMm: number;
  temperatureMinC: number;
  temperatureMaxC: number;
  voltageRatingV: number;
  currentRatingA: number;
  massPerMeterG: number;
  manufacturer: string;
  manufacturerPartNumber: string;
  datasheetUrl: string;
  approvalStatus: ApprovalStatus;
  notes: string;
};

export type ConnectorType = "plug" | "receptacle" | "device-header";

export type ConnectorProfile = {
  id: string;
  manufacturer: string;
  family: string;
  exactPartNumber: string;
  type: ConnectorType;
  pinCount: number;
  pinNumbering: string;
  pitchMm?: number;
  keying: string;
  lockingMechanism: string;
  ipRating: string;
  contactPartNumber: string;
  sealPartNumber?: string;
  wedgelockPartNumber?: string;
  compatibleAwgRange: string;
  maxCurrentA: number;
  maxVoltageV: number;
  matingConnectorPartNumber?: string;
  backshellStrainRelief?: string;
  datasheetUrl: string;
  approvalStatus: ApprovalStatus;
  approved3DAssetId?: string;
  notes?: string;
};

export type ContactProfile = {
  id: string;
  manufacturer: string;
  partNumber: string;
  family: string;
  gender: "pin" | "socket" | "tab" | "receptacle";
  compatibleAwgRange: string;
  wireGaugeMin: number;
  wireGaugeMax: number;
  materialPlating: string;
  contactResistanceMOhm: number;
  maxCurrentA: number;
  crimpTooling?: string;
  approvalStatus: ApprovalStatus;
};

export type SpliceProfile = {
  id: string;
  type: "crimp_splice" | "solder_sleeve" | "shield_termination";
  manufacturer: string;
  partNumber: string;
  wireAwgRange: string;
  temperatureRatingC: number;
  sealing: string;
  approvalStatus: ApprovalStatus;
  datasheetUrl?: string;
};

export type TerminationProfile = {
  id: string;
  name: string;
  type: "ring_terminal" | "bullet" | "shield_band" | "drain_ground";
  manufacturer: string;
  partNumber: string;
  sizeStud?: string; // e.g. "M3", "M4", "M5", "M6"
  compatibleAwg: string;
  currentRatingA?: number;
  approvalStatus: ApprovalStatus;
};

export type CableCore = {
  coreIndex: number;
  color: string; // Hex color (e.g. #ef4444 red, #000000 black, etc.)
  label: string; // e.g. "Signal", "V+", "GND", "CAN_H", "CAN_L"
  sourcePinFullName: string;
  targetPinFullName: string;
  signalType: "power" | "gnd" | "signal" | "differential" | "rf" | "analog";
  voltageDomain?: string; // e.g. "5.0V", "3.3V", "12V", "24V", "VBAT"
  currentRatingA?: number;
  netName?: string;
};

export type CableRoutePoint = {
  id: string;
  x: number;
  y: number;
  z: number;
  type: "waypoint" | "service_loop" | "clamp" | "bulkhead";
};

export type CableConnection = {
  id: string; // unique ID e.g. "W001"
  name: string;
  sourceInstanceId: string;
  sourcePinName: string; // primary pin e.g. "02.can1.h"
  targetInstanceId: string;
  targetPinName: string; // e.g. "03.can.port"
  color: string; // hex color for 3D visual
  cableType: "CAN" | "Power" | "UART" | "PWM" | "Ethernet" | "Airspeed" | "Other" | string;
  wireGauge?: string;
  // Ribbon / Multi-strand cable fields (Lentali shleyf kabel):
  isRibbon?: boolean; // Whether flat ribbon / multi-strand cable
  strandCount?: number; // Number of strands (e.g. 3 for servo, 3-8 for UART)
  strandPitchMm?: number; // Distance between adjacent strand centers in mm (e.g. 1.8 - 3.0 mm)
  strandColors?: string[]; // Array of hex colors for each strand
  strandLabels?: string[]; // Array of custom names/signals for each strand
  // Cable End Identification Stickers / Labels (Uchki shtikerlar / markirovkalar):
  endStickers?: {
    enabled: boolean;
    sourceText?: string; // e.g. "J1: GPS-1" or "CUBE:TELEM"
    targetText?: string; // e.g. "P1: FC-RX" or "AIRSPEED:P1"
    bgColor?: string; // e.g. "#facc15" (Yellow), "#ffffff" (White), "#f97316" (Orange)
    textColor?: string; // e.g. "#000000" or "#ffffff"
    style?: "flag" | "heatshrink" | "clip" | "wrap"; // 3D Flag plate vs 3D Sleeve vs 3D Clip vs 3D Wrap
    offsetFromEndMm?: number; // Distance from connector in mm (e.g. 10-50mm)
    rotationDeg?: number; // 3D tag rotation angle around cable axis (0° - 360°)
    sizeMm?: number; // 3D tag dimensions in mm (e.g. 16 - 36mm)
  };
  // Advanced Avionics Cable Fields:
  cableProfileId?: string; // References CableProfile.id
  designation?: string; // e.g. "W001", "W002"
  netName?: string; // e.g. "CAN1_BUS", "SERVO_AIL_L", "GPS_UART"
  sourceConnectorId?: string;
  targetConnectorId?: string;
  sourceContactId?: string;
  targetContactId?: string;
  awg?: number | string;
  outerDiameterMm?: number;
  widthMm?: number;
  heightMm?: number;
  cores?: CableCore[];
  routePoints?: CableRoutePoint[];
  slackMm?: number; // Extra slack / stretch amount in mm (e.g. 0 to 500mm or more)
  curveTension?: number; // Spline curve tension (0.0 to 1.0)
  thicknessMm?: number; // 3D cable visual thickness in mm (e.g. 1.5 to 10.0)
  shieldTermination?: "none" | "single_end_source" | "single_end_target" | "both_ends" | "floating";
  drainWire?: boolean;
  twistedPairs?: number;
  hasCanTerminator120?: boolean;
  calculatedLengthMm?: number;
  minimumBendRadiusMm?: number;
  bendRadiusViolations?: number;
  estimatedVoltageDropV?: number;
  currentRatingA?: number;
  ampacityStatus?: "ok" | "exceeded" | "engineering_data_required";
  flowDirection?: "forward" | "reverse" | "bidirectional"; // Cable energy/signal flow direction
};

export type TransformMode = "translate" | "rotate" | "scale";
export type TransformSpace = "world" | "local";

export type CameraViewMode = "perspective" | "top" | "bottom" | "front" | "back" | "left" | "right";

export type CableFlowType = "all" | "power" | "signal";

export type FlowAnimationConfig = {
  active: boolean;
  flowType: CableFlowType;
  speed: number;
  autoRotate: boolean;
};

export type SceneTheme = "dark" | "light" | "blueprint" | "tactical" | "hangar";

export type WorkspaceViewMode = "3d" | "2d" | "split";

export type DRCItem = {
  id: string;
  level: "error" | "warning" | "info";
  category: "Pin" | "Voltage" | "CAN" | "Differential" | "RF" | "BendRadius" | "Connector" | "Current" | "Shield";
  title: string;
  message: string;
  cableId?: string;
  instanceId?: string;
  pinFullName?: string;
};

export type EditorState = {
  instances: PhysicalInstance[];
  cables: CableConnection[];
  selectedInstanceId: string | null;
  selectedPinFullName: string | null;
  selectedCableId?: string | null;
  transformMode: TransformMode;
  transformSpace: TransformSpace;
  droneOpacity: number;
  droneWireframe: boolean;
  droneVisible: boolean;
  droneColor?: string;
  sceneTheme?: SceneTheme;
  workspaceViewMode?: WorkspaceViewMode;
  showPins: boolean;
  showCables: boolean;
  showGrid: boolean;
  snapToGrid: boolean;
  gridSizeMm: number;
};

export interface CloudProjectData {
  id: string;
  name: string;
  cloudCode: string; // e.g. "DRN-8392"
  createdAt: string;
  updatedAt: string;
  lastUpdatedByClientId?: string;
  isManualSave?: boolean;
  manualSaveTimestamp?: number;
  instances: PhysicalInstance[];
  cables: CableConnection[];
  droneFrame?: {
    color?: string;
    opacity?: number;
    wireframe?: boolean;
    visible?: boolean;
  };
  thumbnailUrl?: string;
  notes?: string;
  customManifest?: ComponentManifestItem[];
  customModels?: Record<string, any>;
  sceneTheme?: string;
  cameraViewMode?: string;
}

export interface CloudProjectSummary {
  id: string;
  name: string;
  cloudCode: string;
  updatedAt: string;
  instancesCount: number;
  placedCount: number;
  cablesCount: number;
}
