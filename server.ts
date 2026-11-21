import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import { apiRouter } from './src/server/api';
import { apiRateLimiter } from './src/server/security';
import { createAdminRouter } from './src/server/adminRoutes';
import { createPostgresPool, getPostgresConfig } from './src/server/postgres';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const postgresConfig = getPostgresConfig();
  const postgresPool = postgresConfig ? createPostgresPool(postgresConfig) : null;

  // Trust proxy for accurate rate-limiting behind cloud load balancers
  app.set('trust proxy', 1);

  // Helmet HTTP Security Headers (HSTS, nosniff, X-Frame-Options, etc.)
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  // Middleware for JSON & form parsing
  app.use(express.json({
    limit: '2mb',
    verify: (req, _res, buf) => {
      // Preserve exact JSON bytes for cryptographic webhook verification.
      (req as express.Request & { rawBody?: string }).rawBody = buf.toString('utf8');
    },
  }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  // Health check
  app.get('/health', (_req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
    });
  });

  // Apply general API rate limiting
  app.use('/api', apiRateLimiter);

  // Mount the isolated admin router BEFORE the general API router because
  // apiRouter ends with a catch-all 404 handler.
  // Admin endpoints require Firebase ID-token verification plus PostgreSQL roles.
  app.use('/api/admin', createAdminRouter(postgresPool));
  app.use('/api', apiRouter);

  // OAuth popup callback endpoint (postMessage cross-origin handshake)
  app.get(['/auth/callback', '/auth/callback/'], (_req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Authenticating with MEVO TECH...</title>
          <style>
            body { background: #0c0a13; color: white; font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { background: #171322; border: 1px solid #3b2a59; padding: 32px; border-radius: 16px; text-align: center; max-width: 380px; box-shadow: 0 10px 40px rgba(0,0,0,0.6); }
            .spinner { width: 36px; height: 36px; border: 3px solid rgba(168,85,247,0.2); border-top-color: #a855f7; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 16px; }
            @keyframes spin { to { transform: rotate(360deg); } }
            h3 { margin: 0 0 8px; font-size: 18px; color: #f3e8ff; }
            p { margin: 0; font-size: 13px; color: #a1a1aa; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="spinner"></div>
            <h3>Authentication Successful</h3>
            <p>Connecting your account securely to MEVO TECH. This window will close automatically...</p>
          </div>
          <script>
            try {
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', provider: 'social' }, window.location.origin);
                setTimeout(function() { window.close(); }, 500);
              } else {
                window.location.href = '/';
              }
            } catch (e) {
              window.location.href = '/';
            }
          </script>
        </body>
      </html>
    `);
  });

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    // Vite middleware for development
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Mevo Tech e-commerce server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
