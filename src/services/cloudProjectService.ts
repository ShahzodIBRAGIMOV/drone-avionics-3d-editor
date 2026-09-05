import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  deleteDoc,
  onSnapshot,
  getDocFromServer,
  Unsubscribe,
  disableNetwork,
  enableNetwork,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { CloudProjectData, CloudProjectSummary, PhysicalInstance, CableConnection } from "../types";

export const COLLECTION_NAME = "drone_projects";
const QUOTA_STORAGE_KEY = "drone_firestore_quota_exhausted_ts";

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
    },
    operationType,
    path,
  };
  console.error("Firestore Error:", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

let _isCloudQuotaExhausted = false;

// Check if error is a Firestore quota / resource exhausted error
export function isQuotaExhaustedError(err: unknown): boolean {
  if (!err) return false;
  const anyErr = err as any;
  if (anyErr?.code === "resource-exhausted") return true;
  const msg = String(anyErr?.message || err);
  return (
    msg.includes("resource-exhausted") ||
    msg.includes("RESOURCE_EXHAUSTED") ||
    msg.includes("Quota limit exceeded") ||
    msg.includes("quota metric") ||
    msg.includes("Free daily write units") ||
    msg.includes("Free daily read units")
  );
}

export function isCloudQuotaExhausted(): boolean {
  if (_isCloudQuotaExhausted) return true;
  try {
    const raw = localStorage.getItem(QUOTA_STORAGE_KEY);
    if (raw) {
      const ts = Number(raw);
      // Google Cloud Firestore daily quota resets at midnight Pacific Time (~24h window).
      // If marked within the last 18 hours, consider exhausted.
      if (!isNaN(ts) && Date.now() - ts < 18 * 60 * 60 * 1000) {
        _isCloudQuotaExhausted = true;
        return true;
      } else {
        localStorage.removeItem(QUOTA_STORAGE_KEY);
      }
    }
  } catch {}
  return false;
}

export function markCloudQuotaExhausted(): void {
  _isCloudQuotaExhausted = true;
  try {
    localStorage.setItem(QUOTA_STORAGE_KEY, String(Date.now()));
  } catch {}
  // Stop background WebSocket/HTTP retry loops and backoff spam
  try {
    disableNetwork(db).catch(() => {});
  } catch (e) {
    console.warn("Could not disable Firestore network:", e);
  }
}

export function setCloudQuotaExhausted(val: boolean): void {
  if (val) {
    markCloudQuotaExhausted();
  } else {
    _isCloudQuotaExhausted = false;
    try {
      localStorage.removeItem(QUOTA_STORAGE_KEY);
      enableNetwork(db).catch(() => {});
    } catch {}
  }
}

// Check on initial script evaluation: if already exhausted, disable network immediately
try {
  if (isCloudQuotaExhausted()) {
    disableNetwork(db).catch(() => {});
  }
} catch {}

function withTimeout<T>(promise: Promise<T>, ms: number, errorMessage = "Operation timed out"): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(errorMessage)), ms);
    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

// Quick connection validator
export async function testFirestoreConnection(): Promise<boolean> {
  if (isCloudQuotaExhausted()) return false;
  try {
    const testDocRef = doc(db, COLLECTION_NAME, "main-project");
    await withTimeout(getDocFromServer(testDocRef), 2500);
    return true;
  } catch (error) {
    if (isQuotaExhaustedError(error)) {
      markCloudQuotaExhausted();
      return false;
    }
    if (error instanceof Error && error.message.includes("client is offline")) {
      // Expected when network is disabled
      return false;
    }
    return false;
  }
}

// Generate clean 4-digit readable code e.g. DRN-8421
export function generateCloudCode(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `DRN-${num}`;
}

// Deep clean object to remove undefined values which Firestore rejects
function sanitizeForFirestore<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

export interface SaveCloudProjectInput {
  id?: string;
  name: string;
  cloudCode?: string;
  instances: PhysicalInstance[];
  cables: CableConnection[];
  droneFrame?: {
    color?: string;
    opacity?: number;
    wireframe?: boolean;
    visible?: boolean;
  };
  notes?: string;
  customManifest?: any[];
  customModels?: Record<string, any>;
  sceneTheme?: string;
  cameraViewMode?: string;
  clientId?: string;
  isExplicitReset?: boolean;
  isManualSave?: boolean;
  manualSaveTimestamp?: number;
}

