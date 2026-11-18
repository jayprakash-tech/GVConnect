import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { getSecurityHeaders } from './src/utils/securityHeaders.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDevMode = (() => {
  if (process.env.NODE_ENV === 'production') return false;
  if (process.env.npm_lifecycle_event === 'start') return false;
  if (
    process.env.NODE_ENV === 'development' ||
    process.env.npm_lifecycle_event === 'dev'
  ) {
    return true;
  }
  const distIndex = path.resolve(__dirname, 'dist', 'index.html');
  return !fs.existsSync(distIndex);
})();

async function startServer() {
  const app = express();
  app.disable('x-powered-by');

  const supabaseUrl =
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const securityHeaders = getSecurityHeaders({
    isDev: isDevMode,
    supabaseUrl,
  });

  app.use((_req: Request, res: Response, next: NextFunction) => {
    for (const [name, value] of Object.entries(securityHeaders)) {
      res.setHeader(name, value);
    }
    next();
  });

  if (isDevMode) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    const indexHtml = path.resolve(distDir, 'index.html');
    app.use(express.static(distDir, { index: false }));
    app.use((req: Request, res: Response) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.status(404).end();
        return;
      }
      res.sendFile(indexHtml);
    });
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(
      `GVConnect server listening on http://0.0.0.0:${port} (${isDevMode ? 'dev' : 'prod'})`
    );
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
