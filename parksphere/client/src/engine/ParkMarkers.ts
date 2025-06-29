import * as THREE from 'three';
import { Park } from '@/lib/types';

export interface MarkerConfig {
  park: Park;
  color: THREE.Color;
  scale: number;
}

export class ParkMarkers {
  private instancedMesh: THREE.InstancedMesh;
  private glowMesh: THREE.InstancedMesh;
  private parkMap: Map<number, Park>;
  private markerCount: number;
  private raycaster: THREE.Raycaster;
  private hoveredIndex: number | null = null;
  private selectedIndex: number | null = null;
  private time: number = 0;
  
  constructor(parks: Park[]) {
    this.markerCount = parks.length;
    this.parkMap = new Map();
    this.raycaster = new THREE.Raycaster();
    
    this.createInstancedMeshes();
    this.updateMarkers(parks);
  }
  
  private createInstancedMeshes(): void {
    // Main marker geometry
    const markerGeometry = new THREE.ConeGeometry(0.01, 0.02, 8);
    markerGeometry.rotateX(Math.PI);
    
    // Marker material with emissive glow
    const markerMaterial = new THREE.MeshPhongMaterial({
      color: 0x00ff00,
      emissive: 0x00ff00,
      emissiveIntensity: 0.5,
      shininess: 100
    });
    
    // Create instanced mesh for markers
    this.instancedMesh = new THREE.InstancedMesh(
      markerGeometry,
      markerMaterial,
      this.markerCount
    );
    this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    
    // Glow geometry
    const glowGeometry = new THREE.SphereGeometry(0.015, 16, 8);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.3,
      depthWrite: false
    });
    
    // Create instanced mesh for glows
    this.glowMesh = new THREE.InstancedMesh(
      glowGeometry,
      glowMaterial,
      this.markerCount
    );
    this.glowMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  }
  
  public updateMarkers(parks: Park[]): void {
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    const color = new THREE.Color();
    
    parks.forEach((park, index) => {
      // Store park reference
      this.parkMap.set(index, park);
      
      // Calculate position on globe
      const phi = (90 - park.coordinates.lat) * (Math.PI / 180);
      const theta = (park.coordinates.lon + 180) * (Math.PI / 180);
      
      const radius = 1.01;
      position.set(
        -(radius * Math.sin(phi) * Math.cos(theta)),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta)
      );
      
      // Point marker outward from center
      quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        position.clone().normalize()
      );
      
      // Set scale
      scale.set(1, 1, 1);
      
      // Compose matrix
      matrix.compose(position, quaternion, scale);
      
      // Set instance matrix
      this.instancedMesh.setMatrixAt(index, matrix);
      this.glowMesh.setMatrixAt(index, matrix);
      
      // Set color based on biome
      color.setHex(this.getBiomeColor(park.biome));
      this.instancedMesh.setColorAt(index, color);
      this.glowMesh.setColorAt(index, color);
    });
    
    // Update matrices
    this.instancedMesh.instanceMatrix.needsUpdate = true;
    this.glowMesh.instanceMatrix.needsUpdate = true;
    
    if (this.instancedMesh.instanceColor) {
      this.instancedMesh.instanceColor.needsUpdate = true;
    }
    if (this.glowMesh.instanceColor) {
      this.glowMesh.instanceColor.needsUpdate = true;
    }
  }
  
  private getBiomeColor(biome: string): number {
    const biomeColors: { [key: string]: number } = {
      'Tropical Rainforest': 0x00b300,
      'Temperate Forest': 0x228b22,
      'Boreal Forest': 0x0f4d0f,
      'Desert': 0xff8c00,
      'Alpine': 0x6495ed,
      'Grassland': 0x9acd32,
      'Mediterranean': 0xdaa520,
      'Tundra': 0xb0c4de,
      'Wetland': 0x4682b4,
      'Coral Reef': 0xff1493,
      'Marine': 0x0000cd,
      'Savanna': 0xd2691e,
      'Ice Sheet': 0xadd8e6,
      'Mountain': 0x8b4513,
      'Volcanic': 0xdc143c,
      'Coastal': 0x20b2aa
    };
    
    return biomeColors[biome] || 0x00ff00;
  }
  
  public update(deltaTime: number): void {
    this.time += deltaTime;
    
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    
    for (let i = 0; i < this.markerCount; i++) {
      this.instancedMesh.getMatrixAt(i, matrix);
      matrix.decompose(position, quaternion, scale);
      
      // Floating animation
      const floatOffset = Math.sin(this.time * 2 + i * 0.5) * 0.002;
      position.y += floatOffset;
      
      // Scale animation for hovered/selected
      let targetScale = 1;
      if (i === this.selectedIndex) {
        targetScale = 1.3;
      } else if (i === this.hoveredIndex) {
        targetScale = 1.15;
      }
      
      scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
      
      // Recompose matrix
      matrix.compose(position, quaternion, scale);
      this.instancedMesh.setMatrixAt(i, matrix);
      
      // Glow pulse
      const glowScale = scale.clone();
      const pulse = Math.sin(this.time * 3 + i) * 0.1 + 0.9;
      glowScale.multiplyScalar(pulse);
      
      matrix.compose(position, quaternion, glowScale);
      this.glowMesh.setMatrixAt(i, matrix);
    }
    
    this.instancedMesh.instanceMatrix.needsUpdate = true;
    this.glowMesh.instanceMatrix.needsUpdate = true;
  }
  
  public raycast(raycaster: THREE.Raycaster): Park | null {
    const intersects = raycaster.intersectObject(this.instancedMesh);
    
    if (intersects.length > 0) {
      const instanceId = intersects[0].instanceId;
      if (instanceId !== undefined) {
        this.hoveredIndex = instanceId;
        return this.parkMap.get(instanceId) || null;
      }
    }
    
    this.hoveredIndex = null;
    return null;
  }
  
  public setSelected(parkId: number | null): void {
    if (parkId === null) {
      this.selectedIndex = null;
      return;
    }
    
    // Find park index
    const entries = Array.from(this.parkMap.entries());
    for (const [index, park] of entries) {
      if (park.id === parkId) {
        this.selectedIndex = index;
        break;
      }
    }
  }
  
  public getMeshes(): THREE.Object3D[] {
    return [this.instancedMesh, this.glowMesh];
  }
  
  public dispose(): void {
    this.instancedMesh.geometry.dispose();
    this.glowMesh.geometry.dispose();
    (this.instancedMesh.material as THREE.Material).dispose();
    (this.glowMesh.material as THREE.Material).dispose();
  }
}