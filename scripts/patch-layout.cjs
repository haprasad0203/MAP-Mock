// Replace one item's "pts" (and optionally its "src") in public/data/campus-layout.json, keeping the file's own
// formatting (Python json.dump, indent 1), so a diff shows only that change.
// Usage: node scripts/patch-layout.cjs <id> '<pts JSON>' ['<new src>']
const fs = require('fs'), f = 'public/data/campus-layout.json';
const [id, ptsJson, src] = process.argv.slice(2), pts = JSON.parse(ptsJson), lines = fs.readFileSync(f, 'utf8').split('\n');
const i0 = lines.findIndex(l => l.trim() === `"id": "${id}",`); if (i0 < 0) throw new Error('no item ' + id);
const ind = lines[i0].match(/^\s*/)[0], p0 = lines.findIndex((l, i) => i > i0 && l === `${ind}"pts": [`);
let p1 = p0 + 1, depth = 1; for (; p1 < lines.length; p1++) { depth += (lines[p1].match(/\[/g) ?? []).length - (lines[p1].match(/\]/g) ?? []).length; if (depth === 0) break; }
const num = v => (Number.isInteger(v) ? v.toFixed(1) : String(v)), close = lines[p1].trim().endsWith(',') ? '],' : ']';
const block = [`${ind}"pts": [`]; pts.forEach((q, k) => block.push(`${ind} [`, `${ind}  ${num(q[0])},`, `${ind}  ${num(q[1])}`, k < pts.length - 1 ? `${ind} ],` : `${ind} ]`)); block.push(`${ind}${close}`);
lines.splice(p0, p1 - p0 + 1, ...block);
if (src) { const s = lines.findIndex((l, i) => i > i0 && l.startsWith(`${ind}"src": `)); lines[s] = `${ind}"src": ${JSON.stringify(src)}${lines[s].trim().endsWith(',') ? ',' : ''}`; }
fs.writeFileSync(f, lines.join('\n')); console.log('patched', id, pts.length, 'points');
