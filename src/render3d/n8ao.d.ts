declare module 'n8ao' {
  import type { Camera, Scene } from 'three';
  export class N8AOPostPass {
    constructor(scene: Scene, camera: Camera, width?: number, height?: number);
    configuration: Record<string, unknown> & { aoRadius: number; distanceFalloff: number; intensity: number; halfRes: boolean; color: unknown };
    enabled: boolean;
    setQualityMode(mode: 'Performance' | 'Low' | 'Medium' | 'High' | 'Ultra'): void;
    setSize(width: number, height: number): void;
  }
}
