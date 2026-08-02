# Fazantenlaan 4 — 3D Walkthrough (Route A: verbeterd CGI)

First-person walkthrough van de woonkamer met glazen taatsdeuren en kantoor —
renovatie-visualisatie van Fazantenlaan 4, Grubbenvorst. Vite + Three.js.

## Draaien
```bash
npm install
npm run dev
```
Open de URL die Vite toont (meestal http://localhost:5173). Klik **Ga naar binnen**;
de muis wordt vastgezet voor first-person besturing. **WASD** lopen, **muis** kijken,
**Shift** rennen, **Esc** muis vrij.

> Pointer lock werkt hier omdat je in een echt browsertabblad draait (in de
> afgeschermde chat-omgeving werkte dat niet — vandaar deze lokale opzet).

## Projectstructuur
- `index.html` — startscherm + HUD
- `src/main.js` — renderer, belichting, besturing, collision, loop
- `src/room.js` — geometrie: schil, glaswand + taatsdeuren, meubels, collision-boxen
- `src/materials.js` — PBR-materialen + golden-hour omgeving (IBL)
- `public/textures|models|hdri/` — hier komen je gratis assets

## Kalibreren op de plattegrond
De maten in `src/room.js` (object `DIMS`) zijn benaderd. Zet ze exact met de
plattegrond **Begane Grond** ernaast:
- `X1`/`Z1` = breedte/diepte van de open woon/eetruimte
- `GLASS_X` = positie van de vloerovergang (natuursteen ↔ hout) waar de glaswand komt
- `DOOR_Z0`/`DOOR_Z1` = breedte/positie van de dooropening

## Van "goed" naar "bijna fotoreëel" (gratis)
Volgorde met de grootste zichtbare winst eerst:

1. **Echte PBR-textures** (grootste sprong). Download CC0-sets van
   https://ambientcg.com — natuursteen tegels, houten vloer, wanden. Zet ze in
   `public/textures/` en vul de `maps:{...}` regels in `src/materials.js` in
   (staan er al uitgecommentarieerd bij `stone` en `wood`).
2. **Echte meubelmodellen** (glTF/GLB). Gratis CC0-bronnen: Poly Haven
   (polyhaven.com/models), Quaternius, Sketchfab (filter op CC0). Laad met
   `GLTFLoader` en vervang de primitieve vormen in `src/room.js`.
3. **Golden-hour HDRI** i.p.v. de procedurele lucht: zet een `.hdr` in
   `public/hdri/` en laad met `RGBELoader` (voorbeeld hieronder).
4. **Post-processing**: zet de imports boven in `src/main.js` aan en voeg
   `UnrealBloomPass` (zachte gloed) + eventueel ambient occlusion toe.
5. **Klikbare taatsdeuren**: `buildRoom` geeft `doors` terug — anim met een
   raycast + tween op `rotation.y`.

### HDRI laden (voorbeeld)
```js
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
new RGBELoader().load('/hdri/golden_hour.hdr', (hdr) => {
  hdr.mapping = THREE.EquirectangularReflectionMapping;
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromEquirectangular(hdr).texture;
  scene.background = hdr;
});
```

## Vaste stijlkeuzes (renovatie)
- Taatsdeuren/kozijn: warme beige/lichthout-tint, helder glas, beide open.
- Kantoor: TV + zwarthouten meubel, donker bureau + hoge zwarthouten kast.
- Woonkamer: beige U-bank, organische walnoot salontafels, eigen TV.
- Sfeer: golden hour, crème wanden, minimalistisch.

## Volgende stap (Route B, later)
Fotoreëel & walkable via Gaussian Splatting: film een rustige walkthrough-video
in het huis, verwerk tot een splat, en laad in een browser-viewer. Aparte opzet.
