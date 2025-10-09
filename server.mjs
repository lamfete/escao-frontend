import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createProxyMiddleware } from 'http-proxy-middleware';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Target API for proxy in production. Prefer explicit API_PROXY_TARGET; fall back to VITE_API_BASE_URL if it's a full URL.
const envTarget = process.env.API_PROXY_TARGET || process.env.VITE_PROXY_TARGET || process.env.VITE_API_BASE_URL || '';
let API_TARGET = envTarget;
try {
  // If VITE_API_BASE_URL was set to '/api', it's not a full URL; ignore those.
  if (!/^https?:\/\//i.test(API_TARGET)) {
    API_TARGET = '';
  }
} catch {}

if (!API_TARGET) {
  console.warn('[server] No API target configured. Set API_PROXY_TARGET to your backend URL, e.g. https://your-api.example.com');
}

// Proxy API routes to backend; strip the '/api' prefix
if (API_TARGET) {
  app.use('/api', createProxyMiddleware({
    target: API_TARGET,
    changeOrigin: true,
    xfwd: true,
    pathRewrite: { '^/api': '' },
    onProxyReq(proxyReq) {
      // Heroku / proxies: ensure Origin header is set to the target origin when needed
      try {
        const u = new URL(API_TARGET);
        proxyReq.setHeader('Origin', `${u.protocol}//${u.host}`);
      } catch {}
    },
  }));
  // Also proxy /uploads for serving media directly from API
  app.use('/uploads', createProxyMiddleware({ target: API_TARGET, changeOrigin: true, xfwd: true }));
}

// Serve static assets from dist
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath, { maxAge: '1h', index: false }));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`[server] Listening on port ${port} with API proxy target: ${API_TARGET || '(none)'}`);
});
