import * as THREE from "three";
import { GLTFLoader } from "/three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "/three/examples/jsm/controls/OrbitControls.js";
import { MeshSurfaceSampler } from "/three/examples/jsm/math/MeshSurfaceSampler.js";

const PARTICLES_PER_MODEL = 40000;
const SCATTER_MULTIPLIER = 6;
const PARTICLE_DELAY_SPREAD = 0.5;
const CAMERA_FOV = 26;
const CAMERA_DISTANCE_SCALE = 4.35;
const FIXED_CAMERA_POSITION = new THREE.Vector3(20.5, 5.94, 22.17);
const FIXED_CAMERA_TARGET = new THREE.Vector3(-0.87, 2.01, -0.47);
const SCENE_Y_OFFSET = -1.15;
const SCENE_X_OFFSET = -1.05;
const SCENE_Z_OFFSET = 0.15;
const SCENE_SCALE = 1.18;
const FRAME_TARGET_Y_OFFSET = 0.95;
const FRAME_TARGET_X_OFFSET = -0.35;
const OBJECT_SEQUENCE_GAP = 1.45;
const AUTO_PROGRESS_SPEED = 0.00034;
const ACT_FADE_SPEED = 0.012;
const DOG_ROTATION_Y = Math.PI / 2;
const DOG_FORWARD_OFFSET = 2.0;
const VIDEO_FALLBACK_DELAY = 900;
const PARTICLE_SIZE_MULTIPLIER = 1.65;
const FALLBACK_PARTICLE_COLOR = new THREE.Color(0xffd84d);
const STRUCTURE_BLOCK_FILES = new Set(["floor.glb", "door.glb"]);
const STRUCTURE_BLOCK_COLORS = {
  "floor.glb": 0x8a8a86,
  "door.glb": 0x8d918f,
};
const STYLE_TINTS = [
  0xf06a3d,
  0x48b2a6,
  0xffd84d,
  0xc58b4c,
  0x6f8f7f,
  0xd5a24d,
  0x2f6f68,
];
const MODEL_PARTICLE_OVERRIDES = {
  "TV.glb": {
    color: 0x777a7d,
  },
  "smallSofa.glb": {
    color: 0x8a6a4a,
  },
  "garbeg.glb": {
    color: 0xd8d8d0,
  },
};
const CHARACTER_FILES = ["people1.glb", "people2.glb", "dog.glb"];
const ACT_BACKGROUNDS = {
  1: "/pic/ACT1.png",
  2: "/pic/ACT2.png",
  3: "/pic/ACT3.png",
  4: "/pic/ACT4.png",
  5: "/pic/ACT5.png",
  6: "/pic/ACT6.png",
  7: "/pic/ACT7.png",
  7.1: "/pic/ACT7-1.png",
};
const ACT_TEXT_VIDEOS = {
  1: "/ved/ACT1text.mov",
  2: "/ved/ACT2text.mov",
  3: "/ved/ACT3text.mov",
  4: "/ved/ACT4text.mov",
  5: "/ved/ACT5text.mov",
  6: "/ved/ACT6text.mov",
  7: "/ved/ACT7text.mov",
  7.1: "/ved/ACT7z.mov",
};
const ACT_ACTION_VIDEOS = {
  2: "/ved/push.webm",
  7.1: "/ved/pull.webm",
};

let scene;
let camera;
let renderer;
let controls;
let loader;
let sceneRoot;
let modelRoot;
let particleRoot;
let characterRoot;
let floorModel;
let manifest = [];
let particleItems = [];
let materialRecords = [];
let characterRecords = [];
let structureRecords = [];
let loadedCount = 0;
let currentProgress = 0;
let targetProgress = 0;
let isPlaying = false;
let playMode = "material";
let currentAct = 1;
let dissolveProgress = 0;
let dissolveTarget = 0;
let materialRevealProgress = 0;
let materialRevealTarget = 0;
let characterOpacity = 0;
let characterOpacityTarget = 0;
let floorColorCurrent = new THREE.Color(0x858582);
let floorColorTarget = new THREE.Color(0x858582);
let doorColorCurrent = new THREE.Color(0x858582);
let doorColorTarget = new THREE.Color(0x858582);
let bgLayerIndex = 0;

