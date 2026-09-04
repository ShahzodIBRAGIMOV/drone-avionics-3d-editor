import * as THREE from "three";

/**
 * Generates a high-resolution 2D canvas texture for a 3D flag tag.
 */
export function createFlagTagTexture(
  text: string,
  bgColor: string = "#facc15",
  textColor: string = "#000000"
): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;

  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.clearRect(0, 0, 768, 256);

  const pad = 8;
  const w = 768 - pad * 2;
  const h = 256 - pad * 2;
  const r = 16;

  // Background
  ctx.fillStyle = bgColor || "#facc15";
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(pad, pad, w, h, r);
    ctx.fill();
  } else {
    ctx.fillRect(pad, pad, w, h);
  }

  // Outer border
  ctx.lineWidth = 10;
  ctx.strokeStyle = "#0f172a";
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(pad, pad, w, h, r);
    ctx.stroke();
  } else {
    ctx.strokeRect(pad, pad, w, h);
  }

  // Inner margin dashed border
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(15, 23, 42, 0.4)";
  ctx.setLineDash([8, 6]);
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(pad + 14, pad + 14, w - 28, h - 28, r - 4);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Cable tie eyelet / hole on left root side
  ctx.fillStyle = "#1e293b";
  ctx.beginPath();
  ctx.arc(pad + 42, 128, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#0f172a";
  ctx.beginPath();
  ctx.arc(pad + 42, 128, 12, 0, Math.PI * 2);
  ctx.fill();

  // Barcode / wire marker identification stripes
  ctx.fillStyle = "#1e293b";
  ctx.fillRect(pad + 80, pad + 24, 12, h - 48);
  ctx.fillRect(pad + 100, pad + 24, 6, h - 48);
  ctx.fillRect(pad + 112, pad + 24, 16, h - 48);
  ctx.fillRect(pad + 134, pad + 24, 8, h - 48);
  ctx.fillRect(pad + 148, pad + 24, 4, h - 48);

  // Divider line
  ctx.strokeStyle = "#0f172a";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(pad + 168, pad + 18);
  ctx.lineTo(pad + 168, pad + h - 18);
  ctx.stroke();

  // Aerospace specification header
  ctx.fillStyle = textColor === "#ffffff" ? "rgba(255, 255, 255, 0.75)" : "rgba(15, 23, 42, 0.65)";
  ctx.font = "bold 22px 'JetBrains Mono', 'Courier New', monospace";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("UAV AVIONICS // HARNESS TAG", pad + 185, pad + 26);

  // Main Identification Text (large and crisp)
  ctx.fillStyle = textColor || "#000000";
  ctx.font = "bold 56px 'JetBrains Mono', 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const maxChars = 14;
  const display = text.length > maxChars ? text.substring(0, maxChars - 1) + "…" : text;
  ctx.fillText(display, (pad + 175 + w) / 2, 134);

  // Subtitle / specification footer
  ctx.fillStyle = textColor === "#ffffff" ? "rgba(255, 255, 255, 0.85)" : "rgba(15, 23, 42, 0.7)";
  ctx.font = "bold 20px 'JetBrains Mono', 'Courier New', monospace";
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.fillText("MIL-W-22759/34 // 3.8M UAV", w - 16, h - 12);

  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;

  return texture;
}

/**
 * Generates a cylindrical 360-degree wrapped texture for 3D Heatshrink Sleeve or Wrap.
 * Prints text on both u = 0.25 and u = 0.75 so it is visible from any angle around the cable.
 */
