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
renderer.toneMappingExposure = 1.02;
document.body.appendChild(renderer.domElement);

// ---------- Scene & camera ----------
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 200);
const EYE = 1.65;
camera.rotation.order = 'YXZ';
camera.position.set(6.6, EYE, 1.55);            // start bij het zuidraam
camera.lookAt(2.9, 1.45, 4.6);                  // kijk diagonaal richting bank + glaspui

makeGoldenHourEnv(renderer, scene);

// ---------- Belichting ----------
scene.add(new THREE.HemisphereLight(0xfff3e0, 0xa99a82, 0.5));

// Golden-hour zon: laag vanuit de tuin (noord), stroomt door de glaspui.
const sun = new THREE.DirectionalLight(0xffdca6, 2.6);
sun.position.set(2.6, 5.2, DIMS.Z1 + 7);
sun.target.position.set(4.2, 0.8, 3.0);
scene.add(sun.target);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -8, right: 10, top: 12, bottom: -4, near: 0.5, far: 40 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
scene.add(sun);

// Zacht invullicht vanuit het westraam.
const fill = new THREE.DirectionalLight(0xffe9cf, 0.3);
fill.position.set(-6, 3, 3);
scene.add(fill);

// ---------- Ruimte ----------
const { solids } = buildRoom(scene);

// ---------- First-person controls (pointer lock) ----------
const controls = new PointerLockControls(camera, renderer.domElement);
scene.add(controls.getObject ? controls.getObject() : camera);

const startEl = document.getElementById('start');
const hud = document.getElementById('hud');
const zoneEl = document.getElementById('zone');
document.getElementById('enter').addEventListener('click', () => controls.lock());
renderer.domElement.addEventListener('click', () => { if (!controls.isLocked) controls.lock(); });
controls.addEventListener('lock', () => {
  startEl.classList.add('hidden'); hud.classList.add('show');
  showZone('Woonkamer');
});
controls.addEventListener('unlock', () => { startEl.classList.remove('hidden'); hud.classList.remove('show'); });

const keys = {};
addEventListener('keydown', e => keys[e.code] = true);
addEventListener('keyup', e => keys[e.code] = false);

// ---------- Collision ----------
const PR = 0.32;
const { X0, X1, Z0, Z1 } = DIMS;
function blocked(x, z) {
  if (x < X0 + PR || x > X1 - PR || z < Z0 + PR || z > Z1 - PR) return true;
  for (const s of solids) {
    if (x > s.minx - PR && x < s.maxx + PR && z > s.minz - PR && z < s.maxz + PR) return true;
  }
  return false;
}

// ---------- Zone-label ----------
function showZone(name) {
  zoneEl.textContent = name; zoneEl.style.opacity = '0.85';
  clearTimeout(showZone._t);
  showZone._t = setTimeout(() => zoneEl.style.opacity = '0', 1800);
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
  }
  renderer.render(scene, camera);
}
animate();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// Dev-hook (alleen met ?debug): handig om vanuit een tool camera te plaatsen
// en screenshots te maken. Geen effect in normaal gebruik.
if (new URLSearchParams(location.search).has('debug')) {
  Object.assign(window, { THREE, scene, camera, renderer });
}
