// player.js (or wherever you load your model)
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';


const keys = {
  ArrowUp : false,
  ArrowDown : false,
  ArrowLeft : false,
  ArrowRight : false
};

export async function createPlayer(scene, terrain = null) {
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

  // store speed and initial physics state; attach terrain reference if provided
  player.userData = { speed: 0.3, velocityY: 0, isGrounded: true, terrain: terrain };
  player.position.set(0, 3, 0);
  scene.add(player);

  // create a small debug overlay so gravity/velocity are visible
  const debugEl = document.createElement('div');
  debugEl.style.position = 'fixed';
  debugEl.style.right = '10px';
  debugEl.style.top = '10px';
  debugEl.style.background = 'rgba(0,0,0,0.6)';
  debugEl.style.color = '#0f0';
  debugEl.style.padding = '6px 8px';
  debugEl.style.fontFamily = 'monospace';
  debugEl.style.fontSize = '12px';
  debugEl.style.whiteSpace = 'pre';
  debugEl.innerText = '';
  document.body.appendChild(debugEl);
  player.userData.debugEl = debugEl;

  window.addEventListener('keydown', (e) => (keys[e.key] = true));
  window.addEventListener('keyup', (e) => (keys[e.key] = false));

  return player;
}

let targetRotationY = null; // <== Smooth rotation target

export function updatePlayer(player, camera, delta = 1/60) {
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
  // ensure physics properties exist so math doesn't produce NaN
  if (!player.userData) player.userData = {};
  if (typeof player.userData.velocityY !== 'number') player.userData.velocityY = 0;
  if (typeof player.userData.isGrounded !== 'boolean') player.userData.isGrounded = true;

  // stronger, realistic-feeling gravity (units per second^2)
  const gravityAccel = -30.0; // tweak this to taste (more negative = stronger gravity)
  const terminalVelocity = -80.0;

  // default fallback ground if terrain not available
  let groundHeight = 0.5;

  // If a terrain mesh was provided, raycast downward from above the player to find height
  const terrain = player.userData.terrain;
  if (terrain) {
    const rayOrigin = player.position.clone();
    rayOrigin.y += 50; // cast from well above
    const rayDir = new THREE.Vector3(0, -1, 0);
    // reuse a Raycaster per frame is ideal but acceptable here
    const raycaster = new THREE.Raycaster(rayOrigin, rayDir);
    const intersects = raycaster.intersectObject(terrain, true);
    if (intersects && intersects.length > 0) {
      groundHeight = intersects[0].point.y + 0.9; // offset so player stands above surface
    }
  }

  // Jump: support both "Space" and literal space key depending on how key was recorded
  if ((keys[' '] || keys['Space']) && player.userData.isGrounded) {
    player.userData.velocityY = 8.0; // initial jump velocity (units/sec)
    player.userData.isGrounded = false;
    player.userData.justJumped = true;
  }

  // Apply gravity (frame-rate independent)
  player.userData.velocityY += gravityAccel * delta;
  // clamp terminal velocity
  if (player.userData.velocityY < terminalVelocity) player.userData.velocityY = terminalVelocity;
  // integrate position (units per second -> scaled by delta)
  player.position.y += player.userData.velocityY * delta;

  // Ground collision - clamp and reset velocity only when falling or invalid
  if (player.position.y <= groundHeight || !Number.isFinite(player.position.y)) {
    const wasAirborne = !player.userData.isGrounded;
    player.position.y = groundHeight;
    player.userData.velocityY = 0;
    player.userData.isGrounded = true;
    if (wasAirborne) {
      player.userData.justLanded = true;
    }
  }
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

  // Add head bob animation when moving (makes character feel alive)
  const isMoving = keys.ArrowUp || keys.ArrowDown || keys.ArrowLeft || keys.ArrowRight;
  if (isMoving && player.userData.isGrounded) {
    const bobAmount = Math.sin(Date.now() * 0.008) * 0.3;
    player.position.y += bobAmount * 0.1;
  }

  // update debug overlay if present
  if (player.userData.debugEl) {
    player.userData.debugEl.innerText = `y: ${player.position.y.toFixed(2)}\nvy: ${player.userData.velocityY.toFixed(2)}\ngrounded: ${player.userData.isGrounded}`;
  }

  // clear one-frame flags
  player.userData.justJumped = false;
  player.userData.justLanded = false;
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
