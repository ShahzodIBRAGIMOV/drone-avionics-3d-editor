export type ModelAsset = {
  format: "obj" | "stl";
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
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Response(stream).arrayBuffer();
}

export async function loadModelAsset(asset: ModelAsset): Promise<ArrayBuffer> {
  if (asset.path) {
    const response = await fetch(asset.path);
    if (!response.ok) throw new Error(\`Model yuklanmadi: \${asset.path}\`);
    return response.arrayBuffer();
  }
  if (!asset.parts?.length) throw new Error("Model manzili mavjud emas");
  const encodedParts = await Promise.all(
    asset.parts.map(async name => {
      const response = await fetch(\`/model-parts/\${name}\`);
      if (!response.ok) throw new Error(\`Model qismi yuklanmadi: \${name}\`);
      return decodeBase64(await response.text());
    })
  );
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
  const response = await fetch("/data/model-assets.json");
  if (!response.ok) throw new Error("Model indeksini yuklab bo‘lmadi");
  return response.json();
}
