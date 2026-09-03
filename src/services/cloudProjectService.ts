import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { CloudProjectData, CloudProjectSummary, PhysicalInstance, CableConnection } from "../types";

const COLLECTION_NAME = "drone_projects";

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

  // Check existing created date if updating
  let createdAt = now;
  try {
    const existing = await getDoc(docRef);
    if (existing.exists()) {
      createdAt = existing.data().createdAt || now;
    }
  } catch (err) {
    // Ignore read check error
  }

  const projectData: CloudProjectData = {
    id: docId,
    name: input.name || "3.5M UAV Avionics",
    cloudCode: code,
    createdAt,
    updatedAt: now,
    instances: input.instances,
    cables: input.cables,
    droneFrame: input.droneFrame,
    notes: input.notes,
  };

  const cleanData = sanitizeForFirestore(projectData);
  await setDoc(docRef, cleanData);

  // Also maintain quick pointer document for "main-project" if this is the active project
  if (docId !== "main-project") {
    try {
      const mainRef = doc(db, COLLECTION_NAME, "main-project");
      await setDoc(mainRef, cleanData);
    } catch (e) {
      console.warn("Could not update main-project pointer:", e);
    }
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
      return snap.data() as CloudProjectData;
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
    const q = query(colRef, where("cloudCode", "==", formattedCode), limit(1));
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
    const q = query(colRef, where("cloudCode", "==", target.toUpperCase()), limit(1));
    const querySnap = await getDocs(q);
    if (!querySnap.empty) {
      return querySnap.docs[0].data() as CloudProjectData;
    }
  } catch (err) {
    console.warn("Raw query error:", err);
  }

  return null;
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
    console.error("Failed to list cloud projects:", err);
    return [];
  }
}

export async function deleteCloudProject(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await deleteDoc(docRef);
}
