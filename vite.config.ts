import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';

/** Dev only, for the ?facade-edit=<id> tool (Phase 3M):
 *  GET  /__facades/render/<file>  the original render from reference/generated/raw/tycoon/ (not shipped with the app);
 *  POST /__facades                { id, entry } replaces facades.json → facades[id], keeping its generated `atlas`;
 *  POST /__facades/extract?id=<id> runs scripts/extract-facades.mjs for that building. */
const facadeTools = (): Plugin => ({
  name: 'facade-tools',
  configureServer(server) {
    const FILE = 'public/data/facades.json', RAW = path.resolve('reference/generated/raw/tycoon');
    const tidy = (s: string) => s.replace(/\[\s+([-\d.e,\s]+?)\s+\]/g, (_, a) => `[${a.replace(/\s+/g, ' ')}]`).replace(/\[\s+((?:\[[^[\]]*\],?\s*)+)\]/g, (_, a) => `[${a.replace(/\s+/g, ' ').trim()}]`);
    server.middlewares.use('/__facades', (req, res) => {
      const url = new URL(req.url ?? '/', 'http://x');
      if (req.method === 'GET' && url.pathname.startsWith('/render/')) {
        const f = path.resolve(RAW, decodeURIComponent(url.pathname.slice(8)));
        if (!f.startsWith(RAW + path.sep) || !fs.existsSync(f)) { res.statusCode = 404; res.end(); return; }
        res.setHeader('Content-Type', 'image/png'); fs.createReadStream(f).pipe(res); return;
      }
      if (req.method !== 'POST') { res.statusCode = 405; res.end(); return; }
      if (url.pathname === '/extract') {
        const id = url.searchParams.get('id') ?? '';
        if (!/^[a-z0-9-]+$/.test(id)) { res.statusCode = 400; res.end('bad id'); return; }
        execFile(process.execPath, ['scripts/extract-facades.mjs', id], { timeout: 300000 }, (err, out, errOut) => { res.statusCode = err ? 500 : 200; res.end(err ? String(errOut || err) : out.trim()); });
        return;
      }
      let body = ''; req.on('data', c => (body += c));
      req.on('end', () => {
        try {
          const { id, entry } = JSON.parse(body), cfg = JSON.parse(fs.readFileSync(FILE, 'utf8'));
          if (!/^[a-z0-9-]+$/.test(id) || !entry?.file || !Array.isArray(entry.faces)) throw new Error('bad facade entry');
          cfg.facades[id] = { ...entry, ...(cfg.facades[id]?.atlas ? { atlas: cfg.facades[id].atlas } : {}) };
          fs.writeFileSync(FILE, tidy(JSON.stringify(cfg, null, 1)) + '\n'); res.end('saved');
        } catch (e) { res.statusCode = 400; res.end(String(e)); }
      });
    });
  },
});

/** Dev only, for the real-source study (Phase 3M v2): POST /__frames?id=<videoId> with a frame bundle (see
 *  scripts/unpack-frames.mjs) sent from a video page in the browser; written to .cache/frames/<id>.bin. Chrome blocks
 *  repeated downloads from a page, so the stills come here instead. Answers CORS and private-network preflights. */
const frameInbox = (): Plugin => ({
  name: 'frame-inbox',
  configureServer(server) {
    server.middlewares.use('/__frames', (req, res) => {
      res.setHeader('Access-Control-Allow-Origin', req.headers.origin ?? '*');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS'); res.setHeader('Access-Control-Allow-Headers', '*');
      res.setHeader('Access-Control-Allow-Private-Network', 'true');
      if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
      const id = new URL(req.url ?? '/', 'http://x').searchParams.get('id') ?? '';
      if (req.method !== 'POST' || !/^[\w-]{1,40}$/.test(id)) { res.statusCode = 400; res.end('bad request'); return; }
      const chunks: Buffer[] = []; req.on('data', c => chunks.push(c));
      req.on('end', () => { fs.mkdirSync('.cache/frames', { recursive: true }); const buf = Buffer.concat(chunks); fs.writeFileSync(`.cache/frames/${id}.bin`, buf); res.end(String(buf.length)); });
    });
  },
});

// `npm run dev:phone` (mode "phone"): HTTPS on the local network so a phone on the same Wi-Fi can open the map with live
// location (browsers only allow geolocation on HTTPS). Uses the self-signed certificate in .cache/cert (not committed).
const phoneHttps = (mode: string) => {
  if (mode !== 'phone' || !fs.existsSync('.cache/cert/key.pem')) return undefined;
  return { key: fs.readFileSync('.cache/cert/key.pem'), cert: fs.readFileSync('.cache/cert/cert.pem') };
};

export default defineConfig(({ mode }) => ({
  plugins: [react(), facadeTools(), frameInbox()],
  server: mode === 'phone' ? { port: 5174, host: true, https: phoneHttps(mode) } : { port: 5173 },
  test: { environment: 'node' },
}) as any);
