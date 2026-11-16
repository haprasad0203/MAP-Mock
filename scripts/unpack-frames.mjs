// Unpack a video-frame bundle saved from the browser (one download per video: 8-byte header length, JSON header,
// then the JPEG frames back to back) into <outDir>/<videoId>-<mm.ss>.jpg. Study stills only (Phase 3M v2 source study).
// Usage: node scripts/unpack-frames.mjs <bundle.bin> <outDir>
import fs from 'node:fs';
import path from 'node:path';

const [bin, outDir] = process.argv.slice(2);
const buf = fs.readFileSync(bin), hl = buf.readUInt32BE(0), head = JSON.parse(buf.subarray(8, 8 + hl).toString('utf8'));
fs.mkdirSync(outDir, { recursive: true });
let o = 8 + hl;
const stamp = t => `${String(Math.floor(t / 60)).padStart(2, '0')}.${(t % 60).toFixed(1).padStart(4, '0')}`;
for (const f of head.frames) {
  const jpg = buf.subarray(o, o + f.n); o += f.n;
  if (jpg[0] !== 0xff || jpg[1] !== 0xd8) throw new Error(`frame at ${f.t}s is not a JPEG`);
  fs.writeFileSync(path.join(outDir, `${head.id}-${stamp(f.t)}.jpg`), jpg);
}
console.log(`${head.frames.length} frames (${head.w}px wide) → ${outDir}`);