const container = document.getElementById("three-container");
const progressInput = document.getElementById("progressInput");
const modelStatus = document.getElementById("modelStatus");
const particleStatus = document.getElementById("particleStatus");
const message = document.getElementById("message");
const loadStatus = document.getElementById("loadStatus");
const scatterBtn = document.getElementById("scatterBtn");
const assembleBtn = document.getElementById("assembleBtn");
const playParticlesBtn = document.getElementById("playParticlesBtn");
const playMaterialBtn = document.getElementById("playMaterialBtn");
const frameBtn = document.getElementById("frameBtn");
const actBackground = document.getElementById("act-background");
const bgLayers = [...document.querySelectorAll(".act-bg-layer")];
const actButtons = [...document.querySelectorAll(".act-button")];
const shotReadout = document.getElementById("shotReadout");
const actionVideo = document.getElementById("actionVideo");
const textVideo = document.getElementById("textVideo");

init();
loadManifestAndScene();
animate();

function init() {
  loader = new GLTFLoader();
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(CAMERA_FOV, window.innerWidth / window.innerHeight, 0.01, 3000);
  camera.position.copy(FIXED_CAMERA_POSITION);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.04;
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.copy(FIXED_CAMERA_TARGET);
  controls.maxDistance = 220;

  scene.add(new THREE.HemisphereLight(0xffffff, 0xb9c7c3, 1.55));

  const key = new THREE.DirectionalLight(0xffffff, 2.35);
  key.position.set(6, 9, 7);
  scene.add(key);

  const particleGlow = new THREE.PointLight(0x48b2a6, 3.8, 34);
  particleGlow.position.set(-5, 3.4, 3.2);
  scene.add(particleGlow);

  sceneRoot = new THREE.Group();
  modelRoot = new THREE.Group();
  particleRoot = new THREE.Group();
  characterRoot = new THREE.Group();
  sceneRoot.position.set(SCENE_X_OFFSET, SCENE_Y_OFFSET, SCENE_Z_OFFSET);
  sceneRoot.scale.setScalar(SCENE_SCALE);
  sceneRoot.add(modelRoot);
  sceneRoot.add(particleRoot);
  sceneRoot.add(characterRoot);
  scene.add(sceneRoot);

  progressInput?.addEventListener("input", () => {
    isPlaying = false;
    updatePlayButtons();
    materialRevealTarget = playMode === "material" ? 1 : 0;
    setTargetProgress(Number(progressInput.value) / 100);
  });
  scatterBtn?.addEventListener("click", () => {
    isPlaying = false;
    updatePlayButtons();
    dissolveTarget = 0;
    materialRevealTarget = 0;
    setTargetProgress(0);
  });
  assembleBtn?.addEventListener("click", () => {
    isPlaying = false;
    updatePlayButtons();
    dissolveTarget = 0;
    materialRevealTarget = playMode === "material" ? 1 : 0;
    setTargetProgress(1);
  });
  playParticlesBtn?.addEventListener("click", () => togglePlay("particles"));
  playMaterialBtn?.addEventListener("click", () => togglePlay("material"));
  frameBtn?.addEventListener("click", frameWholeScene);
  actButtons.forEach((button) => {
    button.addEventListener("click", () => setAct(Number.parseFloat(button.dataset.act)));
  });
  window.addEventListener("keydown", handleKeydown);
  window.addEventListener("resize", resize);
  setAct(1);
}

async function loadManifestAndScene() {
  try {
    const response = await fetch("./model-manifest.json");
    if (!response.ok) throw new Error(`Manifest returned ${response.status}`);
    manifest = await response.json();

    modelStatus.textContent = `0 / ${manifest.length}`;
    particleStatus.textContent = "0";
    message.textContent = "Loading furniture. Floor and door stay as quiet color blocks.";

    for (const entry of manifest) {
      await loadModelEntry(entry);
    }
    await loadCharacters();

    setBuildProgress(0);
    applyAct(1);
    frameWholeScene();
    modelStatus.textContent = `${loadedCount} / ${manifest.length}`;
    particleStatus.textContent = String(particleItems.reduce((sum, item) => sum + item.count, 0));
    message.textContent = "Ready. Choose particle-only or material playback.";
    window.setTimeout(() => {
      loadStatus?.classList.add("is-hidden");
      loadStatus?.parentElement?.classList.add("is-loaded");
    }, 1000);
  } catch (error) {
    console.error(error);
    modelStatus.textContent = "Failed";
    message.textContent = "Could not load the furniture particle scene.";
  }
}

