// Post-processing: ambient occlusion (High only) → tilt-shift → bloom (High only) → ACES + saturation → vignette.
// Two finishing passes are kept, with and without the tilt-shift blur, so the blur costs nothing when it is off.
import * as THREE from 'three';
import { BloomEffect, Effect as BaseEffect, EffectComposer, EffectPass, HueSaturationEffect, KernelSize, RenderPass, TiltShiftEffect, ToneMappingEffect, ToneMappingMode, VignetteEffect, type Effect } from 'postprocessing';
import { N8AOPostPass } from 'n8ao';
import type { Tier } from '../render/iso';

/** Golden-hour split tone, after tone mapping: shadows lean teal, highlights lean orange, with a touch more contrast. */
class WarmGrade extends BaseEffect {
  constructor() {
    super('WarmGrade', `void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
      vec3 c = inputColor.rgb; float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c *= mix(vec3(0.90, 1.0, 1.08), vec3(1.16, 1.02, 0.80), smoothstep(0.03, 0.5, l));
      c = mix(c, c * c * (3.0 - 2.0 * c), 0.08);
      outputColor = vec4(c, inputColor.a);
    }`);
  }
}

export class Post {
  readonly composer: EffectComposer;
  private tilt: TiltShiftEffect; private withTilt: EffectPass; private plain: EffectPass;
  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera, readonly high: boolean) {
    this.composer = new EffectComposer(renderer, { frameBufferType: THREE.HalfFloatType, multisampling: high ? 4 : 2 });
    this.composer.addPass(new RenderPass(scene, camera));
    if (high) {
      const ao = new N8AOPostPass(scene, camera);
      ao.configuration.aoRadius = 7; ao.configuration.distanceFalloff = 1; ao.configuration.intensity = 2.6;
      ao.configuration.halfRes = true; ao.configuration.color = new THREE.Color('#1c2a3a');
      ao.setQualityMode('Low');
      this.composer.addPass(ao as never);
    }
    const grade = (): Effect[] => [
      ...(high ? [new BloomEffect({ luminanceThreshold: 0.86, luminanceSmoothing: 0.12, mipmapBlur: true, intensity: 0.45, radius: 0.7 })] : []),
      new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC }),
      new WarmGrade(),
      new HueSaturationEffect({ saturation: 0.1 }),
      new VignetteEffect({ offset: 0.3, darkness: 0.22 }),
    ];
    this.tilt = new TiltShiftEffect({ focusArea: 0.56, feather: 0.36, kernelSize: KernelSize.SMALL, resolutionScale: 0.5 });
    this.withTilt = new EffectPass(camera, this.tilt, ...grade());
    this.plain = new EffectPass(camera, ...grade()); this.plain.enabled = false;
    this.composer.addPass(this.withTilt); this.composer.addPass(this.plain);
  }
  /** Blur the top and bottom of the screen: stronger when zoomed out, off while a place is selected. */
  setTilt(on: boolean, tier: Tier, portrait = false) {
    this.withTilt.enabled = this.withTilt.renderToScreen = on; this.plain.enabled = this.plain.renderToScreen = !on; // exactly one of the two draws to the screen
    // a tall phone screen shows far more ground above and below the band, so the band is wider there
    this.tilt.focusArea = (tier === 'campus' ? 0.66 : tier === 'area' ? 0.7 : 0.78) + (portrait ? 0.16 : 0);
    this.tilt.blurPass.kernelSize = tier === 'campus' ? KernelSize.MEDIUM : tier === 'area' ? KernelSize.SMALL : KernelSize.VERY_SMALL;
  }
  setSize(w: number, h: number) { this.composer.setSize(w, h, false); }
  render() { this.composer.render(); }
  dispose() { this.composer.dispose(); }
}
