import * as THREE from 'three';

/**
 * Materialen voor de woonkamer (Fazantenlaan 4).
 *
 * De vloer- en wandtexturen worden *procedureel* op een canvas getekend, zodat
 * het project realistisch oogt zónder externe asset-bestanden (de omgeving
 * blokkeert externe downloads). Wil je later naar echt fotoreëel: vervang
 * makeWoodTexture()/makePlasterTexture() door CC0-PBR-sets in /public/textures/.
 *
 * Palet afgeleid van de plattegrond + 3D-renders:
 *   warme eiken houtvloer · gebroken-witte wanden · antraciet kozijnen/plinten.
 */

// ---------- Procedurele textures (self-contained, geen assets) ----------

/** Warme eiken plankenvloer. Planken lopen verticaal op de canvas. */
function makeWoodTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 1024;
  const g = c.getContext('2d');
  const planks = 6;
  const pw = c.width / planks;

  for (let i = 0; i < planks; i++) {
    const x0 = i * pw;
    // Per-plank warme eik-tint met lichte variatie (warm gehouden, geen groenzweem).
    const r = 186 + (Math.random() * 20 - 10);
    const gr = 132 + (Math.random() * 12 - 6);
    const b = 84 + (Math.random() * 12 - 6);
    g.fillStyle = `rgb(${r | 0},${gr | 0},${b | 0})`;
    g.fillRect(x0, 0, pw, c.height);

    // Nerf: fijne, licht golvende verticale strepen.
    for (let s = 0; s < 34; s++) {
      const gx = x0 + Math.random() * pw;
      g.strokeStyle = `rgba(78,52,30,${0.03 + Math.random() * 0.05})`;
      g.lineWidth = 0.5 + Math.random() * 1.1;
      g.beginPath();
      let y = 0;
      g.moveTo(gx, y);
      while (y < c.height) {
        y += 30 + Math.random() * 55;
        g.lineTo(gx + (Math.random() * 3 - 1.5), y);
      }
      g.stroke();
    }

    // Verspringende kopse voegen (plank-einden).
    const joints = 2 + (Math.random() * 2 | 0);
    for (let j = 1; j <= joints; j++) {
      const jy = (c.height / (joints + 1)) * j + (Math.random() * 40 - 20);
      g.strokeStyle = 'rgba(40,26,15,0.45)';
      g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(x0, jy); g.lineTo(x0 + pw, jy); g.stroke();
    }

    // Donkere naad tussen planken.
    g.strokeStyle = 'rgba(38,24,14,0.6)';
    g.lineWidth = 2;
    g.beginPath(); g.moveTo(x0, 0); g.lineTo(x0, c.height); g.stroke();
  }

  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Subtiele gebroken-witte pleister (voorkomt vlakke CG-look op de wanden). */
function makePlasterTexture(hex = '#f3efe8') {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = hex;
  g.fillRect(0, 0, 512, 512);
  const img = g.getImageData(0, 0, 512, 512);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 10;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---------- Materialen ----------

const woodTex = makeWoodTexture();
woodTex.repeat.set(5.5, 3);

const plasterTex = makePlasterTexture('#f3efe8');
plasterTex.repeat.set(4, 3);

const ceilTex = makePlasterTexture('#faf8f4');
ceilTex.repeat.set(4, 4);

export const materials = {
  // Warme eiken plankenvloer.
  floor: new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.55, metalness: 0.0 }),

  // Gebroken-witte wanden + wit plafond. Het plafond kijkt naar beneden en
  // vangt daardoor donker hemisphere-grondlicht; een lichte emissive houdt het wit.
  wall:  new THREE.MeshStandardMaterial({ map: plasterTex, color: 0xffffff, roughness: 0.96 }),
  ceil:  new THREE.MeshStandardMaterial({ map: ceilTex, color: 0xffffff, roughness: 0.98,
                                          emissive: 0xf6f2ea, emissiveIntensity: 0.32 }),

  // Antraciet kozijnen, plinten en daklijst (matcht de render-trim).
  trim:  new THREE.MeshStandardMaterial({ color: 0x24262a, roughness: 0.5, metalness: 0.15 }),

  // Meubels.
  sofa:   new THREE.MeshStandardMaterial({ color: 0xe4dccb, roughness: 0.92 }),
  walnut: new THREE.MeshStandardMaterial({ color: 0x5b3d27, roughness: 0.4, metalness: 0.02 }),
  oak:    new THREE.MeshStandardMaterial({ color: 0x9c6f43, roughness: 0.45 }),
  blackW: new THREE.MeshStandardMaterial({ color: 0x1a150f, roughness: 0.45, metalness: 0.05 }),
  screen: new THREE.MeshStandardMaterial({ color: 0x0a0c0f, roughness: 0.15, metalness: 0.4 }),
  metal:  new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.35, metalness: 0.6 }),
  rug:    new THREE.MeshStandardMaterial({ color: 0xcdbca0, roughness: 1.0 }),
  plant:  new THREE.MeshStandardMaterial({ color: 0x3f6b3a, roughness: 0.7 }),
  pot:    new THREE.MeshStandardMaterial({ color: 0xb9ad9c, roughness: 0.8 }),

  glass:  new THREE.MeshPhysicalMaterial({
            color: 0xeaf3f2, roughness: 0.03, metalness: 0, transmission: 0.96,
            transparent: true, opacity: 0.28, thickness: 0.02, ior: 1.45,
            side: THREE.DoubleSide, envMapIntensity: 1.3,
          }),
};

/** Golden-hour omgeving (procedureel — geen asset nodig). Geeft warme IBL +
 *  reflecties in glas/vloer. Voor nóg realistischer: laad een echte .hdr,
 *  zie README (RGBELoader). */
export function makeGoldenHourEnv(renderer, scene) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512;
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 0, 512);
  grd.addColorStop(0.00, '#9dbfdc');
  grd.addColorStop(0.45, '#d9d0c2');
  grd.addColorStop(0.56, '#ffe0a6');
  grd.addColorStop(0.64, '#f6b06a');
  grd.addColorStop(0.78, '#9c8560');
  grd.addColorStop(1.00, '#59503f'); // gras/grond-band onderaan
  g.fillStyle = grd; g.fillRect(0, 0, 1024, 512);
  const sun = g.createRadialGradient(320, 300, 0, 320, 300, 160);
  sun.addColorStop(0, 'rgba(255,242,214,0.95)');
  sun.addColorStop(1, 'rgba(255,242,214,0)');
  g.fillStyle = sun; g.fillRect(0, 0, 1024, 512);

  const sky = new THREE.CanvasTexture(c);
  sky.mapping = THREE.EquirectangularReflectionMapping;
  sky.colorSpace = THREE.SRGBColorSpace;

  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const env = pmrem.fromEquirectangular(sky).texture;
  scene.environment = env;
  scene.background = sky;
  scene.fog = new THREE.Fog(0xe9d8bd, 26, 60);
  return env;
}