function loadModelEntry(entry) {
  return new Promise((resolve) => {
    message.textContent = `Loading ${entry.file}...`;

    loader.load(
      `/model/${entry.file}`,
      (gltf) => {
        const model = gltf.scene;
        model.name = entry.file;
        modelRoot.add(model);
        model.updateMatrixWorld(true);

        if (STRUCTURE_BLOCK_FILES.has(entry.file)) {
          if (entry.file === "floor.glb") floorModel = model;
          applyStructureBlockMaterial(model, entry.file);
        } else {
          prepareParticleModel(model, entry);
        }

        loadedCount += 1;
        modelStatus.textContent = `${loadedCount} / ${manifest.length}`;
        resolve();
      },
      (event) => {
        if (!event.total) return;
        const percent = Math.round((event.loaded / event.total) * 100);
        message.textContent = `Loading ${entry.file}: ${percent}%`;
      },
      (error) => {
        console.error(`Failed to load ${entry.file}`, error);
        loadedCount += 1;
        modelStatus.textContent = `${loadedCount} / ${manifest.length}`;
        resolve();
      },
    );
  });
}

async function loadCharacters() {
  for (const file of CHARACTER_FILES) {
    await loadCharacter(file);
  }
  setCharacterOpacity(0);
}

function loadCharacter(file) {
  return new Promise((resolve) => {
    loader.load(
      `/model/${file}`,
      (gltf) => {
        const model = gltf.scene;
        model.name = file;
        characterRoot.add(model);
        stageCharacter(model, file);
        alignCharacterToFloor(model);
        prepareWhiteCharacter(model);
        resolve();
      },
      undefined,
      (error) => {
        console.error(`Failed to load ${file}`, error);
        resolve();
      },
    );
  });
}

function stageCharacter(model, file) {
  if (file !== "dog.glb") return;
  model.rotation.y += DOG_ROTATION_Y;
  model.position.z += DOG_FORWARD_OFFSET;
}

function prepareWhiteCharacter(model) {
  model.traverse((child) => {
    if (!child.isMesh) return;
    child.frustumCulled = true;
    const material = new THREE.MeshStandardMaterial({
      color: 0xf5f4ee,
      roughness: 0.82,
      metalness: 0,
      transparent: true,
      opacity: 0,
      depthWrite: true,
    });
    child.material = material;
    characterRecords.push(material);
  });
}

function alignCharacterToFloor(model) {
  if (!floorModel) return;
  sceneRoot.updateMatrixWorld(true);
  floorModel.updateMatrixWorld(true);
  model.updateMatrixWorld(true);

  const floorBox = new THREE.Box3().setFromObject(floorModel);
  const characterBox = new THREE.Box3().setFromObject(model);
  if (floorBox.isEmpty() || characterBox.isEmpty()) return;

  const deltaY = floorBox.max.y - characterBox.min.y;
  model.position.y += deltaY;
  model.updateMatrixWorld(true);
}

function prepareParticleModel(model, entry) {
  const records = [];
  const modelColor = getModelMainColor(model);
  const styleTint = getStyleTint(particleItems.length);
  const config = getModelParticleConfig(entry.file);
  model.traverse((child) => {
    if (!child.isMesh || !child.material) return;
    child.frustumCulled = true;

    const sourceMaterials = Array.isArray(child.material) ? child.material : [child.material];
    const clonedMaterials = sourceMaterials.map((material) => material.clone());
    child.material = Array.isArray(child.material) ? clonedMaterials : clonedMaterials[0];

    clonedMaterials.forEach((material) => {
      const record = {
        material,
        originalOpacity: material.opacity ?? 1,
        originalTransparent: Boolean(material.transparent),
        originalDepthWrite: material.depthWrite,
      };
      records.push(record);
      materialRecords.push(record);
    });
  });

  const particleItem = createParticleItem(model, entry, records, modelColor, styleTint, config);
  if (particleItem) {
    particleItems.push(particleItem);
    particleRoot.add(particleItem.points);
    setItemSolidOpacity(particleItem, 0);
  }
}

function applyStructureBlockMaterial(model, file) {
  const color = STRUCTURE_BLOCK_COLORS[file] || 0x8d918f;

  model.traverse((child) => {
    if (!child.isMesh) return;
    child.frustumCulled = true;
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.92,
      metalness: 0,
    });
    child.material = material;
    structureRecords.push({ file, material });
  });
}

