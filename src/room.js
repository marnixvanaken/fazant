import * as THREE from 'three';
import { materials as M } from './materials.js';

/**
 * Woonkamer — Fazantenlaan 4, Grubbenvorst (testkamer, Route A: verbeterd CGI).
 *
 * Maten gekalibreerd op de plattegrond (Begane Grond):
 *   open woon/eetkamer ≈ 8,44 m (west→oost) × 7,5 m (zuid→noord), h = 2,47 m.
 * Coördinaten in meters.
 *
 * Layout (bovenaanzicht):
 *   x: 0 (west, keuken/raamzijde)  ->  8.4 (oost, wand naar gang/slaapkamers)
 *   z: 0 (zuid, entree/hal)        ->  7.5 (noord, tuin/overkapping)
 *   Grote glaspui op de noordwand (tuin) · raam west · raam + entree zuid ·
 *   dooropening naar de gang in de oostwand.
 */
export const DIMS = {
  X0: 0, X1: 8.4, Z0: 0, Z1: 7.5,
  WALLH: 2.47, WT: 0.15,
};

export function buildRoom(scene) {
  const { X0, X1, Z0, Z1, WALLH, WT } = DIMS;
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

  // ---------- Vloer ----------
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(X1, Z1), M.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(X1 / 2, 0, Z1 / 2);
  floor.receiveShadow = true;
  scene.add(floor);

  // ---------- Plafond ----------
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(X1, Z1), M.ceil);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(X1 / 2, WALLH, Z1 / 2);
  ceil.receiveShadow = true;
  scene.add(ceil);

  // Inbouwspots (zachte gloed in het plafond).
  const spotMat = new THREE.MeshStandardMaterial({
    color: 0xfff3df, emissive: 0xffe9c4, emissiveIntensity: 1.1, roughness: 0.4,
  });
  [[2.2, 2.0], [5.6, 2.0], [2.2, 5.2], [5.6, 5.2], [4.0, 3.6]].forEach(([x, z]) => {
    const d = new THREE.Mesh(new THREE.CircleGeometry(0.11, 24), spotMat);
    d.rotation.x = Math.PI / 2; d.position.set(x, WALLH - 0.01, z); scene.add(d);
  });

  // ---------- Wanden ----------
  // Plinten (antraciet) — subtiele donkere basislijn langs de wanden.
  const plinth = (w, d, x, z, ry) => box(w, 0.09, d, M.trim, x, 0.045, z, ry);
  plinth(X1, 0.03, X1 / 2, Z0 + 0.02);            // zuid
  plinth(X1, 0.03, X1 / 2, Z1 - 0.02);            // noord
  plinth(0.03, Z1, X0 + 0.02, Z1 / 2);            // west
  plinth(0.03, Z1, X1 - 0.02, Z1 / 2);            // oost

  // -- Zuidwand (z=0): entree (hal) west + raam + tv-nis --
  // dooropening naar hal: x 0.6..1.8 ; raam: x 4.5..6.5 (y 0.9..2.1)
  box(0.6, WALLH, WT, M.wall, 0.3, WALLH / 2, Z0);                 // west van de deur
  box(1.2, WALLH - 2.1, WT, M.wall, 1.2, (2.1 + WALLH) / 2, Z0);   // bovendorpel hal-deur
  box(2.7, WALLH, WT, M.wall, 3.15, WALLH / 2, Z0);               // tv-wand (deur↔raam)
  box(2.0, 0.9, WT, M.wall, 5.5, 0.45, Z0);                       // onder raam
  box(2.0, WALLH - 2.1, WT, M.wall, 5.5, (2.1 + WALLH) / 2, Z0);  // boven raam
  box(X1 - 6.5, WALLH, WT, M.wall, (6.5 + X1) / 2, WALLH / 2, Z0);// oost van het raam
  glazedHole(5.5, Z0, 2.0, 0.9, 2.1, 'x');                        // raam zuid

  // -- Noordwand (z=Z1): grote glaspui naar de tuin/overkapping --
  const gL = 0.5, gR = X1 - 0.5, gTop = WALLH - 0.12;
  box(1.0, WALLH, WT, M.wall, gL / 2, WALLH / 2, Z1);             // linkerpenant
  box(1.0, WALLH, WT, M.wall, X1 - gL / 2, WALLH / 2, Z1);        // rechterpenant
  box(gR - gL, WALLH - gTop, WT, M.wall, X1 / 2, (gTop + WALLH) / 2, Z1); // latei boven
  bigGlazing(gL, gR, gTop, Z1);

  // -- Westwand (x=0): raam (z 1.2..3.4, y 0.9..2.1) --
  box(WT, 0.9, Z1, M.wall, X0, 0.45, Z1 / 2);                     // onderband
  box(WT, WALLH - 2.1, Z1, M.wall, X0, (2.1 + WALLH) / 2, Z1 / 2);// bovenband
  box(WT, 1.2, 1.2, M.wall, X0, 1.5, 0.6);                        // zuid van raam
  box(WT, 1.2, Z1 - 3.4, M.wall, X0, 1.5, (3.4 + Z1) / 2);        // noord van raam
  glazedHole(X0, 2.3, 2.2, 0.9, 2.1, 'z');                        // raam west

  // -- Oostwand (x=X1): dichte wand + deur naar de gang (z 3.0..4.2) --
  box(WT, WALLH, 3.0, M.wall, X1, WALLH / 2, 1.5);               // zuiddeel
  box(WT, WALLH, Z1 - 4.2, M.wall, X1, WALLH / 2, (4.2 + Z1) / 2);// noorddeel
  box(WT, WALLH - 2.1, 1.2, M.wall, X1, (2.1 + WALLH) / 2, 3.6);  // bovendorpel deur
  frameRect(X1, 3.6, 1.2, 2.1, 'z');                             // deurkozijn gang
  frameRect(Z0, 1.2, 1.2, 2.1, 'x');                             // deurkozijn hal (zuid)

  // Dimme 'ruimte erachter' zodat dooropeningen geen buitenlucht tonen.
  const beyond = new THREE.MeshStandardMaterial({ color: 0x8f887e, roughness: 1, side: THREE.DoubleSide });
  const halBack = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.35), beyond);
  halBack.position.set(1.2, 1.1, Z0 - 0.3); scene.add(halBack);
  const gangBack = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.35), beyond);
  gangBack.rotation.y = Math.PI / 2; gangBack.position.set(X1 + 0.3, 1.1, 3.6); scene.add(gangBack);

  // ---------- Meubels ----------
  // Vloerkleed onder het zitgedeelte.
  const rug = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.02, 2.6), M.rug);
  rug.position.set(3.15, 0.011, 1.7); rug.receiveShadow = true; scene.add(rug);

  // Tv-meubel + tv tegen de zuidwand.
  box(2.2, 0.42, 0.45, M.blackW, 3.15, 0.21, 0.32);
  box(1.6, 0.94, 0.03, M.blackW, 3.15, 1.28, 0.14);
  box(1.5, 0.86, 0.05, M.screen, 3.15, 1.28, 0.16);
  S(2.0, 0.05, 4.3, 0.58);

  // Beige bank (3-zits + chaise-hint), gericht op de tv (kijkt naar -z).
  box(2.6, 0.40, 0.95, M.sofa, 3.15, 0.22, 2.15);                 // zitting
  box(2.6, 0.55, 0.26, M.sofa, 3.15, 0.62, 2.60);                 // rugleuning (noordzijde)
  box(0.26, 0.52, 0.95, M.sofa, 1.98, 0.44, 2.15);               // armleuning west
  box(0.26, 0.52, 0.95, M.sofa, 4.32, 0.44, 2.15);               // armleuning oost
  [2.35, 3.15, 3.95].forEach(x => {                              // zitkussens
    const c = box(0.74, 0.16, 0.9, M.sofa, x, 0.48, 2.15); c.castShadow = true;
  });
  box(1.1, 0.34, 0.9, M.sofa, 4.9, 0.19, 2.15);                  // poef/chaise oost
  S(1.8, 1.65, 5.5, 2.75);

  // Ronde walnoot salontafel.
  cyl(0.5, 0.5, 0.06, M.walnut, 3.0, 0.36, 1.25, 40);
  cyl(0.42, 0.44, 0.32, M.walnut, 3.0, 0.16, 1.25, 32);
  cyl(0.28, 0.28, 0.05, M.walnut, 3.9, 0.30, 1.05, 28);          // klein bijzettafeltje
  cyl(0.06, 0.06, 0.30, M.walnut, 3.9, 0.15, 1.05, 16);
  S(2.4, 0.7, 4.2, 1.8);

  // Eethoek bij de glaspui (noord/tuinzijde).
  box(1.7, 0.05, 0.95, M.oak, 2.6, 0.75, 5.8);                    // tafelblad
  [[1.85, 5.4], [1.85, 6.2], [3.35, 5.4], [3.35, 6.2]].forEach(p =>
    box(0.06, 0.75, 0.06, M.oak, p[0], 0.375, p[1]));
  [[1.95, 5.15], [1.95, 6.05], [3.25, 5.15], [3.25, 6.05]].forEach(p => { // stoelen
    box(0.44, 0.06, 0.44, M.blackW, p[0], 0.46, p[1]);
    box(0.44, 0.5, 0.05, M.blackW, p[0], 0.72, p[1] - 0.2);
  });
  S(1.6, 4.8, 3.7, 6.5);

  // Pendel boven de eettafel.
  box(0.02, 0.55, 0.02, M.trim, 2.6, WALLH - 0.28, 5.8);
  const pend = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 16),
    new THREE.MeshStandardMaterial({ color: 0x2a2a2a, emissive: 0xffe6b8, emissiveIntensity: 0.6, roughness: 0.5 }));
  pend.position.set(2.6, WALLH - 0.55, 5.8); scene.add(pend);

  // Plant in de westhoek bij het raam.
  cyl(0.22, 0.17, 0.42, M.pot, 0.75, 0.21, 4.7, 24);
  sph(0.48, M.plant, 0.75, 0.9, 4.7).scale.set(1, 1.4, 1);
  S(0.45, 4.4, 1.05, 5.0);

  // ================= interne helpers =================

  // Rechthoekig antraciet kozijn rond een opening in een wand.
  // orient 'x' → opening in een z-constante wand; 'z' → x-constante wand.
  function frameRect(along, cross, w, h, orient) {
    const t = 0.07;
    if (orient === 'x') { // wand op z = along... eigenlijk: opening centered (cross=x, along=z)
      const z = along, x = cross;
      box(w + 2 * t, t, 0.12, M.trim, x, h + t / 2, z);          // boven
      box(t, h, 0.12, M.trim, x - w / 2 - t / 2, h / 2, z);      // links
      box(t, h, 0.12, M.trim, x + w / 2 + t / 2, h / 2, z);      // rechts
    } else { // z-constante wand: along=x, cross=z
      const x = along, z = cross;
      box(0.12, t, w + 2 * t, M.trim, x, h + t / 2, z);
      box(0.12, h, t, M.trim, x, h / 2, z - w / 2 - t / 2);
      box(0.12, h, t, M.trim, x, h / 2, z + w / 2 + t / 2);
    }
  }

  // Raam: glaspaneel + antraciet kozijn. yb/yt = onder/boven.
  function glazedHole(pos, wallpos, width, yb, yt, orient) {
    const h = yt - yb, cy = (yb + yt) / 2;
    if (orient === 'x') {           // zuidwand-achtig: pos=x, wallpos=z
      box(width, h, 0.03, M.glass, pos, cy, wallpos);
      box(width + 0.1, 0.06, 0.1, M.trim, pos, yb, wallpos);
      box(width + 0.1, 0.06, 0.1, M.trim, pos, yt, wallpos);
      box(0.06, h, 0.1, M.trim, pos - width / 2, cy, wallpos);
      box(0.06, h, 0.1, M.trim, pos + width / 2, cy, wallpos);
    } else {                        // westwand-achtig: pos=z, wallpos=x
      box(0.03, h, width, M.glass, wallpos, cy, pos);
      box(0.1, 0.06, width + 0.1, M.trim, wallpos, yb, pos);
      box(0.1, 0.06, width + 0.1, M.trim, wallpos, yt, pos);
      box(0.1, h, 0.06, M.trim, wallpos, cy, pos - width / 2);
      box(0.1, h, 0.06, M.trim, wallpos, cy, pos + width / 2);
    }
  }

  // Grote glaspui (noordwand) met 3 velden, stijlen, dorpel en boven-transom.
  function bigGlazing(xL, xR, top, z) {
    const cy = top / 2;
    // 3 glasvelden
    const seg = (xR - xL) / 3;
    for (let i = 0; i < 3; i++) {
      box(seg - 0.06, top - 0.05, 0.03, M.glass, xL + seg * (i + 0.5), cy, z);
    }
    // stijlen (verticaal) + jambs
    [xL, xL + seg, xL + 2 * seg, xR].forEach(x =>
      box(0.08, top, 0.11, M.trim, x, cy, z));
    // dorpel onder + transom op ooghoogte + latei-rand boven
    box(xR - xL + 0.08, 0.06, 0.12, M.trim, (xL + xR) / 2, 0.03, z);
    box(xR - xL + 0.08, 0.05, 0.11, M.trim, (xL + xR) / 2, 1.15, z);
    box(xR - xL + 0.08, 0.07, 0.12, M.trim, (xL + xR) / 2, top, z);
  }

  return { solids };
}
