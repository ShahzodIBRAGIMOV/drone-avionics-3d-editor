export type ModelAsset = {
  format: "glb";
  path: string;
};

export async function loadModelAsset(asset: ModelAsset): Promise<ArrayBuffer> {
  const response = await fetch(asset.path);
  if (!response.ok) throw new Error(`Model yuklanmadi: ${asset.path}`);
  return response.arrayBuffer();
}

export async function loadModelIndex(): Promise<Record<string, ModelAsset>> {
  const response = await fetch("/data/model-assets.json");
  if (!response.ok) throw new Error("Model indeksini yuklab bo‘lmadi");
  return response.json();
}
