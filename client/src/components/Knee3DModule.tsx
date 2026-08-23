import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Box, CircleGauge, Cuboid, Layers3, Ruler, Rotate3D } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { STLLoader } from "three/addons/loaders/STLLoader.js";

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
  detailedAnatomy?: THREE.Object3D;
  implants: THREE.Object3D[];
  detailedImplant?: THREE.Group;
  measurementGroup: THREE.Group;
  nativeMaterials: THREE.Material[];
  implantMaterials: THREE.Material[];
};

const detailedKneeAssetUrl = "/manus-storage/VH_M_Knee_R_5b63d020.glb";
const detailedImplantAssetUrls = {
  femoral: "/manus-storage/femoral_comp_6cd24614.stl",
  spacer: "/manus-storage/spacer_comp_6792b8e7.stl",
  tibial: "/manus-storage/tibial_comp_fdbb74a0.stl",
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
  const bone = material("#edf0ef", { roughness: 0.68, metalness: 0.03, transparent: true, opacity: 0.72, depthWrite: false });
  const cartilage = material("#dbe6ea", { roughness: 0.34, metalness: 0.04, transparent: true, opacity: 0.58, depthWrite: false });
  const meniscus = material("#9eafb8", { roughness: 0.32, metalness: 0.06, transparent: true, opacity: 0.7, depthWrite: false });
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
  const addContour = (source: THREE.Object3D) => {
    const sourceMeshes: THREE.Mesh[] = [];
    source.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (mesh.geometry) sourceMeshes.push(mesh);
    });
    sourceMeshes.forEach((mesh) => {
      const contour = new THREE.Mesh(mesh.geometry, new THREE.MeshBasicMaterial({ color: "#88a0ae", wireframe: true, transparent: true, opacity: 0.11, depthWrite: false }));
      contour.position.copy(mesh.position);
      contour.rotation.copy(mesh.rotation);
      contour.scale.copy(mesh.scale);
      contour.renderOrder = 2;
      source.add(contour);
    });
  };
  addContour(femur);
  addContour(tibia);
  scene.add(nativeGroup);
  anatomy.push(nativeGroup);

  const surgicalBlue = new THREE.MeshStandardMaterial({ color: "#9da9b0", metalness: 0.82, roughness: 0.22, depthTest: false });
  const surgicalBlueEdge = new THREE.MeshStandardMaterial({ color: "#60727d", metalness: 0.9, roughness: 0.2, depthTest: false });
  const insertMaterial = new THREE.MeshStandardMaterial({ color: "#f8fbff", metalness: 0.04, roughness: 0.22, depthTest: false, transparent: true, opacity: 0.98 });
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

function prepareDetailedAnatomy(root: THREE.Object3D) {
  const modelMaterials: THREE.Material[] = [];
  root.name = "detailed-generic-right-knee";
  root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh) return;
    const label = node.name.toLowerCase();
    const isMeniscus = label.includes("meniscus");
    const isCartilage = label.includes("cartilage") || label.includes("condyle") || label.includes("patellar_surface");
    const meshMaterial = new THREE.MeshStandardMaterial({
      color: isMeniscus ? "#6f8790" : isCartilage ? "#d5e2e6" : "#f4f7f5",
      roughness: isMeniscus ? 0.38 : isCartilage ? 0.28 : 0.48,
      metalness: isCartilage ? 0.05 : 0.02,
      transparent: true,
      opacity: isMeniscus ? 0.86 : 0.78,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    mesh.material = meshMaterial;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.renderOrder = 3;
    modelMaterials.push(meshMaterial);
  });
  root.scale.set(18, 8, 26);
  root.position.set(2.72, 3.1, 1.3);
  return { root, modelMaterials };
}

function prepareDetailedImplant(femoralGeometry: THREE.BufferGeometry, spacerGeometry: THREE.BufferGeometry, tibialGeometry: THREE.BufferGeometry) {
  const implantMaterials: THREE.Material[] = [];
  const implantGroup = new THREE.Group();
  implantGroup.name = "detailed-generic-tka-assembly";
  implantGroup.scale.setScalar(0.053);
  implantGroup.position.set(-1.54, -5.25, -2.5);
  const createComponent = (name: string, geometry: THREE.BufferGeometry, meshMaterial: THREE.MeshStandardMaterial) => {
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, meshMaterial);
    mesh.name = name;
    mesh.userData.basePosition = new THREE.Vector3();
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.renderOrder = 7;
    implantGroup.add(mesh);
    implantMaterials.push(meshMaterial);
  };
  createComponent("femoral-component", femoralGeometry, new THREE.MeshStandardMaterial({ color: "#5d747e", metalness: 0.54, roughness: 0.3 }));
  createComponent("polyethylene-insert", spacerGeometry, new THREE.MeshStandardMaterial({ color: "#f3fbfb", metalness: 0.02, roughness: 0.23 }));
  createComponent("tibial-component", tibialGeometry, new THREE.MeshStandardMaterial({ color: "#4b6470", metalness: 0.56, roughness: 0.32 }));
  return { implantGroup, implantMaterials };
}