function createParticleItem(model, entry, records, modelColor, styleTint, config) {
  const meshEntries = collectSampleableMeshes(model);
  if (!meshEntries.length) return null;

  const bounds = new THREE.Box3().setFromObject(model);
  const sphere = new THREE.Sphere();
  bounds.getBoundingSphere(sphere);
  const scatterRadius = Math.max(sphere.radius * SCATTER_MULTIPLIER, 6.5);
  const count = getParticleCountForFile(entry.file);

  const startPositions = new Float32Array(count * 3);
  const targetPositions = new Float32Array(count * 3);
  const dispersePositions = new Float32Array(count * 3);
  const currentPositions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const alphas = new Float32Array(count);
  const delays = new Float32Array(count);

  const temp = new THREE.Vector3();
  for (let index = 0; index < count; index += 1) {
    const sampled = pickMeshEntry(meshEntries);
    sampled.sampler.sample(temp);
    temp.applyMatrix4(sampled.mesh.matrixWorld);
    particleRoot.worldToLocal(temp);

    const i3 = index * 3;
    targetPositions[i3] = temp.x;
    targetPositions[i3 + 1] = temp.y;
    targetPositions[i3 + 2] = temp.z;

    const direction = randomDirection();
    const distance = scatterRadius * (0.75 + Math.random() * 1.15);
    startPositions[i3] = temp.x + direction.x * distance;
    startPositions[i3 + 1] = temp.y + direction.y * distance * 0.65 + Math.random() * sphere.radius * 1.6 + 1.2;
    startPositions[i3 + 2] = temp.z + direction.z * distance;

    const dissolveDirection = randomDirection();
    const dissolveDistance = sphere.radius * (0.55 + Math.random() * 1.1);
    dispersePositions[i3] = temp.x + dissolveDirection.x * dissolveDistance;
    dispersePositions[i3 + 1] = temp.y + Math.abs(dissolveDirection.y) * dissolveDistance * 0.85 + Math.random() * 0.5;
    dispersePositions[i3 + 2] = temp.z + dissolveDirection.z * dissolveDistance;

    currentPositions[i3] = startPositions[i3];
    currentPositions[i3 + 1] = startPositions[i3 + 1];
    currentPositions[i3 + 2] = startPositions[i3 + 2];

    const particleColor = getParticleColor(sampled.color, modelColor, styleTint, config);
    colors[i3] = particleColor.r;
    colors[i3 + 1] = particleColor.g;
    colors[i3 + 2] = particleColor.b;

    alphas[index] = 0;
    delays[index] = Math.random() * PARTICLE_DELAY_SPREAD;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(currentPositions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("alpha", new THREE.BufferAttribute(alphas, 1));

  const material = createParticleMaterial(Math.max(sphere.radius * 0.066, 0.156) * PARTICLE_SIZE_MULTIPLIER);
  const points = new THREE.Points(geometry, material);
  points.name = `${entry.label}-particles`;

  return {
    entry,
    model,
    records,
    points,
    geometry,
    material,
    startPositions,
    targetPositions,
    dispersePositions,
    baseColors: new Float32Array(colors),
    delays,
    count,
    dissolveStrength: 0.35 + Math.random() * 0.75,
  };
}

function getModelParticleConfig(file) {
  return {
    color: null,
    ...(MODEL_PARTICLE_OVERRIDES[file] || {}),
  };
}

function getParticleCountForFile(file) {
  return PARTICLES_PER_MODEL;
}

function createParticleMaterial(size) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthTest: true,
    depthWrite: true,
    vertexColors: true,
    uniforms: {
      pointSize: { value: size },
    },
    vertexShader: `
      attribute float alpha;
      varying vec3 vColor;
      varying float vAlpha;
      uniform float pointSize;

      void main() {
        vColor = color;
        vAlpha = alpha;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = pointSize * (300.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        vec2 center = gl_PointCoord - vec2(0.5);
        float dist = length(center);
        float edge = smoothstep(0.5, 0.28, dist);
        if (edge < 0.01 || vAlpha < 0.01) discard;
        gl_FragColor = vec4(vColor, vAlpha * edge);
      }
    `,
  });
}

function collectSampleableMeshes(model) {
  const entries = [];
  let totalWeight = 0;

  model.updateMatrixWorld(true);
  model.traverse((child) => {
    if (!child.isMesh || !child.geometry?.attributes?.position) return;

    const sampler = new MeshSurfaceSampler(child).build();
    const box = new THREE.Box3().setFromObject(child);
    const size = new THREE.Vector3();
    box.getSize(size);
    const weight = Math.max(size.x * size.y + size.y * size.z + size.x * size.z, 0.001);
    totalWeight += weight;

    const material = Array.isArray(child.material) ? child.material[0] : child.material;
    const meshColor = getMaterialColor(material);
    entries.push({ mesh: child, sampler, weight, totalWeight, color: meshColor });
  });

  entries.forEach((entry) => {
    entry.normalizedMax = entry.totalWeight / totalWeight;
  });

  return entries;
}

