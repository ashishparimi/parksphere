import * as THREE from 'three';

export class GodRaysEffect {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private sunLight: THREE.DirectionalLight;
  
  private occlusionRenderTarget: THREE.WebGLRenderTarget;
  private godRaysMaterial: THREE.ShaderMaterial;
  
  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    sunLight: THREE.DirectionalLight
  ) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.sunLight = sunLight;
    
    this.setupOcclusionRendering();
    this.createGodRaysMaterial();
  }
  
  private setupOcclusionRendering(): void {
    // Create render target for occlusion
    this.occlusionRenderTarget = new THREE.WebGLRenderTarget(
      window.innerWidth / 2,
      window.innerHeight / 2
    );
    
    // We'll use a simple black/white material for occlusion
    // This is implemented in the main render pass
  }
  
  private createGodRaysMaterial(): void {
    this.godRaysMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        lightPosition: { value: new THREE.Vector2(0.5, 0.5) },
        exposure: { value: 0.3 },
        decay: { value: 0.96 },
        density: { value: 0.8 },
        weight: { value: 0.5 },
        samples: { value: 100 }
      },
      vertexShader: `
        varying vec2 vUv;
        
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform vec2 lightPosition;
        uniform float exposure;
        uniform float decay;
        uniform float density;
        uniform float weight;
        uniform int samples;
        
        varying vec2 vUv;
        
        const int MAX_SAMPLES = 100;
        
        void main() {
          vec2 texCoord = vUv;
          vec2 deltaTextCoord = texCoord - lightPosition;
          deltaTextCoord *= 1.0 / float(samples) * density;
          
          vec3 color = texture2D(tDiffuse, texCoord).rgb;
          float illuminationDecay = 1.0;
          
          for(int i = 0; i < MAX_SAMPLES; i++) {
            if(i >= samples) break;
            
            texCoord -= deltaTextCoord;
            vec3 sampleColor = texture2D(tDiffuse, texCoord).rgb;
            sampleColor *= illuminationDecay * weight;
            color += sampleColor;
            illuminationDecay *= decay;
          }
          
          gl_FragColor = vec4(color * exposure, 1.0);
        }
      `
    });
  }
  
  public update(): void {
    // Update light screen position
    const lightScreenPos = this.getLightScreenPosition();
    this.godRaysMaterial.uniforms.lightPosition.value.copy(lightScreenPos);
  }
  
  private getLightScreenPosition(): THREE.Vector2 {
    const vector = new THREE.Vector3();
    vector.copy(this.sunLight.position);
    vector.project(this.camera);
    
    return new THREE.Vector2(
      (vector.x + 1) / 2,
      (vector.y + 1) / 2
    );
  }
  
  public getMaterial(): THREE.ShaderMaterial {
    return this.godRaysMaterial;
  }
  
  public dispose(): void {
    this.occlusionRenderTarget.dispose();
    this.godRaysMaterial.dispose();
  }
}