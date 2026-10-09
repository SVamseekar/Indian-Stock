import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { createApiApp } from './server/api.ts';

dotenv.config({ quiet: true });
const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error('PORT must be between 1 and 65535.');
const app = createApiApp();
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({ root, server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(root, 'dist')));
    app.get('*', (_req, res) => res.sendFile(path.join(root, 'dist', 'index.html')));
  }
  const server = app.listen(port, process.env.HOST || '127.0.0.1', () =>
    console.log(`Indian Stock ready at http://localhost:${port}`),
  );
  server.on('error', (error) => {
    console.error(error);
    process.exit(1);
  });
  for (const signal of ['SIGTERM', 'SIGINT'] as const)
    process.once(signal, () => server.close(() => process.exit(0)));
}
start().catch((e) => {
  console.error(e);
  process.exit(1);
});
