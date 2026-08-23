import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Box, CircleGauge, Cuboid, Layers3, Maximize2, Ruler, Rotate3D } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export type Knee3DMode = "natural" | "implant" | "comparison" | "exploded" | "measurements";

export type Knee3DDimensions = {
  femoralApMm?: number;
  femoralWidthMm?: number;
  tibialApMm?: number;
  tibialWidthMm?: number;
};

type Knee3DModuleProps = {
  hasUploadedStudy: boolean;
  studyFileName?: string;
  dimensions: Knee3DDimensions;
  initialMode?: Knee3DMode;
  onModeChange?: (mode: Knee3DMode) => void;
  onModelReady?: () => void;
  onMeasurementsChange?: (dimensions: Knee3DDimensions) => void;
};

type SceneHandles = {
  anatomy: THREE.Object3D[];
  implants: THREE.Object3D[];
  measurementGroup: THREE.Group;
  nativeMaterials: THREE.Material[];
  implantMaterials: THREE.Material[];
};

const modes: Array<{ id: Knee3DMode; label: string; icon: typeof Rotate3D }> = [
  { id: "natural", label: "Before surgery", icon: Rotate3D },
  { id: "implant", label: "After surgery", icon: Cuboid },
  { id: "comparison", label: "Before / After", icon: Layers3 },
  { id: "exploded", label: "Exploded", icon: Box },
  { id: "measurements", label: "Dimensions", icon: Ruler },
];

const dimensionLabels: Array<[keyof Knee3DDimensions, string]> = [
  ["femoralWidthMm", "Femur ML"],
  ["femoralApMm", "Femur AP"],
  ["tibialWidthMm", "Tibia ML"],
  ["tibialApMm", "Tibia AP"],
];

function material(color: string, options: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.46, metalness: 0.04, ...options });
}

function makeMesh(geometry: THREE.BufferGeometry, meshMaterial: THREE.Material, position: THREE.Vector3Tuple, scale: THREE.Vector3Tuple = [1, 1, 1]) {
  const mesh = new THREE.Mesh(geometry, meshMaterial);
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function addArrow(group: THREE.Group, origin: THREE.Vector3, direction: THREE.Vector3, length: number) {
  const arrow = new THREE.ArrowHelper(direction.normalize(), origin, length, 0x1479a9, 0.22, 0.12);
  (arrow.line.material as THREE.Material).depthTest = false;
  (arrow.cone.material as THREE.Material).depthTest = false;
  arrow.renderOrder = 8;
  group.add(arrow);
}

function setOpacity(materials: THREE.Material[], opacity: number) {
  materials.forEach((entry) => {
    const value = entry as THREE.MeshStandardMaterial;
    value.transparent = opacity < 1;
    value.opacity = opacity;
    value.depthWrite = opacity >= 1;
    value.needsUpdate = true;
  });
}

function disposeObject(root: THREE.Object3D) {
  root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    mesh.geometry?.dispose?.();
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    materials.forEach((entry) => entry?.dispose?.());
  });
}