function applyMode(handles: SceneHandles, mode: Knee3DMode) {
  const anatomy = handles.detailedAnatomy ?? handles.anatomy[0];
  const implantGroup = handles.detailedImplant ?? handles.implants[0];
  const legacyBasePositions: Record<string, THREE.Vector3> = {
    "left-femoral-component": new THREE.Vector3(-0.64, 0.4, 0.12),
    "right-femoral-component": new THREE.Vector3(0.64, 0.4, 0.12),
    "femoral-bridge": new THREE.Vector3(0, 0.42, 0.12),
    "left-femoral-stem": new THREE.Vector3(-0.64, -0.05, 0.12),
    "right-femoral-stem": new THREE.Vector3(0.64, -0.05, 0.12),
    "polyethylene-insert": new THREE.Vector3(0, -0.14, 0.1),
    "tibial-tray": new THREE.Vector3(0, -0.44, 0.1),
    "tibial-stem": new THREE.Vector3(0, -1.1, 0.1),
  };
  const setImplantTargets = (positions: Record<string, THREE.Vector3>) => {
    implantGroup.children.forEach((part) => {
      const target = positions[part.name] ?? (part.userData.basePosition as THREE.Vector3 | undefined) ?? legacyBasePositions[part.name] ?? new THREE.Vector3();
      part.userData.targetPosition = target;
    });
  };
  const resetImplant = () => {
    setImplantTargets(handles.detailedImplant ? {} : legacyBasePositions);
  };
  resetImplant();
  handles.measurementGroup.visible = false;
  setOpacity(handles.nativeMaterials, 1);
  handles.anatomy.forEach((entry) => { entry.visible = entry === anatomy; });
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
    const offsets: Record<string, THREE.Vector3> = handles.detailedImplant ? {
      "femoral-component": new THREE.Vector3(0, 32, 0),
      "polyethylene-insert": new THREE.Vector3(0, 0, 31),
      "tibial-component": new THREE.Vector3(0, -32, 0),
    } : {
      "left-femoral-component": new THREE.Vector3(-1.45, 1.25, 0.18),
      "right-femoral-component": new THREE.Vector3(1.45, 1.25, 0.18),
      "femoral-bridge": new THREE.Vector3(0, 1.85, 0.18),
      "left-femoral-stem": new THREE.Vector3(-1.45, 0.16, 0.18),
      "right-femoral-stem": new THREE.Vector3(1.45, 0.16, 0.18),
      "polyethylene-insert": new THREE.Vector3(0, -0.2, 1.35),
      "tibial-tray": new THREE.Vector3(0, -1.35, 0.18),
      "tibial-stem": new THREE.Vector3(0, -2.8, 0.18),
    };
    setImplantTargets(offsets);
  }
  if (mode === "measurements") {
    handles.measurementGroup.visible = true;
    setOpacity(handles.nativeMaterials, 0.78);
  }
  implantGroup.updateMatrixWorld(true);
  anatomy.updateMatrixWorld(true);
}

export function Knee3DModule({ hasUploadedStudy, studyFileName, dimensions, initialMode = "comparison", onModeChange, onModelReady, onMeasurementsChange }: Knee3DModuleProps) {
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
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(8, 4.2, 8.5);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.72;
    host.appendChild(renderer.domElement);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 5;
    controls.maxDistance = 18;
    controls.target.set(0, -0.1, 0);
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.65;
    const ambient = new THREE.HemisphereLight(0xffffff, 0x9bb7c5, 2.6);
    const key = new THREE.DirectionalLight(0xffffff, 5.4);
    key.position.set(4.5, 7, 8);
    key.castShadow = true;
    const fill = new THREE.DirectionalLight(0xc7d6df, 2.15);
    fill.position.set(-6, 3, 5);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ color: "#e3edf1", roughness: 0.96 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -4.05;
    floor.receiveShadow = true;
    scene.add(ambient, key, fill, floor);
    const handles = createSceneHandles(scene, dimensions);
    handlesRef.current = handles;
    applyMode(handles, mode);
    let active = true;
    const loadDetailedAnatomy = async () => {
      try {
        const gltf = await new GLTFLoader().loadAsync(detailedKneeAssetUrl);
        if (!active) {
          disposeObject(gltf.scene);
          return;
        }
        const detailed = prepareDetailedAnatomy(gltf.scene);
        scene.add(detailed.root);
        handles.detailedAnatomy = detailed.root;
        handles.nativeMaterials.push(...detailed.modelMaterials);
        applyMode(handles, mode);
        setStatus("ready");
        onModelReady?.();
        onMeasurementsChange?.(dimensions);
      } catch {
        if (!active) return;
        setStatus("error");
      }
    };
    void loadDetailedAnatomy();
    const loadDetailedImplant = async () => {
      try {
        const loader = new STLLoader();
        const [femoralGeometry, spacerGeometry, tibialGeometry] = await Promise.all([
          loader.loadAsync(detailedImplantAssetUrls.femoral),
          loader.loadAsync(detailedImplantAssetUrls.spacer),
          loader.loadAsync(detailedImplantAssetUrls.tibial),
        ]);
        if (!active) {
          femoralGeometry.dispose();
          spacerGeometry.dispose();
          tibialGeometry.dispose();
          return;
        }
        const detailed = prepareDetailedImplant(femoralGeometry, spacerGeometry, tibialGeometry);
        scene.add(detailed.implantGroup);
        handles.detailedImplant = detailed.implantGroup;
        handles.implantMaterials.push(...detailed.implantMaterials);
        handles.implants[0].visible = false;
        applyMode(handles, mode);
      } catch {
        if (!active) return;
        setStatus("error");
      }
    };
    void loadDetailedImplant();
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
      const activeImplant = handles.detailedImplant ?? handles.implants[0];
      activeImplant.children.forEach((part) => {
        const target = part.userData.targetPosition as THREE.Vector3 | undefined;
        if (target) part.position.lerp(target, 0.13);
      });
      activeImplant.updateMatrixWorld(true);
      controls.update();
      renderer.render(scene, camera);
    };
    render();
    return () => {
      active = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      disposeObject(scene);
      pmrem.dispose();
      scene.environment?.dispose();
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
