// player.js (or wherever you load your model)
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';


const keys = {
  ArrowUp : false,
  ArrowDown : false,
  ArrowLeft : false,
  ArrowRight : false
};

export async function createPlayer(scene) {
  const loader = new GLTFLoader();

  // Load a model (you can replace this URL with your own .glb)
  const url = './models/bone.glb'; // Put your model in /public/models/player.glb
  let player;

  try {
    const gltf = await loader.loadAsync(url);
    player = gltf.scene;
    player.scale.set(1.5, 1.5, 1.5);
  } catch (err) {
    console.warn('Model not found, using placeholder cube.');
    const geometry = new THREE.BoxGeometry(2, 4, 2);
    const material = new THREE.MeshStandardMaterial({ color: 0x0077ff });
    player = new THREE.Mesh(geometry, material);
  }

  player.userData = { speed: 0.6 };
  player.position.set(0, 3, 0);
  scene.add(player);

  window.addEventListener('keydown', (e) => (keys[e.key] = true));
  window.addEventListener('keyup', (e) => (keys[e.key] = false));

  return player;
}

let targetRotationY = null; // <== Smooth rotation target

export function updatePlayer(player, camera) {
  if (!player || !player.userData) return;

  const speed = player.userData.speed;
  const rotationSpeed = 0.5;

  // Rotate with Left/Right keys manually
  if (keys.ArrowLeft) targetRotationY = player.rotation.y + rotationSpeed;
  if (keys.ArrowRight) targetRotationY = player.rotation.y - rotationSpeed;

  // Smooth rotate toward target angle
  if (targetRotationY !== null) {
    player.rotation.y = THREE.MathUtils.lerp(player.rotation.y, targetRotationY, 0.15);

    // Stop when close enough
    if (Math.abs(player.rotation.y - targetRotationY) < 0.01) {
      player.rotation.y = targetRotationY;
      targetRotationY = null;
    }
  }

  // Forward direction vector
  const forward = new THREE.Vector3(
    Math.sin(player.rotation.y),
    0,
    Math.cos(player.rotation.y)
  );

  if (keys.ArrowUp) {
    player.position.addScaledVector(forward, speed);
  }

  // Smooth rotate 180° + move
  if (keys.ArrowDown) {
    if (targetRotationY === null) {
      targetRotationY = player.rotation.y + Math.PI; // Set rotation target
    }

    // Move only slightly to feel responsive
    player.position.addScaledVector(forward, speed * 0.6);
  }
  const gravity = -0.008;
  const groundHeight = 0.5;

  if (keys[" "] && player.userData.isGrounded) {
    player.userData.velocityY = 0.18; // jump strength
    player.userData.isGrounded = false;
  }

  // player.userData.velocityY += gravity;
  // player.position.y += player.userData.velocityY;

  // if (player.position.y <= groundHeight) {
  //   player.position.y = groundHeight;
  //   player.userData.velocityY = 0;
  //   player.userData.isGrounded = true;
  // }
  // // Camera follow
  // const camOffset = new THREE.Vector3(0, 8, 15);
  // const camPos = player.position.clone()
  //   .add(
  //     new THREE.Vector3(
  //       -Math.sin(player.rotation.y) * camOffset.z,
  //       camOffset.y,
  //       -Math.cos(player.rotation.y) * camOffset.z
  //     )
  //   );

  //camera.position.lerp(camPos, 0.1);
  camera.lookAt(player.position);
}



// export function updatePlayer(player, camera) {
//   if (!player || !player.userData) return; 

//   const speed = player.userData.speed;
//   const move = new THREE.Vector3();

//   const direction = player.userData.direction;

//   // Reset direction
//   direction.set(0, 0, 0);

//   // Get the camera's forward and right vectors
//   const forward = new THREE.Vector3();
//   camera.getWorldDirection(forward);
//   forward.y = 0; // Keep movement horizontal
//   forward.normalize();

//   const right = new THREE.Vector3();
//   right.crossVectors(forward, camera.up).normalize();

//   // Apply input relative to camera orientation
//   if (keys.ArrowUp) direction.add(forward);
//   if (keys.ArrowDown) direction.sub(forward);
//   if (keys.ArrowLeft) direction.sub(right);
//   if (keys.ArrowRight) direction.add(right);

//   // Normalize and move
//   if (direction.length() > 0) {
//     direction.normalize();
//     player.position.addScaledVector(direction, speed);
//   }

//   // Walking animation (bobbing)
//   player.position.y = 2 + Math.sin(Date.now() * 0.01) * (keys.ArrowUp || keys.ArrowDown ? 0.2 : 0);
// }
