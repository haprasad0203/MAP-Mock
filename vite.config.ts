import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';

/** Dev only: the ?sprite-edit=<id> view posts a sprite's calibrated numbers here, and they are written into public/data/sprites.json. */
const saveSprites = (): Plugin => ({
  name: 'save-sprites',
  configureServer(server) {
    server.middlewares.use('/__sprites', (req, res) => {
      if (req.method !== 'POST') { res.statusCode = 405; res.end(); return; }
      let body = ''; req.on('data', c => (body += c));
      req.on('end', () => {
        try {
          const { id, anchorPx, metresPerPx, offset } = JSON.parse(body), file = 'public/data/sprites.json', cfg = JSON.parse(fs.readFileSync(file, 'utf8'));
          if (!cfg.sprites[id]) throw new Error(`no sprite "${id}"`);
          Object.assign(cfg.sprites[id], cfg.sprites[id].groundLine ? { metresPerPx, offset, placed: true } : { anchorPx, metresPerPx, offset, placed: true });
          fs.writeFileSync(file, JSON.stringify(cfg, null, 1)); res.end('saved');
        } catch (e) { res.statusCode = 400; res.end(String(e)); }
      });
    });
  },
});

export default defineConfig({ plugins: [react(), saveSprites()], server: { port: 5173 }, test: { environment: 'node' } } as any);
