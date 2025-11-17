import { createRain } from "./rain.js";
import { createPlayer, updatePlayer } from "./player.js";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { createNoise2D } from "simplex-noise";

let scene, camera, renderer, controls;
let updateRain = null;
let player;
let cameraGroup;

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

  window.addEventListener("resize", onWindowResize);
}

async function generateWorld() {
  // Clear scene (except camera and lights)
  while (scene.children.length > 0) {
    scene.remove(scene.children[0]);
  }

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

  // Rain system
  updateRain = createRain(scene);

  //player
  player = await createPlayer(scene);
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

  // Camera offset (behind the player)
  const desiredPosition = player.position.clone()
    .add(forward.clone().multiplyScalar(10)) // 10 units behind
    .add(new THREE.Vector3(0, 10, 0));          // 6 units above

  // Smooth camera follow
  camera.position.lerp(desiredPosition, 0.12);

  // Always look at the player
  camera.lookAt(player.position);
}


function animate() {
  requestAnimationFrame(animate);

  // Update rain each frame
  if (updateRain) updateRain();
  if (player) updatePlayer(player, camera);
  updateCameraFollow();
  controls.update();
  renderer.render(scene, camera);
}