function createSceneHandles(scene: THREE.Scene, dimensions: Knee3DDimensions): SceneHandles {
  const anatomy: THREE.Object3D[] = [];
  const implants: THREE.Object3D[] = [];
  const nativeMaterials: THREE.Material[] = [];
  const implantMaterials: THREE.Material[] = [];
  const bone = material("#e7ddc9", { roughness: 0.38, metalness: 0.02 });
  const cartilage = material("#d98b98", { roughness: 0.26, metalness: 0.08 });
  const meniscus = material("#5d91aa", { roughness: 0.25, metalness: 0.12 });
  nativeMaterials.push(bone, cartilage, meniscus);

  const nativeGroup = new THREE.Group();
  nativeGroup.name = "conceptual-native-knee";
  const femur = new THREE.Group();
  femur.name = "femur";
  femur.add(makeMesh(new THREE.CylinderGeometry(0.7, 0.9, 3.4, 36), bone, [0, 2.4, 0]));
  femur.add(makeMesh(new THREE.SphereGeometry(0.96, 36, 24), bone, [-0.66, 0.82, 0], [1.1, 0.72, 1]));
  femur.add(makeMesh(new THREE.SphereGeometry(0.96, 36, 24), bone, [0.66, 0.82, 0], [1.1, 0.72, 1]));
  femur.add(makeMesh(new THREE.CapsuleGeometry(0.55, 1.1, 12, 24), bone, [0, 1.33, -0.05], [1.2, 0.66, 0.96]));
  femur.add(makeMesh(new THREE.SphereGeometry(0.86, 32, 20), cartilage, [-0.66, 0.35, 0.03], [1.07, 0.18, 0.93]));
  femur.add(makeMesh(new THREE.SphereGeometry(0.86, 32, 20), cartilage, [0.66, 0.35, 0.03], [1.07, 0.18, 0.93]));

  const tibia = new THREE.Group();
  tibia.name = "tibia";
  tibia.add(makeMesh(new THREE.CylinderGeometry(0.76, 0.6, 3.2, 36), bone, [0, -2.42, 0]));
  tibia.add(makeMesh(new THREE.CapsuleGeometry(0.75, 1.2, 12, 24), bone, [0, -0.75, 0], [1.36, 0.46, 1.05]));
  tibia.add(makeMesh(new THREE.SphereGeometry(1.02, 32, 20), cartilage, [0, -0.15, 0.02], [1.42, 0.12, 1.02]));

  const patella = makeMesh(new THREE.SphereGeometry(0.7, 32, 22), bone, [0, 1.02, 1.05], [0.82, 1.15, 0.36]);
  patella.name = "patella";
  const meniscalRing = makeMesh(new THREE.TorusGeometry(1.13, 0.14, 14, 48, Math.PI * 1.72), meniscus, [0, 0.03, 0.08], [1.12, 0.35, 0.92]);
  meniscalRing.rotation.x = Math.PI / 2;
  meniscalRing.name = "meniscus";
  nativeGroup.add(femur, tibia, patella, meniscalRing);
  scene.add(nativeGroup);
  anatomy.push(nativeGroup);

  const surgicalBlue = new THREE.MeshBasicMaterial({ color: "#1378b5", depthTest: false, transparent: true, opacity: 0.98 });
  const surgicalBlueEdge = new THREE.MeshBasicMaterial({ color: "#0d4f83", depthTest: false, transparent: true, opacity: 0.98 });
  const insertMaterial = new THREE.MeshBasicMaterial({ color: "#f8fbff", depthTest: false, transparent: true, opacity: 0.99 });
  implantMaterials.push(surgicalBlue, surgicalBlueEdge, insertMaterial);

  const implantGroup = new THREE.Group();
  implantGroup.name = "conceptual-implant-assembly";
  const femoralLeft = makeMesh(new THREE.BoxGeometry(1.04, 0.42, 0.95), surgicalBlue, [-0.64, 0.4, 0.12], [1, 1, 1]);
  femoralLeft.name = "left-femoral-component";
  const femoralRight = makeMesh(new THREE.BoxGeometry(1.04, 0.42, 0.95), surgicalBlue, [0.64, 0.4, 0.12]);
  femoralRight.name = "right-femoral-component";
  const femoralBridge = makeMesh(new THREE.BoxGeometry(0.54, 0.34, 0.7), surgicalBlueEdge, [0, 0.42, 0.12]);
  femoralBridge.name = "femoral-bridge";
  const leftStem = makeMesh(new THREE.CylinderGeometry(0.14, 0.14, 0.92, 16), surgicalBlueEdge, [-0.64, -0.05, 0.12]);
  leftStem.name = "left-femoral-stem";
  const rightStem = makeMesh(new THREE.CylinderGeometry(0.14, 0.14, 0.92, 16), surgicalBlueEdge, [0.64, -0.05, 0.12]);
  rightStem.name = "right-femoral-stem";
  const insert = makeMesh(new THREE.BoxGeometry(2.35, 0.22, 1.35), insertMaterial, [0, -0.14, 0.1]);
  insert.name = "polyethylene-insert";
  const tray = makeMesh(new THREE.BoxGeometry(2.5, 0.18, 1.55), surgicalBlue, [0, -0.44, 0.1]);
  tray.name = "tibial-tray";
  const tibialStem = makeMesh(new THREE.CylinderGeometry(0.22, 0.22, 1.35, 20), surgicalBlueEdge, [0, -1.1, 0.1]);
  tibialStem.name = "tibial-stem";
  implantGroup.add(femoralLeft, femoralRight, femoralBridge, leftStem, rightStem, insert, tray, tibialStem);
  implantGroup.visible = false;
  implantGroup.traverse((node) => { node.renderOrder = 6; node.frustumCulled = false; });
  scene.add(implantGroup);
  implants.push(implantGroup);

  const measurementGroup = new THREE.Group();
  measurementGroup.name = "dimension-overlay";
  measurementGroup.visible = false;
  const femurMl = Math.max(1.4, (dimensions.femoralWidthMm ?? 60) / 34);
  const tibiaMl = Math.max(1.5, (dimensions.tibialWidthMm ?? 65) / 34);
  addArrow(measurementGroup, new THREE.Vector3(-femurMl, 0.95, 1.26), new THREE.Vector3(1, 0, 0), femurMl * 2);
  addArrow(measurementGroup, new THREE.Vector3(-tibiaMl, -0.65, 1.23), new THREE.Vector3(1, 0, 0), tibiaMl * 2);
  addArrow(measurementGroup, new THREE.Vector3(1.72, 1.8, 1.16), new THREE.Vector3(0, -1, 0), Math.max(1.1, (dimensions.femoralApMm ?? 50) / 32));
  addArrow(measurementGroup, new THREE.Vector3(-1.72, -0.1, 1.16), new THREE.Vector3(0, -1, 0), Math.max(1.1, (dimensions.tibialApMm ?? 45) / 32));
  scene.add(measurementGroup);

  return { anatomy, implants, measurementGroup, nativeMaterials, implantMaterials };
}

