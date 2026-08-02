import * as THREE from 'three';
import { materials as M } from './materials.js';

/**
 * Bouwt de open woon/eet/kantoor-ruimte.
 * Coördinaten in meters. Benaderd op de plattegrond (Begane Grond) —
 * kalibreer de constanten hieronder tegen de exacte maten indien gewenst.
 *
 * Layout (bovenaanzicht):
 *   x: 0 (west / raamzijde)  ->  8.4 (oost)
 *   z: 0 (zuid)              ->  7.5 (noord)
 *   Glazen wand op x = 5.4 (vloerovergang natuursteen <-> hout)
 *   Kantoor = x 5.4..8.4 (houten vloer) ; Woon/eet = x 0..5.4 (natuursteen)
 */
export const DIMS = {
  X0: 0, X1: 8.4, Z0: 0, Z1: 7.5,
  WALLH: 2.47, WT: 0.15,
  GLASS_X: 5.4,           // positie glaswand
  DOOR_Z0: 2.7, DOOR_Z1: 4.5, // dooropening
};

export function buildRoom(scene) {
  const { X0, X1, Z0, Z1, WALLH, WT, GLASS_X, DOOR_Z0, DOOR_Z1 } = DIMS;
  const solids = []; // AABB's voor collision: {minx,minz,maxx,maxz}
  const S = (a, b, c, d) => solids.push({ minx: a, minz: b, maxx: c, maxz: d });

  const add = (geo, mat, x, y, z, ry) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    if (ry) m.rotation.y = ry;
    m.castShadow = true; m.receiveShadow = true;
    scene.add(m); return m;
  };
  const box = (w, h, d, mat, x, y, z, ry) => add(new THREE.BoxGeometry(w, h, d), mat, x, y, z, ry);
  const cyl = (rt, rb, h, mat, x, y, z, seg = 28) => add(new THREE.CylinderGeometry(rt, rb, h, seg), mat, x, y, z);
  const sph = (r, mat, x, y, z) => add(new THREE.SphereGeometry(r, 20, 16), mat, x, y, z);

  // ---- Vloeren ----
  const stone = new THREE.Mesh(new THREE.PlaneGeometry(GLASS_X, Z1), M.stone);
  stone.rotation.x = -Math.PI / 2; stone.position.set(GLASS_X / 2, 0, Z1 / 2);
  stone.receiveShadow = true; scene.add(stone);

  const wood = new THREE.Mesh(new THREE.PlaneGeometry(X1 - GLASS_X, Z1), M.wood);
  wood.rotation.x = -Math.PI / 2; wood.position.set((GLASS_X + X1) / 2, 0.001, Z1 / 2);
  wood.receiveShadow = true; scene.add(wood);
  box(0.1, 0.08, Z1, M.walnut, GLASS_X, 0.04, Z1 / 2); // vloer-lip

  // ---- Plafond ----
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(X1, Z1), M.cream);
  ceil.rotation.x = Math.PI / 2; ceil.position.set(X1 / 2, WALLH, Z1 / 2);
  ceil.receiveShadow = true; scene.add(ceil);

  // ---- Buitenmuren ----
  box(X1, WALLH, WT, M.cream, X1 / 2, WALLH / 2, Z0);       // zuid
  box(X1, WALLH, WT, M.cream, X1 / 2, WALLH / 2, Z1);       // noord
  box(WT, WALLH, Z1, M.cream, X1, WALLH / 2, Z1 / 2);       // oost (kantoor)
  // west (raamzijde): muurdelen + groot raam
  box(WT, WALLH, 1.6, M.cream, X0, WALLH / 2, 0.8);
  box(WT, WALLH, 1.6, M.cream, X0, WALLH / 2, Z1 - 0.8);
  const winMat = new THREE.MeshStandardMaterial({
    color: 0xfff3dc, emissive: 0xffcf8c, emissiveIntensity: 0.9, roughness: 0.1
  });
  box(0.06, 1.6, Z1 - 3.2, winMat, 0.02, 1.3, Z1 / 2);
  box(0.1, WALLH, 0.1, M.frame, 0.05, WALLH / 2, 1.6);
  box(0.1, WALLH, 0.1, M.frame, 0.05, WALLH / 2, Z1 - 1.6);

  // ---- Glazen wand met 2 taatsdeuren (open) ----
  [Z0 + 0.2, Z1 - 0.2, DOOR_Z0, DOOR_Z1].forEach(z => box(0.1, WALLH, 0.1, M.frame, GLASS_X, WALLH / 2, z));
  box(0.09, 0.12, Z1, M.frame, GLASS_X, WALLH - 0.06, Z1 / 2);
  box(0.09, 0.12, Z1, M.frame, GLASS_X, 0.06, Z1 / 2);
  const panel = (cz, cd) => {
    const g = new THREE.Mesh(new THREE.BoxGeometry(0.03, WALLH - 0.2, cd), M.glass);
    g.position.set(GLASS_X, WALLH / 2, cz); scene.add(g);
  };
  panel((Z0 + 0.2 + DOOR_Z0) / 2, DOOR_Z0 - Z0 - 0.4);
  panel((DOOR_Z1 + Z1 - 0.2) / 2, Z1 - 0.4 - DOOR_Z1);

  function pivotDoor(hingeZ, dir) {
    const g = new THREE.Group();
    const dW = (DOOR_Z1 - DOOR_Z0) / 2 - 0.05, dH = WALLH - 0.24;
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.03, dH, dW), M.glass); p.position.z = dW / 2 * dir;
    const e = new THREE.Mesh(new THREE.BoxGeometry(0.05, dH, 0.05), M.frame); e.position.z = dW * dir;
    g.add(p, e); g.position.set(GLASS_X, WALLH / 2, hingeZ);
    g.rotation.y = -dir * (Math.PI * 0.6); // opengedraaid richting kantoor
    scene.add(g);
    return g;
  }
  const doorA = pivotDoor(DOOR_Z0, 1);
  const doorB = pivotDoor(DOOR_Z1, -1);

  // ---- KANTOOR (x 5.4..8.4) ----
  box(2.0, 0.5, 0.5, M.blackW, 6.9, 0.26, 0.4);                 // tv-meubel
  box(1.75, 0.98, 0.06, M.screen, 6.9, 1.4, 0.22);             // tv
  box(1.85, 1.06, 0.04, M.blackW, 6.9, 1.4, 0.18);
  box(1.9, 0.05, 0.85, M.walnut, 6.9, 0.75, Z1 - 0.55);        // bureaublad
  box(0.05, 0.72, 0.8, M.blackW, 5.98, 0.37, Z1 - 0.55);
  box(0.05, 0.72, 0.8, M.blackW, 7.82, 0.37, Z1 - 0.55);
  box(1.5, 2.3, 0.5, M.blackW, 8.1, 1.15, Z1 - 2.0);           // hoge kast
  box(0.5, 0.5, 0.5, M.blackW, 6.9, 0.5, Z1 - 1.4);            // stoel
  box(0.46, 0.7, 0.07, M.blackW, 6.9, 0.95, Z1 - 1.18);
  S(5.9, Z1 - 1.0, 7.9, Z1 - 0.1);   // bureau
  S(7.8, Z1 - 2.7, 8.4, Z1 - 1.3);   // kast
  S(5.9, 0.1, 7.9, 0.7);             // tv-meubel
  S(6.6, Z1 - 1.7, 7.2, Z1 - 1.1);   // stoel

  // ---- WOONKAMER (x 0..5.4) ----
  // U-bank
  box(2.7, 0.42, 0.98, M.sofa, 2.9, 0.24, Z1 - 0.7);
  box(1.0, 0.42, 2.4, M.sofa, 1.3, 0.24, Z1 - 1.9);
  [[2.2, Z1 - 0.75], [3.1, Z1 - 0.75], [4.0, Z1 - 0.75]].forEach(p => {
    const m = cyl(0.42, 0.42, 0.2, M.sofa, p[0], 0.5, p[1], 20); m.scale.set(1.05, 1, 1.15);
  });
  [[1.3, Z1 - 2.4], [1.3, Z1 - 1.5]].forEach(p => {
    const m = cyl(0.42, 0.42, 0.2, M.sofa, p[0], 0.5, p[1], 20); m.scale.set(1.15, 1, 1.05);
  });
  box(2.7, 0.5, 0.32, M.sofa, 2.9, 0.68, Z1 - 0.27);            // rugleuning
  box(0.32, 0.5, 2.4, M.sofa, 0.94, 0.68, Z1 - 1.9);
  cyl(0.16, 0.16, 0.98, M.sofa, 4.32, 0.55, Z1 - 0.7, 18);      // armleuning
  // organische walnoot salontafels
  const t1 = cyl(0.52, 0.52, 0.33, M.walnut, 2.6, 0.165, Z1 - 2.2, 32); t1.scale.set(1, 1, 0.9);
  cyl(0.34, 0.34, 0.27, M.walnut, 3.45, 0.135, Z1 - 1.9, 28);
  // woonkamer-tv
  box(2.2, 0.46, 0.5, M.walnut, 2.3, 0.24, 0.4);
  box(1.5, 0.85, 0.06, M.screen, 2.3, 1.25, 0.22);
  box(1.6, 0.93, 0.04, M.blackW, 2.3, 1.25, 0.18);
  // eethoek-hint + planten
  const dt = cyl(0.95, 0.95, 0.05, M.walnut, 1.5, 0.75, 2.1, 40); dt.scale.set(1.9, 1, 1);
  [[0.75, 1.7], [2.25, 1.7], [0.75, 2.5], [2.25, 2.5]].forEach(p => box(0.06, 0.75, 0.06, M.walnut, p[0], 0.38, p[1]));
  cyl(0.2, 0.15, 0.42, M.walnut, 5.0, 0.21, Z1 / 2, 20);
  sph(0.5, M.plant, 5.0, 0.85, Z1 / 2).scale.set(1, 1.35, 1);
  S(0.9, Z1 - 2.7, 4.5, Z1 - 0.1);   // bank
  S(2.1, Z1 - 2.7, 4.1, Z1 - 1.4);   // salontafels
  S(1.3, 0.1, 3.3, 0.7);             // tv-meubel
  S(0.55, 1.3, 2.45, 2.9);           // eettafel

  return { solids, doors: [doorA, doorB] };
}
