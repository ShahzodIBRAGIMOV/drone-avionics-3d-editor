import { CableConnection, PhysicalInstance } from "../types";

export interface MassProperties {
  componentWeightG: number;
  harnessLengthMm: number;
  harnessWeightG: number;
  totalWeightG: number;
  centerOfGravity: [number, number, number] | null;
  weightedComponentCount: number;
}

const AWG_MASS_G_PER_M: Record<string, number> = {
  "30": 1.1,
  "28": 1.7,
  "26": 2.7,
  "24": 4.1,
  "22": 6.4,
  "20": 10.0,
  "18": 15.5,
  "16": 24.5,
  "14": 38.5,
  "12": 61.0,
  "10": 97.0,
};

export function inferCableMassPerMeterG(cable: CableConnection): number {
  if (Number.isFinite(cable.massPerMeterG) && (cable.massPerMeterG || 0) >= 0) {
    return cable.massPerMeterG || 0;
  }
  const gauge = String(cable.awg ?? cable.wireGauge ?? "").replace(/[^0-9.]/g, "");
  const conductorMass = AWG_MASS_G_PER_M[gauge] || 5;
  const strands = Math.max(1, cable.strandCount || cable.cores?.length || 1);
  const insulationFactor = cable.isTubing || cable.cableType === "Airspeed" ? 1.8 : 1.35;
  return Math.round(conductorMass * strands * insulationFactor * 10) / 10;
}

function distance(a: [number, number, number], b: [number, number, number]): number {
  return Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
}

export function estimateCableLengthMm(
  cable: CableConnection,
  instances: PhysicalInstance[]
): number {
  const source = instances.find((item) => item.instanceId === cable.sourceInstanceId);
  const target = instances.find((item) => item.instanceId === cable.targetInstanceId);
  if (!source || !target) return cable.calculatedLengthMm || 0;
  const points: [number, number, number][] = [source.position];
  for (const point of cable.routePoints || []) points.push([point.x, point.y, point.z]);
  points.push(target.position);
  let length = 0;
  for (let index = 1; index < points.length; index += 1) length += distance(points[index - 1], points[index]);
  return length + Math.max(0, cable.slackMm || 0);
}

export function calculateMassProperties(
  instances: PhysicalInstance[],
  cables: CableConnection[]
): MassProperties {
  let componentWeightG = 0;
  let harnessLengthMm = 0;
  let harnessWeightG = 0;
  let momentX = 0;
  let momentY = 0;
  let momentZ = 0;
  let weightedComponentCount = 0;

  const placed = instances.filter((item) => item.placed);
  for (const item of placed) {
    const weight = Math.max(0, Number(item.weightG) || 0);
    if (weight <= 0) continue;
    componentWeightG += weight;
    weightedComponentCount += 1;
    momentX += item.position[0] * weight;
    momentY += item.position[1] * weight;
    momentZ += item.position[2] * weight;
  }

  for (const cable of cables) {
    const lengthMm = estimateCableLengthMm(cable, placed);
    const cableWeightG = (lengthMm / 1000) * inferCableMassPerMeterG(cable);
    harnessLengthMm += lengthMm;
    harnessWeightG += cableWeightG;

    const source = placed.find((item) => item.instanceId === cable.sourceInstanceId);
    const target = placed.find((item) => item.instanceId === cable.targetInstanceId);
    if (cableWeightG > 0 && source && target) {
      const midpoint: [number, number, number] = [
        (source.position[0] + target.position[0]) / 2,
        (source.position[1] + target.position[1]) / 2,
        (source.position[2] + target.position[2]) / 2,
      ];
      momentX += midpoint[0] * cableWeightG;
      momentY += midpoint[1] * cableWeightG;
      momentZ += midpoint[2] * cableWeightG;
    }
  }

  const totalWeightG = componentWeightG + harnessWeightG;
  return {
    componentWeightG,
    harnessLengthMm,
    harnessWeightG,
    totalWeightG,
    centerOfGravity: totalWeightG > 0
      ? [momentX / totalWeightG, momentY / totalWeightG, momentZ / totalWeightG]
      : null,
    weightedComponentCount,
  };
}