function applyMode(handles: SceneHandles, mode: Knee3DMode) {
  const [anatomy] = handles.anatomy;
  const [implantGroup] = handles.implants;
  const resetImplant = () => {
    implantGroup.children.forEach((part) => part.position.copy({
      "left-femoral-component": new THREE.Vector3(-0.64, 0.4, 0.12),
      "right-femoral-component": new THREE.Vector3(0.64, 0.4, 0.12),
      "femoral-bridge": new THREE.Vector3(0, 0.42, 0.12),
      "left-femoral-stem": new THREE.Vector3(-0.64, -0.05, 0.12),
      "right-femoral-stem": new THREE.Vector3(0.64, -0.05, 0.12),
      "polyethylene-insert": new THREE.Vector3(0, -0.14, 0.1),
      "tibial-tray": new THREE.Vector3(0, -0.44, 0.1),
      "tibial-stem": new THREE.Vector3(0, -1.1, 0.1),
    }[part.name] ?? new THREE.Vector3()));
  };
  resetImplant();
  handles.measurementGroup.visible = false;
  setOpacity(handles.nativeMaterials, 1);
  anatomy.visible = true;
  implantGroup.visible = false;
  if (mode === "implant") {
    implantGroup.visible = true;
    setOpacity(handles.nativeMaterials, 0.56);
  }
  if (mode === "comparison") {
    implantGroup.visible = true;
    setOpacity(handles.nativeMaterials, 0.28);
  }
  if (mode === "exploded") {
    implantGroup.visible = true;
    setOpacity(handles.nativeMaterials, 0.12);
    const offsets: Record<string, THREE.Vector3> = {
      "left-femoral-component": new THREE.Vector3(-1.45, 1.25, 0.18),
      "right-femoral-component": new THREE.Vector3(1.45, 1.25, 0.18),
      "femoral-bridge": new THREE.Vector3(0, 1.85, 0.18),
      "left-femoral-stem": new THREE.Vector3(-1.45, 0.16, 0.18),
      "right-femoral-stem": new THREE.Vector3(1.45, 0.16, 0.18),
      "polyethylene-insert": new THREE.Vector3(0, -0.2, 1.35),
      "tibial-tray": new THREE.Vector3(0, -1.35, 0.18),
      "tibial-stem": new THREE.Vector3(0, -2.8, 0.18),
    };
    implantGroup.children.forEach((part) => part.position.copy(offsets[part.name]));
  }
  if (mode === "measurements") {
    handles.measurementGroup.visible = true;
    setOpacity(handles.nativeMaterials, 0.78);
  }
  implantGroup.updateMatrixWorld(true);
  anatomy.updateMatrixWorld(true);
}