export function createCylinderSleeveTexture(
  text: string,
  bgColor: string = "#facc15",
  textColor: string = "#000000",
  isWrap: boolean = false
): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;

  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.clearRect(0, 0, 1024, 256);

  // Background
  ctx.fillStyle = bgColor || "#facc15";
  ctx.fillRect(0, 0, 1024, 256);

  // End shrinkage band guides (top & bottom edges in cylinder UV)
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, 1024, 14);
  ctx.fillRect(0, 242, 1024, 14);

  // Middle subtle grid / dashed marker
  ctx.strokeStyle = "rgba(15, 23, 42, 0.25)";
  ctx.lineWidth = 2;
  ctx.setLineDash([12, 12]);
  ctx.beginPath();
  ctx.moveTo(512, 0);
  ctx.lineTo(512, 256);
  ctx.stroke();
  ctx.setLineDash([]);

  // Render text on both Side A (x = 256) and Side B (x = 768)
  const centers = [256, 768];
  const maxChars = 13;
  const display = text.length > maxChars ? text.substring(0, maxChars - 1) + "…" : text;

  centers.forEach((cx) => {
    // Barcode block
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(cx - 200, 32, 8, 192);
    ctx.fillRect(cx - 186, 32, 4, 192);
    ctx.fillRect(cx - 176, 32, 12, 192);
    ctx.fillRect(cx - 158, 32, 6, 192);

    // Direction arrow and MIL-SPEC subtitle
    ctx.fillStyle = textColor === "#ffffff" ? "rgba(255, 255, 255, 0.7)" : "rgba(15, 23, 42, 0.65)";
    ctx.font = "bold 20px 'JetBrains Mono', 'Courier New', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(isWrap ? "▶ SELF-LAM WRAP ▶" : "▶ AMS-DTL-23053/5 ▶", cx + 20, 26);

    // Main Identification Text
    ctx.fillStyle = textColor || "#000000";
    ctx.font = "bold 58px 'JetBrains Mono', 'Courier New', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(display, cx + 20, 128);

    // Bottom Spec
    ctx.fillStyle = textColor === "#ffffff" ? "rgba(255, 255, 255, 0.7)" : "rgba(15, 23, 42, 0.65)";
    ctx.font = "bold 20px 'JetBrains Mono', 'Courier New', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText("125°C VW-1 // FLIGHT HARNESS", cx + 20, 232);
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;

  return texture;
}

/**
 * Generates a high-contrast label texture for a 3D snap-on clip carrier.
 */
export function createClipLabelTexture(
  text: string,
  bgColor: string = "#facc15",
  textColor: string = "#000000"
): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;

  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.clearRect(0, 0, 512, 160);

  // Background
  ctx.fillStyle = bgColor || "#facc15";
  ctx.fillRect(4, 4, 504, 152);

  // Inset border
  ctx.lineWidth = 6;
  ctx.strokeStyle = "#0f172a";
  ctx.strokeRect(4, 4, 504, 152);

  // Side grips
  ctx.fillStyle = "#334155";
  ctx.fillRect(10, 10, 8, 140);
  ctx.fillRect(494, 10, 8, 140);

  // Label text
  ctx.fillStyle = textColor || "#000000";
  ctx.font = "bold 46px 'JetBrains Mono', 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const maxChars = 12;
  const display = text.length > maxChars ? text.substring(0, maxChars - 1) + "…" : text;
  ctx.fillText(display, 256, 80);

  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;

  return texture;
}

export interface Build3DStickerParams {
  cableId: string;
  point: THREE.Vector3;
  tangent: THREE.Vector3;
  cableRadius: number;
  text: string;
  isSource: boolean;
  style?: "flag" | "heatshrink" | "clip" | "wrap";
  bgColor?: string;
  textColor?: string;
  rotationDeg?: number;
  sizeMm?: number;
  isSelectedCable?: boolean;
}

/**
 * Builds a complete 3D Mesh representation of a cable sticker (Flag, Sleeve, Clip, or Wrap).
 */
