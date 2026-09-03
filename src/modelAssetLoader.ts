export type ModelAsset = {
  format: "obj" | "stl" | "glb" | "gltf";
  path?: string;
  parts?: string[];
};

// In-memory runtime cache
const memoryCache = new Map<string, ArrayBuffer>();
let indexMemoryCache: Record<string, ModelAsset> | null = null;

const CACHE_NAME = "drone-models-persistent-cache-v6";
const CACHE_PREFIX = "https://drone-storage.internal/models/";
const DB_NAME = "DroneAvionicsModelsCache_v6";
const STORE_NAME = "model_buffers";
const INDEX_CACHE_KEY = "drone_model_index_cache_v6";
const INDEX_URL = "/data/model-assets.json?v=p3737-approved-stl-5b806628";

// 1. IndexedDB Persistent Storage
function openCacheDB(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

// 2. CacheStorage API (Survives browser reloads, standard disk cache)
async function getFromCacheStorage(key: string): Promise<ArrayBuffer | null> {
  if (typeof caches === "undefined") return null;
  try {
    const cache = await caches.open(CACHE_NAME);
    const resp = await cache.match(`${CACHE_PREFIX}${encodeURIComponent(key)}`);
    if (resp && resp.ok) {
      return await resp.arrayBuffer();
    }
  } catch {
    // Non-blocking fallback
  }
  return null;
}

async function putToCacheStorage(key: string, buffer: ArrayBuffer): Promise<void> {
  if (typeof caches === "undefined") return;
  try {
    const cache = await caches.open(CACHE_NAME);
    const resp = new Response(buffer.slice(0), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
    await cache.put(`${CACHE_PREFIX}${encodeURIComponent(key)}`, resp);
  } catch {
    // Non-blocking
  }
}

export async function getCachedBuffer(key: string): Promise<ArrayBuffer | null> {
  // Check memory
  if (memoryCache.has(key)) {
    return memoryCache.get(key)!;
  }

  // Check CacheStorage
  const csBuffer = await getFromCacheStorage(key);
  if (csBuffer && csBuffer.byteLength > 0) {
    memoryCache.set(key, csBuffer);
    return csBuffer;
  }

  // Check IndexedDB
  try {
    const db = await openCacheDB();
    if (!db) return null;
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => {
        if (req.result instanceof ArrayBuffer && req.result.byteLength > 0) {
          memoryCache.set(key, req.result);
          // Also backfill CacheStorage for high-speed retrieval
          putToCacheStorage(key, req.result);
          resolve(req.result);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function setCachedBuffer(key: string, buffer: ArrayBuffer): Promise<void> {
  memoryCache.set(key, buffer);

  // Put into CacheStorage
  await putToCacheStorage(key, buffer);

  // Put into IndexedDB
  try {
    const db = await openCacheDB();
    if (!db) return;
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(buffer, key);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  } catch (err) {
    console.warn("Could not save to IndexedDB cache:", err);
  }
}

export async function clearAllModelCache(): Promise<void> {
  memoryCache.clear();
  indexMemoryCache = null;

  // Clear CacheStorage
  if (typeof caches !== "undefined") {
    try {
      await caches.delete(CACHE_NAME);
    } catch {}
  }

  // Clear IndexedDB
  try {
    const db = await openCacheDB();
    if (db) {
      await new Promise<void>((resolve) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
      });
    }
  } catch {}

  try {
    localStorage.removeItem("drone_model_index_cache");
    localStorage.removeItem(INDEX_CACHE_KEY);
  } catch {}
}

function decodeBase64(value: string): Uint8Array {
  const clean = value.trim();
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function gunzip(bytes: Uint8Array): Promise<ArrayBuffer> {
  const buffer = new Uint8Array(bytes).buffer;
  const stream = new Blob([buffer]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Response(stream).arrayBuffer();
}

function getAssetCacheKey(asset: ModelAsset): string {
  if (asset.path) return `path:${asset.path}`;
  if (asset.parts && asset.parts.length > 0) return `parts:${asset.parts.join("+")}`;
  return "unknown_asset";
}

async function fetchPartWithCache(name: string, cacheBuster?: number): Promise<Uint8Array> {
  const partUrl = name.startsWith("/") ? name : `/model-parts/${name}`;

  // Check CacheStorage for this specific part
  if (!cacheBuster && typeof caches !== "undefined") {
    try {
      const cache = await caches.open(CACHE_NAME);
      const matched = await cache.match(partUrl);
      if (matched && matched.ok) {
        const text = await matched.text();
        return decodeBase64(text);
      }
    } catch {}
  }

  const separator = partUrl.includes("?") ? "&" : "?";
  const requestUrl = cacheBuster ? `${partUrl}${separator}t=${cacheBuster}` : partUrl;
  const response = await fetch(requestUrl, { cache: "no-store" });
  if (!response.ok) throw new Error(`Model qismi yuklanmadi: ${name}`);

  // Store in CacheStorage
  if (!cacheBuster && typeof caches !== "undefined") {
    try {
      const cache = await caches.open(CACHE_NAME);
      cache.put(partUrl, response.clone());
    } catch {}
  }

  const text = await response.text();
  return decodeBase64(text);
}

export async function loadModelAsset(asset: ModelAsset, cacheBuster?: number): Promise<ArrayBuffer> {
  const cacheKey = getAssetCacheKey(asset);

  // 1. Check permanent browser cache (CacheStorage + IndexedDB + RAM)
  if (!cacheBuster) {
    const cached = await getCachedBuffer(cacheKey);
    if (cached && cached.byteLength > 0) {
      return cached;
    }
  }

  // 2. Otherwise fetch and process
  let finalBuffer: ArrayBuffer;

  if (asset.path) {
    const pathUrl = asset.path;
    // Check if the file is in CacheStorage
    if (!cacheBuster && typeof caches !== "undefined") {
      try {
        const cache = await caches.open(CACHE_NAME);
        const matched = await cache.match(pathUrl);
        if (matched && matched.ok) {
          finalBuffer = await matched.arrayBuffer();
          await setCachedBuffer(cacheKey, finalBuffer);
          return finalBuffer;
        }
      } catch {}
    }

    const separator = pathUrl.includes("?") ? "&" : "?";
    const requestUrl = cacheBuster ? `${pathUrl}${separator}t=${cacheBuster}` : pathUrl;
    const response = await fetch(requestUrl, { cache: "no-store" });
    if (!response.ok) throw new Error(`Model yuklanmadi: ${asset.path}`);

    if (!cacheBuster && typeof caches !== "undefined") {
      try {
        const cache = await caches.open(CACHE_NAME);
        cache.put(pathUrl, response.clone());
      } catch {}
    }

    finalBuffer = await response.arrayBuffer();
  } else if (asset.parts?.length) {
    // Fetch parts (each individually cached in browser storage)
    const encodedParts = await Promise.all(
      asset.parts.map((name) => fetchPartWithCache(name, cacheBuster))
    );

    const total = encodedParts.reduce((sum, part) => sum + part.length, 0);
    const joined = new Uint8Array(total);
    let offset = 0;
    for (const part of encodedParts) {
      joined.set(part, offset);
      offset += part.length;
    }
    finalBuffer = await gunzip(joined);
  } else {
    throw new Error("Model manzili mavjud emas");
  }

  // 3. Save processed buffer permanently in CacheStorage & IndexedDB
  await setCachedBuffer(cacheKey, finalBuffer);

  return finalBuffer;
}

export async function loadModelIndex(cacheBuster?: number): Promise<Record<string, ModelAsset>> {
  if (!cacheBuster && indexMemoryCache) {
    return indexMemoryCache;
  }

  const indexUrl = INDEX_URL;

  // Try reading from browser cache
  if (!cacheBuster && typeof caches !== "undefined") {
    try {
      const cache = await caches.open(CACHE_NAME);
      const matched = await cache.match(indexUrl);
      if (matched && matched.ok) {
        const data = await matched.json();
        indexMemoryCache = data;
        return data;
      }
    } catch {}
  }

  // Try reading from localStorage
  if (!cacheBuster) {
    try {
      const stored = localStorage.getItem(INDEX_CACHE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        indexMemoryCache = data;
        return data;
      }
    } catch {}
  }

  const separator = indexUrl.includes("?") ? "&" : "?";
  const requestUrl = cacheBuster ? `${indexUrl}${separator}t=${cacheBuster}` : indexUrl;
  const response = await fetch(requestUrl, { cache: "no-store" });
  if (!response.ok) throw new Error("Model indeksini yuklab bo‘lmadi");

  if (!cacheBuster && typeof caches !== "undefined") {
    try {
      const cache = await caches.open(CACHE_NAME);
      cache.put(indexUrl, response.clone());
    } catch {}
  }

  const data = await response.json();
  indexMemoryCache = data;

  try {
    localStorage.setItem(INDEX_CACHE_KEY, JSON.stringify(data));
  } catch {}

  return data;
}

export async function getModelCacheInfo(): Promise<{ cachedAssetsCount: number; hasStorage: boolean }> {
  let count = 0;
  try {
    if (typeof caches !== "undefined") {
      const cache = await caches.open(CACHE_NAME);
      const keys = await cache.keys();
      count = keys.length;
    }
    return {
      cachedAssetsCount: count,
      hasStorage: true,
    };
  } catch {
    return {
      cachedAssetsCount: 0,
      hasStorage: false,
    };
  }
}

export async function prefetchAndCacheAllModels(
  onProgress?: (current: number, total: number, key: string) => void
): Promise<{ success: number; failed: number }> {
  const index = await loadModelIndex();
  const keys = Object.keys(index);
  let success = 0;
  let failed = 0;

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const asset = index[key];
    if (onProgress) onProgress(i + 1, keys.length, key);
    try {
      await loadModelAsset(asset);
      success++;
    } catch (e) {
      console.warn(`Cache prefetch error for ${key}:`, e);
      failed++;
    }
  }

  return { success, failed };
}
