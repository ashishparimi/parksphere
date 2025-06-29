import * as THREE from 'three';

export interface PerformanceReport {
  fps: number;
  frameTime: number;
  drawCalls: number;
  triangles: number;
  points: number;
  lines: number;
  geometries: number;
  textures: number;
  shaders: number;
  memoryUsage: {
    geometries: number;
    textures: number;
    total: number;
  };
  gpuTime?: number;
  cpuTime?: number;
}

export class PerformanceMonitor {
  private renderer: THREE.WebGLRenderer;
  private frameCount: number = 0;
  private lastTime: number = performance.now();
  private fps: number = 0;
  private frameTimeHistory: number[] = [];
  private maxHistorySize: number = 120;
  
  // Performance thresholds
  private readonly FPS_TARGET = 60;
  private readonly FRAME_TIME_TARGET = 16.67;
  private readonly DRAW_CALL_WARNING = 100;
  private readonly TRIANGLE_WARNING = 1000000;
  
  constructor(renderer: THREE.WebGLRenderer) {
    this.renderer = renderer;
  }
  
  public beginFrame(): number {
    return performance.now();
  }
  
  public endFrame(startTime: number): void {
    const endTime = performance.now();
    const frameTime = endTime - startTime;
    
    // Update frame time history
    this.frameTimeHistory.push(frameTime);
    if (this.frameTimeHistory.length > this.maxHistorySize) {
      this.frameTimeHistory.shift();
    }
    
    // Update FPS counter
    this.frameCount++;
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastTime;
    
    if (deltaTime >= 1000) {
      this.fps = (this.frameCount * 1000) / deltaTime;
      this.frameCount = 0;
      this.lastTime = currentTime;
    }
  }
  
  public getReport(): PerformanceReport {
    const info = this.renderer.info;
    
    // Calculate average frame time
    const avgFrameTime = this.frameTimeHistory.length > 0
      ? this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length
      : 0;
    
    // Memory usage
    const memoryUsage = {
      geometries: info.memory.geometries * 0.000001, // Convert to MB
      textures: info.memory.textures * 0.000001,
      total: (info.memory.geometries + info.memory.textures) * 0.000001
    };
    
    return {
      fps: this.fps,
      frameTime: avgFrameTime,
      drawCalls: info.render.calls,
      triangles: info.render.triangles,
      points: info.render.points,
      lines: info.render.lines,
      geometries: info.memory.geometries,
      textures: info.memory.textures,
      shaders: info.programs?.length || 0,
      memoryUsage
    };
  }
  
  public getPerformanceScore(): {
    overall: number;
    fps: number;
    drawCalls: number;
    triangles: number;
    memory: number;
  } {
    const report = this.getReport();
    
    // FPS score (0-100)
    const fpsScore = Math.min(100, (report.fps / this.FPS_TARGET) * 100);
    
    // Draw calls score (100 = < 50 calls, 0 = > 200 calls)
    const drawCallScore = Math.max(0, Math.min(100, 
      100 - ((report.drawCalls - 50) / 150) * 100
    ));
    
    // Triangles score (100 = < 500k, 0 = > 2M)
    const triangleScore = Math.max(0, Math.min(100,
      100 - ((report.triangles - 500000) / 1500000) * 100
    ));
    
    // Memory score (100 = < 100MB, 0 = > 500MB)
    const memoryScore = Math.max(0, Math.min(100,
      100 - ((report.memoryUsage.total - 100) / 400) * 100
    ));
    
    // Overall score (weighted average)
    const overall = (fpsScore * 0.4) + (drawCallScore * 0.3) + 
                   (triangleScore * 0.2) + (memoryScore * 0.1);
    
    return {
      overall: Math.round(overall),
      fps: Math.round(fpsScore),
      drawCalls: Math.round(drawCallScore),
      triangles: Math.round(triangleScore),
      memory: Math.round(memoryScore)
    };
  }
  
