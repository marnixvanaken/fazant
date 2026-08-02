import * as THREE from 'three';

/**
 * Materialen. Standaard draaien ze op effen PBR-kleuren zodat het project
 * meteen werkt. Wil je richting fotoreëel: zet echte CC0-textures in
 * /public/textures/ en vul de paden in bij loadTexture() hieronder.
 * Bron voor gratis PBR-textures: https://ambientcg.com  (CC0).
 */

const texLoader = new THREE.TextureLoader();

/** Laadt een texture-set (albedo/normal/roughness) als de bestanden bestaan.
 *  Ontbreken ze, dan valt hij terug op de effen kleur. */
function pbr({ color, roughness = 0.8, metalness = 0.0, maps = null, repeat = [1, 1] }) {
  const mat = new THREE.MeshStandardMaterial({ color, roughness, metalness });
  if (maps) {
    const apply = (url, isColor) => {
      if (!url) return null;
      const t = texLoader.load(url);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(repeat[0], repeat[1]);
      if (isColor) t.colorSpace = THREE.SRGBColorSpace;
      return t;
    };
    if (maps.map) { mat.map = apply(maps.map, true); mat.color.set(0xffffff); }
    if (maps.normal) mat.normalMap = apply(maps.normal, false);
    if (maps.rough) mat.roughnessMap = apply(maps.rough, false);
    if (maps.ao) mat.aoMap = apply(maps.ao, false);
  }
  return mat;
}

export const materials = {
  stone:  pbr({ color: 0xd7cbb4, roughness: 0.75, metalness: 0.02, repeat: [6, 8],
                // maps: { map:'/textures/stone_diff.jpg', normal:'/textures/stone_nor.jpg', rough:'/textures/stone_rough.jpg' }
              }),
  wood:   pbr({ color: 0x6b4429, roughness: 0.38, metalness: 0.03, repeat: [4, 6],
                // maps: { map:'/textures/wood_diff.jpg', normal:'/textures/wood_nor.jpg', rough:'/textures/wood_rough.jpg' }
              }),
  walnut: pbr({ color: 0x4d3221, roughness: 0.4 }),
  blackW: pbr({ color: 0x1a150f, roughness: 0.42, metalness: 0.05 }),
  cream:  pbr({ color: 0xefe8dc, roughness: 0.95 }),
  sofa:   pbr({ color: 0xe6dcc7, roughness: 0.95 }),
  frame:  pbr({ color: 0xc9b083, roughness: 0.4, metalness: 0.25 }),
  screen: pbr({ color: 0x0a0c0f, roughness: 0.15, metalness: 0.4 }),
  metal:  pbr({ color: 0x2a2a2a, roughness: 0.35, metalness: 0.6 }),
  plant:  pbr({ color: 0x3f6b3a, roughness: 0.7 }),
  glass:  new THREE.MeshPhysicalMaterial({
            color: 0xeaf3f2, roughness: 0.03, metalness: 0, transmission: 0.95,
            transparent: true, opacity: 0.35, thickness: 0.03, ior: 1.45,
            side: THREE.DoubleSide, envMapIntensity: 1.2
          }),
};

/** Golden-hour omgeving (procedureel — geen asset nodig). Geeft warme IBL +
 *  reflecties in glas/vloer. Voor nóg realistischer: laad een echte .hdr,
 *  zie README (RGBELoader). */
export function makeGoldenHourEnv(renderer, scene) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512;
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 0, 512);
  grd.addColorStop(0.00, '#8fb6d6');
  grd.addColorStop(0.42, '#d7cdbe');
  grd.addColorStop(0.55, '#ffdd9e');
  grd.addColorStop(0.62, '#f6b06a');
  grd.addColorStop(0.75, '#a9865f');
  grd.addColorStop(1.00, '#5c4634');
  g.fillStyle = grd; g.fillRect(0, 0, 1024, 512);
  const sun = g.createRadialGradient(300, 280, 0, 300, 280, 150);
  sun.addColorStop(0, 'rgba(255,240,210,0.95)');
  sun.addColorStop(1, 'rgba(255,240,210,0)');
  g.fillStyle = sun; g.fillRect(0, 0, 1024, 512);

  const sky = new THREE.CanvasTexture(c);
  sky.mapping = THREE.EquirectangularReflectionMapping;
  sky.colorSpace = THREE.SRGBColorSpace;

  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const env = pmrem.fromEquirectangular(sky).texture;
  scene.environment = env;
  scene.background = sky;
  scene.fog = new THREE.Fog(0xe9d8bd, 22, 50);
  return env;
}
