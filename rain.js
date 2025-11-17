// rain.js
import * as THREE from "three";
//import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.module.js';

export function createRain(scene) {
  const rainCount = 15000;
  const rainGeometry = new THREE.BufferGeometry();
  const positions = [];
  const velocities = [];

  for (let i = 0; i < rainCount; i++) {
    const x = Math.random() * 400 - 200;
    const y = Math.random() * 200 + 50;
    const z = Math.random() * 400 - 200;

    positions.push(x, y, z);
    velocities.push(0, -Math.random() * 0.4 - 0.2, 0);
  }

  rainGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3)
  );
  rainGeometry.setAttribute(
    "velocity",
    new THREE.Float32BufferAttribute(velocities, 3)
  );

  const rainMaterial = new THREE.PointsMaterial({
    color: 0xaaaaaa,
    size: 0.2,
    transparent: true,
    opacity: 0.8,
  });

  const rain = new THREE.Points(rainGeometry, rainMaterial);
  scene.add(rain);

  // 🌩️ Add lightning flash setup
  const lightning = new THREE.PointLight(0xffffff, 0, 1000);
  lightning.position.set(0, 100, 0);
  scene.add(lightning);

  // Return an update function for animation loop
  return function updateRain() {
    const positions = rainGeometry.attributes.position.array;
    const velocities = rainGeometry.attributes.velocity.array;

    for (let i = 0; i < positions.length; i += 3) {
      positions[i + 1] += velocities[i + 1];

      if (positions[i + 1] < 0) {
        positions[i + 1] = 200;
      }
    }

    rainGeometry.attributes.position.needsUpdate = true;

    // ⚡ Random lightning flashes
    if (Math.random() > 0.995) {
      lightning.intensity = Math.random() * 3 + 1;
    } else {
      lightning.intensity = Math.max(0, lightning.intensity - 0.03);
    }
  };
}
