// Shared limited palette. Ground is drawn straight from these colours; sprites are snapped to them.
export const C = {
  outline: '#16382A', pine: '#0F4D32', pineDark: '#1E5B3A', pineMid: '#2E6E43', pineLight: '#3E8A4E',
  grassDark: '#4E9655', grass: '#57A05C', grassLight: '#68AD62', lawn: '#7DBB6A', lawnLight: '#8FC676', meadow: '#A8D08A',
  road: '#5E6872', roadEdge: '#9AA3AB', roadLine: '#E4DAC4', service: '#6E7781', track: '#CDBF9F', trackDark: '#B5A47F',
  path: '#E4DAC4', pathEdge: '#CDBF9F', plaza: '#DED3BB', plazaDark: '#CDBF9F', parking: '#8E979F', parkingLine: '#E4DAC4',
  water: '#2C7DA0', waterDeep: '#1F5F78', waterLight: '#3E95B8', waterGlint: '#A6DCEA',
  court: '#2F8A6A', courtLine: '#F4F2EA', courtKey: '#3E6FB8', courtRed: '#B5463A', ground: '#57A05C', groundStripe: '#68AD62',
  garden: '#7DBB6A', flower: '#E2B05A', earth: '#A8784E',
  mist: '#DCE6E4', mist2: '#C9D8D6', mist3: '#B7CBC8', sky: '#E8EFEE',
  accent: '#FFD23F', ink: '#101418', white: '#FFFFFF',
  wall: '#F1EBDC', stone: '#A8784E', stoneDark: '#7A5536', glass: '#3E95B8', glassDark: '#1F5F78', window: '#2A3A48',
};

export const PALETTE_HEX = Array.from(new Set([
  ...Object.values(C),
  '#F4F2EA', '#E4DAC4', '#CDBF9F', '#EDCDA6', '#D9A97C', '#4E3626', '#4B525A', '#77808A', '#C3C9CD', '#2A2F35',
  '#6CB8D2', '#2F8A8A', '#5FB7B0', '#D3705A', '#FF8A3D', '#57A05C', '#3E8A4E', '#2E6E43', '#A8D08A', '#E9DCC0', '#D9D4C8',
  '#C9B48A', '#D7CFBE', '#BFB49C', '#8A939B', '#626B74', '#3B424A', '#356E44', '#4C7A55', '#BCD9B0', '#E0D0B0',
]));
export const PALETTE: [number, number, number][] = PALETTE_HEX.map(h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);

export function hexToRgb(h: string): [number, number, number] {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}
export function rgbToHex(r: number, g: number, b: number) {
  return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}
export function shade(hex: string, f: number) {
  const [r, g, b] = hexToRgb(hex);
  return f >= 1 ? rgbToHex(r + (255 - r) * (f - 1), g + (255 - g) * (f - 1), b + (255 - b) * (f - 1)) : rgbToHex(r * f, g * f, b * f);
}

// 15-bit LUT: rgb555 -> nearest palette rgb (computed lazily, perceptual-ish weights).
let LUT: Uint32Array | null = null;
function lut() {
  if (LUT) return LUT;
  LUT = new Uint32Array(32768);
  for (let i = 0; i < 32768; i++) {
    const r = ((i >> 10) & 31) * 8.226, g = ((i >> 5) & 31) * 8.226, b = (i & 31) * 8.226;
    let best = 0, bd = Infinity;
    for (let j = 0; j < PALETTE.length; j++) {
      const p = PALETTE[j]; const d = 2 * (r - p[0]) ** 2 + 4 * (g - p[1]) ** 2 + 3 * (b - p[2]) ** 2;
      if (d < bd) { bd = d; best = j; }
    }
    const p = PALETTE[best]; LUT[i] = (p[0] << 16) | (p[1] << 8) | p[2];
  }
  return LUT;
}

/** Snap to palette, make alpha binary, then add a 1-px dark outline around the opaque shape. */
export function pixelize(ctx: CanvasRenderingContext2D, w: number, h: number, outline = true) {
  const img = ctx.getImageData(0, 0, w, h); const d = img.data; const L = lut();
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 128) { d[i + 3] = 0; continue; }
    const c = L[((d[i] >> 3) << 10) | ((d[i + 1] >> 3) << 5) | (d[i + 2] >> 3)];
    d[i] = c >> 16; d[i + 1] = (c >> 8) & 255; d[i + 2] = c & 255; d[i + 3] = 255;
  }
  if (outline) {
    const [or, og, ob] = hexToRgb(C.outline);
    const op = new Uint8Array(w * h);
    for (let p = 0; p < w * h; p++) op[p] = d[p * 4 + 3] ? 1 : 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const p = y * w + x; if (op[p]) continue;
      if ((x > 0 && op[p - 1]) || (x < w - 1 && op[p + 1]) || (y > 0 && op[p - w]) || (y < h - 1 && op[p + w])) {
        d[p * 4] = or; d[p * 4 + 1] = og; d[p * 4 + 2] = ob; d[p * 4 + 3] = 255;
      }
    }
  }
  ctx.putImageData(img, 0, 0);
}

// 4x4 Bayer matrix for ordered dithering (values 0..1).
export const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
