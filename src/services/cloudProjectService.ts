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
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { CloudProjectData, CloudProjectSummary, PhysicalInstance, CableConnection } from "../types";

export const COLLECTION_NAME = "drone_projects";

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

// Quick connection validator
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    const testDocRef = doc(db, COLLECTION_NAME, "main-project");
    await getDocFromServer(testDocRef);
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes("client is offline")) {
      console.warn("Firestore client is offline, using cache or waiting for network.");
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

  const docRef = doc(db, COLLECTION_NAME, docId);

  // Safety Guard: prevent empty initial state from accidentally destroying an existing project with placed components
  const hasPlacedComponents = input.instances && input.instances.some((inst) => inst.placed);
  const hasCables = Array.isArray(input.cables) && input.cables.length > 0;

  // Check existing document
  let createdAt = now;
  try {
    const existingSnap = await getDoc(docRef);
    if (existingSnap.exists()) {
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
  } catch (err) {
    // If read fails, proceed with save
    console.warn("Read check notice during save:", err);
  }

  const projectData: CloudProjectData = {
    id: docId,
    name: input.name || "3.5M Twin-Motor UAV Avionics",
    cloudCode: code,
    createdAt,
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

  const cleanData = sanitizeForFirestore(projectData);

  try {
    // Primary save
    await setDoc(docRef, cleanData);

    // If saving as "main-project", also store a copy with the specific code ID (e.g. "drn-8421")
    // so the code is permanently queryable and listed
    if (docId === "main-project") {
      const specificCodeId = code.toLowerCase();
      if (specificCodeId !== "main-project") {
        try {
          const specificRef = doc(db, COLLECTION_NAME, specificCodeId);
          await setDoc(specificRef, { ...cleanData, id: specificCodeId });
        } catch (e) {
          console.warn("Could not save specific code copy:", e);
        }
      }
    } else {
      // If saving with a specific ID/code, also sync "main-project" as the active pointer
      try {
        const mainRef = doc(db, COLLECTION_NAME, "main-project");
        await setDoc(mainRef, { ...cleanData, id: "main-project" });
      } catch (e) {
        console.warn("Could not update main-project pointer:", e);
      }
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${COLLECTION_NAME}/${docId}`);
  }

  return projectData;
}

export async function loadProjectFromCloud(codeOrId: string): Promise<CloudProjectData | null> {
  if (!codeOrId || !codeOrId.trim()) return null;
  const target = codeOrId.trim();

  // 1. Try direct ID lookup
  try {
    const docRef = doc(db, COLLECTION_NAME, target);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as CloudProjectData;
      // If target was "main-project" but it has 0 placed components, check if there's an archived project
      const hasPlaced = Array.isArray(data.instances) && data.instances.some((i) => i.placed);
      if (target === "main-project" && !hasPlaced) {
        const latestFromList = await findLatestPopulatedProject();
        if (latestFromList) return latestFromList;
      }
      return data;
    }
  } catch (err) {
    console.warn("Direct document get error:", err);
  }

  // 2. Try lowercase ID lookup (e.g. "drn-8421")
  try {
    const docRef = doc(db, COLLECTION_NAME, target.toLowerCase());
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as CloudProjectData;
    }
  } catch (err) {
    console.warn("Direct lowercase get error:", err);
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
    console.warn("Cloud code query error:", err);
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
    console.warn("Raw query error:", err);
  }

  // 5. Fallback: If target was "main-project", find the most recently modified populated project
  if (target === "main-project") {
    return await findLatestPopulatedProject();
  }

  return null;
}

// Find the newest project in the database that has placed components or cables
async function findLatestPopulatedProject(): Promise<CloudProjectData | null> {
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
    console.warn("Could not find latest populated project:", err);
    return null;
  }
}

// Subscribe to real-time updates of the main shared project
export function subscribeToMainProject(
  onUpdate: (data: CloudProjectData, metadata: { hasPendingWrites: boolean; fromCache: boolean }) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  const docRef = doc(db, COLLECTION_NAME, "main-project");
  return onSnapshot(
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
    (err) => {
      console.warn("Real-time main project subscription notice:", err);
      if (onError) onError(err);
    }
  );
}

export async function listCloudProjects(): Promise<CloudProjectSummary[]> {
  try {
    const colRef = collection(db, COLLECTION_NAME);
    const snap = await getDocs(colRef);
    const list: CloudProjectSummary[] = [];

    snap.forEach((d) => {
      // Exclude internal alias "main-project" from duplicated listing if distinct id exists
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

    // Sort by most recently updated
    list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return list;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, COLLECTION_NAME);
  }
}

export async function deleteCloudProject(id: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${COLLECTION_NAME}/${id}`);
  }
}
