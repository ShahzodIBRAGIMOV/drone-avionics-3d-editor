export type ModelAsset = {
  format: "glb";
  path: string;
};

export async function loadModelAsset(asset: ModelAsset): Promise<ArrayBuffer> {
  const response = await fetch(asset.path, { cache: "no-store" });
  if (!response.ok) throw new Error(`Model yuklanmadi: ${asset.path}`);
  return response.arrayBuffer();
}

export async function loadModelIndex(): Promise<Record<string, ModelAsset>> {
  const response = await fetch(`/data/model-assets.json?v=glb-assets-35743936`, { cache: "no-store" });
  if (!response.ok) throw new Error("Model indeksini yuklab bo‘lmadi");
  return response.json();
}
