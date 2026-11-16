// Top-down check image for public/data/hardscape.json → reference/real/hardscape_check.png.
// The satellite screenshots are only a check underlay (pin-fitted, see scripts/lib/satfit.mjs); everything drawn on them
// comes from our data: roads at their hardscape widths (pavements pink, narrowed tight spots red), the full Scholar's Path
// in teal, and every hardscape item coloured by type, over the data footprints.
import sharp from 'sharp';
import fs from 'node:fs';
import { fitShot } from './lib/satfit.mjs';

const H = JSON.parse(fs.readFileSync('public/data/hardscape.json', 'utf8'));
const layout = JSON.parse(fs.readFileSync('public/data/campus-layout.json', 'utf8')), osm = JSON.parse(fs.readFileSync('public/data/osm.json', 'utf8'));
const paths = [...osm.roads, ...layout.paths];
const TYPE_COL = {
  'covered-walkway': '#22D3C5', plaza: '#FF8A65', parking: '#FFB74D', footpath: '#FFF59D', steps: '#FFFFFF', hedge: '#66BB6A', 'flower-bed': '#AED581', terrace: '#9CCC65',
  'retaining-wall': '#D7CCC8', wall: '#D7CCC8', fence: '#B39DDB', floodlight: '#FFEB3B', 'court-surround': '#EF5350', 'lake-edge': '#4FC3F7', trail: '#FFE082', gate: '#FFFFFF',
  courtyard: '#FFCC80', 'tree-line': '#2E7D32', 'light-row': '#FFF176',
};
function resample(pts, step) {
  const out = []; for (let i = 0; i + 1 < pts.length; i++) { const [ax, ay] = pts[i], [bx, by] = pts[i + 1], m = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / step)); for (let t = 0; t < m; t++) out.push([ax + ((bx - ax) * t) / m, ay + ((by - ay) * t) / m]); }
  out.push(pts[pts.length - 1]); let s = 0;
  return out.map((p, i) => { const a = out[Math.max(0, i - 1)], c = out[Math.min(out.length - 1, i + 1)], dx = c[0] - a[0], dy = c[1] - a[1], l = Math.hypot(dx, dy) || 1; if (i) s += Math.hypot(p[0] - out[i - 1][0], p[1] - out[i - 1][1]); return { p, n: [-dy / l, dx / l], s }; });
}
const halfAt = (r, s) => { const n = r.narrow.find(z => s >= z.s0 - 1 && s <= z.s1 + 1); return (n ? n.width : r.width) / 2; };

async function panel(key, crop, title) {
  const F = fitShot(key), meta = await sharp(F.file).metadata();
  const [l, t, w, h] = crop ?? [0, 0, meta.width, meta.height], Z = Math.max(1, Math.min(3, Math.floor(1500 / w)));
  const X = q => { const [px, py] = F.toPx(q); return [((px - l) * Z).toFixed(1), ((py - t) * Z).toFixed(1)]; }, S = m => m * F.pxPerM * Z;
  const poly = (pts, attrs) => `<polygon points="${pts.map(q => X(q).join(',')).join(' ')}" ${attrs}/>`, line = (pts, attrs) => `<polyline points="${pts.map(q => X(q).join(',')).join(' ')}" fill="none" ${attrs}/>`;
  let svg = '';
  // data footprints
  for (const b of layout.buildings) for (const p of b.parts) if (p.poly) svg += poly(p.poly, 'fill="none" stroke="#FFFFFF" stroke-opacity="0.7" stroke-width="1"');
  // roads at their widths: band polygons (left edge forward, right edge back), pavements, tight spots
  for (const r of H.roads) {
    const p = paths.find(x => x.id === r.id); if (!p) continue; const sm = resample(p.pts, 3);
    const edge = (o0, o1) => [...sm.map(q => { const hw = halfAt(r, q.s); return [q.p[0] + q.n[0] * o0(hw), q.p[1] + q.n[1] * o0(hw)]; }), ...sm.slice().reverse().map(q => { const hw = halfAt(r, q.s); return [q.p[0] + q.n[0] * o1(hw), q.p[1] + q.n[1] * o1(hw)]; })];
    svg += poly(edge(hw => hw, hw => -hw), 'fill="#5B6470" fill-opacity="0.55" stroke="#ECEFF1" stroke-width="0.8"');
    if (r.pavementL) svg += poly(edge(hw => hw + r.pavementL, hw => hw), 'fill="#F48FB1" fill-opacity="0.7"');
    if (r.pavementR) svg += poly(edge(hw => -hw, hw => -hw - r.pavementR), 'fill="#F48FB1" fill-opacity="0.7"');
    for (const z of r.narrow) { const seg = sm.filter(q => q.s >= z.s0 - 1 && q.s <= z.s1 + 1); if (seg.length > 1) svg += line(seg.map(q => q.p), `stroke="#FF1744" stroke-width="${Math.max(3, S(z.width) * 0.5).toFixed(1)}" stroke-opacity="0.85"`); }
  }
  // items
  for (const it of H.items) {
    const c = TYPE_COL[it.type] ?? '#FFFFFF';
    if (it.poly) svg += poly(it.poly, `fill="${c}" fill-opacity="0.35" stroke="${c}" stroke-width="1.5"`);
    else if (it.pts?.length > 1) svg += line(it.pts, `stroke="${c}" stroke-width="${Math.max(2, S(it.width ?? 0.6)).toFixed(1)}" stroke-opacity="${it.type === 'covered-walkway' ? 0.95 : 0.85}" stroke-linejoin="round"`);
    else if (it.at) { const [x, y] = X(it.at); svg += `<circle cx="${x}" cy="${y}" r="5" fill="${c}" stroke="#000"/>`; }
  }
  // Scholar's Path on top, with a label
  const sp = H.items.find(i => i.id === 'scholars-path');
  svg += line(sp.pts, `stroke="#00E5D4" stroke-width="${Math.max(4, S(sp.width)).toFixed(1)}" stroke-linejoin="round"`) + line(sp.pts, 'stroke="#003B37" stroke-width="1" stroke-dasharray="4 6"');
  const W = w * Z, Hh = h * Z;
  svg += `<rect width="${W}" height="30" fill="#000" fill-opacity="0.7"/><text x="10" y="21" font-family="Arial" font-size="16" fill="#fff">${title} · ${F.file.split('/').pop()} (check underlay only, pin fit ${F.pxPerM.toFixed(2)} px/m, ±${(F.rms / F.pxPerM).toFixed(0)} m)</text>`;
  const base = await sharp(F.file).extract({ left: l, top: t, width: w, height: h }).resize(W, Hh).modulate({ brightness: 0.75, saturation: 0.6 }).png().toBuffer();
  return { buf: await sharp(base).composite([{ input: Buffer.from(`<svg width="${W}" height="${Hh}">${svg}</svg>`) }]).png().toBuffer(), W, H: Hh };
}