export function Knee3DModule({ hasUploadedStudy, studyFileName, dimensions, initialMode = "natural", onModeChange, onModelReady, onMeasurementsChange }: Knee3DModuleProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const handlesRef = useRef<SceneHandles | null>(null);
  const [mode, setMode] = useState<Knee3DMode>(initialMode);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(hasUploadedStudy ? "loading" : "idle");
  const dimensionsText = useMemo(() => dimensionLabels.map(([key, label]) => ({ label, value: dimensions[key] })), [dimensions]);

  useEffect(() => {
    if (!hasUploadedStudy || !hostRef.current) {
      setStatus("idle");
      return;
    }
    const host = hostRef.current;
    setStatus("loading");
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#eef4f8");
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(7.2, 4.2, 7.4);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(renderer.domElement);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 4.4;
    controls.maxDistance = 14;
    controls.target.set(0, -0.1, 0);
    const ambient = new THREE.HemisphereLight(0xffffff, 0x9bb7c5, 2.2);
    const key = new THREE.DirectionalLight(0xffffff, 3.4);
    key.position.set(5, 7, 6);
    key.castShadow = true;
    const fill = new THREE.DirectionalLight(0xf4b9c5, 1.1);
    fill.position.set(-5, 2, 4);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(3.55, 64), new THREE.MeshStandardMaterial({ color: "#dbe9ef", roughness: 0.94 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -4.05;
    floor.receiveShadow = true;
    scene.add(ambient, key, fill, floor);
    const handles = createSceneHandles(scene, dimensions);
    handlesRef.current = handles;
    applyMode(handles, mode);
    const resize = () => {
      const { width, height } = host.getBoundingClientRect();
      renderer.setSize(Math.max(width, 1), Math.max(height, 1), false);
      camera.aspect = Math.max(width, 1) / Math.max(height, 1);
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();
    let frame = 0;
    const render = () => {
      frame = requestAnimationFrame(render);
      controls.update();
      renderer.render(scene, camera);
    };
    render();
    setStatus("ready");
    onModelReady?.();
    onMeasurementsChange?.(dimensions);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      disposeObject(scene);
      renderer.dispose();
      renderer.domElement.remove();
      handlesRef.current = null;
    };
  }, [hasUploadedStudy, dimensions]);

  useEffect(() => {
    if (handlesRef.current) applyMode(handlesRef.current, mode);
    onModeChange?.(mode);
  }, [mode, onModeChange]);

  const isMeasurementMode = mode === "measurements";
  return <section className="overflow-hidden rounded-[1.5rem] border border-[#DCE8EE] bg-[#F8FBFC] shadow-[0_18px_45px_-35px_rgba(16,42,67,.45)]"><div className="flex flex-col gap-3 border-b border-[#DCE8EE] bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#1479a9]">KneeCo 3D interpretation</p><h3 className="mt-1 text-lg font-extrabold text-[#102a43]">Before and after planning view</h3></div><span className="rounded-full bg-[#E6F5F4] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#0e7c78]">{status === "ready" ? "3D scene ready" : status === "loading" ? "Loading scene" : "Upload required"}</span></div><div className="flex gap-2 overflow-x-auto border-b border-[#DCE8EE] bg-[#F5FAFC] px-4 py-3">{modes.map((item) => { const Icon = item.icon; return <button key={item.id} type="button" onClick={() => setMode(item.id)} disabled={!hasUploadedStudy} className={cn("inline-flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-xs font-extrabold transition", mode === item.id ? "border-[#102a43] bg-[#102a43] text-white" : "border-[#C9D9E1] bg-white text-[#102a43] hover:bg-[#E8F2F6]", !hasUploadedStudy && "cursor-not-allowed opacity-45")}><Icon className="h-3.5 w-3.5" />{item.label}</button>; })}</div>{!hasUploadedStudy ? <div className="flex min-h-[420px] flex-col items-center justify-center px-7 text-center"><CircleGauge className="h-9 w-9 text-[#1479a9]" /><h4 className="mt-4 text-lg font-extrabold text-[#102a43]">Upload required</h4><p className="mt-2 max-w-md text-sm leading-6 text-[#627d98]">Upload an MRI or image to load the 3D bone model.</p></div> : <div className="relative"><div ref={hostRef} className="h-[430px] w-full cursor-grab active:cursor-grabbing" /><div className="pointer-events-none absolute left-4 top-4 rounded-lg bg-white/90 px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#102a43] shadow-sm">{studyFileName ?? "Uploaded knee study"}</div><div className="pointer-events-none absolute bottom-4 left-4 rounded-lg bg-[#102a43]/90 px-3 py-2 text-[10px] font-semibold text-white">Drag to rotate · wheel to zoom · right-click to pan</div>{mode === "comparison" && <div className="pointer-events-none absolute right-4 top-4 rounded-lg bg-[#1378b5] px-3 py-2 text-xs font-extrabold text-white">Before / After comparison</div>}{mode === "exploded" && <div className="pointer-events-none absolute right-4 top-4 rounded-lg bg-white/92 px-3 py-2 text-xs font-extrabold text-[#102a43]">Separated component view</div>}{isMeasurementMode && <div className="absolute right-4 top-4 w-44 rounded-xl border border-[#C9D9E1] bg-white/95 p-3 shadow-sm"><p className="text-[10px] font-extrabold uppercase tracking-[0.11em] text-[#1479a9]">Dimension overlay</p>{dimensionsText.map(({ label, value }) => <div key={label} className="mt-2 flex items-center justify-between gap-2 text-xs"><span className="font-semibold text-[#627d98]">{label}</span><span className="font-extrabold text-[#102a43]">{typeof value === "number" ? `${value.toFixed(1)} mm` : "—"}</span></div>)}<p className="mt-3 border-t border-[#E4EEF2] pt-2 text-[10px] leading-4 text-[#627d98]">Dimension guides follow the conceptual scene axes and current image-derived values.</p></div>}</div>}<div className="border-t border-[#DCE8EE] bg-white px-5 py-4"><p className="text-xs leading-5 text-[#627d98]">This is a conceptual 3D interpretation for visual communication. It uses the current case dimensions for the overlay and is not a patient-specific reconstruction.</p></div></section>;
}