export async function saveProjectToCloud(input: SaveCloudProjectInput): Promise<CloudProjectData> {
  const now = new Date().toISOString();
  const code = (input.cloudCode && input.cloudCode.trim().length > 0)
    ? input.cloudCode.trim().toUpperCase()
    : generateCloudCode();

  // If specific ID given use it, otherwise use deterministic or sanitized ID
  const docId = input.id && input.id.trim().length > 0 
    ? input.id.trim() 
    : code.toLowerCase();

  const projectData: CloudProjectData = {
    id: docId,
    name: input.name || "3.5M Twin-Motor UAV Avionics",
    cloudCode: code,
    createdAt: now,
    updatedAt: now,
    lastUpdatedByClientId: input.clientId,
    isManualSave: !!input.isManualSave,
    manualSaveTimestamp: input.manualSaveTimestamp || Date.now(),
    instances: input.instances,
    cables: input.cables || [],
    droneFrame: input.droneFrame,
    notes: input.notes,
    customManifest: input.customManifest,
    customModels: input.customModels,
    sceneTheme: input.sceneTheme,
    cameraViewMode: input.cameraViewMode,
  };

  // If daily free quota is already known to be exhausted, return immediately
  // without attempting remote writes that would hang in retry backoff
  if (isCloudQuotaExhausted()) {
    return projectData;
  }

  const docRef = doc(db, COLLECTION_NAME, docId);

  // Safety Guard: prevent empty initial state from accidentally destroying an existing project with placed components
  const hasPlacedComponents = input.instances && input.instances.some((inst) => inst.placed);
  const hasCables = Array.isArray(input.cables) && input.cables.length > 0;

  // Check existing document with a strict timeout
  let createdAt = now;
  try {
    const existingSnap = await withTimeout(getDoc(docRef), 2500, "Read check timeout");
    if (existingSnap && existingSnap.exists()) {
      const existingData = existingSnap.data() as CloudProjectData;
      createdAt = existingData.createdAt || now;

      // If user is not explicitly resetting and the incoming payload is empty,
      // but the cloud already has saved user work, DO NOT blank it out!
      if (!input.isExplicitReset && !hasPlacedComponents && !hasCables) {
        const existingHasPlaced = Array.isArray(existingData.instances) && existingData.instances.some((inst) => inst.placed);
        const existingHasCables = Array.isArray(existingData.cables) && existingData.cables.length > 0;
        if (existingHasPlaced || existingHasCables) {
          console.warn("Safety guard: Ignored attempt to overwrite populated cloud project with empty unplaced scene.");
          return existingData;
        }
      }
    }
  } catch (err: any) {
    if (isQuotaExhaustedError(err)) {
      markCloudQuotaExhausted();
      console.warn("Firestore daily quota reached during read check. LocalStorage active.");
      return projectData;
    }
    // Non-fatal read check error, proceed
  }

  projectData.createdAt = createdAt;
  const cleanData = sanitizeForFirestore(projectData);

  try {
    // Primary save with strict timeout (3.5s max to never freeze UI)
    await withTimeout(setDoc(docRef, cleanData), 3500, "Firestore write timeout");

    // Only during explicit manual save, also store a copy with the specific code ID (e.g. "drn-8421")
    // to preserve free tier quota and avoid doubling writes on autosave
    if (input.isManualSave) {
      if (docId === "main-project") {
        const specificCodeId = code.toLowerCase();
        if (specificCodeId !== "main-project") {
          try {
            const specificRef = doc(db, COLLECTION_NAME, specificCodeId);
            await withTimeout(setDoc(specificRef, { ...cleanData, id: specificCodeId }), 2500, "Specific code save timeout");
          } catch (e) {
            if (isQuotaExhaustedError(e)) {
              markCloudQuotaExhausted();
            }
          }
        }
      }
    }
  } catch (err: any) {
    if (isQuotaExhaustedError(err)) {
      markCloudQuotaExhausted();
      console.warn(
        "Firebase Firestore free tier daily write limit reached (resource-exhausted). The project is saved locally in your browser storage (LocalStorage)."
      );
    } else {
      console.warn("Firestore save notice:", err?.message || err);
    }
    // Return projectData cleanly so callers never hang on 'saving' state
    return projectData;
  }

  return projectData;
}

export async function loadProjectFromCloud(codeOrId: string): Promise<CloudProjectData | null> {
  if (!codeOrId || !codeOrId.trim()) return null;
  if (isCloudQuotaExhausted()) return null;
  const target = codeOrId.trim();

  // 1. Try direct ID lookup
  try {
    const docRef = doc(db, COLLECTION_NAME, target);
    const snap = await withTimeout(getDoc(docRef), 2500, "Direct doc read timeout");
    if (snap.exists()) {
      const data = snap.data() as CloudProjectData;
      const hasPlaced = Array.isArray(data.instances) && data.instances.some((i) => i.placed);
      if (target === "main-project" && !hasPlaced) {
        const latestFromList = await findLatestPopulatedProject();
        if (latestFromList) return latestFromList;
      }
      return data;
    }
  } catch (err) {
    if (isQuotaExhaustedError(err)) {
      markCloudQuotaExhausted();
      return null;
    }
    console.warn("Direct document get notice:", err);
  }

  // 2. Try lowercase ID lookup (e.g. "drn-8421")
  try {
    const docRef = doc(db, COLLECTION_NAME, target.toLowerCase());
    const snap = await withTimeout(getDoc(docRef), 2000, "Lowercase doc read timeout");
    if (snap.exists()) {
      return snap.data() as CloudProjectData;
    }
  } catch (err) {
    if (isQuotaExhaustedError(err)) {
      markCloudQuotaExhausted();
      return null;
    }
  }

  // 3. Try query by cloudCode (e.g. "DRN-8421" or "8421")
  const formattedCode = target.toUpperCase().startsWith("DRN-") 
    ? target.toUpperCase() 
    : `DRN-${target.toUpperCase()}`;

  try {
    const colRef = collection(db, COLLECTION_NAME);
    const q = query(colRef, where("cloudCode", "==", formattedCode));
    const querySnap = await getDocs(q);
    if (!querySnap.empty) {
      return querySnap.docs[0].data() as CloudProjectData;
    }
  } catch (err) {
    if (isQuotaExhaustedError(err)) {
      markCloudQuotaExhausted();
      return null;
    }
  }

  // 4. Also check raw without prefix
  try {
    const colRef = collection(db, COLLECTION_NAME);
    const q = query(colRef, where("cloudCode", "==", target.toUpperCase()));
    const querySnap = await getDocs(q);
    if (!querySnap.empty) {
      return querySnap.docs[0].data() as CloudProjectData;
    }
  } catch (err) {
    if (isQuotaExhaustedError(err)) {
      markCloudQuotaExhausted();
      return null;
    }
  }

  // 5. Fallback: If target was "main-project", find the most recently modified populated project
  if (target === "main-project") {
    return await findLatestPopulatedProject();
  }

  return null;
}

