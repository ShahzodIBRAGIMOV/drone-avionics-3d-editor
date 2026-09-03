export type ModelAsset = {
  format: "glb";
  path?: string;
  parts?: string[];
};

function decodeBase64(value: string): Uint8Array {
  const clean = value.trim();
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function gunzip(bytes: Uint8Array): Promise<ArrayBuffer> {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const stream = new Blob([copy.buffer]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Response(stream).arrayBuffer();
}

export async function loadModelAsset(asset: ModelAsset): Promise<ArrayBuffer> {
  if (asset.path) {
    const response = await fetch(asset.path, { cache: "no-store" });
    if (!response.ok) throw new Error(`Model yuklanmadi: ${asset.path}`);
    return response.arrayBuffer();
  }
  if (!asset.parts?.length) throw new Error("Model manzili mavjud emas");
  const encodedParts = await Promise.all(asset.parts.map(async path => {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) throw new Error(`Model qismi yuklanmadi: ${path}`);
    return decodeBase64(await response.text());
  }));
  const total = encodedParts.reduce((sum, part) => sum + part.length, 0);
  const joined = new Uint8Array(total);
  let offset = 0;
  for (const part of encodedParts) {
    joined.set(part, offset);
    offset += part.length;
  }
  return gunzip(joined);
}

export async function loadModelIndex(): Promise<Record<string, ModelAsset>> {
  const response = await fetch(`/data/model-assets.json?v=p3737-full-5b806628`, { cache: "no-store" });
  if (!response.ok) throw new Error("Model indeksini yuklab bo‘lmadi");
  return response.json();
}
