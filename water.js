// water.js - Create water bodies in valleys using terrain raycasting
import * as THREE from "three";

export function createWater(scene, terrain) {
  // If no terrain provided, return a no-op updater
  if (!terrain) return () => {};

  // Create grid of potential water tiles
  const tileSize = 5;
  const gridSize = 120;
  const tiles = [];

  // Raycaster reused for sampling terrain heights
  const raycaster = new THREE.Raycaster();
  const down = new THREE.Vector3(0, -1, 0);

  // Helper to get terrain height at x,z using raycast
  const getTerrainHeight = (x, z) => {
    const origin = new THREE.Vector3(x, 200, z);
    raycaster.set(origin, down);
    const intersects = raycaster.intersectObject(terrain, true);
    if (intersects && intersects.length > 0) return intersects[0].point.y;
    return null;
  };

  // Determine valley candidates by sampling all grid heights and selecting the lowest percentile
  const sampleCenters = [];
  const renderTileSize = tileSize * 1.2;
  for (let x = -gridSize / 2; x < gridSize / 2; x += tileSize) {
    for (let z = -gridSize / 2; z < gridSize / 2; z += tileSize) {
      const cx = x + tileSize * 0.5;
      const cz = z + tileSize * 0.5;
      const h = getTerrainHeight(cx, cz);
      if (h !== null) sampleCenters.push({ x: cx, z: cz, h });
    }
  }

  // If no samples, bail
  if (sampleCenters.length === 0) {
    console.warn('createWater: no terrain samples available');
    return () => {};
  }

  // Compute threshold for lowest 30% (valleys)
  const heights = sampleCenters.map(s => s.h).sort((a,b) => a-b);
  const percentile = 0.30; // lowest 30%
  const threshIndex = Math.max(0, Math.floor(heights.length * percentile) - 1);
  const heightThreshold = heights[threshIndex] ?? heights[0];

  // Create water tiles for samples below threshold (70% chance per tile)
  for (let i = 0; i < sampleCenters.length; i++) {
    const s = sampleCenters[i];
    if (s.h <= heightThreshold && Math.random() < 0.7) {
      const waterGeometry = new THREE.PlaneGeometry(renderTileSize * 0.95, renderTileSize * 0.95);
      const waterMaterial = new THREE.MeshStandardMaterial({
        color: 0x1e90ff,
        metalness: 0.4,
        roughness: 0.35,
        transparent: true,
        opacity: 0.75,
        emissive: 0x0d4d99,
        emissiveIntensity: 0.25,
        side: THREE.DoubleSide,
      });

      const water = new THREE.Mesh(waterGeometry, waterMaterial);
      water.rotation.x = -Math.PI / 2; // Lay flat
      const baseY = s.h + 0.02; // slight offset to avoid z-fighting
      water.position.set(s.x, baseY, s.z);
      water.userData = { isWater: true, baseY };
      scene.add(water);
      tiles.push(water);
    }
  }
  // Log created water tiles for debugging
  console.log('createWater: water tiles created =', tiles.length);

  // Create animated wave effect (non-accumulating)
  return function updateWater() {
    const time = Date.now() * 0.001; // Time in seconds

    tiles.forEach((water, index) => {
      const baseY = water.userData.baseY;
      const bob = Math.sin(time * 1.5 + index * 0.4) * 0.08; // amplitude
      water.position.y = baseY + bob;

      // Slight color/emissive shimmer
      const shimmer = Math.sin(time * 2 + index) * 0.08;
      water.material.emissiveIntensity = 0.2 + shimmer * 0.05;
    });
  };
}
