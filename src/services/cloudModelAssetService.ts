import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { getCachedBuffer, setCachedBuffer } from "../modelAssetLoader";
import type { CustomModelRecord } from "./modelManager";

// Base64 expands data by roughly 33%. 512 KiB raw chunks remain comfortably
// below Firestore's 1 MiB per-document limit.
const RAW_CHUNK_SIZE = 512 * 1024;

function safeIdPart(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const step = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += step) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + step));
  }
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function chunkDocumentId(assetId: string, index: number): string {
  return `${assetId}--${String(index).padStart(4, "0")}`;
}

/** Store actual model bytes in chunk documents covered by the current Firestore rules. */
export async function uploadCustomModelsForCloud(
  projectId: string,
  customModels: Record<string, CustomModelRecord>
): Promise<Record<string, CustomModelRecord>> {
  const result: Record<string, CustomModelRecord> = { ...customModels };

  for (const [componentId, record] of Object.entries(customModels)) {
    if (record.sourceType === "preset") continue;

    const buffer = await getCachedBuffer(`custom_model_buffer_${componentId}`);
    if (!buffer || buffer.byteLength < 50) {
      if (record.cloudAsset || record.sourceUrl || record.fileUrl?.startsWith("http")) continue;
      throw new Error(`“${record.fileName || componentId}” 3D modelining asl fayli brauzer xotirasida topilmadi. Modelni qayta yuklang.`);
    }

    if (record.cloudAsset?.byteLength === buffer.byteLength) {
      result[componentId] = record;
      continue;
    }

    const assetId = `${safeIdPart(projectId)}--asset--${safeIdPart(componentId)}--${record.updatedAt || Date.now()}`;
    const bytes = new Uint8Array(buffer);
    const chunks = Math.ceil(bytes.byteLength / RAW_CHUNK_SIZE);

    for (let index = 0; index < chunks; index++) {
      const start = index * RAW_CHUNK_SIZE;
      const part = bytes.subarray(start, Math.min(start + RAW_CHUNK_SIZE, bytes.byteLength));
      await setDoc(doc(db, "drone_projects", chunkDocumentId(assetId, index)), {
        kind: "model-asset-chunk",
        projectId,
        componentId,
        assetId,
        index,
        chunks,
        byteLength: bytes.byteLength,
        data: bytesToBase64(part),
      });
    }

    result[componentId] = {
      ...record,
      fileUrl: undefined,
      cloudAsset: { assetId, chunks, byteLength: bytes.byteLength },
    };
  }

  return result;
}

/** Download cloud chunks into the IndexedDB key used by locally uploaded models. */
export async function downloadCustomModelsFromCloud(
  customModels: Record<string, CustomModelRecord>
): Promise<string[]> {
  const restored: string[] = [];

  for (const [componentId, record] of Object.entries(customModels)) {
    const asset = record.cloudAsset;
    if (!asset) continue;
    const existing = await getCachedBuffer(`custom_model_buffer_${componentId}`);
    if (existing?.byteLength === asset.byteLength) {
      restored.push(componentId);
      continue;
    }

    const parts: Uint8Array[] = [];
    let total = 0;
    for (let index = 0; index < asset.chunks; index++) {
      const snap = await getDoc(doc(db, "drone_projects", chunkDocumentId(asset.assetId, index)));
      if (!snap.exists()) throw new Error(`${record.fileName || componentId} modelining ${index + 1}-qismi bulutda topilmadi.`);
      const part = base64ToBytes(String(snap.data().data || ""));
      parts.push(part);
      total += part.byteLength;
    }
    if (total !== asset.byteLength) throw new Error(`${record.fileName || componentId} modeli to‘liq yuklanmadi.`);

    const combined = new Uint8Array(total);
    let offset = 0;
    for (const part of parts) {
      combined.set(part, offset);
      offset += part.byteLength;
    }
    await setCachedBuffer(`custom_model_buffer_${componentId}`, combined.buffer);
    restored.push(componentId);
  }

  return restored;
}