  public getOptimizationSuggestions(): string[] {
    const report = this.getReport();
    const suggestions: string[] = [];
    
    // FPS suggestions
    if (report.fps < this.FPS_TARGET * 0.9) {
      suggestions.push(`FPS is ${report.fps.toFixed(1)}, below target of ${this.FPS_TARGET}`);
      
      if (report.drawCalls > this.DRAW_CALL_WARNING) {
        suggestions.push(`Reduce draw calls (currently ${report.drawCalls})`);
      }
      
      if (report.triangles > this.TRIANGLE_WARNING) {
        suggestions.push(`Reduce triangle count (currently ${(report.triangles / 1000000).toFixed(1)}M)`);
      }
    }
    
    // Draw call suggestions
    if (report.drawCalls > this.DRAW_CALL_WARNING) {
      suggestions.push('Consider using instancing or batching for similar objects');
    }
    
    // Memory suggestions
    if (report.memoryUsage.total > 200) {
      suggestions.push(`High memory usage (${report.memoryUsage.total.toFixed(1)}MB)`);
      
      if (report.memoryUsage.textures > report.memoryUsage.geometries) {
        suggestions.push('Consider reducing texture sizes or using compression');
      } else {
        suggestions.push('Consider optimizing geometry or using LOD');
      }
    }
    
    // Shader suggestions
    if (report.shaders > 50) {
      suggestions.push(`Many shader programs (${report.shaders}), consider shader reuse`);
    }
    
    return suggestions;
  }
  
  public createDebugPanel(): HTMLDivElement {
    const panel = document.createElement('div');
    panel.id = 'performance-monitor';
    panel.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 10px;
      font-family: monospace;
      font-size: 12px;
      border-radius: 5px;
      min-width: 200px;
      z-index: 1000;
    `;
    
    this.updateDebugPanel(panel);
    return panel;
  }
  
  public updateDebugPanel(panel: HTMLDivElement): void {
    const report = this.getReport();
    const score = this.getPerformanceScore();
    
    const getColorForScore = (score: number): string => {
      if (score >= 80) return '#0f0';
      if (score >= 60) return '#ff0';
      if (score >= 40) return '#f80';
      return '#f00';
    };
    
    panel.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 5px;">Performance Monitor</div>
      <div style="color: ${getColorForScore(score.overall)}">Score: ${score.overall}/100</div>
      <hr style="margin: 5px 0; opacity: 0.3;">
      <div>FPS: <span style="color: ${getColorForScore(score.fps)}">${report.fps.toFixed(1)}</span></div>
      <div>Frame: ${report.frameTime.toFixed(2)}ms</div>
      <div>Draw Calls: <span style="color: ${getColorForScore(score.drawCalls)}">${report.drawCalls}</span></div>
      <div>Triangles: ${(report.triangles / 1000).toFixed(0)}K</div>
      <div>Memory: ${report.memoryUsage.total.toFixed(1)}MB</div>
      <hr style="margin: 5px 0; opacity: 0.3;">
      <div style="font-size: 10px;">
        Geo: ${report.geometries} | Tex: ${report.textures} | Shaders: ${report.shaders}
      </div>
    `;
  }
  
  public logPerformanceReport(): void {
    const report = this.getReport();
    const score = this.getPerformanceScore();
    const suggestions = this.getOptimizationSuggestions();
    
    console.group('🎮 Performance Report');
    console.log('Overall Score:', score.overall + '/100');
    console.table({
      'FPS': { value: report.fps.toFixed(1), score: score.fps },
      'Frame Time': { value: report.frameTime.toFixed(2) + 'ms', target: '16.67ms' },
      'Draw Calls': { value: report.drawCalls, score: score.drawCalls },
      'Triangles': { value: (report.triangles / 1000000).toFixed(2) + 'M', score: score.triangles },
      'Memory': { value: report.memoryUsage.total.toFixed(1) + 'MB', score: score.memory }
    });
    
    if (suggestions.length > 0) {
      console.group('💡 Optimization Suggestions');
      suggestions.forEach(s => console.warn(s));
      console.groupEnd();
    }
    
    console.groupEnd();
  }
}