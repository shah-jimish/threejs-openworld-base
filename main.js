import { createRain } from "./rain.js";
import { createPlayer, updatePlayer } from "./player.js";
import { createWater } from "./water.js";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { createNoise2D } from "simplex-noise";

let scene, camera, renderer, controls;
let updateRain = null;
let updateWater = null;
let player;
let cameraGroup;
const clock = new THREE.Clock();
let userInteracting = false;
let lastInteractionTime = 0;
const interactionReturnDelay = 700; // ms to wait after interaction ends before camera recenters on player

init();
generateWorld();
animate();

document.getElementById("generateBtn").addEventListener("click", generateWorld);

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a0a);

  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );

  cameraGroup = new THREE.Group();
  cameraGroup.add(camera);
  scene.add(cameraGroup);

  camera.position.set(0, 20, 40);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  // Mouse-only: allow rotation around target, disable zoom and pan
  controls.enableZoom = false;
  controls.enablePan = false;

  window.addEventListener("resize", onWindowResize);
  // Track pointer interactions to allow temporary manual viewing around player
  renderer.domElement.addEventListener('pointerdown', () => { userInteracting = true; });
  window.addEventListener('pointerup', () => { userInteracting = false; lastInteractionTime = Date.now(); });
}

async function generateWorld() {
  // Clear scene but keep the cameraGroup (don't remove camera)
  const toRemove = scene.children.filter(c => c !== cameraGroup);
  toRemove.forEach(c => scene.remove(c));

  // Terrain
  const noise2D = createNoise2D();
  const geometry = new THREE.PlaneGeometry(120, 120, 200, 200);

  for (let i = 0; i < geometry.attributes.position.count; i++) {
    const x = geometry.attributes.position.getX(i);
    const y = geometry.attributes.position.getY(i);
    const height = noise2D(x / 25, y / 25) * 8;
    geometry.attributes.position.setZ(i, height);
  }

  geometry.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({
    color: 0x228b22,
    flatShading: true,
  });

  const terrain = new THREE.Mesh(geometry, material);
  terrain.rotation.x = -Math.PI / 2;
  scene.add(terrain);

  // Lights
  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  const directional = new THREE.DirectionalLight(0xffffff, 0.8);
  directional.position.set(50, 100, 50);
  scene.add(ambient, directional);

  // Rain system — pass terrain so it can sample elevation
  updateRain = createRain(scene, terrain);

  // Water system — creates water in valleys (pass terrain so water matches terrain)
  updateWater = createWater(scene, terrain);

  // player — pass terrain so player code can sample heights
  player = await createPlayer(scene, terrain);
  // Ensure controls target follows the player and position camera behind player initially
  if (player) {
    controls.target.copy(player.position);
    updateCameraFollow();
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

export function updateCameraFollow() {
  if (!player) return;

  // Get player forward direction
  const forward = new THREE.Vector3(0, 0, -1);
  forward.applyQuaternion(player.quaternion).normalize();

  // Camera offset (further back and higher for better third-person view)
  const desiredPosition = player.position.clone()
    .add(forward.clone().multiplyScalar(18)) // 18 units behind (was 10)
    .add(new THREE.Vector3(0, 14, 0));          // 14 units above (was 10)

  // Smooth camera follow with lerp (lower value = smoother)
  camera.position.lerp(desiredPosition, 0.08);

  // Look slightly ahead of the player for more dynamic feel
  const lookTarget = player.position.clone().add(forward.clone().multiplyScalar(3));
  camera.lookAt(lookTarget);
}


function animate() {
  requestAnimationFrame(animate);

  // Update rain each frame
  if (updateRain) updateRain();
  if (updateWater) updateWater();
  const delta = clock.getDelta();
  if (player) updatePlayer(player, camera, delta);
  // If user is actively interacting with mouse, don't force camera follow.
  const timeSinceInteract = Date.now() - lastInteractionTime;
  if (!userInteracting && timeSinceInteract > interactionReturnDelay) {
    updateCameraFollow();
    // make sure controls are focused on player position
    if (player) controls.target.copy(player.position);
  } else {
    // while interacting, still ensure target follows player so rotation is around player
    if (player) controls.target.copy(player.position);
  }
  controls.update();
  renderer.render(scene, camera);
}
