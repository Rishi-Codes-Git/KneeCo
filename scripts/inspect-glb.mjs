import { readFile } from "node:fs/promises";

const filePath = process.argv[2];
if (!filePath) throw new Error("Usage: node scripts/inspect-glb.mjs <asset.glb>");

const data = await readFile(filePath);
if (data.toString("utf8", 0, 4) !== "glTF") throw new Error("The supplied file is not a binary glTF asset.");

const version = data.readUInt32LE(4);
const declaredLength = data.readUInt32LE(8);
let offset = 12;
let document;

while (offset + 8 <= data.length) {
  const length = data.readUInt32LE(offset);
  const type = data.readUInt32LE(offset + 4);
  const chunk = data.subarray(offset + 8, offset + 8 + length);
  if (type === 0x4e4f534a) document = JSON.parse(chunk.toString("utf8").trim());
  offset += 8 + length;
}

if (!document) throw new Error("The GLB does not contain a readable JSON scene description.");

const accessorBounds = (accessorIndex) => {
  const accessor = document.accessors?.[accessorIndex];
  return accessor?.min && accessor?.max ? { min: accessor.min, max: accessor.max } : null;
};

const meshSummaries = (document.meshes ?? []).map((mesh, meshIndex) => ({
  index: meshIndex,
  name: mesh.name ?? "unnamed",
  primitives: mesh.primitives?.length ?? 0,
  materials: [...new Set((mesh.primitives ?? []).map((primitive) => primitive.material).filter((value) => value !== undefined))],
  positionBounds: (mesh.primitives ?? []).map((primitive) => accessorBounds(primitive.attributes?.POSITION)).filter(Boolean),
}));

const nodeSummaries = (document.nodes ?? []).map((node, nodeIndex) => ({
  index: nodeIndex,
  name: node.name ?? "unnamed",
  mesh: node.mesh ?? null,
  children: node.children ?? [],
  translation: node.translation ?? [0, 0, 0],
  scale: node.scale ?? [1, 1, 1],
}));

console.log(JSON.stringify({
  file: filePath,
  sizeBytes: data.length,
  glbVersion: version,
  declaredLength,
  asset: document.asset,
  sceneCount: document.scenes?.length ?? 0,
  defaultScene: document.scene ?? null,
  nodeCount: nodeSummaries.length,
  meshCount: meshSummaries.length,
  materialCount: document.materials?.length ?? 0,
  textureCount: document.textures?.length ?? 0,
  imageCount: document.images?.length ?? 0,
  extensionsUsed: document.extensionsUsed ?? [],
  extensionsRequired: document.extensionsRequired ?? [],
  nodes: nodeSummaries,
  meshes: meshSummaries,
  materials: (document.materials ?? []).map((material, index) => ({ index, name: material.name ?? "unnamed", alphaMode: material.alphaMode ?? "OPAQUE" })),
}, null, 2));