function getModelMainColor(model) {
  const colorSum = new THREE.Color(0, 0, 0);
  let totalWeight = 0;

  model.updateMatrixWorld(true);
  model.traverse((child) => {
    if (!child.isMesh || !child.material) return;
    const box = new THREE.Box3().setFromObject(child);
    const size = new THREE.Vector3();
    box.getSize(size);
    const weight = Math.max(size.x * size.y + size.y * size.z + size.x * size.z, 0.001);
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    const materialColor = getAverageMaterialColor(materials);
    if (!materialColor) return;

    colorSum.r += materialColor.r * weight;
    colorSum.g += materialColor.g * weight;
    colorSum.b += materialColor.b * weight;
    totalWeight += weight;
  });

  if (totalWeight <= 0) return FALLBACK_PARTICLE_COLOR.clone();

  colorSum.r /= totalWeight;
  colorSum.g /= totalWeight;
  colorSum.b /= totalWeight;

  if (isDefaultWhite(colorSum)) return FALLBACK_PARTICLE_COLOR.clone();
  return colorSum;
}

function getStyleTint(index) {
  return new THREE.Color(STYLE_TINTS[index % STYLE_TINTS.length]);
}

function getParticleColor(sampledColor, modelColor, styleTint, config) {
  if (config.color) {
    const override = new THREE.Color(config.color);
    const materialColor = sampledColor.equals(FALLBACK_PARTICLE_COLOR) ? modelColor : sampledColor;
    return override.lerp(materialColor, 0.12);
  }

  const color = sampledColor.equals(FALLBACK_PARTICLE_COLOR) ? modelColor.clone() : sampledColor.clone();
  if (color.equals(FALLBACK_PARTICLE_COLOR) || isDefaultWhite(color)) {
    color.copy(styleTint).lerp(FALLBACK_PARTICLE_COLOR, 0.25);
  } else {
    color.lerp(modelColor, 0.32).lerp(styleTint, 0.18);
  }

  const hsl = {};
  color.getHSL(hsl);
  color.setHSL(hsl.h, Math.min(1, hsl.s * 1.08 + 0.04), THREE.MathUtils.clamp(hsl.l, 0.34, 0.72));
  return color;
}

function getAverageMaterialColor(materials) {
  const color = new THREE.Color(0, 0, 0);
  let count = 0;

  materials.forEach((material) => {
    const materialColor = getMaterialColor(material);
    if (!materialColor) return;
    color.r += materialColor.r;
    color.g += materialColor.g;
    color.b += materialColor.b;
    count += 1;
  });

  if (!count) return null;
  color.r /= count;
  color.g /= count;
  color.b /= count;
  return color;
}

function getMaterialColor(material) {
  if (!material?.color) return FALLBACK_PARTICLE_COLOR.clone();
  const color = material.color.clone();
  if (isDefaultWhite(color) && material.map) return FALLBACK_PARTICLE_COLOR.clone();
  return color;
}

function isDefaultWhite(color) {
  return color.r > 0.94 && color.g > 0.94 && color.b > 0.94;
}

function pickMeshEntry(entries) {
  const value = Math.random();
  return entries.find((entry) => value <= entry.normalizedMax) || entries[entries.length - 1];
}

function randomDirection() {
  return new THREE.Vector3(
    Math.random() * 2 - 1,
    Math.random() * 2 - 1,
    Math.random() * 2 - 1,
  ).normalize();
}

function setTargetProgress(progress, immediate = false) {
  targetProgress = THREE.MathUtils.clamp(progress, 0, 1);
  if (progressInput) progressInput.value = Math.round(targetProgress * 100);
  if (immediate) {
    currentProgress = targetProgress;
    setBuildProgress(currentProgress);
  }
}

