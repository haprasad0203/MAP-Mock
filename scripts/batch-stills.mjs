// Stills from every video under a folder (H A's SharePoint footage, 20 Nov), one sub-folder per source folder, plus a
// contact sheet per folder. Videos are not copied or committed; only the stills are used for study.
// Usage: node scripts/batch-stills.mjs <videoRoot> <outRoot> [--step=3] [--only=Admin,NAB]
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2), opt = Object.fromEntries(args.filter(a => a.startsWith('--')).map(a => a.slice(2).split('=')));
const [root, outRoot] = args.filter(a => !a.startsWith('--'));
const only = opt.only ? new Set(opt.only.split(',')) : null;
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const vids = walk(root).filter(f => /\.(mov|mp4)$/i.test(f));
const slug = s => s.replace(/[^\w]+/g, '_').replace(/^_|_$/g, '') || 'root';
const groups = {};
for (const f of vids) {
  const folder = slug(path.relative(root, path.dirname(f)));
  if (only && !only.has(path.basename(path.dirname(f)))) continue;
  const out = path.join(outRoot, folder), mb = fs.statSync(f).size / 1e6;
  const step = opt.step ?? (mb > 150 ? 4 : mb > 40 ? 3 : 2);
  try {
    const r = execFileSync(process.execPath, ['scripts/video-stills.mjs', f, out, `--step=${step}`, '--retry=1'], { encoding: 'utf8', timeout: 900000 });
    console.log(folder, path.basename(f), r.trim().split('\n').pop());
  } catch (e) { console.log('FAILED', folder, path.basename(f), String(e.stderr || e).split('\n').find(l => /Error|error/.test(l))); }
  (groups[folder] ??= out);
}
for (const [folder, out] of Object.entries(groups)) {
  const files = fs.readdirSync(out).filter(f => f.endsWith('.jpg')).sort().map(f => path.join(out, f));
  // one sheet per 48 stills
  for (let i = 0; i < files.length; i += 48) {
    const list = path.join(outRoot, `_list_${folder}_${i / 48}.txt`); fs.writeFileSync(list, files.slice(i, i + 48).join('\n'));
    execFileSync(process.execPath, ['scripts/contact-sheet.mjs', path.join(outRoot, `_sheet_${folder}_${i / 48}.jpg`), '8', '300', `--list=${list}`]);
  }
}
console.log('done', Object.keys(groups).length, 'folders');