const panels = [
  await panel('hr0423', [600, 0, 760, 900], "South: gate → Admin → NAB → lake → Kalam Centre (Scholar's Path along the main road)"),
  await panel('hr0405', [180, 120, 1150, 800], "North: hostels, Mess, courts, football (Scholar's Path zig-zag)"),
];
const whole = await panel('01', [380, 60, 900, 640], "Whole campus: the full Scholar's Path and road widths");
// legend
const LW = 560, legendRows = [
  ['Road at its hardscape width (grey), pavement (pink)', '#5B6470'], ['Tight spot: road narrowed near a building (red)', '#FF1744'], ["Scholar's Path, covered walkway (teal)", '#00E5D4'],
  ...Object.entries(TYPE_COL).filter(([k]) => k !== 'covered-walkway').map(([k, c]) => [k, c]),
];
const widths = H.roads.filter(r => r.note !== 'off campus' && (r.confidence !== 'default' || r.kind === 'road')).map(r => `${r.id}: ${r.width} m${r.pavementL || r.pavementR ? ` + pavement ${r.pavementL}/${r.pavementR} m` : ''}${r.narrow.length ? `, narrowed at ${r.narrow.length}` : ''} (${r.confidence})`);
const sp = H.items.find(i => i.id === 'scholars-path');
let lg = `<rect width="${LW}" height="100%" fill="#0d1014"/><text x="14" y="34" font-family="Arial" font-size="22" font-weight="700" fill="#fff">hardscape.json check</text>
  <text x="14" y="60" font-family="Arial" font-size="14" fill="#cfd6de">${H.items.length} items · ${H.roads.length} roads · ${H.tightSpots.length} tight spots</text>
  <text x="14" y="82" font-family="Arial" font-size="14" fill="#00E5D4">Scholar's Path: ${sp.length} m long, ${sp.width} m wide, roof ${sp.roofColour}</text>`;
legendRows.forEach(([k, c], i) => { lg += `<rect x="14" y="${104 + i * 22}" width="16" height="12" fill="${c}"/><text x="38" y="${115 + i * 22}" font-family="Arial" font-size="13" fill="#e6e6e6">${k}</text>`; });
let y0 = 120 + legendRows.length * 22;
lg += `<text x="14" y="${y0}" font-family="Arial" font-size="15" font-weight="700" fill="#fff">Road widths (kerb to kerb)</text>`;
widths.forEach((s, i) => { lg += `<text x="14" y="${y0 + 22 + i * 18}" font-family="Arial" font-size="12" fill="#e6e6e6">${s.replace(/&/g, '&amp;')}</text>`; });
y0 += 40 + widths.length * 18;
lg += `<text x="14" y="${y0}" font-family="Arial" font-size="15" font-weight="700" fill="#fff">Measured (satellite scale bars, drone stills)</text>`;
H.roads.flatMap(r => r.measured.map(m => `${r.id}: ${m}`)).forEach((s, i) => { const words = s.match(/.{1,78}(\s|$)/g); words.forEach((wds, j) => { lg += `<text x="14" y="${y0 + 22 + (i * 3 + j) * 16}" font-family="Arial" font-size="12" fill="#e6e6e6">${wds.replace(/&/g, '&amp;')}</text>`; }); });

const colW = Math.max(...panels.map(p => p.W)), totalW = colW + 20 + Math.max(whole.W, LW) + 20, totalH = Math.max(panels.reduce((s, p) => s + p.H + 10, 10), whole.H + 20 + 900);
const comp = []; let y = 10; for (const p of panels) { comp.push({ input: p.buf, left: 10, top: y }); y += p.H + 10; }
comp.push({ input: whole.buf, left: colW + 20, top: 10 });
comp.push({ input: Buffer.from(`<svg width="${LW}" height="900">${lg}</svg>`), left: colW + 20, top: whole.H + 20 });
await sharp({ create: { width: totalW, height: totalH, channels: 3, background: '#0d1014' } }).composite(comp).png().toFile('reference/real/hardscape_check.png');
console.log('reference/real/hardscape_check.png', totalW, totalH);
