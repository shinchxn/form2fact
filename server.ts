import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import apiRouter from './server/api.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function start() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Mount API routes
  app.use(apiRouter);

  const isProduction = process.env.NODE_ENV === 'production' && fs.existsSync(path.join(__dirname, 'dist'));

  if (isProduction) {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Form2Fact Scrutiny Engine running on http://0.0.0.0:${PORT}`);
  });

  // Graceful shutdown handling for container and process lifecycle
  const shutdown = (signal: string) => {
    console.log(`Received ${signal}. Gracefully stopping Form2Fact HTTP server...`);
    server.close(() => {
      console.log('HTTP server successfully closed. Process exiting.');
      process.exit(0);
    });

    // Enforce termination after timeout if connections do not close
    setTimeout(() => {
      console.error('Forced shutdown timeout reached. Terminating process.');
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start();