export function build3DStickerMesh(params: Build3DStickerParams): THREE.Group {
  const {
    cableId,
    point,
    tangent,
    cableRadius,
    text,
    isSource,
    style = "flag",
    bgColor = "#facc15",
    textColor = "#000000",
    rotationDeg = 0,
    sizeMm = 24,
    isSelectedCable = false,
  } = params;

  const stickerGroup = new THREE.Group();
  stickerGroup.position.copy(point);
  stickerGroup.name = `cable_${cableId}_sticker_3d_${isSource ? "src" : "tgt"}`;
  stickerGroup.userData = {
    cableId,
    isCableMesh: true,
    isCableSticker: true,
    isSourceSticker: isSource,
  };

  // Compute local coordinate frame: tangent T, normal N, binormal B
  const T = tangent.clone().normalize();
  let N = new THREE.Vector3(0, 1, 0).cross(T);
  if (N.lengthSq() < 0.001) {
    N = new THREE.Vector3(1, 0, 0).cross(T);
  }
  N.normalize();

  // Apply user-defined rotation angle around the cable axis
  const angleRad = ((rotationDeg || 0) * Math.PI) / 180;
  if (Math.abs(angleRad) > 0.001) {
    const qAxis = new THREE.Quaternion().setFromAxisAngle(T, angleRad);
    N.applyQuaternion(qAxis);
  }
  const B = new THREE.Vector3().crossVectors(T, N).normalize();

  // Rotation quaternion to align object Y-axis with Tangent T
  const up = new THREE.Vector3(0, 1, 0);
  const quatAlignTangent = new THREE.Quaternion().setFromUnitVectors(up, T);

  // Common highlight emissive
  const emissiveColor = isSelectedCable ? 0x0284c7 : bgColor;
  const emissiveIntensity = isSelectedCable ? 0.45 : 0.08;

  if (style === "flag") {
    // ==========================================
    // 1. 3D FLAG TAG (3D Bayroqcha Shtikeri)
    // ==========================================
    const tagLength = Math.max(18, Math.min(45, sizeMm || 24));
    const tagHeight = tagLength * 0.52;
    const tagThickness = 0.8;

    // Collar clamped around the cable wire
    const collarRadius = cableRadius + 0.65;
    const collarLength = Math.max(6, tagLength * 0.35);
    const collarGeo = new THREE.CylinderGeometry(collarRadius, collarRadius, collarLength, 18);
    collarGeo.applyQuaternion(quatAlignTangent);

    const collarMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.4,
      metalness: 0.3,
    });
    const collarMesh = new THREE.Mesh(collarGeo, collarMat);
    collarMesh.userData = { cableId, isCableMesh: true };
    stickerGroup.add(collarMesh);

    // Zip-tie fastener ring around collar
    const zipGeo = new THREE.TorusGeometry(collarRadius + 0.25, 0.4, 8, 20);
    zipGeo.applyQuaternion(quatAlignTangent);
    const zipMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.2,
      metalness: 0.5,
    });
    const zipMesh = new THREE.Mesh(zipGeo, zipMat);
    zipMesh.userData = { cableId, isCableMesh: true };
    stickerGroup.add(zipMesh);

    // Connecting neck / hinge tab
    const neckLength = collarRadius + 1.2;
    const neckGeo = new THREE.BoxGeometry(collarLength * 0.7, 1.4, tagThickness);
    // Align with local frame (T along X, N along Y, B along Z)
    const rotBasis = new THREE.Matrix4().makeBasis(T, N, B);
    const neckMesh = new THREE.Mesh(neckGeo, collarMat);
    neckMesh.position.addScaledVector(N, collarRadius * 0.7);
    neckMesh.setRotationFromMatrix(rotBasis);
    neckMesh.userData = { cableId, isCableMesh: true };
    stickerGroup.add(neckMesh);

    // 3D Flag Plate with high-res textured canvas on front and back
    const flagTexture = createFlagTagTexture(text, bgColor, textColor);
    const flagGeo = new THREE.BoxGeometry(tagLength, tagHeight, tagThickness);

    const faceMat = new THREE.MeshStandardMaterial({
      map: flagTexture,
      color: 0xffffff,
      roughness: 0.3,
      metalness: 0.1,
      emissive: emissiveColor,
      emissiveIntensity,
    });

    const edgeMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.4,
      metalness: 0.2,
    });

    // Materials: [right, left, top, bottom, front, back]
    const materials = [edgeMat, edgeMat, edgeMat, edgeMat, faceMat, faceMat];
    const flagMesh = new THREE.Mesh(flagGeo, materials);

    // Center position of flag plate
    const flagCenter = new THREE.Vector3().addScaledVector(N, collarRadius + tagHeight / 2 + 0.8);
    flagMesh.position.copy(flagCenter);
    flagMesh.setRotationFromMatrix(rotBasis);
    flagMesh.userData = { cableId, isCableMesh: true };
    stickerGroup.add(flagMesh);

  } else if (style === "heatshrink") {
    // ==================================================
    // 2. 3D HEATSHRINK SLEEVE (3D Termousadka Trubkasi)
    // ==================================================
    const sleeveLength = Math.max(16, Math.min(48, sizeMm ? sizeMm * 1.1 : 24));
    const sleeveRadius = cableRadius + 0.85;

    // Main 3D cylindrical sleeve with printed label texture mapped 360-deg
    const sleeveGeo = new THREE.CylinderGeometry(sleeveRadius, sleeveRadius, sleeveLength, 32, 1, false);
    sleeveGeo.applyQuaternion(quatAlignTangent);

    const sleeveTexture = createCylinderSleeveTexture(text, bgColor, textColor, false);
    const sleeveMat = new THREE.MeshStandardMaterial({
      map: sleeveTexture,
      roughness: 0.35,
      metalness: 0.15,
      emissive: emissiveColor,
      emissiveIntensity,
    });

    const sleeveMesh = new THREE.Mesh(sleeveGeo, sleeveMat);
    sleeveMesh.userData = { cableId, isCableMesh: true };
    stickerGroup.add(sleeveMesh);

    // End Shrinkage Collars (Dark heatshrink contraction rings at both ends)
    const bandRadius = sleeveRadius + 0.22;
    const bandLength = 2.2;
    const bandGeo = new THREE.CylinderGeometry(bandRadius, bandRadius, bandLength, 24);
    bandGeo.applyQuaternion(quatAlignTangent);

    const bandMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.5,
      metalness: 0.2,
    });

    const band1 = new THREE.Mesh(bandGeo, bandMat);
    band1.position.addScaledVector(T, sleeveLength / 2 - bandLength / 2);
    band1.userData = { cableId, isCableMesh: true };
    stickerGroup.add(band1);

    const band2 = new THREE.Mesh(bandGeo, bandMat);
    band2.position.addScaledVector(T, -sleeveLength / 2 + bandLength / 2);
    band2.userData = { cableId, isCableMesh: true };
    stickerGroup.add(band2);

  } else if (style === "clip") {
    // ==================================================
    // 3. 3D CLIP-ON MARKER CARRIER (3D Plastik Klipsa)
    // ==================================================
    const carrierLength = Math.max(16, Math.min(36, sizeMm || 22));
    const clipRadius = cableRadius + 0.8;

    // Snap-on semi-circular plastic clamp base
    const clipGeo = new THREE.CylinderGeometry(
      clipRadius,
      clipRadius,
      carrierLength,
      20,
      1,
      false,
      0,
      Math.PI * 1.6
    );
    clipGeo.applyQuaternion(quatAlignTangent);

    const clipMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.35,
      metalness: 0.2,
    });
    const clipMesh = new THREE.Mesh(clipGeo, clipMat);
    clipMesh.userData = { cableId, isCableMesh: true };
    stickerGroup.add(clipMesh);

    // Raised rectangular carrier platform mounted on top
    const rotBasis = new THREE.Matrix4().makeBasis(T, N, B);
    const platHeight = 2.0;
    const platWidth = carrierLength;
    const platDepth = Math.max(8, cableRadius * 2.6);

    const platGeo = new THREE.BoxGeometry(platWidth, platHeight, platDepth);
    const platMesh = new THREE.Mesh(platGeo, clipMat);
    platMesh.position.addScaledVector(N, clipRadius + platHeight / 2);
    platMesh.setRotationFromMatrix(rotBasis);
    platMesh.userData = { cableId, isCableMesh: true };
    stickerGroup.add(platMesh);

    // High-visibility insert label plate
    const insertGeo = new THREE.BoxGeometry(platWidth - 2, 0.6, platDepth - 1.6);
    const insertTexture = createClipLabelTexture(text, bgColor, textColor);
    const insertMat = new THREE.MeshStandardMaterial({
      map: insertTexture,
      roughness: 0.25,
      metalness: 0.1,
      emissive: emissiveColor,
      emissiveIntensity,
    });

    const insertMesh = new THREE.Mesh(insertGeo, insertMat);
    insertMesh.position.addScaledVector(N, clipRadius + platHeight + 0.3);
    insertMesh.setRotationFromMatrix(rotBasis);
    insertMesh.userData = { cableId, isCableMesh: true };
    stickerGroup.add(insertMesh);

  } else {
    // ==================================================
    // 4. 3D SELF-LAMINATING WRAP (3D O‘ralgan Lenta)
    // ==================================================
    const wrapLength = Math.max(16, Math.min(45, sizeMm || 22));
    const innerRadius = cableRadius + 0.65;
    const outerRadius = cableRadius + 0.95;

    // Inner printed label sleeve
    const innerGeo = new THREE.CylinderGeometry(innerRadius, innerRadius, wrapLength * 0.75, 32, 1, false);
    innerGeo.applyQuaternion(quatAlignTangent);

    const wrapTexture = createCylinderSleeveTexture(text, bgColor, textColor, true);
    const innerMat = new THREE.MeshStandardMaterial({
      map: wrapTexture,
      roughness: 0.3,
      metalness: 0.1,
      emissive: emissiveColor,
      emissiveIntensity,
    });

    const innerMesh = new THREE.Mesh(innerGeo, innerMat);
    innerMesh.userData = { cableId, isCableMesh: true };
    stickerGroup.add(innerMesh);

    // Outer glossy transparent laminate wrap
    const outerGeo = new THREE.CylinderGeometry(outerRadius, outerRadius, wrapLength, 32, 1, false);
    outerGeo.applyQuaternion(quatAlignTangent);

    const outerMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.38,
      roughness: 0.1,
      metalness: 0.2,
      depthWrite: false,
    });

    const outerMesh = new THREE.Mesh(outerGeo, outerMat);
    outerMesh.userData = { cableId, isCableMesh: true };
    stickerGroup.add(outerMesh);
  }

  return stickerGroup;
}
