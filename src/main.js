import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { makeGoldenHourEnv } from './materials.js';
import { buildRoom, DIMS } from './room.js';

// Optioneel: post-processing (aan te zetten voor extra diepte).
// import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
// import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
// import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
// import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// ---------- Renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
document.body.appendChild(renderer.domElement);

// ---------- Scene & camera ----------
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 200);
const EYE = 1.65;
camera.position.set(7.0, EYE, DIMS.Z1 / 2); // start in het kantoor

makeGoldenHourEnv(renderer, scene);

// ---------- Belichting ----------
scene.add(new THREE.HemisphereLight(0xfff1da, 0x5a4a38, 0.35));
const sun = new THREE.DirectionalLight(0xffd7a0, 2.4);
sun.position.set(-7, 5.5, -9);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 0.5, far: 45 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
scene.add(sun);
const fill = new THREE.DirectionalLight(0xffe6c8, 0.25);
fill.position.set(9, 4, 7);
scene.add(fill);

// ---------- Ruimte ----------
const { solids } = buildRoom(scene);

// ---------- First-person controls (pointer lock) ----------
const controls = new PointerLockControls(camera, renderer.domElement);
scene.add(controls.getObject ? controls.getObject() : camera);
// kijk-startrichting naar de woonkamer (-x)
camera.rotation.order = 'YXZ';
controls.getObject
  ? controls.getObject().rotation.set(0, Math.PI / 2, 0)
  : camera.rotation.set(0, Math.PI / 2, 0);

const startEl = document.getElementById('start');
const hud = document.getElementById('hud');
const zoneEl = document.getElementById('zone');
document.getElementById('enter').addEventListener('click', () => controls.lock());
renderer.domElement.addEventListener('click', () => { if (!controls.isLocked) controls.lock(); });
controls.addEventListener('lock', () => { startEl.classList.add('hidden'); hud.classList.add('show'); });
controls.addEventListener('unlock', () => { startEl.classList.remove('hidden'); hud.classList.remove('show'); });

const keys = {};
addEventListener('keydown', e => keys[e.code] = true);
addEventListener('keyup', e => keys[e.code] = false);

// ---------- Collision ----------
const PR = 0.32;
const { X0, X1, Z0, Z1, WT, GLASS_X, DOOR_Z0, DOOR_Z1 } = DIMS;
function blocked(x, z) {
  if (x < X0 + PR || x > X1 - PR || z < Z0 + PR || z > Z1 - PR) return true;
  for (const s of solids) {
    if (x > s.minx - PR && x < s.maxx + PR && z > s.minz - PR && z < s.maxz + PR) return true;
  }
  const inDoor = (z > DOOR_Z0 + 0.05 && z < DOOR_Z1 - 0.05);
  if (!inDoor && Math.abs(x - GLASS_X) < WT + PR) return true;
  return false;
}

// ---------- Zone-label ----------
let lastZone = '';
function updateZone(x) {
  const z = x < GLASS_X ? 'Woonkamer' : 'Kantoor';
  if (z !== lastZone) {
    lastZone = z; zoneEl.textContent = z; zoneEl.style.opacity = '0.85';
    clearTimeout(updateZone._t);
    updateZone._t = setTimeout(() => zoneEl.style.opacity = '0', 1600);
  }
}

// ---------- Loop ----------
const clock = new THREE.Clock();
const fwd = new THREE.Vector3(), right = new THREE.Vector3(), mv = new THREE.Vector3();
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  if (controls.isLocked) {
    const speed = (keys['ShiftLeft'] || keys['ShiftRight'] ? 4.2 : 2.3) * dt;
    camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize();
    right.crossVectors(fwd, camera.up).normalize();
    mv.set(0, 0, 0);
    if (keys['KeyW']) mv.add(fwd);
    if (keys['KeyS']) mv.sub(fwd);
    if (keys['KeyD']) mv.add(right);
    if (keys['KeyA']) mv.sub(right);
    if (mv.lengthSq() > 0) {
      mv.normalize().multiplyScalar(speed);
      const nx = camera.position.x + mv.x, nz = camera.position.z + mv.z;
      if (!blocked(nx, camera.position.z)) camera.position.x = nx;
      if (!blocked(camera.position.x, nz)) camera.position.z = nz;
    }
    camera.position.y = EYE;
    updateZone(camera.position.x);
  }
  renderer.render(scene, camera);
}
animate();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