// Find the newest project in the database that has placed components or cables
async function findLatestPopulatedProject(): Promise<CloudProjectData | null> {
  if (isCloudQuotaExhausted()) return null;
  try {
    const colRef = collection(db, COLLECTION_NAME);
    const snap = await getDocs(colRef);
    let bestCandidate: CloudProjectData | null = null;
    let bestCandidateTime = 0;

    snap.forEach((d) => {
      const data = d.data() as CloudProjectData;
      if (data && Array.isArray(data.instances)) {
        const hasPlaced = data.instances.some((i) => i.placed);
        const hasCables = Array.isArray(data.cables) && data.cables.length > 0;
        if (hasPlaced || hasCables) {
          const time = new Date(data.updatedAt || data.createdAt || 0).getTime();
          if (time > bestCandidateTime) {
            bestCandidateTime = time;
            bestCandidate = data;
          }
        }
      }
    });

    return bestCandidate;
  } catch (err) {
    if (isQuotaExhaustedError(err)) {
      markCloudQuotaExhausted();
      return null;
    }
    console.warn("Could not find latest populated project:", err);
    return null;
  }
}

// Subscribe to real-time updates of the main shared project
export function subscribeToMainProject(
  onUpdate: (data: CloudProjectData, metadata: { hasPendingWrites: boolean; fromCache: boolean }) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  if (isCloudQuotaExhausted()) {
    return () => {};
  }
  const docRef = doc(db, COLLECTION_NAME, "main-project");
  let unsub: Unsubscribe = () => {};
  try {
    unsub = onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as CloudProjectData;
          onUpdate(data, {
            hasPendingWrites: snap.metadata.hasPendingWrites,
            fromCache: snap.metadata.fromCache,
          });
        }
      },
      (err: any) => {
        if (isQuotaExhaustedError(err)) {
          console.warn("Firestore subscription stopped due to quota limit. LocalStorage fallback active.");
          markCloudQuotaExhausted();
          try {
            unsub();
          } catch {}
        } else {
          console.warn("Real-time main project subscription notice:", err);
        }
        if (onError) onError(err);
      }
    );
  } catch (e: any) {
    if (isQuotaExhaustedError(e)) {
      markCloudQuotaExhausted();
    }
    return () => {};
  }
  return unsub;
}

export async function listCloudProjects(): Promise<CloudProjectSummary[]> {
  if (isCloudQuotaExhausted()) {
    return [];
  }
  try {
    const colRef = collection(db, COLLECTION_NAME);
    const snap = await getDocs(colRef);
    const list: CloudProjectSummary[] = [];

    snap.forEach((d) => {
      if (d.id === "main-project" && snap.size > 1) {
        return;
      }
      const data = d.data() as CloudProjectData;
      if (data && data.cloudCode) {
        const instances = Array.isArray(data.instances) ? data.instances : [];
        list.push({
          id: d.id,
          name: data.name || "Avionika Loyihasi",
          cloudCode: data.cloudCode,
          updatedAt: data.updatedAt || new Date().toISOString(),
          instancesCount: instances.length,
          placedCount: instances.filter((i) => i.placed).length,
          cablesCount: Array.isArray(data.cables) ? data.cables.length : 0,
        });
      }
    });

    list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return list;
  } catch (err: any) {
    if (isQuotaExhaustedError(err)) {
      markCloudQuotaExhausted();
      return [];
    }
    handleFirestoreError(err, OperationType.LIST, COLLECTION_NAME);
  }
}

export async function deleteCloudProject(id: string): Promise<void> {
  if (isCloudQuotaExhausted()) {
    console.warn("Cannot delete remote project while quota is exhausted.");
    return;
  }
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  } catch (err: any) {
    if (isQuotaExhaustedError(err)) {
      markCloudQuotaExhausted();
      return;
    }
    handleFirestoreError(err, OperationType.DELETE, `${COLLECTION_NAME}/${id}`);
  }
}
