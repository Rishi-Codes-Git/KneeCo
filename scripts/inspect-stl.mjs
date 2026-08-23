import { readFile } from "node:fs/promises";
import { STLLoader } from "three/addons/loaders/STLLoader.js";

const files = process.argv.slice(2);
if (files.length === 0) throw new Error("Usage: node scripts/inspect-stl.mjs <mesh.stl> [...mesh.stl]");

const loader = new STLLoader();
const results = [];

for (const filePath of files) {
  const bytes = await readFile(filePath);
  const geometry = loader.parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  const bounds = geometry.boundingBox;
  results.push({
    file: filePath,
    triangleCount: geometry.getAttribute("position").count / 3,
    bounds: {
      min: bounds?.min.toArray(),
      max: bounds?.max.toArray(),
      size: bounds?.getSize(new (bounds.min.constructor)()).toArray(),
      center: bounds?.getCenter(new (bounds.min.constructor)()).toArray(),
    },
    radius: geometry.boundingSphere?.radius,
  });
  geometry.dispose();
}

console.log(JSON.stringify(results, null, 2));