function setBuildProgress(progress) {
  if (!particleItems.length) return;

  const count = particleItems.length;
  const sequenceSpan = count + OBJECT_SEQUENCE_GAP * Math.max(0, count - 1);
  particleItems.forEach((item, itemIndex) => {
    const local = THREE.MathUtils.clamp(progress * sequenceSpan - itemIndex * (1 + OBJECT_SEQUENCE_GAP), 0, 1);
    updateParticleItem(item, local);
  });

  const activeIndex = Math.min(Math.floor(progress * sequenceSpan / (1 + OBJECT_SEQUENCE_GAP)), count - 1);
  const active = particleItems[activeIndex]?.entry?.label || "Ready";
  if (progress > 0 && progress < 1) {
    message.textContent = `Assembling ${active} (${activeIndex + 1} of ${count})`;
  }
}

function updateParticleItem(item, localProgress) {
  const positions = item.geometry.attributes.position.array;
  const colors = item.geometry.attributes.color.array;
  const alphas = item.geometry.attributes.alpha.array;

  for (let index = 0; index < item.count; index += 1) {
    const particleT = smoothstep(item.delays[index], 1, localProgress);
    const eased = easeOutQuart(particleT);
    const i3 = index * 3;

    const baseX = THREE.MathUtils.lerp(item.startPositions[i3], item.targetPositions[i3], eased);
    const baseY = THREE.MathUtils.lerp(item.startPositions[i3 + 1], item.targetPositions[i3 + 1], eased);
    const baseZ = THREE.MathUtils.lerp(item.startPositions[i3 + 2], item.targetPositions[i3 + 2], eased);
    const dissolve = dissolveProgress * item.dissolveStrength;

    positions[i3] = THREE.MathUtils.lerp(baseX, item.dispersePositions[i3], dissolve);
    positions[i3 + 1] = THREE.MathUtils.lerp(baseY, item.dispersePositions[i3 + 1], dissolve);
    positions[i3 + 2] = THREE.MathUtils.lerp(baseZ, item.dispersePositions[i3 + 2], dissolve);

    const appear = smoothstep(item.delays[index] * 0.42, item.delays[index] * 0.42 + 0.38, localProgress);
    const materialCover = playMode === "material" ? smoothstep(0.08, 1, materialRevealProgress) : 0;
    const fade = playMode === "material" ? 1 - materialCover : 1;
    alphas[index] = appear * fade * (1 - dissolve * 0.48);

    const gray = 0.64;
    colors[i3] = THREE.MathUtils.lerp(item.baseColors[i3], gray, dissolveProgress);
    colors[i3 + 1] = THREE.MathUtils.lerp(item.baseColors[i3 + 1], gray, dissolveProgress);
    colors[i3 + 2] = THREE.MathUtils.lerp(item.baseColors[i3 + 2], gray, dissolveProgress);
  }

  item.geometry.attributes.position.needsUpdate = true;
  item.geometry.attributes.alpha.needsUpdate = true;
  item.geometry.attributes.color.needsUpdate = true;

  const solidOpacity = playMode === "material" ? materialRevealProgress * smoothstep(0.78, 1, localProgress) : 0;
  setItemSolidOpacity(item, solidOpacity);
}

function setItemSolidOpacity(item, opacity) {
  item.records.forEach((record) => {
    record.material.transparent = opacity < 0.98 || record.originalTransparent;
    record.material.opacity = record.originalOpacity * opacity;
    record.material.depthWrite = opacity > 0.84 ? record.originalDepthWrite : false;
    record.material.needsUpdate = true;
  });
}

function animate() {
  requestAnimationFrame(animate);

  if (isPlaying) {
    const next = Math.min(targetProgress + AUTO_PROGRESS_SPEED, 1);
    setTargetProgress(next);
    if (next >= 1) {
      isPlaying = false;
      updatePlayButtons();
      message.textContent = playMode === "material" ? "All furniture assembled with material." : "All furniture assembled as particles.";
    }
  }

  if (Math.abs(currentProgress - targetProgress) > 0.001) {
    currentProgress += (targetProgress - currentProgress) * 0.018;
    setBuildProgress(currentProgress);
  }

  if (Math.abs(dissolveProgress - dissolveTarget) > 0.001) {
    dissolveProgress += (dissolveTarget - dissolveProgress) * 0.018;
    setBuildProgress(currentProgress);
  }

  if (Math.abs(materialRevealProgress - materialRevealTarget) > 0.001) {
    materialRevealProgress += (materialRevealTarget - materialRevealProgress) * 0.006;
    setBuildProgress(currentProgress);
  }

  if (Math.abs(characterOpacity - characterOpacityTarget) > 0.001) {
    characterOpacity += (characterOpacityTarget - characterOpacity) * 0.025;
    setCharacterOpacity(characterOpacity);
  }

  if (colorDistance(floorColorCurrent, floorColorTarget) > 0.002 || colorDistance(doorColorCurrent, doorColorTarget) > 0.002) {
    floorColorCurrent.lerp(floorColorTarget, ACT_FADE_SPEED);
    doorColorCurrent.lerp(doorColorTarget, ACT_FADE_SPEED);
    applyStructureColors();
  }

  controls.update();
  updateShotReadout();
  renderer.render(scene, camera);
}

