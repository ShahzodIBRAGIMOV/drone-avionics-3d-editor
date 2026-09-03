import * as THREE from "three";
import { PhysicalInstance } from "../types";

export interface DroneRelativeTransformResult {
  droneRelativePos: [number, number, number];
  droneRelativeRot: [number, number, number];
  relativePos: [number, number, number];
  relativeRot: [number, number, number];
}

/**
 * Computes the relative transform of a component inside the drone's local coordinate system.
 * Supports both:
 * 1) computeDroneRelativeTransform(elemInstance, droneInstance)
 * 2) computeDroneRelativeTransform(dronePos, droneRotDeg, elemPos, elemRotDeg)
 */
export function computeDroneRelativeTransform(
  arg1: PhysicalInstance | [number, number, number],
  arg2: PhysicalInstance | [number, number, number],
  arg3?: [number, number, number],
  arg4?: [number, number, number]
): DroneRelativeTransformResult {
  let dronePos: [number, number, number];
  let droneRotDeg: [number, number, number];
  let elemPos: [number, number, number];
  let elemRotDeg: [number, number, number];

  if (typeof (arg1 as PhysicalInstance).instanceId === "string" && typeof (arg2 as PhysicalInstance).instanceId === "string") {
    // arg1 is elemInstance, arg2 is droneInstance
    const elem = arg1 as PhysicalInstance;
    const drone = arg2 as PhysicalInstance;
    elemPos = elem.position;
    elemRotDeg = elem.rotation;
    dronePos = drone.position;
    droneRotDeg = drone.rotation;
  } else {
    dronePos = arg1 as [number, number, number];
    droneRotDeg = arg2 as [number, number, number];
    elemPos = arg3 as [number, number, number];
    elemRotDeg = arg4 as [number, number, number];
  }

  const droneEuler = new THREE.Euler(
    THREE.MathUtils.degToRad(droneRotDeg[0]),
    THREE.MathUtils.degToRad(droneRotDeg[1]),
    THREE.MathUtils.degToRad(droneRotDeg[2]),
    "XYZ"
  );
  const droneQuat = new THREE.Quaternion().setFromEuler(droneEuler);
  const droneMat = new THREE.Matrix4().compose(
    new THREE.Vector3(dronePos[0], dronePos[1], dronePos[2]),
    droneQuat,
    new THREE.Vector3(1, 1, 1)
  );
  const invDroneMat = droneMat.clone().invert();

  const elemVec = new THREE.Vector3(elemPos[0], elemPos[1], elemPos[2]);
  const localVec = elemVec.applyMatrix4(invDroneMat);

  const elemEuler = new THREE.Euler(
    THREE.MathUtils.degToRad(elemRotDeg[0]),
    THREE.MathUtils.degToRad(elemRotDeg[1]),
    THREE.MathUtils.degToRad(elemRotDeg[2]),
    "XYZ"
  );
  const elemQuat = new THREE.Quaternion().setFromEuler(elemEuler);
  const invDroneQuat = droneQuat.clone().invert();
  const relQuat = invDroneQuat.multiply(elemQuat);
  const relEuler = new THREE.Euler().setFromQuaternion(relQuat, "XYZ");

  const relPos: [number, number, number] = [
    Math.round(localVec.x * 10) / 10,
    Math.round(localVec.y * 10) / 10,
    Math.round(localVec.z * 10) / 10,
  ];

  const relRot: [number, number, number] = [
    Math.round(THREE.MathUtils.radToDeg(relEuler.x) * 10) / 10,
    Math.round(THREE.MathUtils.radToDeg(relEuler.y) * 10) / 10,
    Math.round(THREE.MathUtils.radToDeg(relEuler.z) * 10) / 10,
  ];

  return {
    droneRelativePos: relPos,
    droneRelativeRot: relRot,
    relativePos: relPos,
    relativeRot: relRot,
  };
}

/**
 * Computes updated world transform for an attached component when the drone moves or rotates.
 */
export function computeAttachedWorldTransform(
  droneNewPos: [number, number, number],
  droneNewRotDeg: [number, number, number],
  droneRelPos: [number, number, number],
  droneRelRotDeg: [number, number, number]
): { position: [number, number, number]; rotation: [number, number, number] } {
  const droneEuler = new THREE.Euler(
    THREE.MathUtils.degToRad(droneNewRotDeg[0]),
    THREE.MathUtils.degToRad(droneNewRotDeg[1]),
    THREE.MathUtils.degToRad(droneNewRotDeg[2]),
    "XYZ"
  );
  const droneMat = new THREE.Matrix4().compose(
    new THREE.Vector3(droneNewPos[0], droneNewPos[1], droneNewPos[2]),
    new THREE.Quaternion().setFromEuler(droneEuler),
    new THREE.Vector3(1, 1, 1)
  );

  const localVec = new THREE.Vector3(droneRelPos[0], droneRelPos[1], droneRelPos[2]);
  const worldVec = localVec.applyMatrix4(droneMat);

  const droneQuat = new THREE.Quaternion().setFromEuler(droneEuler);
  const relEuler = new THREE.Euler(
    THREE.MathUtils.degToRad(droneRelRotDeg[0]),
    THREE.MathUtils.degToRad(droneRelRotDeg[1]),
    THREE.MathUtils.degToRad(droneRelRotDeg[2]),
    "XYZ"
  );
  const relQuat = new THREE.Quaternion().setFromEuler(relEuler);
  const worldQuat = droneQuat.clone().multiply(relQuat);
  const worldEuler = new THREE.Euler().setFromQuaternion(worldQuat, "XYZ");

  return {
    position: [
      Math.round(worldVec.x * 10) / 10,
      Math.round(worldVec.y * 10) / 10,
      Math.round(worldVec.z * 10) / 10,
    ],
    rotation: [
      Math.round(THREE.MathUtils.radToDeg(worldEuler.x) * 10) / 10,
      Math.round(THREE.MathUtils.radToDeg(worldEuler.y) * 10) / 10,
      Math.round(THREE.MathUtils.radToDeg(worldEuler.z) * 10) / 10,
    ],
  };
}

/**
 * Given the entire instance list and an updated drone instance (in either order),
 * calculates and returns the updated instance list with all attached components moved in tandem.
 */
export function propagateDroneMovement(
  a: PhysicalInstance[] | PhysicalInstance,
  b: PhysicalInstance[] | PhysicalInstance
): PhysicalInstance[] {
  const instances = Array.isArray(a) ? a : (b as PhysicalInstance[]);
  const updatedDrone = Array.isArray(a) ? (b as PhysicalInstance) : a;

  return instances.map((inst) => {
    if (inst.instanceId === updatedDrone.instanceId) {
      return updatedDrone;
    }

    if (inst.attachedToDrone && inst.placed) {
      const relPos = inst.droneRelativePos || [
        inst.position[0] - updatedDrone.position[0],
        inst.position[1] - updatedDrone.position[1],
        inst.position[2] - updatedDrone.position[2],
      ];
      const relRot = inst.droneRelativeRot || [0, 0, 0];

      const { position, rotation } = computeAttachedWorldTransform(
        updatedDrone.position,
        updatedDrone.rotation,
        relPos,
        relRot
      );

      return {
        ...inst,
        position,
        rotation,
        droneRelativePos: relPos,
        droneRelativeRot: relRot,
      };
    }

    return inst;
  });
}
