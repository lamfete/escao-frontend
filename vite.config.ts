import { defineConfig, loadEnv } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  let proxyTarget = env.VITE_PROXY_TARGET || '';
  if (!proxyTarget && env.VITE_API_BASE_URL) {
    try {
      const u = new URL(env.VITE_API_BASE_URL);
      proxyTarget = `${u.protocol}//${u.hostname}${u.port ? `:${u.port}` : ''}`;
    } catch {
      // ignore, will fallback
    }
  }
  if (!proxyTarget) proxyTarget = 'http://localhost:4000';

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        // Only proxy API namespace to avoid intercepting SPA routes like '/escrow/new'.
        '/api': { target: proxyTarget, changeOrigin: true },
        // Also proxy uploaded assets for dev so relative /uploads URLs work locally
        '/uploads': { target: proxyTarget, changeOrigin: true },
      },
    },
  };
});