function togglePlay(mode) {
  if (!particleItems.length) return;
  if (isPlaying && playMode === mode) {
    isPlaying = false;
    updatePlayButtons();
    return;
  }

  playMode = mode;
  dissolveTarget = 0;
  materialRevealProgress = 0;
  materialRevealTarget = mode === "material" ? 1 : 0;
  if (targetProgress >= 0.995) {
    setTargetProgress(0, true);
  }
  isPlaying = true;
  updatePlayButtons();
}

function updatePlayButtons() {
  if (playParticlesBtn) playParticlesBtn.textContent = isPlaying && playMode === "particles" ? "Pause" : "Particles";
  if (playMaterialBtn) playMaterialBtn.textContent = isPlaying && playMode === "material" ? "Pause" : "Material";
}

function handleKeydown(event) {
  if (event.key >= "1" && event.key <= "7" && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey) {
    setAct(Number(event.key));
  }

  if (event.key === "8" && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey) {
    setAct(7.1);
  }

  if (event.code === "Space") {
    event.preventDefault();
    togglePlay(playMode);
  }
}

function setAct(act) {
  currentAct = act;
  const background = ACT_BACKGROUNDS[act] || ACT_BACKGROUNDS[1];
  setActBackground(background);
  actButtons.forEach((button) => {
    button.classList.toggle("active", Number.parseFloat(button.dataset.act) === act);
  });
  applyAct(act);
}

function applyAct(act) {
  fadeOutVideo(actionVideo);
  playLoopingVideo(textVideo, ACT_TEXT_VIDEOS[act]);
  if (ACT_ACTION_VIDEOS[act]) playLoopingVideo(actionVideo, ACT_ACTION_VIDEOS[act]);

  if (act <= 2) {
    playMode = "particles";
    isPlaying = false;
    updatePlayButtons();
    dissolveTarget = 0;
    dissolveProgress = 0;
    materialRevealProgress = 0;
    materialRevealTarget = 0;
    characterOpacityTarget = 0;
    characterOpacity = 0;
    setCharacterOpacity(0);
    setStructureColorTargets(0x858582, 0x858582);
    setTargetProgress(0, true);
    message.textContent = act === 1 ? "Act 1: floor and door only." : "Act 2: push video starts.";
    return;
  }

  setStructureColorTargets(0x8a6a4a, 0x8d918f);

  if (act === 3) {
    playMode = "particles";
    dissolveTarget = 0;
    materialRevealTarget = 0;
    characterOpacityTarget = 0;
    if (targetProgress < 0.02 || targetProgress > 0.98) setTargetProgress(0, true);
    isPlaying = true;
    updatePlayButtons();
    message.textContent = "Act 3: furniture particles assemble in sequence.";
    return;
  }

  isPlaying = false;
  updatePlayButtons();

  if (act === 4) {
    playMode = "particles";
    dissolveTarget = 0;
    materialRevealTarget = 0;
    characterOpacityTarget = 1;
    setTargetProgress(1);
    message.textContent = "Act 4: people and dog appear as white models.";
    return;
  }

  if (act === 5) {
    playMode = "particles";
    dissolveTarget = 1;
    materialRevealTarget = 0;
    characterOpacityTarget = 0;
    setTargetProgress(1);
    message.textContent = "Act 5: furniture particles turn gray and disperse.";
    return;
  }

  if (act === 6) {
    playMode = "particles";
    dissolveTarget = 0;
    materialRevealTarget = 0;
    characterOpacityTarget = 1;
    setTargetProgress(1);
    message.textContent = "Act 6: particles gather again and characters return.";
    return;
  }

  if (act === 7) {
    playMode = "material";
    dissolveTarget = 0;
    materialRevealProgress = 0;
    materialRevealTarget = 1;
    characterOpacityTarget = 1;
    setStructureColorTargets(0xb2a28d, 0x9ea2a0);
    setTargetProgress(1);
    message.textContent = "Act 7: material slowly covers the particle structure.";
    return;
  }

  if (act === 7.1) {
    playMode = "material";
    dissolveTarget = 0;
    materialRevealTarget = 1;
    characterOpacityTarget = 1;
    setStructureColorTargets(0xb2a28d, 0x9ea2a0);
    setTargetProgress(1);
    message.textContent = "Act 7-1: video 2 plays over the final material scene.";
  }
}

