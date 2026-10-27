/* The Unkwn Wedding Palace — the 360° camera scene.
   A cinema camera built from simple shapes (boxes, cylinders, a few rings) in Three.js, lit like a product shot,
   that turns one full circle as you scroll through #camera. No model file: every part is a few lines below. */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const section = document.querySelector('#camera');
const canvas = document.querySelector('#cameraCanvas');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
// Reduced motion: no 3D at all; the CSS lays the words out as a plain, still section.
if (reduceMotion) throw new Error('camera scene skipped: reduced motion');

/* ---------- 1. Renderer, scene, lens ----------
   alpha: true leaves the canvas see-through, so the page's black (and the gold glow under it) shows behind.
   ACES tone mapping rolls off bright highlights softly, like a film camera, instead of clipping them to white. */
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
} catch (error) {
  canvas.remove();               // no WebGL: the words still work on their own
  throw error;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const view = new THREE.PerspectiveCamera(30, 1, 0.1, 100);

// Soft studio reflections: a blurred "room" the metal and glass parts can reflect.
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.55;

/* ---------- 2. Lights ----------
   A warm key light from the upper left (his gold), a cool rim light from behind to trace the edges against the
   black page, and a little fill so the shadow side isn't a hole. */
const key = new THREE.DirectionalLight(0xffd9a0, 2.4);
key.position.set(-4, 5, 4);
const rim = new THREE.DirectionalLight(0xdfe8ff, 2.2);
rim.position.set(3, 2.5, -5);
const fill = new THREE.HemisphereLight(0xfff4e6, 0x1a1612, 0.35);
scene.add(key, rim, fill);

/* ---------- 3. Materials ---------- */
const matte = new THREE.MeshStandardMaterial({ color: 0x1c1b1a, roughness: 0.62, metalness: 0.25 });
const panel = new THREE.MeshStandardMaterial({ color: 0x2a2826, roughness: 0.5, metalness: 0.3 });
const metal = new THREE.MeshStandardMaterial({ color: 0x3a3836, roughness: 0.32, metalness: 0.85 });
const rubber = new THREE.MeshStandardMaterial({ color: 0x141312, roughness: 0.9, metalness: 0 });
const gold = new THREE.MeshStandardMaterial({ color: 0xc4a661, roughness: 0.28, metalness: 1 });
// Lens glass: dark but mirror-smooth, so it reflects the studio; the inner element has the faint purple-blue
// tint of a coated cinema lens.
const glass = new THREE.MeshPhysicalMaterial({ color: 0x1a2030, roughness: 0.06, metalness: 0.75, clearcoat: 1, clearcoatRoughness: 0.02 });
const coating = new THREE.MeshPhysicalMaterial({ color: 0x2b2350, roughness: 0.1, metalness: 0.6, emissive: 0x140f2e, emissiveIntensity: 0.8, clearcoat: 1 });
const screen = new THREE.MeshStandardMaterial({ color: 0x0b0b0c, roughness: 0.15, metalness: 0.2, emissive: 0x1a1712, emissiveIntensity: 0.6 });
const rec = new THREE.MeshStandardMaterial({ color: 0xff2a1a, emissive: 0xff2a1a, emissiveIntensity: 2.2 });

/* ---------- 4. The camera, part by part ----------
   The lens points along +z (toward you when the camera faces front). Units are roughly "decimetres". */
const rig = new THREE.Group();           // everything that turns
const add = (geometry, material, x = 0, y = 0, z = 0) => {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  rig.add(mesh);
  return mesh;
};
// A cylinder lying along z (Three's cylinders stand along y, so tip them forward 90°).
const tube = (radius, length, material, x, y, z, segments = 48) => {
  const mesh = add(new THREE.CylinderGeometry(radius, radius, length, segments), material, x, y, z);
  mesh.rotation.x = Math.PI / 2;
  return mesh;
};
const ring = (radius, thickness, material, z) => {
  const mesh = add(new THREE.TorusGeometry(radius, thickness, 16, 64), material, 0, 0, z);
  return mesh;
};

// Body: a rounded brick, with a lighter inset panel and a row of buttons on its right side.
add(new RoundedBoxGeometry(1.0, 1.1, 1.8, 6, 0.09), matte);
add(new RoundedBoxGeometry(0.04, 0.62, 0.9, 4, 0.015), panel, 0.51, 0.06, 0.05);
for (let i = 0; i < 4; i++) {
  const button = add(new THREE.CylinderGeometry(0.045, 0.045, 0.04, 24), metal, 0.54, -0.12, -0.24 + i * 0.16);
  button.rotation.z = Math.PI / 2;
}
add(new THREE.BoxGeometry(0.02, 0.1, 0.34), gold, 0.535, 0.24, 0.05);   // a small gold nameplate

// Battery on the back.
add(new RoundedBoxGeometry(0.82, 0.9, 0.26, 4, 0.05), rubber, 0, -0.04, -1.03);

// Lens: mount, gold ring, barrel with grip rings, hood, and the front glass with two inner rings.
tube(0.44, 0.12, metal, 0, 0, 0.96);
ring(0.44, 0.022, gold, 1.03);
tube(0.36, 0.95, matte, 0, 0, 1.5);
[1.2, 1.42, 1.64].forEach(z => tube(0.385, 0.1, rubber, 0, 0, z));
tube(0.43, 0.2, matte, 0, 0, 2.05);
const lensGlass = add(new THREE.CircleGeometry(0.33, 64), glass, 0, 0, 2.151);
ring(0.33, 0.012, metal, 2.152);
add(new THREE.CircleGeometry(0.19, 64), coating, 0, 0, 2.153);
ring(0.19, 0.008, metal, 2.154);
lensGlass.renderOrder = 1;

// Top handle: a bar on two posts, plus a mic clipped to the front.
tube(0.055, 1.25, rubber, 0, 0.86, 0.05);
add(new THREE.CylinderGeometry(0.05, 0.05, 0.3, 24), metal, 0, 0.68, -0.45);
add(new THREE.CylinderGeometry(0.05, 0.05, 0.3, 24), metal, 0, 0.68, 0.55);
tube(0.07, 0.6, rubber, 0, 0.86, 1.02);
tube(0.075, 0.08, metal, 0, 0.86, 0.74);

// Monitor on the left: a short arm and a screen tilted toward the operator.
add(new THREE.BoxGeometry(0.22, 0.05, 0.05), metal, -0.6, 0.38, 0.4);
const monitor = add(new RoundedBoxGeometry(0.06, 0.4, 0.62, 4, 0.02), matte, -0.74, 0.42, 0.4);
monitor.rotation.y = -0.35;
const face = add(new THREE.PlaneGeometry(0.52, 0.32), screen, -0.775, 0.42, 0.41);
face.rotation.y = -Math.PI / 2 - 0.35;

// Viewfinder at the back left, with a rubber eyecup.
tube(0.1, 0.42, matte, -0.36, 0.38, -0.98);
tube(0.13, 0.12, rubber, -0.36, 0.38, -1.22);

// Red tally lights, front corner and back: the one bit of colour that says "rolling". They blink while it records
// (see frame()), and a small red point light makes the body around the front one glow when it's on.
add(new THREE.SphereGeometry(0.035, 24, 16), rec, 0.36, 0.42, 0.91);
add(new THREE.SphereGeometry(0.035, 24, 16), rec, 0.3, 0.38, -1.17);
const recGlow = new THREE.PointLight(0xff2a1a, 0, 0.9, 2);
recGlow.position.set(0.36, 0.42, 1.0);
rig.add(recGlow);

// Centre the rig on its own middle (the lens makes it front-heavy), then tilt it slightly toward us.
const box = new THREE.Box3().setFromObject(rig);
const centre = box.getCenter(new THREE.Vector3());
rig.position.sub(centre);
const turntable = new THREE.Group();     // turns around y (the scroll)
turntable.add(rig);
const tilt = new THREE.Group();          // fixed tilt, so we see a little of the top
tilt.rotation.x = 0.16;
tilt.add(turntable);
scene.add(tilt);

/* ---------- 5. Framing ----------
   Keep the whole camera in frame at any screen shape. The view is set by its height (fov 30°), so on narrow
   screens the width is the limit: back off until about 4.4 units (the camera's longest side, lens to battery,
   plus a margin) fit across. tan(half the horizontal angle) = tan(15°) × aspect. */
const SPAN = 4.4;
const resize = () => {
  const { clientWidth: w, clientHeight: h } = canvas;
  renderer.setSize(w, h, false);
  view.aspect = w / h;
  const fitWidth = (SPAN / 2) / (Math.tan(THREE.MathUtils.degToRad(view.fov / 2)) * view.aspect);
  const distance = Math.max(9, fitWidth);
  view.position.set(0, 0.55, distance);
  view.lookAt(0, -0.2, 0);               // aim near the middle: the heading is above, the lines rise below
  view.updateProjectionMatrix();
};

/* ---------- 6. Scroll → Dosedrop's timeline ----------
   t = how far you've scrolled into the section, in screens (1 = one screen height), so the timing feels the same on
   every device. The camera's moves are keyframes on t; the shown values ease toward them (12% a frame), so a flick
   of the wheel moves it smoothly instead of jumping. The text beats are thresholds that set data-step.
     camera height  t 0 → .3 peeking up from below, .3 → 1 rising to the centre, 1.35 → 1.6 lifting to the upper third
                    as the page flips (the lines rise in under it, like Dosedrop's pills above its lines), 1.85 → 2.4
                    rising away out of the top before the third line lands
     camera turn    t .1 → 1.85, one full circle (three-quarter view → back to it) */
const START = -0.75;
const STEPS = [0.14, 0.32, 0.72, 1.45, 1.8, 2.15, 2.5];   // 1 italic line · 2 paragraph · 3 heading leaves · 4 ivory + line 1 · 5 line 2 · 6 line 3 · 7 lights down
const HEIGHT = [[0, -7.5], [0.3, -4.6], [1, 0], [1.35, 0], [1.6, 1.1], [1.85, 1.1], [2.4, 9]];   // [t, y] pairs, blended linearly
const clamp01 = value => Math.min(1, Math.max(0, value));
// The REC badge's timecode follows the scroll (12 seconds of "footage" per screen, 24 frames a second), so
// scrolling back up rewinds it.
const timecode = document.querySelector('.camera-rec-time');
const pad = n => String(n).padStart(2, '0');
const keyframe = (frames, t) => {
  if (t <= frames[0][0]) return frames[0][1];
  for (let i = 1; i < frames.length; i++) {
    const [t1, v1] = frames[i];
    const [t0, v0] = frames[i - 1];
    if (t <= t1) return v0 + (v1 - v0) * (t - t0) / (t1 - t0);
  }
  return frames[frames.length - 1][1];
};

let target = { angle: START, y: HEIGHT[0][1] };
const shown = { ...target };
let onScreen = false;

const readScroll = () => {
  const t = Math.max(0, -section.getBoundingClientRect().top / innerHeight);
  target = {
    angle: START + clamp01((t - 0.1) / 1.75) * Math.PI * 2,
    y: keyframe(HEIGHT, t),
  };
  section.dataset.step = String(STEPS.filter(at => t >= at).length);
  const frames = Math.floor(t * 12 * 24);
  timecode.textContent = `${pad(Math.floor(frames / 86400))}:${pad(Math.floor(frames / 1440) % 60)}:${pad(Math.floor(frames / 24) % 60)}:${pad(frames % 24)}`;
};

const clock = new THREE.Clock();
const frame = () => {
  if (!onScreen) return;
  shown.angle += (target.angle - shown.angle) * 0.12;
  shown.y += (target.y - shown.y) * 0.12;
  turntable.rotation.y = shown.angle;
  // Blink like a real camera: on for 0.6s, off for 0.4s.
  const on = clock.getElapsedTime() % 1 < 0.6;
  rec.emissiveIntensity = on ? 2.6 : 0.12;
  recGlow.intensity = on ? 0.5 : 0;
  tilt.position.y = shown.y + Math.sin(clock.getElapsedTime() * 1.2) * 0.03;   // a slow breath, never dead still
  renderer.render(scene, view);
  requestAnimationFrame(frame);
};

resize();
addEventListener('resize', resize);
addEventListener('scroll', readScroll, { passive: true });
readScroll();
Object.assign(shown, target);
// Only draw while the section is on screen.
new IntersectionObserver(([entry]) => {
  onScreen = entry.isIntersecting;
  if (onScreen) {
    clock.start();
    frame();
  }
}).observe(section);
