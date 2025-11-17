// rain.js
import * as THREE from "three";
import { createNoise2D } from "simplex-noise";

export function createRain(scene, terrain = null) {
  const rainCount = 15000;
  const rainGeometry = new THREE.BufferGeometry();
  const positions = [];
  const velocities = [];
  const spawnChance = 0.6; // 60% spawn rate
  const noise2D = createNoise2D();

  // Helper function to get terrain height at x, z
  const getTerrainHeight = (x, z) => {
    if (!terrain) return 0;
    const height = noise2D(x / 25, z / 25) * 8;
    return height;
  };

  for (let i = 0; i < rainCount; i++) {
    const x = Math.random() * 400 - 200;
    const z = Math.random() * 400 - 200;
    
    // Get the terrain height at this x, z position
    const terrainHeight = getTerrainHeight(x, z);
    
    // Only spawn rain on 60% of positions, preferring valleys (lower elevations)
    // Lower terrain = more likely to spawn rain
    const elevationBias = Math.max(0, 1 - (terrainHeight / 8)); // normalize to 0-1
    const shouldSpawn = Math.random() < (spawnChance * elevationBias);
    
    if (shouldSpawn) {
      const y = terrainHeight + Math.random() * 50 + 20; // spawn above terrain
      positions.push(x, y, z);
      velocities.push(0, -Math.random() * 0.4 - 0.2, 0);
    } else {
      // Hide droplets that don't spawn
      positions.push(0, 500, 0);
      velocities.push(0, 0, 0);
    }
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
    color: 0x4488ff,
    size: 0.25,
    transparent: true,
    opacity: 0.7,
  });

  const rain = new THREE.Points(rainGeometry, rainMaterial);
  scene.add(rain);

  // 🌩️ Add global ambient light that will brighten during lightning
  const ambientLightForStorm = new THREE.AmbientLight(0xffffff, 0);
  scene.add(ambientLightForStorm);

  // Create multiple random lightning bolts across the entire map
  const lightningBolts = [];
  const maxBolts = 2; // Max simultaneous bolts (was 5)

  const createRandomBolt = () => {
    // Random strike location across entire map
    const strikePosX = Math.random() * 400 - 200;
    const strikePosZ = Math.random() * 400 - 200;
    const strikeHeight = 200 + Math.random() * 100;

    // Create point light at strike location
    const light = new THREE.PointLight(0xffffff, 0, 3000);
    light.position.set(strikePosX, strikeHeight, strikePosZ);
    scene.add(light);

    // Create visual bolt line
    const boltGeometry = new THREE.BufferGeometry();
    const boltPositions = new Float32Array(6);
    boltPositions[0] = strikePosX;
    boltPositions[1] = strikeHeight;
    boltPositions[2] = strikePosZ;
    boltPositions[3] = strikePosX + (Math.random() - 0.5) * 40;
    boltPositions[4] = 0;
    boltPositions[5] = strikePosZ + (Math.random() - 0.5) * 40;

    boltGeometry.setAttribute('position', new THREE.BufferAttribute(boltPositions, 3));

    const boltMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      linewidth: 4,
      transparent: true,
      opacity: 0
    });

    const bolt = new THREE.Line(boltGeometry, boltMaterial);
    scene.add(bolt);

    return {
      light: light,
      bolt: bolt,
      geometry: boltGeometry,
      material: boltMaterial,
      age: 0,
      duration: 0.2 + Math.random() * 0.1, // 200-300ms flash duration
      intensity: (5 + Math.random() * 15) // 5-20 intensity (much wider range for variance)
    };
  };

  // Return an update function for animation loop
  return function updateRain() {
    const positions = rainGeometry.attributes.position.array;
    const velocities = rainGeometry.attributes.velocity.array;

    for (let i = 0; i < positions.length; i += 3) {
      positions[i + 1] += velocities[i + 1];

      // Respawn rain at top when it falls below terrain
      if (positions[i + 1] < 0) {
        const newX = Math.random() * 400 - 200;
        const newZ = Math.random() * 400 - 200;
        const terrainHeight = getTerrainHeight(newX, newZ);

        // randomly decide if this droplet should respawn or stay hidden
        const elevationBias = Math.max(0, 1 - (terrainHeight / 8));
        if (Math.random() < (spawnChance * elevationBias)) {
          positions[i] = newX;
          positions[i + 1] = terrainHeight + Math.random() * 50 + 20;
          positions[i + 2] = newZ;
        } else {
          positions[i + 1] = 500; // hide it
        }
      }
    }

    rainGeometry.attributes.position.needsUpdate = true;

    // ⚡ Random lightning strikes across the map
    // Much rarer - only 0.3% chance per frame (~20 seconds between strikes)
    if (Math.random() > 0.997 && lightningBolts.length < maxBolts) {
      lightningBolts.push(createRandomBolt());
    }

    // Update existing lightning bolts
    let totalLightIntensity = 0;
    let maxOpacity = 0;

    lightningBolts.forEach((strike, index) => {
      strike.age += 0.016; // ~60fps delta time

      if (strike.age < strike.duration) {
        // Lightning is active - fade in then out
        let progress = strike.age / strike.duration;
        let opacity;

        if (progress < 0.3) {
          // Quick bright flash
          opacity = (progress / 0.3); // fade in
        } else {
          // Fade out
          opacity = 1 - ((progress - 0.3) / 0.7);
        }

        strike.light.intensity = strike.intensity * opacity;
        strike.material.opacity = opacity;
        totalLightIntensity += strike.light.intensity;
        maxOpacity = Math.max(maxOpacity, opacity);
      } else {
        // Lightning finished - remove it
        scene.remove(strike.light);
        scene.remove(strike.bolt);
        lightningBolts.splice(index, 1);
      }
    });

    // Brighten ambient light during lightning for realistic illumination
    ambientLightForStorm.intensity = maxOpacity * 0.8; // max 80% ambient boost
  };
}
