# ParkSphere Developer Documentation

## 🏗️ Architecture Overview

### Frontend Architecture
- **Framework**: Next.js 14 with App Router
- **3D Engine**: Custom WebGL 2.0 engine built on Three.js
- **State Management**: React hooks and context
- **Styling**: Tailwind CSS with glassmorphism effects

### Data Architecture
- **Static Generation**: All park data pre-built at compile time
- **No Backend Required**: Fully static deployment
- **API Routes**: Only for AI mascot chat (optional)

## 🎨 Key Features Implementation

### 1. 3D Globe Rendering
Located in `components/RealisticEarthGlobe.tsx` and `src/engine/`

**Key Components**:
- Custom Earth shader with day/night textures
- GPU-instanced park markers for performance
- Smooth orbit controls with momentum
- Atmospheric scattering effects

**Performance Optimizations**:
- Frustum culling for off-screen markers
- LOD system for terrain meshes
- Texture compression and lazy loading
- Adaptive quality based on device capabilities

### 2. Terrain Rendering System
Located in `src/engine/TerrainSystem.ts`

**Features**:
- Height-based texture blending (sand → grass → rock → snow)
- Triplanar mapping for steep slopes
- Procedural fallback when real data unavailable
- 4 LOD levels (256, 128, 64, 32 segments)

**Shader Implementation**:
```glsl
// Height-based blending
float grassBlend = smoothstep(0.0, grassHeight, vHeight);
float rockBlend = smoothstep(grassHeight, rockHeight, vHeight);
float snowBlend = smoothstep(rockHeight, snowHeight, vHeight);
```

### 3. Street View Navigation
Located in `components/TerrainStreetView.tsx`

**Features**:
- First-person terrain exploration
- WASD + mouse controls
- Collision detection with terrain
- Smooth transitions from globe view
- Cloud and atmospheric effects

### 4. AI Mascot System
Located in `components/ParkMascot.tsx` and `app/api/mascot/`

**Implementation**:
- Groq LLM integration for conversational AI
- Unique personality for each park mascot
- Context-aware responses about park features
- Streaming responses for better UX

### 5. Performance Monitoring
Located in `src/engine/PerformanceOptimizer.ts`

**Metrics Tracked**:
- FPS and frame time
- Draw calls and triangle count
- GPU memory usage
- Texture memory
- Render resolution

**Adaptive Quality**:
- Automatically adjusts quality for 60 FPS
- Downgrades: shadows → SSAO → bloom → resolution
- Quality presets: ultra, high, medium, low

## 🔧 Advanced Configuration

### Engine Configuration
```typescript
const engineConfig = {
  quality: {
    shadows: true,
    ssao: true,
    bloom: true,
    antialias: 'smaa',
    textureQuality: 'high'
  },
  performance: {
    targetFPS: 60,
    adaptiveQuality: true,
    maxDrawCalls: 100,
    triangleBudget: 1_000_000
  }
};
```

### Biome Configuration
Edit `components/RealisticEarthGlobe.tsx`:
```typescript
const biomeColors = {
  'desert': { primary: '#ff8c00', secondary: '#ff6600' },
  'alpine': { primary: '#6495ed', secondary: '#4169e1' },
  // Add custom biomes...
};
```

### Trail Difficulty Colors
Edit `components/TrailVisualization.tsx`:
```typescript
const difficultyColors = {
  easy: '#4ade80',    // Green
  moderate: '#fbbf24', // Yellow
  hard: '#fb923c',    // Orange
  expert: '#ef4444'   // Red
};
```

## 🛠️ Development Workflow

### Adding New Features

1. **New Component**:
   ```bash
   # Create component file
   touch components/YourFeature.tsx
   
   # Add dynamic import in page.tsx
   const YourFeature = dynamic(() => import('@/components/YourFeature'), {
     ssr: false
   });
   ```

2. **New Park Data**:
   - Edit `scripts/data-pipeline/parks-data.json`
   - Run `npm run build:all` in scripts/
   - Add mascot SVG to `public/mascots/`

3. **New 3D Feature**:
   - Extend `src/engine/GlobeEngine.ts`
   - Add to render loop in `GlobeRenderer.ts`
   - Update performance metrics

### Performance Guidelines

1. **3D Rendering**:
   - Keep draw calls < 100
   - Use instancing for repeated geometry
   - Implement LOD for complex meshes
   - Dispose of Three.js objects properly

2. **React Components**:
   - Use dynamic imports for heavy components
   - Implement virtual scrolling for lists
   - Memoize expensive computations
   - Lazy load images with blur placeholders

3. **WebGL Best Practices**:
   - Reuse geometries and materials
   - Batch similar draw calls
   - Use texture atlases
   - Implement frustum culling

## 🐛 Debugging

### Performance Issues
1. Enable performance monitor: `/test?performance=true`
2. Check draw calls and triangle count
3. Review texture memory usage
4. Profile with Chrome DevTools

### 3D Rendering Issues
1. Check WebGL context errors
2. Verify texture loading
3. Review shader compilation
4. Test on different GPUs

### Common Errors

**"WebGL context lost"**
- Reduce quality settings
- Check GPU memory usage
- Implement context restoration

**"Texture failed to load"**
- Verify file paths
- Check CORS headers
- Review texture formats

**"Shader compilation failed"**
- Check GLSL syntax
- Verify uniform names
- Test on different browsers

## 📊 Metrics & Monitoring

### Performance Targets
- Initial Load: < 3 seconds
- Time to Interactive: < 2 seconds
- FPS: 60 (30 minimum)
- Memory Usage: < 200MB
- Bundle Size: < 1MB (gzipped)

### Monitoring Tools
- Built-in: `/test` dashboard
- Chrome DevTools Performance tab
- Three.js Inspector extension
- WebGL Inspector for shader debugging

## 🚀 Deployment

### Build Optimization
```bash
# Production build with analysis
ANALYZE=true pnpm build

# Check bundle size
pnpm analyze
```

### Environment-Specific Settings
```typescript
const config = {
  development: {
    debug: true,
    statsPanel: true,
    verboseLogging: true
  },
  production: {
    debug: false,
    statsPanel: false,
    verboseLogging: false
  }
};
```

## 📚 Resources

- [Three.js Documentation](https://threejs.org/docs/)
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber/)
- [WebGL Best Practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices)
- [Next.js Documentation](https://nextjs.org/docs)