function setActBackground(src) {
  if (!bgLayers.length) {
    actBackground.style.backgroundImage = `url("${src}")`;
    return;
  }

  const nextIndex = 1 - bgLayerIndex;
  const nextLayer = bgLayers[nextIndex];
  const currentLayer = bgLayers[bgLayerIndex];
  nextLayer.style.backgroundImage = `url("${src}")`;
  nextLayer.classList.add("is-active");
  currentLayer.classList.remove("is-active");
  bgLayerIndex = nextIndex;
}

function playLoopingVideo(video, src) {
  if (!video || !src) return;
  const sources = getVideoSources(src);
  video.dataset.sources = JSON.stringify(sources);
  video.dataset.sourceIndex = "0";
  video.onerror = () => playNextVideoSource(video);
  setVideoSource(video, sources[0]);
  video.loop = true;
  video.style.opacity = "1";
  video.play().catch(() => {
    message.textContent = "Click once if the transparent video does not autoplay.";
  });
  window.setTimeout(() => {
    if (video.readyState === 0) playNextVideoSource(video);
  }, VIDEO_FALLBACK_DELAY);
}

function fadeOutVideo(video) {
  if (!video) return;
  video.style.opacity = "0";
  window.setTimeout(() => {
    if (video.style.opacity !== "0") return;
    video.pause();
    video.onerror = null;
    video.removeAttribute("src");
    video.load();
  }, 1250);
}

function getVideoSources(src) {
  return [src];
}

function setVideoSource(video, src) {
  if (video.src.endsWith(src)) return;
  video.src = src;
  video.currentTime = 0;
  video.load();
}

function playNextVideoSource(video) {
  let sources = [];
  try {
    sources = JSON.parse(video.dataset.sources || "[]");
  } catch {
    sources = [];
  }
  const nextIndex = Number(video.dataset.sourceIndex || 0) + 1;
  if (!sources[nextIndex]) return;
  video.dataset.sourceIndex = String(nextIndex);
  setVideoSource(video, sources[nextIndex]);
  video.play().catch(() => {});
}

function setStructureColorTargets(floorColor, doorColor) {
  floorColorTarget.setHex(floorColor);
  doorColorTarget.setHex(doorColor);
}

function applyStructureColors() {
  structureRecords.forEach(({ file, material }) => {
    if (file === "floor.glb") material.color.copy(floorColorCurrent);
    if (file === "door.glb") material.color.copy(doorColorCurrent);
  });
}

function setCharacterOpacity(opacity) {
  characterRoot.visible = opacity > 0.01;
  characterRecords.forEach((material) => {
    material.transparent = opacity < 0.98;
    material.opacity = opacity;
    material.depthWrite = opacity > 0.84;
    material.needsUpdate = true;
  });
}

function frameWholeScene() {
  camera.position.copy(FIXED_CAMERA_POSITION);
  camera.near = 0.05;
  camera.far = 3000;
  camera.updateProjectionMatrix();

  controls.target.copy(FIXED_CAMERA_TARGET);
  controls.update();
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeOutQuint(t) {
  return 1 - Math.pow(1 - t, 5);
}

function easeOutQuart(t) {
  return 1 - Math.pow(1 - t, 4);
}

function updateShotReadout() {
  if (!shotReadout || !camera || !controls || !sceneRoot) return;
  const cam = camera.position;
  const target = controls.target;
  const pos = sceneRoot.position;
  const rot = sceneRoot.rotation;
  shotReadout.textContent = `Cam ${fmt(cam.x)}, ${fmt(cam.y)}, ${fmt(cam.z)} | Target ${fmt(target.x)}, ${fmt(target.y)}, ${fmt(target.z)} | Scene pos ${fmt(pos.x)}, ${fmt(pos.y)}, ${fmt(pos.z)} rot ${fmt(rot.x)}, ${fmt(rot.y)}, ${fmt(rot.z)}`;
}

function fmt(value) {
  return Number(value).toFixed(2);
}

function colorDistance(a, b) {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function smoothstep(edge0, edge1, value) {
  const t = THREE.MathUtils.clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
